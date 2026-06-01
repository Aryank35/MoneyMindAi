import { useEffect, useState } from "react";
import { FiPlus, FiSearch, FiFilter, FiTrash2 } from "react-icons/fi";

import DashboardLayout from "../components/layout/DashboardLayout";

import {
  getExpensesByUser,
  createExpense,
  deleteExpense,
} from "../services/expenseService";

import { getUserId } from "../utils/auth";

import { getBudgetByUser, updateBudget } from "../services/budgetService";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);

  const [formData, setFormData] = useState({
    account: "Primary",
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

  const [accounts, setAccounts] = useState([
    {
      _id: "primary",
      name: "Primary",
    },
    {
      _id: "cash",
      name: "Cash",
      balance: 0,
      color: "#10B981",
      icon: "💵",
    },
    {
      _id: "upi",
      name: "UPI",
    },
  ]);

  const [showAccountInput, setShowAccountInput] = useState(false);

  const [newAccount, setNewAccount] = useState("");

  const fetchExpenses = async () => {
    try {
      const response = await getExpensesByUser(getUserId());

      setExpenses(response.data || []);
    } catch (error) {
      console.error(error);

      setExpenses([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchExpenses(), fetchBudgetCategories()]);
    };

    loadData();
  }, []);

  const handleAddExpense = async () => {
    try {
      if (!formData.category || !formData.amount) {
        return;
      }

      const amount = Number(formData.amount);

      if (amount <= 0) {
        alert("Amount must be greater than 0");

        return;
      }

      if (!budget) {
        alert("Please create a budget first");

        return;
      }

      if (!formData.account) {
        alert("Please select account");
        return;
      }

      const expenseDate = new Date(`${formData.date}T${formData.time}`);

      await createExpense({
        userId: getUserId(),

        accountId: formData.account,

        category: formData.category,

        amount,

        note: formData.note,

        expenseDate,
      });
      setFormData({
        account: formData.account,
        category: "",
        amount: "",
        note: "",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
      });

      await fetchExpenses();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await deleteExpense(id);

      fetchExpenses();
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

  const accountFilteredExpenses =
    selectedAccount === "all"
      ? expenses
      : expenses.filter((expense) => expense.accountId === selectedAccount);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[70vh]">
          <h2 className="text-2xl text-slate-400">Loading Expenses...</h2>
        </div>
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

  return (
    <DashboardLayout>
      {/* Header */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold">Expenses</h1>

          <p className="text-slate-400 mt-2">Track and manage your spending</p>
        </div>
      </div>

      {/* Add Expense */}
      {!hasBudget && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 p-4 rounded-2xl mb-6">
          Please create a budget first to manage expense categories.
        </div>
      )}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-5">Add Expense</h2>

        <div className="grid md:grid-cols-3 gap-4">
          <select
            value={formData.account}
            onChange={(e) => {
              if (e.target.value === "__new_account__") {
                setShowAccountInput(true);
                return;
              }

              setFormData({
                ...formData,
                account: e.target.value,
              });
            }}
            className="bg-slate-800 rounded-xl p-3 border border-slate-700"
          >
            {accounts.map((account) => (
              <option key={account._id} value={account._id}>
                {account.name}
              </option>
            ))}

            <option value="__new_account__">+ Add Account</option>
          </select>

          {showAccountInput && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Account Name"
                value={newAccount}
                onChange={(e) => setNewAccount(e.target.value)}
                className="flex-1 bg-slate-800 rounded-xl p-3"
              />

              <button
                onClick={() => {
                  const cleanedName = newAccount.trim();

                  if (!cleanedName) {
                    alert("Enter account name");
                    return;
                  }

                  const exists = accounts.some(
                    (account) =>
                      account.name.toLowerCase() === cleanedName.toLowerCase(),
                  );

                  if (exists) {
                    alert("Account already exists");
                    return;
                  }
                  const account = {
                    _id: Date.now().toString(),
                    name: cleanedName,
                  };

                  setAccounts([...accounts, account]);

                  setFormData({
                    ...formData,
                    account: account._id,
                  });

                  setNewAccount("");

                  setShowAccountInput(false);
                }}
                className="bg-indigo-600 px-4 rounded-xl"
              >
                Add
              </button>
            </div>
          )}

          <div className="space-y-2">
            <select
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
                <input
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
                        alert("Category already exists");

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
                    } catch (error) {
                      console.error(error);
                    }
                  }}
                  className="px-4 rounded-xl bg-indigo-600"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          <input
            type="number"
            placeholder="Amount"
            value={formData.amount}
            onChange={(e) =>
              setFormData({
                ...formData,
                amount: e.target.value,
              })
            }
            className="bg-slate-800 rounded-xl p-3 outline-none border border-slate-700 focus:border-indigo-500"
          />

          <input
            type="text"
            placeholder="Note"
            value={formData.note}
            onChange={(e) =>
              setFormData({
                ...formData,
                note: e.target.value,
              })
            }
            className="bg-slate-800 rounded-xl p-3 outline-none border border-slate-700 focus:border-indigo-500"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block mb-2 text-slate-400">Expense Date</label>

            <input
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
            <label className="block mb-2 text-slate-400">Expense Time</label>

            <input
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

        <button
          onClick={handleAddExpense}
          className="mt-5 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-5 py-3 rounded-xl transition"
        >
          <FiPlus />
          Save Expense
        </button>
      </div>

      {/* Search */}

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-indigo-500"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
        >
          <FiFilter />
          Filter
        </button>
      </div>

      {showFilters && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="bg-slate-800 p-3 rounded-xl"
            >
              <option value="all">All Accounts</option>

              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 p-3 rounded-xl"
            >
              <option value="">All Categories</option>

              {budgetCategories.map((category) => (
                <option key={category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-800 p-3 rounded-xl"
            />

            <input
              type="number"
              placeholder="Min Amount"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="bg-slate-800 p-3 rounded-xl"
            />

            <input
              type="number"
              placeholder="Max Amount"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="bg-slate-800 p-3 rounded-xl"
            />
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
        </div>
      )}

      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-4">
        <h3 className="font-semibold">Filter Results</h3>

        <p>{filteredExpenses.length} expenses found</p>

        <p>Total Amount: ₹{filteredTotal.toLocaleString()}</p>
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
              {filteredExpenses?.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <tr
                    key={expense._id}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="p-5">
                      {accounts.find((a) => a._id === expense.accountId)
                        ?.name || "Unknown"}
                    </td>

                    <td className="p-5">
                      {expense.expenseDate
                        ? new Date(expense.expenseDate).toLocaleString()
                        : "N/A"}
                    </td>

                    <td className="p-5">{expense.category}</td>

                    <td className="p-5 text-slate-400">{expense.note}</td>

                    <td className="p-5 text-right text-red-400 font-medium">
                      ₹{Number(expense.amount).toLocaleString()}
                    </td>

                    <td className="p-5 text-center">
                      <button
                        onClick={() => handleDeleteExpense(expense._id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center p-10 text-slate-400">
                    No expenses added yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
