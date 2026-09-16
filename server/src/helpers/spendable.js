import { getOutstanding } from "./creditCard.js";

// =========================================================================
// SAFE TO SPEND
//
// What is actually free to spend, as opposed to what the balances happen to
// add up to. Three rules decide the whole calculation:
//
//   1. Only cash counts. A credit card's available credit is borrowing, not
//      money you hold, so cards never add to the spendable side. What they
//      contribute is a debt on the reserved side.
//
//   2. Reserve what is already promised. Money still sitting in a bank
//      account but owed to a card, a bill due this period, or a lender is
//      not free, and showing it as free is how a budget gets blown.
//
//   3. Never reserve money that has already left. Funding a pot and lending
//      out both deduct from the account balance at the time they happen
//      (wishlistController and obligationController call deductBalance), so
//      subtracting them again here would count them twice. Borrowing is the
//      mirror of that: it ADDS to the balance, which is exactly why what is
//      owed on it has to be reserved.
//
// The result is one side of a pair. The other is what the budget has left,
// and the smaller of the two is what can really be spent - see moneyLeft().
// =========================================================================

// Types whose balance is spendable cash. Investments and EPF are savings a
// user should have to consciously liquidate, not treat as this week's money.
const CASH_TYPES = new Set(["Bank", "Cash", "UPI", "Wallet"]);

export const isCashType = (type) => CASH_TYPES.has(type);

// An account counts unless the user has said otherwise; the flag is null
// until they touch it, so existing accounts get a sensible answer without a
// migration.
export const countsAsSpendable = (account) =>
  account?.includeInSpendable ?? isCashType(account?.type);

export const sumSpendableCash = (accounts = []) =>
  accounts
    .filter((account) => countsAsSpendable(account) && isCashType(account.type))
    .reduce((total, account) => total + Number(account.balance || 0), 0);

// Card debt is reserved whether or not the card itself is "selected": the
// cash to settle it comes out of the very accounts being counted.
export const collectCardDues = (accounts = []) =>
  accounts
    .filter((account) => account.type === "Credit Card")
    .map((account) => ({
      kind: "card",
      id: String(account._id),
      label: `${account.name} outstanding`,
      amount: getOutstanding(account.balance),
    }))
    .filter((item) => item.amount > 0);

// Bills falling due inside the window. Already-overdue ones are included:
// they are the most certain claim on the balance there is.
export const collectBillDues = (upcoming = [], horizon) =>
  upcoming
    .filter((item) => new Date(item.date) <= horizon)
    .map((item) => ({
      kind: "bill",
      id: String(item.scheduleId),
      label: item.name,
      date: item.date,
      amount: Number(item.amount || 0),
    }))
    .filter((item) => item.amount > 0);

// Borrowed money sits in the balance and is owed. Only what is promised
// inside the window is reserved - a loan repayable next year should not
// swallow this month's spending, and an undated one cannot be timed at all.
export const collectBorrowedDues = (obligations = [], horizon) =>
  obligations
    .filter(
      (item) =>
        item.direction === "borrowed" &&
        !item.isClosed &&
        item.outstanding > 0 &&
        item.promiseDate &&
        new Date(item.promiseDate) <= horizon,
    )
    .map((item) => ({
      kind: "borrowed",
      id: String(item._id),
      label: `Owed to ${item.counterparty || "a lender"}`,
      date: item.promiseDate,
      amount: Number(item.outstanding || 0),
    }));

// The two limits are different things, so the binding one is named rather
// than silently taken. "Cash" means the plan is not fully funded; "budget"
// means there is money but the plan says stop.
export const moneyLeft = ({ safeToSpend, budgetRemaining, hasBudget }) => {
  if (!hasBudget) {
    return { amount: safeToSpend, limitedBy: "cash" };
  }

  return safeToSpend <= budgetRemaining
    ? { amount: safeToSpend, limitedBy: "cash" }
    : { amount: budgetRemaining, limitedBy: "budget" };
};

export const buildSpendable = ({
  accounts = [],
  upcomingBills = [],
  obligations = [],
  budgetRemaining = 0,
  hasBudget = false,
  horizon,
}) => {
  const spendableCash = sumSpendableCash(accounts);

  const items = [
    ...collectCardDues(accounts),
    ...collectBillDues(upcomingBills, horizon),
    ...collectBorrowedDues(obligations, horizon),
  ];

  const reserved = items.reduce((total, item) => total + item.amount, 0);

  // Reserving more than is held is a real state worth seeing, so this is
  // allowed to go negative rather than being clamped to zero.
  const safeToSpend = spendableCash - reserved;

  const left = moneyLeft({ safeToSpend, budgetRemaining, hasBudget });

  return {
    spendableCash,
    reserved,
    reservedItems: items.sort((a, b) => b.amount - a.amount),
    safeToSpend,
    budgetRemaining,
    hasBudget,
    moneyLeft: left.amount,
    limitedBy: left.limitedBy,

    // How much of what is still planned has no cash behind it.
    unfunded: hasBudget ? Math.max(budgetRemaining - safeToSpend, 0) : 0,

    accounts: accounts.map((account) => ({
      _id: account._id,
      name: account.name,
      type: account.type,
      icon: account.icon,
      balance: account.balance,
      included: countsAsSpendable(account),
      // Cards can never be counted as spendable cash, so the picker shows
      // them as unavailable rather than as merely unticked.
      selectable: isCashType(account.type),
    })),
  };
};
