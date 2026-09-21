import { useState } from "react";
import { FiEdit2, FiPlus, FiTrash2, FiUsers } from "react-icons/fi";

import Button from "../common/Button";
import Input from "../common/Input";
import AmountInput from "../common/AmountInput";
import EmptyState from "../common/EmptyState";
import ConfirmDialog from "../common/ConfirmDialog";
import { useToast } from "../common/Toast";

import { evaluateExpression } from "../../utils/calc";
import { money } from "../../utils/incomeFormulas";

const blankLine = (category = "") => ({
  label: "",
  category,
  estimatedAmount: "",
  perHead: false,
  note: "",
});

// =========================================================================
// THE PLAN
//
// What you expect this to cost, line by line, against what it actually did.
//
// A line can be priced per head, which is the honest way to budget a trip -
// "1,200 a head for food" re-prices itself when a seventh person joins
// instead of quietly going stale.
// =========================================================================

export default function EventPlanTab({ event, onAdd, onUpdate, onRemove }) {
  const toast = useToast();

  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const headcount = Math.max(event.headcount, 1);
  const totals = event.totals;

  const startAdd = (category = "") => {
    setEditingId(null);
    setDraft(blankLine(category));
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setDraft({
      label: item.label,
      category: item.category || "",
      estimatedAmount: String(item.estimatedAmount ?? ""),
      perHead: Boolean(item.perHead),
      note: item.note || "",
    });
  };

  const save = async () => {
    if (!draft.label.trim()) {
      toast.error("Give this line a label");

      return;
    }

    const parsed = evaluateExpression(draft.estimatedAmount || "0");

    if (parsed.error) {
      toast.error(parsed.error);

      return;
    }

    try {
      setBusy(true);

      const payload = {
        label: draft.label,
        category: draft.category,
        estimatedAmount: parsed.value,
        perHead: draft.perHead,
        note: draft.note,
      };

      if (editingId) {
        await onUpdate("planItems", editingId, payload);
      } else {
        await onAdd("planItems", payload);
      }

      setDraft(null);
      setEditingId(null);
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Could not save that line");
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    try {
      setBusy(true);

      await onRemove("planItems", removing._id);

      setRemoving(null);
    } catch (error) {
      console.error(error);

      toast.error("Could not remove that line");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ---- estimate vs actual, headline ---- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Planned",
            value: totals.estimated,
            hint: `${event.planItems.length} line${event.planItems.length === 1 ? "" : "s"}`,
            tone: "text-white",
          },
          {
            label: "Budget cap",
            value: totals.budgetCap,
            hint:
              totals.budgetCap > 0
                ? totals.unplanned >= 0
                  ? `${money(totals.unplanned)} not itemised yet`
                  : `${money(Math.abs(totals.unplanned))} over your cap`
                : "None set",
            tone: totals.unplanned < 0 ? "text-amber-300" : "text-slate-200",
          },
          {
            label: "Actually spent",
            value: totals.actual,
            hint: `${totals.expenseCount} expense${totals.expenseCount === 1 ? "" : "s"}`,
            tone: "text-white",
          },
          {
            label: totals.variance > 0 ? "Over by" : "Still left",
            value: Math.abs(totals.variance > 0 ? totals.variance : totals.remaining),
            hint: `against ${money(totals.budgetLine)}`,
            tone: totals.variance > 0 ? "text-red-300" : "text-emerald-300",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <p className="text-xs uppercase tracking-wider text-slate-500">
              {card.label}
            </p>

            <p className={`mt-1 text-2xl font-semibold ${card.tone}`}>
              {money(card.value)}
            </p>

            <p className="mt-0.5 text-xs text-slate-500">{card.hint}</p>
          </div>
        ))}
      </div>

      {/* ---- per-head reality check ---- */}
      {event.headcount > 1 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-2 text-slate-400">
            <FiUsers size={14} />
            {event.headcount} people
          </span>

          <span className="text-slate-400">
            Planned{" "}
            <span className="font-semibold text-white">
              {money(totals.perHeadEstimated)}
            </span>{" "}
            a head
          </span>

          <span className="text-slate-400">
            Actual{" "}
            <span
              className={`font-semibold ${
                totals.perHeadActual > totals.perHeadEstimated
                  ? "text-red-300"
                  : "text-emerald-300"
              }`}
            >
              {money(totals.perHeadActual)}
            </span>{" "}
            a head
          </span>
        </div>
      )}

      {/* ---- the lines ---- */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Estimate</h3>

          {!draft && (
            <Button size="sm" icon={FiPlus} onClick={() => startAdd()}>
              Add a line
            </Button>
          )}
        </div>

        {draft && (
          <div className="mb-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="What"
                placeholder="Hotel, 2 nights"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />

              <div className="flex flex-col gap-1.5">
                <label htmlFor="plan-line-category" className="text-sm text-slate-400">
                  Budget head
                </label>

                <input
                  id="plan-line-category"
                  list="plan-line-categories"
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value })
                  }
                  placeholder="Stay"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />

                <datalist id="plan-line-categories">
                  {(event.typeMeta?.categories || []).map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>

              <AmountInput
                label={draft.perHead ? "Cost per person" : "Total cost"}
                value={draft.estimatedAmount}
                onChange={(e) =>
                  setDraft({ ...draft, estimatedAmount: e.target.value })
                }
                hint={
                  draft.perHead
                    ? `× ${headcount} people = ${money(
                        (evaluateExpression(draft.estimatedAmount).value || 0) *
                          headcount,
                      )}`
                    : undefined
                }
              />

              <Input
                label="Note"
                placeholder="Optional"
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </div>

            <button
              type="button"
              onClick={() => setDraft({ ...draft, perHead: !draft.perHead })}
              className={`mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                draft.perHead
                  ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-100"
                  : "border-white/10 text-slate-400 hover:border-white/25"
              }`}
            >
              <FiUsers size={14} />
              {draft.perHead ? "Priced per person" : "One flat cost"}
            </button>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDraft(null);
                  setEditingId(null);
                }}
                disabled={busy}
              >
                Cancel
              </Button>

              <Button size="sm" onClick={save} loading={busy}>
                {editingId ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        )}

        {event.planItems.length === 0 && !draft ? (
          <EmptyState
            title="Nothing estimated yet"
            message="Put down what you think this will cost. You can be rough — it is there to be compared against, not to be right."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {(event.typeMeta?.categories || []).slice(0, 5).map((category) => (
                  <button
                    key={category}
                    onClick={() => startAdd(category)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-indigo-500/40 hover:text-white"
                  >
                    + {category}
                  </button>
                ))}
              </div>
            }
          />
        ) : (
          <div className="space-y-2">
            {event.planItems.map((item) => (
              <div
                key={item._id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <span className="break-words">{item.label}</span>

                    {item.category && (
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-400">
                        {item.category}
                      </span>
                    )}

                    {item.perHead && (
                      <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs text-indigo-200">
                        {money(item.estimatedAmount)} × {headcount}
                      </span>
                    )}
                  </p>

                  {item.note && (
                    <p className="mt-0.5 text-xs text-slate-500">{item.note}</p>
                  )}
                </div>

                <span className="text-right font-semibold tabular-nums">
                  {money(item.estimate)}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(item)}
                    aria-label={`Edit ${item.label}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    <FiEdit2 size={15} />
                  </button>

                  <button
                    onClick={() => setRemoving(item)}
                    aria-label={`Remove ${item.label}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-red-300"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- where it went against where you said it would ---- */}
      {event.categories.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold">Planned against actual</h3>

          <p className="mb-3 text-sm text-slate-400">
            Every budget head, whether you planned for it or not. The ones with
            no estimate are what caught you out.
          </p>

          <div className="space-y-2">
            {event.categories.map((row) => {
              const over = row.variance > 0;
              const unplanned = row.estimated === 0 && row.actual > 0;

              return (
                <div
                  key={row.category}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="flex items-center gap-2 font-medium">
                      {row.category}

                      {unplanned && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200">
                          not planned
                        </span>
                      )}
                    </p>

                    <p className="text-sm tabular-nums text-slate-400">
                      <span className="font-semibold text-white">
                        {money(row.actual)}
                      </span>
                      {row.estimated > 0 && <> of {money(row.estimated)}</>}
                    </p>
                  </div>

                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${
                        unplanned
                          ? "bg-amber-400"
                          : over
                            ? "bg-red-400"
                            : "bg-emerald-400"
                      }`}
                      style={{
                        width: `${Math.min(
                          row.estimated > 0
                            ? (row.actual / row.estimated) * 100
                            : 100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-1.5 text-xs">
                    {row.actual === 0 ? (
                      <span className="text-slate-500">
                        Nothing spent here yet
                      </span>
                    ) : over ? (
                      <span className="text-red-300">
                        {money(row.variance)} over
                      </span>
                    ) : (
                      <span className="text-emerald-300">
                        {money(Math.abs(row.variance))} under
                      </span>
                    )}

                    <span className="text-slate-600"> · </span>
                    <span className="text-slate-500">
                      {money(row.mine)} of it yours
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        loading={busy}
        title="Remove this line?"
        message={
          removing
            ? `"${removing.label}" is ${money(removing.estimate)} of your estimate. Nothing you have actually spent is affected.`
            : ""
        }
        confirmLabel="Remove"
      />
    </div>
  );
}
