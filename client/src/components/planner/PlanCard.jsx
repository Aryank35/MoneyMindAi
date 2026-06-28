import {
  FiCheck,
  FiDollarSign,
  FiEdit2,
  FiEye,
  FiTrash2,
} from "react-icons/fi";
import {
  formatDate,
  money,
  priorityClasses,
  statusClasses,
} from "./plannerUtils";

export default function PlanCard({
  plan,
  onComplete,
  onContribute,
  onDelete,
  onEdit,
  onView,
}) {
  const progress = Math.min(Number(plan.completionPercentage || 0), 100);

  return (
    <article className="group rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-bold"
            style={{
              backgroundColor: `${plan.color || "#6366F1"}24`,
              color: plan.color || "#A5B4FC",
            }}
          >
            {String(plan.title || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">{plan.title}</h3>
            <p className="truncate text-sm text-slate-400">{plan.category}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs ${priorityClasses[plan.priority]}`}
          >
            {plan.priority}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs ${statusClasses[plan.status]}`}
          >
            {plan.status}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-400">Estimated</p>
          <p className="break-words font-semibold">{money(plan.estimatedAmount)}</p>
        </div>
        <div>
          <p className="text-slate-400">Saved</p>
          <p className="break-words font-semibold text-emerald-300">
            {money(plan.savedAmount)}
          </p>
        </div>
        <div>
          <p className="text-slate-400">Remaining</p>
          <p className="break-words font-semibold text-amber-300">
            {money(plan.remainingAmount)}
          </p>
        </div>
        <div>
          <p className="text-slate-400">Target</p>
          <p className="font-semibold">{formatDate(plan.targetDate)}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-slate-400">Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-slate-900/70 p-3 text-sm">
        <div>
          <p className="text-slate-400">Days Left</p>
          <p className="font-semibold">{plan.daysRemaining || 0}</p>
        </div>
        <div>
          <p className="text-slate-400">Monthly Need</p>
          <p className="break-words font-semibold">{money(plan.monthlySaving)}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2">
        <button
          onClick={() => onView(plan)}
          className="rounded-lg bg-slate-800 p-2 text-slate-200 hover:bg-slate-700"
          title="View"
        >
          <FiEye className="mx-auto" />
        </button>
        <button
          onClick={() => onEdit(plan)}
          className="rounded-lg bg-cyan-500/10 p-2 text-cyan-200 hover:bg-cyan-500/20"
          title="Edit"
        >
          <FiEdit2 className="mx-auto" />
        </button>
        <button
          onClick={() => onContribute(plan)}
          className="rounded-lg bg-emerald-500/10 p-2 text-emerald-200 hover:bg-emerald-500/20"
          title="Contribute"
        >
          <FiDollarSign className="mx-auto" />
        </button>
        <button
          onClick={() => onComplete(plan)}
          className="rounded-lg bg-indigo-500/10 p-2 text-indigo-200 hover:bg-indigo-500/20"
          title="Complete"
        >
          <FiCheck className="mx-auto" />
        </button>
        <button
          onClick={() => onDelete(plan)}
          className="rounded-lg bg-rose-500/10 p-2 text-rose-200 hover:bg-rose-500/20"
          title="Delete"
        >
          <FiTrash2 className="mx-auto" />
        </button>
      </div>
    </article>
  );
}
