'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  id: string
  first_name: string
  last_name: string
  email: string
}

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const pageSize = 15

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .range(page * pageSize, page * pageSize + pageSize - 1)

      setProfiles(profile ?? [])
      setLoading(false)
    }

    fetchProfiles()
  }, [page])

  return (
    <div style={styles.page}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap"
        rel="stylesheet"
      />
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <p style={styles.eyebrow}>Directory</p>
          <h1 style={styles.heading}>
            <em style={styles.headingItalic}>Users.</em>
          </h1>
        </div>
        <div style={styles.headerMeta}>
          <span style={styles.metaCount}>
            {loading ? '—' : `${profiles.length} shown`}
          </span>
          <span style={styles.metaPage}>Page {page + 1}</span>
        </div>
      </div>

      <div style={styles.limeRule} />

      <div style={styles.tableHead}>
        <span style={{ ...styles.col, ...styles.colName }}>Name</span>
        <span style={{ ...styles.col, ...styles.colEmail }}>Email</span>
        <span style={{ ...styles.col, ...styles.colId }}>ID</span>
      </div>

      <div style={styles.tableBody}>
        {loading ? (
          <div style={styles.emptyRow}>
            <span style={styles.emptyText}>Loading…</span>
          </div>
        ) : profiles.length === 0 ? (
          <div style={styles.emptyRow}>
            <span style={styles.emptyText}>No profiles found.</span>
          </div>
        ) : (
          profiles.map((profile, i) => (
            <div
              key={profile.id}
              style={styles.row}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FAFAFA')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span style={{ ...styles.col, ...styles.colName, ...styles.rowName }}>
                <span style={styles.rowIndex}>{String(page * pageSize + i + 1).padStart(2, '0')}</span>
                {profile.first_name} {profile.last_name}
              </span>
              <span style={{ ...styles.col, ...styles.colEmail, ...styles.rowEmail }}>
                {profile.email}
              </span>
              <span style={{ ...styles.col, ...styles.colId, ...styles.rowId }}>
                {profile.id.slice(0, 8)}…
              </span>
            </div>
          ))
        )}
      </div>

      <div style={styles.bottomRule} />

      <div style={styles.bottomBar}>
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          style={{ ...styles.pageBtn, ...(page === 0 ? styles.pageBtnDisabled : {}) }}
          onMouseEnter={e => {
            if (page !== 0) {
              e.currentTarget.style.backgroundColor = '#2A2A2A'
              e.currentTarget.style.color = '#fff'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#2A2A2A'
          }}
        >
          ← Prev
        </button>

        <span style={styles.pageIndicator}>{page + 1}</span>

        <button
          onClick={() => setPage(p => p + 1)}
          disabled={profiles.length < pageSize}
          style={{ ...styles.pageBtn, ...(profiles.length < pageSize ? styles.pageBtnDisabled : {}) }}
          onMouseEnter={e => {
            if (profiles.length >= pageSize) {
              e.currentTarget.style.backgroundColor = '#2A2A2A'
              e.currentTarget.style.color = '#fff'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#2A2A2A'
          }}
        >
          Next →
        </button>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
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
    fontFamily: 'inherit',
    animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: '40px 48px 24px',
  },
  headerLeft: { display: 'flex', flexDirection: 'column' as const },
  eyebrow: {
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: '#8A8A8A',
    margin: '0 0 10px',
  },
  heading: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 72,
    fontWeight: 400,
    lineHeight: 0.9,
    letterSpacing: '-0.03em',
    color: '#2A2A2A',
    margin: 0,
  },
  headingItalic: { fontStyle: 'italic', color: '#000' },
  headerMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: 4,
    paddingBottom: 8,
  },
  metaCount: { fontSize: 11, color: '#8A8A8A', letterSpacing: '0.04em' },
  metaPage: { fontSize: 11, color: '#C0C0C0', letterSpacing: '0.04em' },
  limeRule: { width: '100%', height: 2, backgroundColor: '#BDE081' },
  tableHead: {
    display: 'flex',
    padding: '10px 48px',
    borderBottom: '1px solid #E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  col: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#8A8A8A',
  },
  colName: { flex: '0 0 30%' },
  colEmail: { flex: '0 0 45%' },
  colId: { flex: '0 0 25%' },
  tableBody: { flex: 1 },
  row: {
    display: 'flex',
    padding: '14px 48px',
    borderBottom: '1px solid #F0F0F0',
    cursor: 'default',
    transition: 'background-color 0.1s ease',
  },
  rowIndex: {
    fontSize: 10,
    color: '#C0C0C0',
    letterSpacing: '0.08em',
    marginRight: 16,
    minWidth: 24,
  },
  rowName: { fontSize: 13, fontWeight: 500, color: '#2A2A2A' },
  rowEmail: { fontSize: 12, color: '#8A8A8A', letterSpacing: '-0.01em' },
  rowId: { fontSize: 11, color: '#C0C0C0', fontFamily: 'monospace', letterSpacing: '0.04em' },
  emptyRow: {
    padding: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#C0C0C0',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
  },
  bottomRule: { width: '100%', height: 1, backgroundColor: '#E0E0E0' },
  bottomBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 48px',
  },
  pageBtn: {
    fontSize: 11,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#2A2A2A',
    background: 'transparent',
    border: '1px solid #2A2A2A',
    padding: '8px 20px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease, color 0.15s ease',
    borderRadius: 0,
  },
  pageBtnDisabled: {
    color: '#C0C0C0',
    borderColor: '#E0E0E0',
    cursor: 'not-allowed',
  },
  pageIndicator: {
    fontFamily: "'DM Serif Display', serif",
    fontStyle: 'italic',
    fontSize: 24,
    color: '#2A2A2A',
    letterSpacing: '-0.02em',
  },
}
