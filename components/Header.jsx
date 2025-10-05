'use client';
import { useAuth } from '@/components/AuthProvider';

export function Header({ projectName = null, projectToken = null }) {
  const { user, signOut, loading } = useAuth();

  return (
    <header style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e5e5',
      padding: '16px 0'
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <a href="/" style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#1a1a1a',
            textDecoration: 'none',
            marginRight: 12
          }}>ClaimFlow</a>
          {projectName && (
            <>
              <span style={{color: '#333'}}>→</span>
              <span style={{marginLeft: 12, color: '#333'}}>{projectName}</span>
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
                color: '#666'
              }}>
                {user.email}
              </span>
              <button
                onClick={signOut}
                style={{
                  padding: '5px 10px',
                  backgroundColor: 'white',
                  color: '#666',
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
                  color: '#007acc',
                  textDecoration: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  border: '1px solid #007acc'
                }}
              >
                Sign in
              </a>
              {!projectName && (
                <a
                  href="/auth/login"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007acc',
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