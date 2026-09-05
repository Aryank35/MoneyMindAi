import { useEffect, useState } from "react";
import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiFileText,
  FiInbox,
} from "react-icons/fi";

import Modal from "./Modal";
import Button from "./Button";
import EmptyState from "./EmptyState";
import { Skeleton } from "./Loader";
import { getAccountStatement } from "../../services/accountService";
import { money } from "../../utils/incomeFormulas";

// Local "YYYY-MM-DD" for <input type="date"> - toISOString() would shift the
// day backwards for anyone east of UTC.
const toInputDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0);

const KIND_META = {
  income: { label: "Income", icon: FiArrowDownLeft, tone: "text-emerald-300" },
  epf: { label: "EPF", icon: FiArrowDownLeft, tone: "text-cyan-300" },
  expense: { label: "Spend", icon: FiArrowUpRight, tone: "text-red-300" },
  "transfer-in": {
    label: "Transfer in",
    icon: FiArrowDownLeft,
    tone: "text-emerald-300",
  },
  "transfer-out": {
    label: "Transfer out",
    icon: FiArrowUpRight,
    tone: "text-red-300",
  },
};

const RANGES = [
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "last3", label: "Last 3 months" },
  { key: "year", label: "This year" },
];

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

// Statement for any account - bank, wallet or card. Opened from the account
// card, so it takes the account it should describe.
export default function StatementModal({ account, isOpen, onClose }) {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState("thisMonth");
  const [custom, setCustom] = useState(null);

  useEffect(() => {
    if (!isOpen || !account?._id) return undefined;

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const { from, to } = custom || rangeToDates(range);

      try {
        const response = await getAccountStatement(account._id, {
          from: new Date(
            from.getFullYear(),
            from.getMonth(),
            from.getDate(),
          ).toISOString(),
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

        if (!cancelled) setStatement(response.data);
      } catch (error) {
        console.error(error);
        if (!cancelled) setStatement(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, account?._id, range, custom]);

  const isCard = account?.type === "Credit Card";

  // A card's balance is negative when money is owed; showing "-₹12,000" reads
  // as an error, so cards are described in their own terms.
  const describeBalance = (value) => {
    if (!isCard) return money(value);

    if (value < 0) return `${money(-value)} owed`;

    if (value > 0) return `${money(value)} in credit`;

    return money(0);
  };

  const downloadCsv = () => {
    if (!statement?.entries?.length) return;

    const rows = [
      ["Date", "Type", "Description", "Note", "Amount", "Balance"],
      ...[...statement.entries].reverse().map((entry) => [
        new Date(entry.date).toLocaleDateString("en-IN"),
        KIND_META[entry.kind]?.label || entry.kind,
        entry.label,
        entry.note || "",
        entry.amount,
        entry.balance,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );

    const link = document.createElement("a");

    link.href = url;
    link.download = `${account.name}-statement.csv`.replace(/\s+/g, "-");
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={account ? `${account.name} — Statement` : "Statement"}
      maxWidth="max-w-4xl"
    >
      {/* Range picker */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((option) => (
          <button
            key={option.key}
            onClick={() => {
              setCustom(null);
              setRange(option.key);
            }}
            className={`rounded-xl border px-3 py-2 text-sm transition ${
              !custom && range === option.key
                ? "border-indigo-400/40 bg-indigo-400/10 text-indigo-200"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
            }`}
          >
            {option.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            aria-label="Statement from date"
            value={toInputDate((custom || rangeToDates(range)).from)}
            onChange={(event) => {
              const current = custom || rangeToDates(range);

              setCustom({
                from: new Date(event.target.value),
                to: current.to,
              });
            }}
            className="rounded-xl border border-white/10 bg-slate-800 p-2 text-sm"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            aria-label="Statement to date"
            value={toInputDate((custom || rangeToDates(range)).to)}
            onChange={(event) => {
              const current = custom || rangeToDates(range);

              setCustom({
                from: current.from,
                to: new Date(event.target.value),
              });
            }}
            className="rounded-xl border border-white/10 bg-slate-800 p-2 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      ) : !statement ? (
        <div className="mt-5">
          <EmptyState
            icon={FiFileText}
            title="Statement unavailable"
            message="Could not build a statement for this period."
          />
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[
              ["Opening", describeBalance(statement.openingBalance), ""],
              ["Credits", money(statement.totals.credits), "text-emerald-300"],
              ["Debits", money(statement.totals.debits), "text-red-300"],
              ["Closing", describeBalance(statement.closingBalance), ""],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-xl bg-slate-800/80 p-4">
                <p className="text-sm text-slate-400">{label}</p>
                <p className={`mt-1 break-words text-xl font-bold ${tone}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Ledger */}
          <div className="mt-5 overflow-x-auto">
            {statement.entries.length === 0 ? (
              <EmptyState
                icon={FiInbox}
                title="No activity"
                message="Nothing moved through this account in the selected period."
              />
            ) : (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.entries.map((entry) => {
                    const meta = KIND_META[entry.kind] || {
                      label: entry.kind,
                      icon: FiFileText,
                      tone: "text-slate-300",
                    };
                    const Icon = meta.icon;

                    return (
                      <tr key={entry.id} className="border-t border-white/5">
                        <td className="whitespace-nowrap p-3 text-slate-400">
                          {new Date(entry.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="p-3">
                          <span className="flex items-center gap-2">
                            <Icon className={meta.tone} />
                            <span>{entry.label}</span>
                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-500">
                              {meta.label}
                            </span>
                          </span>
                          {entry.note && (
                            <span className="mt-1 block text-xs text-slate-500">
                              {entry.note}
                            </span>
                          )}
                        </td>
                        <td
                          className={`whitespace-nowrap p-3 text-right font-semibold ${
                            entry.amount >= 0
                              ? "text-emerald-300"
                              : "text-red-300"
                          }`}
                        >
                          {entry.amount >= 0 ? "+" : "−"}
                          {money(Math.abs(entry.amount))}
                        </td>
                        <td className="whitespace-nowrap p-3 text-right text-slate-400">
                          {money(entry.balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={downloadCsv}
              disabled={!statement.entries.length}
            >
              Export CSV
            </Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
