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

const { fetchExpenses, fetchIncome, deleteExpense } = await import("./api.js");

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

// mapExpense / mapIncome are module-private, so they are driven through the
// fetchers that apply them.
describe("mapExpense", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renames expense/value to name/amount and keeps category_id", async () => {
    fetch.mockResolvedValue(
      respond({ body: { expenses: [{ id: "1", expense: "Rent", value: 100, category_id: "c1", status: "paid" }] } })
    );
    await expect(fetchExpenses()).resolves.toEqual([
      { id: "1", name: "Rent", amount: 100, status: "paid", category_id: "c1" },
    ]);
  });

  it("defaults a missing status to unpaid", async () => {
    fetch.mockResolvedValue(respond({ body: { expenses: [{ id: "1", expense: "Rent", value: 100 }] } }));
    const [row] = await fetchExpenses();
    expect(row.status).toBe("unpaid");
  });

  it("passes an explicit status through untouched", async () => {
    fetch.mockResolvedValue(
      respond({ body: { expenses: [{ id: "1", expense: "Rent", value: 100, status: "overdue" }] } })
    );
    const [row] = await fetchExpenses();
    expect(row.status).toBe("overdue");
  });

  it("maps a bare array body", async () => {
    fetch.mockResolvedValue(respond({ body: [{ id: "1", expense: "Rent", value: 100 }] }));
    const [row] = await fetchExpenses();
    expect(row.name).toBe("Rent");
  });
});

describe("mapIncome", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renames income/value to name/amount and keeps category_id", async () => {
    fetch.mockResolvedValue(
      respond({ body: { income: [{ id: "2", income: "Salary", value: 500, category_id: "c2", status: "received" }] } })
    );
    await expect(fetchIncome()).resolves.toEqual([
      { id: "2", name: "Salary", amount: 500, status: "received", category_id: "c2" },
    ]);
  });

  it("defaults a missing status to expected", async () => {
    fetch.mockResolvedValue(respond({ body: { income: [{ id: "2", income: "Salary", value: 500 }] } }));
    const [row] = await fetchIncome();
    expect(row.status).toBe("expected");
  });

  it("passes an explicit status through untouched", async () => {
    fetch.mockResolvedValue(
      respond({ body: { income: [{ id: "2", income: "Salary", value: 500, status: "received" }] } })
    );
    const [row] = await fetchIncome();
    expect(row.status).toBe("received");
  });
});
