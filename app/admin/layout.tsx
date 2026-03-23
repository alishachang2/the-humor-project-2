import { ReactNode } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminShell>{children}</AdminShell>
}
