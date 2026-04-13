/**
 * Typed mock Supabase client factory for unit tests.
 *
 * Usage:
 *   const { client, spies } = createMockSupabaseClient();
 *   spies.select.mockResolvedValueOnce({ data: [...], error: null });
 */

export interface MockQueryBuilder {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  upsert: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  in: jest.Mock;
  is: jest.Mock;
  ilike: jest.Mock;
  or: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  then: jest.Mock;
}

export interface MockSupabaseSpies {
  from: jest.Mock;
  rpc: jest.Mock;
  storage: {
    from: jest.Mock;
    upload: jest.Mock;
    getPublicUrl: jest.Mock;
  };
}

export interface MockSupabaseClient {
  from: jest.Mock;
  rpc: jest.Mock;
  storage: {
    from: jest.Mock;
  };
}

/**
 * Creates a chainable mock Supabase query builder.
 * All methods return `this` so chaining works, and `then` / `single` /
 * `maybeSingle` resolve to `{ data: null, error: null }` by default.
 */
function createQueryBuilder(): MockQueryBuilder {
  const defaultResolution = { data: null, error: null };

  const builder: MockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(defaultResolution),
    maybeSingle: jest.fn().mockResolvedValue(defaultResolution),
    then: jest.fn((resolve: (v: typeof defaultResolution) => void) =>
      Promise.resolve(defaultResolution).then(resolve)
    ),
  };

  return builder;
}

/**
 * Returns a mock Supabase client and the underlying jest spies.
 *
 * The `from` spy returns a fresh query builder each call so tests can
 * configure independent responses per table:
 *
 *   const { client } = createMockSupabaseClient();
 *   client.from('bourbons').select.mockResolvedValueOnce({ data: [...], error: null });
 */
export function createMockSupabaseClient(): {
  client: MockSupabaseClient;
  spies: MockSupabaseSpies;
} {
  const storageUpload = jest.fn().mockResolvedValue({ data: { path: 'mock/path' }, error: null });
  const storageGetPublicUrl = jest
    .fn()
    .mockReturnValue({ data: { publicUrl: 'https://mock.supabase.co/storage/mock/path' } });

  const storageFrom = jest.fn().mockReturnValue({
    upload: storageUpload,
    getPublicUrl: storageGetPublicUrl,
  });

  const rpc = jest.fn().mockResolvedValue({ data: null, error: null });

  const from = jest.fn().mockImplementation(() => createQueryBuilder());

  const client: MockSupabaseClient = {
    from,
    rpc,
    storage: { from: storageFrom },
  };

  const spies: MockSupabaseSpies = {
    from,
    rpc,
    storage: {
      from: storageFrom,
      upload: storageUpload,
      getPublicUrl: storageGetPublicUrl,
    },
  };

  return { client, spies };
}
