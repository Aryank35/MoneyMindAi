import { useState } from "react";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheck,
  FiRefreshCw,
  FiUsers,
} from "react-icons/fi";

import { Skeleton } from "../common/Loader";
import { getEventSettlement } from "../../services/eventService";
import { money } from "../../utils/incomeFormulas";

// =========================================================================
// SETTLE UP
//
// Generated on a press, not kept live. A settlement only means anything once
// the spending has stopped, and a figure that moves after every bill is one
// nobody can act on.
//
// Every amount here is a whole rupee, and the parts add up to the total
// exactly - the rounding is done by largest remainder on the server rather
// than per person, so no rupee is lost or invented.
// =========================================================================

export default function SettleUpPanel({ eventId, expenseCount = 0 }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getEventSettlement(eventId);

      setResult(response.data);
    } catch (err) {
      console.error(err);

      setError(err?.response?.data?.message || "Could not work that out");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Settle up</h3>

          <p className="mt-0.5 text-xs text-slate-500">
            {expenseCount > 0
              ? `Work out who pays whom across all ${expenseCount} ${
                  expenseCount === 1 ? "expense" : "expenses"
                }.`
              : "Add some spending first and this will work out who pays whom."}
          </p>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={loading || expenseCount === 0}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:opacity-40"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} size={14} />
          {result ? "Recalculate" : "Generate split"}
        </button>
      </header>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
          {error}
        </p>
      )}

      {loading && !result && <Skeleton className="h-40 rounded-xl" />}

      {result && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-slate-400">Total spent</p>

              <p className="mt-1 text-lg font-bold tabular-nums">
                {money(result.total)}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-slate-400">People</p>

              <p className="mt-1 text-lg font-bold tabular-nums">
                {result.totals.people}
              </p>
            </div>

            <div className="col-span-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:col-span-1">
              <p className="text-xs text-slate-400">To change hands</p>

              <p className="mt-1 text-lg font-bold tabular-nums text-indigo-200">
                {money(result.totals.moving)}
              </p>
            </div>
          </div>

          {/* The answer. Each line is one transfer in whole rupees. */}
          {result.payments.length === 0 ? (
            <p className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
              <FiCheck />
              Everybody is already square.
            </p>
          ) : (
            <div>
              <p className="mb-2 text-xs text-slate-500">
                {result.payments.length}{" "}
                {result.payments.length === 1 ? "payment" : "payments"} settles
                everything — the fewest that can.
              </p>

              <ul className="space-y-2">
                {result.payments.map((payment, index) => (
                  <li
                    key={`${payment.from}-${payment.to}-${index}`}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${
                      payment.toIsMe
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : payment.fromIsMe
                          ? "border-amber-500/20 bg-amber-500/5"
                          : "border-white/10 bg-black/20"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <span className="truncate font-medium">
                        {payment.fromIsMe ? "You" : payment.from}
                      </span>

                      <FiArrowRight className="shrink-0 text-slate-500" />

                      <span className="truncate font-medium">
                        {payment.toIsMe ? "you" : payment.to}
                      </span>
                    </span>

                    <span
                      className={`shrink-0 text-sm font-bold tabular-nums ${
                        payment.toIsMe
                          ? "text-emerald-300"
                          : payment.fromIsMe
                            ? "text-amber-300"
                            : "text-slate-200"
                      }`}
                    >
                      {money(payment.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* The workings, for anyone who wants to check it. */}
          <details className="rounded-xl border border-white/10 bg-black/20 p-3">
            <summary className="cursor-pointer text-xs text-slate-400">
              How this was worked out
            </summary>

            <ul className="mt-2 space-y-1.5">
              {result.people.map((person) => (
                <li
                  key={person.key}
                  className="flex items-baseline justify-between gap-2 text-xs"
                >
                  <span className="truncate text-slate-300">
                    {person.isMe ? "You" : person.name}
                  </span>

                  <span className="shrink-0 tabular-nums text-slate-500">
                    paid {money(person.paid)} · used {money(person.owed)} ·{" "}
                    <span
                      className={
                        person.net > 0
                          ? "text-emerald-300"
                          : person.net < 0
                            ? "text-amber-300"
                            : "text-slate-400"
                      }
                    >
                      {person.net === 0
                        ? "square"
                        : person.net > 0
                          ? `+${money(person.net)}`
                          : `−${money(Math.abs(person.net))}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-2 text-[11px] text-slate-600">
              Shares are rounded to whole rupees so that each bill still adds
              up to exactly what it cost.
            </p>
          </details>

          {result.settledAlready > 0 && (
            <p className="text-xs text-slate-500">
              {money(result.settledAlready)} has already changed hands on these
              expenses. This plan is the full picture, not what is left.
            </p>
          )}

          {result.unsplittable?.length > 0 && (
            <p className="flex gap-2 text-xs text-amber-200">
              <FiAlertTriangle className="mt-0.5 shrink-0" />

              <span>
                Left out: {result.unsplittable.join(", ")} — no amount or
                nobody on it.
              </span>
            </p>
          )}
        </div>
      )}

      {!result && !loading && expenseCount === 0 && (
        <p className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
          <FiUsers />
          Nothing to settle yet.
        </p>
      )}
    </section>
  );
}
