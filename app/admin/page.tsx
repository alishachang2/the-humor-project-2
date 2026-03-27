'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ProfileRow = { id: string; created_datetime_utc: string }
type ImageRow   = { id: string; url: string; created_datetime_utc: string }
type CaptionRow = { id: string; content: string; image_id: string; created_datetime_utc: string }

// ─── SVG line chart ───────────────────────────────────────────────────────────

function LineChart({ data, color = '#BDE081' }: { data: { label: string; value: number }[]; color?: string }) {
  if (data.length < 2) return <p style={{ fontSize: 12, color: '#999', margin: 0 }}>Not enough data.</p>

  const W = 560, H = 100, PAD = { top: 6, right: 10, bottom: 22, left: 28 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom
  const max = Math.max(...data.map(d => d.value), 1)
  const step = iW / (data.length - 1)

  const pts = data.map((d, i) => ({
    x: PAD.left + i * step,
    y: PAD.top + iH - (d.value / max) * iH,
    ...d,
  }))

  const line = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = [`M${pts[0].x},${PAD.top + iH}`, ...pts.map(p => `L${p.x},${p.y}`), `L${pts.at(-1)!.x},${PAD.top + iH}`, 'Z'].join(' ')
  const labelStep = Math.max(1, Math.floor(data.length / 5))
  const xLabels = pts.filter((_, i) => i % labelStep === 0 || i === pts.length - 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color.replace('#','')})`} />
      {[0, 0.5, 1].map(t => {
        const y = PAD.top + iH * (1 - t)
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#f0f0f0" strokeWidth="1" />
            <text x={PAD.left - 4} y={y + 3.5} textAnchor="end" fontSize={8} fill="#ddd">{Math.round(max * t)}</text>
          </g>
        )
      })}
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(p => <circle key={p.label} cx={p.x} cy={p.y} r={2} fill={color} />)}
      {xLabels.map(p => (
        <text key={p.label} x={p.x} y={H - 2} textAnchor="middle" fontSize={8} fill="#ccc">{p.label}</text>
      ))}
    </svg>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function groupByDay(rows: { created_datetime_utc: string }[], days = 30) {
  const counts: Record<string, number> = {}
  const now = Date.now()
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(now - i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    counts[key] = 0
  }
  for (const row of rows) {
    const key = new Date(row.created_datetime_utc).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (key in counts) counts[key]++
  }
  return Object.entries(counts).map(([label, value]) => ({ label, value }))
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function pct(a: number, b: number) {
  if (b === 0) return null
  const p = Math.round(((a - b) / b) * 100)
  return p === 0 ? null : p
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [profiles, setProfiles]         = useState<ProfileRow[]>([])
  const [totalImages, setTotalImages]   = useState(0)
  const [totalCaptions, setTotalCaptions] = useState(0)
  const [totalFlavors, setTotalFlavors] = useState(0)
  const [studyCount, setStudyCount]     = useState(0)
  const [recentImages, setRecentImages] = useState<ImageRow[]>([])
  const [recentCaptions, setRecentCaptions] = useState<CaptionRow[]>([])
  const [captionsByImage, setCaptionsByImage] = useState<Record<string, number>>({})
  const [allImages, setAllImages]       = useState<ImageRow[]>([])
  const [loading, setLoading]           = useState(true)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [
        { data: profileData },
        { count: imgCount },
        { count: capCount },
        { count: flavorCount },
        { count: studyC },
        { data: recentImgData },
        { data: recentCapData },
        { data: allImgData },
      ] = await Promise.all([
        supabase.from('profiles').select('id, created_datetime_utc').order('created_datetime_utc', { ascending: true }),
        supabase.from('images').select('*', { count: 'exact', head: true }),
        supabase.from('captions').select('*', { count: 'exact', head: true }),
        supabase.from('humor_flavors').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_in_study', true),
        supabase.from('images').select('id, url, created_datetime_utc').order('created_datetime_utc', { ascending: false }).limit(6),
        supabase.from('captions').select('id, content, image_id, created_datetime_utc').order('created_datetime_utc', { ascending: false }).limit(6),
        supabase.from('images').select('id, url, created_datetime_utc').order('created_datetime_utc', { ascending: false }),
      ])

      setProfiles(profileData ?? [])
      setTotalImages(imgCount ?? 0)
      setTotalCaptions(capCount ?? 0)
      setTotalFlavors(flavorCount ?? 0)
      setStudyCount(studyC ?? 0)
      setRecentImages((recentImgData ?? []) as ImageRow[])
      setRecentCaptions((recentCapData ?? []) as CaptionRow[])
      setAllImages((allImgData ?? []) as ImageRow[])

      // fetch caption counts for recent images
      const ids = (recentImgData ?? []).map((r: { id: string }) => r.id)
      if (ids.length > 0) {
        const { data: capCounts } = await supabase
          .from('captions')
          .select('image_id')
          .in('image_id', ids)
        const map: Record<string, number> = {}
        for (const c of capCounts ?? []) {
          map[c.image_id] = (map[c.image_id] ?? 0) + 1
        }
        setCaptionsByImage(map)
      }

      setLoading(false)
    }
    load()
  }, [])

  const userGrowthData  = groupByDay(profiles, 30)
  const imageUploadData = groupByDay(allImages, 30)

  const now7  = allImages.filter(i => Date.now() - new Date(i.created_datetime_utc).getTime() < 7 * 86400000).length
  const prev7 = allImages.filter(i => {
    const age = Date.now() - new Date(i.created_datetime_utc).getTime()
    return age >= 7 * 86400000 && age < 14 * 86400000
  }).length
  const imgTrend = pct(now7, prev7)

  const newUsersToday = userGrowthData.at(-1)?.value ?? 0
  const avgCaptions   = totalImages > 0 ? (totalCaptions / totalImages).toFixed(1) : '—'

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      <div style={s.header}>
        <p style={s.eyebrow}>{today}</p>
        <h1 style={s.heading}><em>Overview.</em></h1>
      </div>
      <div style={{ height: 2, backgroundColor: '#BDE081', marginBottom: 28 }} />

      {loading ? (
        <p style={{ padding: '0 32px', fontSize: 12, color: '#999' }}>Loading…</p>
      ) : (
        <div style={s.body}>

          {/* Stat cards */}
          <div style={s.statsGrid}>
            {([
              { label: 'Users',              value: profiles.length,  note: newUsersToday > 0 ? `+${newUsersToday} today` : undefined },
              { label: 'Images',             value: totalImages,      note: imgTrend !== null ? `${imgTrend > 0 ? '+' : ''}${imgTrend}% vs prev week` : undefined },
              { label: 'Captions',           value: totalCaptions,    note: `${avgCaptions} per image avg` },
              { label: 'Flavors',            value: totalFlavors,     note: undefined },
              { label: 'Study participants', value: studyCount,       note: undefined },
            ] as { label: string; value: number; note?: string }[]).map(({ label, value, note }) => (
              <div key={label} style={s.statCard}>
                <p style={s.statLabel}>{label}</p>
                <p style={s.statValue}>{value}</p>
                {note && <p style={s.statNote}>{note}</p>}
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={s.chartRow}>
            <div style={s.chartBox}>
              <p style={s.sectionLabel}>User growth — 30 days</p>
              <LineChart data={userGrowthData} color="#BDE081" />
            </div>
            <div style={s.chartBox}>
              <p style={s.sectionLabel}>Image uploads — 30 days</p>
              <LineChart data={imageUploadData} color="#a5c8f0" />
            </div>
          </div>

          {/* Activity */}
          <div style={s.activityRow}>

            {/* Recent uploads */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.sectionLabel}>Recent uploads</p>
              <div style={s.listCard}>
                {recentImages.length === 0 ? (
                  <p style={s.empty}>No images yet.</p>
                ) : recentImages.map((img, i) => (
                  <div key={img.id} style={{ ...s.listRow, borderBottom: i < recentImages.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <div style={{ width: 36, height: 36, flexShrink: 0, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                      <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: '#555', margin: '0 0 2px' }}>
                        {captionsByImage[img.id] !== undefined
                          ? `${captionsByImage[img.id]} caption${captionsByImage[img.id] !== 1 ? 's' : ''} generated`
                          : 'Pending captions'}
                      </p>
                      <p style={{ fontSize: 10, color: '#bbb', margin: 0 }}>{timeAgo(img.created_datetime_utc)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent captions */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.sectionLabel}>Recent captions</p>
              <div style={s.listCard}>
                {recentCaptions.length === 0 ? (
                  <p style={s.empty}>No captions yet.</p>
                ) : recentCaptions.map((cap, i) => (
                  <div key={cap.id} style={{ ...s.listRow, borderBottom: i < recentCaptions.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: '#444', margin: '0 0 3px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {cap.content || <span style={{ color: '#bbb' }}>—</span>}
                      </p>
                      <p style={{ fontSize: 10, color: '#bbb', margin: 0 }}>{timeAgo(cap.created_datetime_utc)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:         { backgroundColor: '#fff', display: 'flex', flexDirection: 'column', minHeight: '100%', animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards' },
  header:       { padding: '32px 32px 20px' },
  eyebrow:      { fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', margin: '0 0 6px' },
  heading:      { fontFamily: "'DM Serif Display', serif", fontSize: 40, fontWeight: 400, lineHeight: 1, letterSpacing: '-0.02em', color: '#1a1a1a', margin: 0 },
  body:         { padding: '0 32px 48px', display: 'flex', flexDirection: 'column', gap: 32 },
  statsGrid:    { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 },
  statCard:     { padding: '18px 20px', border: '1px solid #ebebeb', backgroundColor: '#fff' },
  statLabel:    { fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#aaa', margin: '0 0 10px' },
  statValue:    { fontSize: 36, fontFamily: "'DM Serif Display', serif", fontWeight: 400, color: '#1a1a1a', margin: 0, lineHeight: 1 },
  statNote:     { fontSize: 10, color: '#bbb', margin: '7px 0 0' },
  chartRow:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  chartBox:     { border: '1px solid #ebebeb', padding: '16px 16px 10px' },
  sectionLabel: { fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#aaa', margin: '0 0 14px' },
  activityRow:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  listCard:     { border: '1px solid #ebebeb' },
  listRow:      { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px' },
  empty:        { padding: '16px 14px', fontSize: 12, color: '#bbb', margin: 0 },
}
