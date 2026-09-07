import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiTrash2,
  FiEdit2,
  FiTag,
  FiAlertTriangle,
  FiClock,
} from "react-icons/fi";

import DashboardLayout from "../components/layout/DashboardLayout";
import { getAccountsByUser } from "../services/accountService";

import {
  getExpensesByUser,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../services/expenseService";

import { getUserId } from "../utils/auth";
import { useConnection } from "../context/connectionContext";
import {
  enqueue,
  listQueued,
  removeQueued,
  subscribeToOutbox,
} from "../utils/offlineQueue";
import { CHART_ACCENT } from "../utils/chartTheme";

import { getBudgetByUser, updateBudget } from "../services/budgetService";
import { useToast } from "../components/common/Toast";
import { PageLoader } from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Modal from "../components/common/Modal";
import Button from "../components/common/Button";
import Input, { Select } from "../components/common/Input";

// A credit card is funded by its limit, not by a positive balance, so
// "can this account cover the spend" is a different question per type.
const isCard = (account) => account?.type === "Credit Card";

const getOutstanding = (account) =>
  Math.max(-Number(account?.balance || 0), 0);

// How much the account can still spend. null means "no ceiling known" - a
// card with no limit recorded, which must not be blocked on a guess.
const getSpendingPower = (account) => {
  if (!account) return null;

  if (!isCard(account)) return Number(account.balance || 0);

  const limit = Number(account.card?.creditLimit || 0);

  if (limit <= 0) return null;

  return Math.max(limit - getOutstanding(account), 0);
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function Expenses() {
  const toast = useToast();

  const [expenses, setExpenses] = useState([]);

  const [formData, setFormData] = useState({
    account: "",
    category: "",
    amount: "",
    note: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
  });
  const [budgetCategories, setBudgetCategories] = useState([]);

  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  const [newCategory, setNewCategory] = useState("");

  const [budget, setBudget] = useState(null);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");

  const [selectedMonth, setSelectedMonth] = useState("");

  const [minAmount, setMinAmount] = useState("");

  const [maxAmount, setMaxAmount] = useState("");

  const [showFilters, setShowFilters] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState("all");

  const [accounts, setAccounts] = useState([]);

  const { isReachable } = useConnection();

  // Entries made while the API was unreachable. Shown alongside saved ones
  // so the user is never left wondering whether their expense registered.
  const [queued, setQueued] = useState(() => listQueued("expense.create"));

  const [editTarget, setEditTarget] = useState(null);

  const [editForm, setEditForm] = useState(null);

  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [deleting, setDeleting] = useState(false);

  const fetchExpenses = async () => {
    try {
      const response = await getExpensesByUser(getUserId());

      setExpenses(response.data || []);
    } catch (error) {
      console.error(error);

      setExpenses([]);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await getAccountsByUser(getUserId());

      const accountList = response.data || [];

      setAccounts(accountList);

      if (accountList.length > 0 && !formData.account) {
        setFormData((prev) => ({
          ...prev,
          account: accountList[0]._id,
        }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBudgetCategories = async () => {
    try {
      const response = await getBudgetByUser(getUserId());

      const currentBudget = response.data?.[0];

      setBudget(currentBudget);

      const categories = currentBudget?.categories || [];

      setBudgetCategories(categories);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchExpenses(),
        fetchBudgetCategories(),
        fetchAccounts(),
      ]);
    };

    loadData();
  }, []);

  const handleAddExpense = async () => {
    try {
      // Budget first: with no budget there are no categories to pick, so a
      // missing category is a symptom, not the thing to report.
      if (!budget) {
        toast.error("Please create a budget first");

        return;
      }

      if (!formData.account) {
        toast.error("Please select an account");

        return;
      }

      if (!formData.category) {
        toast.error("Please select a category");

        return;
      }

      if (!formData.amount) {
        toast.error("Please enter an amount");

        return;
      }

      const amount = Number(formData.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Amount must be greater than 0");

        return;
      }

      const spendingPower = getSpendingPower(selectedAccountData);

      if (spendingPower !== null && amount > spendingPower) {
        toast.error(
          isCard(selectedAccountData)
            ? `Exceeds available credit on ${selectedAccountData.name} (${money(spendingPower)} left)`
            : "Insufficient balance in selected account",
        );

        return;
      }

      const expenseDate = new Date(`${formData.date}T${formData.time}`);

      const payload = {
        userId: getUserId(),

        accountId: formData.account,

        category: formData.category,

        amount,

        note: formData.note,

        expenseDate,
      };

      if (!isReachable) {
        // Held on the device and replayed by ConnectionProvider once the API
        // answers. The balance check above already ran against the last
        // known balances, so this is not a blind write.
        const entry = enqueue("expense.create", payload, {
          accountName: selectedAccountData?.name,
        });

        if (!entry) {
          toast.error(
            "Could not save on this device - storage is unavailable. Try again once connected.",
          );

          return;
        }

        setFormData({
          account: formData.account,
          category: "",
          amount: "",
          note: "",
          date: new Date().toISOString().split("T")[0],
          time: new Date().toTimeString().slice(0, 5),
        });

        toast.success("Saved on this device - it will sync automatically");

        return;
      }

      await createExpense(payload);
      setFormData({
        account: formData.account,
        category: "",
        amount: "",
        note: "",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
      });

      await Promise.all([fetchExpenses(), fetchAccounts()]);

      toast.success("Expense added");
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Failed to add expense");
    }
  };

  useEffect(
    () =>
      subscribeToOutbox((items) =>
        setQueued(items.filter((item) => item.kind === "expense.create")),
      ),
    [],
  );

  // The outbox drained, so what was pending is now real - refetch rather
  // than leaving a stale list beside an empty queue.
  useEffect(() => {
    const onFlushed = () => {
      fetchExpenses();
      fetchAccounts();
    };

    window.addEventListener("moneymind:outbox-flushed", onFlushed);

    return () =>
      window.removeEventListener("moneymind:outbox-flushed", onFlushed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEditExpense = (expense) => {
    const when = expense.expenseDate ? new Date(expense.expenseDate) : new Date();

    setEditTarget(expense);
    setEditForm({
      account: expense.accountId || "",
      category: expense.category || "",
      amount: String(expense.amount ?? ""),
      note: expense.note || "",
      date: `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`,
      time: when.toTimeString().slice(0, 5),
    });
  };

  const closeEditExpense = () => {
    setEditTarget(null);
    setEditForm(null);
  };

  const handleUpdateExpense = async () => {
    if (!editForm || !editTarget) return;

    const amount = Number(editForm.amount);

    if (!editForm.account) {
      toast.error("Please select an account");
      return;
    }

    if (!editForm.category) {
      toast.error("Please select a category");
      return;
    }

    if (!(amount > 0)) {
      toast.error("Amount must be greater than 0");
      return;
    }

    const target = accounts.find((item) => item._id === editForm.account);
    const capacity = getSpendingPower(target);

    // Editing refunds the original charge before applying the new one, so
    // the money already committed to this expense is spendable again -
    // but only when it is going back to the same account.
    const sameAccount = String(editForm.account) === String(editTarget.accountId);

    const effectiveCapacity =
      capacity === null
        ? null
        : capacity + (sameAccount ? Number(editTarget.amount || 0) : 0);

    if (effectiveCapacity !== null && amount > effectiveCapacity) {
      toast.error(
        isCard(target)
          ? `Exceeds available credit on ${target.name} (${money(effectiveCapacity)} available for this expense)`
          : `Insufficient balance in ${target?.name || "that account"} (${money(effectiveCapacity)} available for this expense)`,
      );
      return;
    }

    try {
      setSavingEdit(true);

      await updateExpense(editTarget._id, {
        accountId: editForm.account,
        category: editForm.category,
        amount,
        note: editForm.note,
        expenseDate: new Date(`${editForm.date}T${editForm.time}`),
      });

      closeEditExpense();

      await Promise.all([fetchExpenses(), fetchAccounts()]);

      toast.success("Expense updated");
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Failed to update expense");
    } finally {
      setSavingEdit(false);
    }
  };

  const requestDeleteExpense = (expense) => {
    setDeleteTarget(expense);
  };

  const confirmDeleteExpense = async () => {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await deleteExpense(deleteTarget._id);

      await Promise.all([fetchExpenses(), fetchAccounts()]);

      toast.success("Expense deleted");

      setDeleteTarget(null);
    } catch (error) {
      console.error(error);

      toast.error("Failed to delete expense");
    } finally {
      setDeleting(false);
    }
  };

  const todayExpense = expenses
    .filter(
      (expense) =>
        new Date(expense.expenseDate).toDateString() ===
        new Date().toDateString(),
    )
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const monthExpense = expenses
    .filter((expense) => {
      const expenseDate = new Date(expense.expenseDate);

      const now = new Date();

      return (
        expenseDate.getMonth() === now.getMonth() &&
        expenseDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const remainingBudget = (budget?.totalBudget || 0) - monthExpense;

  const accountFilteredExpenses =
    selectedAccount === "all"
      ? expenses
      : expenses.filter((expense) => expense.accountId === selectedAccount);

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader label="Loading expenses..." />
      </DashboardLayout>
    );
  }

  const hasBudget = !!budget;

  const filteredExpenses = accountFilteredExpenses.filter((expense) => {
    const matchesSearch =
      expense.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.note?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      !selectedCategory || expense.category === selectedCategory;

    const matchesMonth =
      !selectedMonth || expense.expenseDate?.startsWith(selectedMonth);

    const matchesMin =
      !minAmount || Number(expense.amount) >= Number(minAmount);

    const matchesMax =
      !maxAmount || Number(expense.amount) <= Number(maxAmount);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesMonth &&
      matchesMin &&
      matchesMax
    );
  });

  const filteredTotal = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  const progress = budget?.totalBudget
    ? ((monthExpense / budget.totalBudget) * 100).toFixed(1)
    : 0;

  const selectedAccountData = accounts.find(
    (account) => account._id === formData.account,
  );

  const categoryBudget = budgetCategories.find(
    (category) => category.name === formData.category,
  );

  const categorySpent = expenses
    .filter((expense) => expense.category === formData.category)
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const spendingPower = getSpendingPower(selectedAccountData);

  // For a card this is credit left after the spend; for everything else it
  // is the balance left behind.
  const remainingAccountBalance =
    spendingPower === null
      ? null
      : spendingPower - Number(formData.amount || 0);

  return (
    <DashboardLayout>
      {/* Header */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold">Expenses</h1>

          <p className="text-slate-400 mt-2">Track and manage your spending</p>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.05 } },
        }}
      >
        {[
          {
            key: "today",
            label: "Today",
            value: todayExpense,
            classes: "bg-indigo-500/10 border-indigo-500/20",
          },
          {
            key: "month",
            label: "This Month",
            value: monthExpense,
            classes: "bg-purple-500/10 border-purple-500/20",
          },
          {
            key: "left",
            label: "Budget Left",
            value: remainingBudget,
            classes: "bg-green-500/10 border-green-500/20",
          },
          {
            key: "transactions",
            label: "Transactions",
            value: expenses.length,
            classes: "bg-orange-500/10 border-orange-500/20",
            raw: true,
          },
        ].map((card) => (
          <motion.div
            key={card.key}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0 },
            }}
            className={`border rounded-2xl p-5 ${card.classes}`}
          >
            <p className="text-slate-400">{card.label}</p>
            <h2 className="text-2xl font-bold">
              {card.raw ? card.value : `₹${card.value.toLocaleString()}`}
            </h2>
          </motion.div>
        ))}
      </motion.div>

      {/* Add Expense */}
      {!hasBudget && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 p-4 rounded-2xl mb-6">
          Please create a budget first to manage expense categories.
        </div>
      )}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-5">Add Expense</h2>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="expense-account" className="block mb-2 text-slate-400 text-sm">
              Account
            </label>

            <select
              id="expense-account"
              value={formData.account}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  account: e.target.value,
                });
              }}
              className="w-full bg-slate-800 rounded-xl p-3 border border-slate-700"
            >
              <option value="">Select Account</option>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="expense-category" className="block mb-2 text-slate-400 text-sm">
              Category
            </label>

            <select
              id="expense-category"
              value={formData.category}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setShowNewCategoryInput(true);

                  return;
                }

                setShowNewCategoryInput(false);

                setFormData({
                  ...formData,
                  category: e.target.value,
                });
              }}
              className="bg-slate-800 rounded-xl p-3 outline-none border border-slate-700 focus:border-indigo-500 w-full"
            >
              <option value="">Select Category</option>

              {budgetCategories.map((category) => (
                <option key={category.name} value={category.name}>
                  {category.name}
                </option>
              ))}

              <option value="__new__">+ Add New Category</option>
            </select>

            {showNewCategoryInput && (
              <div className="flex gap-2">
                <label htmlFor="expense-new-category" className="sr-only">
                  New category name
                </label>

                <input
                  id="expense-new-category"
                  type="text"
                  placeholder="New Category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 bg-slate-800 rounded-xl p-3 border border-slate-700"
                />

                <button
                  onClick={async () => {
                    try {
                      const cleanedName = newCategory
                        .trim()
                        .replace(/\s+/g, " ");

                      if (!cleanedName) {
                        return;
                      }

                      const exists = budgetCategories.some(
                        (category) =>
                          category.name.toLowerCase().trim() ===
                          cleanedName.toLowerCase().trim(),
                      );

                      if (exists) {
                        toast.error("Category already exists");

                        return;
                      }

                      const updatedCategories = [
                        ...budgetCategories,

                        {
                          name: cleanedName,
                          limit: 0,
                        },
                      ];

                      if (budget?._id) {
                        await updateBudget(budget._id, {
                          ...budget,
                          categories: updatedCategories,
                        });
                      }

                      setBudgetCategories(updatedCategories);

                      setBudget({
                        ...budget,
                        categories: updatedCategories,
                      });

                      setFormData({
                        ...formData,
                        category: cleanedName,
                      });

                      setNewCategory("");

                      setShowNewCategoryInput(false);

                      toast.success("Category added");
                    } catch (error) {
                      console.error(error);

                      toast.error("Failed to add category");
                    }
                  }}
                  className="px-4 rounded-xl bg-indigo-600"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="expense-amount" className="block mb-2 text-slate-400 text-sm">
              Amount
            </label>

            <input
              id="expense-amount"
              type="number"
              placeholder="Amount"
              value={formData.amount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  amount: e.target.value,
                })
              }
              className="w-full bg-slate-800 rounded-xl p-3 outline-none border border-slate-700 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="expense-note" className="block mb-2 text-slate-400 text-sm">
              Note
            </label>

            <input
              id="expense-note"
              type="text"
              placeholder="Note"
              value={formData.note}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  note: e.target.value,
                })
              }
              className="w-full bg-slate-800 rounded-xl p-3 outline-none border border-slate-700 focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="expense-date" className="block mb-2 text-slate-400">Expense Date</label>

            <input
              id="expense-date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  date: e.target.value,
                })
              }
              className="w-full bg-slate-800 rounded-xl p-3 border border-slate-700"
            />
          </div>

          <div>
            <label htmlFor="expense-time" className="block mb-2 text-slate-400">Expense Time</label>

            <input
              id="expense-time"
              type="time"
              value={formData.time}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  time: e.target.value,
                })
              }
              className="w-full bg-slate-800 rounded-xl p-3 border border-slate-700"
            />
          </div>
        </div>
        {accounts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {accounts.map((account, index) => (
              <motion.button
                key={account._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                onClick={() =>
                  setFormData({
                    ...formData,
                    account: account._id,
                  })
                }
                className={`
        p-4 rounded-2xl
        border transition-all
        ${
          formData.account === account._id
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-slate-700 bg-slate-800"
        }
      `}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{
                    backgroundColor: account.color + "30",
                  }}
                >
                  {account.icon || "🏦"}
                </div>
                <h3 className="font-semibold mt-2">{account.name}</h3>

                <p className="text-xs text-slate-400">{account.type}</p>

                <p className="text-green-400 mt-2">
                  {isCard(account)
                    ? `${money(getOutstanding(account))} owed`
                    : money(account.balance)}
                </p>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState
              icon={FiTag}
              title="No accounts found"
              message="Add an account first so you can log an expense against it."
            />
          </div>
        )}

        <div className="mt-4 p-4 rounded-xl bg-slate-800 border border-slate-700">
          <div
            className="mt-4 rounded-2xl p-5 border"
            style={{
              borderColor: selectedAccountData?.color || CHART_ACCENT,
            }}
          >
            <h3 className="font-bold text-lg">
              {selectedAccountData?.icon} {selectedAccountData?.name}
            </h3>

            <p className="text-slate-400">{selectedAccountData?.type}</p>

            <p
              className={`mt-2 text-2xl font-bold ${
                isCard(selectedAccountData)
                  ? "text-red-300"
                  : "text-green-400"
              }`}
            >
              {isCard(selectedAccountData)
                ? money(getOutstanding(selectedAccountData))
                : money(selectedAccountData?.balance)}
            </p>

            {isCard(selectedAccountData) && (
              <p className="text-xs text-slate-500">outstanding</p>
            )}
          </div>

          <h3 className="font-semibold">{selectedAccountData?.name}</h3>

          <p className="text-green-400">
            {isCard(selectedAccountData)
              ? spendingPower === null
                ? "No credit limit recorded"
                : `Available Credit: ${money(spendingPower)}`
              : `Available Balance: ${money(selectedAccountData?.balance)}`}
          </p>
          <p className="text-slate-400 text-xs">
            Used ₹{categorySpent} / ₹{categoryBudget?.limit || 0}
          </p>
        </div>

        <button
          onClick={handleAddExpense}
          className="mt-5 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-5 py-3 rounded-xl transition"
        >
          <FiPlus />
          Save Expense
        </button>
        {remainingAccountBalance !== null && remainingAccountBalance < 0 && (
          <p className="mt-2 text-sm text-red-400">
            {isCard(selectedAccountData)
              ? "Exceeds available credit on this card"
              : "Insufficient balance"}
          </p>
        )}

        <p className="text-yellow-400 mt-2">
          {remainingAccountBalance === null
            ? "Balance After Expense: —"
            : `Balance After Expense: ${money(remainingAccountBalance)}`}
        </p>
        <p className="text-xs text-slate-400">
          Monthly Limit: ₹{categoryBudget?.limit || 0}
        </p>
      </div>

      {/* Search */}

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <label htmlFor="expense-search" className="sr-only">
            Search expenses
          </label>

          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

          <input
            id="expense-search"
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-indigo-500"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          aria-label={showFilters ? "Hide filters" : "Show filters"}
          aria-expanded={showFilters}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
        >
          <FiFilter />
          Filter
        </button>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6"
        >
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="filter-account" className="block mb-1 text-slate-400 text-sm">
                Account
              </label>

              <select
                id="filter-account"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full bg-slate-800 p-3 rounded-xl"
              >
                <option value="all">All Accounts</option>

                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-category" className="block mb-1 text-slate-400 text-sm">
                Category
              </label>

              <select
                id="filter-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-800 p-3 rounded-xl"
              >
                <option value="">All Categories</option>

                {budgetCategories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-month" className="block mb-1 text-slate-400 text-sm">
                Month
              </label>

              <input
                id="filter-month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-800 p-3 rounded-xl"
              />
            </div>

            <div>
              <label htmlFor="filter-min" className="block mb-1 text-slate-400 text-sm">
                Min Amount
              </label>

              <input
                id="filter-min"
                type="number"
                placeholder="Min Amount"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full bg-slate-800 p-3 rounded-xl"
              />
            </div>

            <div>
              <label htmlFor="filter-max" className="block mb-1 text-slate-400 text-sm">
                Max Amount
              </label>

              <input
                id="filter-max"
                type="number"
                placeholder="Max Amount"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full bg-slate-800 p-3 rounded-xl"
              />
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedCategory("");
              setSelectedMonth("");
              setMinAmount("");
              setMaxAmount("");
              setSelectedAccount("all");
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-red-600"
          >
            Clear Filters
          </button>
        </motion.div>
      )}

      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-4">
        <h3 className="font-semibold">Filter Results</h3>
        <div className="bg-slate-800 rounded-xl p-4 mb-5">
          <div className="flex justify-between">
            <span>Showing {filteredExpenses.length} expenses</span>

            <span className="font-bold text-red-400">
              ₹{filteredTotal.toLocaleString()}
            </span>
          </div>
        </div>

        <p>{filteredExpenses.length} expenses found</p>

        <p>Total Amount: ₹{filteredTotal.toLocaleString()}</p>
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span>Budget Usage</span>
          <span>{progress}%</span>
        </div>

        <div className="h-3 bg-slate-700 rounded-full">
          <div
            className="h-3 bg-indigo-500 rounded-full"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>
      {/* Expense Table */}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10">
          <h2 className="text-xl font-semibold">Recent Expenses</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="text-left p-5">Account</th>

                <th className="text-left p-5">Date</th>

                <th className="text-left p-5">Category</th>

                <th className="text-left p-5">Note</th>

                <th className="text-right p-5">Amount</th>

                <th className="text-center p-5">Action</th>
              </tr>
            </thead>

            <tbody>
              {/* Pending rows are not filterable or editable - they do not
                  exist server-side yet. They can be discarded. */}
              {queued.map((entry) => (
                <tr
                  key={entry.id}
                  className={`border-b border-dashed ${
                    entry.blocked
                      ? "border-red-400/25 bg-red-500/5"
                      : "border-amber-400/20 bg-amber-500/5"
                  }`}
                >
                  <td className="p-5">
                    {entry.meta?.accountName || "Pending account"}
                  </td>
                  <td className="p-5">
                    {entry.payload.expenseDate
                      ? new Date(entry.payload.expenseDate).toLocaleString()
                      : "-"}
                  </td>
                  <td className="p-5">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        entry.blocked
                          ? "bg-red-500/15 text-red-200"
                          : "bg-amber-500/15 text-amber-200"
                      }`}
                    >
                      {entry.payload.category}
                    </span>
                  </td>
                  <td className="p-5 text-slate-400">
                    {entry.blocked ? (
                      <span className="flex items-start gap-2 text-xs text-red-300">
                        <FiAlertTriangle className="mt-0.5 shrink-0" />
                        <span>
                          The server refused this — it will not retry on its
                          own.
                          <span className="mt-0.5 block text-red-300/80">
                            {entry.lastError}
                          </span>
                          Fix it by re-entering above, then discard this.
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-xs text-amber-200">
                        <FiClock />
                        Waiting to sync
                        {entry.lastError && ` — retrying (${entry.lastError})`}
                      </span>
                    )}
                    {entry.payload.note && (
                      <span className="mt-1 block">{entry.payload.note}</span>
                    )}
                  </td>
                  <td className="p-5 text-right font-medium text-amber-200">
                    {money(entry.payload.amount)}
                  </td>
                  <td className="p-5">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => removeQueued(entry.id)}
                        aria-label="Discard pending expense"
                        className="text-slate-400 transition-colors hover:text-red-300"
                      >
                        <FiTrash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredExpenses?.length > 0 ? (
                filteredExpenses.map((expense, index) => (
                  <motion.tr
                    key={expense._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(index, 10) * 0.02 }}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="p-5">
                      {(() => {
                        const account = accounts.find(
                          (a) => a._id === expense.accountId,
                        );

                        return (
                          <div className="flex items-center gap-2">
                            <span>{account?.icon}</span>

                            <span>{account?.name || "Deleted Account"}</span>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="p-5">
                      {expense.expenseDate
                        ? new Date(expense.expenseDate).toLocaleString()
                        : "N/A"}
                    </td>

                    <td className="p-5">
                      <span
                        className="
      px-3
      py-1
      rounded-full
      bg-indigo-500/20
      text-indigo-300
      text-xs
    "
                      >
                        {expense.category}
                      </span>
                    </td>

                    <td className="p-5 text-slate-400">{expense.note}</td>

                    <td className="p-5 text-right text-red-400 font-medium">
                      ₹{Number(expense.amount).toLocaleString()}
                    </td>

                    <td className="p-5">
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => openEditExpense(expense)}
                          aria-label={`Edit ${expense.category} expense`}
                          className="text-slate-400 transition-colors hover:text-white"
                        >
                          <FiEdit2 size={17} />
                        </button>

                        <button
                          onClick={() => requestDeleteExpense(expense)}
                          aria-label={`Delete ${expense.category} expense`}
                          className="text-red-400 transition-colors hover:text-red-300"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-6">
                    <EmptyState
                      icon={FiTag}
                      title="No expenses added yet"
                      message="Expenses you log will appear here."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!editTarget}
        onClose={closeEditExpense}
        title="Edit Expense"
        maxWidth="max-w-2xl"
      >
        {editForm && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                label="Account"
                value={editForm.account}
                onChange={(e) =>
                  setEditForm({ ...editForm, account: e.target.value })
                }
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name} —{" "}
                    {isCard(account)
                      ? `${money(getOutstanding(account))} owed`
                      : money(account.balance)}
                  </option>
                ))}
              </Select>

              <Select
                label="Category"
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
              >
                <option value="">Select category</option>
                {budgetCategories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
                {/* A category can be renamed or dropped from the budget after
                    the fact - keep the original selectable so editing an
                    amount never silently reassigns it. */}
                {editForm.category &&
                  !budgetCategories.some(
                    (category) => category.name === editForm.category,
                  ) && (
                    <option value={editForm.category}>
                      {editForm.category} (not in budget)
                    </option>
                  )}
              </Select>

              <Input
                label="Amount"
                type="number"
                value={editForm.amount}
                onChange={(e) =>
                  setEditForm({ ...editForm, amount: e.target.value })
                }
              />

              <Input
                label="Note"
                value={editForm.note}
                onChange={(e) =>
                  setEditForm({ ...editForm, note: e.target.value })
                }
              />

              <Input
                label="Date"
                type="date"
                value={editForm.date}
                onChange={(e) =>
                  setEditForm({ ...editForm, date: e.target.value })
                }
              />

              <Input
                label="Time"
                type="time"
                value={editForm.time}
                onChange={(e) =>
                  setEditForm({ ...editForm, time: e.target.value })
                }
              />
            </div>

            {/* What this edit does to balances, before it happens. */}
            {(() => {
              const nextAccount = accounts.find(
                (item) => item._id === editForm.account,
              );
              const oldAccount = accounts.find(
                (item) => item._id === editTarget.accountId,
              );
              const moved =
                String(editForm.account) !== String(editTarget.accountId);
              const nextAmount = Number(editForm.amount || 0);
              const oldAmount = Number(editTarget.amount || 0);

              if (!nextAccount) return null;

              return (
                <div className="mt-5 rounded-xl bg-slate-800/80 p-4 text-sm">
                  <p className="text-slate-400">After saving</p>

                  {moved ? (
                    <div className="mt-2 space-y-1">
                      <p>
                        {oldAccount?.name || "Previous account"} is refunded{" "}
                        <span className="font-semibold text-emerald-300">
                          {money(oldAmount)}
                        </span>
                      </p>
                      <p>
                        {nextAccount.name} is charged{" "}
                        <span className="font-semibold text-red-300">
                          {money(nextAmount)}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2">
                      {nextAccount.name}{" "}
                      {nextAmount === oldAmount ? (
                        "is unchanged"
                      ) : (
                        <>
                          moves by{" "}
                          <span
                            className={`font-semibold ${
                              nextAmount < oldAmount
                                ? "text-emerald-300"
                                : "text-red-300"
                            }`}
                          >
                            {nextAmount < oldAmount ? "+" : "−"}
                            {money(Math.abs(nextAmount - oldAmount))}
                          </span>
                        </>
                      )}
                    </p>
                  )}
                </div>
              );
            })()}

            {editTarget.category !== editForm.category && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
                <FiAlertTriangle className="mt-0.5 shrink-0" />
                Moving this from {editTarget.category} to {editForm.category}{" "}
                shifts it between budget categories too.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={closeEditExpense}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateExpense} loading={savingEdit}>
                Save Changes
              </Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        onConfirm={confirmDeleteExpense}
        title="Delete this expense?"
        message={
          deleteTarget
            ? `This permanently deletes the ${deleteTarget.category || "expense"} of ${money(deleteTarget.amount)}${
                accounts.find((a) => a._id === deleteTarget.accountId)
                  ? ` and refunds it to ${accounts.find((a) => a._id === deleteTarget.accountId).name}, taking that balance to ${money(
                      Number(accounts.find((a) => a._id === deleteTarget.accountId).balance || 0) +
                        Number(deleteTarget.amount || 0),
                    )}`
                  : ""
              }. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleting}
      />
    </DashboardLayout>
  );
}
