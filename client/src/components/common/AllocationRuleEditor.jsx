import { useState } from "react";
import { FiCheck, FiRotateCcw } from "react-icons/fi";

import { money } from "../../utils/incomeFormulas";

// =========================================================================
// ALLOCATION RULE
//
// The needs / wants / savings split. 50-30-20 is the starting point, not the
// law: it assumes a shape of life that plenty of people do not have. So the
// classic is the default until touched, and every share is editable after.
//
// The three must come to 100. Rather than block on that, the remainder is
// shown live and the third share can be inferred - adjusting two numbers and
// having the last one follow is how people actually think about a split.
// =========================================================================

const PRESETS = [
  {
    key: "classic",
    label: "50 / 30 / 20",
    hint: "The classic",
    rule: { need: 50, want: 30, save: 20 },
  },
  {
    key: "saver",
    label: "50 / 20 / 30",
    hint: "Save harder",
    rule: { need: 50, want: 20, save: 30 },
  },
  {
    key: "tight",
    label: "70 / 20 / 10",
    hint: "Costs are high",
    rule: { need: 70, want: 20, save: 10 },
  },
  {
    key: "aggressive",
    label: "40 / 20 / 40",
    hint: "Building fast",
    rule: { need: 40, want: 20, save: 40 },
  },
];

const GROUPS = [
  { key: "need", label: "Needs", hint: "Rent, food, bills, transport", tone: "text-sky-300", bar: "bg-sky-400" },
  { key: "want", label: "Wants", hint: "Eating out, trips, subscriptions", tone: "text-amber-300", bar: "bg-amber-400" },
  { key: "save", label: "Savings & investing", hint: "Pots, funds, repayments beyond the minimum", tone: "text-emerald-300", bar: "bg-emerald-400" },
];

// Not exported: a file that exports anything but its component loses fast
// refresh, and nothing outside needs this - the server owns the real default.
const DEFAULT_RULE = { need: 50, want: 30, save: 20 };

export default function AllocationRuleEditor({
  rule,
  totalBudget = 0,
  onSave,
  busy = false,
  readOnly = false,
}) {
  // Seeded once. Switching months remounts this through a `key`, which is
  // both simpler and safer than re-seeding from an effect - that would also
  // overwrite an edit in progress the moment the parent re-rendered.
  const [draft, setDraft] = useState(rule || DEFAULT_RULE);

  const total = GROUPS.reduce(
    (sum, group) => sum + Number(draft[group.key] || 0),
    0,
  );

  const balanced = total === 100;

  const dirty = GROUPS.some(
    (group) => Number(draft[group.key]) !== Number((rule || DEFAULT_RULE)[group.key]),
  );

  // What is saved, for the subtitle.
  const savedIsDefault = GROUPS.every(
    (group) => Number((rule || DEFAULT_RULE)[group.key]) === DEFAULT_RULE[group.key],
  );

  // What is on screen, for the reset button - which is wanted the moment a
  // different preset is picked, not only after it has been saved.
  const draftIsDefault = GROUPS.every(
    (group) => Number(draft[group.key]) === DEFAULT_RULE[group.key],
  );

  const setShare = (key, value) => {
    const next = Math.max(0, Math.min(100, Number(value) || 0));

    setDraft((current) => ({ ...current, [key]: next }));
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Your split</h3>

          <p className="mt-0.5 text-xs text-slate-500">
            {savedIsDefault
              ? "Using the standard 50 / 30 / 20 until you change it"
              : "Customised"}
          </p>
        </div>

        {!readOnly && !draftIsDefault && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setDraft(DEFAULT_RULE)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-white/20 disabled:opacity-50"
          >
            <FiRotateCcw size={12} />
            Back to 50 / 30 / 20
          </button>
        )}
      </header>

      {!readOnly && (
        <div className="mb-4 flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const active = GROUPS.every(
              (group) => Number(draft[group.key]) === preset.rule[group.key],
            );

            return (
              <button
                key={preset.key}
                type="button"
                disabled={busy}
                onClick={() => setDraft(preset.rule)}
                className={`rounded-xl border px-3 py-2 text-left transition disabled:opacity-50 ${
                  active
                    ? "border-indigo-400/50 bg-indigo-400/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <span className="block text-sm font-medium tabular-nums">
                  {preset.label}
                </span>

                <span className="block text-xs text-slate-500">
                  {preset.hint}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Live preview of the split itself. */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        {GROUPS.map((group) => (
          <div
            key={group.key}
            className={`h-full transition-all duration-300 ${group.bar}`}
            style={{ width: `${Math.min(Number(draft[group.key]) || 0, 100)}%` }}
          />
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {GROUPS.map((group) => (
          <div key={group.key} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${group.tone}`}>
                {group.label}
              </p>

              <p className="truncate text-xs text-slate-500">{group.hint}</p>
            </div>

            {/* The rupee value is what makes a percentage mean something. */}
            {totalBudget > 0 && (
              <span className="shrink-0 text-xs tabular-nums text-slate-400">
                {money(Math.round((totalBudget * (Number(draft[group.key]) || 0)) / 100))}
              </span>
            )}

            <div className="flex shrink-0 items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                inputMode="numeric"
                aria-label={`${group.label} percentage`}
                disabled={readOnly || busy}
                value={draft[group.key] ?? 0}
                onChange={(event) => setShare(group.key, event.target.value)}
                className="w-16 rounded-lg border border-slate-700 bg-slate-800 p-2 text-right text-sm tabular-nums outline-none transition-colors focus:border-indigo-500 disabled:opacity-50"
              />

              <span className="text-xs text-slate-500">%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
        <p
          className={`text-xs ${
            balanced ? "text-slate-500" : "text-amber-300"
          }`}
        >
          {balanced ? (
            "Adds up to 100%"
          ) : (
            <>
              Adds up to {total}% — {total > 100 ? "over" : "short"} by{" "}
              {Math.abs(100 - total)}%
            </>
          )}
        </p>

        {!readOnly && (
          <button
            type="button"
            disabled={!balanced || !dirty || busy}
            onClick={() => onSave?.(draft)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:opacity-40"
          >
            <FiCheck size={14} />
            Save split
          </button>
        )}
      </div>
    </section>
  );
}
