'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Image, Zap } from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', href: '/admin' },
  { icon: Users,           label: 'Users',     id: 'users',     href: '/admin/users' },
  { icon: Image,           label: 'Images',    id: 'images',    href: '/admin/images' },
  { icon: Zap,             label: 'Pipeline',  id: 'pipeline',  href: '/admin/pipeline' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      backgroundColor: '#fff',
      borderRight: '1px solid #f0f0f0',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      padding: '28px 0 24px',
    }}>
      {/* Brand */}
      <div style={{ padding: '0 24px 28px', borderBottom: '1px solid #f5f5f5' }}>
        <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', margin: '0 0 4px' }}>Admin</p>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em' }}>The Humor Project</p>
      </div>

      {/* Nav */}
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.id}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                marginBottom: 2,
                borderRadius: 6,
                textDecoration: 'none',
                backgroundColor: isActive ? '#f5f5f5' : 'transparent',
                color: isActive ? '#1a1a1a' : '#888',
                transition: 'background-color 0.1s, color 0.1s',
              }}
            >
              <Icon size={15} strokeWidth={isActive ? 2 : 1.5} />
              <span style={{ fontSize: 13, fontWeight: isActive ? 500 : 400, letterSpacing: '-0.01em' }}>
                {item.label}
              </span>
              {isActive && (
                <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', backgroundColor: '#BDE081' }} />
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
