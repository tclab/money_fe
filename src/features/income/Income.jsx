import { useI18n } from "../../i18n/index.jsx";
import {
  fetchCategories, fetchIncome, upsertIncomeStatus, updateIncome,
  reorderIncome, reorderCategories, createCategory, createIncome, updateCategory,
  deleteIncome, deleteCategory,
} from "../../api.js";
import CategorizedPage from "../../components/CategorizedPage.jsx";

const STATUS_OPTIONS = ["received", "expected"];

const API = {
  fetchCategories: (isPastMonth) => fetchCategories("income", isPastMonth),
  fetchItems: (month) => fetchIncome(null, month),
  setStatus: upsertIncomeStatus,
  updateItem: (id, name, categoryId) => updateIncome(id, { income: name, category_id: categoryId }),
  createItem: createIncome,
  deleteItem: deleteIncome,
  reorderItems: reorderIncome,
  createCategory: (name) => createCategory("income", name),
  updateCategory: (id, name) => updateCategory("income", id, name),
  deleteCategory: (id) => deleteCategory("income", id),
  reorderCategories: (items) => reorderCategories("income", items),
};

export default function Income() {
  const { t } = useI18n();
  return (
    <CategorizedPage
      api={API} statusOptions={STATUS_OPTIONS} doneStatus="received" defaultStatus="expected" pendingTone="pending"
      labels={{
        title: t("income.title"),
        itemsMeta: t("income.transactions"),
        categoriesMeta: t("income.sources"),
        done: t("income.received"),
        pending: t("income.pending"),
        name: t("col.income"),
        newItem: t("income.newIncome"),
        newItemTitle: t("income.newItem"),
        editTitle: t("income.editTitle"),
        newCategory: t("income.newCategory"),
        deleteTitle: t("income.deleteTitle"),
        deleteDesc: t("income.deleteDesc"),
        finalBalance: t("income.finalBalance"),
      }}
    />
  );
}
