import { describe, it, expect, afterEach, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";

import { supabaseMock } from "../../test/mockSupabase.js";

vi.mock("../../supabaseClient.js", () => supabaseMock());

const { renderWithProviders } = await import("../../test/renderWithProviders.jsx");
const { installFetchMock, requestBody, callsMatching, failWith } =
  await import("../../test/mockFetch.js");
const DebtKiller = (await import("./DebtKiller.jsx")).default;

const isPostDebt = (url, init) => url.includes("/debts") && init.method === "POST";

function setupRoutes(overrides = {}) {
  return installFetchMock({
    "/people": { people: [{ id: "p1", name: "Ana" }] },
    "GET /debts": { debts: [] },
    "POST /debts": { id: "d1" },
    ...overrides,
  });
}

async function openForm() {
  renderWithProviders(<DebtKiller />);
  fireEvent.click(await screen.findByRole("button", { name: /New Debt/ }));
  await screen.findByPlaceholderText("Description");
}

describe("DebtKiller", () => {
  afterEach(() => {
    // renderWithProviders writes app-language; clear it so it cannot leak.
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("posts a debt once all required fields are filled", async () => {
    const fetchMock = setupRoutes();
    await openForm();

    fireEvent.change(screen.getByPlaceholderText("Description"), { target: { value: "Loan" } });
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "500" } });
    const [typeSelect, personSelect] = screen.getAllByRole("combobox").slice(-2);
    fireEvent.change(typeSelect, { target: { value: "owed_to_me" } });
    fireEvent.change(personSelect, { target: { value: "p1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(callsMatching(fetchMock, isPostDebt)).toHaveLength(1));
    // createDebt omits due_date entirely when it is empty, and defaults status.
    expect(requestBody(fetchMock, isPostDebt)).toEqual({
      description: "Loan",
      amount: 500,
      type: "owed_to_me",
      status: "pending",
      person_id: "p1",
    });
  });

  it("blocks the write and flags every empty required field", async () => {
    const fetchMock = setupRoutes();
    await openForm();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // description, amount and person_id all fail client validation.
    expect(await screen.findAllByText("This field is required.")).toHaveLength(3);
    expect(callsMatching(fetchMock, isPostDebt)).toHaveLength(0);
  });

  it("requires a name for a brand-new person, then creates them before the debt", async () => {
    const fetchMock = setupRoutes({ "POST /people": { id: "p2", name: "Beto" } });
    await openForm();

    fireEvent.change(screen.getByPlaceholderText("Description"), { target: { value: "Loan" } });
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "500" } });
    fireEvent.change(screen.getAllByRole("combobox").slice(-1)[0], { target: { value: "__new__" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // newPersonName is required only on the __new__ branch.
    expect(await screen.findByText("This field is required.")).toBeInTheDocument();
    expect(callsMatching(fetchMock, isPostDebt)).toHaveLength(0);

    fireEvent.change(screen.getByPlaceholderText(/Name/i), { target: { value: "Beto" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(callsMatching(fetchMock, isPostDebt)).toHaveLength(1));
    expect(requestBody(fetchMock, isPostDebt).person_id).toBe("p2");
  });

  // Deliberate per MON-RDS-009: the form stays open until the write lands, so a
  // failure leaves the typed input recoverable.
  it("keeps the form and its input when the write fails", async () => {
    setupRoutes({ "POST /debts": failWith(500) });
    await openForm();

    fireEvent.change(screen.getByPlaceholderText("Description"), { target: { value: "Loan" } });
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "500" } });
    fireEvent.change(screen.getAllByRole("combobox").slice(-1)[0], { target: { value: "p1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByPlaceholderText("Description")).toHaveValue("Loan");
  });
});
