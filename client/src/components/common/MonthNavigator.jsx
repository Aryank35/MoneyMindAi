import { useEffect, useRef, useState } from "react";
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

import { money } from "../../utils/incomeFormulas";

// =========================================================================
// MONTH NAVIGATOR
//
// A budget belongs to one month. This moves between them, and says plainly
// which kind of month is on screen - a finished one that can only be read, the
// live one, or one being planned ahead - because the same figures mean
// different things in each.
// =========================================================================

const shiftKey = (monthKey, delta) => {
  const [year, month] = monthKey.split("-").map(Number);

  const date = new Date(year, month - 1 + delta, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const labelFor = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

export default function MonthNavigator({
  monthKey,
  months = [],
  currentKey,
  onSelect,
}) {
  const [open, setOpen] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClick);

    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!monthKey) return null;

  const isPast = monthKey < currentKey;
  const isFuture = monthKey > currentKey;

  const state = isPast
    ? { label: "Past month", tone: "bg-slate-500/15 text-slate-300 border-slate-500/25" }
    : isFuture
      ? { label: "Planning ahead", tone: "bg-indigo-400/15 text-indigo-200 border-indigo-400/25" }
      : { label: "This month", tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" };

  // Months with a plan, plus the one on screen even when it has none yet, so
  // stepping into an empty month never empties the list it came from.
  const listed = months.some((entry) => entry.monthKey === monthKey)
    ? months
    : [
        { monthKey, month: labelFor(monthKey), hasBudget: false, totalBudget: 0 },
        ...months,
      ].sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => onSelect(shiftKey(monthKey, -1))}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20"
      >
        <FiChevronLeft />
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:border-white/20"
        >
          <FiCalendar className="shrink-0 text-slate-400" />

          <span className="text-sm font-semibold">{labelFor(monthKey)}</span>

          <FiChevronDown
            className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute left-0 z-30 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-2 shadow-xl">
            {listed.map((entry) => {
              const selected = entry.monthKey === monthKey;

              return (
                <button
                  key={entry.monthKey}
                  type="button"
                  onClick={() => {
                    onSelect(entry.monthKey);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-white/5 ${
                    selected ? "bg-white/5" : ""
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {selected ? (
                      <FiCheck size={12} className="shrink-0 text-indigo-300" />
                    ) : (
                      <span className="w-3 shrink-0" />
                    )}

                    <span className="min-w-0">
                      <span className="block truncate text-sm">
                        {entry.month || labelFor(entry.monthKey)}
                      </span>

                      {entry.monthKey === currentKey && (
                        <span className="block text-xs text-emerald-300">
                          This month
                        </span>
                      )}
                    </span>
                  </span>

                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {entry.hasBudget ? money(entry.totalBudget) : "No plan"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Next month"
        onClick={() => onSelect(shiftKey(monthKey, 1))}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20"
      >
        <FiChevronRight />
      </button>

      <span
        className={`rounded-full border px-2.5 py-1 text-xs ${state.tone}`}
      >
        {state.label}
      </span>

      {monthKey !== currentKey && (
        <button
          type="button"
          onClick={() => onSelect(currentKey)}
          className="rounded-lg px-2 py-1 text-xs text-indigo-300 transition hover:bg-white/5"
        >
          Back to this month
        </button>
      )}
    </div>
  );
}
