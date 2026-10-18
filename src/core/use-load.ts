import { useCallback, useEffect, useState } from "react";

/** Loads something once (and again when `key` changes or reload() is called). Keeps the last data on error. */
export function useLoad<T>(fn: () => Promise<T>, key: string | number = "") {
  const [state, setState] = useState<{ data: T | null; error: string }>({ data: null, error: "" });
  const load = useCallback(
    () =>
      fn().then(
        (data) => setState({ data, error: "" }),
        (e) => setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for everything fn depends on
    [key],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return { ...state, reload: load };
}
