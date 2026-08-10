import { vi } from "vitest";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

// Split "POST /transactions" into its method and path; a bare path means any method.
function parseKey(key) {
  const [head, ...rest] = key.split(" ");
  return METHODS.includes(head)
    ? { method: head, path: rest.join(" ") }
    : { method: null, path: key };
}

/**
 * Features fire several requests on mount, so a single mockResolvedValue makes
 * tests pass for the wrong reason. Route by URL instead:
 *
 *   installFetchMock({
 *     "/categories/expense": [],
 *     "GET /expenses": { expenses: [] },
 *     "PUT /expense-status": {},
 *   })
 *
 * A key is "METHOD /path" or a bare "/path" matching any method. Paths match as
 * a substring of the request pathname. A method-specific key always outranks a
 * bare one, then longer paths outrank shorter; without that first rule a bare
 * "/splitter/items" would shadow "POST /splitter/items" and swallow the write.
 * Wrap a value in `failWith` to force a failure. Unmatched requests throw, so a
 * missing route is loud.
 */
export function installFetchMock(routes) {
  const entries = Object.keys(routes)
    .map((key) => ({ key, ...parseKey(key) }))
    .sort((a, b) =>
      (a.method === null) - (b.method === null) || b.path.length - a.path.length
    );

  const fetchMock = vi.fn(async (url, init = {}) => {
    const method = init.method ?? "GET";
    const { pathname } = new URL(String(url));
    const hit = entries.find(
      (e) => pathname.includes(e.path) && (e.method === null || e.method === method)
    );
    if (!hit) throw new Error(`No fetch route for ${method} ${pathname}`);

    const value = routes[hit.key];
    const failure = value?.[FAILURE];
    return {
      ok: !failure,
      status: failure?.status ?? 200,
      json: async () => (failure ? failure.body : value),
    };
  });

  globalThis.fetch = fetchMock;
  return fetchMock;
}

// Symbol-keyed so it cannot collide with a real response body that happens to
// carry a `status` field.
const FAILURE = Symbol("failure");

// Route value that makes the endpoint fail with an ApiError envelope.
export function failWith(status, code = "INTERNAL") {
  return { [FAILURE]: { status, body: { error: { code } } } };
}

// Body of the first matching request, parsed back from JSON.
export function requestBody(fetchMock, predicate) {
  const call = fetchMock.mock.calls.find(([url, init]) => predicate(String(url), init ?? {}));
  if (!call) return undefined;
  return call[1]?.body ? JSON.parse(call[1].body) : undefined;
}

// Every call whose url + method matches.
export function callsMatching(fetchMock, predicate) {
  return fetchMock.mock.calls.filter(([url, init]) => predicate(String(url), init ?? {}));
}
