import { useState, useEffect } from "react";
import { errorKey } from "./apiError";

export function useResource(fetcher, deps = []) {
  const [rows, setRows] = useState([]);
  // Which deps last finished loading. A new key reads as loading with no error,
  // so one bad load never sticks.
  const key = JSON.stringify(deps);
  const [loaded, setLoaded] = useState({ key: null, error: null });
  const loading = loaded.key !== key;
  const error = loading ? null : loaded.error;

  useEffect(() => {
    let stale = false;
    fetcher().then((data) => {
      if (stale) return;
      setRows(data);
      setLoaded({ key, error: null });
    }).catch((e) => {
      if (stale) return;
      setLoaded({ key, error: errorKey(e) });
    });
    return () => { stale = true; };
  }, [key]);

  // Optimistic: apply `apply` now; if `save` rejects, run `undo` on the current rows
  // and rethrow. Without `undo` the optimistic change stays (delete, create, reorder).
  const mutate = async (apply, save = async () => {}, undo) => {
    setRows(apply);
    try {
      await save();
    } catch (e) {
      if (undo) setRows(undo);
      throw e;
    }
  };

  // Set `fields` on row `id`; on failure restore only those fields on that row.
  const patch = (id, fields, save) => {
    const row = rows.find((r) => r.id === id);
    const prior = Object.fromEntries(Object.keys(fields).map((k) => [k, row?.[k]]));
    const set = (values) => (xs) => xs.map((r) => r.id === id ? { ...r, ...values } : r);
    return mutate(set(fields), save, set(prior));
  };

  return { rows, loading, error, mutate, patch };
}
