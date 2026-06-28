import { FiCalendar, FiFlag, FiTarget, FiTrendingUp } from "react-icons/fi";
import { formatDate, money } from "./plannerUtils";

export default function PlannerSummary({ summary }) {
  const cards = [
    {
      label: "Total Planned Amount",
      value: money(summary.totalPlannedAmount),
      icon: FiTarget,
      accent: "from-emerald-500/25 to-cyan-500/10",
    },
    {
      label: "Total Saved",
      value: money(summary.totalSaved),
      icon: FiTrendingUp,
      accent: "from-cyan-500/25 to-indigo-500/10",
    },
    {
      label: "Remaining Amount",
      value: money(summary.remainingAmount),
      icon: FiFlag,
      accent: "from-amber-500/25 to-rose-500/10",
    },
    {
      label: "Average Monthly Saving",
      value: money(summary.averageMonthlySavingRequired),
      icon: FiCalendar,
      accent: "from-violet-500/25 to-fuchsia-500/10",
    },
  ];

  return (
    <section className="sticky top-24 z-20 mb-6 grid gap-3 rounded-lg border border-white/10 bg-slate-950/90 p-3 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className={`rounded-lg border border-white/10 bg-gradient-to-br ${card.accent} p-4 transition hover:-translate-y-1 hover:border-white/20`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">{card.label}</p>
              <Icon className="text-xl text-white/70" />
            </div>
            <p className="mt-3 break-words text-2xl font-bold">{card.value}</p>
          </div>
        );
      })}

      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 sm:col-span-2 xl:col-span-2">
        <p className="text-sm text-slate-400">Nearest Due Plan</p>
        <p className="mt-2 text-lg font-semibold">
          {summary.nearestDuePlan?.title || "No active plan"}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {summary.nearestDuePlan
            ? formatDate(summary.nearestDuePlan.targetDate)
            : "Add a plan to start forecasting."}
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 sm:col-span-2 xl:col-span-2">
        <p className="text-sm text-slate-400">Highest Priority Plan</p>
        <p className="mt-2 text-lg font-semibold">
          {summary.highestPriorityPlan?.title || "No priority set"}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {summary.completedPlans} completed | {summary.upcomingPlans} upcoming
        </p>
      </div>
    </section>
  );
}
