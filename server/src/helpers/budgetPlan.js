// =========================================================================
// BUDGET PLAN
//
// Turns a month's plan plus what actually happened into something honest.
// Four rules, each answering a way the old view could mislead:
//
//   1. Nothing escapes. Spending on a category that is not in the plan does
//      not vanish - it lands in an "unbudgeted" bucket and counts toward the
//      month. A budget that only measures what you remembered to plan for
//      will always say you are fine.
//
//   2. Overspend is real. A line with a 500 limit and 800 spent is 300 over,
//      and that 300 counts. Capping the bar at 100% hides exactly the thing
//      the user needs to see.
//
//   3. Settling a debt is not spending. Paying a card moves money to clear a
//      purchase that was already counted when it was made; counting the
//      payment too would charge the same rupee twice. The ledger already
//      keeps transfers out of spending, and this keeps it that way.
//
//   4. A limit is never proposed below what is already spent. Any automatic
//      rebalance that ignores this "frees up" money by inventing an instant
//      overspend somewhere else.
// =========================================================================

export const GROUPS = ["need", "want", "save"];

export const GROUP_LABELS = {
  need: "Needs",
  want: "Wants",
  save: "Savings & investing",
};

export const DEFAULT_RULE = { need: 50, want: 30, save: 20 };

// Where a line sits when the user has not said. The legacy `type` is the
// best signal available, and it is only ever a starting point.
const GROUP_FROM_TYPE = {
  Bill: "need",
  Expense: "need",
  Savings: "save",
  Investment: "save",
};

export const groupOf = (category) =>
  category?.group || GROUP_FROM_TYPE[category?.type] || "need";

export const monthKeyOf = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const monthLabelOf = (date = new Date()) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

// A budget stores its month as a label like "September 2026"; older rows have
// no monthKey at all, so it is derived rather than trusted.
//
// Parsed strictly rather than with `new Date(label)`, which is far too
// forgiving: `new Date("?? 1")` does not return NaN, it returns January 2001.
// A budget silently filed under the wrong month is worse than one with no
// month at all, so anything unrecognised yields "".
export const keyForBudget = (budget) => {
  if (budget?.monthKey) return budget.monthKey;

  const match = /^\s*([A-Za-z]+)\s+(\d{4})\s*$/.exec(budget?.month || "");

  if (!match) return "";

  const index = MONTH_NAMES.indexOf(match[1].toLowerCase());

  if (index < 0) return "";

  return `${match[2]}-${String(index + 1).padStart(2, "0")}`;
};

const round = (value) => Math.round(Number(value) || 0);

// =========================================================================
// THE ANALYSIS
// =========================================================================

