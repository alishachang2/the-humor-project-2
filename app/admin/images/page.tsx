'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ImageRecord = {
  id: string
  url: string
}

export default function ImagesPage() {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchImages() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('images')
        .select('id, url')

      if (error) {
        console.error(error)
        return
      }

      console.log(data) // check this first
      setImages(data ?? [])
      setLoading(false)
    }

    fetchImages()
  }, [])

  if (loading) return <p>Loading...</p>
  if (images.length === 0) return <p>No images yet.</p>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: 24 }}>
      {images.map(image => (
        <img
          key={image.id}
          src={image.url}
          alt={`image ${image.id}`}
          style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }}
        />
      ))}
    </div>
  )
}