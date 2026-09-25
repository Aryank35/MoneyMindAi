import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiCheck,
  FiCornerDownLeft,
  FiDelete,
  FiTrendingUp,
  FiX,
} from "react-icons/fi";

import { evaluateExpression } from "../../utils/calc";
import {
  calculateEmi,
  calculateFd,
  calculateInflation,
  calculateRd,
  calculateSip,
  sipForGoal,
} from "../../utils/financeMath";
import { money } from "../../utils/incomeFormulas";

// =========================================================================
// CALCULATOR SHEET
//
// The calculator that used to be its own page, attached to whichever amount
// field opened it. A figure you work out is nearly always a figure you are
// about to enter somewhere, so the two belong together - working it out on
// a separate page and carrying the number back by hand was the long way
// round.
//
// Two halves:
//   keypad   arithmetic straight into the field's own expression, so the
//            field keeps showing what you typed rather than a bare result
//   tools    EMI, SIP, goal, FD/RD and inflation - each ends in one button
//            that drops its answer into the field
//
// Rendered as a fixed overlay rather than a popover: amount fields live
// inside scrolling dialogs, and an absolutely-positioned panel would be
// clipped by the first one with overflow set.
// =========================================================================

const KEYPAD = [
  ["7", "8", "9", "÷"],
  ["4", "5", "6", "×"],
  ["1", "2", "3", "-"],
  [".", "0", "%", "+"],
];

const TOOLS = [
  { key: "keypad", label: "Keypad" },
  { key: "emi", label: "Loan / EMI" },
  { key: "sip", label: "SIP" },
  { key: "goal", label: "Goal" },
  { key: "deposit", label: "FD / RD" },
  { key: "inflation", label: "Inflation" },
];

const num = (value) => Number(value || 0);

function Field({ label, value, onChange, suffix, step = "any", hint }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-slate-400">{label}</span>

      <span className="relative block">
        <input
          type="number"
          step={step}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 pr-12 tabular-nums outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />

        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
            {suffix}
          </span>
        )}
      </span>

      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

// Every tool ends the same way: a headline figure and one button that puts
// it in the field. Keeping that in one place is what stops the five tools
// drifting into five slightly different endings.
function ToolResult({ label, value, detail, onUse, disabled }) {
  return (
    <div className="mt-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4">
      <p className="text-xs uppercase tracking-wider text-indigo-300">{label}</p>

      <p className="mt-1 text-3xl font-bold tabular-nums text-white">
        {money(value)}
      </p>

      {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}

      <button
        type="button"
        onClick={() => onUse(value)}
        disabled={disabled || !Number.isFinite(value) || value <= 0}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FiCheck size={15} />
        Use this amount
      </button>
    </div>
  );
}

