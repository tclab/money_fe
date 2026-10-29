import { describe, it, expect, afterEach, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";

import { supabaseMock } from "../../test/mockSupabase.js";

vi.mock("../../supabaseClient.js", () => supabaseMock());

const { renderWithProviders } = await import("../../test/renderWithProviders.jsx");
const { installFetchMock, requestBody, callsMatching, failWith } =
  await import("../../test/mockFetch.js");
const { toMonthKey } = await import("../../lib/utils.js");
const Income = (await import("./Income.jsx")).default;

const isPutStatus = (url, init) => url.includes("/income-status") && init.method === "PUT";

function setupRoutes(statusRoute = {}) {
  return installFetchMock({
    // Method-specific so "GET /income" cannot swallow it by substring.
    "GET /categories/income": { categories: [{ id: "c1", name: "Work", position: 0 }] },
    // No status from the API: the row must default to "expected".
    "GET /income": { income: [{ id: "i1", income: "Salary", value: 3000, category_id: "c1" }] },
    "PUT /income-status": {},
    ...statusRoute,
  });
}

// The trigger renders a solid check for "received" and nothing for "expected".
const statusTrigger = () =>
  screen.getByRole("row", { name: /Salary/ }).querySelector("td:last-child button");

// StatusPicker options fire on mouseDown, not click.
function markReceived() {
  fireEvent.click(statusTrigger());
  fireEvent.mouseDown(screen.getByRole("button", { name: /Received$/ }));
}

describe("Income", () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("offers only income statuses, defaulting to expected", async () => {
    setupRoutes();
    renderWithProviders(<Income />);
    await screen.findByText("Salary");

    expect(statusTrigger()).not.toHaveTextContent("✓");
    fireEvent.click(statusTrigger());
    expect(screen.getByRole("button", { name: /Expected$/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Paid$/ })).not.toBeInTheDocument();
  });

  it("marks income received via PUT /income-status", async () => {
    const fetchMock = setupRoutes();
    renderWithProviders(<Income />);
    await screen.findByText("Salary");

    markReceived();

    await waitFor(() => expect(callsMatching(fetchMock, isPutStatus)).toHaveLength(1));
    expect(requestBody(fetchMock, isPutStatus)).toEqual({
      income_id: "i1",
      month: toMonthKey(new Date()),
      status: "received",
    });
  });

  it("rolls the optimistic status back when the write fails", async () => {
    setupRoutes({ "PUT /income-status": failWith(500) });
    renderWithProviders(<Income />);
    await screen.findByText("Salary");

    markReceived();
    expect(statusTrigger()).toHaveTextContent("✓");

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(statusTrigger()).not.toHaveTextContent("✓");
  });
});
