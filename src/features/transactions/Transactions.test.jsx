import { describe, it, expect, afterEach, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";

import { supabaseMock } from "../../test/mockSupabase.js";

vi.mock("../../supabaseClient.js", () => supabaseMock());

const { renderWithProviders } = await import("../../test/renderWithProviders.jsx");
const { installFetchMock, requestBody, callsMatching } = await import("../../test/mockFetch.js");
const Transactions = (await import("./Transactions.jsx")).default;

const isPostTx = (url, init) => url.includes("/transactions") && init.method === "POST";

function setupRoutes(overrides = {}) {
  return installFetchMock({
    "/categories/transaction": { categories: [{ id: "c1", name: "Groceries" }] },
    "GET /transactions": { transactions: [] },
    "POST /transactions": {
      id: "t1", date: "2026-08-09", amount: 250, category_id: "c1", note: null, method: null,
    },
    ...overrides,
  });
}

// The mount effect resolves two fetches; wait for the category to land in the
// select before interacting, else selectOptions has nothing to pick.
async function renderReady() {
  renderWithProviders(<Transactions />);
  await screen.findByRole("option", { name: "Groceries" });
}

describe("Transactions", () => {
  afterEach(() => {
    // renderWithProviders writes app-language; clear it so it cannot leak.
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("posts a transaction with the drafted amount, date and category", async () => {
    const fetchMock = setupRoutes();
    await renderReady();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "c1" } });
    fireEvent.change(screen.getByPlaceholderText("Amount"), { target: { value: "250" } });
    fireEvent.change(screen.getByPlaceholderText("Note"), { target: { value: "milk" } });
    fireEvent.click(screen.getByRole("button", { name: /Add/ }));

    await waitFor(() => expect(callsMatching(fetchMock, isPostTx)).toHaveLength(1));
    expect(requestBody(fetchMock, isPostTx)).toEqual({
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      amount: 250,
      category_id: "c1",
      note: "milk",
      method: null,
    });
  });

  // The Add button is disabled without an amount, so handleAdd is driven via the
  // note field's Enter handler. Asserting both halves proves the Enter path
  // really reaches handleAdd, so the zero-call case cannot pass vacuously.
  it("returns early on a falsy amount, but fires once an amount is set", async () => {
    const fetchMock = setupRoutes();
    await renderReady();

    const note = screen.getByPlaceholderText("Note");
    fireEvent.change(note, { target: { value: "no amount" } });
    fireEvent.keyDown(note, { key: "Enter" });
    expect(callsMatching(fetchMock, isPostTx)).toHaveLength(0);

    fireEvent.change(screen.getByPlaceholderText("Amount"), { target: { value: "10" } });
    fireEvent.keyDown(note, { key: "Enter" });
    await waitFor(() => expect(callsMatching(fetchMock, isPostTx)).toHaveLength(1));
  });

  // Deliberate, for fast repeated entry: date + category survive, amount + note clear.
  it("keeps date and category but clears amount and note after a successful add", async () => {
    const fetchMock = setupRoutes();
    await renderReady();

    const select = screen.getByRole("combobox");
    const date = screen.getByDisplayValue(/^\d{4}-\d{2}-\d{2}$/);
    fireEvent.change(select, { target: { value: "c1" } });
    fireEvent.change(date, { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByPlaceholderText("Amount"), { target: { value: "250" } });
    fireEvent.change(screen.getByPlaceholderText("Note"), { target: { value: "milk" } });
    fireEvent.click(screen.getByRole("button", { name: /Add/ }));

    await waitFor(() => expect(callsMatching(fetchMock, isPostTx)).toHaveLength(1));
    await waitFor(() => expect(screen.getByPlaceholderText("Amount")).toHaveValue(""));
    expect(screen.getByPlaceholderText("Note")).toHaveValue("");
    expect(select).toHaveValue("c1");
    expect(date).toHaveValue("2026-08-01");
  });
});
