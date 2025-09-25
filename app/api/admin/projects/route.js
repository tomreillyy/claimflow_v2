import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req) {
  const { name, year, participants = [] } = await req.json();

  if (!name || !year) {
    return NextResponse.json({ error: 'name and year required' }, { status: 400 });
  }

  const project_token = crypto.randomBytes(24).toString('base64url'); // ~32 chars
  const inbound_email_local = 'p_' + crypto.randomBytes(5).toString('hex');

  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert({ name, year, project_token, inbound_email_local, participants })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    project: data,
    timelineUrl: `${process.env.NEXT_PUBLIC_BASE}/p/${data.project_token}`,
    uploadUrl: `${process.env.NEXT_PUBLIC_BASE}/p/${data.project_token}/upload`,
    inboundEmail: `${data.inbound_email_local}@${process.env.PUBLIC_INBOUND_DOMAIN}`
  });
}