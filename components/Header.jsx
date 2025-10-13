'use client';
import { useAuth } from '@/components/AuthProvider';

export function Header({ projectName = null, projectToken = null }) {
  const { user, signOut, loading } = useAuth();

  return (
    <header style={{
      borderBottom: '1px solid var(--line)',
      background: '#fff'
    }}>
      <div style={{
        width: 'min(960px, 92vw)',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 0'
      }}>
        <a href="/" style={{
          textDecoration: 'none',
          fontWeight: 700,
          textTransform: 'lowercase',
          letterSpacing: '0.2px',
          fontSize: 18,
          color: 'var(--ink)'
        }}>
          aird
        </a>

        {!user && (
          <nav style={{display: 'flex', alignItems: 'center', gap: 18}}>
            <a href="#how" style={{
              textDecoration: 'none',
              color: 'var(--muted)',
              fontSize: 14
            }}>How it works</a>
            <a href="#roles" style={{
              textDecoration: 'none',
              color: 'var(--muted)',
              fontSize: 14
            }}>For teams</a>
            <a href="/admin/new-project" style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '10px 18px',
              borderRadius: 'var(--radius)',
              background: 'var(--brand)',
              color: '#fff',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid var(--brand)',
              fontSize: 14
            }}>
              Sign up
            </a>
          </nav>
        )}

        {user && (
          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            {!projectName && (
              <nav style={{display: 'flex', gap: 18, marginRight: 12}}>
                <a href="/" style={{
                  textDecoration: 'none',
                  color: 'var(--muted)',
                  fontSize: 14
                }}>Projects</a>
                <a href="/settings/team" style={{
                  textDecoration: 'none',
                  color: 'var(--muted)',
                  fontSize: 14
                }}>Team</a>
              </nav>
            )}
            {projectName && (
              <span style={{
                fontSize: 14,
                color: 'var(--muted)',
                marginRight: 12
              }}>{projectName}</span>
            )}
            <button
              onClick={signOut}
              style={{
                padding: '8px 14px',
                backgroundColor: 'transparent',
                color: 'var(--muted)',
                borderRadius: 'var(--radius)',
                fontSize: 14,
                fontWeight: 500,
                border: '1px solid var(--line)',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

