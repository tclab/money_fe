import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "./lib/apiError.js";

const signOut = vi.fn();
vi.mock("./supabaseClient.js", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: "tok" } } }),
      signOut: () => signOut(),
    },
  },
}));

const { fetchExpenses, deleteExpense } = await import("./api.js");

function respond({ status = 200, body, ok }) {
  return {
    ok: ok ?? (status >= 200 && status < 300),
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError("Unexpected end of JSON input");
      return body;
    },
  };
}

describe("authFetch error handling", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed data on success", async () => {
    fetch.mockResolvedValue(
      respond({ body: { expenses: [{ id: "1", expense: "Rent", value: 100 }] } })
    );
    await expect(fetchExpenses(null, "2026-08")).resolves.toEqual([
      { id: "1", name: "Rent", amount: 100, status: "unpaid", category_id: undefined },
    ]);
  });

  it("sends the access token", async () => {
    fetch.mockResolvedValue(respond({ body: { expenses: [] } }));
    await fetchExpenses();
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
  });

  it("throws an ApiError built from the envelope", async () => {
    fetch.mockResolvedValue(
      respond({ status: 404, body: { error: { code: "NOT_FOUND", message: "Expense not found" } } })
    );
    const err = await deleteExpense("nope").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.status).toBe(404);
  });

  it("throws INTERNAL when the body carries no envelope", async () => {
    fetch.mockResolvedValue(respond({ status: 502, body: undefined }));
    const err = await fetchExpenses().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("INTERNAL");
  });

  it("throws UPSTREAM when fetch itself rejects", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await fetchExpenses().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("UPSTREAM");
  });

  it("signs out and throws UNAUTHORIZED on a 401", async () => {
    fetch.mockResolvedValue(respond({ status: 401, body: { error: { code: "UNAUTHORIZED" } } }));
    const err = await fetchExpenses().catch((e) => e);
    expect(signOut).toHaveBeenCalledOnce();
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("UNAUTHORIZED");
  });

  it("resolves void endpoints without reading a body", async () => {
    fetch.mockResolvedValue(respond({ status: 204, body: undefined }));
    await expect(deleteExpense("1")).resolves.toBeUndefined();
  });
});
