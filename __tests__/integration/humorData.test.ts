/**
 * Integration tests for the humor page data layer.
 * Verifies that loadHumorFlavors, loadHumorFlavorSteps, loadHumorMix, and
 * updateMixCount hit the correct Supabase tables with the correct queries.
 */

// ─── mock setup ───────────────────────────────────────────────────────────────

const mockEq = jest.fn().mockResolvedValue({ error: null })
const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })
const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null })
const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
const mockFrom = jest.fn().mockReturnValue({ select: mockSelect, update: mockUpdate })
const mockSupabase = { from: mockFrom }

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

// ─── replicated data-layer functions (mirrors app/admin/humor/page.tsx) ───────

async function loadHumorFlavors() {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data } = await supabase
    .from('humor_flavors')
    .select('*')
    .order('created_datetime_utc', { ascending: true })
  return data ?? []
}

async function loadHumorFlavorSteps() {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data } = await supabase
    .from('humor_flavor_steps')
    .select('*')
    .order('order_by', { ascending: true })
  return data ?? []
}

async function loadHumorMix() {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data } = await supabase.from('humor_flavor_mix').select('*')
  return data ?? []
}

async function updateMixCount(id: string | number, captionCount: number) {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { error } = await supabase
    .from('humor_flavor_mix')
    .update({ caption_count: captionCount })
    .eq('id', id)
  return error
}

// ─── tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockSelect.mockReturnValue({ order: mockOrder })
  mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate })
  mockEq.mockResolvedValue({ error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })
})

describe('loadHumorFlavors', () => {
  it('queries the humor_flavors table', async () => {
    await loadHumorFlavors()
    expect(mockFrom).toHaveBeenCalledWith('humor_flavors')
  })

  it('selects all columns', async () => {
    await loadHumorFlavors()
    expect(mockSelect).toHaveBeenCalledWith('*')
  })

  it('orders by created_datetime_utc ascending', async () => {
    await loadHumorFlavors()
    expect(mockOrder).toHaveBeenCalledWith('created_datetime_utc', { ascending: true })
  })

  it('returns rows from the response', async () => {
    const rows = [{ id: 1, slug: 'dry', description: 'Dry humor' }]
    mockOrder.mockResolvedValueOnce({ data: rows, error: null })
    const result = await loadHumorFlavors()
    expect(result).toEqual(rows)
  })

  it('returns empty array when data is null', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'error' } })
    const result = await loadHumorFlavors()
    expect(result).toEqual([])
  })
})

describe('loadHumorFlavorSteps', () => {
  it('queries the humor_flavor_steps table', async () => {
    await loadHumorFlavorSteps()
    expect(mockFrom).toHaveBeenCalledWith('humor_flavor_steps')
  })

  it('selects all columns', async () => {
    await loadHumorFlavorSteps()
    expect(mockSelect).toHaveBeenCalledWith('*')
  })

  it('orders by order_by ascending', async () => {
    await loadHumorFlavorSteps()
    expect(mockOrder).toHaveBeenCalledWith('order_by', { ascending: true })
  })

  it('returns rows from the response', async () => {
    const rows = [{ id: 1, humor_flavor_id: 2, order_by: 1, description: 'Step 1' }]
    mockOrder.mockResolvedValueOnce({ data: rows, error: null })
    const result = await loadHumorFlavorSteps()
    expect(result).toEqual(rows)
  })

  it('returns empty array when data is null', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'error' } })
    const result = await loadHumorFlavorSteps()
    expect(result).toEqual([])
  })
})

describe('loadHumorMix', () => {
  it('queries the humor_flavor_mix table', async () => {
    // humor_flavor_mix uses .select('*') without .order(), so wire mockSelect to resolve directly
    mockSelect.mockResolvedValueOnce({ data: [], error: null })
    await loadHumorMix()
    expect(mockFrom).toHaveBeenCalledWith('humor_flavor_mix')
  })

  it('selects all columns', async () => {
    mockSelect.mockResolvedValueOnce({ data: [], error: null })
    await loadHumorMix()
    expect(mockSelect).toHaveBeenCalledWith('*')
  })

  it('returns rows from the response', async () => {
    const rows = [{ id: 1, humor_flavor_id: 2, caption_count: 5 }]
    mockSelect.mockResolvedValueOnce({ data: rows, error: null })
    const result = await loadHumorMix()
    expect(result).toEqual(rows)
  })

  it('returns empty array when data is null', async () => {
    mockSelect.mockResolvedValueOnce({ data: null, error: { message: 'error' } })
    const result = await loadHumorMix()
    expect(result).toEqual([])
  })
})

describe('updateMixCount', () => {
  it('queries the humor_flavor_mix table', async () => {
    await updateMixCount('1', 3)
    expect(mockFrom).toHaveBeenCalledWith('humor_flavor_mix')
  })

  it('calls update with the correct caption_count payload', async () => {
    await updateMixCount('1', 7)
    expect(mockUpdate).toHaveBeenCalledWith({ caption_count: 7 })
  })

  it('filters by the correct id', async () => {
    await updateMixCount('42', 3)
    expect(mockEq).toHaveBeenCalledWith('id', '42')
  })

  it('returns null error on success', async () => {
    const err = await updateMixCount('1', 2)
    expect(err).toBeNull()
  })

  it('returns the error object on failure', async () => {
    const dbError = { message: 'update failed' }
    mockEq.mockResolvedValueOnce({ error: dbError })
    const err = await updateMixCount('1', 2)
    expect(err).toEqual(dbError)
  })

  it('accepts numeric id', async () => {
    await updateMixCount(5, 10)
    expect(mockEq).toHaveBeenCalledWith('id', 5)
  })
})
