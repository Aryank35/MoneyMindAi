import { useEffect, useState } from "react";
import SavingCalculator from "./SavingCalculator";
import {
  categoryMeta,
  planCategories,
  priorities,
  repeatFrequencies,
} from "./plannerUtils";

const emptyForm = {
  title: "",
  category: "Vacation",
  description: "",
  estimatedAmount: "",
  savedAmount: "",
  targetDate: "",
  priority: "Medium",
  linkedAccountId: "",
  linkedWishlistId: "",
  linkedBudgetCategory: "",
  inflationRate: "",
  autoSave: false,
  repeat: false,
  repeatFrequency: "None",
  notes: "",
  attachments: "",
};

export default function PlanModal({
  accounts,
  budgets,
  editingPlan,
  onClose,
  onSave,
  wishlist,
}) {
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (editingPlan) {
      setFormData({
        ...emptyForm,
        ...editingPlan,
        linkedAccountId:
          editingPlan.linkedAccountId?._id || editingPlan.linkedAccountId || "",
        linkedWishlistId:
          editingPlan.linkedWishlistId?._id || editingPlan.linkedWishlistId || "",
        targetDate: editingPlan.targetDate
          ? new Date(editingPlan.targetDate).toISOString().split("T")[0]
          : "",
        attachments: Array.isArray(editingPlan.attachments)
          ? editingPlan.attachments.join(", ")
          : editingPlan.attachments || "",
      });
    } else {
      setFormData({
        ...emptyForm,
        linkedAccountId: accounts[0]?._id || "",
      });
    }
  }, [accounts, editingPlan]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = () => {
    const meta = categoryMeta[formData.category] || categoryMeta.Other;

    onSave({
      ...formData,
      icon: meta.icon,
      color: meta.color,
      estimatedAmount: Number(formData.estimatedAmount || 0),
      savedAmount: Number(formData.savedAmount || 0),
      inflationRate: Number(formData.inflationRate || 0),
      attachments: formData.attachments
        ? formData.attachments.split(",").map((item) => item.trim()).filter(Boolean)
        : [],
    });
  };

  const budgetCategories = budgets.flatMap((budget) =>
    (budget.categories || []).map((category) => category.name),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Future Planner</p>
            <h2 className="text-2xl font-bold">
              {editingPlan ? "Edit Plan" : "Add Plan"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
          >
            Close
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-300">
            Title
            <input
              value={formData.title}
              onChange={(event) => handleChange("title", event.target.value)}
              className="mt-1 w-full rounded-lg bg-slate-800 p-3"
            />
          </label>

          <label className="text-sm text-slate-300">
            Category
            <select
              value={formData.category}
              onChange={(event) => handleChange("category", event.target.value)}
              className="mt-1 w-full rounded-lg bg-slate-800 p-3"
            >
              {planCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Priority
            <select
              value={formData.priority}
              onChange={(event) => handleChange("priority", event.target.value)}
              className="mt-1 w-full rounded-lg bg-slate-800 p-3"
            >
              {priorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Estimated Amount
            <input
              type="number"
              value={formData.estimatedAmount}
              onChange={(event) =>
                handleChange("estimatedAmount", event.target.value)
              }
              className="mt-1 w-full rounded-lg bg-slate-800 p-3"
            />
          </label>

          <label className="text-sm text-slate-300">
            Saved Amount
            <input
              type="number"
              value={formData.savedAmount}
              onChange={(event) =>
                handleChange("savedAmount", event.target.value)
              }
              className="mt-1 w-full rounded-lg bg-slate-800 p-3"
            />
          </label>

          <label className="text-sm text-slate-300">
            Target Date
            <input
              type="date"
              value={formData.targetDate}
              onChange={(event) => handleChange("targetDate", event.target.value)}
              className="mt-1 w-full rounded-lg bg-slate-800 p-3"
            />
          </label>

          <label className="text-sm text-slate-300 md:col-span-3">
            Description
            <textarea
              value={formData.description}
              onChange={(event) =>
                handleChange("description", event.target.value)
              }
              className="mt-1 min-h-20 w-full rounded-lg bg-slate-800 p-3"
            />
          </label>

          <label className="text-sm text-slate-300">
            Linked Account
            <select
              value={formData.linkedAccountId || ""}
              onChange={(event) =>
                handleChange("linkedAccountId", event.target.value)
              }
              className="mt-1 w-full rounded-lg bg-slate-800 p-3"
            >
              <option value="">No linked account</option>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Linked Savings Pot
            <select
              value={formData.linkedWishlistId || ""}
              onChange={(event) =>
                handleChange("linkedWishlistId", event.target.value)
              }
              className="mt-1 w-full rounded-lg bg-slate-800 p-3"
            >
              <option value="">No linked savings pot</option>
              {wishlist.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.itemName}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Budget Category
            <input
              list="budget-categories"
              value={formData.linkedBudgetCategory}
              onChange={(event) =>
                handleChange("linkedBudgetCategory", event.target.value)
              }
              className="mt-1 w-full rounded-lg bg-slate-800 p-3"
            />
            <datalist id="budget-categories">
              {[...new Set(budgetCategories)].map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>

          <label className="text-sm text-slate-300">
            Expected Inflation %
            <input
              type="number"
              value={formData.inflationRate}
              onChange={(event) =>
                handleChange("inflationRate", event.target.value)
              }
              className="mt-1 w-full rounded-lg bg-slate-800 p-3"
            />
          </label>

          <label className="text-sm text-slate-300">
            Repeat Frequency
            <select
              value={formData.repeatFrequency}
              onChange={(event) =>
                handleChange("repeatFrequency", event.target.value)
              }
              className="mt-1 w-full rounded-lg bg-slate-800 p-3"
            >
              {repeatFrequencies.map((frequency) => (
                <option key={frequency}>{frequency}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Attachments
            <input
              value={formData.attachments}
              onChange={(event) =>
                handleChange("attachments", event.target.value)
              }
              placeholder="Comma separated links"
              className="mt-1 w-full rounded-lg bg-slate-800 p-3"
            />
          </label>

          <label className="flex items-center gap-3 rounded-lg bg-slate-800 p-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={formData.autoSave}
              onChange={(event) => handleChange("autoSave", event.target.checked)}
            />
            Auto Save
          </label>

          <label className="flex items-center gap-3 rounded-lg bg-slate-800 p-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={formData.repeat}
              onChange={(event) => handleChange("repeat", event.target.checked)}
            />
            Repeat
          </label>

          <label className="text-sm text-slate-300 md:col-span-3">
            Notes
            <textarea
              value={formData.notes}
              onChange={(event) => handleChange("notes", event.target.value)}
              className="mt-1 min-h-20 w-full rounded-lg bg-slate-800 p-3"
            />
          </label>
        </div>

        <div className="mt-5">
          <SavingCalculator formData={formData} />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Save Plan
          </button>
        </div>
      </div>
    </div>
  );
}
