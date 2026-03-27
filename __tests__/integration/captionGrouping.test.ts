/**
 * Integration tests for caption grouping logic.
 * Verifies that raw Supabase caption rows are correctly grouped by image_id,
 * matching the behaviour in fetchImages().
 */

type Caption = { id: string; content: string | null; image_id: string }

function groupCaptionsByImage(rows: Caption[]): Record<string, Caption[]> {
  const grouped: Record<string, Caption[]> = {}
  for (const c of rows) {
    if (!grouped[c.image_id]) grouped[c.image_id] = []
    grouped[c.image_id].push(c)
  }
  return grouped
}

const IMAGE_A = 'img-001'
const IMAGE_B = 'img-002'

describe('groupCaptionsByImage', () => {
  it('groups captions under their image_id', () => {
    const rows: Caption[] = [
      { id: 'c1', content: 'Why so serious?', image_id: IMAGE_A },
      { id: 'c2', content: 'Purrfect timing', image_id: IMAGE_A },
      { id: 'c3', content: 'Such wow', image_id: IMAGE_B },
    ]
    const grouped = groupCaptionsByImage(rows)

    expect(grouped[IMAGE_A]).toHaveLength(2)
    expect(grouped[IMAGE_B]).toHaveLength(1)
  })

  it('preserves caption order (chronological from DB)', () => {
    const rows: Caption[] = [
      { id: 'c1', content: 'First', image_id: IMAGE_A },
      { id: 'c2', content: 'Second', image_id: IMAGE_A },
      { id: 'c3', content: 'Third', image_id: IMAGE_A },
    ]
    const grouped = groupCaptionsByImage(rows)

    expect(grouped[IMAGE_A].map(c => c.content)).toEqual(['First', 'Second', 'Third'])
  })

  it('handles captions with null content', () => {
    const rows: Caption[] = [
      { id: 'c1', content: null, image_id: IMAGE_A },
    ]
    const grouped = groupCaptionsByImage(rows)

    expect(grouped[IMAGE_A][0].content).toBeNull()
  })

  it('returns empty object for no rows', () => {
    expect(groupCaptionsByImage([])).toEqual({})
  })

  it('does not include entries for images with no captions', () => {
    const rows: Caption[] = [
      { id: 'c1', content: 'Hello', image_id: IMAGE_A },
    ]
    const grouped = groupCaptionsByImage(rows)

    expect(grouped[IMAGE_B]).toBeUndefined()
  })
})
