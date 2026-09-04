import { FiLoader } from "react-icons/fi";

export function Spinner({ size = 24, className = "" }) {
  return (
    <FiLoader
      size={size}
      className={`animate-spin text-indigo-400 ${className}`}
      aria-hidden="true"
    />
  );
}

export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/5 border border-white/10 ${className}`}
      aria-hidden="true"
    />
  );
}

export function PageLoader({ label = "Loading..." }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-[70vh] gap-4"
      role="status"
      aria-live="polite"
    >
      <Spinner size={32} />
      <p className="text-slate-400">{label}</p>
    </div>
  );
}

export default function Loader({ label }) {
  return <PageLoader label={label} />;
}
