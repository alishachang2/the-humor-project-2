'use client'

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ImageRecord = { id: string; url: string }
type Caption     = { id: string; content: string; image_id: string }

const PAGE_SIZE = 12

export default function ImagesPage() {
  const [images, setImages]           = useState<ImageRecord[]>([])
  const [captions, setCaptions]       = useState<Record<string, Caption[]>>({})
  const [captionIndex, setCaptionIndex] = useState<Record<string, number>>({})
  const [totalCount, setTotalCount]   = useState(0)
  const [loading, setLoading]         = useState(true)
  const [uploading, setUploading]     = useState(false)
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [editing, setEditing]         = useState<string | null>(null)
  const [editUrl, setEditUrl]         = useState('')
  const [page, setPage]               = useState(0)
  const [dragOver, setDragOver]       = useState(false)
  const [hoveredId, setHoveredId]     = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editing) return
      if (e.key === 'ArrowLeft')  setPage(p => Math.max(0, p - 1))
      if (e.key === 'ArrowRight') setPage(p => Math.min(totalPages - 1, p + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [totalPages, editing])

  useEffect(() => { fetchImages() }, [page])

  async function fetchImages() {
    setLoading(true)
    const supabase = createClient()
    const { data, error, count } = await supabase
      .from('images')
      .select('id, url', { count: 'exact' })
      .order('created_datetime_utc', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error || !data) {
      setImages([]); setTotalCount(0); setLoading(false); return
    }

    setImages(data as ImageRecord[])
    setTotalCount(count ?? 0)

    const ids = data.map(img => img.id)
    if (ids.length > 0) {
      const { data: captionData } = await supabase
        .from('captions')
        .select('id, content, image_id')
        .in('image_id', ids)
        .order('created_datetime_utc', { ascending: true })

      const grouped: Record<string, Caption[]> = {}
      for (const c of captionData ?? []) {
        if (!grouped[c.image_id]) grouped[c.image_id] = []
        grouped[c.image_id].push(c)
      }
      setCaptions(grouped)
      const indices: Record<string, number> = {}
      for (const id of ids) indices[id] = 0
      setCaptionIndex(indices)
    }
    setLoading(false)
  }

  function prevCaption(imageId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setCaptionIndex(prev => {
      const total = captions[imageId]?.length ?? 0
      const current = prev[imageId] ?? 0
      return { ...prev, [imageId]: (current - 1 + total) % total }
    })
  }

  function nextCaption(imageId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setCaptionIndex(prev => {
      const total = captions[imageId]?.length ?? 0
      const current = prev[imageId] ?? 0
      return { ...prev, [imageId]: (current + 1) % total }
    })
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) return
    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const profileId = user?.id

    for (const file of files) {
      const presignRes = await fetch('/api/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })
      if (!presignRes.ok) { console.error('presign failed'); continue }
      const { presignedUrl, publicUrl } = await presignRes.json()

      const uploadRes = await fetch(presignedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!uploadRes.ok) { console.error('S3 upload failed'); continue }

      const { data: imageData, error: dbError } = await supabase
        .from('images').insert({ url: publicUrl }).select('id').single()
      if (dbError || !imageData) { console.error(dbError); continue }

      const pipelineRes = await fetch(`${process.env.NEXT_PUBLIC_PIPELINE_URL}/pipeline/generate_captions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_id: imageData.id, profile_id: profileId }),
      })
      if (!pipelineRes.ok) console.error('caption pipeline failed')
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setPage(0)
    await fetchImages()
  }

  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    uploadFiles(Array.from(e.target.files ?? []))
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    if (uploading) return
    uploadFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')))
  }

  async function handleDelete(image: ImageRecord, e: React.MouseEvent) {
    e.stopPropagation()
    setDeleting(image.id)
    await createClient().from('images').delete().eq('id', image.id)
    setDeleting(null)
    await fetchImages()
  }

  async function handleUpdate(image: ImageRecord) {
    if (!editUrl.trim()) return
    await createClient().from('images').update({ url: editUrl }).eq('id', image.id)
    setEditing(null)
    setEditUrl('')
    await fetchImages()
  }

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={s.header}>
        <div>
          <p style={s.eyebrow}>Library</p>
          <h1 style={s.heading}><em>Images.</em></h1>
        </div>
        <span style={{ fontSize: 11, color: '#999' }}>
          {loading ? '—' : `${totalCount} total · page ${page + 1} of ${totalPages}`}
        </span>
      </div>
      <div style={{ height: 2, backgroundColor: '#BDE081' }} />

      {/* Upload zone */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); if (!uploading) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          margin: '20px 32px',
          border: `1px dashed ${dragOver ? '#1a1a1a' : '#d8d8d8'}`,
          borderRadius: 4,
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: dragOver ? '#f5f5f5' : '#fafafa',
          cursor: uploading ? 'default' : 'pointer',
          opacity: uploading ? 0.55 : 1,
          transition: 'border-color 0.15s, background-color 0.15s',
        }}
      >
        <span style={{ fontSize: 12, color: '#555' }}>
          {uploading ? 'Uploading…' : dragOver ? 'Drop to upload' : 'Upload images'}
        </span>
        <span style={{ fontSize: 11, color: '#aaa' }}>
          {uploading ? '' : 'Click or drag & drop'}
        </span>
      </div>

      {/* States */}
      {loading && <p style={s.empty}>Loading…</p>}
      {!loading && images.length === 0 && <p style={s.empty}>No images yet.</p>}

      {/* Grid */}
      {!loading && images.length > 0 && (
        <>
          <div style={s.grid}>
            {images.map(image => {
              const imageCaptions = captions[image.id] ?? []
              const currentIndex  = captionIndex[image.id] ?? 0
              const currentCaption = imageCaptions[currentIndex]
              const isHovered = hoveredId === image.id
              const isEditing = editing === image.id

              return (
                <article
                  key={image.id}
                  style={s.card}
                  onMouseEnter={() => setHoveredId(image.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Image */}
                  <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', backgroundColor: '#f0f0f0', flexShrink: 0 }}>
                    <img src={image.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />

                    {/* Hover: edit + delete */}
                    {isHovered && !isEditing && (
                      <div style={s.overlay}>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setEditing(image.id); setEditUrl(image.url) }}
                          style={s.overlayBtn}
                        >Edit URL</button>
                        <button
                          type="button"
                          onClick={e => handleDelete(image, e)}
                          disabled={deleting === image.id}
                          style={{ ...s.overlayBtn, backgroundColor: 'rgba(190,30,20,0.88)', color: '#fff' }}
                        >{deleting === image.id ? '…' : 'Delete'}</button>
                      </div>
                    )}

                    {/* Caption count badge */}
                    {imageCaptions.length > 0 && !isHovered && (
                      <div style={s.badge}>{imageCaptions.length}</div>
                    )}
                  </div>

                  {/* Edit URL form */}
                  {isEditing && (
                    <div style={s.editForm}>
                      <input
                        value={editUrl}
                        onChange={e => setEditUrl(e.target.value)}
                        placeholder="Paste new image URL"
                        style={s.input}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleUpdate(image); if (e.key === 'Escape') { setEditing(null); setEditUrl('') } }}
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <button type="button" onClick={() => handleUpdate(image)} style={{ ...s.actionBtn, background: '#1a1a1a', color: '#fff', flex: 1 }}>Save</button>
                        <button type="button" onClick={() => { setEditing(null); setEditUrl('') }} style={{ ...s.actionBtn, flex: 1 }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Caption */}
                  <div style={s.captionBlock}>
                    {imageCaptions.length === 0 ? (
                      <p style={{ fontSize: 11, color: '#ccc', margin: 0 }}>No captions</p>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <p style={{ fontSize: 11, color: '#555', lineHeight: 1.5, margin: 0, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                          {currentCaption?.content}
                        </p>
                        {imageCaptions.length > 1 && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                            <button type="button" onClick={e => prevCaption(image.id, e)} style={s.arrowBtn}>↑</button>
                            <span style={{ fontSize: 9, color: '#bbb', lineHeight: 1 }}>{currentIndex + 1}/{imageCaptions.length}</span>
                            <button type="button" onClick={e => nextCaption(image.id, e)} style={s.arrowBtn}>↓</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          {/* Pagination */}
          <div style={s.pagination}>
            <button
              type="button"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ ...s.pageBtn, opacity: page === 0 ? 0.3 : 1 }}
            >← Prev</button>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontSize: 18, color: '#1a1a1a' }}>
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{ ...s.pageBtn, opacity: page >= totalPages - 1 ? 0.3 : 1 }}
            >Next →</button>
          </div>
        </>
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
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '32px 32px 20px' },
  eyebrow:      { fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', margin: '0 0 6px' },
  heading:      { fontFamily: "'DM Serif Display', serif", fontSize: 40, fontWeight: 400, lineHeight: 1, letterSpacing: '-0.02em', color: '#1a1a1a', margin: 0 },
  empty:        { padding: 48, textAlign: 'center', fontSize: 12, color: '#999' },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, padding: '0 32px' },
  card:         { border: '1px solid #ebebeb', backgroundColor: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 4 },
  overlay:      { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  overlayBtn:   { fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.92)', color: '#1a1a1a', border: 'none', cursor: 'pointer', borderRadius: 2 },
  badge:        { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10 },
  editForm:     { padding: '10px 12px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa' },
  captionBlock: { padding: '10px 12px', minHeight: 72, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  arrowBtn:     { fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: '1px 0', lineHeight: 1 },
  actionBtn:    { fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '7px 10px', background: '#f5f5f5', color: '#555', border: '1px solid #e0e0e0', cursor: 'pointer', borderRadius: 2 },
  input:        { fontSize: 12, padding: '7px 10px', border: '1px solid #e0e0e0', outline: 'none', width: '100%', boxSizing: 'border-box', borderRadius: 2 },
  pagination:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', borderTop: '1px solid #f0f0f0', marginTop: 32 },
  pageBtn:      { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 14px', background: 'none', color: '#666', border: '1px solid #e8e8e8', cursor: 'pointer' },
}
