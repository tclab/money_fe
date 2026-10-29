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

  // Optimistic: apply `update` now, restore the prior rows if `save` rejects.
  // Rethrows so the caller can surface the error.
  // shortcut: restores a whole snapshot, so a concurrent mutation that landed meanwhile
  // is also undone; switch to per-row undo if overlapping saves become common.
  const mutate = async (update, save) => {
    const snapshot = rows;
    setRows(update);
    try {
      await save();
    } catch (e) {
      setRows(snapshot);
      throw e;
    }
  };

  return { rows, loading, error, mutate };
}
