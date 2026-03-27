import { LogOut } from 'lucide-react'

interface HeaderProps {
  onLogout?: () => void
}

export function Header({ onLogout }: HeaderProps) {
  return (
    <header style={{
      height: 52,
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      borderBottom: '1px solid #f0f0f0',
      backgroundColor: '#fff',
      flexShrink: 0,
    }}>
      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#aaa',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 0',
          }}
        >
          <LogOut size={13} strokeWidth={1.5} />
          Logout
        </button>
      )}
    </header>
  )
}
