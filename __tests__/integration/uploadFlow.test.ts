/**
 * Integration tests for the full image upload pipeline:
 * Phase 1a — Request presigned URL from /api/presign
 * Phase 1b — PUT file directly to S3
 * Phase 1c — Insert public URL into Supabase, get back image ID
 * Phase 2  — POST to /pipeline/generate_captions with image_id + profile_id
 */

const MOCK_PRESIGNED_URL = 'https://humor-project-upload.s3.us-east-2.amazonaws.com/test-key?X-Amz-Signature=abc'
const MOCK_PUBLIC_URL = 'https://humor-project-upload.s3.us-east-2.amazonaws.com/test-key'
const MOCK_IMAGE_ID = 'img-uuid-001'
const MOCK_PROFILE_ID = 'profile-uuid-001'
const PIPELINE_URL = 'http://matrix.almostcrackd.ai'

process.env.NEXT_PUBLIC_PIPELINE_URL = PIPELINE_URL

const mockSingle = jest.fn().mockResolvedValue({ data: { id: MOCK_IMAGE_ID }, error: null })
const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
const mockInsert = jest.fn().mockReturnValue({ select: mockSelect })
const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert })
const mockGetUser = jest.fn().mockResolvedValue({ data: { user: { id: MOCK_PROFILE_ID } } })
const mockSupabase = { from: mockFrom, auth: { getUser: mockGetUser } }

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

// Replicate uploadFiles logic from the images page
async function uploadFiles(files: File[]) {
  if (!files.length) return

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const profileId = user?.id

  for (const file of files) {
    const presignRes = await fetch('/api/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    })
    if (!presignRes.ok) continue

    const { presignedUrl, publicUrl } = await presignRes.json()

    const uploadRes = await fetch(presignedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
    if (!uploadRes.ok) continue

    const { data: imageData, error: dbError } = await supabase.from('images').insert({ url: publicUrl }).select('id').single()
    if (dbError || !imageData) continue

    await fetch(`${process.env.NEXT_PUBLIC_PIPELINE_URL}/pipeline/generate_captions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id: imageData.id, profile_id: profileId }),
    })
  }
}

describe('uploadFiles — full pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    mockSingle.mockResolvedValue({ data: { id: MOCK_IMAGE_ID }, error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_PROFILE_ID } } })
  })

  function mockHappyPath() {
    const mockFetch = global.fetch as jest.Mock
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: MOCK_PRESIGNED_URL, publicUrl: MOCK_PUBLIC_URL }) }) // presign
      .mockResolvedValueOnce({ ok: true })  // S3 PUT
      .mockResolvedValueOnce({ ok: true })  // pipeline
    return mockFetch
  }

  it('executes all four phases in order', async () => {
    const mockFetch = mockHappyPath()
    const file = new File(['img'], 'cat.jpg', { type: 'image/jpeg' })
    await uploadFiles([file])

    const calls = mockFetch.mock.calls
    expect(calls[0][0]).toBe('/api/presign')                                             // Phase 1a
    expect(calls[1][0]).toBe(MOCK_PRESIGNED_URL)                                         // Phase 1b
    expect(mockInsert).toHaveBeenCalledWith({ url: MOCK_PUBLIC_URL })                    // Phase 1c
    expect(calls[2][0]).toBe(`${PIPELINE_URL}/pipeline/generate_captions`)              // Phase 2
  })

  it('sends image_id and profile_id to the pipeline', async () => {
    mockHappyPath()
    const file = new File(['img'], 'cat.jpg', { type: 'image/jpeg' })
    await uploadFiles([file])

    const pipelineCall = (global.fetch as jest.Mock).mock.calls[2]
    const body = JSON.parse(pipelineCall[1].body)
    expect(body.image_id).toBe(MOCK_IMAGE_ID)
    expect(body.profile_id).toBe(MOCK_PROFILE_ID)
  })

  it('skips all subsequent phases if presign fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    await uploadFiles([new File([''], 'cat.jpg', { type: 'image/jpeg' })])

    expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(1)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('skips DB insert and pipeline if S3 upload fails', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: MOCK_PRESIGNED_URL, publicUrl: MOCK_PUBLIC_URL }) })
      .mockResolvedValueOnce({ ok: false })
    await uploadFiles([new File([''], 'cat.jpg', { type: 'image/jpeg' })])

    expect(mockInsert).not.toHaveBeenCalled()
    expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(2)
  })

  it('skips pipeline if DB insert fails', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: MOCK_PRESIGNED_URL, publicUrl: MOCK_PUBLIC_URL }) })
      .mockResolvedValueOnce({ ok: true })
    await uploadFiles([new File([''], 'cat.jpg', { type: 'image/jpeg' })])

    expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(2) // presign + S3, no pipeline
  })

  it('runs all phases independently for multiple files', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: MOCK_PRESIGNED_URL, publicUrl: MOCK_PUBLIC_URL }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: MOCK_PRESIGNED_URL + '2', publicUrl: MOCK_PUBLIC_URL + '2' }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })

    await uploadFiles([
      new File([''], 'a.jpg', { type: 'image/jpeg' }),
      new File([''], 'b.png', { type: 'image/png' }),
    ])

    expect(mockInsert).toHaveBeenCalledTimes(2)
    expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(6) // 3 steps × 2 files
  })

  it('does nothing when given an empty file list', async () => {
    await uploadFiles([])
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
