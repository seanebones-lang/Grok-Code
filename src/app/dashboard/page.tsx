'use client';

export default function Dashboard() {
  const handleLogout = () => {
    localStorage.removeItem('grokcode_token');
    window.location.href = '/';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #1a1a2e, #16213e, #0f3460)',
      color: 'white',
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          Grok Code Dashboard
        </h1>

        <p style={{
          fontSize: '1.2rem',
          opacity: 0.8,
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          AI Coding Workspace - Successfully Loaded! 🎉
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          {/* Left Panel */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Code Editor</h2>
            <div style={{
              background: '#2a2a2a',
              borderRadius: '12px',
              padding: '2rem',
              minHeight: '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💻</div>
              <p style={{ color: '#ccc' }}>Monaco Editor Panel</p>
              <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Ready for code editing
              </p>
            </div>
          </div>

          {/* Right Panel */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>AI Chat</h2>
            <div style={{
              background: '#2a2a2a',
              borderRadius: '12px',
              padding: '2rem',
              minHeight: '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🤖</div>
              <p style={{ color: '#ccc' }}>Chat Interface Panel</p>
              <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Ready for AI conversations
              </p>
            </div>
          </div>
        </div>

        {/* Status Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>System Status</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <p style={{ opacity: 0.8 }}>Dashboard Loaded</p>
            </div>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
              <p style={{ opacity: 0.8 }}>Authentication Active</p>
            </div>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚀</div>
              <p style={{ opacity: 0.8 }}>Ready for Components</p>
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <button
              onClick={handleLogout}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Logout & Return to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}