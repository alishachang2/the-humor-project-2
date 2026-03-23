'use client'

export default function LoginUI({ onGoogleLogin }: { onGoogleLogin: () => void }) {
  return (
    <div style={styles.page}>

      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap"
        rel="stylesheet"
      />

      {/* Top rule */}
      <div style={styles.topRule} />

      {/* Top bar */}
      <div style={styles.topBar}>
        <span style={styles.topBarLabel}>Admin</span>
        <span style={styles.topBarIssue}>Issue No. 01</span>
      </div>

      {/* Main layout — left: giant type, right: form */}
      <div style={styles.layout}>

        {/* Left — display type */}
        <div style={styles.left}>
          <p style={styles.leftEyebrow}>Access</p>
          <h1 style={styles.leftHeading}>
            Sign<br />
            <em style={styles.leftHeadingItalic}>in.</em>
          </h1>
          <div style={styles.leftRule} />
          <p style={styles.leftCaption}>
            Your workspace<br />awaits.
          </p>
        </div>

        {/* Vertical divider */}
        <div style={styles.vertRule} />

        {/* Right — form */}
        <div style={styles.right}>
          <p style={styles.rightEyebrow}>Continue with</p>

          <button
            onClick={onGoogleLogin}
            style={styles.button}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#2A2A2A'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#2A2A2A'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6085542,4.90909091 15.0758263,5.44272771 16.2436544,6.35363636 L19.359181,3.23181818 C17.3932746,1.43363636 14.8128722,0.363636364 12,0.363636364 C7.27205135,0.363636364 3.1944741,3.14770348 1.23999023,7.20409652 L5.26620003,9.76452941 Z"/>
              <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,16.8127667 C3.19279051,20.8251137 7.26500293,23.6363636 12,23.6363636 C14.713666,23.6363636 17.2081988,22.6350319 19.1046447,20.8921864 L16.0407269,18.0125889 Z"/>
              <path fill="#4A90D9" d="M19.1046447,20.8921864 C21.0584632,19.0012377 22.2727273,16.3116218 22.2727273,12 C22.2727273,11.2781357 22.1554045,10.5 21.9999999,9.81818182 L12,9.81818182 L12,14.4545455 L17.8363636,14.4545455 C17.5466544,15.9999999 16.7187727,17.2363636 16.0407269,18.0125889 L19.1046447,20.8921864 Z"/>
              <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,7.20409652 C0.43658717,8.84059517 0,10.6761467 0,12 C0,13.3497917 0.4300248,15.2159465 1.23746264,16.8127667 L5.27698177,14.2678769 Z"/>
            </svg>
            Google
          </button>

          <p style={styles.terms}>
            By continuing you agree<br />to our terms of service
          </p>
        </div>
      </div>

      {/* Bottom rule */}
      <div style={styles.bottomRule} />

      {/* Bottom bar */}
      <div style={styles.bottomBar}>
        <span style={styles.bottomBarLeft}>© 2026</span>
        <span style={styles.bottomBarRight}>
          {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: 'inherit',
    animation: 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
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
    fontWeight: 400,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: '#2A2A2A',
  },
  topBarIssue: {
    fontSize: 11,
    fontWeight: 400,
    letterSpacing: '0.1em',
    color: '#8A8A8A',
  },

  layout: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    padding: '0 48px',
    gap: 0,
  },

  left: {
    flex: 1,
    paddingRight: 64,
    paddingTop: 16,
  },
  leftEyebrow: {
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: '#8A8A8A',
    margin: '0 0 12px',
  },
  leftHeading: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 96,
    fontWeight: 400,
    lineHeight: 0.9,
    letterSpacing: '-0.03em',
    color: '#2A2A2A',
    margin: '0 0 28px',
  },
  leftHeadingItalic: {
    fontStyle: 'italic',
    color: '#000',
  },
  leftRule: {
    width: '100%',
    height: 1,
    backgroundColor: '#BDE081',
    marginBottom: 20,
  },
  leftCaption: {
    fontSize: 12,
    color: '#8A8A8A',
    lineHeight: 1.6,
    letterSpacing: '0.02em',
    margin: 0,
  },

  vertRule: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#E0E0E0',
    margin: '48px 0',
  },

  right: {
    width: 260,
    paddingLeft: 64,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0,
  },
  rightEyebrow: {
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: '#8A8A8A',
    margin: '0 0 16px',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    color: '#2A2A2A',
    border: '1px solid #2A2A2A',
    borderRadius: 0,
    fontSize: 13,
    fontWeight: 400,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, color 0.2s ease',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    marginBottom: 16,
  },
  terms: {
    fontSize: 10,
    color: '#C0C0C0',
    letterSpacing: '0.02em',
    lineHeight: 1.6,
    margin: 0,
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