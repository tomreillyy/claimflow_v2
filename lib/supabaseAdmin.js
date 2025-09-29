// lib/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable. Please check your .env.local file.');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable. Please check your .env.local file.');
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey, // server-side only
  { auth: { persistSession: false } }
);