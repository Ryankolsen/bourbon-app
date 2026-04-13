import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";
import { Database } from "@/types/database";

// SecureStore has a 2048-byte limit per key. Supabase sessions (with provider tokens)
// can exceed this limit. This adapter splits large values into 2000-byte chunks.
const CHUNK_SIZE = 2000;

function chunkKey(key: string, index: number) {
  return `${key}.chunk_${index}`;
}

async function setChunked(key: string, value: string): Promise<void> {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  await SecureStore.setItemAsync(`${key}.chunks`, String(chunks.length));
  await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(chunkKey(key, i), chunk)));
}

async function getChunked(key: string): Promise<string | null> {
  const countStr = await SecureStore.getItemAsync(`${key}.chunks`);
  if (countStr === null) return null;
  const count = parseInt(countStr, 10);
  const parts = await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(chunkKey(key, i)))
  );
  if (parts.some((p) => p === null)) return null;
  return parts.join("");
}

async function removeChunked(key: string): Promise<void> {
  const countStr = await SecureStore.getItemAsync(`${key}.chunks`);
  if (countStr !== null) {
    const count = parseInt(countStr, 10);
    await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(chunkKey(key, i)))
    );
    await SecureStore.deleteItemAsync(`${key}.chunks`);
  }
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => getChunked(key),
  setItem: (key: string, value: string) => setChunked(key, value),
  removeItem: (key: string) => removeChunked(key),
};

const url = Device.isDevice
  ? process.env.EXPO_PUBLIC_SUPABASE_URL_PROD!
  : process.env.EXPO_PUBLIC_SUPABASE_URL!;

const anonKey = Device.isDevice
  ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_PROD!
  : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(
  url,
  anonKey,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
