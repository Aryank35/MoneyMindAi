import { FiAlertTriangle, FiArrowRight, FiRepeat } from "react-icons/fi";

import { money } from "../../utils/incomeFormulas";

// =========================================================================
// SPENDING FROM THE WRONG ACCOUNT
//
// Appears only when the category's account and the account actually paying
// are different. It is a nudge, not a wall: the expense is real either way,
// and refusing to record it would just mean it goes untracked.
//
// The default action moves the money first and then saves, in that order -
// recording the expense first would briefly overdraw the account that is
// about to be topped up.
// =========================================================================

export default function CategoryFundingNotice({ plan, categoryName }) {
  if (!plan?.needed) return null;

  const { source, paying, amount, shortfall, partial, possible } = plan;

  return (
    <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
      <p className="flex gap-2 text-xs text-amber-100">
        <FiRepeat className="mt-0.5 shrink-0" />

        <span>
          <span className="font-semibold">{categoryName}</span> is funded from{" "}
          <span className="font-semibold">{source.name}</span>, but this is
          being paid from <span className="font-semibold">{paying.name}</span>.
        </span>
      </p>

      {/* The movement, drawn rather than described. */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5">
          <span className="text-slate-300">{source.name}</span>

          <span className="ml-1.5 tabular-nums text-slate-500">
            {money(source.balance)}
          </span>
        </span>

        <span className="flex items-center gap-1 text-amber-300">
          <FiArrowRight />
          <span className="font-semibold tabular-nums">{money(amount)}</span>
        </span>

        <span className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5">
          <span className="text-slate-300">{paying.name}</span>

          <span className="ml-1.5 tabular-nums text-slate-500">
            {money(paying.balance)}
          </span>
        </span>
      </div>

      {partial && (
        <p className="mt-2 flex gap-1.5 text-xs text-amber-200/80">
          <FiAlertTriangle className="mt-0.5 shrink-0" />

          <span>
            {source.name} only holds {money(source.balance)}, so{" "}
            {money(amount)} moves and {money(shortfall)} of this expense still
            comes from {paying.name}.
          </span>
        </p>
      )}

      {!possible && (
        <p className="mt-2 flex gap-1.5 text-xs text-red-200">
          <FiAlertTriangle className="mt-0.5 shrink-0" />

          <span>
            {source.name} has nothing to send, so this will simply be paid
            from {paying.name}. Worth moving the category onto that account if
            it keeps happening.
          </span>
        </p>
      )}

      <p className="mt-2 text-[11px] text-slate-500">
        Moving it keeps the plan and your balances in step. The transfer is
        recorded first, then the expense.
      </p>

      {/* The action itself lives on the save button, so there is one place
          to press and the order of operations cannot be got wrong. */}
      {!partial && possible && (
        <p className="mt-1 text-[11px] text-slate-500">
          Use <span className="text-amber-200">Transfer &amp; save</span> below
          to do both at once, or save on its own to leave balances as they are.
        </p>
      )}
    </div>
  );
}
