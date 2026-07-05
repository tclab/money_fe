import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaced early so a misconfigured deploy fails loudly instead of silently
  // rejecting every login.
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars.");
}

// Remember-me: when off, the session is dropped on tab close by clearing the
// persisted token then. No custom storage object — that deadlocked supabase-js's
// session lock and hung getSession(). setRememberSession records the choice; the
// cleanup happens via a pagehide listener below.
let persist = true;
export const setRememberSession = (v) => { persist = v; };

export const supabase = createClient(url, anonKey);

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    if (!persist) {
      // Drop the persisted session so it does not survive the tab closing.
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("sb-") && k.endsWith("-auth-token")) localStorage.removeItem(k);
      }
    }
  });
}
