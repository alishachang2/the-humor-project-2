'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
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

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 32 }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Images</h1>
        <p style={{ fontSize: 13, color: '#8a8a8a', margin: '4px 0 0' }}>
          {totalCount} image{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

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
        style={{
          marginBottom: 32,
          border: '2px dashed #e0e0e0',
          borderRadius: 12,
          padding: '40px 24px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: '#fafafa',
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
          {uploading ? 'Uploading...' : 'Click to upload images'}
        </p>
        <p style={{ fontSize: 12, color: '#8a8a8a', margin: '4px 0 0' }}>
          Supports multiple files
        </p>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#8a8a8a' }}>Loading...</p>}

      {!loading && images.length === 0 && (
        <p style={{ textAlign: 'center', color: '#8a8a8a' }}>No images yet.</p>
      )}

      {!loading && images.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {images.map(image => {
              const imageCaptions = captions[image.id] ?? []
              const currentIndex = captionIndex[image.id] ?? 0
              const currentCaption = imageCaptions[currentIndex]

              return (
                <div
                  key={image.id}
                  style={{ border: '1px solid #e0e0e0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}
                >
                  {/* image */}
                  <div style={{ aspectRatio: '1', overflow: 'hidden', background: '#fafafa' }}>
                    <img
                      src={image.url}
                      alt={`image ${image.id}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* caption carousel */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', minHeight: 80 }}>
                    <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', margin: '0 0 8px' }}>
                      Captions
                    </p>

                    {imageCaptions.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#ccc', margin: 0 }}>No captions</p>
                    ) : (
                      <>
                        <p style={{ fontSize: 12, color: '#555', margin: '0 0 10px', minHeight: 36 }}>
                          {currentCaption?.content}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <button
                            onClick={() => prevCaption(image.id)}
                            style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: '0 4px' }}
                          >
                            ←
                          </button>
                          <span style={{ fontSize: 10, color: '#ccc' }}>
                            {currentIndex + 1} / {imageCaptions.length}
                          </span>
                          <button
                            onClick={() => nextCaption(image.id)}
                            style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: '0 4px' }}
                          >
                            →
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* edit / delete */}
                  <div style={{ padding: '10px 14px' }}>
                    {editing === image.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input
                          value={editUrl}
                          onChange={e => setEditUrl(e.target.value)}
                          placeholder="New image URL"
                          style={{
                            fontSize: 12,
                            padding: '6px 10px',
                            border: '1px solid #e0e0e0',
                            borderRadius: 6,
                            outline: 'none',
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleUpdate(image)}
                            style={{ flex: 1, fontSize: 11, padding: '6px', background: '#2a2a2a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditing(null); setEditUrl('') }}
                            style={{ flex: 1, fontSize: 11, padding: '6px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => { setEditing(image.id); setEditUrl(image.url) }}
                          style={{ flex: 1, fontSize: 11, padding: '6px', background: '#f0f0f0', color: '#2a2a2a', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Edit URL
                        </button>
                        <button
                          onClick={() => handleDelete(image)}
                          disabled={deleting === image.id}
                          style={{ flex: 1, fontSize: 11, padding: '6px', background: '#fff0ee', color: '#e05a45', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: deleting === image.id ? 0.5 : 1 }}
                        >
                          {deleting === image.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e0e0e0', paddingTop: 16 }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ fontSize: 12, padding: '8px 20px', border: '1px solid #e0e0e0', borderRadius: 20, background: 'transparent', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}
            >
              Previous
            </button>
            <span style={{ fontSize: 12, color: '#8a8a8a' }}>Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{ fontSize: 12, padding: '8px 20px', border: '1px solid #e0e0e0', borderRadius: 20, background: 'transparent', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}