import { useAuthStore } from "@/store/auth-store";

export interface AuthGate {
  status: ReturnType<typeof useAuthStore.getState>["status"];
  isAuthenticated: boolean;
  needsAuth: boolean;
}

/**
 * The single decision a screen makes about anonymous state. Screens never
 * read auth status directly; they bind to this gate so "what requires a
 * signed-in user" lives in one module.
 */
export function useAuthGate(): AuthGate {
  const status = useAuthStore((s) => s.status);
  return {
    status,
    isAuthenticated: status === "authenticated",
    needsAuth: status !== "authenticated",
  };
}