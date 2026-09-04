import { forwardRef, useId } from "react";

const fieldClasses = (error, className) => `
  w-full bg-slate-800 rounded-xl p-3 border
  outline-none transition-colors duration-200
  focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
  ${error ? "border-red-500" : "border-slate-700"}
  ${className}
`;

const Input = forwardRef(function Input(
  { label, error, className = "", containerClassName = "", id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm text-slate-400">
          {label}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        className={fieldClasses(error, className)}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />

      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});

export const Select = forwardRef(function Select(
  {
    label,
    error,
    className = "",
    containerClassName = "",
    id,
    children,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="text-sm text-slate-400">
          {label}
        </label>
      )}

      <select
        ref={ref}
        id={selectId}
        className={fieldClasses(error, className)}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {children}
      </select>

      {error && (
        <p id={`${selectId}-error`} className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
