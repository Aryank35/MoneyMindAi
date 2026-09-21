import { useState } from "react";
import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiCheck,
  FiGift,
  FiTrash2,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";

import Modal from "../common/Modal";
import Button from "../common/Button";
import Input, { Select } from "../common/Input";
import AmountInput from "../common/AmountInput";
import EmptyState from "../common/EmptyState";
import ConfirmDialog from "../common/ConfirmDialog";
import { useToast } from "../common/Toast";

import { evaluateExpression } from "../../utils/calc";
import { money } from "../../utils/incomeFormulas";

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

// =========================================================================
// PEOPLE & SETTLING UP
//
// Who is coming, and - once the spending starts - who is square with whom.
//
// The per-person figures are added up from the event's expenses rather than
// stored, so removing a bill or changing a share moves them immediately.
// Shares marked "on me" never appear as owed: that is the whole point of
// the flag.
// =========================================================================

export default function EventPeopleTab({
  event,
  accounts,
  onAdd,
  onRemove,
  onSettle,
}) {
  const toast = useToast();

  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);

  const [settling, setSettling] = useState(null);
  const [settleForm, setSettleForm] = useState({ amount: "", accountId: "" });

  const totals = event.totals;

  const addPerson = async () => {
    if (!name.trim()) {
      toast.error("Give this person a name");

      return;
    }

    try {
      setBusy(true);

      await onAdd("participants", { name, note });

      setName("");
      setNote("");
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Could not add them");
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    try {
      setBusy(true);

      // The index is the address here - the roster's subdocuments carry no
      // ids of their own.
      await onRemove("participants", removing.index);

      setRemoving(null);
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Could not remove them");
    } finally {
      setBusy(false);
    }
  };

  // Every unsettled share that person still owes, across the event's bills.
  const openItemsFor = (personName) =>
    (event.expenses || [])
      .filter((expense) => expense.paidByMe)
      .flatMap((expense) => {
        const participant = (expense.participants || []).find(
          (p) =>
            !p.isMe &&
            p.recoverable !== false &&
            p.name.toLowerCase() === personName.toLowerCase(),
        );

        if (!participant) return [];

        const outstanding = round2(
          Number(participant.share || 0) - Number(participant.settledAmount || 0),
        );

        return outstanding > 0
          ? [{ expense, participant, outstanding }]
          : [];
      });

  const openSettle = (personName) => {
    const items = openItemsFor(personName);

    if (items.length === 0) {
      toast.error(`${personName} has nothing outstanding`);

      return;
    }

    setSettling({ name: personName, items });
    setSettleForm({
      amount: String(items[0].outstanding),
      accountId: items[0].expense.accountId || accounts[0]?._id || "",
      expenseId: items[0].expense._id,
    });
  };

  const submitSettle = async () => {
    const parsed = evaluateExpression(settleForm.amount);

    if (parsed.error) {
      toast.error(parsed.error);

      return;
    }

    if (!(parsed.value > 0)) {
      toast.error("Amount must be greater than 0");

      return;
    }

    try {
      setBusy(true);

      await onSettle(settleForm.expenseId, {
        participantName: settling.name,
        amount: parsed.value,
        accountId: settleForm.accountId || null,
      });

      toast.success(`${money(parsed.value)} from ${settling.name} recorded`);
      setSettling(null);
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Could not record that");
    } finally {
      setBusy(false);
    }
  };

  const selectedItem = settling?.items.find(
    (item) => item.expense._id === settleForm.expenseId,
  );

  return (
    <div className="space-y-6">
      {/* ---- headline ---- */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "You fronted",
            value: totals.advanced,
            hint: "paid on other people's behalf",
            tone: "text-slate-200",
          },
          {
            label: "Still to collect",
            value: totals.owedToMe,
            hint: totals.owedToMe > 0 ? "chase it up" : "all square",
            tone: totals.owedToMe > 0 ? "text-amber-300" : "text-emerald-300",
          },
          {
            label: "You are covering",
            value: totals.treated,
            hint: "marked as no need to return",
            tone: "text-indigo-200",
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

      {/* ---- who owes what ---- */}
      {event.ledger.length > 0 && (
        <section>
          <h3 className="mb-3 font-semibold">Where everyone stands</h3>

          <div className="space-y-2">
            {event.ledger.map((person) => {
              const isMe =
                person.name.toLowerCase() ===
                (event.participants.find((p) => p.isMe)?.name || "me").toLowerCase();

              return (
                <div
                  key={person.name}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 font-semibold text-indigo-200">
                    {person.name.charAt(0).toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {person.name}
                      {isMe && (
                        <span className="ml-2 rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-xs text-indigo-200">
                          you
                        </span>
                      )}
                    </p>

                    <p className="text-xs text-slate-500">
                      share {money(person.share)}
                      {person.paidOut > 0 && <> · paid {money(person.paidOut)}</>}
                    </p>
                  </div>

                  <div className="text-right">
                    {person.owesMe > 0 ? (
                      <p className="flex items-center gap-1.5 font-semibold text-amber-300">
                        <FiArrowDownLeft size={14} />
                        {money(person.owesMe)}
                      </p>
                    ) : person.iOwe > 0 ? (
                      <p className="flex items-center gap-1.5 font-semibold text-red-300">
                        <FiArrowUpRight size={14} />
                        {money(person.iOwe)}
                      </p>
                    ) : (
                      <p className="text-sm text-emerald-300">square</p>
                    )}

                    <p className="text-xs text-slate-500">
                      {person.owesMe > 0
                        ? "owes you"
                        : person.iOwe > 0
                          ? "you owe"
                          : ""}
                    </p>
                  </div>

                  {person.owesMe > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={FiCheck}
                      onClick={() => openSettle(person.name)}
                    >
                      Settle
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---- roster ---- */}
      <section>
        <h3 className="mb-1 font-semibold">Who is coming</h3>

        <p className="mb-3 text-sm text-slate-400">
          Everyone here shows up as a one-tap option on every expense, and
          per-head estimates re-price themselves as this list changes.
        </p>

        <div className="mb-3 grid gap-3 md:grid-cols-[2fr_2fr_auto] md:items-end">
          <Input
            label="Name"
            placeholder="Ravi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addPerson();
            }}
          />

          <Input
            label="Note"
            placeholder="Driving · joining day 2 · veg"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <Button
            icon={FiUserPlus}
            onClick={addPerson}
            loading={busy}
            className="mb-[1px] h-[46px]"
          >
            Add
          </Button>
        </div>

        {event.participants.length === 0 ? (
          <EmptyState icon={FiUsers} title="Nobody added yet" />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {event.participants.map((person, index) => (
              <div
                key={`${person.name}-${index}`}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-slate-300">
                  {person.name.charAt(0).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {person.name}
                    {person.isMe && (
                      <span className="ml-2 rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-xs text-indigo-200">
                        you
                      </span>
                    )}
                  </p>

                  {person.note && (
                    <p className="truncate text-xs text-slate-500">
                      {person.note}
                    </p>
                  )}
                </div>

                {!person.isMe && (
                  <button
                    onClick={() => setRemoving({ ...person, index })}
                    aria-label={`Remove ${person.name}`}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-red-300"
                  >
                    <FiTrash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- settle ---- */}
      <Modal
        isOpen={!!settling}
        onClose={() => setSettling(null)}
        title={settling ? `${settling.name} is paying you back` : ""}
        maxWidth="max-w-lg"
      >
        {settling && (
          <>
            <Select
              label="Against which expense"
              value={settleForm.expenseId}
              onChange={(e) => {
                const item = settling.items.find(
                  (entry) => entry.expense._id === e.target.value,
                );

                setSettleForm({
                  ...settleForm,
                  expenseId: e.target.value,
                  amount: String(item?.outstanding ?? ""),
                  accountId:
                    item?.expense.accountId || settleForm.accountId,
                });
              }}
            >
              {settling.items.map((item) => (
                <option key={item.expense._id} value={item.expense._id}>
                  {item.expense.description} — {money(item.outstanding)} due
                </option>
              ))}
            </Select>

            <AmountInput
              label="How much"
              containerClassName="mt-3"
              value={settleForm.amount}
              onChange={(e) =>
                setSettleForm({ ...settleForm, amount: e.target.value })
              }
              hint={
                selectedItem
                  ? `${money(selectedItem.outstanding)} outstanding on this one`
                  : undefined
              }
            />

            <Select
              label="Into which account"
              containerClassName="mt-3"
              value={settleForm.accountId}
              onChange={(e) =>
                setSettleForm({ ...settleForm, accountId: e.target.value })
              }
            >
              <option value="">Do not touch my balance</option>

              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.icon} {account.name}
                </option>
              ))}
            </Select>

            <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400">
              This is money coming back in, not income — it lands in the
              account and clears what is owed, without counting as earnings.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setSettling(null)}
                disabled={busy}
              >
                Cancel
              </Button>

              <Button onClick={submitSettle} loading={busy}>
                Record it
              </Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        loading={busy}
        title={`Remove ${removing?.name || "this person"}?`}
        message="They will be taken off the roster. If they are on any expense, that has to be changed first."
        confirmLabel="Remove"
      />

      {totals.treated > 0 && (
        <p className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-400">
          <FiGift className="mt-0.5 shrink-0 text-indigo-300" size={14} />
          {money(totals.treated)} of this event is covered by you with nothing
          expected back. It counts as your spending and is never shown as owed.
        </p>
      )}
    </div>
  );
}
