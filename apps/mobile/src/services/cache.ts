import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "cache:";

function cacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value: T; at: number };
    return parsed.value;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(
      cacheKey(key),
      JSON.stringify({ value, at: Date.now() }),
    );
  } catch {
    // Cache writes must never throw into app flows.
  }
}

export async function cacheRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(cacheKey(key));
  } catch {
    // ignore
  }
}

export async function cacheClearAll(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(
      keys.filter((k) => k.startsWith(CACHE_PREFIX)),
    );
  } catch {
    // ignore
  }
}
