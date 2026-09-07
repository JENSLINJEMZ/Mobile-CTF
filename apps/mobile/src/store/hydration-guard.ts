/**
 * Shared hydration guard. Zustand stores that hydrate from an async source
 * (server call, local persistence) wrap their load function here so that
 * concurrent calls are deduped and the guard is released when the first
 * call settles — even if it fails.
 */
const guards = new Map<string, Promise<unknown>>();

export function withHydrationGuard<T>(
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  if (guards.has(key)) return guards.get(key) as Promise<T>;
  const promise = load().finally(() => guards.delete(key));
  guards.set(key, promise);
  return promise;
}