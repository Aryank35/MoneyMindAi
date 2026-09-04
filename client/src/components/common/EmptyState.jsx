export default function EmptyState({
  icon: Icon,
  title = "Nothing here yet",
  message,
  action,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-3 py-12 px-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-300">
          <Icon size={22} />
        </div>
      )}

      <div>
        <p className="font-semibold text-slate-200">{title}</p>

        {message && <p className="text-sm text-slate-400 mt-1">{message}</p>}
      </div>

      {action}
    </div>
  );
}
