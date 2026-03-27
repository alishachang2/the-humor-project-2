'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ProfileRow = { id: string; created_datetime_utc: string }
type ImageRow   = { id: string; url: string; created_datetime_utc: string }
type CaptionRow = { id: string; content: string; created_datetime_utc: string }

// ─── SVG line chart ───────────────────────────────────────────────────────────

function LineChart({ data, color = '#BDE081' }: { data: { label: string; value: number }[]; color?: string }) {
  if (data.length < 2) return <p style={{ fontSize: 12, color: '#ccc', margin: 0 }}>Not enough data.</p>

  const W = 560, H = 120, PAD = { top: 8, right: 12, bottom: 24, left: 30 }
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
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ag)" />
      {[0, 0.5, 1].map(t => {
        const y = PAD.top + iH * (1 - t)
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#f0f0f0" strokeWidth="1" />
            <text x={PAD.left - 5} y={y + 3.5} textAnchor="end" fontSize={8} fill="#ccc">{Math.round(max * t)}</text>
          </g>
        )
      })}
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(p => <circle key={p.label} cx={p.x} cy={p.y} r={2.5} fill={color} />)}
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
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', margin: '0 0 12px' }}>{children}</p>
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ border: '1px solid #ebebeb', backgroundColor: '#fff', ...style }}>{children}</div>
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [profiles, setProfiles]           = useState<ProfileRow[]>([])
  const [totalImages, setTotalImages]     = useState(0)
  const [totalCaptions, setTotalCaptions] = useState(0)
  const [totalFlavors, setTotalFlavors]   = useState(0)
  const [recentImages, setRecentImages]   = useState<ImageRow[]>([])
  const [recentCaptions, setRecentCaptions] = useState<CaptionRow[]>([])
  const [spotlightImage, setSpotlightImage] = useState<ImageRow | null>(null)
  const [loading, setLoading]             = useState(true)

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
  const newUsersToday  = userGrowthData.at(-1)?.value ?? 0

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      <div style={s.header}>
        <p style={s.eyebrow}>{today}</p>
        <h1 style={s.heading}><em>Overview.</em></h1>
      </div>

      <div style={{ height: 2, backgroundColor: '#BDE081', marginBottom: 40 }} />

      {loading ? (
        <p style={{ padding: '0 48px', fontSize: 12, color: '#ccc' }}>Loading…</p>
      ) : (
        <div style={s.body}>

          {/* Stats row */}
          <div style={s.statsGrid}>
            {[
              { label: 'Users',    value: profiles.length, note: newUsersToday > 0 ? `+${newUsersToday} today` : undefined },
              { label: 'Images',   value: totalImages },
              { label: 'Captions', value: totalCaptions },
              { label: 'Flavors',  value: totalFlavors },
            ].map(({ label, value, note }) => (
              <Card key={label} style={{ padding: '18px 22px' }}>
                <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', margin: '0 0 8px' }}>{label}</p>
                <p style={{ fontSize: 40, fontFamily: "'DM Serif Display', serif", fontWeight: 400, color: '#1a1a1a', margin: 0, lineHeight: 1 }}>{value}</p>
                {note && <p style={{ fontSize: 10, color: '#BDE081', margin: '6px 0 0' }}>{note}</p>}
              </Card>
            ))}
          </div>

          {/* Chart + Spotlight */}
          <div style={s.mainRow}>
            <div style={{ flex: '1 1 0', minWidth: 0 }}>
              <Label>User growth — last 30 days</Label>
              <Card style={{ padding: '18px 16px 12px' }}>
                <LineChart data={userGrowthData} />
              </Card>
            </div>

            <div style={{ width: 220, flexShrink: 0 }}>
              <Label>Image spotlight</Label>
              {spotlightImage ? (
                <Card style={{ overflow: 'hidden' }}>
                  <div style={{ aspectRatio: '1', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
                    <img src={spotlightImage.url} alt="spotlight" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ fontSize: 10, color: '#bbb', margin: 0 }}>Uploaded {timeAgo(spotlightImage.created_datetime_utc)}</p>
                  </div>
                </Card>
              ) : (
                <Card style={{ padding: 20, textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: '#ccc', margin: 0 }}>No images yet</p>
                </Card>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div style={s.activityRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Label>Recent uploads</Label>
              <Card>
                {recentImages.length === 0 ? (
                  <p style={{ padding: '14px 16px', fontSize: 12, color: '#ccc', margin: 0 }}>No images yet.</p>
                ) : recentImages.map((img, i) => (
                  <div key={img.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < recentImages.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <div style={{ width: 32, height: 32, flexShrink: 0, overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
                      <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <p style={{ flex: 1, fontSize: 12, color: '#444', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {img.url.split('/').pop()}
                    </p>
                    <span style={{ fontSize: 10, color: '#ccc', flexShrink: 0 }}>{timeAgo(img.created_datetime_utc)}</span>
                  </div>
                ))}
              </Card>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <Label>Recent captions</Label>
              <Card>
                {recentCaptions.length === 0 ? (
                  <p style={{ padding: '14px 16px', fontSize: 12, color: '#ccc', margin: 0 }}>No captions yet.</p>
                ) : recentCaptions.map((cap, i) => (
                  <div key={cap.id} style={{ padding: '11px 14px', borderBottom: i < recentCaptions.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <p style={{ fontSize: 12, color: '#444', margin: '0 0 5px', lineHeight: 1.5 }}>
                      {cap.content
                        ? String(cap.content).length > 100 ? String(cap.content).slice(0, 100) + '…' : cap.content
                        : <span style={{ color: '#ccc' }}>—</span>}
                    </p>
                    <span style={{ fontSize: 10, color: '#ccc' }}>{timeAgo(cap.created_datetime_utc)}</span>
                  </div>
                ))}
              </Card>
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
  page:        { minHeight: '100vh', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', animation: 'fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards' },
  header:      { padding: '40px 48px 20px' },
  eyebrow:     { fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb', margin: '0 0 8px' },
  heading:     { fontFamily: "'DM Serif Display', serif", fontSize: 56, fontWeight: 400, lineHeight: 0.9, letterSpacing: '-0.02em', color: '#1a1a1a', margin: 0 },
  body:        { padding: '0 48px 56px', display: 'flex', flexDirection: 'column', gap: 36 },
  statsGrid:   { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  mainRow:     { display: 'flex', gap: 20, alignItems: 'flex-start' },
  activityRow: { display: 'flex', gap: 20 },
}
