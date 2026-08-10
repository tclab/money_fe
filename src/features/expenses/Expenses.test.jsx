import { describe, it, expect, afterEach, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";

import { supabaseMock } from "../../test/mockSupabase.js";

vi.mock("../../supabaseClient.js", () => supabaseMock());

const { renderWithProviders } = await import("../../test/renderWithProviders.jsx");
const { installFetchMock, requestBody, callsMatching, failWith } =
  await import("../../test/mockFetch.js");
const { toMonthKey } = await import("../../lib/utils.js");
const Expenses = (await import("./Expenses.jsx")).default;

const isPutStatus = (url, init) => url.includes("/expense-status") && init.method === "PUT";

function setupRoutes(statusRoute = {}) {
  return installFetchMock({
    "/categories/expense": { categories: [{ id: "c1", name: "Housing", position: 0 }] },
    "GET /expenses": { expenses: [{ id: "e1", expense: "Rent", value: 1000, category_id: "c1" }] },
    "PUT /expense-status": {},
    ...statusRoute,
  });
}

// The trigger renders a solid check for "paid" and nothing for "unpaid", so its
// text is the visible status.
const statusTrigger = () =>
  screen.getByRole("row", { name: /Rent/ }).querySelector("td:last-child button");

// Status lives in StatusPicker, a custom dropdown rather than a <select>: click
// the trigger, then the option, which fires on mouseDown and not click.
function markPaid() {
  fireEvent.click(statusTrigger());
  // The option label carries the status glyph, so match on the text, not equality.
  fireEvent.mouseDown(screen.getByRole("button", { name: /Paid$/ }));
}

describe("Expenses", () => {
  afterEach(() => {
    // renderWithProviders writes app-language; clear it so it cannot leak.
    localStorage.clear();
    vi.clearAllMocks();
  });

  // viewDate defaults to today, so isPastMonth is structurally false and the
  // picker always renders; a past month would make the row read-only.
  it("marks an expense paid via PUT /expense-status", async () => {
    const fetchMock = setupRoutes();
    renderWithProviders(<Expenses />);
    await screen.findByText("Rent");

    markPaid();

    await waitFor(() => expect(callsMatching(fetchMock, isPutStatus)).toHaveLength(1));
    expect(requestBody(fetchMock, isPutStatus)).toEqual({
      expense_id: "e1",
      month: toMonthKey(new Date()),
      status: "paid",
    });
  });

  it("rolls the optimistic status back when the write fails", async () => {
    setupRoutes({ "PUT /expense-status": failWith(500) });
    renderWithProviders(<Expenses />);
    await screen.findByText("Rent");

    expect(statusTrigger()).not.toHaveTextContent("✓");
    markPaid();
    // The optimistic update lands first, so the check must appear before it goes.
    expect(statusTrigger()).toHaveTextContent("✓");

    // Then the failure rolls it back to "unpaid", which renders no check glyph.
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(statusTrigger()).not.toHaveTextContent("✓");
  });
});
