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
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
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

// ─── captions section (grouped by image, with thumbnails) ────────────────────

type CaptionGroup = {
  imageId: string
  imageUrl: string
  captions: Row[]
}

function CaptionsSection() {
  const [groups, setGroups]       = useState<CaptionGroup[]>([])
  const [totalCaptions, setTotal] = useState(0)
  const [flavorMap, setFlavorMap] = useState<Record<string, string>>({})
  const [expanded, setExpanded]   = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: captions }, { data: flavors }] = await Promise.all([
        supabase.from('captions').select('*').order('created_datetime_utc', { ascending: false }),
        supabase.from('humor_flavors').select('id, slug, name'),
      ])

      const allCaptions = captions ?? []
      setTotal(allCaptions.length)

      const map: Record<string, string> = {}
      for (const f of flavors ?? []) map[String(f.id)] = String(f.slug ?? f.name ?? f.id)
      setFlavorMap(map)

      const imageIds = [...new Set(allCaptions.map(c => String(c.image_id)).filter(Boolean))]
      if (!imageIds.length) { setGroups([]); return }

      const { data: images } = await supabase
        .from('images')
        .select('id, url')
        .in('id', imageIds)

      const urlMap: Record<string, string> = {}
      for (const img of images ?? []) urlMap[String(img.id)] = String(img.url)

      const byImage: Record<string, Row[]> = {}
      for (const c of allCaptions) {
        const iid = String(c.image_id)
        if (!byImage[iid]) byImage[iid] = []
        byImage[iid].push(c)
      }

      setGroups(imageIds.map(iid => ({
        imageId:  iid,
        imageUrl: urlMap[iid] ?? '',
        captions: byImage[iid] ?? [],
      })))
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

  return (
    <Section title="Captions" count={totalCaptions}>
      {!groups.length ? <p style={s.empty}>No records.</p> : (
        <div style={{ border: '1px solid #eee', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
          {groups.map((group, gi) => {
            const isOpen = expanded.has(group.imageId)
            return (
              <div key={group.imageId} style={{ borderBottom: gi < groups.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                {/* Image row header */}
                <button
                  type="button"
                  onClick={() => toggle(group.imageId)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <span style={{ fontSize: 9, color: '#ccc', flexShrink: 0, display: 'inline-block', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                  {group.imageUrl ? (
                    <div style={{ width: 40, height: 40, flexShrink: 0, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                      <img src={group.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  ) : (
                    <div style={{ width: 40, height: 40, flexShrink: 0, backgroundColor: '#f5f5f5' }} />
                  )}
                  <span style={{ fontSize: 12, color: '#444', flex: 1, lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                    {group.captions[0]?.content
                      ? String(group.captions[0].content).slice(0, 90) + (String(group.captions[0].content).length > 90 ? '…' : '')
                      : <span style={{ color: '#bbb' }}>No caption text</span>}
                  </span>
                  <span style={{ fontSize: 10, color: '#bbb', flexShrink: 0 }}>
                    {group.captions.length} caption{group.captions.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {/* Expanded: all captions for this image */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f5f5f5', backgroundColor: '#fafafa' }}>
                    {group.captions.map((cap, ci) => {
                      const flavorSlug = cap.humor_flavor_id ? flavorMap[String(cap.humor_flavor_id)] : null
                      return (
                        <div key={String(cap.id)} style={{ padding: '12px 14px 12px 68px', borderBottom: ci < group.captions.length - 1 ? '1px solid #efefef' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                            <p style={{ fontSize: 12, color: '#333', lineHeight: 1.6, margin: 0, flex: 1 }}>
                              {String(cap.content ?? '—')}
                            </p>
                            {flavorSlug && (
                              <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', border: '1px solid #e8e8e8', padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>
                                {flavorSlug}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
                            {Object.entries(cap)
                              .filter(([k]) => !['id', 'content', 'image_id', 'humor_flavor_id'].includes(k))
                              .map(([k, v]) => (
                                <span key={k} style={{ fontSize: 10, color: '#bbb' }}>
                                  <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 4 }}>{k}</span>
                                  <span style={{ color: '#888' }}>{String(v ?? '—').slice(0, 60)}</span>
                                </span>
                              ))}
                          </div>
                        </div>
                      )
                    })}
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

// ─── humor flavors + steps (card grid + drill-down) ──────────────────────────

function HumorFlavorsSection() {
  const [flavors, setFlavors]         = useState<Row[]>([])
  const [selected, setSelected]       = useState<Row | null>(null)
  const [steps, setSteps]             = useState<Row[]>([])
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [loadingFlavors, setLoadingFlavors] = useState(true)
  const [loadingSteps, setLoadingSteps]     = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('humor_flavors').select('*').order('created_datetime_utc', { ascending: true })
      setFlavors(data ?? [])
      setLoadingFlavors(false)
    }
    load()
  }, [])

  function toggleStep(id: string) {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function openFlavor(flavor: Row) {
    setSelected(flavor)
    setExpandedSteps(new Set())
    setLoadingSteps(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('humor_flavor_steps')
      .select('*')
      .eq('humor_flavor_id', flavor.id)
    if (error) console.error('humor_flavor_steps:', error)
    const sorted = (data ?? []).sort((a, b) =>
      Number(a.humor_flavor_step_type_id ?? 0) - Number(b.humor_flavor_step_type_id ?? 0)
    )
    setSteps(sorted)
    setLoadingSteps(false)
  }

  if (selected) {
    return (
      <Section
        title={String(selected.slug ?? selected.id)}
        action={
          <button type="button" onClick={() => setSelected(null)} style={s.backBtn}>
            ← All Flavors
          </button>
        }
      >
        {!!selected.description && (
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 16px', lineHeight: 1.5 }}>{String(selected.description)}</p>
        )}
        {loadingSteps && <p style={s.empty}>Loading steps…</p>}
        {!loadingSteps && steps.length === 0 && <p style={s.empty}>No steps for this flavor.</p>}
        {!loadingSteps && steps.length > 0 && (
          <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 320px)', display: 'flex', flexDirection: 'column' }}>
            {steps.map((step, si) => {
              const sid = String(step.id)
              const isOpen = expandedSteps.has(sid)
              const desc = step.description ? String(step.description) : null
              return (
                <div key={sid}>
                  <div style={{ ...s.stepCard, cursor: 'pointer' }} onClick={() => toggleStep(sid)}>
                    {/* Header row — always visible */}
                    <div style={{ ...s.stepHead, userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 9, color: '#bbb', display: 'inline-block', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                        <span style={s.stepNum}>Step {String(step.order ?? step.step_order ?? si + 1)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 20 }}>
                        {!!step.input_type  && <span style={s.stepMeta}>in: <strong>{String(step.input_type)}</strong></span>}
                        {!!step.output_type && <span style={s.stepMeta}>out: <strong>{String(step.output_type)}</strong></span>}
                        {step.temperature != null && <span style={s.stepMeta}>temp: <strong>{String(step.temperature)}</strong></span>}
                      </div>
                    </div>

                    {/* Description — always visible, truncated */}
                    {desc && (
                      <div style={{ padding: '8px 14px', borderBottom: isOpen ? '1px solid #f0f0f0' : 'none', backgroundColor: '#fafafa' }}>
                        <p style={{ fontSize: 12, color: '#777', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: isOpen ? undefined : 2, WebkitBoxOrient: 'vertical' }}>
                          {desc}
                        </p>
                      </div>
                    )}

                    {/* Expanded: prompts + extra fields */}
                    {isOpen && (
                      <>
                        {!!step.system_prompt && (
                          <div style={s.promptBlock}>
                            <p style={s.promptLabel}>System Prompt</p>
                            <PromptText text={String(step.system_prompt)} />
                          </div>
                        )}
                        {!!step.user_prompt && (
                          <div style={{ ...s.promptBlock, backgroundColor: '#f9fef0', borderColor: '#ddf09a' }}>
                            <p style={s.promptLabel}>User Prompt</p>
                            <PromptText text={String(step.user_prompt)} />
                          </div>
                        )}
                        {Object.entries(step)
                          .filter(([k, v]) => !['id','humor_flavor_id','humor_flavor_step_type_id','order','step_order','input_type','output_type','temperature','system_prompt','user_prompt','description','created_datetime_utc','modified_datetime_utc'].includes(k) && v != null)
                          .map(([k, v]) => (
                            <div key={k} style={{ ...s.promptBlock, backgroundColor: '#fafafa' }}>
                              <p style={s.promptLabel}>{k}</p>
                              <PromptText text={String(v)} />
                            </div>
                          ))
                        }
                      </>
                    )}
                  </div>
                  {si < steps.length - 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px' }}>
                      <div style={{ width: 1, height: 16, backgroundColor: '#ddd', marginLeft: 14 }} />
                      <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999' }}>output → next step input</span>
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

  return (
    <Section title="Humor Flavors" count={flavors.length}>
      {loadingFlavors ? <p style={s.empty}>Loading…</p> : flavors.length === 0 ? <p style={s.empty}>No flavors.</p> : (
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
        <div style={s.flavorGrid}>
          {flavors.map(flavor => (
            <button
              key={String(flavor.id)}
              type="button"
              onClick={() => openFlavor(flavor)}
              style={s.flavorCard}
              className="flavor-card"
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', display: 'block', marginBottom: 6 }}>
                {String(flavor.slug ?? flavor.id)}
              </span>
              <p style={{ fontSize: 12, color: '#888', lineHeight: 1.5, margin: '0 0 10px', flex: 1 }}>
                {String(flavor.description ?? '—').slice(0, 120)}
              </p>
              <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa' }}>View steps →</span>
            </button>
          ))}
        </div>
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
        <div style={{ border: '1px solid #eee', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
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

// ─── study participants (profiles where is_in_study = true) ──────────────────

function StudyEmailsSection() {
  const [rows, setRows]         = useState<Row[]>([])
  const [adding, setAdding]     = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addError, setAddError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ first_name: string; last_name: string; email: string }>({ first_name: '', last_name: '', email: '' })

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('is_in_study', true)
      .order('created_datetime_utc', { ascending: false })
    setRows(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    setAddError('')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('email', addEmail.trim())
      .single()
    if (error || !data) { setAddError('No profile found with that email.'); return }
    await supabase.from('profiles').update({ is_in_study: true }).eq('id', data.id)
    setAdding(false)
    setAddEmail('')
    load()
  }

  async function handleUpdate(id: string) {
    const supabase = createClient()
    await supabase.from('profiles').update({
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      email: editForm.email,
    }).eq('id', id)
    setEditingId(null)
    load()
  }

  async function handleRemove(id: string) {
    const supabase = createClient()
    await supabase.from('profiles').update({ is_in_study: false }).eq('id', id)
    load()
  }

  function startEdit(row: Row) {
    setEditingId(String(row.id))
    setEditForm({
      first_name: String(row.first_name ?? ''),
      last_name:  String(row.last_name ?? ''),
      email:      String(row.email ?? ''),
    })
  }

  return (
    <Section
      title="Study Participants"
      count={rows.length}
      action={<button type="button" onClick={() => { setAdding(true); setAddError('') }} style={s.addBtn}>+ Add</button>}
    >
      {adding && (
        <div style={s.formBox}>
          <p style={s.formTitle}>Add by email</p>
          <input
            value={addEmail}
            onChange={e => setAddEmail(e.target.value)}
            placeholder="user@example.com"
            style={{ ...s.input, marginBottom: 8 }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          {addError && <p style={{ fontSize: 11, color: '#c0392b', margin: '0 0 8px' }}>{addError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleAdd} style={s.saveBtn}>Add</button>
            <button type="button" onClick={() => { setAdding(false); setAddEmail(''); setAddError('') }} style={s.cancelBtn}>Cancel</button>
          </div>
        </div>
      )}

      {!rows.length ? <p style={s.empty}>No study participants yet.</p> : (
        <div style={{ border: '1px solid #eee', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
          {rows.map((row, i) => {
            const id = String(row.id)
            const isEditing = editingId === id
            return (
              <div key={id} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                {isEditing ? (
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={editForm.first_name} onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} placeholder="First name" style={{ ...s.input, flex: 1 }} />
                      <input value={editForm.last_name}  onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))}  placeholder="Last name"  style={{ ...s.input, flex: 1 }} />
                    </div>
                    <input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" style={s.input} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => handleUpdate(id)} style={s.saveBtn}>Save</button>
                      <button type="button" onClick={() => setEditingId(null)} style={s.cancelBtn}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px' }}>
                    <span style={{ fontSize: 12, color: '#333', flex: 1 }}>{String(row.email ?? '—')}</span>
                    <span style={{ fontSize: 12, color: '#888' }}>{String(row.first_name ?? '')} {String(row.last_name ?? '')}</span>
                    <span style={{ fontSize: 10, color: '#bbb', fontFamily: 'monospace', marginRight: 8 }}>{id.slice(0, 8)}…</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => startEdit(row)} style={s.rowBtn}>Edit</button>
                      <button type="button" onClick={() => handleRemove(id)} style={{ ...s.rowBtn, color: '#c0392b', borderColor: '#f5c6c0' }}>Remove</button>
                    </div>
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

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [tab, setTab] = useState<TabId>('humor')

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#fff' }}>
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
            <StudyEmailsSection />
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .flavor-card:hover { border-color: #1a1a1a !important; }
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
  backBtn:     { fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 14px', background: 'none', color: '#666', border: '1px solid #e8e8e8', cursor: 'pointer' },
  flavorGrid:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  flavorCard:  { textAlign: 'left', padding: '16px', border: '1px solid #ebebeb', background: '#fff', cursor: 'pointer', transition: 'border-color 0.15s', display: 'flex', flexDirection: 'column', borderRadius: 6 },
  stepCard:    { border: '1px solid #ebebeb', overflow: 'hidden', borderRadius: 6 },
  stepHead:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa' },
  stepNum:     { fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', fontWeight: 600 },
  stepMeta:    { fontSize: 11, color: '#aaa' },
  promptBlock: { padding: '12px 14px', borderBottom: '1px solid #f5f5f5' },
  promptLabel: { fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', margin: '0 0 6px' },
}
