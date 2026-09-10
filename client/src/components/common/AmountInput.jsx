import { useId } from "react";
import { FiAlertCircle } from "react-icons/fi";

import { evaluateExpression } from "../../utils/calc";
import { money } from "../../utils/incomeFormulas";

// =========================================================================
// AMOUNT INPUT
//
// An amount field that also takes arithmetic: "20 + 10", "1200/3",
// "1000 + 18%". The resolved figure is shown under the field as you type, so
// what will be saved is never a surprise.
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
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;

  const { value: resolved, error, isExpression } = evaluateExpression(value);

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm text-slate-400">
          {label}
        </label>
      )}

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
          ${className}
        `}
        {...props}
      />

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
    </div>
  );
}
