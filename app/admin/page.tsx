'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ProfileRow = { id: string; created_datetime_utc: string }
type ImageRow   = { id: string; url: string; created_datetime_utc: string }
type CaptionRow = { id: string; content: string; created_datetime_utc: string }

// ─── tiny SVG line chart ──────────────────────────────────────────────────────

function LineChart({ data, color = '#BDE081' }: { data: { label: string; value: number }[]; color?: string }) {
  if (data.length < 2) return <p style={{ fontSize: 12, color: '#ccc' }}>Not enough data.</p>

  const W = 560, H = 140, PAD = { top: 10, right: 16, bottom: 28, left: 36 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const step = innerW / (data.length - 1)

  const pts = data.map((d, i) => ({
    x: PAD.left + i * step,
    y: PAD.top + innerH - (d.value / maxVal) * innerH,
    ...d,
  }))

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = [
    `M${pts[0].x},${PAD.top + innerH}`,
    ...pts.map(p => `L${p.x},${p.y}`),
    `L${pts[pts.length - 1].x},${PAD.top + innerH}`,
    'Z',
  ].join(' ')

  // show ~5 x-axis labels evenly
  const labelStep = Math.max(1, Math.floor(data.length / 5))
  const xLabels = pts.filter((_, i) => i % labelStep === 0 || i === pts.length - 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* area fill */}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaGrad)" />

      {/* grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PAD.top + innerH * (1 - t)
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#f0f0f0" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 3.5} textAnchor="end" fontSize={9} fill="#bbb">
              {Math.round(maxVal * t)}
            </text>
          </g>
        )
      })}

      {/* line */}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* dots */}
      {pts.map(p => <circle key={p.label} cx={p.x} cy={p.y} r={3} fill={color} />)}

      {/* x labels */}
      {xLabels.map(p => (
        <text key={p.label} x={p.x} y={H - 4} textAnchor="middle" fontSize={9} fill="#bbb">{p.label}</text>
      ))}
    </svg>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function groupByDay(rows: { created_datetime_utc: string }[], days = 30) {
  const counts: Record<string, number> = {}
  const now = Date.now()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000)
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    counts[key] = 0
  }
  for (const row of rows) {
    const d = new Date(row.created_datetime_utc)
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (key in counts) counts[key]++
  }
  return Object.entries(counts).map(([label, value]) => ({ label, value }))
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ border: '1px solid #eee', padding: '20px 24px', backgroundColor: '#fff' }}>
      <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', margin: '0 0 10px' }}>{label}</p>
      <p style={{ fontSize: 36, fontFamily: "'DM Serif Display', serif", fontWeight: 400, color: '#1a1a1a', margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#bbb', margin: '8px 0 0' }}>{sub}</p>}
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [profiles, setProfiles]     = useState<ProfileRow[]>([])
  const [totalImages, setTotalImages] = useState(0)
  const [totalCaptions, setTotalCaptions] = useState(0)
  const [totalFlavors, setTotalFlavors] = useState(0)
  const [recentImages, setRecentImages] = useState<ImageRow[]>([])
  const [recentCaptions, setRecentCaptions] = useState<CaptionRow[]>([])
  const [spotlightImage, setSpotlightImage] = useState<ImageRow | null>(null)
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [
        { data: profileData },
        { count: imgCount },
        { count: capCount },
        { count: flavorCount },
        { data: recentImgData },
        { data: recentCapData },
        { data: allImgData },
      ] = await Promise.all([
        supabase.from('profiles').select('id, created_datetime_utc').order('created_datetime_utc', { ascending: true }),
        supabase.from('images').select('*', { count: 'exact', head: true }),
        supabase.from('captions').select('*', { count: 'exact', head: true }),
        supabase.from('humor_flavors').select('*', { count: 'exact', head: true }),
        supabase.from('images').select('id, url, created_datetime_utc').order('created_datetime_utc', { ascending: false }).limit(5),
        supabase.from('captions').select('id, content, created_datetime_utc').order('created_datetime_utc', { ascending: false }).limit(5),
        supabase.from('images').select('id, url, created_datetime_utc'),
      ])

      setProfiles(profileData ?? [])
      setTotalImages(imgCount ?? 0)
      setTotalCaptions(capCount ?? 0)
      setTotalFlavors(flavorCount ?? 0)
      setRecentImages((recentImgData ?? []) as ImageRow[])
      setRecentCaptions((recentCapData ?? []) as CaptionRow[])

      const imgs = (allImgData ?? []) as ImageRow[]
      if (imgs.length) setSpotlightImage(imgs[Math.floor(Math.random() * imgs.length)])

      setLoading(false)
    }
    load()
  }, [])

  const userGrowthData = groupByDay(profiles, 30)
  const newUsersToday = userGrowthData[userGrowthData.length - 1]?.value ?? 0

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={s.header}>
        <div>
          <p style={s.eyebrow}>{today}</p>
          <h1 style={s.heading}><em>Overview.</em></h1>
        </div>
      </div>

      <div style={{ height: 2, backgroundColor: '#BDE081', marginBottom: 36 }} />

      {loading ? (
        <p style={{ padding: '0 48px', fontSize: 12, color: '#ccc' }}>Loading…</p>
      ) : (
        <div style={s.body}>

          {/* ── Stat cards ── */}
          <div style={s.statsGrid}>
            <StatCard label="Total Users"    value={profiles.length} sub={newUsersToday > 0 ? `+${newUsersToday} today` : 'none today'} />
            <StatCard label="Total Images"   value={totalImages} />
            <StatCard label="Total Captions" value={totalCaptions} />
            <StatCard label="Humor Flavors"  value={totalFlavors} />
          </div>

          {/* ── Main row: chart + spotlight ── */}
          <div style={s.mainRow}>

            {/* User growth chart */}
            <div style={{ flex: '1 1 0', minWidth: 0 }}>
              <p style={s.sectionTitle}>User Growth — Last 30 Days</p>
              <p style={s.sectionSub}>{profiles.length} total users</p>
              <div style={{ border: '1px solid #eee', padding: '20px 16px 12px', backgroundColor: '#fff' }}>
                <LineChart data={userGrowthData} />
              </div>
            </div>

            {/* Spotlight image */}
            <div style={{ width: 260, flexShrink: 0 }}>
              <p style={s.sectionTitle}>Image Spotlight</p>
              <p style={s.sectionSub}>Random pick</p>
              {spotlightImage ? (
                <div style={{ border: '1px solid #eee', overflow: 'hidden', backgroundColor: '#fff' }}>
                  <div style={{ aspectRatio: '1', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
                    <img
                      src={spotlightImage.url}
                      alt="spotlight"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <p style={{ fontSize: 10, color: '#bbb', margin: 0, letterSpacing: '0.06em' }}>
                      Uploaded {timeAgo(spotlightImage.created_datetime_utc)}
                    </p>
                    <p style={{ fontSize: 9, color: '#ddd', margin: '4px 0 0', wordBreak: 'break-all' }}>
                      {spotlightImage.id}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ border: '1px solid #eee', padding: 24, textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: '#ccc', margin: 0 }}>No images yet</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Recent activity ── */}
          <div style={s.activityRow}>

            {/* Recent uploads */}
            <div style={{ flex: 1 }}>
              <p style={s.sectionTitle}>Recent Uploads</p>
              <p style={s.sectionSub}>Last 5 images</p>
              <div style={{ border: '1px solid #eee', backgroundColor: '#fff' }}>
                {recentImages.length === 0 ? (
                  <p style={{ padding: 16, fontSize: 12, color: '#ccc', margin: 0 }}>No images yet.</p>
                ) : recentImages.map((img, i) => (
                  <div key={img.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < recentImages.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <div style={{ width: 36, height: 36, flexShrink: 0, overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
                      <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: '#333', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.url.split('/').pop()}</p>
                    </div>
                    <span style={{ fontSize: 10, color: '#bbb', flexShrink: 0 }}>{timeAgo(img.created_datetime_utc)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent captions */}
            <div style={{ flex: 1 }}>
              <p style={s.sectionTitle}>Recent Captions</p>
              <p style={s.sectionSub}>Last 5 generated</p>
              <div style={{ border: '1px solid #eee', backgroundColor: '#fff' }}>
                {recentCaptions.length === 0 ? (
                  <p style={{ padding: 16, fontSize: 12, color: '#ccc', margin: 0 }}>No captions yet.</p>
                ) : recentCaptions.map((cap, i) => (
                  <div key={cap.id} style={{ padding: '10px 14px', borderBottom: i < recentCaptions.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <p style={{ fontSize: 12, color: '#333', margin: '0 0 4px', lineHeight: 1.4 }}>
                      {cap.content ? String(cap.content).slice(0, 100) + (String(cap.content).length > 100 ? '…' : '') : <span style={{ color: '#ccc' }}>—</span>}
                    </p>
                    <span style={{ fontSize: 10, color: '#bbb' }}>{timeAgo(cap.created_datetime_utc)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

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
  page:         { minHeight: '100vh', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '40px 48px 24px' },
  eyebrow:      { fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', margin: '0 0 10px' },
  heading:      { fontFamily: "'DM Serif Display', serif", fontSize: 64, fontWeight: 400, lineHeight: 0.9, letterSpacing: '-0.02em', color: '#1a1a1a', margin: 0 },
  body:         { padding: '0 48px 48px', display: 'flex', flexDirection: 'column', gap: 40 },
  statsGrid:    { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  mainRow:      { display: 'flex', gap: 24, alignItems: 'flex-start' },
  activityRow:  { display: 'flex', gap: 24 },
  sectionTitle: { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', margin: '0 0 4px' },
  sectionSub:   { fontSize: 12, color: '#bbb', margin: '0 0 14px' },
}
