'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type ImageRecord = {
  id: string
  path: string
  name: string
  url: string
  created_at: string
}

const BUCKET = 'images' // change to your bucket name

export default function ImagesPage() {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchImages()
  }, [])

  async function fetchImages() {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setImages(data ?? [])
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    const supabase = createClient()

    for (const file of files) {
      const path = `${Date.now()}-${file.name}`

      // 1. Upload file to Supabase storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file)
      if (storageError) { console.error(storageError); continue }

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

      // 3. Insert row into images table
      const { data, error: dbError } = await supabase
        .from('images')
        .insert({ path, name: file.name, url: publicUrl })
        .select()
        .single()
      if (dbError) { console.error(dbError); continue }

      setImages(prev => [data, ...prev])
    }

    setUploading(false)
    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete(image: ImageRecord) {
    setDeleting(image.id)
    const supabase = createClient()

    // 1. Delete file from storage
    await supabase.storage.from(BUCKET).remove([image.path])

    // 2. Delete row from images table
    await supabase.from('images').delete().eq('id', image.id)

    setImages(prev => prev.filter(img => img.id !== image.id))
    setDeleting(null)
  }

  return (
    <div className="min-h-screen bg-[#fafafa] p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-[#2a2a2a]">Images</h1>
            <p className="text-sm text-[#8a8a8a] mt-0.5">
              {images.length} file{images.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-[#2d9c9c] hover:opacity-90 disabled:opacity-50 transition-opacity text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {uploading ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Uploading…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload
              </>
            )}
          </button>

          {/* Hidden file input — supports multiple */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#2d9c9c] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && images.length === 0 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border-2 border-dashed border-[#e0e0e0] hover:border-[#2d9c9c] hover:bg-[#2d9c9c1a] transition-colors cursor-pointer"
          >
            <svg className="text-[#8a8a8a] mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <p className="text-sm font-medium text-[#2a2a2a]">Upload your first image</p>
            <p className="text-xs text-[#8a8a8a] mt-1">Click to browse files</p>
          </div>
        )}

        {/* Image grid */}
        {!loading && images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map(image => (
              <div
                key={image.id}
                className="group relative bg-white rounded-xl border border-[#e0e0e0] overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="aspect-square overflow-hidden bg-[#fafafa]">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                </div>

                {/* Footer */}
                <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-[12px] text-[#2a2a2a] font-medium truncate">
                    {image.name}
                  </span>
                  <button
                    onClick={() => handleDelete(image)}
                    disabled={deleting === image.id}
                    className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-[#8a8a8a] hover:bg-[#ff6b581f] hover:text-[#ff6b58] transition-colors disabled:opacity-40"
                    aria-label="Delete image"
                  >
                    {deleting === image.id ? (
                      <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}