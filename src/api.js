const BASE = "http://localhost:8000";

export const USER_ID = "default";

const STATUS_FROM_API = {
  "Pagado": "paid",
  "No pagado": "unpaid",
  "Programado": "scheduled",
  "Verificar": "verify",
};

export const STATUS_TO_API = {
  paid: "Pagado",
  unpaid: "No pagado",
  scheduled: "Programado",
  verify: "Verificar",
};

function mapExpense(e) {
  return {
    id: e.id,
    name: e.expense,
    amount: e.value,
    status: STATUS_FROM_API[e.status] ?? "unpaid",
    section_id: e.section_id,
  };
}

export async function fetchSections() {
  const res = await fetch(`${BASE}/sections`);
  if (!res.ok) throw new Error("Failed to fetch sections");
  const data = await res.json();
  return data.sections ?? data;
}

// sectionId is optional — prep for month filter once backend adds date field
export async function fetchExpenses(sectionId) {
  const url = sectionId
    ? `${BASE}/expenses?section_id=${encodeURIComponent(sectionId)}`
    : `${BASE}/expenses`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  const data = await res.json();
  return (data.expenses ?? data).map(mapExpense);
}

export async function createSection(name) {
  const res = await fetch(`${BASE}/sections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create section");
  return res.json();
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
