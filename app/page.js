export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e5e5',
        padding: '16px 0'
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h1 style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: 0
          }}>ClaimFlow</h1>

          <a
            href="/admin/new-project"
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
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '80px 24px',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: 800,
          margin: '0 auto'
        }}>
          <h2 style={{
            fontSize: 48,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 20px 0',
            lineHeight: 1.1
          }}>
            Track your R&D work and build evidence as you go
          </h2>

          <p style={{
            fontSize: 20,
            color: '#333',
            margin: '0 0 40px 0',
            lineHeight: 1.5
          }}>
            ClaimFlow helps teams collect evidence for R&D tax claims in real-time.
            Add notes, upload files, and generate claim packs without the paperwork headache.
          </p>

          <div style={{display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap'}}>
            <a
              href="/admin/new-project"
              style={{
                padding: '14px 28px',
                backgroundColor: '#007acc',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 500,
                display: 'inline-block'
              }}
            >
              Start your first project
            </a>

            <a
              href="#how-it-works"
              style={{
                padding: '14px 28px',
                backgroundColor: 'white',
                color: '#007acc',
                textDecoration: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 500,
                border: '1px solid #007acc',
                display: 'inline-block'
              }}
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{
        padding: '80px 24px',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          maxWidth: 1000,
          margin: '0 auto'
        }}>
          <h3 style={{
            fontSize: 32,
            fontWeight: 600,
            color: '#1a1a1a',
            textAlign: 'center',
            margin: '0 0 60px 0'
          }}>How it works</h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 40
          }}>
            <div style={{textAlign: 'center'}}>
              <div style={{
                width: 64,
                height: 64,
                backgroundColor: '#007acc',
                borderRadius: '50%',
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                color: 'white'
              }}>1</div>
              <h4 style={{fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: '0 0 12px 0'}}>
                Create a project
              </h4>
              <p style={{color: '#333', lineHeight: 1.5, margin: 0}}>
                Set up a project with your team's emails. Everyone gets a unique email address to send updates to.
              </p>
            </div>

            <div style={{textAlign: 'center'}}>
              <div style={{
                width: 64,
                height: 64,
                backgroundColor: '#007acc',
                borderRadius: '50%',
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                color: 'white'
              }}>2</div>
              <h4 style={{fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: '0 0 12px 0'}}>
                Collect evidence daily
              </h4>
              <p style={{color: '#333', lineHeight: 1.5, margin: 0}}>
                Add quick notes, upload screenshots, email updates. Everything gets automatically organized by date.
              </p>
            </div>

            <div style={{textAlign: 'center'}}>
              <div style={{
                width: 64,
                height: 64,
                backgroundColor: '#007acc',
                borderRadius: '50%',
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                color: 'white'
              }}>3</div>
              <h4 style={{fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: '0 0 12px 0'}}>
                Generate claim pack
              </h4>
              <p style={{color: '#333', lineHeight: 1.5, margin: 0}}>
                At year-end, get a formatted document with all evidence organized by R&D categories. Print to PDF and submit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 24px',
        backgroundColor: '#f5f5f5',
        textAlign: 'center',
        color: '#333'
      }}>
        <p style={{margin: 0}}>
          ClaimFlow - Simple R&D evidence collection
        </p>
      </footer>
    </main>
  );
}
