import { forwardRef } from "react";
import { FiLoader } from "react-icons/fi";

// Gold is light enough that white text on it fails contrast - primary
// actions carry near-black text instead, which also reads more premium.
const VARIANTS = {
  primary:
    "bg-indigo-400 hover:bg-indigo-300 text-slate-950 font-semibold shadow-lg shadow-black/30",
  secondary:
    "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700",
  danger: "bg-red-600 hover:bg-red-500 text-white",
  ghost:
    "bg-transparent hover:bg-white/5 text-slate-200 border border-white/10",
};

const SIZES = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-5 py-3 text-sm gap-2",
  lg: "px-6 py-3.5 text-base gap-2",
};

const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    icon: Icon,
    className = "",
    disabled = false,
    type = "button",
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center rounded-xl font-medium
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50
        ${VARIANTS[variant] || VARIANTS.primary}
        ${SIZES[size] || SIZES.md}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <FiLoader className="animate-spin" size={size === "sm" ? 14 : 16} />
      ) : (
        Icon && <Icon size={size === "sm" ? 14 : 16} />
      )}

      {children}
    </button>
  );
});

export default Button;
