import DashboardLayout from "../components/layout/DashboardLayout";
import { FiPlus, FiTarget, FiCheckCircle } from "react-icons/fi";
import { useState, useEffect } from "react";
import {
  getWishlistByUser,
  createWishlist,
  updateWishlist,
  deleteWishlist,
} from "../services/wishlistService";

import { USER_ID } from "../constants/user";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    itemName: "",
    targetAmount: "",
    savedAmount: "",
    priority: "Medium",
    targetDate: "",
  });

  const [editingId, setEditingId] = useState(null);

  const loadWishlist = async () => {
    try {
      const response = await getWishlistByUser(USER_ID);

      setWishlist(response.data || []);
    } catch (error) {
      console.error(error);
      setWishlist([]);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        userId: USER_ID,
      };
       console.log(payload);

      if (editingId) {
        await updateWishlist(editingId, payload);
      } else {
        await createWishlist(payload);
      }

       console.log(result);

      await loadWishlist();

      setShowModal(false);
      setEditingId(null);

      setFormData({
        itemName: "",
        targetAmount: "",
        savedAmount: "",
        priority: "Medium",
        targetDate: "",
      });
      targetDate;
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteWishlist(id);

      await loadWishlist();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);

    setFormData({
      itemName: item.itemName,
      targetAmount: item.targetAmount,
      savedAmount: item.savedAmount,
      priority: item.priority,
      targetDate: item.targetDate?.split("T")[0] || "",
    });

    setShowModal(true);
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const totalGoals = wishlist.length;

  const completedGoals = wishlist.filter(
    (item) => Number(item.savedAmount) >= Number(item.targetAmount),
  ).length;

  const activeGoals = totalGoals - completedGoals;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold">Wishlist & Goals</h1>

          <p className="text-slate-400 mt-2">
            Track your dreams and financial goals
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 px-5 py-3 rounded-xl"
        >
          + Add Wishlist
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">Total Goals</p>

          <h3 className="text-3xl font-bold mt-2">{totalGoals}</h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">Active Goals</p>

          <h3 className="text-3xl font-bold text-cyan-400 mt-2">
            {activeGoals}
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">Completed Goals</p>

          <h3 className="text-3xl font-bold text-green-400 mt-2">
            {completedGoals}
          </h3>
        </div>
      </div>

      {/* Goal Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {wishlist?.map((item) => {
          const progress = (item.savedAmount / item.targetAmount) * 100;

          return (
            <div
              key={item._id}
              className="bg-white/5 border border-white/10 rounded-2xl p-5"
            >
              <div className="flex justify-between">
                <h3 className="font-bold text-xl">{item.itemName}</h3>

                <span>{item.priority}</span>
              </div>

              <p className="text-slate-400 mt-2">
                ₹{item.savedAmount} / ₹{item.targetAmount}
              </p>

              <div className="w-full bg-slate-700 h-3 rounded-full mt-4">
                <div
                  className="bg-indigo-500 h-3 rounded-full"
                  style={{
                    width: `${Math.min(progress, 100)}%`,
                  }}
                />
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => handleEdit(item)}
                  className="px-4 py-2 bg-indigo-600 rounded-lg"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(item._id)}
                  className="px-4 py-2 bg-red-600 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Goal Insight */}
      <div className="mt-8 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <FiCheckCircle className="text-green-400" size={24} />

          <h3 className="text-xl font-semibold">AI Goal Insight</h3>
        </div>

        <p className="text-slate-300 mt-4 leading-relaxed">
          If you save ₹5,000 every month, you'll reach your Royal Enfield Hunter
          goal approximately 19 months earlier than planned.
        </p>

        <p className="text-green-400 mt-4 font-medium">
          Potential Time Saved: 19 Months 🚀
        </p>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-5">
              {editingId ? "Update Wishlist" : "Add Wishlist"}
            </h2>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Item Name"
                value={formData.itemName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    itemName: e.target.value,
                  })
                }
                className="w-full bg-slate-800 rounded-xl p-3"
              />

              <input
                type="number"
                placeholder="Target Amount"
                value={formData.targetAmount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    targetAmount: e.target.value,
                  })
                }
                className="w-full bg-slate-800 rounded-xl p-3"
              />

              <input
                type="number"
                placeholder="Saved Amount"
                value={formData.savedAmount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    savedAmount: e.target.value,
                  })
                }
                className="w-full bg-slate-800 rounded-xl p-3"
              />

              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value,
                  })
                }
                className="w-full bg-slate-800 rounded-xl p-3"
              >
                <option>High</option>

                <option>Medium</option>

                <option>Low</option>
              </select>

              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    targetDate: e.target.value,
                  })
                }
                className="w-full bg-slate-800 rounded-xl p-3"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-700"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-indigo-600"
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
