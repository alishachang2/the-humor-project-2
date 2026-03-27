'use client'

import { createClient } from '@/lib/supabase/client'

const todayLabel = new Date().toLocaleDateString('en-US', {
  year: 'numeric', month: 'long', day: 'numeric',
})

export default function LandingPage() {
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      <div style={{ height: 3, backgroundColor: '#1a1a1a' }} />

      <header style={s.header}>
        <span style={s.label}>The Humor Project</span>
        <span style={{ ...s.label, color: '#aaa' }}>Admin</span>
      </header>

      <main style={s.main}>
        <p style={s.eyebrow}>Editorial Console</p>
        <h1 style={s.heading}>Humor,<br /><em>organized.</em></h1>
        <p style={s.body}>
          Review users, manage media, and keep the project workspace moving from one clear admin home.
        </p>
        <button type="button" onClick={handleGoogleLogin} style={s.button} className="login-btn">
          Login with Google
        </button>
      </main>

      <footer style={s.footer}>
        <span style={s.label}>© 2026</span>
        <span style={{ ...s.label, color: '#aaa' }}>{todayLabel}</span>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-btn:hover { background: #1a1a1a !important; color: #fff !important; }
      `}</style>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#fff',
    color: '#1a1a1a',
    display: 'flex',
    flexDirection: 'column',
    animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 48px',
    borderBottom: '1px solid #eee',
  },
  label: { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' },
  eyebrow: { fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', margin: '0 0 16px' },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '0 48px',
    maxWidth: 560,
  },
  heading: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 84,
    fontWeight: 400,
    lineHeight: 0.92,
    letterSpacing: '-0.03em',
    margin: '0 0 24px',
  },
  body: { fontSize: 14, lineHeight: 1.7, color: '#666', margin: '0 0 32px', maxWidth: 400 },
  button: {
    alignSelf: 'flex-start',
    padding: '11px 28px',
    border: '1px solid #1a1a1a',
    background: 'transparent',
    color: '#1a1a1a',
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '14px 48px',
    borderTop: '1px solid #eee',
  },
}
