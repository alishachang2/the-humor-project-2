'use client'

import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/admin/Sidebar'
import { Header } from '@/components/admin/Header'

interface AdminShellProps {
  children: ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9f9f9' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header onLogout={handleLogout} />
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#fff' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
