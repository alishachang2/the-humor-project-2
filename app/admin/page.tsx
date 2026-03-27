'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ProfileRow = { id: string; created_datetime_utc: string }
type ImageRow   = { id: string; url: string; created_datetime_utc: string }
type CaptionRow = { id: string; content: string; image_id: string; created_datetime_utc: string }

// ─── SVG line chart ───────────────────────────────────────────────────────────

function LineChart({ data, color = '#BDE081', height = 90 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  if (data.length < 2) return <p style={{ fontSize: 11, color: '#ccc', margin: 0, padding: '20px 0' }}>Not enough data.</p>

  const W = 560, H = height, PAD = { top: 8, right: 8, bottom: 20, left: 24 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom
  const max = Math.max(...data.map(d => d.value), 1)
  const stepX = iW / (data.length - 1)

  const pts = data.map((d, i) => ({
    x: PAD.left + i * stepX,
    y: PAD.top + iH - (d.value / max) * iH,
    ...d,
  }))

  // smooth bezier
  function bezier(pts: { x: number; y: number }[]) {
    if (pts.length < 2) return ''
    let d = `M${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i - 1].x + pts[i].x) / 2
      d += ` C${cp1x},${pts[i - 1].y} ${cp1x},${pts[i].y} ${pts[i].x},${pts[i].y}`
    }
    return d
  }

  const linePath = bezier(pts)
  const areaPath = linePath + ` L${pts.at(-1)!.x},${PAD.top + iH} L${pts[0].x},${PAD.top + iH} Z`
  const labelStep = Math.max(1, Math.floor(data.length / 5))
  const xLabels = pts.filter((_, i) => i % labelStep === 0 || i === pts.length - 1)
  const gid = `g${color.replace('#', '')}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={PAD.left} y1={PAD.top + iH * (1 - t)} x2={W - PAD.right} y2={PAD.top + iH * (1 - t)} stroke="#ebebeb" strokeWidth="1" />
      ))}
      <path d={areaPath} fill={`url(#${gid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.filter(p => p.value > 0).map(p => <circle key={p.label} cx={p.x} cy={p.y} r={2} fill={color} />)}
      {xLabels.map(p => (
        <text key={p.label} x={p.x} y={H - 1} textAnchor="middle" fontSize={8} fill="#999">{p.label}</text>
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

function weekCount(rows: { created_datetime_utc: string }[], offset = 0) {
  return rows.filter(r => {
    const age = Date.now() - new Date(r.created_datetime_utc).getTime()
    return age >= offset * 7 * 86400000 && age < (offset + 1) * 7 * 86400000
  }).length
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [profiles, setProfiles]           = useState<ProfileRow[]>([])
  const [totalImages, setTotalImages]     = useState(0)
  const [totalCaptions, setTotalCaptions] = useState(0)
  const [totalFlavors, setTotalFlavors]   = useState(0)
  const [studyCount, setStudyCount]       = useState(0)
  const [recentImages, setRecentImages]   = useState<ImageRow[]>([])
  const [recentCaptions, setRecentCaptions] = useState<CaptionRow[]>([])
  const [captionsByImage, setCaptionsByImage] = useState<Record<string, number>>({})
  const [allImages, setAllImages]         = useState<ImageRow[]>([])
  const [loading, setLoading]             = useState(true)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

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
        supabase.from('images').select('id, url, created_datetime_utc').order('created_datetime_utc', { ascending: false }).limit(5),
        supabase.from('captions').select('id, content, image_id, created_datetime_utc').order('created_datetime_utc', { ascending: false }).limit(5),
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

      const ids = (recentImgData ?? []).map((r: { id: string }) => r.id)
      if (ids.length) {
        const { data: capCounts } = await supabase.from('captions').select('image_id').in('image_id', ids)
        const map: Record<string, number> = {}
        for (const c of capCounts ?? []) map[c.image_id] = (map[c.image_id] ?? 0) + 1
        setCaptionsByImage(map)
      }

      setLoading(false)
    }
    load()
  }, [])

  const userGrowthData  = groupByDay(profiles, 30)
  const imageUploadData = groupByDay(allImages, 30)
  const newUsersToday   = userGrowthData.at(-1)?.value ?? 0
  const avgCaptions     = totalImages > 0 ? (totalCaptions / totalImages).toFixed(1) : '—'
  const imgsThisWeek    = weekCount(allImages, 0)
  const imgsPrevWeek    = weekCount(allImages, 1)
  const imgDelta        = imgsThisWeek - imgsPrevWeek

  const stats = [
    { label: 'Users',       value: profiles.length, sub: newUsersToday > 0 ? `+${newUsersToday} today` : null, positive: newUsersToday > 0 },
    { label: 'Images',      value: totalImages,      sub: imgDelta !== 0 ? `${imgDelta > 0 ? '+' : ''}${imgDelta} this week` : null, positive: imgDelta > 0 },
    { label: 'Captions',    value: totalCaptions,    sub: totalImages > 0 ? `${avgCaptions} per image` : null, positive: true },
    { label: 'Flavors',     value: totalFlavors,     sub: null, positive: false },
    { label: 'In study',    value: studyCount,       sub: profiles.length > 0 ? `${Math.round(studyCount / profiles.length * 100)}% of users` : null, positive: true },
  ]

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      <div style={s.header}>
        <div>
          <p style={s.eyebrow}>{today}</p>
          <h1 style={s.heading}><em>Overview.</em></h1>
        </div>
      </div>
      <div style={{ height: 2, backgroundColor: '#BDE081', marginBottom: 32 }} />

      {loading ? (
        <p style={{ padding: '0 32px', fontSize: 12, color: '#bbb' }}>Loading…</p>
      ) : (
        <div style={s.body}>

          {/* ── stat strip ── */}
          <div style={s.statsRow}>
            {stats.map(({ label, value, sub, positive }) => (
              <div key={label} style={s.statCard}>
                <p style={s.statLabel}>{label}</p>
                <p style={s.statValue}>{value.toLocaleString()}</p>
                {sub && (
                  <p style={{ ...s.statSub, color: positive ? '#9ec95a' : '#bbb' }}>{sub}</p>
                )}
              </div>
            ))}
          </div>

          {/* ── charts ── */}
          <div style={s.chartGrid}>
            <div style={s.chartPanel}>
              <div style={s.chartHeader}>
                <span style={s.panelLabel}>User growth</span>
                <span style={s.panelMeta}>30 days</span>
              </div>
              <LineChart data={userGrowthData} color="#BDE081" height={100} />
            </div>
            <div style={s.chartPanel}>
              <div style={s.chartHeader}>
                <span style={s.panelLabel}>Image uploads</span>
                <span style={s.panelMeta}>30 days</span>
              </div>
              <LineChart data={imageUploadData} color="#93c5fd" height={100} />
            </div>
          </div>

          {/* ── activity ── */}
          <div style={s.activityGrid}>

            {/* Recent uploads */}
            <div>
              <div style={s.panelHead}>
                <span style={s.panelLabel}>Recent uploads</span>
                <span style={s.panelMeta}>{recentImages.length} shown</span>
              </div>
              <div style={s.panel}>
                {recentImages.length === 0 ? (
                  <p style={s.empty}>No uploads yet.</p>
                ) : recentImages.map((img, i) => (
                  <div key={img.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < recentImages.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <div style={{ width: 42, height: 42, flexShrink: 0, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                      <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: '#444', margin: '0 0 3px', fontWeight: 500 }}>
                        {captionsByImage[img.id] != null
                          ? `${captionsByImage[img.id]} caption${captionsByImage[img.id] !== 1 ? 's' : ''}`
                          : <span style={{ color: '#999', fontWeight: 400 }}>Pending</span>}
                      </p>
                      <p style={{ fontSize: 10, color: '#888', margin: 0 }}>{timeAgo(img.created_datetime_utc)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent captions */}
            <div>
              <div style={s.panelHead}>
                <span style={s.panelLabel}>Recent captions</span>
                <span style={s.panelMeta}>{recentCaptions.length} shown</span>
              </div>
              <div style={s.panel}>
                {recentCaptions.length === 0 ? (
                  <p style={s.empty}>No captions yet.</p>
                ) : recentCaptions.map((cap, i) => (
                  <div key={cap.id} style={{ padding: '12px 16px', borderBottom: i < recentCaptions.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <p style={{ fontSize: 12, color: '#333', margin: '0 0 6px', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {cap.content || <span style={{ color: '#999' }}>—</span>}
                    </p>
                    <p style={{ fontSize: 10, color: '#888', margin: 0 }}>{timeAgo(cap.created_datetime_utc)}</p>
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
  page:        { backgroundColor: '#fff', display: 'flex', flexDirection: 'column', minHeight: '100%', animation: 'fadeUp 0.25s cubic-bezier(0.16,1,0.3,1) forwards' },
  header:      { padding: '32px 32px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  eyebrow:     { fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', margin: '0 0 6px' },
  heading:     { fontFamily: "'DM Serif Display', serif", fontSize: 40, fontWeight: 400, lineHeight: 1, letterSpacing: '-0.02em', color: '#1a1a1a', margin: 0 },
  body:        { padding: '0 32px 48px', display: 'flex', flexDirection: 'column', gap: 24 },

  // stats
  statsRow:    { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, backgroundColor: '#ebebeb', border: '1px solid #ebebeb' },
  statCard:    { backgroundColor: '#fff', padding: '20px 22px 18px' },
  statLabel:   { fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', margin: '0 0 12px' },
  statValue:   { fontFamily: "'DM Serif Display', serif", fontSize: 38, fontWeight: 400, color: '#1a1a1a', margin: 0, lineHeight: 1 },
  statSub:     { fontSize: 10, margin: '8px 0 0', fontWeight: 500 },

  // charts
  chartGrid:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, backgroundColor: '#ebebeb', border: '1px solid #ebebeb' },
  chartPanel:  { backgroundColor: '#fff', padding: '18px 18px 12px' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  panelLabel:  { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', fontWeight: 500 },
  panelMeta:   { fontSize: 10, color: '#999' },

  // activity
  activityGrid:{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, backgroundColor: '#ebebeb', border: '1px solid #ebebeb' },
  panelHead:   { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '14px 16px 10px', backgroundColor: '#fff', borderBottom: '1px solid #f5f5f5' },
  panel:       { backgroundColor: '#fff' },
  empty:       { padding: '20px 16px', fontSize: 12, color: '#999', margin: 0 },
}
