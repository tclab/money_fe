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
        .mutate((rows) => rows.filter((r) => r.id !== 1), () => Promise.reject(failure))
        .catch((e) => { caught = e; });
    });
    expect(caught).toBe(failure);
    expect(result.current.rows).toEqual([{ id: 1 }, { id: 2 }]);
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