export const buildBudgetPlan = ({
  budget,
  spendRows = [],
  safeToSpend = null,
}) => {
  const categories = budget?.categories || [];

  // Spending is keyed by category name, case-insensitively: "Food" and
  // "food" are one line to a person, and should be to the budget too.
  const spentByName = new Map();

  for (const row of spendRows) {
    const key = String(row.label || "Other").trim().toLowerCase();

    const entry = spentByName.get(key) || {
      name: String(row.label || "Other").trim(),
      amount: 0,
      count: 0,
    };

    entry.amount += Math.abs(Number(row.amount || 0));
    entry.count += 1;

    spentByName.set(key, entry);
  }

  const planned = categories.map((category) => {
    const key = String(category.name || "").trim().toLowerCase();

    const hit = spentByName.get(key);

    const spent = hit?.amount || 0;

    const limit = Number(category.limit || 0);

    // Consumed here so whatever is left in the map is, by definition,
    // spending with no plan behind it.
    spentByName.delete(key);

    const over = Math.max(spent - limit, 0);

    return {
      name: category.name,
      limit,
      spent,
      count: hit?.count || 0,
      group: groupOf(category),
      // Carried through so a caller writing these lines back does not drop
      // it: `type` still seeds the group for any line the user has not
      // tagged, so losing it would silently re-file Savings as a Need.
      type: category.type || "Expense",
      icon: category.icon,
      color: category.color,
      accountId: category.accountId,
      // Remaining is floored at zero; `over` carries the other side, so a
      // caller never has to know whether a negative remaining means "over".
      remaining: Math.max(limit - spent, 0),
      over,
      percent: limit > 0 ? Math.round((spent / limit) * 100) : spent > 0 ? 100 : 0,
      isOver: over > 0,
    };
  });

  // Rule 1: what is left over never planned for.
  const unbudgeted = [...spentByName.values()]
    .map((entry) => ({
      name: entry.name,
      spent: entry.amount,
      count: entry.count,
    }))
    .sort((a, b) => b.spent - a.spent);

  const unbudgetedTotal = unbudgeted.reduce((sum, item) => sum + item.spent, 0);

  const plannedTotal = planned.reduce((sum, item) => sum + item.limit, 0);

  const plannedSpent = planned.reduce((sum, item) => sum + item.spent, 0);

  const overspend = planned.reduce((sum, item) => sum + item.over, 0);

  // Rule 2: the month total includes what was spent off-plan and what ran
  // past a limit. This is the number that matches the bank.
  const totalSpent = plannedSpent + unbudgetedTotal;

  const totalBudget = Number(budget?.totalBudget || 0);

  // What the plan has not handed to any category yet.
  const unallocated = Math.max(totalBudget - plannedTotal, 0);

  // =======================================================================
  // 50 / 30 / 20
  // =======================================================================

  const rule = {
    ...DEFAULT_RULE,
    ...(budget?.allocationRule || {}),
  };

  const groups = GROUPS.map((key) => {
    const lines = planned.filter((item) => item.group === key);

    const limit = lines.reduce((sum, item) => sum + item.limit, 0);
    const spent = lines.reduce((sum, item) => sum + item.spent, 0);

    const target = round((totalBudget * (rule[key] || 0)) / 100);

    return {
      key,
      label: GROUP_LABELS[key],
      limit,
      spent,
      target,
      targetPercent: rule[key] || 0,
      // Measured against the plan, so the rings answer "is my plan balanced"
      // rather than "has the month finished".
      actualPercent: plannedTotal > 0 ? Math.round((limit / plannedTotal) * 100) : 0,
      spentPercent: totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0,
      drift: limit - target,
      count: lines.length,
    };
  });

  // =======================================================================
  // FUNDING - is the plan backed by money that exists?
  // =======================================================================

  const remainingPlan = Math.max(totalBudget - totalSpent, 0);

  const cashAware = typeof safeToSpend === "number";

  const unfunded = cashAware ? Math.max(remainingPlan - safeToSpend, 0) : 0;

  return {
    monthKey: keyForBudget(budget),
    month: budget?.month || "",
    totalBudget,
    allocationMode: budget?.allocationMode || "manual",
    rule,

    categories: planned,
    unbudgeted,
    groups,

    totals: {
      plannedTotal,
      plannedSpent,
      unbudgetedTotal,
      totalSpent,
      overspend,
      unallocated,
      remaining: Math.max(totalBudget - totalSpent, 0),
      // Allowed to be negative: spending past the whole plan is a state the
      // user has to see, not one to round away.
      net: totalBudget - totalSpent,
      percentUsed:
        totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    },

    funding: {
      cashAware,
      safeToSpend: cashAware ? safeToSpend : null,
      remainingPlan,
      unfunded,
      isFunded: !cashAware || unfunded <= 0,
    },
  };
};

// =========================================================================
// PROPOSALS - computed here, applied only when the user says so
// =========================================================================

// Bring the plan down to the cash that actually exists. Wants give way
// first, then savings, and needs only as a last resort - cutting rent before
// cutting entertainment would be advice worth ignoring.
const CUT_ORDER = ["want", "save", "need"];

export const proposeFitToCash = (plan) => {
  const { funding, categories } = plan;

  if (!funding.cashAware || funding.unfunded <= 0) {
    return { needed: false, shortfall: 0, changes: [] };
  }

  let shortfall = funding.unfunded;

  const changes = [];

  for (const group of CUT_ORDER) {
    if (shortfall <= 0) break;

    const lines = categories
      .filter((item) => item.group === group)
      // Rule 4: a limit cannot go below what has already been spent, so the
      // deepest cut available is whatever headroom is left on the line.
      .map((item) => ({ item, headroom: Math.max(item.limit - item.spent, 0) }))
      .filter((entry) => entry.headroom > 0)
      // Take from the roomiest first: fewer lines disturbed.
      .sort((a, b) => b.headroom - a.headroom);

    const available = lines.reduce((sum, entry) => sum + entry.headroom, 0);

    if (available <= 0) continue;

    const take = Math.min(shortfall, available);

    // Proportional to headroom, so no single line is gutted.
    let applied = 0;

    lines.forEach((entry, index) => {
      const isLast = index === lines.length - 1;

      const cut = isLast
        ? take - applied
        : Math.min(
            entry.headroom,
            round((take * entry.headroom) / available),
          );

      if (cut <= 0) return;

      applied += cut;

      changes.push({
        name: entry.item.name,
        group,
        from: entry.item.limit,
        to: entry.item.limit - cut,
        cut,
      });
    });

    shortfall -= take;
  }

  // Reaching into needs means the shortfall could not be met from wants and
  // savings alone. The arithmetic is still right, but "cut your rent" is not
  // advice to hand over without saying so - the honest answer at that point
  // is usually more income or drawing on savings, not a smaller rent line.
  const cutsNeeds = changes.some((change) => change.group === "need");

  return {
    needed: true,
    shortfall: funding.unfunded,
    // Anything still short after every line has been taken to its floor.
    unresolved: Math.max(shortfall, 0),
    cutsNeeds,
    changes,
    newTotal: plan.totals.plannedTotal - (funding.unfunded - Math.max(shortfall, 0)),
  };
};

