import { STORAGE_KEYS } from '@ctf/shared';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_KEY = STORAGE_KEYS.ACCESS_TOKEN;
const REFRESH_KEY = STORAGE_KEYS.REFRESH_TOKEN;

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getStoredTokens(): Promise<{ accessToken?: string; refreshToken?: string }> {
  const [accessToken, refreshToken] = await Promise.all([getItem(ACCESS_KEY), getItem(REFRESH_KEY)]);
  return { accessToken: accessToken ?? undefined, refreshToken: refreshToken ?? undefined };
}

export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([setItem(ACCESS_KEY, accessToken), setItem(REFRESH_KEY, refreshToken)]);
}

export async function clearStoredTokens(): Promise<void> {
  await Promise.all([removeItem(ACCESS_KEY), removeItem(REFRESH_KEY)]);
}