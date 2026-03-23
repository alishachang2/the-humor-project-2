'use client'

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ImageRecord = {
  id: string
  path: string
  name: string
  url: string
  created_at: string
  captions: string[]
}

type CaptionRecord = {
  image_id: string
  content: string | null
}

const BUCKET = 'images'
const PAGE_SIZE = 9

export default function ImagesPage() {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE))
  const visibleImages = useMemo(
    () => images.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [images, page]
  )

  useEffect(() => {
    fetchImages()
  }, [])

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1))
    }
  }, [page, totalPages])

  async function fetchImages() {
    setLoading(true)
    const supabase = createClient()

    const { data: imageRows, error: imagesError } = await supabase
      .from('images')
      .select('*')
      .order('created_at', { ascending: false })

    if (imagesError || !imageRows) {
      if (imagesError) console.error(imagesError)
      setImages([])
      setLoading(false)
      return
    }

    const imageIds = imageRows.map(image => image.id)
    let captionsByImageId = new Map<string, string[]>()

    if (imageIds.length > 0) {
      const { data: captionRows, error: captionsError } = await supabase
        .from('captions')
        .select('image_id, content')
        .in('image_id', imageIds)

      if (captionsError) {
        console.error(captionsError)
      } else {
        captionsByImageId = buildCaptionMap(captionRows ?? [])
      }
    }

    setImages(
      imageRows.map(image => ({
        ...image,
        captions: captionsByImageId.get(image.id) ?? [],
      }))
    )
    setLoading(false)
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
      if (storageError) {
        console.error(storageError)
        continue
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path)

      const { data, error: dbError } = await supabase
        .from('images')
        .insert({ path, name: file.name, url: publicUrl })
        .select()
        .single()
      if (dbError) {
        console.error(dbError)
        continue
      }

      setImages(prev => [{ ...data, captions: [] }, ...prev])
      setPage(0)
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete(image: ImageRecord) {
    setDeleting(image.id)
    const supabase = createClient()

    await supabase.storage.from(BUCKET).remove([image.path])
    await supabase.from('images').delete().eq('id', image.id)

    setImages(prev => prev.filter(img => img.id !== image.id))
    setDeleting(null)
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#2a2a2a]">Images</h1>
        <p className="mt-0.5 text-sm text-[#8a8a8a]">
          {images.length} image{images.length !== 1 ? 's' : ''} in the library
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className="mb-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#e0e0e0] bg-white py-16 transition-colors hover:border-[#2d9c9c] hover:bg-[#2d9c9c1a]"
      >
        <svg className="mb-3 text-[#8a8a8a]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <p className="text-sm font-medium text-[#2a2a2a]">
          {uploading ? 'Uploading images...' : 'Upload your first image'}
        </p>
        <p className="mt-1 text-xs text-[#8a8a8a]">Click to browse files</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(index => (
              <div
                key={index}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#2d9c9c]"
                style={{ animationDelay: `${index * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && images.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleImages.map(image => (
              <article
                key={image.id}
                className="overflow-hidden rounded-2xl border border-[#e0e0e0] bg-white"
              >
                <div className="aspect-square overflow-hidden bg-[#fafafa]">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="space-y-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#2a2a2a]">{image.name}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#8a8a8a]">
                        {image.captions.length} caption{image.captions.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(image)}
                      disabled={deleting === image.id}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#8a8a8a] transition-colors hover:bg-[#ff6b581f] hover:text-[#ff6b58] disabled:opacity-40"
                      aria-label="Delete image"
                    >
                      {deleting === image.id ? (
                        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2 border-t border-[#f0f0f0] pt-3">
                    {image.captions.length > 0 ? (
                      image.captions.map((caption, index) => (
                        <p key={`${image.id}-${index}`} className="text-sm leading-6 text-[#5a5a5a]">
                          {caption}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm italic text-[#8a8a8a]">No captions yet.</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-[#e0e0e0] pt-4">
            <button
              type="button"
              onClick={() => setPage(current => Math.max(0, current - 1))}
              disabled={page === 0}
              className="rounded-full border border-[#e0e0e0] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[#2a2a2a] transition-opacity disabled:opacity-40"
            >
              Previous
            </button>

            <p className="text-xs uppercase tracking-[0.12em] text-[#8a8a8a]">
              Page {page + 1} of {totalPages}
            </p>

            <button
              type="button"
              onClick={() => setPage(current => Math.min(totalPages - 1, current + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-full border border-[#e0e0e0] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[#2a2a2a] transition-opacity disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}

      {!loading && images.length === 0 && (
        <p className="text-center text-sm text-[#8a8a8a]">No images yet.</p>
      )}
    </div>
  )
}

function buildCaptionMap(captionRows: CaptionRecord[]) {
  return captionRows.reduce((map, caption) => {
    if (!caption.content) return map

    const captions = map.get(caption.image_id) ?? []
    captions.push(caption.content)
    map.set(caption.image_id, captions)
    return map
  }, new Map<string, string[]>())
}