// Where an overspent line could be covered from: unallocated money first,
// then any line with genuine headroom.
export const coverOptions = (plan, categoryName) => {
  const target = plan.categories.find((item) => item.name === categoryName);

  if (!target || target.over <= 0) return { over: 0, sources: [] };

  const sources = [];

  if (plan.totals.unallocated > 0) {
    sources.push({
      kind: "unallocated",
      name: "Unallocated",
      available: plan.totals.unallocated,
    });
  }

  for (const item of plan.categories) {
    if (item.name === categoryName) continue;

    const headroom = Math.max(item.limit - item.spent, 0);

    if (headroom > 0) {
      sources.push({
        kind: "category",
        name: item.name,
        group: item.group,
        available: headroom,
      });
    }
  }

  return {
    over: target.over,
    sources: sources.sort((a, b) => b.available - a.available),
  };
};

// Targets from the rule. Only the split is set here - the total is the
// user's call, since it depends on income they may not want fully budgeted.
export const applyRule = (totalBudget, rule = DEFAULT_RULE) =>
  GROUPS.reduce((acc, key) => {
    acc[key] = round((Number(totalBudget || 0) * (rule[key] || 0)) / 100);

    return acc;
  }, {});

// =========================================================================
// WHAT EACH BANK NEEDS TO HOLD
//
// Categories carry the account that funds them, so a plan implies a required
// balance per account. Three rules decide it:
//
//   1. What is REMAINING is what is required. A line with a 5,000 limit and
//      3,000 already spent needs 2,000 sitting there, not 5,000 - the spent
//      part has already left.
//
//   2. A card-funded line asks nothing of a bank. Spending on credit and
//      settling the card later is a different movement; the card's own
//      outstanding is already reserved against cash elsewhere.
//
//   3. A line with no account assigned cannot be demanded of any bank. It is
//      surfaced rather than spread around, because guessing which account
//      should hold it would invent a shortfall that may not exist.
// =========================================================================

export const buildAccountRequirements = ({
  categories = [],
  accounts = [],
  isCashType = () => true,
}) => {
  const byId = new Map(accounts.map((account) => [String(account._id), account]));

  const required = new Map();

  const unassigned = [];

  const onCards = [];

  for (const line of categories) {
    // Rule 1.
    const need = Math.max(Number(line.remaining || 0), 0);

    if (need <= 0) continue;

    const id = line.accountId ? String(line.accountId) : "";

    const account = id ? byId.get(id) : null;

    if (!account) {
      // Rule 3. Includes a category pointing at an account since deleted.
      unassigned.push({ name: line.name, required: need, group: line.group });

      continue;
    }

    // Rule 2.
    if (!isCashType(account.type)) {
      onCards.push({
        name: line.name,
        required: need,
        group: line.group,
        accountName: account.name,
        accountType: account.type,
      });

      continue;
    }

    const entry = required.get(id) || {
      accountId: id,
      name: account.name,
      type: account.type,
      icon: account.icon,
      balance: Number(account.balance || 0),
      required: 0,
      lines: [],
    };

    entry.required += need;
    entry.lines.push({ name: line.name, required: need, group: line.group });

    required.set(id, entry);
  }

  const banks = [...required.values()]
    .map((entry) => ({
      ...entry,
      shortfall: Math.max(entry.required - entry.balance, 0),
      surplus: Math.max(entry.balance - entry.required, 0),
      // Allowed past 100: an account holding less than its plan needs is
      // exactly what this panel exists to show.
      coverage:
        entry.required > 0
          ? Math.round((entry.balance / entry.required) * 100)
          : 100,
      lines: entry.lines.sort((a, b) => b.required - a.required),
    }))
    .sort((a, b) => b.shortfall - a.shortfall || b.required - a.required);

  // Accounts holding money that no category has claimed - the places a
  // shortfall can be funded from without disturbing another plan line.
  const donors = accounts
    .filter((account) => isCashType(account.type))
    .map((account) => {
      const claimed = required.get(String(account._id))?.required || 0;

      return {
        accountId: String(account._id),
        name: account.name,
        icon: account.icon,
        balance: Number(account.balance || 0),
        claimed,
        spare: Math.max(Number(account.balance || 0) - claimed, 0),
      };
    })
    .filter((account) => account.spare > 0)
    .sort((a, b) => b.spare - a.spare);

  return {
    banks,
    donors,
    unassigned: unassigned.sort((a, b) => b.required - a.required),
    onCards: onCards.sort((a, b) => b.required - a.required),

    totals: {
      required: banks.reduce((sum, bank) => sum + bank.required, 0),
      shortfall: banks.reduce((sum, bank) => sum + bank.shortfall, 0),
      unassigned: unassigned.reduce((sum, item) => sum + item.required, 0),
      onCards: onCards.reduce((sum, item) => sum + item.required, 0),
    },
  };
};
