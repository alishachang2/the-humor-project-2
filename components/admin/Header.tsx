import { Search, Bell, LogOut } from 'lucide-react'

const shellStyle = {
  backgroundColor: 'var(--background)',
  borderColor: 'var(--border-color)',
}

const searchStyle = {
  backgroundColor: 'var(--surface)',
  borderColor: 'rgba(166, 145, 141, 0.15)',
}

interface HeaderProps {
  onLogout?: () => void
}

export function Header({ onLogout }: HeaderProps) {
  return (
    <header
      className="h-20 px-12 flex items-center justify-between border-b"
      style={shellStyle}
    >
      <div className="flex-1 max-w-md">
        <div className="flex items-center gap-3 px-5 py-3 rounded-full border" style={searchStyle}>
          <Search className="w-4 h-4" style={{ color: 'var(--text-soft)' }} strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search anything..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-xs"
            style={{ color: 'var(--text-dark)' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button
          type="button"
          className="relative p-2.5 rounded-full border transition-all hover:scale-105"
          style={shellStyle}
        >
          <Bell className="w-4 h-4" style={{ color: 'var(--text-dark)' }} strokeWidth={1.5} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-coral)' }} />
        </button>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm" style={{ color: 'var(--text-dark)', fontWeight: '400' }}>Admin User</p>
            <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Administrator</p>
          </div>
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm border-2"
            style={{ backgroundColor: 'var(--accent-teal)', borderColor: 'rgba(45, 156, 156, 0.3)' }}
          >
            AU
          </div>
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all hover:opacity-70"
            style={{ color: 'var(--text-soft)', borderColor: 'var(--border-color)' }}
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            Logout
          </button>
        )}
      </div>
    </header>
  )
}
