/**
 * Shared category budget progress bar.
 *
 * Renders a category name, a "spent / limit" readout, a gradient progress
 * bar that turns solid red when over budget, and a trailing status line
 * (either "X% used" + remaining amount, or an "Over by ₹X" warning).
 *
 * Used by Budget.jsx ("Category Budgets") and Analytics.jsx
 * ("Budget Utilization") so both pages share one implementation instead of
 * duplicating near-identical bar markup/logic.
 */
export default function CategoryProgressBar({
  name,
  spent,
  limit,
  accountName,
  accountIcon,
  className = "",
}) {
  const numericLimit = Number(limit) || 0;
  const numericSpent = Number(spent) || 0;

  const percentage =
    numericLimit > 0
      ? Math.min(100, Math.max(0, Math.round((numericSpent / numericLimit) * 100)))
      : 0;

  const isOverBudget = numericSpent > numericLimit;
  const remaining = Math.max(0, numericLimit - numericSpent);

  return (
    <div className={className}>
      <div className="flex flex-col md:flex-row md:justify-between mb-2 gap-1">
        <span className="font-medium">
          {accountIcon ? `${accountIcon} ` : ""}
          {name}
          {accountName && (
            <span className="text-slate-500 text-sm font-normal">
              {" "}
              · {accountName}
            </span>
          )}
        </span>

        <span className="text-slate-400">
          ₹{numericSpent.toLocaleString()}
          {" / "}₹{numericLimit.toLocaleString()}
        </span>
      </div>

      <div className="w-full bg-slate-700 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all ${
            isOverBudget
              ? "bg-red-500"
              : "bg-gradient-to-r from-cyan-500 to-indigo-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between mt-2 text-sm">
        <span className="text-slate-400">{percentage}% used</span>

        <span className={isOverBudget ? "text-red-400" : "text-green-400"}>
          {isOverBudget
            ? `Over by ₹${(numericSpent - numericLimit).toLocaleString()}`
            : `₹${remaining.toLocaleString()} left`}
        </span>
      </div>
    </div>
  );
}
