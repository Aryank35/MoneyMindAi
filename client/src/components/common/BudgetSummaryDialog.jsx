import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheck,
  FiCreditCard,
  FiHelpCircle,
} from "react-icons/fi";

import { money } from "../../utils/incomeFormulas";

// =========================================================================
// WHAT THE PLAN MEANS FOR EACH ACCOUNT
//
// Shown once the budget is saved. A plan is entered category by category,
// but it is lived account by account - the question the next morning is not
// "how much is Groceries" but "does Axis have enough in it".
//
// So this restates the plan the other way round, and says plainly where the
// money has to be for it to work.
// =========================================================================

const GROUP_TONE = {
  need: "text-sky-300",
  want: "text-amber-300",
  save: "text-emerald-300",
};

export default function BudgetSummaryDialog({ overview, onClose, onFixFunding }) {
  const funding = overview?.bankFunding;

  const banks = funding?.banks || [];
  const unassigned = funding?.unassigned || [];
  const onCards = funding?.onCards || [];
  const totals = funding?.totals || {};

  const short = banks.filter((bank) => bank.shortfall > 0);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-300">
          {overview?.month} is set: {money(overview?.totalBudget || 0)} across{" "}
          {overview?.categories?.length || 0}{" "}
          {overview?.categories?.length === 1 ? "category" : "categories"}.
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Here is the same plan seen from your accounts.
        </p>
      </div>

      {banks.length === 0 && unassigned.length === 0 && onCards.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-400">
          No category names an account yet. Assign one on each line and this
          will show what every account has to hold.
        </p>
      ) : (
        <ul className="space-y-2">
          {banks.map((bank) => (
            <li
              key={bank.accountId}
              className={`rounded-xl border p-3 ${
                bank.shortfall > 0
                  ? "border-amber-500/25 bg-amber-500/5"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {bank.icon} {bank.name}
                </span>

                <span className="shrink-0 text-xs tabular-nums text-slate-400">
                  needs {money(bank.required)} · holds {money(bank.balance)}
                </span>
              </div>

              {/* The categories themselves - the answer to "what is this
                  account actually for this month". */}
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {bank.lines.map((line) => (
                  <li
                    key={line.name}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs"
                  >
                    <span className="text-slate-300">{line.name}</span>

                    <span
                      className={`ml-1.5 tabular-nums ${GROUP_TONE[line.group] || "text-slate-500"}`}
                    >
                      {money(line.required)}
                    </span>
                  </li>
                ))}
              </ul>

              <p
                className={`mt-2 text-xs ${
                  bank.shortfall > 0 ? "text-amber-300" : "text-emerald-300"
                }`}
              >
                {bank.shortfall > 0 ? (
                  <>Short {money(bank.shortfall)}</>
                ) : (
                  <span className="flex items-center gap-1">
                    <FiCheck size={12} />
                    Covered
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Neither of these is a demand on a bank, so both are stated rather
          than folded into a shortfall that would be wrong. */}
      {onCards.length > 0 && (
        <p className="flex gap-2 rounded-xl border border-white/5 bg-black/20 p-2.5 text-xs text-slate-400">
          <FiCreditCard className="mt-0.5 shrink-0" />

          <span>
            {money(totals.onCards)} runs on a card —{" "}
            {onCards.map((item) => item.name).join(", ")}. No cash needs to sit
            anywhere for these; the card bill is what will want it.
          </span>
        </p>
      )}

      {unassigned.length > 0 && (
        <p className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-200">
          <FiHelpCircle className="mt-0.5 shrink-0" />

          <span>
            {money(totals.unassigned)} names no account —{" "}
            {unassigned.map((item) => item.name).join(", ")}. Give those a line
            account so they show up here.
          </span>
        </p>
      )}

      {short.length > 0 && (
        <p className="flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-100">
          <FiAlertTriangle className="mt-0.5 shrink-0" />

          <span>
            {short.length === 1
              ? `${short[0].name} does not hold enough for what you have planned from it.`
              : `${short.length} accounts do not hold enough for what you have planned from them.`}{" "}
            You can move money now or later.
          </span>
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm text-slate-100 transition hover:bg-slate-700"
        >
          Got it
        </button>

        {short.length > 0 && onFixFunding && (
          <button
            type="button"
            onClick={onFixFunding}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300"
          >
            Move money in
            <FiArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
