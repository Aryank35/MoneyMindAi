import { FiAlertTriangle, FiCalendar, FiClock } from "react-icons/fi";

import { money } from "../../utils/incomeFormulas";

// =========================================================================
// SOMETHING IS ALREADY PLANNED HERE
//
// Shown when an expense would leave a category unable to cover the bills
// already scheduled against it. A budget line at 20,000 with nothing spent
// looks free - right up until you remember the 18,000 rent bill waiting in
// the planner.
//
// It warns, it does not block. The expense has happened in the real world
// whether or not the budget likes it, and refusing to record it would only
// mean it goes untracked. What this buys is the chance to think first.
// =========================================================================

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "";

export default function PlannedConflictDialog({
  conflict,
  onConfirm,
  onClose,
  busy = false,
}) {
  if (!conflict) return null;

  const {
    categoryName,
    limit,
    spent,
    amount,
    stillToPay,
    bills = [],
    shortfall,
    alreadyOver,
  } = conflict;

  return (
    <div className="space-y-4">
      <p className="flex gap-2.5 text-sm text-amber-100">
        <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-300" />

        <span>
          You have already planned{" "}
          <span className="font-semibold">{money(stillToPay)}</span> out of{" "}
          <span className="font-semibold">{categoryName}</span> this month.
          {alreadyOver
            ? " That line was already over before this expense."
            : ` Adding ${money(amount)} leaves it ${money(shortfall)} short.`}
        </span>
      </p>

      {/* The arithmetic, so the warning can be checked rather than trusted. */}
      <ul className="space-y-1.5 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-slate-400">{categoryName} budget</span>
          <span className="tabular-nums">{money(limit)}</span>
        </li>

        <li className="flex items-baseline justify-between gap-3">
          <span className="text-slate-500">Already spent</span>
          <span className="tabular-nums text-slate-400">−{money(spent)}</span>
        </li>

        <li className="flex items-baseline justify-between gap-3">
          <span className="text-slate-500">This expense</span>
          <span className="tabular-nums text-slate-400">−{money(amount)}</span>
        </li>

        <li className="flex items-baseline justify-between gap-3">
          <span className="text-slate-500">Planned, not yet paid</span>
          <span className="tabular-nums text-slate-400">
            −{money(stillToPay)}
          </span>
        </li>

        <li className="flex items-baseline justify-between gap-3 border-t border-white/5 pt-1.5 font-semibold">
          <span>Short by</span>
          <span className="tabular-nums text-red-300">{money(shortfall)}</span>
        </li>
      </ul>

      {/* Which bills, so it is obvious what is at stake. */}
      {bills.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
            <FiCalendar size={12} />
            Still to pay from {categoryName}
          </p>

          <ul className="space-y-1">
            {bills.map((bill) => (
              <li
                key={bill.scheduleId || bill.name}
                className="flex items-baseline justify-between gap-3 text-xs"
              >
                <span className="flex min-w-0 items-baseline gap-1.5">
                  <span className="truncate text-slate-300">{bill.name}</span>

                  {bill.isOverdue && (
                    <span className="flex shrink-0 items-center gap-1 text-red-300">
                      <FiClock size={10} />
                      overdue
                    </span>
                  )}
                </span>

                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="text-slate-600">
                    {formatDate(bill.date)}
                  </span>

                  <span className="tabular-nums text-slate-400">
                    {money(bill.amount)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Recording this is fine — the money has moved either way. You may want
        to raise the limit or move the planned bill to another category.
      </p>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm text-slate-100 transition hover:bg-slate-700 disabled:opacity-50"
        >
          Go back
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
        >
          Record it anyway
        </button>
      </div>
    </div>
  );
}
