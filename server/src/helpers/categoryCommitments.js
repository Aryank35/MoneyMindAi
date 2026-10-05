// =========================================================================
// WHAT IS ALREADY PROMISED FROM A CATEGORY
//
// A budget line can look healthy and still be fully spoken for. "Rent" with
// a 20,000 limit and 0 spent has room for anything - until you remember the
// 18,000 rent bill in the planner that has not been paid yet.
//
// This answers one question: if this expense goes through, does the category
// still cover what is already planned out of it?
//
//   room = limit - spent - stillToPay
//
// Three rules:
//
//   1. Only bills not yet paid count. A schedule already marked paid has
//      become an expense, so counting it again would double it.
//
//   2. Only this period. A bill due next month is next month's problem and
//      has its own budget line to come out of.
//
//   3. The warning is about the category, not the account. Whether the money
//      exists is a separate question, answered by safe-to-spend; this is
//      about whether the plan still adds up.
// =========================================================================

const round0 = (value) => Math.round(Number(value) || 0);

const keyOf = (name) => String(name || "").trim().toLowerCase();

export const buildCategoryCommitment = ({
  categoryName,
  limit = 0,
  spent = 0,
  upcomingBills = [],
  amount = 0,
  horizon,
}) => {
  const key = keyOf(categoryName);

  const idle = {
    hasCommitments: false,
    exceeds: false,
    categoryName,
    limit: round0(limit),
    spent: round0(spent),
    stillToPay: 0,
    bills: [],
  };

  if (!key) return idle;

  // Rules 1 and 2: unpaid, inside the window, and on this category.
  const bills = upcomingBills
    .filter((bill) => keyOf(bill.category) === key)
    .filter((bill) => !horizon || new Date(bill.date) <= horizon)
    .map((bill) => ({
      scheduleId: String(bill.scheduleId || ""),
      name: bill.name,
      amount: round0(bill.amount),
      date: bill.date,
      isOverdue: Boolean(bill.isOverdue),
    }))
    .filter((bill) => bill.amount > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const stillToPay = bills.reduce((sum, bill) => sum + bill.amount, 0);

  if (stillToPay <= 0) return idle;

  const cap = round0(limit);
  const used = round0(spent);
  const wanted = round0(amount);

  // What is left after this expense and everything already promised.
  const afterThis = cap - used - wanted;

  const room = afterThis - stillToPay;

  return {
    hasCommitments: true,
    categoryName,
    limit: cap,
    spent: used,
    amount: wanted,
    stillToPay,
    bills,
    // Room left for the planned bills once this expense is through. Negative
    // means the plan no longer fits.
    room,
    shortfall: Math.max(-room, 0),
    // A limit of zero is not a budget, so it is never called an overspend -
    // there is nothing to exceed.
    exceeds: cap > 0 && room < 0,
    // True when the category is already over before this expense is counted,
    // so the wording can say "already" rather than blaming this one.
    alreadyOver: cap > 0 && cap - used - stillToPay < 0,
  };
};
