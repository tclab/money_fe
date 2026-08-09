import { supabase } from "./supabaseClient.js";
import { ApiError, apiErrorFromResponse } from "./lib/apiError.js";

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

// Centralized fetch: attaches the Supabase access token to every request, signs
// the user out on a 401 so the app falls back to the login screen, and THROWS an
// ApiError on any non-ok response. Callers never check `res.ok`; they either get
// a successful Response or an ApiError to surface as a toast.
async function authFetch(path, { method = "GET", body, headers } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const finalHeaders = { ...(headers || {}) };
  if (session?.access_token) {
    finalHeaders.Authorization = `Bearer ${session.access_token}`;
  }
  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: finalHeaders,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (cause) {
    // fetch itself rejected: offline, DNS, CORS, a dead server. There is no
    // response and so no envelope, so name it UPSTREAM ourselves.
    throw new ApiError({ code: "UPSTREAM", message: cause?.message ?? "" });
  }
  if (res.status === 401) {
    await supabase.auth.signOut();
    throw new ApiError({ code: "UNAUTHORIZED", status: 401 });
  }
  if (!res.ok) throw await apiErrorFromResponse(res);
  return res;
}

// ─── CATEGORIES & EXPENSES ──────────────────────────────────────────────────

export async function fetchCategories(kind, includeDeleted = false) {
  const params = new URLSearchParams();
  if (includeDeleted) params.set("include_deleted", "true");
  const res = await authFetch(`/categories/${kind}${params.size ? "?" + params : ""}`);
  const data = await res.json();
  return data.categories ?? data;
}

export async function fetchExpenses(categoryId, month) {
  const params = new URLSearchParams();
  if (categoryId) params.set("category_id", categoryId);
  if (month) params.set("month", month);
  const res = await authFetch(`/expenses${params.size ? "?" + params : ""}`);
  const data = await res.json();
  return (data.expenses ?? data).map(mapExpense);
}

export async function upsertExpenseStatus(expenseId, month, { status, value } = {}) {
  const body = { expense_id: expenseId, month };
  if (status !== undefined) body.status = status;
  if (value !== undefined) body.value = value;
  const res = await authFetch("/expense-status", { method: "PUT", body });
  return res.json();
}

export async function createCategory(kind, name) {
  const res = await authFetch(`/categories/${kind}`, { method: "POST", body: { name } });
  return res.json();
}

export async function createExpense(categoryId, name, amount) {
  const res = await authFetch("/expenses", {
    method: "POST",
    body: { category_id: categoryId, expense: name, value: amount },
  });
  return mapExpense(await res.json());
}

export async function deleteExpense(id) {
  await authFetch(`/expenses/${id}`, { method: "DELETE" });
}

export async function reorderExpenses(items) {
  await authFetch("/expenses/reorder", { method: "PUT", body: { items } });
}

export async function deleteCategory(kind, id) {
  await authFetch(`/categories/${kind}/${id}`, { method: "DELETE" });
}

export async function reorderCategories(kind, items) {
  await authFetch(`/categories/${kind}/reorder`, { method: "PUT", body: { items } });
}

export async function updateCategory(kind, id, name) {
  const res = await authFetch(`/categories/${kind}/${id}`, { method: "PUT", body: { name } });
  return res.json();
}

export async function updateExpense(id, patch) {
  const body = {};
  if (patch.expense !== undefined) body.expense = patch.expense;
  if (patch.value !== undefined) body.value = patch.value;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.category_id !== undefined) body.category_id = patch.category_id;
  const res = await authFetch(`/expenses/${id}`, { method: "PUT", body });
  return mapExpense(await res.json());
}

// ─── INCOME ─────────────────────────────────────────────────────────────────

export async function fetchIncome(categoryId, month) {
  const params = new URLSearchParams();
  if (categoryId) params.set("category_id", categoryId);
  if (month) params.set("month", month);
  const res = await authFetch(`/income${params.size ? "?" + params : ""}`);
  const data = await res.json();
  return (data.income ?? data).map(mapIncome);
}

export async function createIncome(categoryId, name, amount) {
  const res = await authFetch("/income", {
    method: "POST",
    body: { category_id: categoryId, income: name, value: amount },
  });
  return mapIncome(await res.json());
}

export async function updateIncome(id, patch) {
  const body = {};
  if (patch.income !== undefined) body.income = patch.income;
  if (patch.value !== undefined) body.value = patch.value;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.category_id !== undefined) body.category_id = patch.category_id;
  const res = await authFetch(`/income/${id}`, { method: "PUT", body });
  return mapIncome(await res.json());
}

