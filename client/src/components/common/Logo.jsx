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
        flex items-center justify-center font-bold text-white shrink-0
        bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500
        shadow-lg shadow-purple-500/20
        ${className}
      `}
      aria-hidden="true"
    >
      M
    </div>
  );
}
