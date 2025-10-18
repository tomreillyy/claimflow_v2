'use client';
import { useAuth } from '@/components/AuthProvider';

export function LandingHeader() {
  const { user, loading } = useAuth();

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'rgba(255,255,255,0.85)',
      backdropFilter: 'saturate(180%) blur(10px)',
      borderBottom: '1px solid rgba(0,0,0,0.06)'
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <a href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          textDecoration: 'none'
        }}>
          <img
            src="/Aird__3_-removebg-preview.png"
            alt="Aird"
            style={{
              height: 48,
              width: 'auto'
            }}
          />
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {loading ? (
            <div style={{ width: 90, height: 32, background: '#f3f4f6', borderRadius: 8 }} />
          ) : user ? (
            <a href="/" style={{
              fontSize: 14,
              color: '#0f172a',
              textDecoration: 'none',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#fff'
            }}>Go to projects</a>
          ) : (
            <>
              <a href="/auth/login" style={{
                fontSize: 14,
                color: '#0f172a',
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff'
              }}>Sign in</a>
              <a href="/admin/new-project" style={{
                fontSize: 14,
                color: '#fff',
                textDecoration: 'none',
                padding: '10px 16px',
                borderRadius: 8,
                background: '#021048',
                border: '1px solid rgba(14,165,233,0.4)'
              }}>Start a project</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
