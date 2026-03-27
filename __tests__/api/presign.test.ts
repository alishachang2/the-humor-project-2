/**
 * @jest-environment node
 */
import { POST } from '@/app/api/presign/route'
import { NextRequest } from 'next/server'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn().mockImplementation((params) => ({ ...params })),
}))

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}))

const mockGetSignedUrl = getSignedUrl as jest.Mock

beforeEach(() => {
  process.env.AWS_REGION = 'us-east-2'
  process.env.AWS_S3_BUCKET = 'humor-project-upload'
  process.env.AWS_ACCESS_KEY_ID = 'test-key-id'
  process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
  mockGetSignedUrl.mockResolvedValue('https://humor-project-upload.s3.us-east-2.amazonaws.com/presigned-key?X-Amz-Signature=abc')
})

afterEach(() => jest.clearAllMocks())

describe('POST /api/presign', () => {
  function makeRequest(body: object) {
    return new NextRequest('http://localhost/api/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('returns a presignedUrl and publicUrl', async () => {
    const res = await POST(makeRequest({ filename: 'cat.jpg', contentType: 'image/jpeg' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.presignedUrl).toContain('presigned-key')
    expect(body.publicUrl).toMatch(/^https:\/\/humor-project-upload\.s3\.us-east-2\.amazonaws\.com\//)
  })

  it('publicUrl includes the original filename', async () => {
    const res = await POST(makeRequest({ filename: 'funny-dog.png', contentType: 'image/png' }))
    const body = await res.json()

    expect(body.publicUrl).toContain('funny-dog.png')
  })

  it('calls getSignedUrl with correct content type', async () => {
    await POST(makeRequest({ filename: 'image.webp', contentType: 'image/webp' }))

    const [, command] = mockGetSignedUrl.mock.calls[0]
    expect(command).toMatchObject({ ContentType: 'image/webp' })
  })

  it('presign URL expires in 60 seconds', async () => {
    await POST(makeRequest({ filename: 'test.jpg', contentType: 'image/jpeg' }))

    const [, , options] = mockGetSignedUrl.mock.calls[0]
    expect(options.expiresIn).toBe(60)
  })
})
