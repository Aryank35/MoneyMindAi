import { calculatePlanPreview, money } from "./plannerUtils";

export default function SavingCalculator({ formData }) {
  const preview = calculatePlanPreview(formData);

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
      <h3 className="text-lg font-bold">Saving Calculator</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Remaining Amount", money(preview.remaining)],
          ["Saving Per Day", money(preview.dailySaving)],
          ["Saving Per Week", money(preview.weeklySaving)],
          ["Saving Per Month", money(preview.monthlySaving)],
          ["Inflation Adjusted", money(preview.expectedAmountAfterInflation)],
          ["Days Remaining", preview.daysRemaining],
          ["Months Remaining", preview.monthsRemaining],
          ["Completion", `${preview.completionPercentage}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white/[0.04] p-3">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-1 break-words text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
