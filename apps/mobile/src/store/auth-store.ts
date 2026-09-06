import type { AuthResponse, UserDto } from "@ctf/shared";
import { create } from "zustand";

import { fetchMe, loginUser, logoutAll, registerUser } from "@/services/auth";
import { ApiClientError } from "@/services/http";
import { clearStoredTokens, storeTokens } from "@/services/token-storage";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthState {
  status: AuthStatus;
  user: UserDto | null;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

function messageOf(err: unknown): string {
  return err instanceof ApiClientError
    ? err.message
    : "Something went wrong. Please try again.";
}

async function persistSession(auth: AuthResponse): Promise<void> {
  await storeTokens(auth.tokens.accessToken, auth.tokens.refreshToken);
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,
  error: null,

  hydrate: async () => {
    try {
      const user = await fetchMe();
      set({ status: "authenticated", user, error: null });
    } catch {
      await clearStoredTokens();
      set({ status: "anonymous", user: null, error: null });
    }
  },

  login: async (email, password) => {
    try {
      const auth = await loginUser({ email, password });
      await persistSession(auth);
      set({ status: "authenticated", user: auth.user, error: null });
    } catch (err) {
      set({ error: messageOf(err) });
      throw err;
    }
  },

  register: async (email, username, password) => {
    try {
      const auth = await registerUser({ email, username, password });
      await persistSession(auth);
      set({ status: "authenticated", user: auth.user, error: null });
    } catch (err) {
      set({ error: messageOf(err) });
      throw err;
    }
  },

  logout: async () => {
    await logoutAll().catch(() => undefined);
    await clearStoredTokens();
    set({ status: "anonymous", user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
