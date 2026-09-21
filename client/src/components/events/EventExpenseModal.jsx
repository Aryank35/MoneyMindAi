import { useEffect, useState } from "react";
import {
  FiCornerUpLeft,
  FiGift,
  FiPlus,
  FiUserPlus,
  FiX,
} from "react-icons/fi";

import Modal from "../common/Modal";
import Button from "../common/Button";
import Input, { Select } from "../common/Input";
import AmountInput from "../common/AmountInput";
import { useToast } from "../common/Toast";

import { evaluateExpression } from "../../utils/calc";
import { money } from "../../utils/incomeFormulas";
import { previewShares, round2, summariseSplit } from "../../utils/splitShares";

const toInputDate = (value) => {
  const date = value ? new Date(value) : new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

const METHODS = [
  { key: "equal", label: "Equally" },
  { key: "exact", label: "Exact amounts" },
  { key: "shares", label: "By shares" },
  { key: "percentage", label: "By %" },
];

// =========================================================================
// EVENT EXPENSE
//
// One bill from an event. It is saved as a split, which is what makes the
// money behave: the account is debited for the whole bill, only the user's
// own cost is booked as spending, and the remainder is tracked as owed.
//
// The piece this form adds over an ordinary split is the per-person
// "coming back?" switch:
//
//   owes me   their share is an advance - real cash out, owed back
//   on me     their share is my own spending, and nothing is owed
//
// Which is the difference between fronting the hotel for six people and
// buying everyone dinner.
// =========================================================================

export default function EventExpenseModal({
  isOpen,
  onClose,
  onSave,
  event,
  accounts,
  editing,
}) {
  const toast = useToast();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Rebuilt whenever the modal opens so a cancelled edit leaves nothing
  // behind, and a new expense starts from the event's roster.
  //
  // Deferred by a tick rather than set straight from the effect body: the
  // lint rule this codebase runs treats a synchronous setState in an effect
  // as a cascading render, and the rest of the app defers the same way.
  useEffect(() => {
    if (!isOpen) return undefined;

    const next = editing
      ? {
          description: editing.description || "",
          totalAmount: String(editing.totalAmount ?? ""),
          category: editing.category || "",
          date: toInputDate(editing.date),
          paidByMe: editing.paidByMe !== false,
          payerName: editing.payerName || "",
          accountId: editing.accountId || accounts[0]?._id || "",
          splitMethod: editing.splitMethod || "equal",
          participants: (editing.participants || []).map((person) => ({
            name: person.name,
            isMe: Boolean(person.isMe),
            shareInput: person.shareInput ? String(person.shareInput) : "",
            recoverable: person.recoverable !== false,
            settledAmount: Number(person.settledAmount || 0),
          })),
          note: editing.note || "",
        }
      : {
          description: "",
          totalAmount: "",
          category: event.typeMeta?.categories?.[0] || "",
          date: toInputDate(
            // A trip that has already started defaults to today, not to its
            // first day - you are logging what you just paid for.
            event.daysUntilStart !== null && event.daysUntilStart > 0
              ? event.startDate
              : new Date(),
          ),
          paidByMe: true,
          payerName: "",
          accountId: accounts[0]?._id || "",
          splitMethod: "equal",
          participants: (event.participants || []).map((person) => ({
            name: person.name,
            isMe: Boolean(person.isMe),
            shareInput: "",
            recoverable: true,
            settledAmount: 0,
          })),
          note: "",
        };

    const timer = window.setTimeout(() => setForm(next), 0);

    return () => window.clearTimeout(timer);
  }, [isOpen, editing, event, accounts]);

  const parsed = evaluateExpression(form?.totalAmount ?? "");
  const total = round2(parsed.value || 0);

  // Recomputed on every render rather than memoised: it is a few dozen
  // arithmetic operations over a handful of people, and memoising it on the
  // form object stops the React compiler optimising the component at all.
  const shares = form
    ? previewShares(total, form.splitMethod, form.participants)
    : [];

  const summary = form
    ? summariseSplit(shares, form.participants, total, form.paidByMe)
    : null;

  if (!form) return null;

  const patch = (changes) => setForm((prev) => ({ ...prev, ...changes }));

  const setPerson = (index, changes) =>
    setForm((prev) => ({
      ...prev,
      participants: prev.participants.map((person, i) =>
        i === index ? { ...person, ...changes } : person,
      ),
    }));

  const addPerson = () =>
    setForm((prev) => ({
      ...prev,
      participants: [
        ...prev.participants,
        { name: "", isMe: false, shareInput: "", recoverable: true, settledAmount: 0 },
      ],
    }));

  const removePerson = (index) => {
    const person = form.participants[index];

    if (person.settledAmount > 0) {
      toast.error(
        `${person.name} has already settled ${money(person.settledAmount)}. Remove the expense instead.`,
      );

      return;
    }

    setForm((prev) => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index),
    }));
  };

  // Everyone in the event roster who is not already on this bill, offered as
  // one-tap chips so a six-person trip is not six rounds of typing.
  const missing = (event.participants || []).filter(
    (person) =>
      !form.participants.some(
        (existing) =>
          existing.name.trim().toLowerCase() === person.name.toLowerCase(),
      ),
  );

  const shareSum = round2(shares.reduce((sum, value) => sum + value, 0));
  const sharesMatch = shareSum === total;

  const handleSave = async () => {
    if (!form.description.trim()) {
      toast.error("What was this for?");

      return;
    }

    if (parsed.error) {
      toast.error(parsed.error);

      return;
    }

    if (!(total > 0)) {
      toast.error("Amount must be greater than 0");

      return;
    }

    if (form.participants.length === 0) {
      toast.error("Add at least one person");

      return;
    }

    if (form.participants.some((person) => !person.name.trim())) {
      toast.error("Every person needs a name");

      return;
    }

    if (form.paidByMe && !form.accountId) {
      toast.error("Which account did you pay from?");

      return;
    }

    if (!form.paidByMe && !form.payerName.trim()) {
      toast.error("Who paid for this?");

      return;
    }

    if (form.splitMethod === "exact" && !sharesMatch) {
      toast.error(
        `The amounts add up to ${money(shareSum)}, but the bill is ${money(total)}`,
      );

      return;
    }

    try {
      setSaving(true);

      await onSave({
        description: form.description,
        totalAmount: total,
        category: form.category,
        date: form.date,
        paidByMe: form.paidByMe,
        payerName: form.payerName,
        accountId: form.paidByMe ? form.accountId : null,
        splitMethod: form.splitMethod,
        participants: form.participants.map((person) => ({
          name: person.name,
          isMe: person.isMe,
          shareInput: Number(evaluateExpression(person.shareInput).value || 0),
          recoverable: person.recoverable,
        })),
        note: form.note,
      });

      onClose();
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Could not save it");
    } finally {
      setSaving(false);
    }
  };

  const needsInput = form.splitMethod !== "equal";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Edit expense" : "Add an expense"}
      maxWidth="max-w-3xl"
    >
      {editing && (
        <div className="mb-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-sm text-indigo-200">
          Saving reverses the original and books it again. Anything already
          repaid is kept and matched back by name.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="What was it for"
          placeholder="Hotel, two nights"
          value={form.description}
          onChange={(e) => patch({ description: e.target.value })}
        />

        <AmountInput
          label="How much in total"
          value={form.totalAmount}
          onChange={(e) => patch({ totalAmount: e.target.value })}
          hint="The whole bill, not just your part"
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-expense-category" className="text-sm text-slate-400">
            Budget head
          </label>

          <input
            id="event-expense-category"
            list="event-expense-categories"
            value={form.category}
            onChange={(e) => patch({ category: e.target.value })}
            placeholder="Stay"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />

          {/* A datalist rather than a select: the type's heads are the fast
              path, but nothing stops you inventing one on the spot. */}
          <datalist id="event-expense-categories">
            {(event.typeMeta?.categories || []).map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>

          <p className="text-xs text-slate-500">
            Matched against your plan to show what went over
          </p>
        </div>

        <Input
          label="When"
          type="date"
          value={form.date}
          onChange={(e) => patch({ date: e.target.value })}
        />
      </div>

      {/* ---------------- who paid ---------------- */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="mb-3 text-sm text-slate-400">Who paid?</p>

        <div className="flex gap-2">
          {[
            { key: true, label: "I paid" },
            { key: false, label: "Someone else paid" },
          ].map((option) => (
            <button
              key={String(option.key)}
              type="button"
              onClick={() => patch({ paidByMe: option.key })}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition ${
                form.paidByMe === option.key
                  ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-100"
                  : "border-white/10 text-slate-400 hover:border-white/25"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-3">
          {form.paidByMe ? (
            <Select
              label="From which account"
              value={form.accountId}
              onChange={(e) => patch({ accountId: e.target.value })}
            >
              <option value="">Select an account</option>

              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.icon} {account.name} · {money(account.balance)}
                </option>
              ))}
            </Select>
          ) : (
            <>
              <Input
                label="Who paid"
                list="event-expense-payers"
                placeholder="Ravi"
                value={form.payerName}
                onChange={(e) => patch({ payerName: e.target.value })}
                hint="Nothing leaves your account until you settle up"
              />

              <datalist id="event-expense-payers">
                {(event.participants || [])
                  .filter((person) => !person.isMe)
                  .map((person) => (
                    <option key={person.name} value={person.name} />
                  ))}
              </datalist>
            </>
          )}
        </div>
      </div>

      {/* ---------------- split ---------------- */}
      <div className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">Split between</p>

          <div className="flex flex-wrap gap-1.5">
            {METHODS.map((method) => (
              <button
                key={method.key}
                type="button"
                onClick={() => patch({ splitMethod: method.key })}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                  form.splitMethod === method.key
                    ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-100"
                    : "border-white/10 text-slate-400 hover:border-white/25"
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {form.participants.map((person, index) => {
            const share = shares[index] || 0;

            // Only other people's shares can be a gift. My own share is my
            // spending either way when I paid; when someone else paid, my
            // switch means "they are treating me".
            const showSwitch = form.paidByMe ? !person.isMe : person.isMe;

            return (
              <div
                key={index}
                className={`rounded-2xl border p-3 transition ${
                  person.recoverable === false
                    ? "border-amber-500/30 bg-amber-500/[0.06]"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={person.name}
                    onChange={(e) => setPerson(index, { name: e.target.value })}
                    placeholder="Name"
                    aria-label={`Person ${index + 1} name`}
                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />

                  {person.isMe && (
                    <span className="rounded-md bg-indigo-500/20 px-2 py-1 text-xs text-indigo-200">
                      You
                    </span>
                  )}

                  {needsInput && (
                    <input
                      value={person.shareInput}
                      onChange={(e) =>
                        setPerson(index, { shareInput: e.target.value })
                      }
                      placeholder={
                        form.splitMethod === "percentage"
                          ? "%"
                          : form.splitMethod === "shares"
                            ? "wt"
                            : "0"
                      }
                      aria-label={`${person.name || "Person"} share input`}
                      className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-right text-sm tabular-nums outline-none focus:border-indigo-500"
                    />
                  )}

                  <span className="w-24 text-right text-sm tabular-nums text-slate-200">
                    {money(share)}
                  </span>

                  <button
                    type="button"
                    onClick={() => removePerson(index)}
                    aria-label={`Remove ${person.name || "person"}`}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-red-300"
                  >
                    <FiX size={15} />
                  </button>
                </div>

                {showSwitch && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPerson(index, { recoverable: !person.recoverable })
                      }
                      disabled={person.settledAmount > 0}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        person.recoverable
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      {person.recoverable ? (
                        <>
                          <FiCornerUpLeft size={12} />
                          {form.paidByMe
                            ? "Owes me this back"
                            : "I will pay this back"}
                        </>
                      ) : (
                        <>
                          <FiGift size={12} />
                          {form.paidByMe
                            ? "On me — no need to return"
                            : "Their treat — I owe nothing"}
                        </>
                      )}
                    </button>

                    {person.settledAmount > 0 && (
                      <span className="text-xs text-slate-500">
                        {money(person.settledAmount)} already settled
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* one-tap re-add for anyone on the roster but off this bill */}
        {missing.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Also here:</span>

            {missing.map((person) => (
              <button
                key={person.name}
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    participants: [
                      ...prev.participants,
                      {
                        name: person.name,
                        isMe: Boolean(person.isMe),
                        shareInput: "",
                        recoverable: true,
                        settledAmount: 0,
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-indigo-500/40 hover:text-white"
              >
                <FiPlus size={11} />
                {person.name}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addPerson}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2 text-sm text-slate-400 transition hover:border-indigo-500/40 hover:text-white"
        >
          <FiUserPlus size={14} />
          Someone not on the list
        </button>

        {needsInput && !sharesMatch && total > 0 && (
          <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
            The shares come to {money(shareSum)} against a bill of{" "}
            {money(total)}.
            {form.splitMethod === "exact"
              ? " They have to match exactly."
              : " The difference is absorbed by the first person."}
          </p>
        )}
      </div>

      {/* ---------------- what this does to your money ---------------- */}
      {total > 0 && summary && (
        <div className="mt-5 grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Counts as your spending
            </p>

            <p className="mt-1 text-xl font-semibold text-white">
              {money(summary.myCost)}
            </p>

            {summary.treated > 0 && (
              <p className="text-xs text-amber-300">
                includes {money(summary.treated)} you are covering
              </p>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              {form.paidByMe ? "Fronted, owed back" : "You will owe"}
            </p>

            <p className="mt-1 text-xl font-semibold text-amber-200">
              {money(form.paidByMe ? summary.advance : summary.iOwe)}
            </p>

            {summary.iWasTreated && (
              <p className="text-xs text-emerald-300">their treat</p>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Leaves your account now
            </p>

            <p className="mt-1 text-xl font-semibold text-slate-200">
              {money(form.paidByMe ? total : 0)}
            </p>

            <p className="text-xs text-slate-500">
              {form.paidByMe
                ? "the whole bill"
                : "nothing until you settle up"}
            </p>
          </div>
        </div>
      )}

      <Input
        label="Note"
        containerClassName="mt-4"
        placeholder="Optional"
        value={form.note}
        onChange={(e) => patch({ note: e.target.value })}
      />

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>

        <Button onClick={handleSave} loading={saving}>
          {editing ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </Modal>
  );
}
