'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Row = Record<string, unknown>

// ─── prompt text with variable highlighting ───────────────────────────────────

function PromptText({ text }: { text: string }) {
  const parts = text.split(/(\$\{[^}]+\}|\$[a-zA-Z_]\w*)/g)
  return (
    <p style={{ fontSize: 12, color: '#444', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((part, i) =>
        /^(\$\{[^}]+\}|\$[a-zA-Z_]\w*)$/.test(part)
          ? <span key={i} style={{ backgroundColor: '#fffbe6', color: '#b7791f', borderRadius: 2, padding: '1px 4px', fontFamily: 'monospace', fontSize: 11 }}>{part}</span>
          : part
      )}
    </p>
  )
}

const TABS = [
  { id: 'humor',    label: 'Humor' },
  { id: 'captions', label: 'Captions' },
  { id: 'llm',      label: 'LLM' },
  { id: 'terms',    label: 'Terms' },
  { id: 'access',   label: 'Access' },
] as const

type TabId = typeof TABS[number]['id']

// ─── generic table ────────────────────────────────────────────────────────────

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
            {(onEdit || onDelete) && <th style={s.th}>—</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 ? '#fafafa' : '#fff' }}>
              {cols.map(c => (
                <td key={c} style={s.td}>{String(row[c] ?? '—').slice(0, 80)}</td>
              ))}
              {(onEdit || onDelete) && (
                <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {onEdit   && <button type="button" onClick={() => onEdit(row)}   style={s.rowBtn}>Edit</button>}
                    {onDelete && <button type="button" onClick={() => onDelete(row)} style={{ ...s.rowBtn, color: '#c0392b', borderColor: '#f5c6c0' }}>Delete</button>}
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

// ─── section wrapper ──────────────────────────────────────────────────────────

function Section({ title, count, action, children }: {
  title: string
  count?: number
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <p style={s.sectionTitle}>{title}</p>
          {count !== undefined && <span style={s.count}>{count}</span>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── CRUD section ─────────────────────────────────────────────────────────────

function CrudSection({ title, table, fields }: {
  title: string
  table: string
  fields: { key: string; label: string; multiline?: boolean }[]
}) {
  const [rows, setRows]       = useState<Row[]>([])
  const [editing, setEditing] = useState<Row | null>(null)
  const [adding, setAdding]   = useState(false)
  const [form, setForm]       = useState<Row>({})

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
    setEditing(null); setAdding(false); setForm({})
    load()
  }

  async function remove(row: Row) {
    const supabase = createClient()
    await supabase.from(table).delete().eq('id', row.id as string)
    load()
  }

  function startEdit(row: Row) {
    setEditing(row); setAdding(false)
    setForm(Object.fromEntries(fields.map(f => [f.key, row[f.key] ?? ''])))
  }

  function startAdd() {
    setAdding(true); setEditing(null); setForm({})
  }

  return (
    <Section
      title={title}
      count={rows.length}
      action={<button type="button" onClick={startAdd} style={s.addBtn}>+ Add</button>}
    >
      {(adding || editing) && (
        <div style={s.formBox}>
          <p style={s.formTitle}>{editing ? 'Edit record' : 'New record'}</p>
          {fields.map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={s.label}>{f.label}</label>
              {f.multiline
                ? <textarea value={String(form[f.key] ?? '')} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...s.input, height: 80, resize: 'vertical' }} />
                : <input   value={String(form[f.key] ?? '')} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={s.input} />
              }
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={save} style={s.saveBtn}>Save</button>
            <button type="button" onClick={() => { setEditing(null); setAdding(false) }} style={s.cancelBtn}>Cancel</button>
          </div>
        </div>
      )}
      <Table rows={rows} onEdit={startEdit} onDelete={remove} />
    </Section>
  )
}

// ─── read section ─────────────────────────────────────────────────────────────

function ReadSection({ title, table }: { title: string; table: string }) {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from(table).select('*').order('created_datetime_utc', { ascending: false })
      setRows(data ?? [])
    }
    load()
  }, [])

  return (
    <Section title={title} count={rows.length}>
      <Table rows={rows} />
    </Section>
  )
}

// ─── captions section (expandable) ───────────────────────────────────────────

