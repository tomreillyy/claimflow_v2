import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET() {
  const debug = {};

  // 1. Check env vars
  debug.env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'MISSING',
    SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'MISSING',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'set' : 'MISSING',
  };

  // 2. Check cookies
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  debug.cookies = allCookies.map(c => c.name);

  // 3. Try cookie-based auth (same as pack page)
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    debug.cookieAuth = {
      userId: user?.id ?? null,
      email: user?.email ?? null,
      error: error?.message ?? null,
    };

    // 4. If we got a user, check their subscription
    if (user?.id) {
      const { data: subscription, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('status, current_period_end, updated_at')
        .eq('user_id', user.id)
        .single();

      debug.subscription = {
        found: !!subscription,
        status: subscription?.status ?? null,
        current_period_end: subscription?.current_period_end ?? null,
        updated_at: subscription?.updated_at ?? null,
        error: subError?.message ?? null,
        isSubscribed: subscription?.status === 'active' && new Date(subscription?.current_period_end) > new Date(),
      };
    }
  } catch (e) {
    debug.cookieAuthException = e.message;
  }

  return NextResponse.json(debug, { status: 200 });
}
