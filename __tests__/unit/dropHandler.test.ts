/**
 * Unit tests for drag-and-drop file filtering.
 * Only image/* files should be passed to the uploader.
 */

function filterImageFiles(files: File[]): File[] {
  return files.filter(f => f.type.startsWith('image/'))
}

function makeFile(name: string, type: string): File {
  return new File([''], name, { type })
}

describe('filterImageFiles', () => {
  it('keeps jpeg files', () => {
    const files = [makeFile('photo.jpg', 'image/jpeg')]
    expect(filterImageFiles(files)).toHaveLength(1)
  })

  it('keeps png files', () => {
    const files = [makeFile('photo.png', 'image/png')]
    expect(filterImageFiles(files)).toHaveLength(1)
  })

  it('removes non-image files', () => {
    const files = [
      makeFile('doc.pdf', 'application/pdf'),
      makeFile('data.csv', 'text/csv'),
    ]
    expect(filterImageFiles(files)).toHaveLength(0)
  })

  it('filters mixed list down to only images', () => {
    const files = [
      makeFile('photo.jpg', 'image/jpeg'),
      makeFile('doc.pdf', 'application/pdf'),
      makeFile('photo.png', 'image/png'),
    ]
    const result = filterImageFiles(files)
    expect(result).toHaveLength(2)
    expect(result.map(f => f.name)).toEqual(['photo.jpg', 'photo.png'])
  })

  it('returns empty array when no files passed', () => {
    expect(filterImageFiles([])).toHaveLength(0)
  })
})
