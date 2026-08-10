import { vi } from "vitest";

// Importing supabaseClient.js for real reads import.meta.env.VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY, logs an error and registers a pagehide listener. Every
// feature imports api.js, which imports it transitively, so every feature test
// needs it mocked.
//
// vi.mock is hoisted and its path is resolved relative to the calling file, so
// each test still declares the mock itself; this only supplies the factory:
//
//   vi.mock("../../supabaseClient.js", () => supabaseMock());
export const signOut = vi.fn();

export function supabaseMock({ accessToken = "tok" } = {}) {
  return {
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: { access_token: accessToken } } }),
        signOut: () => signOut(),
      },
    },
  };
}
