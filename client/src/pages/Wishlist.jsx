import { useState, useEffect } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { FiCheckCircle } from "react-icons/fi";
import {
  getWishlistByUser,
  createWishlist,
  updateWishlist,
  deleteWishlist,
} from "../services/wishlistService";
import { getUserId } from "../utils/auth";

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
      const userId = getUserId();

      if (!userId) return;

      const response = await getWishlistByUser(userId);

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
        userId: getUserId(),
      };

      if (editingId) {
        await updateWishlist(editingId, payload);
      } else {
        await createWishlist(payload);
      }

      setShowModal(false);

      setEditingId(null);

      setFormData({
        itemName: "",
        targetAmount: "",
        savedAmount: "",
        priority: "Medium",
        targetDate: "",
      });

      await loadWishlist();
    } catch (error) {
      console.error(
        "Wishlist Save Error:",
        error.response?.data || error.message,
      );
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

  const calculateGoalMetrics = (targetAmount, savedAmount, targetDate) => {
    const remainingAmount = Number(targetAmount) - Number(savedAmount);

    const today = new Date();

    const endDate = new Date(targetDate);

    const daysRemaining = Math.max(
      1,
      Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)),
    );

    const requiredPerDay = remainingAmount / daysRemaining;

    const requiredPerMonth = requiredPerDay * 30;

    return {
      remainingAmount,

      daysRemaining,

      requiredPerDay,

      requiredPerMonth,
    };
  };

  const getGoalStatus = (savedAmount, targetAmount, daysRemaining) => {
    const progress = (savedAmount / targetAmount) * 100;

    if (progress >= 100) return "Completed";

    if (daysRemaining < 30) return "Urgent";

    if (progress >= 50) return "On Track";

    return "Behind";
  };

  const fastestGoal = [...wishlist].sort(
    (a, b) => (b.progressPercentage || 0) - (a.progressPercentage || 0),
  )[0];

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
          onClick={() => {
            setEditingId(null);

            setFormData({
              itemName: "",
              targetAmount: "",
              savedAmount: "",
              priority: "Medium",
              targetDate: "",
            });

            setShowModal(true);
          }}
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

      <div
        className="
    mb-8
    p-6
    rounded-3xl
    bg-gradient-to-r
    from-indigo-600/20
    to-purple-600/20
    border
    border-indigo-500/20
  "
      >
        <h2 className="text-xl font-bold">Closest Goal 🚀</h2>

        <p className="mt-3 text-slate-300">
          {fastestGoal
            ? `${fastestGoal.itemName} is your closest goal.`
            : "No goals available."}
        </p>
      </div>

      {/* Savings Pots */}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {wishlist?.map((item) => {
          const metrics = calculateGoalMetrics(
            item.targetAmount,
            item.savedAmount,
            item.targetDate,
          );

          const progress = Math.min(
            (item.savedAmount / item.targetAmount) * 100,
            100,
          );

          const status = getGoalStatus(
            item.savedAmount,
            item.targetAmount,
            metrics.daysRemaining,
          );

          const statusColor = {
            Completed: "bg-green-500/20 text-green-400",

            "On Track": "bg-blue-500/20 text-blue-400",

            Behind: "bg-orange-500/20 text-orange-400",

            Urgent: "bg-red-500/20 text-red-400",
          };

          return (
            <div
              key={item._id}
              className="
          bg-gradient-to-br
          from-indigo-500/10
          via-purple-500/10
          to-pink-500/10

          border
          border-white/10

          rounded-3xl
          p-6

          hover:scale-[1.02]
          transition-all
          duration-300
        "
            >
              {/* Header */}

              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{item.itemName}</h3>

                  <p className="text-slate-400 text-sm">
                    Target: {new Date(item.targetDate).toLocaleDateString()}
                  </p>
                </div>

                <span
                  className={`
              px-3
              py-1
              rounded-full
              text-xs
              font-medium
              ${statusColor[status]}
            `}
                >
                  {status}
                </span>
              </div>

              {/* Amount */}

              <div className="mt-6">
                <div className="flex justify-between">
                  <span>Saved</span>

                  <span className="font-semibold">
                    ₹{Number(item.savedAmount).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between mt-2">
                  <span>Goal</span>

                  <span className="font-semibold">
                    ₹{Number(item.targetAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Progress */}

              <div className="mt-5">
                <div className="w-full h-3 bg-slate-700 rounded-full">
                  <div
                    className="
                h-3
                rounded-full
                bg-gradient-to-r
                from-indigo-500
                to-pink-500
              "
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between mt-2 text-sm">
                  <span>{progress.toFixed(0)}%</span>

                  <span>₹{metrics.remainingAmount.toLocaleString()} left</span>
                </div>
              </div>

              {/* Insights */}

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs text-slate-400">Per Day</p>

                  <h4 className="font-semibold">
                    ₹{Math.ceil(metrics.requiredPerDay)}
                  </h4>
                </div>

                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs text-slate-400">Per Month</p>

                  <h4 className="font-semibold">
                    ₹{Math.ceil(metrics.requiredPerMonth)}
                  </h4>
                </div>

                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs text-slate-400">Days Left</p>

                  <h4 className="font-semibold">{metrics.daysRemaining}</h4>
                </div>

                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs text-slate-400">Priority</p>

                  <h4 className="font-semibold">{item.priority}</h4>
                </div>
              </div>

              {/* Actions */}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => handleEdit(item)}
                  className="
              flex-1
              bg-indigo-600
              py-2
              rounded-xl
            "
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(item._id)}
                  className="
              flex-1
              bg-red-600
              py-2
              rounded-xl
            "
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
                onClick={() => {
                  setShowModal(false);

                  setEditingId(null);

                  setFormData({
                    itemName: "",
                    targetAmount: "",
                    savedAmount: "",
                    priority: "Medium",
                    targetDate: "",
                  });
                }}
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
