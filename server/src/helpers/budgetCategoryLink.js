import Budget from "../models/Budget.js";
import { keyForBudget, monthKeyOf } from "./budgetPlan.js";

// =========================================================================
// KEEPING CATEGORIES IN THE BUDGET
//
// A scheduled bill and a plan both name a budget category, and both used to
// take whatever string they were given. A bill called "Netflix" with no
// matching budget line became unbudgeted spending the moment it was paid -
// correct in the ledger, invisible in the plan.
//
// This closes that loop: a named category is either one that already exists,
// or it is added to the budget so the spending has somewhere to land.
//
// Two rules decide how:
//
//   1. Matching is case-insensitive on the trimmed name. "netflix" and
//      "Netflix " are the same budget line to a person, so creating a second
//      one would split the same spending in two.
//
//   2. A new line starts with a zero limit. Inventing a number would be a
//      guess the user never made, and a category at zero is visible,
//      honest, and one tap from being set properly.
// =========================================================================

const keyOf = (name) => String(name || "").trim().toLowerCase();

// Which months a category should be added to. A bill recurring from today
// onward belongs in this month; one dated in a future month belongs there.
export const monthKeyForDate = (date) =>
  monthKeyOf(date ? new Date(date) : new Date());

export const findCategory = (budget, name) => {
  const key = keyOf(name);

  if (!key) return null;

  // Always null when there is no match, never undefined: callers test the
  // result directly and two kinds of "nothing" invite a missed case.
  return (
    (budget?.categories || []).find(
      (category) => keyOf(category.name) === key,
    ) || null
  );
};

// Is this name already a line in the budget for that month?
export const categoryExists = async (userId, name, monthKey) => {
  if (!keyOf(name)) return { exists: true, reason: "no-name" };

  const budget = await findBudgetFor(userId, monthKey);

  if (!budget) return { exists: false, reason: "no-budget", budget: null };

  const hit = findCategory(budget, name);

  return {
    exists: Boolean(hit),
    reason: hit ? "found" : "missing",
    budget,
    category: hit || null,
  };
};

// Local copy of the month lookup, kept here so this helper does not have to
// import a controller.
const findBudgetFor = async (userId, monthKey) => {
  const key = monthKey || monthKeyOf(new Date());

  const direct = await Budget.findOne({ userId, monthKey: key });

  if (direct) return direct;

  const all = await Budget.find({ userId }).sort({ createdAt: -1 });

  return all.find((budget) => keyForBudget(budget) === key) || null;
};

// Adds the category to that month's budget if it is not already there.
// Returns what happened so the caller can tell the user rather than doing it
// silently - a budget that grows a line on its own is unsettling.
export const ensureCategory = async (
  userId,
  name,
  { monthKey, limit = 0, group = null, accountId = null } = {},
) => {
  const trimmed = String(name || "").trim();

  if (!trimmed) return { added: false, reason: "no-name" };

  const key = monthKey || monthKeyOf(new Date());

  const budget = await findBudgetFor(userId, key);

  // Nothing to add it to. Said plainly rather than creating a budget the
  // user never asked for - a month's plan is theirs to start.
  if (!budget) return { added: false, reason: "no-budget", monthKey: key };

  if (findCategory(budget, trimmed)) {
    return { added: false, reason: "already-there", monthKey: key, budget };
  }

  budget.categories.push({
    name: trimmed,
    // Rule 2: zero, not a guess.
    limit: Math.max(Number(limit) || 0, 0),
    group,
    accountId: accountId || null,
    type: "Expense",
  });

  await budget.save();

  return {
    added: true,
    reason: "added",
    monthKey: key,
    month: budget.month,
    budget,
    category: trimmed,
    limit: Math.max(Number(limit) || 0, 0),
  };
};
