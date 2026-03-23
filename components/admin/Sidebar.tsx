'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  FileText,
  Package,
  MessageSquare,
} from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', href: '/admin' },
  { icon: Users,           label: 'Profiles',     id: 'profiles',     href: '/admin/profiles' },
  { icon: ShoppingCart,    label: 'Orders',    id: 'orders',    href: '/admin/orders' },
  { icon: Package,         label: 'Products',  id: 'products',  href: '/admin/products' },
  { icon: BarChart3,       label: 'Analytics', id: 'analytics', href: '/admin/analytics' },
  { icon: FileText,        label: 'Reports',   id: 'reports',   href: '/admin/reports' },
  { icon: MessageSquare,   label: 'Messages',  id: 'messages',  href: '/admin/messages' },
  { icon: Settings,        label: 'Settings',  id: 'settings',  href: '/admin/settings' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-72 min-h-screen px-8 py-12 border-r flex-shrink-0"
      style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}
    >
      <div className="mb-16">
        <h1
          className="tracking-tight mb-1"
          style={{
            color: 'var(--text-dark)',
            fontSize: '1.75rem',
            fontWeight: '300',
            letterSpacing: '-0.02em',
          }}
        >
          Dashboard
        </h1>
        <div className="w-8 h-0.5 mt-2" style={{ backgroundColor: 'var(--accent-coral)' }} />
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.id}
              href={item.href}
              className="w-full flex items-center gap-4 px-0 py-3 transition-all group"
              style={{
                color: isActive ? 'var(--text-dark)' : 'var(--text-soft)',
                fontWeight: isActive ? '500' : '400',
              }}
            >
              <Icon
                className="w-4 h-4 transition-transform group-hover:scale-110"
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span className="text-sm tracking-wide">{item.label}</span>
              {isActive && (
                <div
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--accent-coral)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}