import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock storage bucket methods
const mockStorageList = vi.fn()
const mockStorageRemove = vi.fn()
const mockStorageFrom = vi.fn(() => ({
  list: mockStorageList,
  remove: mockStorageRemove,
}))

// Mock DB query chain
const mockFrom = vi.fn()
const mockAdminClient = {
  from: mockFrom,
  storage: { from: mockStorageFrom },
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdminClient,
}))

const { GET } = await import('./route')

function makeRequest(authHeader?: string): NextRequest {
  const headers = new Headers()
  if (authHeader) headers.set('authorization', authHeader)
  return new NextRequest('http://localhost/api/cron/cleanup-storage', { headers })
}

// Returns a chain for .from('milestones').select('photo_url').not(...)
function milestonesChain(data: unknown[] = [], error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      not: vi.fn().mockResolvedValue({ data, error }),
    }),
  }
}

// Helper to build a storage object fixture
function makeStorageObject(
  name: string,
  createdAgo: number, // ms ago
  id = 'some-id',
) {
  return {
    id,
    name,
    created_at: new Date(Date.now() - createdAgo).toISOString(),
  }
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000
const TEN_MINUTES_MS = 10 * 60 * 1000

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', 'test-secret')
})

describe('GET /api/cron/cleanup-storage - auth', () => {
  it('returns 401 when no auth header', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when wrong CRON_SECRET', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when CRON_SECRET env var is not set', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })
})

describe('GET /api/cron/cleanup-storage - empty storage', () => {
  it('returns 200 with zero counts when bucket is empty', async () => {
    mockStorageList.mockResolvedValue({ data: [], error: null })

    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.checked).toBe(0)
    expect(body.deleted).toBe(0)
    expect(body.skipped).toBe(0)
  })

  it('returns 200 with zero counts when storage list returns null', async () => {
    mockStorageList.mockResolvedValue({ data: null, error: null })

    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.checked).toBe(0)
    expect(body.deleted).toBe(0)
    expect(body.skipped).toBe(0)
  })
})

describe('GET /api/cron/cleanup-storage - all objects referenced', () => {
  it('returns 200 with deleted:0 when every object is referenced by a milestone', async () => {
    const obj = makeStorageObject('photos/photo1.jpg', TWO_DAYS_MS)
    mockStorageList.mockResolvedValue({ data: [obj], error: null })
    mockFrom.mockReturnValue(
      milestonesChain([
        {
          photo_url: 'https://example.supabase.co/storage/v1/object/public/milestone-photos/photos/photo1.jpg',
        },
      ]),
    )

    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.checked).toBe(1)
    expect(body.deleted).toBe(0)
    expect(mockStorageRemove).not.toHaveBeenCalled()
  })
})

describe('GET /api/cron/cleanup-storage - orphan deletion', () => {
  it('identifies and deletes orphaned objects older than the grace period', async () => {
    const orphan = makeStorageObject('photos/orphan.jpg', TWO_DAYS_MS)
    mockStorageList.mockResolvedValue({ data: [orphan], error: null })
    // No milestones reference this file
    mockFrom.mockReturnValue(milestonesChain([]))
    mockStorageRemove.mockResolvedValue({ error: null })

    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.checked).toBe(1)
    expect(body.deleted).toBe(1)
    expect(mockStorageRemove).toHaveBeenCalledWith(['photos/orphan.jpg'])
  })

  it('reports correct counts when some objects are orphaned and some are referenced', async () => {
    const orphan1 = makeStorageObject('photos/orphan1.jpg', TWO_DAYS_MS)
    const orphan2 = makeStorageObject('photos/orphan2.jpg', TWO_DAYS_MS)
    const referenced = makeStorageObject('photos/referenced.jpg', TWO_DAYS_MS)
    mockStorageList.mockResolvedValue({ data: [orphan1, orphan2, referenced], error: null })
    mockFrom.mockReturnValue(
      milestonesChain([
        {
          photo_url: 'https://example.supabase.co/storage/v1/object/public/milestone-photos/photos/referenced.jpg',
        },
      ]),
    )
    mockStorageRemove.mockResolvedValue({ error: null })

    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.checked).toBe(3)
    expect(body.deleted).toBe(2)
    expect(mockStorageRemove).toHaveBeenCalledWith(expect.arrayContaining(['photos/orphan1.jpg', 'photos/orphan2.jpg']))
  })
})

