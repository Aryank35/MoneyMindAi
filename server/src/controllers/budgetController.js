import Budget from "../models/Budget.js";
import Account from "../models/Account.js";
import Obligation from "../models/Obligation.js";
import Investment from "../models/Investment.js";
import { monthlyAutoDebitTotal } from "../helpers/autoDebits.js";
import {
  sumBudgetableIncome,
  getBudgetableIncomeBreakdown,
} from "./incomeController.js";
import { collectEntries, SPEND_KINDS } from "./statementController.js";
import {
  collectUpcomingSchedules,
  loadDecoratedSchedules,
} from "./scheduleController.js";
import { decorateObligation } from "./obligationController.js";
import {
  buildSpendable,
  countsAsSpendable,
  isCashType,
} from "../helpers/spendable.js";
import { startOfDay } from "../helpers/dates.js";
import { buildCategoryCommitment } from "../helpers/categoryCommitments.js";
import {
  buildAccountRequirements,
  buildBudgetPlan,
  keyForBudget,
  monthKeyOf,
  monthLabelOf,
  proposeFitToCash,
} from "../helpers/budgetPlan.js";

const monthKeyFromParts = ({ month, year }) =>
  `${year}-${String(month).padStart(2, "0")}`;

// Budgets are keyed by a "September 2026" label; income is keyed by numeric
// month/year. This is the seam between the two.
const parseMonthLabel = (label) => {
  const parsed = new Date(`${label} 1`);

  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();

    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  return { month: parsed.getMonth() + 1, year: parsed.getFullYear() };
};

// A budget with no savings line is a spending plan, not a budget. The rule
// is deliberately about the GROUP, not a category called "Investment": people
// name it SIPs, Mutual funds, Future - any of which is a real savings line.
const hasSavingsLine = (categories = []) =>
  categories.some(
    (category) =>
      category.group === "save" ||
      category.type === "Investment" ||
      category.type === "Savings",
  );

const validateCategories = (totalBudget, categories) => {
  let totalCategoryLimit = 0;

  const uniqueNames = new Set();

  for (const category of categories) {
    const name = category.name?.trim()?.toLowerCase();

    const limit = Number(category.limit);

    if (!name) {
      return "Category name is required";
    }

    if (limit < 0) {
      return "Category limit cannot be negative";
    }

    if (uniqueNames.has(name)) {
      return `Duplicate category: ${category.name}`;
    }

    uniqueNames.add(name);

    totalCategoryLimit += limit;
  }

  if (totalCategoryLimit > totalBudget) {
    return "Category limits exceed total budget";
  }

  if (!hasSavingsLine(categories)) {
    return "Add a savings or investment category - every budget needs somewhere for money to go that is not spending";
  }

  return null;
};

const calculateLimits = (totalBudget) => {
  const now = new Date();

  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();

  return {
    dailyLimit: Math.round(totalBudget / daysInMonth),

    weeklyLimit: Math.round(totalBudget / 4),
  };
};

