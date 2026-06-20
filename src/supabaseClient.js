import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaced early so a misconfigured deploy fails loudly instead of silently
  // rejecting every login.
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars.");
}

export const supabase = createClient(url, anonKey);
