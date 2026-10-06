import { useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiCheck,
  FiClock,
  FiRepeat,
  FiX,
} from "react-icons/fi";

import { Skeleton } from "./Loader";
import { useToast } from "./Toast";
import {
  getDueAutoDebits,
  postAutoDebits,
} from "../../services/investmentService";
import { getUserId } from "../../utils/auth";
import { money } from "../../utils/incomeFormulas";

// =========================================================================
// AUTO-DEBITS THAT HAVE COME DUE
//
// A SIP on the 5th cannot fire by itself - there is no background job here.
// So the moment the app is opened, anything that would have gone out today
// or on a day already past is gathered up and shown.
//
// It asks rather than posting silently. These are real debits against real
// balances, and money that moves without being seen is the kind of thing
// that makes an app untrustworthy. One tap records them all; each row can
// also be dropped if the bank did not actually take it.
// =========================================================================

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

export default function DueAutoDebits({ onPosted }) {
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [skip, setSkip] = useState({});

  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const userId = getUserId();

        if (!userId) return;

        const response = await getDueAutoDebits(userId);

        if (!cancelled) setData(response.data);
      } catch (error) {
        console.error("Auto-debits:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  if (loading) return <Skeleton className="h-28 rounded-2xl" />;

  const due = data?.due || [];

  if (dismissed || due.length === 0) return null;

  const chosen = due.filter((item) => !skip[`${item.investmentId}-${item.monthKey}`]);

  const total = chosen.reduce((sum, item) => sum + item.amount, 0);

  const shortAccounts = (data.byAccount || []).filter((entry) => entry.short);

  const post = async () => {
    if (chosen.length === 0) return;

    try {
      setPosting(true);

      const response = await postAutoDebits(
        getUserId(),
        chosen.map((item) => ({
          investmentId: item.investmentId,
          monthKey: item.monthKey,
          date: item.date,
        })),
      );

      const posted = response.data?.posted?.length || 0;

      toast.success(
        `${posted} instalment${posted === 1 ? "" : "s"} recorded · ${money(
          response.data?.total || 0,
        )}`,
      );

      setReloadToken((value) => value + 1);

      onPosted?.();
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Could not record those");
    } finally {
      setPosting(false);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-indigo-400/25 bg-indigo-400/5 p-4 sm:p-5">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2.5">
          <FiRepeat className="mt-0.5 shrink-0 text-indigo-300" />

          <div className="min-w-0">
            <p className="text-sm font-semibold text-indigo-100">
              {due.length} standing instruction
              {due.length === 1 ? "" : "s"} came due
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              {data.totals.overdue > 0
                ? `${data.totals.overdue} of them while the app was closed. `
                : ""}
              Nothing has been recorded yet.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Hide for now"
          className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:text-white"
        >
          <FiX size={16} />
        </button>
      </header>

      <ul className="space-y-1.5">
        {due.map((item) => {
          const key = `${item.investmentId}-${item.monthKey}`;

          const skipped = Boolean(skip[key]);

          return (
            <li
              key={key}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2.5 transition ${
                skipped
                  ? "border-white/5 bg-black/10 opacity-50"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSkip((s) => ({ ...s, [key]: !s[key] }))}
                  aria-label={skipped ? `Include ${item.name}` : `Skip ${item.name}`}
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition ${
                    skipped
                      ? "border-white/25"
                      : "border-indigo-400 bg-indigo-400 text-slate-950"
                  }`}
                >
                  {!skipped && <FiCheck size={11} />}
                </button>

                <span className="min-w-0">
                  <span className="block truncate text-sm">{item.name}</span>

                  <span className="block truncate text-xs text-slate-500">
                    {item.accountName} · {formatDate(item.date)}
                    {item.isOverdue && (
                      <span className="ml-1.5 text-amber-300">
                        <FiClock size={9} className="inline" /> missed
                      </span>
                    )}
                  </span>
                </span>
              </span>

              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {money(item.amount)}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Said before the money moves, not after it overdraws something. */}
      {shortAccounts.length > 0 && (
        <p className="mt-3 flex gap-2 text-xs text-amber-200">
          <FiAlertTriangle className="mt-0.5 shrink-0" />

          <span>
            {shortAccounts.map((entry) => entry.name).join(", ")}{" "}
            {shortAccounts.length === 1 ? "does" : "do"} not hold enough for
            what is due from {shortAccounts.length === 1 ? "it" : "them"}.
          </span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
        <p className="text-xs text-slate-400">
          {chosen.length === due.length
            ? `${money(total)} will leave your accounts`
            : `${chosen.length} of ${due.length} selected · ${money(total)}`}
        </p>

        <button
          type="button"
          onClick={post}
          disabled={posting || chosen.length === 0}
          className="rounded-xl bg-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:opacity-40"
        >
          {posting ? "Recording…" : "Record these"}
        </button>
      </div>
    </section>
  );
}
