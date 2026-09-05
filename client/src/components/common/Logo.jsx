const SIZES = {
  sm: "w-9 h-9 text-base rounded-xl",
  md: "w-11 h-11 text-xl rounded-2xl",
  lg: "w-14 h-14 text-2xl rounded-2xl",
};

export default function Logo({ size = "md", className = "" }) {
  return (
    <div
      className={`
        ${SIZES[size] || SIZES.md}
        flex shrink-0 items-center justify-center font-semibold text-slate-950
        bg-gradient-to-br from-indigo-300 to-indigo-500
        shadow-lg shadow-black/40
        ${className}
      `}
      aria-hidden="true"
    >
      M
    </div>
  );
}
