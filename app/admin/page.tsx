'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/admin/Sidebar'
import { Header } from '@/components/admin/Header'

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onLogout={handleLogout} />

        <main className="px-12 py-8">
          <div className="space-y-2">
            <p
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--text-soft)', fontWeight: '400', letterSpacing: '0.15em' }}
            >
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1
              style={{
                color: 'var(--text-dark)',
                fontSize: '2.5rem',
                fontWeight: '300',
                letterSpacing: '-0.02em',
              }}
            >
              Overview
            </h1>
          </div>
        </main>
      </div>
    </div>
  )
}