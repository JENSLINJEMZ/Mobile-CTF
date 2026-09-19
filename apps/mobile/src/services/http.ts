import Constants from "expo-constants";

import { API_PREFIX } from "@ctf/shared";

import {
  clearStoredTokens,
  getStoredTokens,
  storeTokens,
} from "./token-storage";

const LOOPBACK =
  /^(https?:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)([:/]|$)/i;

/**
 * Resolve where the API lives. Preference order:
 *  1. An explicit EXPO_PUBLIC_API_URL that is not localhost (a real deployed
 *     endpoint configured on purpose).
 *  2. The host that served the JS bundle (Constants.expoConfig.hostUri), so a
 *     phone on any network talks to the API on the same machine that Metro is
 *     running from (Metro and the API share the host; API port is 4000).
 *  3. EXPO_PUBLIC_API_URL verbatim (dev default: http://localhost:4000).
 */
function resolveApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit && !LOOPBACK.test(explicit)) return explicit;

  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host && !LOOPBACK.test(`http://${host}`)) {
    return `http://${host}:4000`;
  }
  return explicit ?? "http://localhost:4000";
}

export const API_URL = resolveApiUrl();

/**
 * Whether the backend is actually reachable right now. The app's online-ness
 * for the submission gateway is decided by this, not by the device's general
 * internet state (NetInfo): the API can legitimately be up over a LAN or a
 * local adb reverse tunnel while the phone reports no internet at all.
 */
export async function isApiReachable(timeoutMs = 4000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${API_PREFIX}/health`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

async function tryRefreshTokens(): Promise<boolean> {
  const { refreshToken } = await getStoredTokens();
  if (!refreshToken) return false;

  const res = await fetch(`${API_URL}${API_PREFIX}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    await clearStoredTokens();
    return false;
  }
  try {
    const json = (await res.json()) as {
      data?: { tokens?: { accessToken: string; refreshToken: string } };
    };
    const tokens = json.data?.tokens;
    if (!tokens?.accessToken || !tokens?.refreshToken) {
      await clearStoredTokens();
      return false;
    }
    await storeTokens(tokens.accessToken, tokens.refreshToken);
    return true;
  } catch {
    await clearStoredTokens();
    return false;
  }
}

async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
  allowAuthRetry = true,
): Promise<T> {
  const { method = "GET", body, auth = false } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const { accessToken } = await getStoredTokens();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const res = await fetch(`${API_URL}${API_PREFIX}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && allowAuthRetry) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      return apiRequest<T>(path, options, false);
    }
  }

  type ResponseBody = { data?: T; error?: { code?: string; message?: string } };
  const json = (await res.json().catch(() => null)) as ResponseBody | null;

  if (!res.ok) {
    const error = json?.error;
    throw new ApiClientError(
      res.status,
      error?.code ?? "INTERNAL_ERROR",
      error?.message ?? `Request failed (${res.status})`,
    );
  }

  return (json?.data ?? json) as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, "method">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { ...options, method: "POST", body }),
  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { ...options, method: "PATCH", body }),
  del: <T>(path: string, options?: Omit<ApiRequestOptions, "method">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
