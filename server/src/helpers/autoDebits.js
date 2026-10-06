// =========================================================================
// AUTO-DEBITS THAT HAVE COME DUE
//
// A SIP on the 5th and an RD on the 5th are the same promise: a fixed amount
// leaves a named account on a named day, every month. The app has no
// background job, so nothing can fire on the day by itself. Instead this
// works out what WOULD have fired - today and on every day already gone by -
// and the user is asked once, when they next open the app.
//
// Three rules keep that honest:
//
//   1. Never post the same month twice. Each occurrence is keyed by holding
//      and month, and anything already recorded is skipped. Opening the app
//      five times in a day must not buy five SIPs.
//
//   2. Only look back so far. A holding bought in 2019 should not generate
//      eighty months of back-dated debits the first time this runs. The
//      window starts at the later of the purchase date and the lookback.
//
//   3. Nothing before it existed. An occurrence earlier than the purchase
//      date never happened, so it is never offered.
// =========================================================================

const round0 = (value) => Math.round(Number(value) || 0);

export const monthKeyOf = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

// A day-of-month that exists in every month. Asking for the 31st in
// February means the 28th, not the 3rd of March.
export const clampDay = (year, month, day) => {
  const lastDay = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(Math.max(day, 1), lastDay));
};

export const buildDueDebits = ({
  investments = [],
  today = new Date(),
  lookbackMonths = 3,
}) => {
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Rule 2.
  const floor = new Date(now.getFullYear(), now.getMonth() - lookbackMonths, 1);

  const due = [];

  for (const investment of investments) {
    if (!investment.isSip) continue;

    const amount = round0(investment.sipAmount);

    if (amount <= 0) continue;

    // Without an account there is nothing to debit, so it is left alone
    // rather than guessed at.
    if (!investment.accountId) continue;

    const day = Number(investment.sipDay) || 1;

    const purchase = investment.purchaseDate
      ? new Date(investment.purchaseDate)
      : null;

    const start = purchase && purchase > floor ? purchase : floor;

    const posted = new Set(
      (investment.sipHistory || []).map((entry) => entry.monthKey),
    );

    // Walk month by month from the window start to now.
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

    while (cursor <= now) {
      const date = clampDay(cursor.getFullYear(), cursor.getMonth(), day);

      const key = monthKeyOf(date);

      const beforeItExisted = purchase && date < purchase;

      // Rule 1 and rule 3.
      if (date <= now && !posted.has(key) && !beforeItExisted) {
        due.push({
          investmentId: String(investment._id),
          name: investment.name,
          platform: investment.platform || "",
          typeKey: investment.typeKey,
          accountId: String(investment.accountId),
          amount,
          date,
          monthKey: key,
          // Today's is simply due; anything older was missed while the app
          // was closed, which is worth saying differently.
          isOverdue: date < now,
        });
      }

      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  due.sort((a, b) => new Date(a.date) - new Date(b.date));

  const byAccount = [...due.reduce((map, item) => {
    const entry = map.get(item.accountId) || {
      accountId: item.accountId,
      count: 0,
      total: 0,
    };

    entry.count += 1;
    entry.total += item.amount;

    map.set(item.accountId, entry);

    return map;
  }, new Map()).values()];

  return {
    due,
    byAccount,
    totals: {
      count: due.length,
      amount: due.reduce((sum, item) => sum + item.amount, 0),
      overdue: due.filter((item) => item.isOverdue).length,
    },
  };
};

// What the investment budget line should be set to: everything that will be
// auto-debited in a normal month. This is a floor, not a ceiling - it is the
// money already promised, before any lump sum the user adds on top.
export const monthlyAutoDebitTotal = (investments = []) =>
  investments
    .filter((investment) => investment.isSip && Number(investment.sipAmount) > 0)
    .reduce((sum, investment) => sum + round0(investment.sipAmount), 0);
