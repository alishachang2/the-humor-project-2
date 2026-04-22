'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ProfileRow = { id: string; created_datetime_utc: string }
type ImageRow   = { id: string; url: string; created_datetime_utc: string }
type CaptionRow = { id: string; content: string; image_id: string; created_datetime_utc: string }

type VoteSummary  = { total_votes: number; upvotes: number; downvotes: number; captions_rated: number; raters: number }
type FlavorStat   = { flavor: string; total_votes: number; upvotes: number; downvotes: number; upvote_pct: number }
type DailyStat    = { day: string; total_votes: number; upvotes: number; downvotes: number }
type TopCaption   = { id: string; content: string; flavor: string; total_votes: number; upvotes: number; upvote_pct: number }

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

// Stacked upvote/downvote chart
function VoteChart({ data, height = 100 }: { data: DailyStat[]; height?: number }) {
  if (data.length < 2) return <p style={{ fontSize: 11, color: '#ccc', margin: 0, padding: '20px 0' }}>Not enough data.</p>

  const W = 560, H = height, PAD = { top: 8, right: 8, bottom: 20, left: 24 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.map(d => d.total_votes), 1)
  const stepX = iW / (data.length - 1)

  const upPts  = data.map((d, i) => ({ x: PAD.left + i * stepX, y: PAD.top + iH - (d.upvotes / maxVal) * iH, label: d.day }))
  const dnPts  = data.map((d, i) => ({ x: PAD.left + i * stepX, y: PAD.top + iH - (d.downvotes / maxVal) * iH, label: d.day }))

  function bezier(pts: { x: number; y: number }[]) {
    if (pts.length < 2) return ''
    let path = `M${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i - 1].x + pts[i].x) / 2
      path += ` C${cp1x},${pts[i - 1].y} ${cp1x},${pts[i].y} ${pts[i].x},${pts[i].y}`
    }
    return path
  }

  const upLine   = bezier(upPts)
  const dnLine   = bezier(dnPts)
  const upArea   = upLine + ` L${upPts.at(-1)!.x},${PAD.top + iH} L${upPts[0].x},${PAD.top + iH} Z`
  const dnArea   = dnLine + ` L${dnPts.at(-1)!.x},${PAD.top + iH} L${dnPts[0].x},${PAD.top + iH} Z`
  const labelStep = Math.max(1, Math.floor(data.length / 5))
  const xLabels   = upPts.filter((_, i) => i % labelStep === 0 || i === upPts.length - 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="gUp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#BDE081" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#BDE081" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gDn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f87171" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={PAD.left} y1={PAD.top + iH * (1 - t)} x2={W - PAD.right} y2={PAD.top + iH * (1 - t)} stroke="#ebebeb" strokeWidth="1" />
      ))}
      <path d={dnArea} fill="url(#gDn)" />
      <path d={dnLine} fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d={upArea} fill="url(#gUp)" />
      <path d={upLine} fill="none" stroke="#BDE081" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {xLabels.map(p => (
        <text key={p.label} x={p.x} y={H - 1} textAnchor="middle" fontSize={8} fill="#999">
          {new Date(p.label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </text>
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

function fillDailyGaps(rows: DailyStat[], days = 30): DailyStat[] {
  const map: Record<string, DailyStat> = {}
  for (const r of rows) map[r.day] = r
  const result: DailyStat[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    result.push(map[key] ?? { day: key, total_votes: 0, upvotes: 0, downvotes: 0 })
  }
  return result
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [profiles, setProfiles]               = useState<ProfileRow[]>([])
  const [totalImages, setTotalImages]         = useState(0)
  const [totalCaptions, setTotalCaptions]     = useState(0)
  const [totalFlavors, setTotalFlavors]       = useState(0)
  const [studyCount, setStudyCount]           = useState(0)
  const [recentImages, setRecentImages]       = useState<ImageRow[]>([])
  const [recentCaptions, setRecentCaptions]   = useState<CaptionRow[]>([])
  const [captionsByImage, setCaptionsByImage] = useState<Record<string, number>>({})
  const [allImages, setAllImages]             = useState<ImageRow[]>([])

  const [voteSummary, setVoteSummary]   = useState<VoteSummary | null>(null)
  const [flavorStats, setFlavorStats]   = useState<FlavorStat[]>([])
  const [dailyVotes, setDailyVotes]     = useState<DailyStat[]>([])
  const [topCaptions, setTopCaptions]   = useState<TopCaption[]>([])

  const [loading, setLoading] = useState(true)

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
        { data: voteSummaryData },
        { data: flavorData },
        { data: dailyData },
        { data: topCapData },
      ] = await Promise.all([
        supabase.from('profiles').select('id, created_datetime_utc').order('created_datetime_utc', { ascending: true }),
        supabase.from('images').select('*', { count: 'exact', head: true }),
        supabase.from('captions').select('*', { count: 'exact', head: true }),
        supabase.from('humor_flavors').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_in_study', true),
        supabase.from('images').select('id, url, created_datetime_utc').order('created_datetime_utc', { ascending: false }).limit(6),
        supabase.from('captions').select('id, content, image_id, created_datetime_utc').order('created_datetime_utc', { ascending: false }).limit(5),
        supabase.from('images').select('id, url, created_datetime_utc').order('created_datetime_utc', { ascending: false }),
        supabase.rpc('admin_vote_summary'),
        supabase.rpc('admin_votes_by_flavor'),
        supabase.rpc('admin_votes_daily', { days_back: 30 }),
        supabase.rpc('admin_top_captions', { n: 7 }),
      ])

      setProfiles(profileData ?? [])
      setTotalImages(imgCount ?? 0)
      setTotalCaptions(capCount ?? 0)
      setTotalFlavors(flavorCount ?? 0)
      setStudyCount(studyC ?? 0)
      setRecentImages((recentImgData ?? []) as ImageRow[])
      setRecentCaptions((recentCapData ?? []) as CaptionRow[])
      setAllImages((allImgData ?? []) as ImageRow[])
      if (voteSummaryData?.[0]) setVoteSummary(voteSummaryData[0] as VoteSummary)
      setFlavorStats((flavorData ?? []) as FlavorStat[])
      setDailyVotes(fillDailyGaps((dailyData ?? []) as DailyStat[], 30))
      setTopCaptions((topCapData ?? []) as TopCaption[])

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

  const upvotePct = voteSummary && voteSummary.total_votes > 0
    ? Math.round((voteSummary.upvotes / voteSummary.total_votes) * 100)
    : null

  const stats = [
    { label: 'Users',       value: profiles.length, sub: newUsersToday > 0 ? `+${newUsersToday} today` : null, positive: newUsersToday > 0 },
    { label: 'Images',      value: totalImages,      sub: imgDelta !== 0 ? `${imgDelta > 0 ? '+' : ''}${imgDelta} this week` : null, positive: imgDelta > 0 },
    { label: 'Captions',    value: totalCaptions,    sub: totalImages > 0 ? `${avgCaptions} per image` : null, positive: true },
    { label: 'Flavors',     value: totalFlavors,     sub: null, positive: false },
    { label: 'In study',    value: studyCount,       sub: profiles.length > 0 ? `${Math.round(studyCount / profiles.length * 100)}% of users` : null, positive: true },
  ]

  const voteStats = [
    { label: 'Total votes',     value: voteSummary?.total_votes?.toLocaleString() ?? '—',   sub: null },
    { label: 'Upvote rate',     value: upvotePct != null ? `${upvotePct}%` : '—',            sub: voteSummary ? `${voteSummary.upvotes.toLocaleString()} up · ${voteSummary.downvotes.toLocaleString()} down` : null },
    { label: 'Captions rated',  value: voteSummary?.captions_rated?.toLocaleString() ?? '—', sub: null },
    { label: 'Active raters',   value: voteSummary?.raters?.toLocaleString() ?? '—',         sub: null },
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

          {/* ── vote stats strip ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <span style={s.panelLabel}>Caption ratings</span>
            </div>
            <div style={{ ...s.statsRow, gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {voteStats.map(({ label, value, sub }) => (
                <div key={label} style={s.statCard}>
                  <p style={s.statLabel}>{label}</p>
                  <p style={{ ...s.statValue, fontSize: 30 }}>{value}</p>
                  {sub && <p style={{ ...s.statSub, color: '#bbb' }}>{sub}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* ── vote chart ── */}
          <div style={{ ...s.chartGrid, gridTemplateColumns: '1fr' }}>
            <div style={s.chartPanel}>
              <div style={s.chartHeader}>
                <span style={s.panelLabel}>Vote activity</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#BDE081', fontWeight: 600 }}>▲ upvotes</span>
                  <span style={{ fontSize: 10, color: '#f87171', fontWeight: 600 }}>▼ downvotes</span>
                  <span style={s.panelMeta}>30 days</span>
                </div>
              </div>
              <VoteChart data={dailyVotes} height={110} />
            </div>
          </div>

          {/* ── flavor + top captions ── */}
          <div style={s.activityGrid}>

            {/* Flavor breakdown */}
            <div>
              <div style={s.panelHead}>
                <span style={s.panelLabel}>Top flavors by votes</span>
                <span style={s.panelMeta}>top 10</span>
              </div>
              <div style={s.panel}>
                {flavorStats.length === 0 ? (
                  <p style={s.empty}>No vote data yet.</p>
                ) : flavorStats.map((f, i) => (
                  <div key={f.flavor} style={{ padding: '10px 16px', borderBottom: i < flavorStats.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: '#333', fontWeight: 500, maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.flavor}
                      </span>
                      <span style={{ fontSize: 10, color: '#888', flexShrink: 0 }}>
                        {f.total_votes.toLocaleString()} votes · <span style={{ color: Number(f.upvote_pct) >= 50 ? '#9ec95a' : '#f87171', fontWeight: 600 }}>{f.upvote_pct}%</span>
                      </span>
                    </div>
                    <div style={{ height: 4, backgroundColor: '#f5f5f5', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', height: '100%' }}>
                        <div style={{ width: `${(f.upvotes / f.total_votes) * 100}%`, backgroundColor: '#BDE081', borderRadius: '2px 0 0 2px', transition: 'width 0.4s' }} />
                        <div style={{ flex: 1, backgroundColor: '#fecaca', borderRadius: '0 2px 2px 0' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top rated captions */}
            <div>
              <div style={s.panelHead}>
                <span style={s.panelLabel}>Most voted captions</span>
                <span style={s.panelMeta}>top 5</span>
              </div>
              <div style={s.panel}>
                {topCaptions.length === 0 ? (
                  <p style={s.empty}>No vote data yet.</p>
                ) : topCaptions.map((cap, i) => (
                  <div key={cap.id} style={{ padding: '12px 16px', borderBottom: i < topCaptions.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <p style={{ fontSize: 12, color: '#333', margin: '0 0 6px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {cap.content}
                    </p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: 2 }}>
                        {cap.flavor}
                      </span>
                      <span style={{ fontSize: 10, color: '#888' }}>{cap.total_votes} votes</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: Number(cap.upvote_pct) >= 50 ? '#9ec95a' : '#f87171', marginLeft: 'auto' }}>
                        {cap.upvote_pct}% upvoted
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── activity ── */}
          <div style={s.activityGrid}>

            {/* Recent uploads */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={s.panelHead}>
                <span style={s.panelLabel}>Recent uploads</span>
                <span style={s.panelMeta}>{recentImages.length} shown</span>
              </div>
              <div style={{ ...s.panel, flex: 1 }}>
                {recentImages.length === 0 ? (
                  <p style={s.empty}>No uploads yet.</p>
                ) : recentImages.map((img, i) => (
                  <div key={img.id} style={{ display: 'flex', alignItems: 'stretch', gap: 12, padding: '12px 16px', borderBottom: i < recentImages.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <div style={{ width: 54, flexShrink: 0, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                      <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                      <p style={{ fontSize: 12, color: '#444', margin: 0, fontWeight: 500 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={s.panelHead}>
                <span style={s.panelLabel}>Recent captions</span>
                <span style={s.panelMeta}>{recentCaptions.length} shown</span>
              </div>
              <div style={{ ...s.panel, flex: 1 }}>
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
