const BASE = "http://localhost:8000";

export const USER_ID = "default";

function mapExpense(e) {
  return {
    id: e.id,
    name: e.expense,
    amount: e.value,
    status: e.status ?? "unpaid",
    category_id: e.category_id,
  };
}

export async function fetchCategories() {
  const res = await fetch(`${BASE}/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  const data = await res.json();
  return data.categories ?? data;
}

// categoryId is optional — prep for month filter once backend adds date field
export async function fetchExpenses(categoryId) {
  const url = categoryId
    ? `${BASE}/expenses?category_id=${encodeURIComponent(categoryId)}`
    : `${BASE}/expenses`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  const data = await res.json();
  return (data.expenses ?? data).map(mapExpense);
}

export async function createCategory(name) {
  const res = await fetch(`${BASE}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create category");
  return res.json();
}

export async function createExpense(categoryId, name, amount) {
  const res = await fetch(`${BASE}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category_id: categoryId, expense: name, value: amount, status: "unpaid", user_id: "00000000-0000-0000-0000-000000000000" }),
  });
  if (!res.ok) throw new Error("Failed to create expense");
  return mapExpense(await res.json());
}

export async function deleteExpense(id) {
  const res = await fetch(`${BASE}/expenses/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete expense");
}

export async function deleteCategory(id) {
  const res = await fetch(`${BASE}/categories/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete category");
}

export async function updateExpense(id, patch) {
  const body = {};
  if (patch.expense !== undefined) body.expense = patch.expense;
  if (patch.value !== undefined) body.value = patch.value;
  if (patch.status !== undefined) body.status = patch.status;

  const res = await fetch(`${BASE}/expenses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update expense");
  return mapExpense(await res.json());
}

// ─── SPLITTER ─────────────────────────────────────────────────────────────────

export async function fetchSplitters(month) {
  const url = `${BASE}/splitter/items?user_id=${USER_ID}&month=${encodeURIComponent(month)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch splitters");
  const data = await res.json();
  return data.splitters ?? [];
}

export async function createSplitter(month, type, label, value, position = 0, person_id = null) {
  const body = { user_id: USER_ID, month, type, label, value, position };
  if (person_id) body.person_id = person_id;
  const res = await fetch(`${BASE}/splitter/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create splitter");
  return res.json();
}

export async function updateSplitter(id, patch) {
  const res = await fetch(`${BASE}/splitter/items/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update splitter");
  return res.json();
}

export async function deleteSplitter(id) {
  const res = await fetch(`${BASE}/splitter/items/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete splitter");
}

// ─── SPLITTER PEOPLE ──────────────────────────────────────────────────────────

export async function fetchSplitterPeople() {
  const url = `${BASE}/splitter/people?user_id=${USER_ID}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch splitter people");
  const data = await res.json();
  return data.people ?? [];
}

export async function createSplitterPerson(name, color, share, position = 0) {
  const res = await fetch(`${BASE}/splitter/people`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: USER_ID, name, color, share, position }),
  });
  if (!res.ok) throw new Error("Failed to create splitter person");
  return res.json();
}

export async function updateSplitterPerson(id, patch) {
  const res = await fetch(`${BASE}/splitter/people/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update splitter person");
  return res.json();
}

export async function deleteSplitterPerson(id) {
  const res = await fetch(`${BASE}/splitter/people/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete splitter person");
}
