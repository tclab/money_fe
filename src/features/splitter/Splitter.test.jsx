import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, waitFor, fireEvent, within } from "@testing-library/react";

import { supabaseMock } from "../../test/mockSupabase.js";

vi.mock("../../supabaseClient.js", () => supabaseMock());

const { renderWithProviders } = await import("../../test/renderWithProviders.jsx");
const { installFetchMock, requestBody, callsMatching, failWith } = await import("../../test/mockFetch.js");
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

const isCopy = (url, init) => url.includes("/splitter/items/copy");
const copyBodies = (fetchMock) =>
  callsMatching(fetchMock, isCopy).map(([, init]) => JSON.parse(init.body));
const isListItems = (url, init) =>
  url.includes("/splitter/items") && !url.includes("/copy") && (init.method ?? "GET") === "GET";

const COUNTS = { to_copy: 4, skipped_matching: 2, skipped_orphan: 1, created: 0 };

// The shared picker labels months in es-ES short form, uppercased.
const monthButton = (m) =>
  screen.getByRole("button", {
    name: new Intl.DateTimeFormat("es-ES", { month: "short" }).format(new Date(2000, m, 1)).toUpperCase(),
  });

// Modal renders no dialog role, so scope to it through its heading.
const copyModal = () => within(screen.getByRole("heading", { name: "Copy from month" }).parentElement);

async function openCopyModal() {
  renderWithProviders(<Splitter />);
  fireEvent.click(await screen.findByRole("button", { name: "Copy from month" }));
  return copyModal();
}

describe("Splitter month copy", () => {
  beforeEach(() => {
    // Fake only Date: the board opens on October 2026, promises stay real.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("previews a copy from the previous month into the viewed month", async () => {
    const fetchMock = setupRoutes({ "POST /splitter/items/copy": COUNTS });
    const modal = await openCopyModal();

    await waitFor(() =>
      expect(copyBodies(fetchMock)).toEqual([
        { source_month: "2026-09", target_month: "2026-10", dry_run: true },
      ])
    );
    expect(await modal.findByText("Items to copy")).toBeInTheDocument();
    expect(modal.getByText("4")).toBeInTheDocument();
    expect(modal.getByText("2")).toBeInTheDocument();
    expect(modal.getByText("1")).toBeInTheDocument();
    expect(modal.getByRole("button", { name: "Copy" })).toBeEnabled();
  });

  it("re-runs the preview when another source month is picked", async () => {
    const fetchMock = setupRoutes({ "POST /splitter/items/copy": COUNTS });
    await openCopyModal();
    await waitFor(() => expect(copyBodies(fetchMock)).toHaveLength(1));

    fireEvent.click(monthButton(6));

    await waitFor(() => expect(copyBodies(fetchMock)).toHaveLength(2));
    expect(copyBodies(fetchMock)[1]).toEqual({
      source_month: "2026-07", target_month: "2026-10", dry_run: true,
    });
  });

  it("disables Copy when the preview has nothing to copy", async () => {
    setupRoutes({ "POST /splitter/items/copy": { ...COUNTS, to_copy: 0 } });
    const modal = await openCopyModal();

    await modal.findByText("Items to copy");
    expect(modal.getByRole("button", { name: "Copy" })).toBeDisabled();
  });

  it("refuses the viewed month as its own source without asking the server", async () => {
    const fetchMock = setupRoutes({ "POST /splitter/items/copy": COUNTS });
    const modal = await openCopyModal();
    await waitFor(() => expect(copyBodies(fetchMock)).toHaveLength(1));

    fireEvent.click(monthButton(9));

    expect(await modal.findByText(/Pick a month other than/)).toBeInTheDocument();
    expect(modal.getByRole("button", { name: "Copy" })).toBeDisabled();
    expect(copyBodies(fetchMock)).toHaveLength(1);
  });

  it("copies, closes the modal and refetches the viewed month", async () => {
    const fetchMock = setupRoutes({ "POST /splitter/items/copy": COUNTS });
    const modal = await openCopyModal();
    await modal.findByText("Items to copy");
    const listsBefore = callsMatching(fetchMock, isListItems).length;

    fireEvent.click(modal.getByRole("button", { name: "Copy" }));

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Copy from month" })).not.toBeInTheDocument()
    );
    expect(copyBodies(fetchMock).at(-1)).toEqual({
      source_month: "2026-09", target_month: "2026-10", dry_run: false,
    });
    const lists = callsMatching(fetchMock, isListItems);
    expect(lists).toHaveLength(listsBefore + 1);
    expect(String(lists.at(-1)[0])).toContain("month=2026-10");
  });

  it("shows a failed copy inline and keeps the modal open", async () => {
    setupRoutes({ "POST /splitter/items/copy": COUNTS });
    const modal = await openCopyModal();
    await modal.findByText("Items to copy");

    installFetchMock({
      "/splitter/items": { items: [] },
      "/people": { people: [] },
      "POST /splitter/items/copy": failWith(502, "UPSTREAM"),
    });
    fireEvent.click(modal.getByRole("button", { name: "Copy" }));

    expect(await modal.findByRole("alert")).toHaveTextContent("We couldn't reach the server");
    expect(screen.getByRole("heading", { name: "Copy from month" })).toBeInTheDocument();
  });
});
