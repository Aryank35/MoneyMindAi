import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiArrowDownLeft,
  FiArrowUpRight,
  FiInbox,
  FiSearch,
} from "react-icons/fi";

import EmptyState from "./EmptyState";
import { Skeleton } from "./Loader";
import { getUserTransactions } from "../../services/accountService";
import { getUserId } from "../../utils/auth";
import { money } from "../../utils/incomeFormulas";

// Everything that can move an account balance, and how to describe it.
// `spend` marks the kinds that are genuinely spending - the rest left the
// account without being spent, which is why the two totals are shown apart.
const KINDS = {
  expense: { label: "Expense", spend: true, tone: "text-red-300" },
  split: { label: "Split share", spend: true, tone: "text-red-300" },
  income: { label: "Income", tone: "text-emerald-300" },
  epf: { label: "EPF", tone: "text-cyan-300" },
  "transfer-in": { label: "Transfer in", tone: "text-emerald-300" },
  "transfer-out": { label: "Transfer out", tone: "text-slate-300" },
  "pot-funding": { label: "Into a pot", tone: "text-indigo-300" },
  "pot-withdrawal": { label: "Out of a pot", tone: "text-indigo-300" },
  lent: { label: "Lent out", tone: "text-amber-300" },
  borrowed: { label: "Borrowed", tone: "text-amber-300" },
  "repayment-in": { label: "Repaid to you", tone: "text-emerald-300" },
  "repayment-out": { label: "You repaid", tone: "text-slate-300" },
  "split-advance": { label: "Advanced on a split", tone: "text-amber-300" },
};

const RANGES = [
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "last3", label: "Last 3 months" },
  { key: "year", label: "This year" },
];

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const rangeToDates = (key) => {
  const now = new Date();

  switch (key) {
    case "lastMonth": {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case "last3":
      return {
        from: startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
        to: endOfMonth(now),
      };
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfMonth(now) };
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
};

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// Every movement across every account. Read-only on purpose: each kind is
// edited on the page that owns it, and letting a loan be edited as if it
// were an expense would put the two out of step.
export default function TransactionsPanel({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("thisMonth");
  const [kindFilter, setKindFilter] = useState("all");
  const [flow, setFlow] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const { from, to } = rangeToDates(range);

      try {
        const response = await getUserTransactions(getUserId(), {
          from: from.toISOString(),
          to: new Date(
            to.getFullYear(),
            to.getMonth(),
            to.getDate(),
            23,
            59,
            59,
            999,
          ).toISOString(),
        });

        if (!cancelled) setData(response.data);
      } catch (error) {
        console.error(error);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [range, refreshKey]);

  const rows = useMemo(() => {
    const all = data?.transactions || [];

    return all.filter((row) => {
      const haystack = [row.label, row.detail, row.note, row.accountName]
        .join(" ")
        .toLowerCase();

      return (
        (kindFilter === "all" || row.kind === kindFilter) &&
        (flow === "all" ||
          (flow === "out" ? row.amount < 0 : row.amount > 0)) &&
        haystack.includes(search.toLowerCase())
      );
    });
  }, [data?.transactions, kindFilter, flow, search]);

  const totals = data?.totals || {
    count: 0,
    inflow: 0,
    outflow: 0,
    net: 0,
    spending: 0,
    movedNotSpent: 0,
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      {/* Totals - spending held apart from money merely moved */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Money in", money(totals.inflow), "text-emerald-300"],
          ["Money out", money(totals.outflow), "text-red-300"],
          [
            "Of that, spending",
            money(totals.spending),
            "",
            "Expenses and split shares",
          ],
          [
            "Moved, not spent",
            money(totals.movedNotSpent),
            "text-slate-300",
            "Pots, lending, transfers",
          ],
        ].map(([label, value, tone, sub]) => (
          <div key={label} className="rounded-xl bg-slate-800/80 p-4">
            <p className="text-sm text-slate-400">{label}</p>
            <p className={`mt-1 break-words text-xl font-bold ${tone || ""}`}>
              {value}
            </p>
            {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {RANGES.map((option) => (
          <button
            key={option.key}
            onClick={() => setRange(option.key)}
            className={`rounded-xl border px-3 py-2 text-sm transition ${
              range === option.key
                ? "border-indigo-400/40 bg-indigo-400/10 text-indigo-200"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
            }`}
          >
            {option.label}
          </button>
        ))}

        <div className="relative ml-auto">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            aria-label="Search transactions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="rounded-xl border border-white/10 bg-slate-800 p-2.5 pl-9 text-sm"
          />
        </div>

        <select
          aria-label="Filter by type"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-800 p-2.5 text-sm"
        >
          <option value="all">All types</option>
          {(data?.byKind || []).map((entry) => (
            <option key={entry.kind} value={entry.kind}>
              {KINDS[entry.kind]?.label || entry.kind} ({entry.count})
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by direction"
          value={flow}
          onChange={(e) => setFlow(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-800 p-2.5 text-sm"
        >
          <option value="all">In and out</option>
          <option value="out">Money out</option>
          <option value="in">Money in</option>
        </select>
      </div>

      {/* Ledger */}
      <div className="mt-4 overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState
            icon={FiInbox}
            title="No transactions"
            message="Nothing moved through your accounts in this period."
          />
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Description</th>
                <th className="p-3">Type</th>
                <th className="p-3">Account</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const meta = KINDS[row.kind] || {
                  label: row.kind,
                  tone: "text-slate-300",
                };

                return (
                  <tr key={row.id} className="border-t border-white/5">
                    <td className="whitespace-nowrap p-3 text-slate-400">
                      {formatDate(row.date)}
                    </td>
                    <td className="p-3">
                      <span className="flex items-center gap-2">
                        {row.amount >= 0 ? (
                          <FiArrowDownLeft className="shrink-0 text-emerald-300" />
                        ) : (
                          <FiArrowUpRight className={`shrink-0 ${meta.tone}`} />
                        )}
                        <span className="break-words">{row.label}</span>
                      </span>
                      {(row.detail || row.note) && (
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {[row.detail, row.note].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full bg-white/5 px-2 py-0.5 text-xs ${meta.tone}`}
                      >
                        {meta.label}
                      </span>
                      {!meta.spend && row.amount < 0 && (
                        <span
                          className="ml-1 text-xs text-slate-600"
                          title="Left the account but is not spending"
                        >
                          not spend
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400">{row.accountName}</td>
                    <td
                      className={`whitespace-nowrap p-3 text-right font-semibold ${
                        row.amount >= 0 ? "text-emerald-300" : "text-red-300"
                      }`}
                    >
                      {row.amount >= 0 ? "+" : "−"}
                      {money(Math.abs(row.amount))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
        <FiAlertCircle className="mt-0.5 shrink-0" />
        Read-only. Each entry is edited where it was created — an expense on
        this page, a loan on Lending, a pot contribution on Pots.
      </p>
    </div>
  );
}
