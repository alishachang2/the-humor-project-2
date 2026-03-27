'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  id: string
  first_name: string
  last_name: string
  email: string
}

const PAGE_SIZE = 10

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      setProfiles(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [page])

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      <div style={s.header}>
        <div>
          <p style={s.eyebrow}>Directory</p>
          <h1 style={s.heading}><em>Users.</em></h1>
        </div>
        <span style={{ fontSize: 12, color: '#bbb' }}>{loading ? '—' : `${profiles.length} shown · page ${page + 1}`}</span>
      </div>

      <div style={s.rule} />

      {/* Table head */}
      <div style={s.tableHead}>
        <span style={{ ...s.col, flex: '0 0 30%' }}>#  Name</span>
        <span style={{ ...s.col, flex: '0 0 45%' }}>Email</span>
        <span style={{ ...s.col, flex: '0 0 25%' }}>ID</span>
      </div>

      <div>
        {loading ? (
          <p style={s.empty}>Loading…</p>
        ) : profiles.length === 0 ? (
          <p style={s.empty}>No profiles found.</p>
        ) : profiles.map((profile, i) => (
          <div key={profile.id} style={s.row} className="user-row">
            <span style={{ ...s.cell, flex: '0 0 30%', display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#ccc', minWidth: 20, fontVariantNumeric: 'tabular-nums' }}>
                {String(page * PAGE_SIZE + i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                {profile.first_name} {profile.last_name}
              </span>
            </span>
            <span style={{ ...s.cell, flex: '0 0 45%', fontSize: 12, color: '#666' }}>{profile.email}</span>
            <span style={{ ...s.cell, flex: '0 0 25%', fontSize: 11, color: '#bbb', fontFamily: 'monospace' }}>
              {profile.id.slice(0, 8)}…
            </span>
          </div>
        ))}
      </div>

      <div style={{ height: 1, backgroundColor: '#f0f0f0', margin: '0 0 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 32px' }}>
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          style={{ ...s.pageBtn, opacity: page === 0 ? 0.3 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
        >← Prev</button>
        <span style={{ fontSize: 13, color: '#ccc' }}>{page + 1}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={profiles.length < PAGE_SIZE}
          style={{ ...s.pageBtn, opacity: profiles.length < PAGE_SIZE ? 0.3 : 1, cursor: profiles.length < PAGE_SIZE ? 'not-allowed' : 'pointer' }}
        >Next →</button>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .user-row:hover { background-color: #fafafa !important; }
      `}</style>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:      { backgroundColor: '#fff', display: 'flex', flexDirection: 'column', minHeight: '100%', animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '32px 32px 20px' },
  eyebrow:   { fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb', margin: '0 0 6px' },
  heading:   { fontFamily: "'DM Serif Display', serif", fontSize: 40, fontWeight: 400, lineHeight: 1, letterSpacing: '-0.02em', color: '#1a1a1a', margin: 0 },
  rule:      { height: 2, backgroundColor: '#BDE081', marginBottom: 0 },
  tableHead: { display: 'flex', padding: '10px 32px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa' },
  col:       { fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb' },
  row:       { display: 'flex', padding: '12px 32px', borderBottom: '1px solid #f5f5f5', transition: 'background-color 0.1s' },
  cell:      { display: 'flex', alignItems: 'center' },
  empty:     { padding: '40px 32px', fontSize: 12, color: '#ccc', textAlign: 'center' },
  pageBtn:   { fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 14px', background: 'none', color: '#666', border: '1px solid #e8e8e8', cursor: 'pointer' },
}
