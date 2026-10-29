import { renderHook, waitFor, act } from "@testing-library/react";
import { useResource } from "./useResource";
import { ApiError } from "./apiError";

describe("useResource", () => {
  it("loads rows on mount", async () => {
    const { result } = renderHook(() => useResource(() => Promise.resolve([{ id: 1 }])));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows).toEqual([{ id: 1 }]);
    expect(result.current.error).toBe(null);
  });

  it("exposes the error key when the load fails", async () => {
    const fetcher = () => Promise.reject(new ApiError({ code: "NOT_FOUND" }));
    const { result } = renderHook(() => useResource(fetcher));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("error.notFound");
  });

  it("applies a mutation before the save resolves", async () => {
    const { result } = renderHook(() => useResource(() => Promise.resolve([{ id: 1, status: "unpaid" }])));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let finishSave;
    const save = () => new Promise((resolve) => { finishSave = resolve; });
    let done;
    act(() => {
      done = result.current.mutate((rows) => rows.map((r) => ({ ...r, status: "paid" })), save);
    });
    expect(result.current.rows).toEqual([{ id: 1, status: "paid" }]);
    await act(async () => { finishSave(); await done; });
    expect(result.current.rows).toEqual([{ id: 1, status: "paid" }]);
  });

  it("rolls back and rethrows when the save fails", async () => {
    const { result } = renderHook(() => useResource(() => Promise.resolve([{ id: 1 }, { id: 2 }])));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const failure = new ApiError({ code: "INTERNAL" });
    let caught;
    await act(async () => {
      await result.current
        .mutate(
          (rows) => rows.filter((r) => r.id !== 1),
          () => Promise.reject(failure),
          (rows) => [{ id: 1 }, ...rows],
        )
        .catch((e) => { caught = e; });
    });
    expect(caught).toBe(failure);
    expect(result.current.rows).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("undoes only the failed patch, keeping an overlapping one", async () => {
    const { result } = renderHook(() => useResource(() => Promise.resolve([
      { id: 1, status: "unpaid", name: "a" }, { id: 2, status: "unpaid", name: "b" },
    ])));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let failFirst;
    let first;
    act(() => {
      first = result.current
        .patch(1, { status: "paid" }, () => new Promise((_, reject) => { failFirst = reject; }))
        .catch(() => {});
    });
    await act(async () => {
      await result.current.patch(1, { name: "a2" }, () => Promise.resolve());
      await result.current.patch(2, { status: "paid" }, () => Promise.resolve());
    });
    await act(async () => { failFirst(new Error("boom")); await first; });
    expect(result.current.rows).toEqual([
      { id: 1, status: "unpaid", name: "a2" }, { id: 2, status: "paid", name: "b" },
    ]);
  });

  it("keeps the optimistic change on failure when no undo is given", async () => {
    const { result } = renderHook(() => useResource(() => Promise.resolve([{ id: 1 }, { id: 2 }])));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current
        .mutate((rows) => rows.filter((r) => r.id !== 1), () => Promise.reject(new Error("x")))
        .catch(() => {});
    });
    expect(result.current.rows).toEqual([{ id: 2 }]);
  });

  it("refetches when deps change and ignores the stale response", async () => {
    const pending = {};
    const fetcherFor = (month) => () => new Promise((resolve) => { pending[month] = resolve; });
    const { result, rerender } = renderHook(
      ({ month }) => useResource(fetcherFor(month), [month]),
      { initialProps: { month: "2026-09" } },
    );
    rerender({ month: "2026-10" });
    await act(async () => { pending["2026-10"]([{ id: "oct" }]); });
    await act(async () => { pending["2026-09"]([{ id: "sep" }]); });
    expect(result.current.rows).toEqual([{ id: "oct" }]);
    expect(result.current.loading).toBe(false);
  });
});
