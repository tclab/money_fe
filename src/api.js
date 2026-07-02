import { supabase } from "./supabaseClient.js";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function mapExpense(e) {
  return {
    id: e.id,
    name: e.expense,
    amount: e.value,
    status: e.status ?? "unpaid",
    category_id: e.category_id,
  };
}

function mapIncome(e) {
  return {
    id: e.id,
    name: e.income,
    amount: e.value,
    status: e.status ?? "expected",
    category_id: e.category_id,
  };
}

// Centralized fetch: attaches the Supabase access token to every request and
// signs the user out on a 401 so the app falls back to the login screen.
async function authFetch(path, { method = "GET", body, headers } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const finalHeaders = { ...(headers || {}) };
  if (session?.access_token) {
    finalHeaders.Authorization = `Bearer ${session.access_token}`;
  }
  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: finalHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 401) {
    await supabase.auth.signOut();
    throw new Error("Unauthorized");
  }
  return res;
}

// ─── CATEGORIES & EXPENSES ──────────────────────────────────────────────────

export async function fetchCategories(kind, includeDeleted = false) {
  const params = new URLSearchParams();
  if (includeDeleted) params.set("include_deleted", "true");
  const res = await authFetch(`/categories/${kind}${params.size ? "?" + params : ""}`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  const data = await res.json();
  return data.categories ?? data;
}

export async function fetchExpenses(categoryId, month) {
  const params = new URLSearchParams();
  if (categoryId) params.set("category_id", categoryId);
  if (month) params.set("month", month);
  const res = await authFetch(`/expenses${params.size ? "?" + params : ""}`);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  const data = await res.json();
  return (data.expenses ?? data).map(mapExpense);
}

export async function upsertExpenseStatus(expenseId, month, { status, value } = {}) {
  const body = { expense_id: expenseId, month };
  if (status !== undefined) body.status = status;
  if (value !== undefined) body.value = value;
  const res = await authFetch("/expense-status", { method: "PUT", body });
  if (!res.ok) throw new Error("Failed to update expense status");
  return res.json();
}

export async function createCategory(kind, name) {
  const res = await authFetch(`/categories/${kind}`, { method: "POST", body: { name } });
  if (!res.ok) throw new Error("Failed to create category");
  return res.json();
}

export async function createExpense(categoryId, name, amount) {
  const res = await authFetch("/expenses", {
    method: "POST",
    body: { category_id: categoryId, expense: name, value: amount },
  });
  if (!res.ok) throw new Error("Failed to create expense");
  return mapExpense(await res.json());
}

export async function deleteExpense(id) {
  const res = await authFetch(`/expenses/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete expense");
}

export async function reorderExpenses(items) {
  const res = await authFetch("/expenses/reorder", { method: "PUT", body: { items } });
  if (!res.ok) throw new Error("Failed to reorder expenses");
}

export async function deleteCategory(kind, id) {
  const res = await authFetch(`/categories/${kind}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete category");
}

export async function reorderCategories(kind, items) {
  const res = await authFetch(`/categories/${kind}/reorder`, { method: "PUT", body: { items } });
  if (!res.ok) throw new Error("Failed to reorder categories");
}

export async function updateCategory(kind, id, name) {
  const res = await authFetch(`/categories/${kind}/${id}`, { method: "PUT", body: { name } });
  if (!res.ok) throw new Error("Failed to update category");
  return res.json();
}

export async function updateExpense(id, patch) {
  const body = {};
  if (patch.expense !== undefined) body.expense = patch.expense;
  if (patch.value !== undefined) body.value = patch.value;
  if (patch.status !== undefined) body.status = patch.status;
  const res = await authFetch(`/expenses/${id}`, { method: "PUT", body });
  if (!res.ok) throw new Error("Failed to update expense");
  return mapExpense(await res.json());
}

// ─── INCOME ─────────────────────────────────────────────────────────────────

export async function fetchIncome(categoryId, month) {
  const params = new URLSearchParams();
  if (categoryId) params.set("category_id", categoryId);
  if (month) params.set("month", month);
  const res = await authFetch(`/income${params.size ? "?" + params : ""}`);
  if (!res.ok) throw new Error("Failed to fetch income");
  const data = await res.json();
  return (data.income ?? data).map(mapIncome);
}

export async function createIncome(categoryId, name, amount) {
  const res = await authFetch("/income", {
    method: "POST",
    body: { category_id: categoryId, income: name, value: amount },
  });
  if (!res.ok) throw new Error("Failed to create income");
  return mapIncome(await res.json());
}

export async function updateIncome(id, patch) {
  const body = {};
  if (patch.income !== undefined) body.income = patch.income;
  if (patch.value !== undefined) body.value = patch.value;
  if (patch.status !== undefined) body.status = patch.status;
  const res = await authFetch(`/income/${id}`, { method: "PUT", body });
  if (!res.ok) throw new Error("Failed to update income");
  return mapIncome(await res.json());
}

export async function deleteIncome(id) {
  const res = await authFetch(`/income/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete income");
}

export async function reorderIncome(items) {
  const res = await authFetch("/income/reorder", { method: "PUT", body: { items } });
  if (!res.ok) throw new Error("Failed to reorder income");
}

export async function upsertIncomeStatus(incomeId, month, { status, value } = {}) {
  const body = { income_id: incomeId, month };
  if (status !== undefined) body.status = status;
  if (value !== undefined) body.value = value;
  const res = await authFetch("/income-status", { method: "PUT", body });
  if (!res.ok) throw new Error("Failed to update income status");
  return res.json();
}

// ─── SPLITTER ─────────────────────────────────────────────────────────────────

export async function fetchSplitters(month) {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  const res = await authFetch(`/splitter/items${params.size ? "?" + params : ""}`);
  if (!res.ok) throw new Error("Failed to fetch splitters");
  const data = await res.json();
  return data.splitters ?? [];
}

export async function createSplitter(type, label, value, position = 0, person_id = null, month) {
  const body = { month, type, label, value, position };
  if (person_id) body.person_id = person_id;
  const res = await authFetch("/splitter/items", { method: "POST", body });
  if (!res.ok) throw new Error("Failed to create splitter");
  return res.json();
}

export async function updateSplitter(id, patch) {
  const res = await authFetch(`/splitter/items/${id}`, { method: "PUT", body: patch });
  if (!res.ok) throw new Error("Failed to update splitter");
  return res.json();
}

export async function deleteSplitter(id) {
  const res = await authFetch(`/splitter/items/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete splitter");
}

// ─── PEOPLE ───────────────────────────────────────────────────────────────────

export async function fetchPeople(feature = null) {
  let path = "/people";
  if (feature) {
    const params = new URLSearchParams();
    params.set("feature", feature);
    params.set("check_features", feature);
    path += `?${params}`;
  }
  const res = await authFetch(path);
  if (!res.ok) throw new Error("Failed to fetch people");
  const data = await res.json();
  return data.people ?? [];
}

export async function createPerson(name, color, share, position = 0) {
  const res = await authFetch("/people", {
    method: "POST",
    body: { name, color, share, position },
  });
  if (!res.ok) throw new Error("Failed to create person");
  return res.json();
}

export async function updatePerson(id, patch) {
  const res = await authFetch(`/people/${id}`, { method: "PUT", body: patch });
  if (!res.ok) throw new Error("Failed to update person");
  return res.json();
}

export async function deletePerson(id) {
  const res = await authFetch(`/people/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete person");
}

export async function addPersonToFeature(personId, feature) {
  const res = await authFetch(`/people/${personId}/features/${feature}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to associate person");
}

export async function removePersonFromFeature(personId, feature) {
  const res = await authFetch(`/people/${personId}/features/${feature}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to disassociate person");
}

// ─── DEBT ─────────────────────────────────────────────────────────────────────

export async function fetchDebts({ personId, archived } = {}) {
  const params = new URLSearchParams();
  if (personId) params.set("person_id", personId);
  if (archived !== undefined) params.set("archived", archived);
  const qs = params.toString();
  const path = qs ? `/debts?${qs}` : "/debts";
  const res = await authFetch(path);
  if (!res.ok) throw new Error("Failed to fetch debts");
  const data = await res.json();
  return data.debts ?? data;
}

export async function createDebtPayment(debtId, { amount, date, note }) {
  const body = { amount, date };
  if (note) body.note = note;
  const res = await authFetch(`/debts/${debtId}/payments`, { method: "POST", body });
  if (!res.ok) throw new Error("Failed to create payment");
  return res.json();
}

export async function distributePayment({ type, amount, date, note, person_id }) {
  const body = { type, amount, date, ...(note ? { note } : {}), ...(person_id ? { person_id } : {}) };
  const res = await authFetch("/debts/distribute", { method: "POST", body });
  if (!res.ok) throw new Error("Failed to distribute payment");
  return res.json();
}

export async function deleteDebt(debtId) {
  const res = await authFetch(`/debts/${debtId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete debt");
}

export async function updateDebt(debtId, patch) {
  const res = await authFetch(`/debts/${debtId}`, { method: "PUT", body: patch });
  if (!res.ok) throw new Error("Failed to update debt");
  return res.json();
}

export async function deleteDebtPayment(debtId, paymentId) {
  const res = await authFetch(`/debts/${debtId}/payments/${paymentId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete payment");
}

export async function createDebt({ description, amount, type, status = "pending", person_id = null, due_date = null }) {
  const body = { description, amount, type, status };
  if (person_id) body.person_id = person_id;
  if (due_date) body.due_date = due_date;
  const res = await authFetch("/debts", { method: "POST", body });
  if (!res.ok) throw new Error("Failed to create debt");
  return res.json();
}
