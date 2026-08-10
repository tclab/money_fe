import { describe, it, expect, afterEach, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";

import { supabaseMock } from "../../test/mockSupabase.js";

vi.mock("../../supabaseClient.js", () => supabaseMock());

const { renderWithProviders } = await import("../../test/renderWithProviders.jsx");
const { installFetchMock, requestBody, callsMatching } = await import("../../test/mockFetch.js");
const Splitter = (await import("./Splitter.jsx")).default;

const isPostItem = (url, init) => url.includes("/splitter/items") && init.method === "POST";

// Mount fires fetchSplitters plus two fetchPeople calls in parallel, so the mock
// answers by URL rather than with one blanket resolve.
function setupRoutes(overrides = {}) {
  return installFetchMock({
    "/splitter/items": { items: [] },
    "/people": { people: [{ id: "p1", name: "Ana", color: "#94a3b8", share: 50 }] },
    "POST /splitter/items": { id: "s1", type: "income", label: "Salary", value: 100, position: 0 },
    ...overrides,
  });
}

// Each section card renders its own "Add" button; income is the first.
async function openIncomeModal() {
  renderWithProviders(<Splitter />);
  const addButtons = await screen.findAllByRole("button", { name: /Add/ });
  fireEvent.click(addButtons[0]);
  await screen.findByRole("button", { name: "Save" });
}

// Modal renders no dialog role, so scope to it through its heading.
const conceptInput = () =>
  screen.getByRole("heading", { name: "Income" }).parentElement.querySelector('input[type="text"]');

describe("Splitter", () => {
  afterEach(() => {
    // renderWithProviders writes app-language; clear it so it cannot leak.
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("posts a splitter row with month, type, label, value and position", async () => {
    const fetchMock = setupRoutes();
    await openIncomeModal();

    // The modal labels are not associated with their inputs, so query positionally:
    // concept first, then the AmountInput carrying the "0" placeholder.
    fireEvent.change(conceptInput(), { target: { value: "Salary" } });
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(callsMatching(fetchMock, isPostItem)).toHaveLength(1));
    expect(requestBody(fetchMock, isPostItem)).toEqual({
      month: expect.stringMatching(/^\d{4}-\d{2}$/),
      type: "income",
      label: "Salary",
      value: 100,
      position: 0,
    });
  });

  it("falls back to the default label when the concept is left blank", async () => {
    const fetchMock = setupRoutes();
    await openIncomeModal();

    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(callsMatching(fetchMock, isPostItem)).toHaveLength(1));
    expect(requestBody(fetchMock, isPostItem).label).toBe("New");
  });
});
