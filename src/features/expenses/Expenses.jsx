import { useI18n } from "../../i18n/index.jsx";
import {
  fetchCategories, fetchExpenses, upsertExpenseStatus, updateExpense,
  reorderExpenses, reorderCategories, createCategory, createExpense, updateCategory,
  deleteExpense, deleteCategory,
} from "../../api.js";
import CategorizedPage from "../../components/CategorizedPage.jsx";

const STATUS_OPTIONS = ["paid", "unpaid", "scheduled", "verify"];

const API = {
  fetchCategories: (isPastMonth) => fetchCategories("expense", isPastMonth),
  fetchItems: (month) => fetchExpenses(null, month),
  setStatus: upsertExpenseStatus,
  updateItem: (id, name, categoryId) => updateExpense(id, { expense: name, category_id: categoryId }),
  createItem: createExpense,
  deleteItem: deleteExpense,
  reorderItems: reorderExpenses,
  createCategory: (name) => createCategory("expense", name),
  updateCategory: (id, name) => updateCategory("expense", id, name),
  deleteCategory: (id) => deleteCategory("expense", id),
  reorderCategories: (items) => reorderCategories("expense", items),
};

export default function Expenses() {
  const { t } = useI18n();
  return (
    <CategorizedPage
      api={API} statusOptions={STATUS_OPTIONS} doneStatus="paid" defaultStatus="unpaid" pendingTone="negative"
      labels={{
        title: t("expenses.title"),
        itemsMeta: t("expenses.transactions"),
        categoriesMeta: t("expenses.categories"),
        done: t("summary.paid"),
        pending: t("expenses.pending"),
        name: t("col.expense"),
        newItem: t("expenses.newExpense"),
        newItemTitle: t("expenses.newExpense"),
        editTitle: t("expenses.editTitle"),
        newCategory: t("expenses.newCategory"),
        deleteTitle: t("expense.deleteTitle"),
        deleteDesc: t("expense.deleteDesc"),
        finalBalance: t("expenses.finalBalance"),
      }}
    />
  );
}