export default function CalculatorSheet({ isOpen, onClose, value, onChange, fieldLabel }) {
  const panelRef = useRef(null);

  const [tab, setTab] = useState("keypad");

  // Each tool keeps its own inputs so switching between them and coming back
  // does not wipe what was typed.
  const [emi, setEmi] = useState({ principal: "", rate: "9", months: "60" });
  const [sip, setSip] = useState({ monthly: "", rate: "12", months: "120" });
  const [goal, setGoal] = useState({ target: "", rate: "12", months: "120" });
  const [deposit, setDeposit] = useState({
    kind: "fd",
    amount: "",
    rate: "7",
    months: "60",
  });
  const [inflation, setInflation] = useState({ amount: "", rate: "6", years: "10" });

  const { value: resolved, error } = evaluateExpression(value);

  // Escape closes the calculator, not whatever dialog is behind it. The
  // Modal component listens on document, so the event is stopped here before
  // it can bubble that far.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    const node = panelRef.current;

    node?.addEventListener("keydown", handleKeyDown);

    return () => node?.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const emit = (next) => onChange({ target: { value: next } });

  const press = (key) => {
    const text = String(value ?? "");

    if (key === "back") return emit(text.slice(0, -1));

    if (key === "clear") return emit("");

    // Two operators in a row is a typo, not an intention - replace rather
    // than append, the way a phone calculator does.
    if ("+-×÷".includes(key) && /[+\-×÷]$/.test(text.trim())) {
      return emit(text.trim().slice(0, -1) + key);
    }

    return emit(text + key);
  };

  const applyAmount = (amount) => {
    emit(String(Math.round(Number(amount) * 100) / 100));
    onClose();
  };

  const emiResult = calculateEmi({
    principal: num(emi.principal),
    annualRate: num(emi.rate),
    months: num(emi.months),
  });

  const sipResult = calculateSip({
    monthlyAmount: num(sip.monthly),
    annualRate: num(sip.rate),
    months: num(sip.months),
  });

  const goalResult = sipForGoal({
    targetAmount: num(goal.target),
    annualRate: num(goal.rate),
    months: num(goal.months),
  });

  const depositResult =
    deposit.kind === "fd"
      ? calculateFd({
          principal: num(deposit.amount),
          annualRate: num(deposit.rate),
          years: num(deposit.months) / 12,
        })
      : calculateRd({
          monthlyAmount: num(deposit.amount),
          annualRate: num(deposit.rate),
          months: num(deposit.months),
        });

  const inflationResult = calculateInflation({
    amount: num(inflation.amount),
    annualRate: num(inflation.rate),
    years: num(inflation.years),
  });

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Calculator"
          className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl custom-scrollbar sm:max-w-md sm:rounded-3xl"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* ---- running total ---- */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {fieldLabel || "Amount"}
              </p>

              <p className="mt-1 truncate text-2xl font-semibold tabular-nums text-white">
                {value || "0"}
              </p>

              <p className="text-sm">
                {error ? (
                  <span className="text-red-400">{error}</span>
                ) : resolved !== null ? (
                  <span className="text-emerald-300">= {money(resolved)}</span>
                ) : (
                  <span className="text-slate-500">Type or tap below</span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close calculator"
              className="shrink-0 rounded-lg bg-slate-800 p-2 transition hover:bg-slate-700"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* ---- tool picker ---- */}
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
            {TOOLS.map((tool) => (
              <button
                key={tool.key}
                type="button"
                onClick={() => setTab(tool.key)}
                className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs transition ${
                  tab === tool.key
                    ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-100"
                    : "border-white/10 text-slate-400 hover:border-white/25 hover:text-white"
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>

          {/* ---- keypad ---- */}
          {tab === "keypad" && (
            <>
              <div className="mb-2 grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => press("clear")}
                  className="rounded-xl bg-slate-800 py-3 text-sm font-medium text-red-300 transition hover:bg-slate-700"
                >
                  AC
                </button>

                <button
                  type="button"
                  onClick={() => press("(")}
                  className="rounded-xl bg-slate-800 py-3 text-lg text-slate-200 transition hover:bg-slate-700"
                >
                  (
                </button>

                <button
                  type="button"
                  onClick={() => press(")")}
                  className="rounded-xl bg-slate-800 py-3 text-lg text-slate-200 transition hover:bg-slate-700"
                >
                  )
                </button>

                <button
                  type="button"
                  onClick={() => press("back")}
                  aria-label="Backspace"
                  className="flex items-center justify-center rounded-xl bg-slate-800 py-3 text-slate-200 transition hover:bg-slate-700"
                >
                  <FiDelete size={18} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {KEYPAD.flat().map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => press(key)}
                    className={`rounded-xl py-4 text-lg font-medium transition ${
                      "+-×÷%".includes(key)
                        ? "bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25"
                        : "bg-slate-800 text-white hover:bg-slate-700"
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (resolved !== null) applyAmount(resolved);
                }}
                disabled={resolved === null || !!error}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-400 py-3.5 font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FiCornerDownLeft size={16} />
                {resolved === null ? "Use result" : `Use ${money(resolved)}`}
              </button>

              <p className="mt-2 text-center text-xs text-slate-500">
                You can keep the working — <span className="text-slate-400">450 + 220</span>{" "}
                saves as {money(670)} either way.
              </p>
            </>
          )}

          {/* ---- EMI ---- */}
          {tab === "emi" && (
            <div className="space-y-3">
              <Field
                label="Loan amount"
                value={emi.principal}
                onChange={(next) => setEmi({ ...emi, principal: next })}
                suffix="₹"
              />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Interest rate"
                  value={emi.rate}
                  onChange={(next) => setEmi({ ...emi, rate: next })}
                  suffix="%"
                />

                <Field
                  label="Tenure"
                  value={emi.months}
                  onChange={(next) => setEmi({ ...emi, months: next })}
                  suffix="mo"
                  hint={
                    num(emi.months) >= 12
                      ? `${(num(emi.months) / 12).toFixed(1)} years`
                      : undefined
                  }
                />
              </div>

              <ToolResult
                label="Monthly instalment"
                value={emiResult.emi}
                detail={`${money(emiResult.totalInterest)} total interest · ${money(
                  emiResult.totalPayable,
                )} repaid overall`}
                onUse={applyAmount}
              />
            </div>
          )}

          {/* ---- SIP ---- */}
          {tab === "sip" && (
            <div className="space-y-3">
              <Field
                label="Monthly investment"
                value={sip.monthly}
                onChange={(next) => setSip({ ...sip, monthly: next })}
                suffix="₹"
              />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Expected return"
                  value={sip.rate}
                  onChange={(next) => setSip({ ...sip, rate: next })}
                  suffix="%"
                />

                <Field
                  label="For"
                  value={sip.months}
                  onChange={(next) => setSip({ ...sip, months: next })}
                  suffix="mo"
                  hint={
                    num(sip.months) >= 12
                      ? `${(num(sip.months) / 12).toFixed(1)} years`
                      : undefined
                  }
                />
              </div>

              <ToolResult
                label="Value at the end"
                value={sipResult.futureValue}
                detail={`${money(sipResult.invested)} invested · ${money(
                  sipResult.gain,
                )} earned`}
                onUse={applyAmount}
              />
            </div>
          )}

          {/* ---- goal ---- */}
          {tab === "goal" && (
            <div className="space-y-3">
              <Field
                label="I want to reach"
                value={goal.target}
                onChange={(next) => setGoal({ ...goal, target: next })}
                suffix="₹"
              />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Expected return"
                  value={goal.rate}
                  onChange={(next) => setGoal({ ...goal, rate: next })}
                  suffix="%"
                />

                <Field
                  label="Within"
                  value={goal.months}
                  onChange={(next) => setGoal({ ...goal, months: next })}
                  suffix="mo"
                  hint={
                    num(goal.months) >= 12
                      ? `${(num(goal.months) / 12).toFixed(1)} years`
                      : undefined
                  }
                />
              </div>

              <ToolResult
                label="Put aside each month"
                value={goalResult.monthlyAmount}
                detail={`${money(goalResult.invested)} of your own money · ${money(
                  goalResult.gain,
                )} from growth`}
                onUse={applyAmount}
              />
            </div>
          )}

          {/* ---- FD / RD ---- */}
          {tab === "deposit" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {[
                  { key: "fd", label: "Fixed deposit" },
                  { key: "rd", label: "Recurring deposit" },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setDeposit({ ...deposit, kind: option.key })}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
                      deposit.kind === option.key
                        ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-100"
                        : "border-white/10 text-slate-400 hover:border-white/25"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <Field
                label={
                  deposit.kind === "fd" ? "Deposit amount" : "Monthly instalment"
                }
                value={deposit.amount}
                onChange={(next) => setDeposit({ ...deposit, amount: next })}
                suffix="₹"
              />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Interest rate"
                  value={deposit.rate}
                  onChange={(next) => setDeposit({ ...deposit, rate: next })}
                  suffix="%"
                />

                <Field
                  label="Tenure"
                  value={deposit.months}
                  onChange={(next) => setDeposit({ ...deposit, months: next })}
                  suffix="mo"
                  hint={
                    num(deposit.months) >= 12
                      ? `${(num(deposit.months) / 12).toFixed(1)} years`
                      : undefined
                  }
                />
              </div>

              <ToolResult
                label="Matures at"
                value={depositResult.maturityValue}
                detail={`${money(depositResult.invested)} in · ${money(
                  depositResult.interest,
                )} interest`}
                onUse={applyAmount}
              />
            </div>
          )}

          {/* ---- inflation ---- */}
          {tab === "inflation" && (
            <div className="space-y-3">
              <Field
                label="Costs today"
                value={inflation.amount}
                onChange={(next) => setInflation({ ...inflation, amount: next })}
                suffix="₹"
              />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Inflation"
                  value={inflation.rate}
                  onChange={(next) => setInflation({ ...inflation, rate: next })}
                  suffix="%"
                />

                <Field
                  label="In"
                  value={inflation.years}
                  onChange={(next) => setInflation({ ...inflation, years: next })}
                  suffix="yr"
                />
              </div>

              <ToolResult
                label={`The same thing in ${num(inflation.years) || 0} years`}
                value={inflationResult.futureCost}
                detail={`Today's ${money(
                  num(inflation.amount),
                )} will buy what ${money(inflationResult.presentValue)} buys now`}
                onUse={applyAmount}
              />

              <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-400">
                <FiTrendingUp className="mt-0.5 shrink-0 text-indigo-300" size={13} />
                Worth checking before you fix a target for anything years out —
                a goal set in today's money quietly falls short.
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
