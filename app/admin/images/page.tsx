'use client'

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ImageRecord = {
  id: string
  url: string
}

type Caption = {
  id: string
  content: string
  image_id: string
}

const PAGE_SIZE = 9

export default function ImagesPage() {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [captions, setCaptions] = useState<Record<string, Caption[]>>({})
  const [captionIndex, setCaptionIndex] = useState<Record<string, number>>({})
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [page, setPage] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

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
      console.error(error)
      setImages([])
      setTotalCount(0)
      setLoading(false)
      return
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

  function prevCaption(imageId: string) {
    setCaptionIndex(prev => {
      const total = captions[imageId]?.length ?? 0
      const current = prev[imageId] ?? 0
      return { ...prev, [imageId]: (current - 1 + total) % total }
    })
  }

  function nextCaption(imageId: string) {
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
      // Phase 1a: get presigned URL from AWS S3
      const presignRes = await fetch('/api/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })
      if (!presignRes.ok) { console.error('Failed to get presigned URL'); continue }

      const { presignedUrl, publicUrl } = await presignRes.json()

      // Phase 1b: upload file directly to S3
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) { console.error('Failed to upload to S3'); continue }

      // Phase 1c: store public URL in Supabase, get back the image ID
      const { data: imageData, error: dbError } = await supabase
        .from('images')
        .insert({ url: publicUrl })
        .select('id')
        .single()
      if (dbError || !imageData) { console.error(dbError); continue }

      // Phase 2: trigger caption generation pipeline
      const pipelineRes = await fetch(`${process.env.NEXT_PUBLIC_PIPELINE_URL}/pipeline/generate_captions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_id: imageData.id, profile_id: profileId }),
      })
      if (!pipelineRes.ok) console.error('Failed to trigger caption pipeline')
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setPage(0)
    await fetchImages()
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    uploadFiles(Array.from(event.target.files ?? []))
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    if (uploading) return
    const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    uploadFiles(files)
  }

  async function handleDelete(image: ImageRecord) {
    setDeleting(image.id)
    const supabase = createClient()
    await supabase.from('images').delete().eq('id', image.id)
    setDeleting(null)
    await fetchImages()
  }

  async function handleUpdate(image: ImageRecord) {
    if (!editUrl.trim()) return
    const supabase = createClient()
    await supabase.from('images').update({ url: editUrl }).eq('id', image.id)
    setEditing(null)
    setEditUrl('')
    await fetchImages()
  }

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      <div style={s.header}>
        <div>
          <p style={s.eyebrow}>Library</p>
          <h1 style={s.heading}><em>Images.</em></h1>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#999', lineHeight: 1.8 }}>
          <div>{loading ? '—' : `${totalCount} images`}</div>
          <div>Page {page + 1}</div>
        </div>
      </div>

      <div style={{ height: 2, backgroundColor: '#BDE081', marginBottom: 20 }} />

      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); if (!uploading) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          ...s.uploadZone,
          borderColor: dragOver ? '#1a1a1a' : '#ddd',
          backgroundColor: dragOver ? '#f5f5f5' : '#fafafa',
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.6 : 1,
        }}
      >
        <p style={{ fontSize: 13, color: '#1a1a1a', margin: 0 }}>
          {uploading ? 'Uploading...' : dragOver ? 'Drop to upload' : 'Upload images'}
        </p>
        <p style={{ fontSize: 11, color: '#999', margin: '6px 0 0' }}>
          Click to browse or drag & drop
        </p>
      </div>

      {loading && <p style={s.empty}>Loading…</p>}
      {!loading && images.length === 0 && <p style={s.empty}>No images yet.</p>}

      {!loading && images.length > 0 && (
        <>
          <div style={s.grid}>
            {images.map(image => {
              const imageCaptions = captions[image.id] ?? []
              const currentIndex = captionIndex[image.id] ?? 0
              const currentCaption = imageCaptions[currentIndex]

              return (
                <article key={image.id} style={s.card}>
                  <div style={{ aspectRatio: '1', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
                    <img src={image.url} alt={`image ${image.id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div style={s.captionBlock}>
                    <p style={{ ...s.eyebrow, margin: '0 0 8px', fontSize: 9 }}>Captions</p>
                    {imageCaptions.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#ccc', margin: 0 }}>No captions</p>
                    ) : (
                      <>
                        <p style={{ fontSize: 12, color: '#555', lineHeight: 1.5, margin: '0 0 10px', minHeight: 36 }}>
                          {currentCaption?.content ?? <span style={{ color: '#ccc' }}>No text yet</span>}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <button type="button" onClick={() => prevCaption(image.id)} style={s.arrowBtn}>←</button>
                          <span style={{ fontSize: 10, color: '#bbb' }}>{currentIndex + 1} / {imageCaptions.length}</span>
                          <button type="button" onClick={() => nextCaption(image.id)} style={s.arrowBtn}>→</button>
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ padding: '12px 16px 16px' }}>
                    {editing === image.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          value={editUrl}
                          onChange={e => setEditUrl(e.target.value)}
                          placeholder="New image URL"
                          style={s.input}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" onClick={() => handleUpdate(image)} style={{ ...s.btn, background: '#1a1a1a', color: '#fff', border: '1px solid #1a1a1a' }}>Save</button>
                          <button type="button" onClick={() => { setEditing(null); setEditUrl('') }} style={s.btn}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" onClick={() => { setEditing(image.id); setEditUrl(image.url) }} style={s.btn}>Edit URL</button>
                        <button
                          type="button"
                          onClick={() => handleDelete(image)}
                          disabled={deleting === image.id}
                          style={{ ...s.btn, color: '#d94f3a', borderColor: '#f0cdc8', background: '#fff8f7', opacity: deleting === image.id ? 0.5 : 1, cursor: deleting === image.id ? 'not-allowed' : 'pointer' }}
                        >
                          {deleting === image.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          <div style={{ height: 1, backgroundColor: '#eee', margin: '32px 0 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 32px' }}>
            <button
              type="button"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ ...s.btn, opacity: page === 0 ? 0.35 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
            >
              ← Prev
            </button>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontSize: 22, color: '#1a1a1a' }}>{page + 1}</span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{ ...s.btn, opacity: page >= totalPages - 1 ? 0.35 : 1, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
            >
              Next →
            </button>
          </div>
        </>
      )}

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
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: '32px 32px 20px',
  },
  eyebrow: { fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb', margin: '0 0 6px' },
  heading: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 40,
    fontWeight: 400,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    color: '#1a1a1a',
    margin: 0,
  },
  uploadZone: {
    margin: '0 32px 28px',
    border: '2px dashed #ddd',
    padding: '32px 24px',
    textAlign: 'center',
    transition: 'border-color 0.15s, background-color 0.15s',
  },
  empty: { padding: 48, textAlign: 'center', fontSize: 12, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 16,
    padding: '0 32px',
  },
  card: { border: '1px solid #eee', backgroundColor: '#fff', overflow: 'hidden' },
  captionBlock: { padding: '14px 16px', borderBottom: '1px solid #f0f0f0', minHeight: 108 },
  arrowBtn: { fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 0 },
  btn: {
    flex: 1,
    fontSize: 11,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '8px',
    background: '#fafafa',
    color: '#1a1a1a',
    border: '1px solid #ddd',
    cursor: 'pointer',
  },
  input: {
    fontSize: 12,
    padding: '8px 10px',
    border: '1px solid #ddd',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
}
