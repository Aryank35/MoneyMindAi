import DashboardLayout from "../components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";

import {
  getIncomesByUser,
  createIncome,
  deleteIncome,
} from "../services/incomeService";

import { getUserId } from "../utils/auth";

export default function Income() {
  const [incomes, setIncomes] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    source: "Salary",
    amount: "",
    note: "",
    date: new Date().toISOString().split("T")[0],

    time: new Date().toTimeString().slice(0, 5),
  });

  useEffect(() => {
    loadIncome();
  }, []);

  const loadIncome = async () => {
    try {
      const userId = getUserId();

      const response = await getIncomesByUser(userId);

      setIncomes(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIncome = async () => {
    try {
      const incomeDate = new Date(`${formData.date}T${formData.time}`);

      await createIncome({
        userId: getUserId(),

        source: formData.source,

        amount: Number(formData.amount),

        note: formData.note,

        incomeDate,
      });

      if (!formData.amount || Number(formData.amount) <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      if (!formData.source.trim()) {
        alert("Please select income source");
        return;
      }

      setShowModal(false);

      setFormData({
        source: "Salary",
        amount: "",
        note: "",
        date: new Date().toISOString().split("T")[0],

        time: new Date().toTimeString().slice(0, 5),
      });

      loadIncome();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteIncome = async (id) => {
    try {
      await deleteIncome(id);

      setIncomes((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

  const currentMonth = new Date().getMonth();

  const monthlyIncome = incomes
    .filter((income) => new Date(income.incomeDate).getMonth() === currentMonth)
    .reduce((sum, income) => sum + income.amount, 0);

  const [selectedSource, setSelectedSource] = useState("all");

  const filteredIncomes =
    selectedSource === "all"
      ? incomes
      : incomes.filter((income) => income.source === selectedSource);

  const [search, setSearch] = useState("");

  const incomeSources = [
    "Salary",
    "Freelancing",
    "Business",
    "Interest",
    "Dividend",
    "Bonus",
    "Rental Income",
    "Gift",
    "Other",
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-[70vh]">
          Loading Income...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Income</h1>

          <p className="text-slate-400 mt-2">Track all your income sources</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-600 hover:bg-green-500"
        >
          <FiPlus />
          Add Income
        </button>
      </div>

      {/* Summary */}

      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">Total Income</p>

          <h3 className="text-3xl font-bold text-green-400 mt-2">
            ₹{totalIncome.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">Income Entries</p>

          <h3 className="text-3xl font-bold mt-2">{incomes.length}</h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">Average Income</p>

          <h3 className="text-3xl font-bold text-cyan-400 mt-2">
            ₹
            {incomes.length
              ? Math.round(totalIncome / incomes.length).toLocaleString()
              : 0}
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">This Month</p>

          <h3 className="text-3xl font-bold text-indigo-400 mt-2">
            ₹{monthlyIncome.toLocaleString()}
          </h3>
        </div>
      </div>

      {/* Income Table */}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="bg-slate-800 p-2 rounded-xl"
        >
          {incomeSources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-5 text-left">Date</th>

              <th className="p-5 text-left">Source</th>

              <th className="p-5 text-left">Note</th>

              <th className="p-5 text-left">Amount</th>

              <th className="p-5 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredIncomes.length > 0 ? (
              filteredIncomes.map((income) => (
                <tr key={income._id} className="border-b border-white/5">
                  <td className="p-5">
                    {new Date(income.incomeDate).toLocaleString()}
                  </td>

                  <td className="p-5">{income.source}</td>

                  <td className="p-5">{income.note || "-"}</td>

                  <td className="p-5 text-green-400 font-semibold">
                    ₹{income.amount.toLocaleString()}
                  </td>

                  <td className="p-5">
                    <button
                      onClick={() => handleDeleteIncome(income._id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center p-10 text-slate-400">
                  No Income Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-5">Add Income</h2>

            <div className="space-y-4">
              <select
                value={formData.source}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    source: e.target.value,
                  })
                }
                className="w-full bg-slate-800 p-3 rounded-xl"
              >
                <option>Salary</option>

                <option>Freelancing</option>

                <option>Business</option>

                <option>Rental</option>

                <option>Other</option>
              </select>

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
                className="w-full bg-slate-800 p-3 rounded-xl"
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
                className="w-full bg-slate-800 p-3 rounded-xl"
              />

              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    date: e.target.value,
                  })
                }
                className="w-full bg-slate-800 p-3 rounded-xl"
              />

              <input
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    time: e.target.value,
                  })
                }
                className="w-full bg-slate-800 p-3 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-700 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleAddIncome}
                className="px-4 py-2 bg-green-600 rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
