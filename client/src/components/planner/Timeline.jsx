import { formatDate, money } from "./plannerUtils";

const getBucket = (dateValue) => {
  const today = new Date();
  const target = new Date(dateValue);
  const days = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (days <= 7) return "This Week";
  if (target.getMonth() === today.getMonth() && target.getFullYear() === today.getFullYear()) {
    return "This Month";
  }
  if (
    target.getMonth() === today.getMonth() + 1 ||
    (today.getMonth() === 11 && target.getMonth() === 0)
  ) {
    return "Next Month";
  }
  return "This Year";
};

export default function Timeline({ plans }) {
  const buckets = ["This Week", "This Month", "Next Month", "This Year"].map(
    (bucket) => ({
      bucket,
      plans: plans
        .filter((plan) => plan.status !== "Completed" && plan.status !== "Cancelled")
        .filter((plan) => getBucket(plan.targetDate) === bucket)
        .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate)),
    }),
  );

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-xl font-bold">Timeline</h2>
      <div className="mt-5 space-y-5">
        {buckets.map((group) => (
          <div key={group.bucket}>
            <p className="mb-3 text-sm font-semibold text-slate-300">
              {group.bucket}
            </p>
            {group.plans.length ? (
              <div className="space-y-3">
                {group.plans.slice(0, 4).map((plan) => (
                  <div
                    key={plan._id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-900/70 p-3"
                  >
                    <div>
                      <p className="font-semibold">{plan.title}</p>
                      <p className="text-xs text-slate-400">
                        {formatDate(plan.targetDate)}
                      </p>
                    </div>
                    <p className="text-sm text-emerald-300">
                      {money(plan.remainingAmount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-slate-900/60 p-3 text-sm text-slate-500">
                No plans in this window.
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
