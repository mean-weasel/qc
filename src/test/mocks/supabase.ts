import { vi } from 'vitest'

function createChainableMock() {
  const mock: Record<string, ReturnType<typeof vi.fn>> = {}

  const methods = [
    'from',
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'in',
    'is',
    'order',
    'limit',
    'range',
    'single',
    'maybeSingle',
    'match',
    'filter',
    'or',
    'not',
    'textSearch',
  ]

  for (const method of methods) {
    // eslint-disable-next-line security/detect-object-injection -- method is from a hardcoded local string array
    mock[method] = vi.fn().mockReturnThis()
  }

  mock['single'] = vi.fn().mockResolvedValue({ data: null, error: null })
  mock['maybeSingle'] = vi.fn().mockResolvedValue({ data: null, error: null })

  return mock
}

export function createMockSupabaseClient() {
  const queryBuilder = createChainableMock()

  return {
    from: vi.fn().mockReturnValue(queryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { url: 'https://example.com/auth' },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.png' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/test.png' },
        }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
    _queryBuilder: queryBuilder,
  }
}
