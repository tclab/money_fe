import { useState, useEffect } from "react";
import { errorKey } from "./apiError";

export function useResource(fetcher, deps = []) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    // Clear the previous failure, else one bad load sticks forever.
    setError(null);
    let stale = false;
    fetcher().then((data) => {
      if (stale) return;
      setRows(data);
      setLoading(false);
    }).catch((e) => {
      if (stale) return;
      setError(errorKey(e));
      setLoading(false);
    });
    return () => { stale = true; };
  }, deps);

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
