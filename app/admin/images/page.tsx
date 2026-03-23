'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ImageRecord = {
  id: string
  url: string
}

const BUCKET = 'images'
const PAGE_SIZE = 9

export default function ImagesPage() {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
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

  // ... rest of your JSX stays exactly the same
}