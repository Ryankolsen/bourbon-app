/**
 * Characterization tests for the Supabase client setup.
 *
 * Pins the auth config and the chunked SecureStore session adapter so that
 * Expo SDK / supabase-js upgrades cannot silently change how sessions are
 * stored or restored.
 *
 * Mocks:
 *  - @supabase/supabase-js — captures the createClient arguments
 *  - expo-secure-store     — in-memory store shared across module reloads
 *  - expo-device / Platform — select local vs production and iOS vs Android
 */

const mockCreateClient = jest.fn((..._args: unknown[]) => ({}));
jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

const mockStore = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
}));

const mockDevice = { isDevice: false };
jest.mock("expo-device", () => mockDevice);

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

type ClientArgs = [string, string, { auth: Record<string, unknown> & { storage: Storage } }];

const originalEnv = process.env;

function loadClient({ os = "android", isDevice = false, forceProd = false } = {}) {
  mockDevice.isDevice = isDevice;
  process.env = {
    ...originalEnv,
    EXPO_PUBLIC_SUPABASE_URL: "http://10.0.2.2:54321",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: "local-anon",
    EXPO_PUBLIC_SUPABASE_URL_PROD: "https://prod.supabase.co",
    EXPO_PUBLIC_SUPABASE_ANON_KEY_PROD: "prod-anon",
    EXPO_PUBLIC_FORCE_PROD_DB: forceProd ? "true" : "false",
  };
  mockCreateClient.mockClear();
  jest.isolateModules(() => {
    // isolateModules gives a fresh registry, so set the platform on its copy.
    require("react-native").Platform.OS = os;
    require("@/lib/supabase");
  });
  return mockCreateClient.mock.calls[0] as unknown as ClientArgs;
}

afterEach(() => {
  process.env = originalEnv;
  mockStore.clear();
});

describe("supabase client config", () => {
  it("persists and auto-refreshes sessions without URL session detection", () => {
    const [, , options] = loadClient();
    expect(options.auth).toMatchObject({
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    });
    expect(options.auth.storage).toEqual(
      expect.objectContaining({
        getItem: expect.any(Function),
        setItem: expect.any(Function),
        removeItem: expect.any(Function),
      })
    );
  });

  it("uses the local URL as-is on the Android emulator", () => {
    const [url, key] = loadClient({ os: "android" });
    expect(url).toBe("http://10.0.2.2:54321");
    expect(key).toBe("local-anon");
  });

  it("rewrites the Android emulator host to 127.0.0.1 on the iOS Simulator", () => {
    const [url, key] = loadClient({ os: "ios" });
    expect(url).toBe("http://127.0.0.1:54321");
    expect(key).toBe("local-anon");
  });

  it("uses production on a physical device", () => {
    const [url, key] = loadClient({ isDevice: true });
    expect(url).toBe("https://prod.supabase.co");
    expect(key).toBe("prod-anon");
  });

  it("uses production when EXPO_PUBLIC_FORCE_PROD_DB is true", () => {
    const [url, key] = loadClient({ forceProd: true });
    expect(url).toBe("https://prod.supabase.co");
    expect(key).toBe("prod-anon");
  });
});

describe("session storage adapter", () => {
  const KEY = "sb-auth-token";
  // Larger than SecureStore's 2048-byte limit, so it must be chunked.
  const session = JSON.stringify({ access_token: "a".repeat(3000), refresh_token: "r" });

  it("round-trips a session larger than one SecureStore entry", async () => {
    const storage = loadClient()[2].auth.storage;
    await storage.setItem(KEY, session);
    expect(await storage.getItem(KEY)).toBe(session);
    expect([...mockStore.values()].every((v) => v.length <= 2048)).toBe(true);
  });

  it("restores a stored session after the app restarts", async () => {
    await loadClient()[2].auth.storage.setItem(KEY, session);
    const restarted = loadClient()[2].auth.storage;
    expect(await restarted.getItem(KEY)).toBe(session);
  });

  it("returns null when no session is stored", async () => {
    const storage = loadClient()[2].auth.storage;
    expect(await storage.getItem(KEY)).toBeNull();
  });

  it("clears every chunk on sign-out", async () => {
    const storage = loadClient()[2].auth.storage;
    await storage.setItem(KEY, session);
    await storage.removeItem(KEY);
    expect(await storage.getItem(KEY)).toBeNull();
    expect(mockStore.size).toBe(0);
  });

  it("treats a session with a missing chunk as absent", async () => {
    const storage = loadClient()[2].auth.storage;
    await storage.setItem(KEY, session);
    mockStore.delete(`${KEY}.chunk_1`);
    expect(await storage.getItem(KEY)).toBeNull();
  });
});
