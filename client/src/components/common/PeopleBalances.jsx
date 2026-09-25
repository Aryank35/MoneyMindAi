import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowDownLeft,
  FiArrowUpRight,
  FiChevronDown,
  FiUsers,
} from "react-icons/fi";

import EmptyState from "./EmptyState";
import { Skeleton } from "./Loader";
import { getPeopleBalances } from "../../services/obligationService";
import { getUserId } from "../../utils/auth";
import { money } from "../../utils/incomeFormulas";

// =========================================================================
// WHO OWES WHOM
//
// One balance per person, netted across loans and split shares - the two
// places money between you and someone else was being tracked separately.
//
// The net leads, but the lines behind it are always one tap away: a balance
// that cannot be explained is a balance nobody acts on.
// =========================================================================

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "";

function Person({ person }) {
  const [open, setOpen] = useState(false);

  const owed = person.direction === "owesMe";
  const settled = person.direction === "settled";

  return (
    <li className="rounded-xl border border-white/10 bg-black/20 p-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
              settled
                ? "bg-white/5 text-slate-400"
                : owed
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-amber-400/10 text-amber-300"
            }`}
          >
            {person.name.charAt(0).toUpperCase()}
          </span>

          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {person.name}
            </span>

            <span className="block text-xs text-slate-500">
              {settled
                ? "Square with each other"
                : owed
                  ? "owes you"
                  : "you owe"}
              {person.bothWays && " · both ways"}
              {person.overdue && (
                <span className="ml-1 text-red-300">· overdue</span>
              )}
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          <span
            className={`text-sm font-semibold tabular-nums ${
              settled
                ? "text-slate-400"
                : owed
                  ? "text-emerald-300"
                  : "text-amber-300"
            }`}
          >
            {money(Math.abs(person.net))}
          </span>

          <FiChevronDown
            className={`shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {/* The workings. Shown for anyone who asks, because a netted figure
          that cannot be broken down does not get trusted or acted on. */}
      {open && (
        <div className="mt-3 border-t border-white/5 pt-3">
          {person.bothWays && (
            <p className="mb-2 text-xs text-slate-500">
              {money(person.owesMe)} owed to you, {money(person.iOwe)} owed by
              you.
            </p>
          )}

          <ul className="space-y-1.5">
            {person.items.map((item) => (
              <li
                key={`${item.source}-${item.id}-${item.direction}`}
                className="flex items-baseline justify-between gap-2 text-xs"
              >
                <span className="flex min-w-0 items-baseline gap-1.5">
                  {item.direction === "owesMe" ? (
                    <FiArrowDownLeft className="shrink-0 text-emerald-300" />
                  ) : (
                    <FiArrowUpRight className="shrink-0 text-amber-300" />
                  )}

                  <span className="truncate text-slate-300">{item.label}</span>

                  <span className="shrink-0 rounded bg-white/5 px-1.5 text-[10px] uppercase tracking-wide text-slate-500">
                    {item.source}
                  </span>
                </span>

                <span className="flex shrink-0 items-baseline gap-2">
                  {item.date && (
                    <span className="text-slate-600">
                      {formatDate(item.date)}
                    </span>
                  )}

                  <span className="tabular-nums text-slate-400">
                    {money(item.amount)}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {/* Each line is settled where it lives: a split share on the split,
              a loan on the loan. Settling it here would leave the other page
              showing a debt that no longer exists. */}
          <p className="mt-2 text-[11px] text-slate-600">
            Settle a split on the Splits page, a loan on Lending.
          </p>
        </div>
      )}
    </li>
  );
}

export default function PeopleBalances({
  refreshKey,
  title = "Who owes whom",
  limit,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const userId = getUserId();

        if (!userId) return;

        const response = await getPeopleBalances(userId);

        if (!cancelled) setData(response.data);
      } catch (error) {
        console.error("People balances error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) return <Skeleton className="h-52 rounded-2xl" />;

  if (!data) return null;

  const { people = [], totals = {} } = data;

  const shown = limit ? people.slice(0, limit) : people;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold">{title}</h3>

        {totals.people > 0 && (
          <span className="text-xs text-slate-500">
            {totals.people} {totals.people === 1 ? "person" : "people"}
          </span>
        )}
      </header>

      {people.length === 0 ? (
        <EmptyState
          icon={FiUsers}
          title="Nobody owes anybody"
          message="Split shares and loans that are still outstanding appear here, netted per person."
          className="border-none bg-transparent py-6"
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-xs text-slate-400">Owed to you</p>

              <p className="mt-1 text-lg font-bold tabular-nums text-emerald-300">
                {money(totals.owedToMe)}
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs text-slate-400">You owe</p>

              <p className="mt-1 text-lg font-bold tabular-nums text-amber-300">
                {money(totals.iOwe)}
              </p>
            </div>
          </div>

          {/* Where the money came from, since the whole point is that these
              two used to be counted in different places. */}
          {(totals.fromSplits > 0 || totals.fromLoans > 0) && (
            <p className="mb-3 text-xs text-slate-500">
              {money(totals.fromSplits)} from splits ·{" "}
              {money(totals.fromLoans)} from loans
            </p>
          )}

          <ul className="space-y-2">
            {shown.map((person) => (
              <Person key={person.key} person={person} />
            ))}
          </ul>

          {limit && people.length > limit && (
            <Link
              to="/lending"
              className="mt-3 inline-block text-xs text-indigo-300 transition hover:underline"
            >
              {people.length - limit} more
            </Link>
          )}

          {people.some((person) => person.overdue) && (
            <p className="mt-3 flex gap-2 text-xs text-red-200">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              Someone is past the date they promised to settle.
            </p>
          )}
        </>
      )}
    </section>
  );
}
