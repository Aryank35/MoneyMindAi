export const planCategories = [
  "Bike Purchase",
  "Vacation",
  "House",
  "Wedding",
  "Laptop",
  "Mobile",
  "Insurance Renewal",
  "Bike Servicing",
  "Festival",
  "Birthday",
  "Medical Expense",
  "Education",
  "Home Renovation",
  "Other",
];

export const priorities = ["Low", "Medium", "High", "Critical"];
export const statuses = ["Upcoming", "On Track", "Behind", "Completed", "Cancelled", "Urgent"];
export const repeatFrequencies = ["None", "Weekly", "Monthly", "Quarterly", "Yearly"];

export const categoryMeta = {
  "Bike Purchase": { icon: "FiTruck", color: "#22c55e" },
  Vacation: { icon: "FiMap", color: "#38bdf8" },
  House: { icon: "FiHome", color: "#a78bfa" },
  Wedding: { icon: "FiHeart", color: "#f472b6" },
  Laptop: { icon: "FiMonitor", color: "#f59e0b" },
  Mobile: { icon: "FiSmartphone", color: "#06b6d4" },
  "Insurance Renewal": { icon: "FiShield", color: "#84cc16" },
  "Bike Servicing": { icon: "FiTool", color: "#fb7185" },
  Festival: { icon: "FiGift", color: "#eab308" },
  Birthday: { icon: "FiGift", color: "#ec4899" },
  "Medical Expense": { icon: "FiActivity", color: "#ef4444" },
  Education: { icon: "FiBookOpen", color: "#6366f1" },
  "Home Renovation": { icon: "FiHome", color: "#14b8a6" },
  Other: { icon: "FiTarget", color: "#64748b" },
};

export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

export const calculatePlanPreview = ({
  estimatedAmount,
  savedAmount,
  targetDate,
  inflationRate,
}) => {
  const estimated = Number(estimatedAmount || 0);
  const saved = Number(savedAmount || 0);
  const remaining = Math.max(estimated - saved, 0);
  const today = new Date();
  const target = targetDate ? new Date(targetDate) : today;
  const daysRemaining = Math.max(
    0,
    Math.ceil((target - today) / (1000 * 60 * 60 * 24)),
  );
  const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));
  const yearsRemaining = Math.max(daysRemaining / 365, 0);
  const dailySaving = daysRemaining > 0 ? Math.ceil(remaining / daysRemaining) : remaining;
  const weeklySaving = Math.ceil(dailySaving * 7);
  const monthlySaving = Math.ceil(remaining / monthsRemaining);
  const completionPercentage =
    estimated > 0 ? Math.min(100, Math.round((saved / estimated) * 100)) : 0;
  const expectedAmountAfterInflation = Math.round(
    estimated * Math.pow(1 + Number(inflationRate || 0) / 100, yearsRemaining),
  );

  return {
    remaining,
    daysRemaining,
    monthsRemaining,
    dailySaving,
    weeklySaving,
    monthlySaving,
    completionPercentage,
    expectedAmountAfterInflation,
  };
};

export const statusClasses = {
  Upcoming: "bg-slate-500/15 text-slate-200 border-slate-400/20",
  "On Track": "bg-emerald-500/15 text-emerald-200 border-emerald-400/20",
  Behind: "bg-amber-500/15 text-amber-200 border-amber-400/20",
  Completed: "bg-cyan-500/15 text-cyan-200 border-cyan-400/20",
  Cancelled: "bg-rose-500/15 text-rose-200 border-rose-400/20",
  Urgent: "bg-red-500/15 text-red-200 border-red-400/20",
};

export const priorityClasses = {
  Low: "bg-slate-500/15 text-slate-200",
  Medium: "bg-sky-500/15 text-sky-200",
  High: "bg-orange-500/15 text-orange-200",
  Critical: "bg-red-500/15 text-red-200",
};
