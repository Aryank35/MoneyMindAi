import { useId, useState } from "react";
import { FiAlertCircle } from "react-icons/fi";

import CalculatorSheet from "./CalculatorSheet";
import { evaluateExpression } from "../../utils/calc";
import { money } from "../../utils/incomeFormulas";

// =========================================================================
// AMOUNT INPUT
//
// An amount field that also takes arithmetic: "20 + 10", "1200/3",
// "1000 + 18%". The resolved figure is shown under the field as you type, so
// what will be saved is never a surprise.
//
// The button on the right opens the full calculator - a keypad plus the
// EMI, SIP, goal, deposit and inflation tools. It works out a figure and
// drops it straight into this field, which is where that figure was always
// going to end up. There is no separate calculator page any more; every
// amount field in the app is one.
//
// A text input rather than type="number" on purpose - a number input rejects
// the operator characters outright. inputMode="text" keeps a full keyboard
// on mobile; the quick-add sheet has its own keypad with operator keys for
// the cases where that is nicer.
//
// The parent holds the raw string and calls resolveAmount() when saving,
// which keeps a half-typed expression from being destroyed by a re-render.
// =========================================================================

export default function AmountInput({
  label = "Amount",
  value,
  onChange,
  placeholder = "0",
  containerClassName = "",
  className = "",
  hint,
  id,
  // Set false on the rare field where a calculator makes no sense.
  showCalculator = true,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;

  const [showSheet, setShowSheet] = useState(false);

  const { value: resolved, error, isExpression } = evaluateExpression(value);

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm text-slate-400">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="text"
          autoComplete="off"
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          aria-describedby={`${inputId}-resolved`}
          className={`
            w-full rounded-xl border bg-slate-800 p-3 tabular-nums outline-none
            transition-colors duration-200
            focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
            ${error ? "border-red-500" : "border-slate-700"}
            ${showCalculator ? "pr-12" : ""}
            ${className}
          `}
          {...props}
        />

        {showCalculator && (
          <button
            type="button"
            onClick={() => setShowSheet(true)}
            aria-label={`Open calculator for ${label || "amount"}`}
            title="Calculator"
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-indigo-300"
          >
            {/* A drawn glyph rather than an icon-font import: this is the one
                place in the app that needs a calculator mark, and the shape
                reads better at 18px than the library's does. */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
              <rect x="7.5" y="6" width="9" height="3.5" rx="1" />
              <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" />
            </svg>
          </button>
        )}
      </div>

      <p id={`${inputId}-resolved`} className="min-h-[1rem] text-xs">
        {error ? (
          <span className="flex items-center gap-1 text-red-400">
            <FiAlertCircle />
            {error}
          </span>
        ) : isExpression && resolved !== null ? (
          <span className="font-semibold text-emerald-300">
            = {money(resolved)}
          </span>
        ) : (
          <span className="text-slate-500">
            {hint || "Maths works here — try 20 + 10, 1200/3, or 900 + 18%"}
          </span>
        )}
      </p>

      <CalculatorSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        value={value}
        onChange={onChange}
        fieldLabel={label}
      />
    </div>
  );
}
