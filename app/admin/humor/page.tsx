'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Row = Record<string, unknown>

// ─── table ────────────────────────────────────────────────────────────────────

function Table({ rows }: { rows: Row[] }) {
  if (!rows.length) return <p style={s.empty}>No records.</p>
  const cols = Object.keys(rows[0])
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={s.table}>
        <thead>
          <tr>{cols.map(c => <th key={c} style={s.th}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={i % 2 === 0 ? {} : { backgroundColor: '#fafafa' }}>
              {cols.map(c => (
                <td key={c} style={s.td}>{String(row[c] ?? '—').slice(0, 80)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── humor flavors (read-only) ─────────────────────────────────────────────

export async function loadHumorFlavors() {
  const supabase = createClient()
  const { data } = await supabase
    .from('humor_flavors')
    .select('*')
    .order('created_datetime_utc', { ascending: true })
  return data ?? []
}

function HumorFlavorsSection() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHumorFlavors().then(data => { setRows(data); setLoading(false) })
  }, [])

  return (
    <div style={s.section}>
      <p style={{ ...s.sectionTitle, marginBottom: 16 }}>Humor Flavors</p>
      {loading ? <p style={s.empty}>Loading…</p> : <Table rows={rows} />}
    </div>
  )
}

// ─── humor flavor steps (read-only) ───────────────────────────────────────

export async function loadHumorFlavorSteps() {
  const supabase = createClient()
  const { data } = await supabase
    .from('humor_flavor_steps')
    .select('*')
    .order('order_by', { ascending: true })
  return data ?? []
}

function HumorFlavorStepsSection() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHumorFlavorSteps().then(data => { setRows(data); setLoading(false) })
  }, [])

  return (
    <div style={s.section}>
      <p style={{ ...s.sectionTitle, marginBottom: 16 }}>Humor Flavor Steps</p>
      {loading ? <p style={s.empty}>Loading…</p> : <Table rows={rows} />}
    </div>
  )
}

// ─── humor mix (read + update caption_count) ──────────────────────────────

export async function loadHumorMix() {
  const supabase = createClient()
  const { data } = await supabase.from('humor_flavor_mix').select('*')
  return data ?? []
}

export async function updateMixCount(id: string | number, captionCount: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('humor_flavor_mix')
    .update({ caption_count: captionCount })
    .eq('id', id)
  return error
}

function HumorMixSection() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [countInput, setCountInput] = useState('')

  useEffect(() => {
    loadHumorMix().then(data => { setRows(data); setLoading(false) })
  }, [])

  async function saveCount(id: string) {
    await updateMixCount(id, Number(countInput))
    setEditingId(null)
    loadHumorMix().then(setRows)
  }

  if (loading) return <div style={s.section}><p style={s.sectionTitle}>Humor Mix</p><p style={s.empty}>Loading…</p></div>
  if (!rows.length) return <div style={s.section}><p style={s.sectionTitle}>Humor Mix</p><p style={s.empty}>No records.</p></div>

  const cols = Object.keys(rows[0])
  return (
    <div style={s.section}>
      <p style={{ ...s.sectionTitle, marginBottom: 16 }}>Humor Mix</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              {cols.map(c => <th key={c} style={s.th}>{c}</th>)}
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={i % 2 === 0 ? {} : { backgroundColor: '#fafafa' }}>
                {cols.map(c => (
                  <td key={c} style={s.td}>
                    {c === 'caption_count' && editingId === String(row.id) ? (
                      <input
                        type="number"
                        value={countInput}
                        onChange={e => setCountInput(e.target.value)}
                        style={{ ...s.input, width: 64 }}
                      />
                    ) : String(row[c] ?? '—').slice(0, 80)}
                  </td>
                ))}
                <td style={s.td}>
                  {editingId === String(row.id) ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => saveCount(String(row.id))} style={{ ...s.actionBtn, background: '#1a1a1a', color: '#fff', borderColor: '#1a1a1a' }}>Save</button>
                      <button type="button" onClick={() => setEditingId(null)} style={s.actionBtn}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingId(String(row.id)); setCountInput(String(row.caption_count ?? '')) }}
                      style={s.actionBtn}
                    >
                      Edit count
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── page ──────────────────────────────────────────────────────────────────

export default function HumorPage() {
  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      <div style={s.header}>
        <div>
          <p style={s.eyebrow}>Config</p>
          <h1 style={s.heading}><em>Humor.</em></h1>
        </div>
      </div>

      <div style={{ height: 2, backgroundColor: '#BDE081', marginBottom: 0 }} />

      <div style={s.content}>
        <HumorFlavorsSection />
        <HumorFlavorStepsSection />
        <HumorMixSection />
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: '40px 48px 24px',
  },
  eyebrow: { fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', margin: '0 0 10px' },
  heading: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 64,
    fontWeight: 400,
    lineHeight: 0.9,
    letterSpacing: '-0.02em',
    color: '#1a1a1a',
    margin: 0,
  },
  content: { padding: '32px 48px', display: 'flex', flexDirection: 'column', gap: 48 },
  section: {},
  sectionTitle: { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', margin: 0 },
  empty: { fontSize: 12, color: '#ccc', marginTop: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 12 },
  th: { textAlign: 'left', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', padding: '8px 12px', borderBottom: '1px solid #eee' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f5f5f5', color: '#333', verticalAlign: 'top', maxWidth: 240, wordBreak: 'break-word' },
  actionBtn: { fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 10px', background: '#fafafa', color: '#1a1a1a', border: '1px solid #ddd', cursor: 'pointer' },
  input: { width: '100%', fontSize: 12, padding: '8px 10px', border: '1px solid #ddd', outline: 'none', boxSizing: 'border-box' },
}
