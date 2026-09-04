import { useState, useEffect } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Button from "../components/common/Button";
import Input, { Select } from "../components/common/Input";
import EmptyState from "../components/common/EmptyState";
import { PageLoader } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";
import { FiCheckCircle, FiPlus, FiTarget } from "react-icons/fi";
import {
  getWishlistByUser,
  createWishlist,
  updateWishlist,
  deleteWishlist,
} from "../services/wishlistService";
import { getUserId } from "../utils/auth";

const EMPTY_FORM = {
  itemName: "",
  targetAmount: "",
  savedAmount: "",
  priority: "Medium",
  targetDate: "",
};

const PRIORITY_COLOR = {
  High: "bg-red-500/20 text-red-400",
  Medium: "bg-yellow-500/20 text-yellow-400",
  Low: "bg-slate-500/20 text-slate-300",
};

export default function Wishlist() {
  const toast = useToast();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadWishlist = async () => {
    try {
      const userId = getUserId();

      if (!userId) return;

      const response = await getWishlistByUser(userId);

      setWishlist(response.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load wishlist goals");
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        ...formData,
        userId: getUserId(),
      };

      if (editingId) {
        await updateWishlist(editingId, payload);
        toast.success("Goal updated successfully");
      } else {
        await createWishlist(payload);
        toast.success("Goal added successfully");
      }

      closeModal();

      await loadWishlist();
    } catch (error) {
      console.error("Wishlist Save Error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await deleteWishlist(deleteTarget._id);
      toast.success("Goal deleted");
      setDeleteTarget(null);
      await loadWishlist();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete goal");
    } finally {
      setDeleting(false);
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
    const load = async () => {
      await loadWishlist();
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalGoals = wishlist.length;

  const completedGoals = wishlist.filter(
    (item) => Number(item.savedAmount) >= Number(item.targetAmount),
  ).length;

  const activeGoals = totalGoals - completedGoals;

  const calculateGoalMetrics = (targetAmount, savedAmount, targetDate) => {
    const target = Number(targetAmount) || 0;
    const saved = Number(savedAmount) || 0;
    const remainingAmount = target - saved;

    const endDate = targetDate ? new Date(targetDate) : null;
    const isValidDate = endDate && !Number.isNaN(endDate.getTime());

    const today = new Date();

    const daysRemaining = isValidDate
      ? Math.max(1, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)))
      : null;

    const requiredPerDay =
      daysRemaining && target > 0 ? remainingAmount / daysRemaining : 0;

    const requiredPerMonth = requiredPerDay * 30;

    return {
      remainingAmount,
      daysRemaining,
      requiredPerDay,
      requiredPerMonth,
      hasValidDate: isValidDate,
    };
  };

  const getGoalStatus = (savedAmount, targetAmount, daysRemaining) => {
    const target = Number(targetAmount) || 0;
    const saved = Number(savedAmount) || 0;

    if (target <= 0) return "Behind";

    const progress = (saved / target) * 100;

    if (progress >= 100) return "Completed";

    if (daysRemaining != null && daysRemaining < 30) return "Urgent";

    if (progress >= 50) return "On Track";

    return "Behind";
  };

  const fastestGoal = [...wishlist]
    .filter((item) => Number(item.targetAmount) > 0)
    .sort((a, b) => {
      const progressA = (Number(a.savedAmount) / Number(a.targetAmount)) * 100;
      const progressB = (Number(b.savedAmount) / Number(b.targetAmount)) * 100;
      return progressB - progressA;
    })[0];

  const insightMetrics = fastestGoal
    ? calculateGoalMetrics(
        fastestGoal.targetAmount,
        fastestGoal.savedAmount,
        fastestGoal.targetDate,
      )
    : null;

  const monthsEarlier =
    insightMetrics && insightMetrics.requiredPerMonth > 0
      ? Math.max(
          1,
          Math.round(
            insightMetrics.remainingAmount /
              Math.max(insightMetrics.requiredPerMonth, 1) /
              2,
          ),
        )
      : null;

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader label="Loading your wishlist goals..." />
      </DashboardLayout>
    );
  }

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

        <Button icon={FiPlus} onClick={openAddModal}>
          Add Wishlist
        </Button>
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

      {totalGoals > 0 && (
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/20">
          <h2 className="text-xl font-bold">Closest Goal 🚀</h2>

          <p className="mt-3 text-slate-300">
            {fastestGoal
              ? `${fastestGoal.itemName} is your closest goal.`
              : "No goals available."}
          </p>
        </div>
      )}

      {/* Goals grid */}
      {totalGoals === 0 ? (
        <EmptyState
          icon={FiTarget}
          title="No wishlist goals yet"
          message="Start tracking a savings goal — like a trip, a gadget, or a big purchase."
          action={
            <Button icon={FiPlus} onClick={openAddModal}>
              Add Wishlist
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {wishlist.map((item) => {
            const metrics = calculateGoalMetrics(
              item.targetAmount,
              item.savedAmount,
              item.targetDate,
            );

            const target = Number(item.targetAmount) || 0;
            const saved = Number(item.savedAmount) || 0;

            const progress =
              target > 0 ? Math.min((saved / target) * 100, 100) : 0;

            const status = getGoalStatus(saved, target, metrics.daysRemaining);

            const statusColor = {
              Completed: "bg-green-500/20 text-green-400",
              "On Track": "bg-blue-500/20 text-blue-400",
              Behind: "bg-orange-500/20 text-orange-400",
              Urgent: "bg-red-500/20 text-red-400",
            };

            return (
              <div
                key={item._id}
                className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-white/10 rounded-3xl p-6 hover:scale-[1.02] transition-all duration-300"
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{item.itemName}</h3>

                    <p className="text-slate-400 text-sm">
                      Target:{" "}
                      {metrics.hasValidDate
                        ? new Date(item.targetDate).toLocaleDateString()
                        : "Not set"}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[status]}`}
                  >
                    {status}
                  </span>
                </div>

                {/* Amount */}
                <div className="mt-6">
                  <div className="flex justify-between">
                    <span>Saved</span>

                    <span className="font-semibold">
                      ₹{saved.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between mt-2">
                    <span>Goal</span>

                    <span className="font-semibold">
                      ₹{target.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-5">
                  <div className="w-full h-3 bg-slate-700 rounded-full">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between mt-2 text-sm">
                    <span>{progress.toFixed(0)}%</span>

                    <span>
                      ₹{metrics.remainingAmount.toLocaleString()} left
                    </span>
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

                    <h4 className="font-semibold">
                      {metrics.hasValidDate ? metrics.daysRemaining : "—"}
                    </h4>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl">
                    <p className="text-xs text-slate-400">Priority</p>

                    <span
                      className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        PRIORITY_COLOR[item.priority] ||
                        PRIORITY_COLOR.Medium
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => handleEdit(item)}
                  >
                    Edit
                  </Button>

                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => setDeleteTarget(item)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Insight */}
      {fastestGoal ? (
        <div className="mt-8 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <FiCheckCircle className="text-green-400" size={24} />

            <h3 className="text-xl font-semibold">AI Goal Insight</h3>
          </div>

          <p className="text-slate-300 mt-4 leading-relaxed">
            {monthsEarlier
              ? `If you save ₹${Math.ceil(
                  insightMetrics.requiredPerMonth,
                ).toLocaleString()} every month, you'll reach your ${
                  fastestGoal.itemName
                } goal approximately ${monthsEarlier} month${
                  monthsEarlier === 1 ? "" : "s"
                } earlier than planned.`
              : `Keep contributing toward ${fastestGoal.itemName} — set a target date to see a personalized savings pace.`}
          </p>

          {monthsEarlier && (
            <p className="text-green-400 mt-4 font-medium">
              Potential Time Saved: {monthsEarlier} Month
              {monthsEarlier === 1 ? "" : "s"} 🚀
            </p>
          )}
        </div>
      ) : (
        totalGoals > 0 && (
          <EmptyState
            className="mt-8"
            icon={FiCheckCircle}
            title="No AI insight available yet"
            message="Add a target amount and date to your goals to see personalized savings insights."
          />
        )
      )}

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId ? "Update Wishlist" : "Add Wishlist"}
      >
        <div className="space-y-4">
          <Input
            label="Item Name"
            type="text"
            placeholder="e.g. Royal Enfield Hunter"
            value={formData.itemName}
            onChange={(e) =>
              setFormData({ ...formData, itemName: e.target.value })
            }
          />

          <Input
            label="Target Amount"
            type="number"
            placeholder="Target Amount"
            value={formData.targetAmount}
            onChange={(e) =>
              setFormData({ ...formData, targetAmount: e.target.value })
            }
          />

          <Input
            label="Saved Amount"
            type="number"
            placeholder="Saved Amount"
            value={formData.savedAmount}
            onChange={(e) =>
              setFormData({ ...formData, savedAmount: e.target.value })
            }
          />

          <Select
            label="Priority"
            value={formData.priority}
            onChange={(e) =>
              setFormData({ ...formData, priority: e.target.value })
            }
          >
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </Select>

          <Input
            label="Target Date"
            type="date"
            value={formData.targetDate}
            onChange={(e) =>
              setFormData({ ...formData, targetDate: e.target.value })
            }
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={closeModal} disabled={saving}>
            Cancel
          </Button>

          <Button onClick={handleSave} loading={saving}>
            Save
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete goal?"
        message={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.itemName}". This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleting}
      />
    </DashboardLayout>
  );
}
