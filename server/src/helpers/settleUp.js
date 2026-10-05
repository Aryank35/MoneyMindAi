// =========================================================================
// SETTLING UP
//
// Once every expense on a plan is in, this works out who hands money to whom
// so that everybody ends square. Three things decide whether the answer is
// usable:
//
//   1. Whole rupees only. Nobody transfers 1,333.33. Every figure here is an
//      integer.
//
//   2. The parts must still add up. Rounding each share on its own loses or
//      invents money - three people splitting 1,000 get 333 each and a rupee
//      vanishes. So shares are rounded by largest remainder: everyone gets
//      the floor, and the leftover rupees go one each to whoever was cut
//      hardest. The total is then exactly the total, always.
//
//   3. As few payments as possible. Everyone paying everyone is correct and
//      useless. Matching the biggest debtor to the biggest creditor settles
//      at most (people - 1) payments, which is the fewest that can work.
// =========================================================================

const round0 = (value) => Math.round(Number(value) || 0);

const keyOf = (name) => String(name || "").trim().toLowerCase();

// Rule 2. Splits `total` into integer parts in proportion to `weights`, such
// that the parts sum to exactly `total`.
export const splitWhole = (total, weights) => {
  const amount = round0(total);

  const sum = weights.reduce((acc, weight) => acc + Math.max(Number(weight) || 0, 0), 0);

  if (sum <= 0 || weights.length === 0) {
    return weights.map(() => 0);
  }

  const exact = weights.map((weight) => (amount * Math.max(Number(weight) || 0, 0)) / sum);

  const floors = exact.map((value) => Math.floor(value));

  let remainder = amount - floors.reduce((acc, value) => acc + value, 0);

  // Largest remainder first; ties go to the earlier position so the result is
  // deterministic rather than depending on sort stability.
  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);

  const result = [...floors];

  let cursor = 0;

  // `remainder` can be negative only if amount is negative, which callers do
  // not do; the loop is written to terminate either way.
  while (remainder > 0 && order.length > 0) {
    result[order[cursor % order.length].index] += 1;

    remainder -= 1;
    cursor += 1;
  }

  return result;
};

// =========================================================================
// THE SETTLEMENT
// =========================================================================

export const buildSettlement = ({ splits = [], meName = "Me" }) => {
  const people = new Map();

  const touch = (name) => {
    const key = keyOf(name);

    if (!key) return null;

    if (!people.has(key)) {
      people.set(key, {
        key,
        name: String(name).trim(),
        isMe: false,
        paid: 0,
        owed: 0,
      });
    }

    return people.get(key);
  };

  let total = 0;

  const unsplittable = [];

  for (const split of splits) {
    const amount = Number(split.totalAmount || 0);

    const participants = split.participants || [];

    if (amount <= 0 || participants.length === 0) {
      unsplittable.push(split.description || "Untitled");
      continue;
    }

    total += amount;

    // Who fronted this one.
    const payerName = split.paidByMe ? meName : split.payerName;

    const payer = touch(payerName);

    if (payer) {
      payer.paid += amount;

      if (split.paidByMe) payer.isMe = true;
    }

    // Rule 2 applied per bill: the shares of one bill must add to that bill.
    // Doing it per bill rather than once at the end keeps each line
    // explainable on its own.
    const weights = participants.map((participant) =>
      Number(participant.share || 0),
    );

    const anyWeight = weights.some((weight) => weight > 0);

    const shares = splitWhole(
      amount,
      // A split whose shares were never worked out falls back to an even
      // division rather than being dropped.
      anyWeight ? weights : participants.map(() => 1),
    );

    participants.forEach((participant, index) => {
      const entry = touch(participant.name);

      if (!entry) return;

      if (participant.isMe) entry.isMe = true;

      // A share someone was treated to is carried by whoever paid, so it
      // never becomes a debt.
      if (participant.recoverable === false && !participant.isMe) {
        if (payer) payer.owed += shares[index];

        return;
      }

      entry.owed += shares[index];
    });
  }

  // Net position per person: what they put in, less what they consumed.
  const balances = [...people.values()].map((entry) => ({
    ...entry,
    paid: round0(entry.paid),
    owed: round0(entry.owed),
    net: round0(entry.paid) - round0(entry.owed),
  }));

  // Rounding `paid` can leave the nets off by a rupee or two. The drift is
  // pushed onto the largest creditor, who is least distorted by it, so the
  // payments below still balance exactly.
  const drift = balances.reduce((sum, entry) => sum + entry.net, 0);

  if (drift !== 0 && balances.length > 0) {
    const target = [...balances].sort((a, b) => b.net - a.net)[0];

    target.net -= drift;
  }

  // Rule 3. Biggest debtor pays the biggest creditor, repeatedly.
  const creditors = balances
    .filter((entry) => entry.net > 0)
    .map((entry) => ({ ...entry, left: entry.net }))
    .sort((a, b) => b.left - a.left);

  const debtors = balances
    .filter((entry) => entry.net < 0)
    .map((entry) => ({ ...entry, left: -entry.net }))
    .sort((a, b) => b.left - a.left);

  const payments = [];

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    const amount = Math.min(creditor.left, debtor.left);

    if (amount > 0) {
      payments.push({
        from: debtor.name,
        to: creditor.name,
        amount,
        fromIsMe: debtor.isMe,
        toIsMe: creditor.isMe,
      });

      creditor.left -= amount;
      debtor.left -= amount;
    }

    if (creditor.left === 0) ci += 1;
    if (debtor.left === 0) di += 1;
  }

  return {
    total: round0(total),
    people: balances.sort((a, b) => b.net - a.net),
    payments,
    unsplittable,
    totals: {
      people: balances.length,
      payments: payments.length,
      moving: payments.reduce((sum, payment) => sum + payment.amount, 0),
      // True when every share and payment is a whole rupee and the books
      // balance - which, given the above, it always should be.
      balanced:
        balances.reduce((sum, entry) => sum + entry.net, 0) === 0 &&
        payments.every((payment) => Number.isInteger(payment.amount)),
    },
  };
};
