'use client';
import { useAuth } from '@/components/AuthProvider';

export function Header({ projectName = null, projectToken = null }) {
  const { user, signOut, loading } = useAuth();

  return (
    <header style={{
      borderBottom: '1px solid var(--line)',
      background: '#021048'
    }}>
      <div style={{
        width: 'min(960px, 92vw)',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0'
      }}>
        <a href="/" style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center'
        }}>
          <img
            src="/Aird__3_-removebg-preview.png"
            alt="Aird"
            style={{
              height: 80,
              width: 'auto',
              marginTop: '-10px',
              marginBottom: '-10px'
            }}
          />
        </a>

        {!user && (
          <nav style={{display: 'flex', alignItems: 'center', gap: 18}}>
            <a href="#how" style={{
              textDecoration: 'none',
              color: '#fff',
              fontSize: 14
            }}>How it works</a>
            <a href="#roles" style={{
              textDecoration: 'none',
              color: '#fff',
              fontSize: 14
            }}>For teams</a>
            <a href="/blog" style={{
              textDecoration: 'none',
              color: '#fff',
              fontSize: 14
            }}>Blog</a>
            <a href="/admin/new-project" style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '10px 18px',
              borderRadius: 'var(--radius)',
              background: '#fff',
              color: '#021048',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid #fff',
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
                  color: '#fff',
                  fontSize: 14
                }}>Projects</a>
                <a href="/blog" style={{
                  textDecoration: 'none',
                  color: '#fff',
                  fontSize: 14
                }}>Blog</a>
                <a href="/settings/team" style={{
                  textDecoration: 'none',
                  color: '#fff',
                  fontSize: 14
                }}>Team</a>
              </nav>
            )}
            {projectName && (
              <span style={{
                fontSize: 13,
                color: 'rgba(255, 255, 255, 0.85)',
                marginRight: 12,
                fontWeight: 400
              }}>Everything here becomes contemporaneous R&D evidence</span>
            )}
            <button
              onClick={signOut}
              style={{
                padding: '8px 14px',
                backgroundColor: 'transparent',
                color: '#fff',
                borderRadius: '12px',
                fontSize: 14,
                fontWeight: 500,
                border: '1px solid #fff',
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

