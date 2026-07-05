import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaced early so a misconfigured deploy fails loudly instead of silently
  // rejecting every login.
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars.");
}

// Remember-me: when off, the session lives in sessionStorage (cleared on tab close);
// when on, localStorage (survives restart). setRememberSession flips this before login.
let persist = true;
export const setRememberSession = (v) => { persist = v; };

const smartStorage = {
  getItem: (k) => (persist ? localStorage : sessionStorage).getItem(k) ?? localStorage.getItem(k),
  setItem: (k, val) => {
    (persist ? localStorage : sessionStorage).setItem(k, val);
    if (!persist) localStorage.removeItem(k);
  },
  removeItem: (k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); },
};

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, storage: smartStorage },
});
