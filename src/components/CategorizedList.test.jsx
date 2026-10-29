import { describe, it, expect, afterEach, vi } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders.jsx";
import CategorizedList from "./CategorizedList.jsx";

const categories = [
  { id: "c1", name: "Housing" },
  { id: "c2", name: "Food" },
];
const items = [
  { id: "i1", name: "Rent", amount: 1000, status: "done", category_id: "c1" },
  { id: "i2", name: "Water", amount: 50, status: "todo", category_id: "c1" },
  { id: "i3", name: "Groceries", amount: 200, status: "todo", category_id: "c2" },
  { id: "i4", name: "Stray", amount: 5, status: "todo", category_id: "gone" },
];

function renderList(props = {}) {
  const handlers = {
    onStatusChange: vi.fn(), onItemClick: vi.fn(), onItemDelete: vi.fn(), onItemsReorder: vi.fn(),
    onAddItem: vi.fn(), onRenameCategory: vi.fn(), onMoveCategory: vi.fn(), onDeleteCategory: vi.fn(),
  };
  renderWithProviders(
    <CategorizedList
      categories={categories} items={items} nameLabel="Thing"
      statusOptions={["paid", "unpaid"]} doneStatus="paid"
      {...handlers} {...props}
    />
  );
  return handlers;
}

const row = (name) => screen.getByRole("row", { name: new RegExp(name) });

describe("CategorizedList", () => {
  afterEach(() => localStorage.clear());

  it("groups items under their category and orphans into Uncategorized", () => {
    renderList();
    expect(row("Housing")).toHaveTextContent("2 items");
    expect(row("Food")).toHaveTextContent("1 items");
    expect(row("Uncategorized")).toHaveTextContent("1 items");
    expect(screen.getByText("Stray")).toBeInTheDocument();
  });

  it("collapses and re-expands a section", () => {
    renderList();
    const toggle = within(row("Housing")).getAllByRole("button")[0];
    fireEvent.click(toggle);
    expect(screen.queryByText("Rent")).not.toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByText("Rent")).toBeInTheDocument();
  });

  it("offers only the given status options and reports the pick", () => {
    const h = renderList();
    fireEvent.click(row("Water").querySelector("td:last-child button"));
    expect(screen.queryByRole("button", { name: /Scheduled$/ })).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("button", { name: /Paid$/ }));
    expect(h.onStatusChange).toHaveBeenCalledWith("i2", "paid");
  });

  it("reports row click and row delete with the item", () => {
    const h = renderList();
    fireEvent.click(screen.getByText("Groceries"));
    expect(h.onItemClick).toHaveBeenCalledWith(items[2]);
    fireEvent.click(within(row("Stray")).getByRole("button", { name: "Delete" }));
    expect(h.onItemDelete).toHaveBeenCalledWith(items[3]);
    expect(h.onItemClick).toHaveBeenCalledTimes(1);
  });

  it("wires category actions with the category and its bounds", () => {
    const h = renderList();
    fireEvent.click(within(row("Food")).getAllByRole("button").at(-1));
    expect(screen.getByRole("button", { name: /Move down/ })).toBeDisabled();
    fireEvent.mouseDown(screen.getByRole("button", { name: /Move up/ })); // menu fires on mouseDown
    expect(h.onMoveCategory).toHaveBeenCalledWith("c2", -1);
  });

  it("is read-only: no actions, no delete, no edit on click", () => {
    const h = renderList({ readOnly: true });
    expect(within(row("Housing")).getAllByRole("button")).toHaveLength(1); // collapse only
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Rent"));
    expect(h.onItemClick).not.toHaveBeenCalled();
  });

  it("reorders within a section via keyboard drag", async () => {
    const h = renderList();
    const handle = row("Rent").querySelector("[data-rfd-drag-handle-draggable-id]");
    handle.focus();
    fireEvent.keyDown(handle, { key: " ", code: "Space", keyCode: 32 });
    fireEvent.keyDown(handle, { key: "ArrowDown", code: "ArrowDown", keyCode: 40 });
    fireEvent.keyDown(handle, { key: " ", code: "Space", keyCode: 32 });
    await vi.waitFor(() => expect(h.onItemsReorder).toHaveBeenCalled());
    expect(h.onItemsReorder).toHaveBeenCalledWith("c1", [
      { ...items[1], position: 0 },
      { ...items[0], position: 1 },
    ]);
  });
});
