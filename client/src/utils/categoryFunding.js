// =========================================================================
// SPENDING FROM THE WRONG ACCOUNT
//
// A budget line names the account that funds it. When an expense is recorded
// against that line but paid from somewhere else, the plan and the balances
// quietly drift apart: the category's account keeps money it no longer needs,
// and the account that actually paid is short by the same amount.
//
// The fix is to move the money first, so the expense leaves the account the
// plan said it would. This works out whether that applies, and for how much.
//
// Three cases where it deliberately does NOT apply:
//
//   1. The category names no account. There is nothing to move from, and
//      guessing one would invent a transfer nobody asked for.
//
//   2. It is the same account. Nothing to do.
//
//   3. The expense is on a credit card. Spending on credit moves no cash at
//      all - the card bill will, later. Pushing cash into a card here would
//      be a card payment, which is a different act entirely.
// =========================================================================

export const isCard = (account) => account?.type === "Credit Card";

export const planCategoryFunding = ({
  category,
  accounts = [],
  payingAccountId,
  amount,
}) => {
  const none = { needed: false, reason: null };

  const sourceId = category?.accountId ? String(category.accountId) : "";

  if (!sourceId) return { ...none, reason: "category-has-no-account" };

  if (!payingAccountId) return { ...none, reason: "no-account-chosen" };

  if (sourceId === String(payingAccountId)) return { ...none, reason: "same-account" };

  const source = accounts.find(
    (account) => String(account._id) === sourceId,
  );

  const paying = accounts.find(
    (account) => String(account._id) === String(payingAccountId),
  );

  // A category pointing at an account that has since been deleted.
  if (!source || !paying) return { ...none, reason: "account-missing" };

  // Case 3: no cash moves when you pay by card.
  if (isCard(paying)) return { ...none, reason: "paying-by-card" };

  // Nor does it make sense to pull cash out of a card to fund a bank.
  if (isCard(source)) return { ...none, reason: "source-is-card" };

  const wanted = Math.max(Number(amount) || 0, 0);

  if (wanted <= 0) return { ...none, reason: "no-amount" };

  const available = Math.max(Number(source.balance || 0), 0);

  // Never propose moving more than is there: it would fail, or overdraw the
  // very account the plan depends on.
  const transferable = Math.min(wanted, available);

  return {
    needed: true,
    reason: "different-account",
    source,
    paying,
    // What the plan says should move.
    wanted,
    // What actually can, which is the figure the button commits to.
    amount: transferable,
    available,
    shortfall: Math.max(wanted - available, 0),
    // True when the source cannot cover the whole expense, so the user is
    // told rather than silently given a smaller transfer than they expect.
    partial: transferable > 0 && transferable < wanted,
    possible: transferable > 0,
  };
};
