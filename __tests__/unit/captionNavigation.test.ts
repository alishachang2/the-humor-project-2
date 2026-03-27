/**
 * Unit tests for caption navigation logic.
 * These test the cycling behaviour used in the image card carousel.
 */

function prevCaption(current: number, total: number): number {
  return (current - 1 + total) % total
}

function nextCaption(current: number, total: number): number {
  return (current + 1) % total
}

describe('prevCaption', () => {
  it('moves back from index 2 to 1', () => {
    expect(prevCaption(2, 3)).toBe(1)
  })

  it('wraps from index 0 to last', () => {
    expect(prevCaption(0, 3)).toBe(2)
  })

  it('works with a single caption', () => {
    expect(prevCaption(0, 1)).toBe(0)
  })
})

describe('nextCaption', () => {
  it('moves forward from index 0 to 1', () => {
    expect(nextCaption(0, 3)).toBe(1)
  })

  it('wraps from last index back to 0', () => {
    expect(nextCaption(2, 3)).toBe(0)
  })

  it('works with a single caption', () => {
    expect(nextCaption(0, 1)).toBe(0)
  })
})
