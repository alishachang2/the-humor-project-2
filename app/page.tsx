'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const serifFontHref = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap'

export default function LandingPage() {
  const supabase = createClient()
  const todayLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div style={styles.page}>
      <link href={serifFontHref} rel="stylesheet" />

      <div style={styles.topRule} />

      <header style={styles.topBar}>
        <span style={styles.topBarLabel}>The Humor Project</span>
        <span style={styles.topBarIssue}>Admin Access</span>
      </header>

      <main style={styles.layout}>
        <section style={styles.left}>
          <p style={styles.eyebrow}>Editorial Console</p>
          <h1 style={styles.heading}>
            Humor,<br />
            <em style={styles.headingItalic}>organized.</em>
          </h1>
          <div style={styles.accentRule} />
          <p style={styles.description}>
            Review users, manage media, and keep the project workspace moving
            from one clear admin home.
          </p>
        </section>

        <div style={styles.vertRule} />

        <section style={styles.right}>
          <p style={styles.rightEyebrow}>Get started</p>

          <button
            type="button"
            onClick={handleGoogleLogin}
            style={styles.primaryButton}
            onMouseEnter={event => {
              event.currentTarget.style.backgroundColor = '#2A2A2A'
              event.currentTarget.style.color = '#FFFFFF'
            }}
            onMouseLeave={event => {
              event.currentTarget.style.backgroundColor = 'transparent'
              event.currentTarget.style.color = '#2A2A2A'
            }}
          >
            Login with Google
          </button>

          <Link
            href="/login"
            style={styles.secondaryLink}
          >
            Open login page
          </Link>

          <Link
            href="/admin"
            style={styles.secondaryLink}
          >
            Enter admin
          </Link>
        </section>
      </main>

      <div style={styles.bottomRule} />

      <footer style={styles.bottomBar}>
        <span style={styles.bottomBarLeft}>© 2026</span>
        <span style={styles.bottomBarRight}>{todayLabel}</span>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    color: '#2A2A2A',
    animation: 'fadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  topRule: {
    width: '100%',
    height: 2,
    backgroundColor: '#2A2A2A',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 48px',
    borderBottom: '1px solid #E0E0E0',
  },
  topBarLabel: {
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#2A2A2A',
  },
  topBarIssue: {
    fontSize: 11,
    letterSpacing: '0.1em',
    color: '#8A8A8A',
  },
  layout: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    padding: '0 48px',
  },
  left: {
    flex: 1,
    paddingRight: 64,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#8A8A8A',
    margin: '0 0 12px',
  },
  heading: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 96,
    fontWeight: 400,
    lineHeight: 0.9,
    letterSpacing: '-0.03em',
    margin: '0 0 28px',
  },
  headingItalic: {
    fontStyle: 'italic',
    color: '#000000',
  },
  accentRule: {
    width: '100%',
    height: 1,
    backgroundColor: '#BDE081',
    marginBottom: 20,
  },
  description: {
    maxWidth: 420,
    fontSize: 14,
    lineHeight: 1.7,
    color: '#5A5A5A',
    margin: 0,
  },
  vertRule: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#E0E0E0',
    margin: '48px 0',
  },
  right: {
    width: 280,
    paddingLeft: 64,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  rightEyebrow: {
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#8A8A8A',
    margin: '0 0 16px',
  },
  primaryButton: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #2A2A2A',
    backgroundColor: 'transparent',
    color: '#2A2A2A',
    fontSize: 13,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, color 0.2s ease',
    marginBottom: 12,
  },
  secondaryLink: {
    display: 'block',
    width: '100%',
    padding: '12px 0',
    borderBottom: '1px solid #E0E0E0',
    color: '#8A8A8A',
    textDecoration: 'none',
    fontSize: 12,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  bottomRule: {
    width: '100%',
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  bottomBar: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '14px 48px',
  },
  bottomBarLeft: {
    fontSize: 10,
    color: '#8A8A8A',
    letterSpacing: '0.08em',
  },
  bottomBarRight: {
    fontSize: 10,
    color: '#8A8A8A',
    letterSpacing: '0.04em',
  },
}
