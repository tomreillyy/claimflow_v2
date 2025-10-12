'use client';
import { useAuth } from '@/components/AuthProvider';

export function Header({ projectName = null, projectToken = null }) {
  const { user, signOut, loading } = useAuth();

  return (
    <header style={{
      backgroundColor: 'rgba(255,255,255,0.7)',
      backdropFilter: 'saturate(180%) blur(10px)',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
      padding: '14px 0', position: 'sticky', top: 0, zIndex: 50
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
          <a href="/" style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#1a1a1a',
            textDecoration: 'none'
          }}>ClaimFlow</a>

          {/* Navigation links (show when logged in and not on a project page) */}
          {user && !projectName && (
            <nav style={{display: 'flex', gap: 16, marginLeft: 8}}>
              <a href="/" style={{
                fontSize: 14,
                color: '#334155',
                textDecoration: 'none',
                fontWeight: 500
              }}>Projects</a>
              <a href="/settings/team" style={{
                fontSize: 14,
                color: '#334155',
                textDecoration: 'none',
                fontWeight: 500
              }}>Team</a>
            </nav>
          )}

          {projectName && (
            <>
              <span style={{color: '#ccc'}}>→</span>
              <span style={{color: '#333'}}>{projectName}</span>
            </>
          )}
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          {/* Auth section */}
          {loading ? (
            <div style={{
              width: 80,
              height: 32,
              backgroundColor: '#f5f5f5',
              borderRadius: 6
            }}></div>
          ) : user ? (
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <span style={{
                fontSize: 13,
                color: '#334155'
              }}>
                {user.email}
              </span>
              <button
                onClick={signOut}
                style={{
                  padding: '5px 10px',
                  backgroundColor: 'white',
                  color: '#334155',
                  textDecoration: 'none',
                  borderRadius: 3,
                  fontSize: 12,
                  fontWeight: 500,
                  border: '1px solid #ddd',
                  cursor: 'pointer'
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <a
                href="/auth/login"
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'white',
                  color: '#0ea5e9',
                  textDecoration: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  border: '1px solid #0ea5e9'
                }}
              >
                Sign in
              </a>
              {!projectName && (
                <a
                  href="/auth/login"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#0ea5e9',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  Start a project
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

