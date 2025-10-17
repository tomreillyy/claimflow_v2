/**
 * Rate Limiting with Token Bucket Algorithm
 * Supports both Upstash Redis and Vercel KV
 *
 * Token Bucket Algorithm:
 * - Each bucket has a maximum capacity of tokens
 * - Tokens are added at a fixed rate (refill rate)
 * - Each request consumes 1 token
 * - Request is allowed if bucket has tokens, denied otherwise
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client (works with both Upstash Redis and Vercel KV)
let redis = null;

function getRedisClient() {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.warn('[RateLimit] Redis credentials not configured. Rate limiting disabled.');
    return null;
  }

  redis = new Redis({
    url,
    token,
  });

  return redis;
}

/**
 * Rate limit configuration presets
 */
export const RATE_LIMITS = {
  // Per-IP limits for evidence endpoints
  EVIDENCE_PER_IP: {
    maxTokens: 100,        // 100 requests
    refillRate: 100,       // Refill 100 tokens
    refillInterval: 3600,  // Per hour (3600 seconds)
    keyPrefix: 'rl:ip:evidence:'
  },

  // Per-project limits for evidence endpoints
  EVIDENCE_PER_PROJECT: {
    maxTokens: 500,        // 500 requests
    refillRate: 500,       // Refill 500 tokens
    refillInterval: 3600,  // Per hour
    keyPrefix: 'rl:proj:evidence:'
  },

  // Per-IP limits for classify endpoint
  CLASSIFY_PER_IP: {
    maxTokens: 50,         // 50 requests
    refillRate: 50,        // Refill 50 tokens
    refillInterval: 3600,  // Per hour
    keyPrefix: 'rl:ip:classify:'
  },

  // Per-project limits for classify endpoint
  CLASSIFY_PER_PROJECT: {
    maxTokens: 200,        // 200 requests
    refillRate: 200,       // Refill 200 tokens
    refillInterval: 3600,  // Per hour
    keyPrefix: 'rl:proj:classify:'
  }
};

/**
 * Token Bucket Rate Limiter
 *
 * @param {string} identifier - Unique identifier (IP address, project token, etc.)
 * @param {Object} config - Rate limit configuration
 * @returns {Promise<{allowed: boolean, remaining: number, resetTime: number, error?: string}>}
 */
export async function checkRateLimit(identifier, config) {
  const client = getRedisClient();

  // If Redis is not configured, allow all requests (graceful degradation)
  if (!client) {
    return {
      allowed: true,
      remaining: config.maxTokens,
      resetTime: Date.now() + config.refillInterval * 1000,
      error: null
    };
  }

  const key = `${config.keyPrefix}${identifier}`;
  const now = Math.floor(Date.now() / 1000); // Current time in seconds

  try {
    // Get current bucket state
    const bucketData = await client.get(key);

    let tokens, lastRefill;

    if (!bucketData) {
      // First request - initialize bucket with full tokens
      tokens = config.maxTokens;
      lastRefill = now;
    } else {
      // Parse existing bucket state
      const parsed = typeof bucketData === 'string' ? JSON.parse(bucketData) : bucketData;
      tokens = parsed.tokens;
      lastRefill = parsed.lastRefill;

      // Calculate tokens to add based on time elapsed
      const timeElapsed = now - lastRefill;
      const tokensToAdd = Math.floor((timeElapsed / config.refillInterval) * config.refillRate);

      if (tokensToAdd > 0) {
        // Refill tokens (capped at maxTokens)
        tokens = Math.min(config.maxTokens, tokens + tokensToAdd);
        lastRefill = now;
      }
    }

    // Check if request can be allowed
    if (tokens >= 1) {
      // Consume 1 token
      tokens -= 1;

      // Save updated bucket state
      const ttl = config.refillInterval * 2; // Keep bucket alive for 2 refill intervals
      await client.setex(key, ttl, JSON.stringify({ tokens, lastRefill }));

      // Calculate reset time (when bucket will be full again)
      const tokensNeeded = config.maxTokens - tokens;
      const secondsUntilFull = (tokensNeeded / config.refillRate) * config.refillInterval;
      const resetTime = (now + secondsUntilFull) * 1000; // Convert to milliseconds

      return {
        allowed: true,
        remaining: tokens,
        resetTime,
        error: null
      };
    } else {
      // No tokens available - rate limit exceeded
      const secondsUntilRefill = config.refillInterval - (now - lastRefill);
      const resetTime = (now + secondsUntilRefill) * 1000; // Convert to milliseconds

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        error: 'Rate limit exceeded'
      };
    }
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error);

    // On error, allow the request (fail open for better UX)
    return {
      allowed: true,
      remaining: config.maxTokens,
      resetTime: Date.now() + config.refillInterval * 1000,
      error: error.message
    };
  }
}

/**
 * Extract client IP address from request
 * Handles various proxy headers (Vercel, Cloudflare, etc.)
 *
 * @param {Request} req - The request object
 * @returns {string} - Client IP address
 */
export function getClientIp(req) {
  // Try various headers in order of preference
  const headers = [
    'x-forwarded-for',      // Standard proxy header
    'x-real-ip',            // Nginx proxy
    'cf-connecting-ip',     // Cloudflare
    'x-vercel-forwarded-for' // Vercel
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // x-forwarded-for may contain multiple IPs (client, proxy1, proxy2)
      // Take the first one (original client)
      return value.split(',')[0].trim();
    }
  }

  // Fallback to a placeholder (should not happen on Vercel)
  return 'unknown';
}

/**
 * Apply multiple rate limits and return most restrictive result
 *
 * @param {Array<{identifier: string, config: Object}>} limits - Array of rate limit checks
 * @returns {Promise<{allowed: boolean, remaining: number, resetTime: number, limitedBy?: string}>}
 */
export async function checkMultipleRateLimits(limits) {
  const results = await Promise.all(
    limits.map(({ identifier, config, name }) =>
      checkRateLimit(identifier, config).then(result => ({ ...result, name }))
    )
  );

  // Find the most restrictive limit (first one that denies)
  const denied = results.find(r => !r.allowed);

  if (denied) {
    return {
      allowed: false,
      remaining: denied.remaining,
      resetTime: denied.resetTime,
      limitedBy: denied.name
    };
  }

  // All limits passed - return the one with lowest remaining
  const mostRestrictive = results.reduce((min, curr) =>
    curr.remaining < min.remaining ? curr : min
  );

  return {
    allowed: true,
    remaining: mostRestrictive.remaining,
    resetTime: mostRestrictive.resetTime,
    limitedBy: null
  };
}

/**
 * Middleware helper to apply rate limiting to API routes
 * Returns a NextResponse with 429 status if rate limit exceeded
 *
 * @param {Request} req - The request object
 * @param {Array<{identifier: string, config: Object, name: string}>} limits - Rate limits to check
 * @returns {Promise<NextResponse|null>} - Returns NextResponse if rate limited, null if allowed
 */
export async function rateLimitMiddleware(req, limits) {
  const result = await checkMultipleRateLimits(limits);

  if (!result.allowed) {
    const resetDate = new Date(result.resetTime).toISOString();

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        limitedBy: result.limitedBy,
        remaining: result.remaining,
        resetTime: result.resetTime,
        resetDate,
        message: `Too many requests. Please try again after ${resetDate}`
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limits[0]?.config?.maxTokens || 0),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Math.floor(result.resetTime / 1000)),
          'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000))
        }
      }
    );
  }

  return null; // Allowed - proceed with request
}