export const createBudget = async (req, res) => {
  try {
    const { userId, month, totalBudget, categories } = req.body;

    const validationError = validateCategories(
      Number(totalBudget),
      categories || [],
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const cleanedCategories = categories.map((category) => ({
      name: category.name.trim(),

      limit: Number(category.limit),

      accountId: category.accountId || null,

      type: category.type || "Expense",

      // Null is meaningful: it means "not chosen", and the plan derives a
      // starting group from `type` rather than guessing here.
      group: category.group || null,

      icon: category.icon || "📦",

      color: category.color || "#6366F1",

      spent: Number(category.spent || 0),
    }));

    const { dailyLimit, weeklyLimit } = calculateLimits(Number(totalBudget));

    // The budget is planned against income that has actually been recorded,
    // so this is derived here rather than accepted from the client.
    const period = parseMonthLabel(month);

    const estimatedIncome = await sumBudgetableIncome(
      userId,
      period.month,
      period.year,
    );

    const budget = await Budget.create({
      userId,
      month,

      // Stamped so the month can be queried directly. Picking "the newest
      // budget" was never the same question as "this month's budget".
      monthKey: monthKeyFromParts(period),

      allocationMode: req.body.allocationMode || "manual",
      allocationRule: req.body.allocationRule || undefined,

      totalBudget: Number(totalBudget),

      estimatedIncome,

      dailyLimit,
      weeklyLimit,

      categories: cleanedCategories,
    });

    res.status(201).json({
      success: true,
      data: budget,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Every caller of this takes data[0], so what sits first decides which month
// the whole app plans against. Sorting by createdAt made that "the budget you
// made most recently" - so creating October's plan while still in September
// put October's categories on the Expenses picker.
//
// This month's budget leads. The rest follow newest-month first, so a caller
// wanting history still has it.
export const getBudgetByUser = async (req, res) => {
  try {
    const budgets = await Budget.find({
      userId: req.params.userId,
    }).sort({
      createdAt: -1,
    });

    const currentKey = monthKeyOf(new Date());

    const decorated = budgets.map((budget) => ({
      budget,
      key: keyForBudget(budget),
    }));

    const current = decorated.filter((item) => item.key === currentKey);

    const others = decorated
      .filter((item) => item.key !== currentKey)
      // An unreadable month sorts last rather than jumping the queue.
      .sort((a, b) => (b.key || "").localeCompare(a.key || ""));

    res.json({
      success: true,
      data: [...current, ...others].map((item) => item.budget),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateBudget = async (req, res) => {
  try {
    const { totalBudget, categories } = req.body;

    const validationError = validateCategories(
      Number(totalBudget),
      categories || [],
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const cleanedCategories = categories.map((category) => ({
      name: category.name.trim(),

      limit: Number(category.limit),

      accountId: category.accountId || null,

      type: category.type || "Expense",

      // Null is meaningful: it means "not chosen", and the plan derives a
      // starting group from `type` rather than guessing here.
      group: category.group || null,

      icon: category.icon || "📦",

      color: category.color || "#6366F1",

      spent: Number(category.spent || 0),
    }));

    const existingBudget = await Budget.findById(req.params.id);

    if (!existingBudget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    const period = parseMonthLabel(req.body.month || existingBudget.month);

    const estimatedIncome = await sumBudgetableIncome(
      existingBudget.userId,
      period.month,
      period.year,
    );

    const updatedBudget = await Budget.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        monthKey: monthKeyFromParts(period),
        totalBudget: Number(totalBudget),
        estimatedIncome,
        categories: cleanedCategories,
      },
      {
        new: true,
      },
    );

    res.json({
      success: true,
      data: updatedBudget,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteBudget = async (req, res) => {
  try {
    await Budget.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Budget deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// What the budget for a given month may be planned against. The client uses
// this to prefill the total and to warn when allocations run past income.
export const getBudgetPlanning = async (req, res) => {
  try {
    const { userId } = req.params;

    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();

    const income = await getBudgetableIncomeBreakdown(userId, month, year);

    res.json({
      success: true,
      data: {
        period: { month, year },
        income,
        // Suggested, not enforced - planning ahead of recorded income is
        // legitimate, so the client warns rather than blocks.
        suggestedTotalBudget: income.budgetable,

        // What is already promised to standing instructions every month.
        // This is the floor for the savings line: money that WILL leave the
        // account whether or not the budget makes room for it.
        autoDebitMonthly: monthlyAutoDebitTotal(
          await Investment.find({ userId, isSip: true }),
        ),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Spells out what a budget deletion removes so the confirmation can be
// specific about it.
export const getBudgetDeleteImpact = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    res.json({
      success: true,
      data: {
        month: budget.month,
        totalBudget: budget.totalBudget,
        categoryCount: budget.categories?.length || 0,
        categories: (budget.categories || []).map((category) => ({
          name: category.name,
          limit: category.limit,
          spent: category.spent,
        })),
        // Expenses are their own records - deleting a budget only removes
        // the plan, never the spending history.
        spentTracked: (budget.categories || []).reduce(
          (total, category) => total + Number(category.spent || 0),
          0,
        ),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================================================
// CURRENT MONTH
// =========================================================================

// The budget for a given month, not merely the newest one. Budgets carry a
// monthKey now; older rows do not, so the label is parsed as a fallback and
// the key backfilled on the way past.
export const findBudgetForMonth = async (userId, key) => {
  const direct = await Budget.findOne({ userId, monthKey: key });

  if (direct) return direct;

  const all = await Budget.find({ userId }).sort({ createdAt: -1 });

  const match = all.find((budget) => keyForBudget(budget) === key);

  if (match && !match.monthKey) {
    match.monthKey = key;

    await match.save();
  }

  return match || null;
};

export const getBudgetOverview = async (req, res) => {
  try {
    const { userId } = req.params;

    const now = new Date();

    const key = req.query.month || monthKeyOf(now);

    const [year, month] = key.split("-").map(Number);

    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    const budget = await findBudgetForMonth(userId, key);

    const accounts = await Account.find({ userId });

    // Spending comes from the ledger, so a split share counts and a card
    // payment does not - settling a card moves money to clear a purchase
    // that was already counted when it was made.
    const entries = (
      await Promise.all(accounts.map((account) => collectEntries(account)))
    ).flat();

    const spendRows = entries.filter((entry) => {
      const date = new Date(entry.date);

      return SPEND_KINDS.has(entry.kind) && date >= from && date <= to;
    });

    // Only this month's plan can be measured against this month's cash: a
    // past month's balances are gone, and a future month's have not happened.
    const currentKey = monthKeyOf(now);

    const isCurrentMonth = key === currentKey;
    const isPast = key < currentKey;
    const isFuture = key > currentKey;

    let safeToSpend = null;

    if (isCurrentMonth) {
      const [obligations, decoratedSchedules] = await Promise.all([
        Obligation.find({ userId }),
        loadDecoratedSchedules(userId, startOfDay(now)),
      ]);

      const cash = buildSpendable({
        accounts,
        upcomingBills: collectUpcomingSchedules(
          decoratedSchedules.filter((item) => item.isActive),
          startOfDay(now),
          to,
        ),
        obligations: obligations.map((item) => decorateObligation(item, now)),
        horizon: to,
      });

      safeToSpend = cash.safeToSpend;
    }

    const plan = buildBudgetPlan({ budget, spendRows, safeToSpend });

    // The month before this one, so a month with no plan yet can be started
    // from the last one rather than from an empty form.
    const previousKey = monthKeyOf(new Date(year, month - 2, 1));

    const previous = await findBudgetForMonth(userId, previousKey);

    res.json({
      success: true,
      data: {
        ...plan,
        monthKey: key,
        month: budget?.month || monthLabelOf(from),
        isCurrentMonth,
        isPast,
        isFuture,
        hasBudget: Boolean(budget),

        previousMonth: previous
          ? {
              monthKey: previousKey,
              month: previous.month,
              totalBudget: Number(previous.totalBudget || 0),
              allocationRule: previous.allocationRule || undefined,
              categories: (previous.categories || []).map((category) => ({
                name: category.name,
                limit: Number(category.limit || 0),
                group: category.group || null,
                type: category.type || "Expense",
                accountId: category.accountId || null,
              })),
            }
          : null,
        budgetId: budget?._id || null,
        estimatedIncome: budget?.estimatedIncome || 0,
        dailyLimit: budget?.dailyLimit || 0,
        weeklyLimit: budget?.weeklyLimit || 0,
        proposal: proposeFitToCash(plan),

        // What each account has to hold for the plan to be fundable, and
        // where a shortfall could come from. Only meaningful for a month
        // still to be spent - a finished month's balances have moved on.
        bankFunding: isPast
          ? null
          : buildAccountRequirements({
              categories: plan.categories,
              accounts,
              isCashType,
              // Honours the account selection made on "money left to spend",
              // so the two never disagree about what is yours to move.
              canFund: countsAsSpendable,
            }),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Every month that has a plan, newest first, plus the current month and the
// next one so the navigator can always offer "this month" and "plan ahead"
// even before a budget exists for them.
export const getBudgetMonths = async (req, res) => {
  try {
    const { userId } = req.params;

    const budgets = await Budget.find({ userId }).sort({ createdAt: -1 });

    const now = new Date();

    const currentKey = monthKeyOf(now);

    const nextKey = monthKeyOf(
      new Date(now.getFullYear(), now.getMonth() + 1, 1),
    );

    const seen = new Map();

    for (const budget of budgets) {
      const key = keyForBudget(budget);

      // A budget whose month cannot be read is not silently filed under some
      // other month; it is simply not offered as one.
      if (!key || seen.has(key)) continue;

      seen.set(key, {
        monthKey: key,
        month: budget.month,
        totalBudget: Number(budget.totalBudget || 0),
        categoryCount: (budget.categories || []).length,
        hasBudget: true,
      });
    }

    for (const key of [currentKey, nextKey]) {
      if (seen.has(key)) continue;

      const [year, month] = key.split("-").map(Number);

      seen.set(key, {
        monthKey: key,
        month: monthLabelOf(new Date(year, month - 1, 1)),
        totalBudget: 0,
        categoryCount: 0,
        hasBudget: false,
      });
    }

    const months = [...seen.values()].sort((a, b) =>
      a.monthKey < b.monthKey ? 1 : -1,
    );

    res.json({
      success: true,
      data: { months, currentKey, nextKey },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// IS THIS CATEGORY ALREADY SPOKEN FOR?
//
// Asked while an expense is being typed. A budget line can look healthy and
// still be fully committed - "Rent" at 20,000 with nothing spent has no room
// at all if an 18,000 rent bill is sitting unpaid in the planner.
// =========================================================================

export const getCategoryCommitment = async (req, res) => {
  try {
    const { userId } = req.params;

    const categoryName = String(req.query.category || "").trim();

    const amount = Number(req.query.amount || 0);

    const now = new Date();

    const key = monthKeyOf(now);

    const [year, month] = key.split("-").map(Number);

    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    if (!categoryName) {
      return res.json({
        success: true,
        data: { hasCommitments: false, exceeds: false },
      });
    }

    const [budget, accounts, decoratedSchedules] = await Promise.all([
      findBudgetForMonth(userId, key),
      Account.find({ userId }),
      loadDecoratedSchedules(userId, startOfDay(now)),
    ]);

    const category = (budget?.categories || []).find(
      (item) =>
        String(item.name || "").trim().toLowerCase() ===
        categoryName.toLowerCase(),
    );

    // Spending so far on this line, from the ledger - so a split share counts
    // the same way it does everywhere else.
    const entries = (
      await Promise.all(accounts.map((account) => collectEntries(account)))
    ).flat();

    const spent = entries
      .filter((entry) => {
        const date = new Date(entry.date);

        return (
          SPEND_KINDS.has(entry.kind) &&
          date >= from &&
          date <= to &&
          String(entry.label || "").trim().toLowerCase() ===
            categoryName.toLowerCase()
        );
      })
      .reduce((total, entry) => total - entry.amount, 0);

    const upcomingBills = collectUpcomingSchedules(
      decoratedSchedules.filter((item) => item.isActive),
      startOfDay(now),
      to,
    );

    res.json({
      success: true,
      data: buildCategoryCommitment({
        categoryName,
        limit: Number(category?.limit || 0),
        spent,
        upcomingBills,
        amount,
        horizon: to,
      }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// UTILISATION - ONE MONTH, AND EVERY MONTH
//
// "Did I stick to my budget" is two questions, and answering only one of
// them misleads.
//
//   Per month: this month's plan against this month's spending. A limit is
//   a monthly figure, so measuring it against a running all-time total is
//   meaningless - that total only ever grows, so every category eventually
//   reads "over" however disciplined the month actually was.
//
//   Overall: the same question across every month that had a plan. One bad
//   month is noise; a category over its limit in six months out of eight is
//   a limit set wrong. That is what the trend below is for, and it is why a
//   category's overall allowance is the sum of its MONTHLY limits rather
//   than one limit compared against months of spending.
//
// Spending comes from the ledger rather than the expense collection, so a
// split share counts and a card payment does not - the same rules the
// single-month overview uses, so the two can never disagree.
// =========================================================================

const monthFromKey = (key) => {
  const [year, month] = key.split("-").map(Number);

  return {
    from: new Date(year, month - 1, 1),
    to: new Date(year, month, 0, 23, 59, 59, 999),
  };
};

export const getBudgetUtilization = async (req, res) => {
  try {
    const { userId } = req.params;

    const now = new Date();

    const currentKey = monthKeyOf(now);

    const budgets = await Budget.find({ userId });

    // A budget whose month cannot be read is not silently filed under some
    // other month - the same rule the month navigator uses.
    const byKey = new Map();

    for (const budget of budgets) {
      const key = keyForBudget(budget);

      if (!key) continue;

      // Newest wins if a month somehow ended up with two plans.
      const existing = byKey.get(key);

      if (!existing || budget.createdAt > existing.createdAt) {
        byKey.set(key, budget);
      }
    }

    const accounts = await Account.find({ userId });

    const entries = (
      await Promise.all(accounts.map((account) => collectEntries(account)))
    ).flat();

    const spendRows = entries.filter((entry) => SPEND_KINDS.has(entry.kind));

    const rowsByMonth = new Map();

    for (const row of spendRows) {
      const date = new Date(row.date);

      if (Number.isNaN(date.getTime())) continue;

      const key = monthKeyOf(date);

      if (!rowsByMonth.has(key)) rowsByMonth.set(key, []);

      rowsByMonth.get(key).push(row);
    }

    // A month with spending but no plan still has to be reported: "I never
    // budgeted that month" is one of the more useful things the trend can
    // say. Future months are planning rather than history, though - a plan
    // for next month with nothing spent against it would read as a perfect
    // 0% and drag every average down.
    const keys = [...new Set([...byKey.keys(), ...rowsByMonth.keys()])]
      .filter((key) => key <= currentKey)
      .sort();

    const months = keys.map((key) => {
      const budget = byKey.get(key) || null;

      const rows = rowsByMonth.get(key) || [];

      const plan = buildBudgetPlan({ budget, spendRows: rows });

      const { from } = monthFromKey(key);

      return {
        monthKey: key,
        month: budget?.month || monthLabelOf(from),
        hasBudget: Boolean(budget),
        isCurrentMonth: key === currentKey,
        totalBudget: plan.totalBudget,
        totalSpent: plan.totals.totalSpent,
        overspend: plan.totals.overspend,
        unbudgetedTotal: plan.totals.unbudgetedTotal,
        unallocated: plan.totals.unallocated,
        net: plan.totals.net,
        percentUsed: plan.totals.percentUsed,
        categories: plan.categories.map((category) => ({
          name: category.name,
          limit: category.limit,
          spent: category.spent,
          over: category.over,
          remaining: category.remaining,
          percent: category.percent,
          group: category.group,
          icon: category.icon,
          color: category.color,
        })),
        unbudgeted: plan.unbudgeted,
        groups: plan.groups.map((group) => ({
          key: group.key,
          label: group.label,
          limit: group.limit,
          spent: group.spent,
          target: group.target,
          targetPercent: group.targetPercent,
        })),
      };
    });

    // The current month is still being spent, so scoring it against
    // finished months would punish it for being incomplete. It is reported,
    // just not averaged.
    const settled = months.filter((item) => !item.isCurrentMonth);

    const budgeted = settled.filter((item) => item.hasBudget);

    // ---- per category, across every month it was planned in ----
    const categoryTotals = new Map();

    for (const item of months) {
      for (const category of item.categories) {
        const key = category.name.trim().toLowerCase();

        const entry = categoryTotals.get(key) || {
          name: category.name,
          group: category.group,
          icon: category.icon,
          color: category.color,
          // Summed, not repeated: eight months of a 5,000 limit is a 40,000
          // allowance, and that is what the spend is measured against.
          limit: 0,
          spent: 0,
          over: 0,
          months: 0,
          monthsOver: 0,
          worstMonth: null,
        };

        entry.limit += category.limit;
        entry.spent += category.spent;
        entry.over += category.over;
        entry.months += 1;

        if (category.over > 0) {
          entry.monthsOver += 1;

          if (!entry.worstMonth || category.over > entry.worstMonth.over) {
            entry.worstMonth = {
              monthKey: item.monthKey,
              month: item.month,
              over: category.over,
            };
          }
        }

        categoryTotals.set(key, entry);
      }
    }

    // Spending with no plan behind it, rolled up the same way.
    const unbudgetedTotals = new Map();

    for (const item of months) {
      for (const row of item.unbudgeted) {
        const key = row.name.trim().toLowerCase();

        const entry = unbudgetedTotals.get(key) || {
          name: row.name,
          spent: 0,
          months: 0,
        };

        entry.spent += row.spent;
        entry.months += 1;

        unbudgetedTotals.set(key, entry);
      }
    }

    const categories = [...categoryTotals.values()]
      .map((entry) => ({
        ...entry,
        remaining: Math.max(entry.limit - entry.spent, 0),
        percent:
          entry.limit > 0
            ? Math.round((entry.spent / entry.limit) * 100)
            : entry.spent > 0
              ? 100
              : 0,
        averageSpent: entry.months ? Math.round(entry.spent / entry.months) : 0,
        averageLimit: entry.months ? Math.round(entry.limit / entry.months) : 0,
        isOver: entry.spent > entry.limit,
        // The signal worth acting on: a line that goes over in half its
        // months or more is a limit set wrong, not a run of bad luck.
        isChronic: entry.months >= 2 && entry.monthsOver / entry.months >= 0.5,
      }))
      .sort((a, b) => b.over - a.over || b.spent - a.spent);

    const totalBudget = months.reduce((sum, item) => sum + item.totalBudget, 0);

    const totalSpent = months.reduce((sum, item) => sum + item.totalSpent, 0);

    const ranked = [...budgeted].sort((a, b) => a.percentUsed - b.percentUsed);

    res.json({
      success: true,
      data: {
        currentKey,
        // Newest first - the month picker reads it that way.
        months: [...months].reverse(),
        overall: {
          monthCount: months.length,
          budgetedMonthCount: months.filter((item) => item.hasBudget).length,
          totalBudget,
          totalSpent,
          net: totalBudget - totalSpent,
          overspend: months.reduce((sum, item) => sum + item.overspend, 0),
          unbudgetedTotal: months.reduce(
            (sum, item) => sum + item.unbudgetedTotal,
            0,
          ),
          percentUsed:
            totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
          // Finished months only, for the reason above.
          averagePercentUsed: budgeted.length
            ? Math.round(
                budgeted.reduce((sum, item) => sum + item.percentUsed, 0) /
                  budgeted.length,
              )
            : null,
          averageSpent: settled.length
            ? Math.round(
                settled.reduce((sum, item) => sum + item.totalSpent, 0) /
                  settled.length,
              )
            : null,
          monthsWithinBudget: budgeted.filter((item) => item.net >= 0).length,
          monthsOverBudget: budgeted.filter((item) => item.net < 0).length,
          monthsWithoutPlan: settled.filter((item) => !item.hasBudget).length,
          bestMonth: ranked[0] || null,
          worstMonth: ranked[ranked.length - 1] || null,
          categories,
          unbudgeted: [...unbudgetedTotals.values()].sort(
            (a, b) => b.spent - a.spent,
          ),
          chronicOverspend: categories.filter((item) => item.isChronic),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
