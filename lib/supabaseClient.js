// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// During build time, environment variables might not be available
// We'll create a dummy client that will be replaced at runtime
let supabase;

if (typeof window === 'undefined') {
  // Server-side (including build time)
  if (!supabaseUrl || !supabaseAnonKey) {
    // Create a dummy client for build time
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } else {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
} else {
  // Client-side — use createBrowserClient so sessions are stored in cookies,
  // making them readable by server components and API routes.
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable. Please check your .env.local file.');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. Please check your .env.local file.');
  }

  supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };