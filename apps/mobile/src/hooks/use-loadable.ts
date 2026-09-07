import { useCallback, useEffect, useState } from "react";

export interface Loadable<T> {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * The {loading, data, error, retry} surface a screen binds to a single load
 * function against. Screens keep their loader as a useCallback; the hook
 * owns the state machine and the retry path.
 */
export function useLoadable<T>(
  loader: () => Promise<T>,
  initial: T,
  options: { loadOnMount?: boolean } = {},
): Loadable<T> {
  const { loadOnMount = true } = options;
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(loadOnMount);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load");
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    if (!loadOnMount) return;
    void reload();
  }, [reload, loadOnMount]);

  return { data, loading, error, reload };
}