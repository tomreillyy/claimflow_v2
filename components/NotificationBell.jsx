'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

function relativeTime(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const fetchNotifications = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Fetch on mount
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) {
      fetchNotifications();
      if (unreadCount > 0) markAllRead();
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={ref}>
      <button
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <Bell size={18} color={isOpen ? '#021048' : '#6b7280'} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          backgroundColor: '#fff',
          borderRadius: 10,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.04)',
          width: 320,
          maxHeight: 400,
          overflowY: 'auto',
          zIndex: 100,
        }}>
          <div style={{
            padding: '12px 14px',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            fontSize: 13,
            fontWeight: 600,
            color: '#021048',
          }}>
            Notifications
          </div>

          {notifications.length === 0 ? (
            <div style={{
              padding: '24px 14px',
              textAlign: 'center',
              fontSize: 13,
              color: '#9ca3af',
            }}>
              No notifications yet
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} style={{
                padding: '10px 14px',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                backgroundColor: n.read ? 'transparent' : 'rgba(2, 16, 72, 0.03)',
              }}>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.4 }}>
                  {n.message}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  {relativeTime(n.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
