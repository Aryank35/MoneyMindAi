import { useEffect, useState } from "react";
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiTrash2,
} from "react-icons/fi";

import DashboardLayout from "../components/layout/DashboardLayout";

import {
  getExpenses,
  createExpense,
  deleteExpense,
} from "../services/expenseService";

import { USER_ID } from "../constants/user";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);

  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    note: "",
  });

  const fetchExpenses = async () => {
    try {
      const response =
        await getExpenses(USER_ID);

      setExpenses(response.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddExpense = async () => {
    try {
      if (
        !formData.category ||
        !formData.amount
      ) {
        return;
      }

      await createExpense({
        userId: USER_ID,
        category: formData.category,
        amount: Number(
          formData.amount
        ),
        note: formData.note,
      });

      setFormData({
        category: "",
        amount: "",
        note: "",
      });

      fetchExpenses();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteExpense =
    async (id) => {
      try {
        await deleteExpense(id);

        fetchExpenses();
      } catch (error) {
        console.error(error);
      }
    };

  return (
    <DashboardLayout>

      {/* Header */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

        <div>
          <h1 className="text-4xl font-bold">
            Expenses
          </h1>

          <p className="text-slate-400 mt-2">
            Track and manage your spending
          </p>
        </div>

      </div>

      {/* Add Expense */}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">

        <h2 className="text-xl font-semibold mb-5">
          Add Expense
        </h2>

        <div className="grid md:grid-cols-3 gap-4">

          <input
            type="text"
            placeholder="Category"
            value={formData.category}
            onChange={(e) =>
              setFormData({
                ...formData,
                category:
                  e.target.value,
              })
            }
            className="bg-slate-800 rounded-xl p-3 outline-none border border-slate-700 focus:border-indigo-500"
          />

          <input
            type="number"
            placeholder="Amount"
            value={formData.amount}
            onChange={(e) =>
              setFormData({
                ...formData,
                amount:
                  e.target.value,
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
                note:
                  e.target.value,
              })
            }
            className="bg-slate-800 rounded-xl p-3 outline-none border border-slate-700 focus:border-indigo-500"
          />

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

          <FiSearch
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search expenses..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-indigo-500"
          />

        </div>

        <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
          <FiFilter />
          Filter
        </button>

      </div>

      {/* Expense Table */}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">

        <div className="px-6 py-5 border-b border-white/10">
          <h2 className="text-xl font-semibold">
            Recent Expenses
          </h2>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead>

              <tr className="border-b border-white/10 text-slate-400">

                <th className="text-left p-5">
                  Date
                </th>

                <th className="text-left p-5">
                  Category
                </th>

                <th className="text-left p-5">
                  Note
                </th>

                <th className="text-right p-5">
                  Amount
                </th>

                <th className="text-center p-5">
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {expenses.map(
                (expense) => (
                  <tr
                    key={expense._id}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="p-5">
                      {new Date(
                        expense.expenseDate
                      ).toLocaleDateString()}
                    </td>

                    <td className="p-5">
                      {expense.category}
                    </td>

                    <td className="p-5 text-slate-400">
                      {expense.note}
                    </td>

                    <td className="p-5 text-right text-red-400 font-medium">
                      ₹{expense.amount}
                    </td>

                    <td className="p-5 text-center">

                      <button
                        onClick={() =>
                          handleDeleteExpense(
                            expense._id
                          )
                        }
                        className="text-red-400 hover:text-red-300"
                      >
                        <FiTrash2
                          size={18}
                        />
                      </button>

                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>

      </div>

    </DashboardLayout>
  );
}