function CaptionsSection() {
  const [rows, setRows]         = useState<Row[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('captions').select('*').order('created_datetime_utc', { ascending: false })
      setRows(data ?? [])
    }
    load()
  }, [])

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const metaKeys = rows.length ? Object.keys(rows[0]).filter(k => k !== 'content') : []

  return (
    <Section title="Captions" count={rows.length}>
      {!rows.length ? <p style={s.empty}>No records.</p> : (
        <div style={{ border: '1px solid #eee' }}>
          {rows.map((row, i) => {
            const id = String(row.id)
            const isOpen = expanded.has(id)
            return (
              <div key={id} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '11px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <span style={{ fontSize: 9, color: '#999', flexShrink: 0, display: 'inline-block', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                  <span style={{ fontSize: 12, color: '#333', lineHeight: 1.45, flex: 1 }}>
                    {row.content
                      ? String(row.content).length > 110 ? String(row.content).slice(0, 110) + '…' : String(row.content)
                      : <span style={{ color: '#999' }}>—</span>}
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: '4px 14px 14px 33px', display: 'flex', flexDirection: 'column', gap: 5, borderTop: '1px solid #f9f9f9', backgroundColor: '#fafafa' }}>
                    {metaKeys.map(k => (
                      <div key={k} style={{ display: 'flex', gap: 12 }}>
                        <span style={{ fontSize: 9, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', width: 160, flexShrink: 0, paddingTop: 2 }}>{k}</span>
                        <span style={{ fontSize: 11, color: '#555', wordBreak: 'break-all' }}>{String(row[k] ?? '—')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

// ─── humor flavors + steps (prompt chain view) ───────────────────────────────

function HumorFlavorsSection() {
  const [flavors, setFlavors] = useState<Row[]>([])
  const [steps, setSteps]     = useState<Row[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: fData }, { data: sData }] = await Promise.all([
        supabase.from('humor_flavors').select('*').order('created_datetime_utc', { ascending: true }),
        supabase.from('humor_flavor_steps').select('*'),
      ])
      setFlavors(fData ?? [])
      const sorted = (sData ?? []).sort((a, b) => {
        const aO = Number(a.humor_flavor_step_type_id ?? 0)
        const bO = Number(b.humor_flavor_step_type_id ?? 0)
        return aO - bO
      })
      setSteps(sorted)
    }
    load()
  }, [])

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function stepsFor(flavorId: string) {
    return steps.filter(s => String(s.humor_flavor_id) === flavorId)
  }

  return (
    <Section title="Humor Flavors + Steps" count={flavors.length}>
      {!flavors.length ? <p style={s.empty}>No flavors.</p> : (
        <div style={{ border: '1px solid #eee' }}>
          {flavors.map((flavor, i) => {
            const fid = String(flavor.id)
            const isOpen = expanded.has(fid)
            const flavorSteps = stepsFor(fid)
            return (
              <div key={fid} style={{ borderBottom: i < flavors.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                {/* Flavor row */}
                <button
                  type="button"
                  onClick={() => toggle(fid)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <span style={{ fontSize: 9, color: '#999', flexShrink: 0, display: 'inline-block', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', flex: 1 }}>{String(flavor.slug ?? flavor.name ?? fid)}</span>
                  <span style={{ fontSize: 10, color: '#888' }}>{flavorSteps.length} step{flavorSteps.length !== 1 ? 's' : ''}</span>
                </button>

                {/* Steps expansion */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f5f5f5', backgroundColor: '#fafafa', padding: '12px 16px 16px 40px' }}>
                    {!!flavor.description && (
                      <p style={{ fontSize: 12, color: '#777', margin: '0 0 16px', lineHeight: 1.5 }}>{String(flavor.description)}</p>
                    )}
                    {!flavorSteps.length ? (
                      <p style={{ fontSize: 12, color: '#999', margin: 0 }}>No steps.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {flavorSteps.map((step, si) => (
                          <div key={String(step.id)}>
                          <div style={{ border: '1px solid #e8e8e8', backgroundColor: '#fff' }}>
                            {/* Step header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '9px 14px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#f9f9f9' }}>
                              <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', fontWeight: 500 }}>
                                Step {String(step.order ?? step.step_order ?? si + 1)}
                              </span>
                              <div style={{ display: 'flex', gap: 14, marginLeft: 4 }}>
                                {!!step.input_type  && <span style={{ fontSize: 10, color: '#aaa' }}>in: <strong style={{ color: '#666' }}>{String(step.input_type)}</strong></span>}
                                {!!step.output_type && <span style={{ fontSize: 10, color: '#aaa' }}>out: <strong style={{ color: '#666' }}>{String(step.output_type)}</strong></span>}
                                {step.temperature != null && <span style={{ fontSize: 10, color: '#aaa' }}>temp: <strong style={{ color: '#666' }}>{String(step.temperature)}</strong></span>}
                              </div>
                            </div>
                            {/* Prompts */}
                            {!!step.system_prompt && (
                              <div style={{ padding: '10px 14px', borderBottom: !!step.user_prompt ? '1px solid #f5f5f5' : 'none' }}>
                                <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', margin: '0 0 6px' }}>System</p>
                                <PromptText text={String(step.system_prompt)} />
                              </div>
                            )}
                            {!!step.user_prompt && (
                              <div style={{ padding: '10px 14px', backgroundColor: '#f9fef0' }}>
                                <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aac940', margin: '0 0 6px' }}>User</p>
                                <PromptText text={String(step.user_prompt)} />
                              </div>
                            )}
                          </div>
                          {/* Chain connector */}
                          {si < flavorSteps.length - 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px' }}>
                              <div style={{ width: 1, height: 14, backgroundColor: '#ddd', marginLeft: 12 }} />
                              <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999' }}>output → next step input</span>
                            </div>
                          )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

// ─── llm model responses (expandable prompt + response) ───────────────────────

function LlmResponsesSection() {
  const [rows, setRows]         = useState<Row[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('llm_model_responses').select('*').order('created_datetime_utc', { ascending: false })
      setRows(data ?? [])
    }
    load()
  }, [])

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const promptKeys = ['prompt_sent', 'response_received']
  const metaKeys = rows.length
    ? Object.keys(rows[0]).filter(k => !promptKeys.includes(k))
    : []

  return (
    <Section title="LLM Model Responses" count={rows.length}>
      {!rows.length ? <p style={s.empty}>No records.</p> : (
        <div style={{ border: '1px solid #eee' }}>
          {rows.map((row, i) => {
            const id = String(row.id)
            const isOpen = expanded.has(id)
            const preview = row.response_received
              ? String(row.response_received).slice(0, 100) + (String(row.response_received).length > 100 ? '…' : '')
              : row.prompt_sent
                ? 'Prompt: ' + String(row.prompt_sent).slice(0, 80) + '…'
                : id
            return (
              <div key={id} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '11px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <span style={{ fontSize: 9, color: '#999', flexShrink: 0, display: 'inline-block', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                  <span style={{ fontSize: 12, color: '#444', flex: 1, lineHeight: 1.4 }}>{preview}</span>
                </button>
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f9f9f9', backgroundColor: '#fafafa', padding: '10px 14px 14px 33px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Meta fields */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px' }}>
                      {metaKeys.map(k => (
                        <div key={k} style={{ display: 'flex', gap: 8 }}>
                          <span style={{ fontSize: 9, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', paddingTop: 1 }}>{k}</span>
                          <span style={{ fontSize: 11, color: '#555' }}>{String(row[k] ?? '—')}</span>
                        </div>
                      ))}
                    </div>
                    {/* Prompt sent */}
                    {!!row.prompt_sent && (
                      <div>
                        <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', margin: '0 0 6px' }}>Prompt sent</p>
                        <p style={{ fontSize: 12, color: '#444', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', backgroundColor: '#fff', border: '1px solid #eee', padding: '10px 12px' }}>{String(row.prompt_sent)}</p>
                      </div>
                    )}
                    {/* Response received */}
                    {!!row.response_received && (
                      <div>
                        <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aac940', margin: '0 0 6px' }}>Response received</p>
                        <p style={{ fontSize: 12, color: '#444', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', backgroundColor: '#f9fef0', border: '1px solid #e8f5c0', padding: '10px 12px' }}>{String(row.response_received)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

// ─── humor mix ────────────────────────────────────────────────────────────────

function HumorMixSection() {
  const [rows, setRows]             = useState<Row[]>([])
  const [editingId, setEditingId]   = useState<string | null>(null)
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

  return (
    <Section title="Humor Mix" count={rows.length}>
      {!rows.length ? <p style={s.empty}>No records.</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                {Object.keys(rows[0]).map(c => <th key={c} style={s.th}>{c}</th>)}
                <th style={s.th}>—</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 ? '#fafafa' : '#fff' }}>
                  {Object.keys(rows[0]).map(c => (
                    <td key={c} style={s.td}>
                      {c === 'caption_count' && editingId === String(row.id)
                        ? <input type="number" value={captionCount} onChange={e => setCaptionCount(e.target.value)} style={{ ...s.input, width: 60 }} />
                        : String(row[c] ?? '—').slice(0, 80)}
                    </td>
                  ))}
                  <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                    {editingId === String(row.id) ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={() => saveCount(String(row.id))} style={s.saveBtn}>Save</button>
                        <button type="button" onClick={() => setEditingId(null)} style={s.cancelBtn}>Cancel</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setEditingId(String(row.id)); setCaptionCount(String(row.caption_count ?? '')) }} style={s.rowBtn}>
                        Edit count
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [tab, setTab] = useState<TabId>('humor')

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      <div style={s.header}>
        <p style={s.eyebrow}>Admin</p>
        <h1 style={s.heading}><em>Pipeline.</em></h1>
      </div>

      <div style={{ height: 2, backgroundColor: '#BDE081', marginBottom: 0 }} />

      <div style={s.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              ...s.tabBtn,
              color: tab === t.id ? '#1a1a1a' : '#aaa',
              borderBottom: tab === t.id ? '2px solid #1a1a1a' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.content}>
        {tab === 'humor' && (
          <>
            <HumorMixSection />
            <hr style={s.divider} />
            <HumorFlavorsSection />
          </>
        )}

        {tab === 'captions' && (
          <>
            <CaptionsSection />
            <hr style={s.divider} />
            <ReadSection title="Caption Requests" table="caption_requests" />
            <hr style={s.divider} />
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
            <hr style={s.divider} />
            <CrudSection
              title="LLM Models"
              table="llm_models"
              fields={[
                { key: 'name', label: 'Name' },
                { key: 'provider_id', label: 'Provider ID' },
                { key: 'model_id', label: 'Model ID' },
              ]}
            />
            <hr style={s.divider} />
            <ReadSection title="LLM Prompt Chains" table="llm_prompt_chains" />
            <hr style={s.divider} />
            <LlmResponsesSection />
          </>
        )}

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

        {tab === 'access' && (
          <>
            <CrudSection
              title="Allowed Signup Domains"
              table="allowed_signup_domains"
              fields={[{ key: 'domain', label: 'Domain (e.g. company.com)' }]}
            />
            <hr style={s.divider} />
            <CrudSection
              title="Whitelisted Emails"
              table="whitelisted_emails"
              fields={[{ key: 'email', label: 'Email Address' }]}
            />
          </>
        )}
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

const s: Record<string, React.CSSProperties> = {
  page:        { backgroundColor: '#fff', display: 'flex', flexDirection: 'column', minHeight: '100%', animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards' },
  header:      { padding: '32px 32px 20px' },
  eyebrow:     { fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', margin: '0 0 6px' },
  heading:     { fontFamily: "'DM Serif Display', serif", fontSize: 40, fontWeight: 400, lineHeight: 1, letterSpacing: '-0.02em', color: '#1a1a1a', margin: 0 },
  tabBar:      { display: 'flex', padding: '0 32px', borderBottom: '1px solid #f0f0f0' },
  tabBtn:      { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' },
  content:     { padding: '28px 32px 48px', display: 'flex', flexDirection: 'column', gap: 32 },
  divider:     { border: 'none', borderTop: '1px solid #f5f5f5', margin: 0 },
  sectionTitle:{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', margin: 0 },
  count:       { fontSize: 11, color: '#999' },
  empty:       { fontSize: 12, color: '#999', marginTop: 10 },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:          { textAlign: 'left', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', padding: '8px 12px', borderBottom: '1px solid #f0f0f0' },
  td:          { padding: '9px 12px', borderBottom: '1px solid #f8f8f8', color: '#444', verticalAlign: 'top', maxWidth: 240, wordBreak: 'break-word' },
  rowBtn:      { fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '4px 10px', background: '#fafafa', color: '#666', border: '1px solid #ebebeb', cursor: 'pointer', borderRadius: 4 },
  addBtn:      { fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 12px', background: '#1a1a1a', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 4 },
  formBox:     { background: '#fafafa', border: '1px solid #ebebeb', padding: '16px 18px', marginBottom: 14, borderRadius: 6 },
  formTitle:   { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', margin: '0 0 14px' },
  label:       { display: 'block', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: 5 },
  input:       { width: '100%', fontSize: 12, padding: '7px 10px', border: '1px solid #e8e8e8', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff', borderRadius: 4 },
  saveBtn:     { fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 14px', background: '#1a1a1a', color: '#fff', border: '1px solid #1a1a1a', cursor: 'pointer', borderRadius: 4 },
  cancelBtn:   { fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 14px', background: 'none', color: '#999', border: '1px solid #e8e8e8', cursor: 'pointer', borderRadius: 4 },
}