export async function deleteIncome(id) {
  await authFetch(`/income/${id}`, { method: "DELETE" });
}

export async function reorderIncome(items) {
  await authFetch("/income/reorder", { method: "PUT", body: { items } });
}

export async function upsertIncomeStatus(incomeId, month, { status, value } = {}) {
  const body = { income_id: incomeId, month };
  if (status !== undefined) body.status = status;
  if (value !== undefined) body.value = value;
  const res = await authFetch("/income-status", { method: "PUT", body });
  return res.json();
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

export async function fetchTransactions(month, categoryId) {
  const params = new URLSearchParams();
  if (categoryId) params.set("category_id", categoryId);
  if (month) params.set("month", month);
  const res = await authFetch(`/transactions${params.size ? "?" + params : ""}`);
  const data = await res.json();
  return data.transactions ?? data;
}

export async function createTransaction({ date, amount, category_id, note, method }) {
  const body = { date, amount, category_id };
  if (note !== undefined) body.note = note;
  if (method !== undefined) body.method = method;
  const res = await authFetch("/transactions", { method: "POST", body });
  return res.json();
}

export async function updateTransaction(id, patch) {
  const res = await authFetch(`/transactions/${id}`, { method: "PUT", body: patch });
  return res.json();
}

export async function deleteTransaction(id) {
  await authFetch(`/transactions/${id}`, { method: "DELETE" });
}

// ─── SPLITTER ─────────────────────────────────────────────────────────────────

export async function fetchSplitters(month) {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  const res = await authFetch(`/splitter/items${params.size ? "?" + params : ""}`);
  const data = await res.json();
  return data.splitters ?? [];
}

export async function createSplitter(type, label, value, position = 0, person_id = null, month) {
  const body = { month, type, label, value, position };
  if (person_id) body.person_id = person_id;
  const res = await authFetch("/splitter/items", { method: "POST", body });
  return res.json();
}

export async function updateSplitter(id, patch) {
  const res = await authFetch(`/splitter/items/${id}`, { method: "PUT", body: patch });
  return res.json();
}

export async function deleteSplitter(id) {
  await authFetch(`/splitter/items/${id}`, { method: "DELETE" });
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
  const data = await res.json();
  return data.people ?? [];
}

export async function createPerson(name, color, share, position = 0) {
  const res = await authFetch("/people", {
    method: "POST",
    body: { name, color, share, position },
  });
  return res.json();
}

export async function updatePerson(id, patch) {
  const res = await authFetch(`/people/${id}`, { method: "PUT", body: patch });
  return res.json();
}

export async function deletePerson(id) {
  await authFetch(`/people/${id}`, { method: "DELETE" });
}

export async function addPersonToFeature(personId, feature) {
  await authFetch(`/people/${personId}/features/${feature}`, { method: "POST" });
}

export async function removePersonFromFeature(personId, feature) {
  await authFetch(`/people/${personId}/features/${feature}`, { method: "DELETE" });
}

// ─── DEBT ─────────────────────────────────────────────────────────────────────

export async function fetchDebts({ personId, archived } = {}) {
  const params = new URLSearchParams();
  if (personId) params.set("person_id", personId);
  if (archived !== undefined) params.set("archived", archived);
  const qs = params.toString();
  const path = qs ? `/debts?${qs}` : "/debts";
  const res = await authFetch(path);
  const data = await res.json();
  return data.debts ?? data;
}

export async function createDebtPayment(debtId, { amount, date, note }) {
  const body = { amount, date };
  if (note) body.note = note;
  const res = await authFetch(`/debts/${debtId}/payments`, { method: "POST", body });
  return res.json();
}

export async function distributePayment({ type, amount, date, note, person_id }) {
  const body = { type, amount, date, ...(note ? { note } : {}), ...(person_id ? { person_id } : {}) };
  const res = await authFetch("/debts/distribute", { method: "POST", body });
  return res.json();
}

export async function deleteDebt(debtId) {
  await authFetch(`/debts/${debtId}`, { method: "DELETE" });
}

export async function updateDebt(debtId, patch) {
  const res = await authFetch(`/debts/${debtId}`, { method: "PUT", body: patch });
  return res.json();
}

export async function deleteDebtPayment(debtId, paymentId) {
  await authFetch(`/debts/${debtId}/payments/${paymentId}`, { method: "DELETE" });
}

export async function createDebt({ description, amount, type, status = "pending", person_id = null, due_date = null }) {
  const body = { description, amount, type, status };
  if (person_id) body.person_id = person_id;
  if (due_date) body.due_date = due_date;
  const res = await authFetch("/debts", { method: "POST", body });
  return res.json();
}
