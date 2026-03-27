'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Row = Record<string, unknown>

const TABS = [
  { id: 'humor',    label: 'Humor' },
  { id: 'captions', label: 'Captions' },
  { id: 'llm',      label: 'LLM' },
  { id: 'terms',    label: 'Terms' },
  { id: 'access',   label: 'Access' },
] as const

type TabId = typeof TABS[number]['id']

// ─── generic table helpers ───────────────────────────────────────────────────

function Table({ rows, onEdit, onDelete }: {
  rows: Row[]
  onEdit?: (row: Row) => void
  onDelete?: (row: Row) => void
}) {
  if (!rows.length) return <p style={s.empty}>No records.</p>
  const cols = Object.keys(rows[0])
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={s.table}>
        <thead>
          <tr>
            {cols.map(c => <th key={c} style={s.th}>{c}</th>)}
            {(onEdit || onDelete) && <th style={s.th}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={i % 2 === 0 ? {} : { backgroundColor: '#fafafa' }}>
              {cols.map(c => (
                <td key={c} style={s.td}>
                  {String(row[c] ?? '—').slice(0, 80)}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {onEdit && <button type="button" onClick={() => onEdit(row)} style={s.actionBtn}>Edit</button>}
                    {onDelete && <button type="button" onClick={() => onDelete(row)} style={{ ...s.actionBtn, color: '#d94f3a', borderColor: '#f0cdc8' }}>Delete</button>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── simple CRUD section ─────────────────────────────────────────────────────

function CrudSection({ title, table, fields }: {
  title: string
  table: string
  fields: { key: string; label: string; multiline?: boolean }[]
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [editing, setEditing] = useState<Row | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Row>({})

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from(table).select('*').order('created_datetime_utc', { ascending: false })
    setRows(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function save() {
    const supabase = createClient()
    if (editing) {
      await supabase.from(table).update(form).eq('id', editing.id as string)
    } else {
      await supabase.from(table).insert(form)
    }
    setEditing(null)
    setAdding(false)
    setForm({})
    load()
  }

  async function remove(row: Row) {
    const supabase = createClient()
    await supabase.from(table).delete().eq('id', row.id as string)
    load()
  }

  function startEdit(row: Row) {
    setEditing(row)
    setAdding(false)
    setForm(Object.fromEntries(fields.map(f => [f.key, row[f.key] ?? ''])))
  }

  function startAdd() {
    setAdding(true)
    setEditing(null)
    setForm({})
  }

  return (
    <div style={s.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={s.sectionTitle}>{title}</p>
        <button type="button" onClick={startAdd} style={s.addBtn}>+ Add</button>
      </div>

      {(adding || editing) && (
        <div style={s.formBox}>
          {fields.map(f => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <label style={s.label}>{f.label}</label>
              {f.multiline
                ? <textarea value={String(form[f.key] ?? '')} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...s.input, height: 72, resize: 'vertical' }} />
                : <input value={String(form[f.key] ?? '')} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={s.input} />
              }
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={save} style={{ ...s.btn, background: '#1a1a1a', color: '#fff', border: '1px solid #1a1a1a' }}>Save</button>
            <button type="button" onClick={() => { setEditing(null); setAdding(false) }} style={s.btn}>Cancel</button>
          </div>
        </div>
      )}

      <Table rows={rows} onEdit={startEdit} onDelete={remove} />
    </div>
  )
}

// ─── read-only section ────────────────────────────────────────────────────────

function ReadSection({ title, table, filter }: { title: string; table: string; filter?: Record<string, string> }) {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      let q = supabase.from(table).select('*').order('created_datetime_utc', { ascending: false })
      if (filter) {
        Object.entries(filter).forEach(([k, v]) => { q = q.eq(k, v) })
      }
      const { data } = await q
      setRows(data ?? [])
    }
    load()
  }, [])

  return (
    <div style={s.section}>
      <p style={{ ...s.sectionTitle, marginBottom: 16 }}>{title}</p>
      <Table rows={rows} />
    </div>
  )
}

// ─── humor mix (read + update caption_count) ─────────────────────────────────

function HumorMixSection() {
  const [rows, setRows] = useState<Row[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [captionCount, setCaptionCount] = useState('')

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('humor_flavor_mix').select('*')
    setRows(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function saveCount(id: string) {
    const supabase = createClient()
    await supabase.from('humor_flavor_mix').update({ caption_count: Number(captionCount) }).eq('id', id)
    setEditingId(null)
    load()
  }

  if (!rows.length) return <div style={s.section}><p style={s.sectionTitle}>Humor Mix</p><p style={s.empty}>No records.</p></div>

  return (
    <div style={s.section}>
      <p style={{ ...s.sectionTitle, marginBottom: 16 }}>Humor Mix</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              {Object.keys(rows[0]).map(c => <th key={c} style={s.th}>{c}</th>)}
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={i % 2 === 0 ? {} : { backgroundColor: '#fafafa' }}>
                {Object.keys(rows[0]).map(c => (
                  <td key={c} style={s.td}>
                    {c === 'caption_count' && editingId === String(row.id) ? (
                      <input type="number" value={captionCount} onChange={e => setCaptionCount(e.target.value)} style={{ ...s.input, width: 64 }} />
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
                    <button type="button" onClick={() => { setEditingId(String(row.id)); setCaptionCount(String(row.caption_count ?? '')) }} style={s.actionBtn}>Edit count</button>
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

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [tab, setTab] = useState<TabId>('humor')

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      <div style={s.header}>
        <div>
          <p style={s.eyebrow}>Admin</p>
          <h1 style={s.heading}><em>Pipeline.</em></h1>
        </div>
      </div>

      <div style={{ height: 2, backgroundColor: '#BDE081', marginBottom: 0 }} />

      {/* Tab bar */}
      <div style={s.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              ...s.tabBtn,
              color: tab === t.id ? '#1a1a1a' : '#999',
              borderBottom: tab === t.id ? '2px solid #1a1a1a' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.content}>

        {/* ── Humor ── */}
        {tab === 'humor' && (
          <>
            <ReadSection title="Humor Flavors" table="humor_flavors" />
            <ReadSection title="Humor Flavor Steps" table="humor_flavor_steps" />
            <HumorMixSection />
          </>
        )}

        {/* ── Captions ── */}
        {tab === 'captions' && (
          <>
            <ReadSection title="Captions" table="captions" />
            <ReadSection title="Caption Requests" table="caption_requests" />
            <CrudSection
              title="Caption Examples"
              table="caption_examples"
              fields={[
                { key: 'content', label: 'Content', multiline: true },
                { key: 'image_id', label: 'Image ID' },
                { key: 'humor_flavor_id', label: 'Humor Flavor ID' },
              ]}
            />
          </>
        )}

        {/* ── LLM ── */}
        {tab === 'llm' && (
          <>
            <CrudSection
              title="LLM Providers"
              table="llm_providers"
              fields={[
                { key: 'name', label: 'Name' },
                { key: 'base_url', label: 'Base URL' },
              ]}
            />
            <CrudSection
              title="LLM Models"
              table="llm_models"
              fields={[
                { key: 'name', label: 'Name' },
                { key: 'provider_id', label: 'Provider ID' },
                { key: 'model_id', label: 'Model ID' },
              ]}
            />
            <ReadSection title="LLM Prompt Chains" table="llm_prompt_chains" />
            <ReadSection title="LLM Model Responses" table="llm_model_responses" />
          </>
        )}

        {/* ── Terms ── */}
        {tab === 'terms' && (
          <CrudSection
            title="Terms"
            table="terms"
            fields={[
              { key: 'content', label: 'Content', multiline: true },
              { key: 'version', label: 'Version' },
            ]}
          />
        )}

        {/* ── Access ── */}
        {tab === 'access' && (
          <>
            <CrudSection
              title="Allowed Signup Domains"
              table="allowed_signup_domains"
              fields={[{ key: 'domain', label: 'Domain (e.g. company.com)' }]}
            />
            <CrudSection
              title="Whitelisted Email Addresses"
              table="whitelisted_emails"
              fields={[{ key: 'email', label: 'Email Address' }]}
            />
          </>
        )}

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
  tabBar: {
    display: 'flex',
    gap: 0,
    padding: '0 48px',
    borderBottom: '1px solid #eee',
  },
  tabBtn: {
    fontSize: 12,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '14px 20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'color 0.15s',
  },
  content: { padding: '32px 48px', display: 'flex', flexDirection: 'column', gap: 48 },
  section: {},
  sectionTitle: { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', margin: 0 },
  empty: { fontSize: 12, color: '#ccc', marginTop: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 12 },
  th: { textAlign: 'left', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', padding: '8px 12px', borderBottom: '1px solid #eee' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f5f5f5', color: '#333', verticalAlign: 'top', maxWidth: 240, wordBreak: 'break-word' },
  actionBtn: { fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 10px', background: '#fafafa', color: '#1a1a1a', border: '1px solid #ddd', cursor: 'pointer' },
  addBtn: { fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 14px', background: '#1a1a1a', color: '#fff', border: 'none', cursor: 'pointer' },
  formBox: { background: '#fafafa', border: '1px solid #eee', padding: '20px', marginBottom: 16 },
  label: { display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 6 },
  input: { width: '100%', fontSize: 12, padding: '8px 10px', border: '1px solid #ddd', outline: 'none', boxSizing: 'border-box' },
  btn: { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 16px', background: '#fafafa', color: '#1a1a1a', border: '1px solid #ddd', cursor: 'pointer' },
}
