import { useState } from "react";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheck,
  FiCreditCard,
  FiHelpCircle,
} from "react-icons/fi";

import { money } from "../../utils/incomeFormulas";

// =========================================================================
// BANK FUNDING
//
// A budget line names the account that funds it, so the plan implies a
// balance each bank has to be holding. This shows that, and moves money when
// one is short.
//
// What is shown is what REMAINS on each line, not the whole limit: the part
// already spent has left the account and does not need to be there twice.
// =========================================================================

function Row({ bank, onFund, busy }) {
  const [open, setOpen] = useState(false);

  const short = bank.shortfall > 0;

  return (
    <li className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 items-baseline gap-2 text-left"
          aria-expanded={open}
        >
          <span className="truncate text-sm font-medium">
            {bank.icon} {bank.name}
          </span>

          <span className="shrink-0 text-xs text-slate-500">
            {bank.lines.length} line{bank.lines.length === 1 ? "" : "s"}
          </span>
        </button>

        <span className="shrink-0 text-xs tabular-nums text-slate-400">
          {money(bank.balance)} of {money(bank.required)}
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-all duration-500 ${
            short ? "bg-amber-400" : "bg-emerald-400"
          }`}
          style={{ width: `${Math.min(bank.coverage, 100)}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {short ? (
          <span className="text-xs font-medium text-amber-300">
            {money(bank.shortfall)} short
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-emerald-300">
            <FiCheck size={12} />
            Fully funded
            {bank.surplus > 0 && (
              <span className="text-slate-500">
                · {money(bank.surplus)} spare
              </span>
            )}
          </span>
        )}

        {short && onFund && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onFund(bank)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-400 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:opacity-50"
          >
            Move money in
            <FiArrowRight size={12} />
          </button>
        )}
      </div>

      {open && (
        <ul className="mt-2 space-y-1 border-t border-white/5 pt-2">
          {bank.lines.map((line) => (
            <li
              key={line.name}
              className="flex items-baseline justify-between gap-2 text-xs"
            >
              <span className="truncate text-slate-400">{line.name}</span>

              <span className="shrink-0 tabular-nums text-slate-500">
                {money(line.required)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function BankFundingPanel({ funding, onFund, busy = false }) {
  if (!funding || funding.banks.length === 0) return null;

  const { banks, unassigned, onCards, totals } = funding;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <header className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold">
          What each bank needs
        </h3>

        <span
          className={`text-sm font-semibold tabular-nums ${
            totals.shortfall > 0 ? "text-amber-300" : "text-emerald-300"
          }`}
        >
          {totals.shortfall > 0
            ? `${money(totals.shortfall)} short`
            : "All funded"}
        </span>
      </header>

      <p className="mb-4 text-xs text-slate-500">
        Your plan assigns each category to an account. This is what is still to
        be spent from each — money already spent is not counted again.
      </p>

      <ul className="space-y-2">
        {banks.map((bank) => (
          <Row key={bank.accountId} bank={bank} onFund={onFund} busy={busy} />
        ))}
      </ul>

      {/* Neither of these can be demanded of a bank, so they are stated
          rather than folded into a shortfall that would be wrong. */}
      {onCards.length > 0 && (
        <p className="mt-3 flex gap-2 rounded-xl border border-white/5 bg-black/20 p-2.5 text-xs text-slate-400">
          <FiCreditCard className="mt-0.5 shrink-0" />

          <span>
            {money(totals.onCards)} of your plan is funded by a card
            {onCards.length === 1 ? "" : "s"} —{" "}
            {onCards.map((item) => item.name).join(", ")}. Credit is not a
            balance to hold; the card bill is what needs the cash.
          </span>
        </p>
      )}

      {unassigned.length > 0 && (
        <p className="mt-2 flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-200">
          <FiHelpCircle className="mt-0.5 shrink-0" />

          <span>
            {money(totals.unassigned)} is not tied to any account —{" "}
            {unassigned.map((item) => item.name).join(", ")}. Assign an account
            on those lines and they will be counted here.
          </span>
        </p>
      )}
    </section>
  );
}

// The picker for where a shortfall comes from. Kept beside the panel because
// it only ever exists to serve it.
export function FundBankDialog({ bank, donors = [], onConfirm, onClose, busy }) {
  const [sourceId, setSourceId] = useState(donors[0]?.accountId || "");
  const [amount, setAmount] = useState(String(bank?.shortfall ?? ""));

  if (!bank) return null;

  const source = donors.find((donor) => donor.accountId === sourceId);

  const value = Number(amount) || 0;

  // A transfer that empties the source past what it can spare just moves the
  // shortfall somewhere else, so it is blocked rather than merely warned.
  const tooMuch = source ? value > source.spare : false;

  const valid = source && value > 0 && !tooMuch;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">
        {bank.icon} <span className="font-semibold">{bank.name}</span> needs{" "}
        <span className="font-semibold text-amber-300">
          {money(bank.shortfall)}
        </span>{" "}
        more to cover the {bank.lines.length} budget line
        {bank.lines.length === 1 ? "" : "s"} assigned to it.
      </p>

      {donors.length === 0 ? (
        <p className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
          <FiAlertTriangle className="mt-0.5 shrink-0" />

          <span>
            No other account has money to spare — every one is already carrying
            what its own plan lines need. Trimming the plan is the honest fix
            here, not moving money around.
          </span>
        </p>
      ) : (
        <>
          <div>
            <label
              htmlFor="fund-source"
              className="mb-1.5 block text-sm text-slate-400"
            >
              Move from
            </label>

            <select
              id="fund-source"
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none transition-colors focus:border-indigo-500"
            >
              {donors.map((donor) => (
                <option key={donor.accountId} value={donor.accountId}>
                  {donor.name} — {money(donor.spare)} spare
                </option>
              ))}
            </select>

            {source && (
              <p className="mt-1.5 text-xs text-slate-500">
                Holds {money(source.balance)}, of which{" "}
                {money(source.claimed)} is already spoken for by its own budget
                lines.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="fund-amount"
              className="mb-1.5 block text-sm text-slate-400"
            >
              Amount
            </label>

            <input
              id="fund-amount"
              type="number"
              min="0"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none transition-colors focus:border-indigo-500"
            />

            {tooMuch && (
              <p className="mt-1.5 text-xs text-red-300">
                That is more than {source.name} can spare ({money(source.spare)}
                ). Moving it would only shift the shortfall across.
              </p>
            )}
          </div>

          <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-400">
            This records a real transfer between your accounts and moves both
            balances.
          </p>
        </>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm text-slate-100 transition hover:bg-slate-700 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={!valid || busy}
          onClick={() =>
            onConfirm({
              fromAccountId: sourceId,
              toAccountId: bank.accountId,
              amount: value,
            })
          }
          className="rounded-xl bg-indigo-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:opacity-40"
        >
          Transfer {value > 0 ? money(value) : ""}
        </button>
      </div>
    </div>
  );
}
