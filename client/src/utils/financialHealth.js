/**
 * Shared "financial health" score calculation.
 *
 * Extracted verbatim from the score logic that already lived (unused) in
 * Dashboard.jsx, so the app shell (Navbar/Sidebar) and the Dashboard page
 * always agree on the same number instead of drifting independently.
 */

const todayKey = () => new Date().toISOString().split("T")[0];

const startOfWeek = () => {
  const start = new Date();
  start.setDate(start.getDate() - start.getDay());
  return start;
};

/**
 * @param {object} dashboardData - the shape returned by
 *   `services/dashboardService.getDashboardData`.
 * @returns {{ score: number, message: string, hasData: boolean }}
 */
export function computeFinancialHealth(dashboardData = {}) {
  const {
    totalBudget = 0,
    totalExpenses = 0,
    totalIncome = 0,
    totalAssets = 0,
    dailyLimit = 0,
    weeklyLimit = 0,
    savingsRate = 0,
    expenses = [],
  } = dashboardData || {};

  const budgetUsed =
    totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;

  const today = todayKey();

  const todaySpent = expenses
    .filter((expense) => expense.expenseDate?.split("T")[0] === today)
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const firstDayOfWeek = startOfWeek();

  const weekSpent = expenses
    .filter((expense) => new Date(expense.expenseDate) >= firstDayOfWeek)
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  let score = 100;

  if (budgetUsed > 100) score -= 25;

  if (savingsRate < 20) score -= 20;

  if (todaySpent > dailyLimit) score -= 10;

  if (weekSpent > weeklyLimit) score -= 10;

  if (totalAssets < totalIncome) score -= 15;

  score = Math.max(0, Math.min(100, score));

  const hasData = !(totalIncome === 0 && totalExpenses === 0);

  const message = !hasData
    ? "Start tracking your finances"
    : score >= 80
      ? "Excellent financial discipline"
      : score >= 60
        ? "Good financial habits"
        : score >= 40
          ? "Average financial health"
          : "Needs budget improvement";

  return { score, message, hasData };
}

/** Short label for tight spaces (navbar pill, sidebar card heading). */
export function getHealthLabel(score = 0, hasData = true) {
  if (!hasData) return "No Data Yet";

  if (score >= 80) return "Excellent";

  if (score >= 60) return "Good";

  if (score >= 40) return "Average";

  return "Needs Attention";
}

const TONES = {
  neutral: {
    dot: "bg-slate-500",
    text: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
  },
  emerald: {
    dot: "bg-emerald-500",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  cyan: {
    dot: "bg-cyan-500",
    text: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  amber: {
    dot: "bg-amber-500",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  red: {
    dot: "bg-red-500",
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
};

/** Literal Tailwind class groups (kept static so Tailwind's scanner picks them up). */
export function getHealthTone(score = 0, hasData = true) {
  if (!hasData) return TONES.neutral;

  if (score >= 80) return TONES.emerald;

  if (score >= 60) return TONES.cyan;

  if (score >= 40) return TONES.amber;

  return TONES.red;
}
