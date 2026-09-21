import { useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiCheck,
  FiChevronRight,
  FiPlus,
  FiZap,
} from "react-icons/fi";

import { money } from "../../utils/incomeFormulas";

// =========================================================================
// BUDGET OVERVIEW
//
// The plan set against what actually happened. Built to make the four things
// that used to hide impossible to miss:
//
//   - spending on lines that were never budgeted
//   - a category that ran past its limit
//   - a plan larger than the money behind it
//   - a split that has drifted away from the 50/30/20 intent
// =========================================================================

const GROUP_TONE = {
  need: {
    bar: "bg-sky-400",
    text: "text-sky-300",
    soft: "bg-sky-400/10 border-sky-400/20",
  },
  want: {
    bar: "bg-amber-400",
    text: "text-amber-300",
    soft: "bg-amber-400/10 border-amber-400/20",
  },
  save: {
    bar: "bg-emerald-400",
    text: "text-emerald-300",
    soft: "bg-emerald-400/10 border-emerald-400/20",
  },
};

const pct = (value, total) =>
  total > 0 ? Math.min(Math.round((value / total) * 100), 100) : 0;

function Bar({ value, limit, over }) {
  const filled = pct(Math.min(value, limit), limit);

  // The overspend rides on the same track in a different colour, so a line
  // that ran past its limit reads as "past it" rather than just "full".
  const spill = limit > 0 ? Math.min(Math.round((over / limit) * 100), 100 - filled) : 0;

  return (
    <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full transition-all duration-500 ${
          over > 0 ? "bg-red-400/70" : "bg-indigo-400"
        }`}
        style={{ width: `${filled}%` }}
      />

      {spill > 0 && (
        <div className="h-full bg-red-400" style={{ width: `${spill}%` }} />
      )}
    </div>
  );
}

export default function BudgetOverview({
  overview,
  onApplyProposal,
  onCoverOverspend,
  onAdoptCategory,
  onEditPlan,
  busy = false,
}) {
  const [covering, setCovering] = useState(null);

  const {
    totalBudget = 0,
    categories = [],
    unbudgeted = [],
    groups = [],
    totals = {},
    funding = {},
    proposal = {},
    month = "",
    hasBudget = false,
  } = overview || {};

  const sorted = useMemo(
    () =>
      [...categories].sort(
        (a, b) => Number(b.isOver) - Number(a.isOver) || b.spent - a.spent,
      ),
    [categories],
  );

  const coverFor = covering
    ? categories.find((item) => item.name === covering)
    : null;

  // Sources for covering: unallocated first, then any line with real
  // headroom. Mirrors the server helper; a line cannot fund itself, and a
  // line already at its limit has nothing to give.
  const coverSources = useMemo(() => {
    if (!coverFor) return [];

    const list = [];

    if (totals.unallocated > 0) {
      list.push({
        kind: "unallocated",
        name: "Unallocated",
        available: totals.unallocated,
      });
    }

    for (const item of categories) {
      if (item.name === coverFor.name) continue;

      const headroom = Math.max(item.limit - item.spent, 0);

      if (headroom > 0) {
        list.push({ kind: "category", name: item.name, available: headroom });
      }
    }

    return list.sort((a, b) => b.available - a.available);
  }, [coverFor, categories, totals.unallocated]);

  if (!hasBudget) return null;

  const spent = totals.totalSpent || 0;

  const used = totals.percentUsed || 0;

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------------
          The month at a glance.
          --------------------------------------------------------------- */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-400">{month}</p>

            <p className="mt-1 text-2xl sm:text-3xl font-bold tabular-nums">
              {money(spent)}
              <span className="ml-2 text-base font-normal text-slate-500">
                of {money(totalBudget)}
              </span>
            </p>
          </div>

          <div className="text-right">
            <p
              className={`text-xl font-bold tabular-nums ${
                totals.net < 0 ? "text-red-300" : "text-emerald-300"
              }`}
            >
              {totals.net < 0
                ? `${money(Math.abs(totals.net))} over`
                : `${money(totals.remaining)} left`}
            </p>

            <p className="text-xs text-slate-500">{used}% of plan used</p>
          </div>
        </div>

        <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full transition-all duration-700 ${
              used > 100 ? "bg-red-400" : used > 85 ? "bg-amber-400" : "bg-indigo-400"
            }`}
            style={{ width: `${Math.min(used, 100)}%` }}
          />
        </div>

        {/* The single most useful sentence on the page when it applies. */}
        {totals.unbudgetedTotal > 0 && (
          <p className="mt-3 text-xs text-slate-400">
            Includes{" "}
            <span className="font-semibold text-amber-300">
              {money(totals.unbudgetedTotal)}
            </span>{" "}
            spent on things your plan does not mention.
          </p>
        )}

        {totals.overspend > 0 && (
          <p className="mt-1 text-xs text-slate-400">
            <span className="font-semibold text-red-300">
              {money(totals.overspend)}
            </span>{" "}
            of that ran past a category limit.
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------------
          Is the plan backed by money that exists?
          --------------------------------------------------------------- */}
      {funding.cashAware && funding.unfunded > 0 && (
        <section className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="flex min-w-0 gap-2 text-sm text-amber-100">
              <FiAlertTriangle className="mt-0.5 shrink-0" />

              <span>
                <span className="font-semibold">
                  {money(funding.unfunded)}
                </span>{" "}
                of what is left in your plan has no cash behind it. You have{" "}
                {money(funding.safeToSpend)} free, against{" "}
                {money(funding.remainingPlan)} still planned.
              </span>
            </p>

            {proposal.needed && proposal.changes?.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onApplyProposal?.(proposal)}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
              >
                <FiZap />
                Fit plan to cash
              </button>
            )}
          </div>

          {proposal.needed && proposal.changes?.length > 0 && (
            <div className="mt-3 border-t border-amber-500/20 pt-3">
              <p className="text-xs text-amber-200/80">
                Wants give way first, then savings. No limit is cut below what
                you have already spent on it.
              </p>

              <ul className="mt-2 space-y-1">
                {proposal.changes.map((change) => (
                  <li
                    key={change.name}
                    className="flex items-baseline justify-between gap-3 text-xs"
                  >
                    <span className="truncate text-amber-100">
                      {change.name}
                    </span>

                    <span className="shrink-0 tabular-nums text-amber-200/80">
                      {money(change.from)} → {money(change.to)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Cutting essentials is arithmetically valid and terrible
                  advice, so it is never presented as routine. */}
              {proposal.cutsNeeds && (
                <p className="mt-2 text-xs font-medium text-red-200">
                  This reaches into your needs. Consider bringing money in or
                  drawing on savings instead of cutting essentials.
                </p>
              )}

              {proposal.unresolved > 0 && (
                <p className="mt-2 text-xs text-red-200">
                  {money(proposal.unresolved)} still cannot be covered — your
                  committed spending is already past your cash.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------
          50 / 30 / 20.
          --------------------------------------------------------------- */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold">
            Needs, wants &amp; savings
          </h3>

          <span className="text-xs text-slate-500">
            target {groups.map((group) => group.targetPercent).join(" / ")}
          </span>
        </header>

        {/* One stacked bar reads the split faster than three rings, and
            survives a narrow screen without reflowing. */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
          {groups.map((group) => (
            <div
              key={group.key}
              className={`h-full transition-all duration-700 ${GROUP_TONE[group.key].bar}`}
              style={{ width: `${group.actualPercent}%` }}
              title={`${group.label}: ${group.actualPercent}%`}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {groups.map((group) => {
            const tone = GROUP_TONE[group.key];

            const off = Math.abs(group.drift) > totalBudget * 0.05;

            return (
              <div
                key={group.key}
                className={`rounded-xl border p-3 ${tone.soft}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`text-sm font-medium ${tone.text}`}>
                    {group.label}
                  </p>

                  <p className="shrink-0 text-xs tabular-nums text-slate-400">
                    {group.actualPercent}%
                  </p>
                </div>

                <p className="mt-1 text-lg font-bold tabular-nums">
                  {money(group.limit)}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  target {money(group.target)}
                  {off && (
                    <span
                      className={
                        group.drift > 0 ? " text-amber-300" : " text-sky-300"
                      }
                    >
                      {" "}
                      · {group.drift > 0 ? "+" : "−"}
                      {money(Math.abs(group.drift))}
                    </span>
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {money(group.spent)} spent
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------------------
          The lines themselves.
          --------------------------------------------------------------- */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold">Categories</h3>

          {onEditPlan && (
            <button
              type="button"
              onClick={onEditPlan}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-indigo-300 transition hover:bg-white/5"
            >
              Edit plan
              <FiChevronRight />
            </button>
          )}
        </header>

        <ul className="space-y-3">
          {sorted.map((item) => (
            <li key={item.name}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-sm">{item.name}</span>

                  <span
                    className={`shrink-0 text-[10px] uppercase tracking-wide ${GROUP_TONE[item.group].text}`}
                  >
                    {item.group}
                  </span>
                </span>

                <span className="shrink-0 text-xs tabular-nums text-slate-400">
                  {money(item.spent)} / {money(item.limit)}
                </span>
              </div>

              <Bar value={item.spent} limit={item.limit} over={item.over} />

              {item.isOver && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-red-300">
                    {money(item.over)} over
                  </span>

                  {onCoverOverspend && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setCovering(covering === item.name ? null : item.name)
                      }
                      className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:border-white/20 disabled:opacity-50"
                    >
                      Cover it
                    </button>
                  )}
                </div>
              )}

              {/* Covering moves budget, not money: it raises this limit and
                  lowers another, so the plan still adds up. */}
              {covering === item.name && (
                <div className="mt-2 rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  {coverSources.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Nothing has room to give. Raising the total budget is the
                      only way to cover this.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-slate-400">
                        Move {money(item.over)} into {item.name} from:
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {coverSources.map((source) => {
                          const enough = source.available >= item.over;

                          return (
                            <button
                              key={source.name}
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                onCoverOverspend?.({
                                  target: item.name,
                                  source,
                                  amount: Math.min(item.over, source.available),
                                });

                                setCovering(null);
                              }}
                              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs transition hover:border-indigo-400/40 disabled:opacity-50"
                            >
                              {source.name}
                              <span className="ml-1.5 tabular-nums text-slate-500">
                                {money(source.available)}
                                {!enough && " (partial)"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------
          Spending the plan never mentioned. The whole point of rule 1.
          --------------------------------------------------------------- */}
      {unbudgeted.length > 0 && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-6">
          <header className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-amber-100">
              Spent outside the plan
            </h3>

            <span className="text-lg font-bold tabular-nums text-amber-200">
              {money(totals.unbudgetedTotal)}
            </span>
          </header>

          <p className="mb-3 text-xs text-amber-200/70">
            Trips, one-offs and anything with a category your budget does not
            have. It still left your account, so it counts toward the month.
          </p>

          <ul className="space-y-2">
            {unbudgeted.map((item) => (
              <li
                key={item.name}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 p-2.5"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-sm">{item.name}</span>

                  <span className="shrink-0 text-xs text-slate-500">
                    {item.count} {item.count === 1 ? "entry" : "entries"}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">
                    {money(item.spent)}
                  </span>

                  {onAdoptCategory && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onAdoptCategory(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:border-indigo-400/40 disabled:opacity-50"
                    >
                      <FiPlus size={12} />
                      Add to plan
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Quietly reassuring when everything is in order. */}
      {unbudgeted.length === 0 && totals.overspend === 0 && funding.isFunded && (
        <p className="flex items-center justify-center gap-2 text-xs text-emerald-300">
          <FiCheck />
          Every rupee this month landed inside your plan.
        </p>
      )}
    </div>
  );
}
