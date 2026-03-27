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

// ─── page ──────────────────────────────────────────────────────────────────

export default function HumorPage() {
  const [flavors, setFlavors] = useState<Row[]>([])
  const [mix, setMix] = useState<Row[]>([])
  const [selected, setSelected] = useState<Row | null>(null)
  const [steps, setSteps] = useState<Row[]>([])
  const [loadingFlavors, setLoadingFlavors] = useState(true)
  const [loadingSteps, setLoadingSteps] = useState(false)
  const [editingMixId, setEditingMixId] = useState<string | null>(null)
  const [countInput, setCountInput] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: f }, { data: m }] = await Promise.all([
        supabase.from('humor_flavors').select('*').order('created_datetime_utc', { ascending: true }),
        supabase.from('humor_flavor_mix').select('*'),
      ])
      setFlavors(f ?? [])
      setMix(m ?? [])
      setLoadingFlavors(false)
    }
    load()
  }, [])

  async function openFlavor(flavor: Row) {
    setSelected(flavor)
    setLoadingSteps(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('humor_flavor_steps')
      .select('*')
      .eq('flavor_id', flavor.id)
    if (error) console.error('humor_flavor_steps:', error)
    const sorted = (data ?? []).sort((a, b) => {
      const aO = Number(a.order ?? a.step_order ?? 0)
      const bO = Number(b.order ?? b.step_order ?? 0)
      return aO - bO
    })
    setSteps(sorted)
    setLoadingSteps(false)
  }

  async function saveMixCount(id: string) {
    const supabase = createClient()
    await supabase.from('humor_flavor_mix').update({ caption_count: Number(countInput) }).eq('id', id)
    const { data } = await supabase.from('humor_flavor_mix').select('*')
    setMix(data ?? [])
    setEditingMixId(null)
  }

  const mixCols = mix.length ? Object.keys(mix[0]) : []

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      <div style={s.header}>
        <div>
          <p style={s.eyebrow}>Configuration</p>
          <h1 style={s.heading}><em>Humor.</em></h1>
        </div>
        {selected && (
          <button type="button" onClick={() => setSelected(null)} style={s.backBtn}>
            ← All Flavors
          </button>
        )}
      </div>

      <div style={{ height: 2, backgroundColor: '#BDE081', marginBottom: 32 }} />

      {/* ── flavor list + mix ── */}
      {!selected && (
        <div style={s.body}>

          {/* Flavor cards */}
          <section>
            <p style={s.sectionTitle}>Humor Flavors</p>
            <p style={s.sectionSub}>Click a flavor to inspect its prompt chain steps.</p>
            {loadingFlavors ? <p style={s.muted}>Loading…</p> : flavors.length === 0 ? <p style={s.muted}>No flavors.</p> : (
              <div style={s.grid}>
                {flavors.map(flavor => {
                  const mixEntry = mix.find(m => m.flavor_id === flavor.id)
                  return (
                    <button
                      key={String(flavor.id)}
                      type="button"
                      onClick={() => openFlavor(flavor)}
                      style={s.card}
                      className="flavor-card"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={s.cardTitle}>{String(flavor.slug ?? flavor.id)}</span>
                        {mixEntry && (
                          <span style={s.badge}>{String(mixEntry.caption_count)} captions</span>
                        )}
                      </div>
                      <p style={s.cardDesc}>{String(flavor.description ?? '—').slice(0, 120)}</p>
                      <span style={s.cardCta}>View steps →</span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Humor Mix */}
          <section>
            <p style={s.sectionTitle}>Humor Mix</p>
            <p style={s.sectionSub}>Controls which flavor runs and how many captions are generated per request.</p>
            {mix.length === 0 ? <p style={s.muted}>No mix config.</p> : (
              <table style={s.table}>
                <thead>
                  <tr>
                    {mixCols.map(c => <th key={c} style={s.th}>{c}</th>)}
                    <th style={s.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mix.map((row, i) => (
                    <tr key={String(row.id)} style={i % 2 === 0 ? {} : { backgroundColor: '#fafafa' }}>
                      {mixCols.map(c => (
                        <td key={c} style={s.td}>
                          {c === 'caption_count' && editingMixId === String(row.id)
                            ? <input type="number" value={countInput} onChange={e => setCountInput(e.target.value)} style={{ ...s.input, width: 72 }} />
                            : String(row[c] ?? '—').slice(0, 80)
                          }
                        </td>
                      ))}
                      <td style={s.td}>
                        {editingMixId === String(row.id) ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={() => saveMixCount(String(row.id))} style={{ ...s.btn, background: '#1a1a1a', color: '#fff', borderColor: '#1a1a1a' }}>Save</button>
                            <button type="button" onClick={() => setEditingMixId(null)} style={s.btn}>Cancel</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => { setEditingMixId(String(row.id)); setCountInput(String(row.caption_count ?? '')) }} style={s.btn}>
                            Edit count
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

        </div>
      )}

      {/* ── flavor drill-down: steps ── */}
      {selected && (
        <div style={s.body}>
          <section>
            <p style={s.sectionTitle}>{String(selected.slug ?? selected.id)}</p>
            <p style={s.sectionSub}>{String(selected.description ?? '')}</p>

            {loadingSteps && <p style={s.muted}>Loading steps…</p>}
            {!loadingSteps && steps.length === 0 && <p style={s.muted}>No steps for this flavor.</p>}
            {!loadingSteps && steps.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {steps.map((step, si) => (
                  <div key={String(step.id)}>
                    <div style={s.stepCard}>

                      {/* Step header */}
                      <div style={s.stepHead}>
                        <span style={s.stepNum}>Step {String(step.order ?? step.step_order ?? si + 1)}</span>
                        <div style={{ display: 'flex', gap: 20 }}>
                          {!!step.input_type  && <span style={s.stepMeta}>in: <strong>{String(step.input_type)}</strong></span>}
                          {!!step.output_type && <span style={s.stepMeta}>out: <strong>{String(step.output_type)}</strong></span>}
                          {step.temperature != null && <span style={s.stepMeta}>temp: <strong>{String(step.temperature)}</strong></span>}
                        </div>
                      </div>

                      {/* System prompt */}
                      {!!step.system_prompt && (
                        <div style={s.promptBlock}>
                          <p style={s.promptLabel}>System Prompt</p>
                          <PromptText text={String(step.system_prompt)} />
                        </div>
                      )}

                      {/* User prompt */}
                      {!!step.user_prompt && (
                        <div style={{ ...s.promptBlock, backgroundColor: '#f9fef0', borderColor: '#ddf09a' }}>
                          <p style={s.promptLabel}>User Prompt</p>
                          <PromptText text={String(step.user_prompt)} />
                        </div>
                      )}

                      {/* Any other fields */}
                      {Object.entries(step)
                        .filter(([k, v]) => !['id','flavor_id','order','step_order','input_type','output_type','temperature','system_prompt','user_prompt','created_datetime_utc','modified_datetime_utc'].includes(k) && v != null)
                        .map(([k, v]) => (
                          <div key={k} style={{ ...s.promptBlock, backgroundColor: '#fafafa' }}>
                            <p style={s.promptLabel}>{k}</p>
                            <PromptText text={String(v)} />
                          </div>
                        ))
                      }

                    </div>
                    {/* Chain connector */}
                    {si < steps.length - 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px' }}>
                        <div style={{ width: 1, height: 16, backgroundColor: '#ddd', marginLeft: 14 }} />
                        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ccc' }}>output → next step input</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .flavor-card:hover { border-color: #1a1a1a !important; }
      `}</style>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '40px 48px 24px' },
  eyebrow: { fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', margin: '0 0 10px' },
  heading: { fontFamily: "'DM Serif Display', serif", fontSize: 64, fontWeight: 400, lineHeight: 0.9, letterSpacing: '-0.02em', color: '#1a1a1a', margin: 0 },
  backBtn: { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 16px', background: 'transparent', color: '#1a1a1a', border: '1px solid #ddd', cursor: 'pointer' },
  body: { padding: '0 48px 48px', display: 'flex', flexDirection: 'column', gap: 48 },
  sectionTitle: { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', margin: '0 0 4px' },
  sectionSub: { fontSize: 12, color: '#bbb', margin: '0 0 20px' },
  muted: { fontSize: 12, color: '#ccc' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 },
  card: { textAlign: 'left', padding: '20px', border: '1px solid #eee', background: '#fff', cursor: 'pointer', transition: 'border-color 0.15s', display: 'flex', flexDirection: 'column' },
  cardTitle: { fontSize: 13, fontWeight: 500, color: '#1a1a1a' },
  badge: { fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', border: '1px solid #eee', padding: '2px 7px', whiteSpace: 'nowrap' },
  cardDesc: { fontSize: 12, color: '#777', lineHeight: 1.55, margin: '8px 0 12px', flex: 1 },
  cardCta: { fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', padding: '8px 12px', borderBottom: '1px solid #eee' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f5f5f5', color: '#333', verticalAlign: 'top', maxWidth: 280, wordBreak: 'break-word' },
  btn: { fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '5px 12px', background: '#fafafa', color: '#1a1a1a', border: '1px solid #ddd', cursor: 'pointer' },
  input: { fontSize: 12, padding: '6px 8px', border: '1px solid #ddd', outline: 'none', boxSizing: 'border-box' },
  stepCard: { border: '1px solid #eee', overflow: 'hidden' },
  stepHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #eee', backgroundColor: '#fafafa' },
  stepNum: { fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1a1a1a', fontWeight: 500 },
  stepMeta: { fontSize: 11, color: '#aaa' },
  promptBlock: { padding: '14px 16px', borderBottom: '1px solid #f5f5f5' },
  promptLabel: { fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', margin: '0 0 8px' },
  promptText: { fontSize: 12, color: '#444', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
}
