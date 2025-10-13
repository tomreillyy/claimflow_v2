// lib/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'placeholder-key';

if (!process.env.SUPABASE_URL && typeof window === 'undefined') {
  console.warn('Missing SUPABASE_URL environment variable. Admin features will not work.');
}

if (!process.env.SUPABASE_SERVICE_KEY && typeof window === 'undefined') {
  console.warn('Missing SUPABASE_SERVICE_KEY environment variable. Admin features will not work.');
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey, // server-side only
  { auth: { persistSession: false } }
);