describe('GET /api/cron/cleanup-storage - grace period', () => {
  it('skips objects created within the 24-hour grace period', async () => {
    const recentObj = makeStorageObject('photos/recent.jpg', TEN_MINUTES_MS)
    mockStorageList.mockResolvedValue({ data: [recentObj], error: null })
    mockFrom.mockReturnValue(milestonesChain([]))

    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.checked).toBe(1)
    expect(body.deleted).toBe(0)
    expect(body.skipped).toBe(1)
    expect(mockStorageRemove).not.toHaveBeenCalled()
  })

  it('deletes objects just beyond the 24-hour grace period', async () => {
    // 25 hours ago — beyond the grace period
    const oldObj = makeStorageObject('photos/old.jpg', 25 * 60 * 60 * 1000)
    mockStorageList.mockResolvedValue({ data: [oldObj], error: null })
    mockFrom.mockReturnValue(milestonesChain([]))
    mockStorageRemove.mockResolvedValue({ error: null })

    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(1)
    expect(body.skipped).toBe(0)
  })

  it('skips folder entries (objects without an id)', async () => {
    const folder = { id: undefined, name: 'photos/', created_at: new Date(Date.now() - TWO_DAYS_MS).toISOString() }
    mockStorageList.mockResolvedValue({ data: [folder], error: null })
    mockFrom.mockReturnValue(milestonesChain([]))

    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(0)
    expect(mockStorageRemove).not.toHaveBeenCalled()
  })
})

describe('GET /api/cron/cleanup-storage - error handling', () => {
  it('returns 500 when storage list fails', async () => {
    mockStorageList.mockResolvedValue({ data: null, error: { message: 'bucket not found' } })

    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to list storage objects')
  })

  it('returns 500 when milestones query fails', async () => {
    const obj = makeStorageObject('photos/photo.jpg', TWO_DAYS_MS)
    mockStorageList.mockResolvedValue({ data: [obj], error: null })
    mockFrom.mockReturnValue(milestonesChain([], { message: 'DB error' }))

    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to query milestones')
  })

  it('returns 200 with errors array when storage remove fails', async () => {
    const orphan = makeStorageObject('photos/orphan.jpg', TWO_DAYS_MS)
    mockStorageList.mockResolvedValue({ data: [orphan], error: null })
    mockFrom.mockReturnValue(milestonesChain([]))
    mockStorageRemove.mockResolvedValue({ error: { message: 'delete failed' } })

    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.deleted).toBe(0)
    expect(body.errors).toContain('delete failed')
  })
})

describe('GET /api/cron/cleanup-storage - response shape', () => {
  it('returns correct counts in response JSON', async () => {
    const orphan = makeStorageObject('photos/orphan.jpg', TWO_DAYS_MS)
    const recent = makeStorageObject('photos/recent.jpg', TEN_MINUTES_MS)
    const referenced = makeStorageObject('photos/referenced.jpg', TWO_DAYS_MS)
    mockStorageList.mockResolvedValue({ data: [orphan, recent, referenced], error: null })
    mockFrom.mockReturnValue(
      milestonesChain([
        {
          photo_url: 'https://example.supabase.co/storage/v1/object/public/milestone-photos/photos/referenced.jpg',
        },
      ]),
    )
    mockStorageRemove.mockResolvedValue({ error: null })

    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    // 3 objects were in the bucket
    expect(body.checked).toBe(3)
    // 1 orphan old enough to delete
    expect(body.deleted).toBe(1)
    // 1 within grace period
    expect(body.skipped).toBe(1)
    expect(body.timestamp).toBeDefined()
    // No errors
    expect(body.errors).toBeUndefined()
  })

  it('omits errors key from response when there are no errors', async () => {
    mockStorageList.mockResolvedValue({ data: [], error: null })

    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()
    expect(body.errors).toBeUndefined()
  })
})
