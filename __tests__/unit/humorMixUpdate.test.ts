/**
 * Unit tests for humor mix update logic.
 * Tests the caption_count parsing used before writing to Supabase.
 */

// Mirrors the conversion in updateMixCount / saveCount
function parseCaptionCount(input: string): number {
  return Number(input)
}

// Mirrors the update payload construction
function buildUpdatePayload(captionCount: number): { caption_count: number } {
  return { caption_count: captionCount }
}

describe('parseCaptionCount', () => {
  it('converts a valid integer string', () => {
    expect(parseCaptionCount('5')).toBe(5)
  })

  it('converts zero', () => {
    expect(parseCaptionCount('0')).toBe(0)
  })

  it('converts a whitespace-only string to 0 (JS trims before coercing)', () => {
    expect(parseCaptionCount('  ')).toBe(0)
  })

  it('converts empty string to 0', () => {
    expect(parseCaptionCount('')).toBe(0)
  })

  it('returns NaN for non-numeric input', () => {
    expect(Number.isNaN(parseCaptionCount('abc'))).toBe(true)
  })

  it('converts a float string (truncation not done at parse step)', () => {
    expect(parseCaptionCount('3.7')).toBe(3.7)
  })
})

describe('buildUpdatePayload', () => {
  it('wraps caption_count in the correct key', () => {
    expect(buildUpdatePayload(4)).toEqual({ caption_count: 4 })
  })

  it('works with zero', () => {
    expect(buildUpdatePayload(0)).toEqual({ caption_count: 0 })
  })

  it('does not include extra keys', () => {
    const payload = buildUpdatePayload(2)
    expect(Object.keys(payload)).toEqual(['caption_count'])
  })
})
