import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

// GET /api/notifications — fetch recent notifications for the authenticated user
export async function GET(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { data: notifications, error } = await supabaseAdmin
    .from('notifications')
    .select('id, created_at, message, type, read, metadata')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const unreadCount = (notifications || []).filter(n => !n.read).length;

  return NextResponse.json({ notifications: notifications || [], unreadCount });
}

// PATCH /api/notifications — mark all unread notifications as read
export async function PATCH(req) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
