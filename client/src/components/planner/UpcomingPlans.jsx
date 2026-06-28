import { formatDate, money, priorityClasses } from "./plannerUtils";

export default function UpcomingPlans({ plans }) {
  const upcoming = [...plans]
    .filter((plan) => plan.status !== "Completed" && plan.status !== "Cancelled")
    .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))
    .slice(0, 5);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-xl font-bold">Upcoming Plans</h2>
      <div className="mt-4 space-y-3">
        {upcoming.length ? (
          upcoming.map((plan) => (
            <div
              key={plan._id}
              className="rounded-lg border border-white/10 bg-slate-900/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{plan.title}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(plan.targetDate)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${priorityClasses[plan.priority]}`}
                >
                  {plan.priority}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-slate-400">Need monthly</span>
                <span className="text-emerald-300">
                  {money(plan.monthlySaving)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-slate-900/60 p-4 text-sm text-slate-400">
            No upcoming plans yet.
          </p>
        )}
      </div>
    </section>
  );
}
