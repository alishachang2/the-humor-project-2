'use client'

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react'
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

const BUCKET = 'images'
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
      .order('id', { ascending: true })
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

      const grouped: Record<string, Caption[]> = {}
      for (const c of captionData ?? []) {
        if (!grouped[c.image_id]) grouped[c.image_id] = []
        grouped[c.image_id].push(c)
      }
      setCaptions(grouped)

      // initialize caption index to 0 for each image
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

    for (const file of files) {
      const path = `${Date.now()}-${file.name}`

      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file)
      if (storageError) { console.error(storageError); continue }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path)

      const { error: dbError } = await supabase
        .from('images')
        .insert({ url: publicUrl })
      if (dbError) { console.error(dbError); continue }
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
    <div style={styles.page}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap"
        rel="stylesheet"
      />

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <p style={styles.eyebrow}>Library</p>
          <h1 style={styles.heading}>
            <em style={styles.headingItalic}>Images.</em>
          </h1>
        </div>
        <div style={styles.headerMeta}>
          <span style={styles.metaCount}>
            {loading ? '—' : `${totalCount} shown`}
          </span>
          <span style={styles.metaPage}>Page {page + 1}</span>
        </div>
      </div>

      <div style={styles.limeRule} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleUpload}
      />
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); if (!uploading) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          ...styles.uploadTile,
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.7 : 1,
          borderColor: dragOver ? '#2A2A2A' : '#E0E0E0',
          backgroundColor: dragOver ? '#F5F5F5' : '#FAFAFA',
        }}
      >
        <p style={styles.uploadTitle}>
          {uploading ? 'Uploading...' : dragOver ? 'Drop to upload' : 'Upload images'}
        </p>
        <p style={styles.uploadSubtitle}>
          Click to browse or drag & drop files here
        </p>
      </div>

      {loading && <p style={styles.emptyText}>Loading…</p>}

      {!loading && images.length === 0 && (
        <p style={styles.emptyText}>No images yet.</p>
      )}

      {!loading && images.length > 0 && (
        <>
          <div style={styles.grid}>
            {images.map(image => {
              const imageCaptions = captions[image.id] ?? []
              const currentIndex = captionIndex[image.id] ?? 0
              const currentCaption = imageCaptions[currentIndex]

              return (
                <article
                  key={image.id}
                  style={styles.card}
                >
                  <div style={styles.imageWrap}>
                    <img
                      src={image.url}
                      alt={`image ${image.id}`}
                      style={styles.image}
                    />
                  </div>

                  <div style={styles.captionBlock}>
                    <p style={styles.sectionLabel}>
                      Captions
                    </p>

                    {imageCaptions.length === 0 ? (
                      <p style={styles.captionEmpty}>No captions</p>
                    ) : (
                      <>
                        <p style={styles.captionText}>
                          {currentCaption?.content}
                        </p>
                        <div style={styles.captionNav}>
                          <button
                            type="button"
                            onClick={() => prevCaption(image.id)}
                            style={styles.captionArrow}
                          >
                            ←
                          </button>
                          <span style={styles.captionCount}>
                            {currentIndex + 1} / {imageCaptions.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => nextCaption(image.id)}
                            style={styles.captionArrow}
                          >
                            →
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div style={styles.controls}>
                    {editing === image.id ? (
                      <div style={styles.editStack}>
                        <input
                          value={editUrl}
                          onChange={e => setEditUrl(e.target.value)}
                          placeholder="New image URL"
                          style={styles.input}
                        />
                        <div style={styles.buttonRow}>
                          <button
                            type="button"
                            onClick={() => handleUpdate(image)}
                            style={styles.primaryButton}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditing(null); setEditUrl('') }}
                            style={styles.secondaryButton}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={styles.buttonRow}>
                        <button
                          type="button"
                          onClick={() => { setEditing(image.id); setEditUrl(image.url) }}
                          style={styles.secondaryButton}
                        >
                          Edit URL
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(image)}
                          disabled={deleting === image.id}
                          style={{
                            ...styles.deleteButton,
                            opacity: deleting === image.id ? 0.5 : 1,
                            cursor: deleting === image.id ? 'not-allowed' : 'pointer',
                          }}
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

          <div style={styles.bottomRule} />

          <div style={styles.bottomBar}>
            <button
              type="button"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ ...styles.pageBtn, ...(page === 0 ? styles.pageBtnDisabled : {}) }}
            >
              ← Prev
            </button>
            <span style={styles.pageIndicator}>{page + 1}</span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{ ...styles.pageBtn, ...(page >= totalPages - 1 ? styles.pageBtnDisabled : {}) }}
            >
              Next →
            </button>
          </div>
        </>
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'inherit',
    animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: '40px 48px 24px',
  },
  headerLeft: { display: 'flex', flexDirection: 'column' as const },
  eyebrow: {
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: '#8A8A8A',
    margin: '0 0 10px',
  },
  heading: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 72,
    fontWeight: 400,
    lineHeight: 0.9,
    letterSpacing: '-0.03em',
    color: '#2A2A2A',
    margin: 0,
  },
  headingItalic: { fontStyle: 'italic', color: '#000' },
  headerMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: 4,
    paddingBottom: 8,
  },
  metaCount: { fontSize: 11, color: '#8A8A8A', letterSpacing: '0.04em' },
  metaPage: { fontSize: 11, color: '#C0C0C0', letterSpacing: '0.04em' },
  limeRule: { width: '100%', height: 2, backgroundColor: '#BDE081', marginBottom: 24 },
  uploadTile: {
    margin: '0 48px 32px',
    border: '2px dashed #E0E0E0',
    backgroundColor: '#FAFAFA',
    padding: '36px 24px',
    textAlign: 'center' as const,
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
  },
  uploadTitle: {
    fontSize: 13,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#2A2A2A',
    margin: 0,
  },
  uploadSubtitle: {
    fontSize: 11,
    color: '#8A8A8A',
    letterSpacing: '0.04em',
    margin: '8px 0 0',
  },
  emptyText: {
    padding: '48px',
    textAlign: 'center' as const,
    fontSize: 12,
    color: '#C0C0C0',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 20,
    padding: '0 48px',
  },
  card: {
    border: '1px solid #E0E0E0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  imageWrap: {
    aspectRatio: '1',
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  captionBlock: {
    padding: '14px 16px',
    borderBottom: '1px solid #F0F0F0',
    minHeight: 112,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#8A8A8A',
    margin: '0 0 10px',
  },
  captionEmpty: {
    fontSize: 12,
    color: '#C0C0C0',
    margin: 0,
  },
  captionText: {
    fontSize: 12,
    color: '#5A5A5A',
    lineHeight: 1.55,
    margin: '0 0 12px',
    minHeight: 38,
  },
  captionNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  captionArrow: {
    fontSize: 13,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#8A8A8A',
    padding: 0,
  },
  captionCount: {
    fontSize: 10,
    color: '#C0C0C0',
    letterSpacing: '0.04em',
  },
  controls: {
    padding: '12px 16px 16px',
  },
  editStack: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  input: {
    fontSize: 12,
    padding: '8px 10px',
    border: '1px solid #E0E0E0',
    borderRadius: 0,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  buttonRow: {
    display: 'flex',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    padding: '8px',
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    border: '1px solid #2A2A2A',
    cursor: 'pointer',
  },
  secondaryButton: {
    flex: 1,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    padding: '8px',
    backgroundColor: '#FAFAFA',
    color: '#2A2A2A',
    border: '1px solid #E0E0E0',
    cursor: 'pointer',
  },
  deleteButton: {
    flex: 1,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    padding: '8px',
    backgroundColor: '#FFF0EE',
    color: '#E05A45',
    border: '1px solid #F6D5D0',
  },
  bottomRule: { width: '100%', height: 1, backgroundColor: '#E0E0E0', marginTop: 32 },
  bottomBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 48px',
  },
  pageBtn: {
    fontSize: 11,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#2A2A2A',
    background: 'transparent',
    border: '1px solid #2A2A2A',
    padding: '8px 20px',
    cursor: 'pointer',
    borderRadius: 0,
  },
  pageBtnDisabled: {
    color: '#C0C0C0',
    borderColor: '#E0E0E0',
    cursor: 'not-allowed',
  },
  pageIndicator: {
    fontFamily: "'DM Serif Display', serif",
    fontStyle: 'italic',
    fontSize: 24,
    color: '#2A2A2A',
    letterSpacing: '-0.02em',
  },
}
