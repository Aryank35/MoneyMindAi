// =========================================================================
// CREDIT CARD CYCLE MATH
//
// Pure date/amount helpers - no database access, so the billing rules can be
// reasoned about and tested on their own.
//
// Balance convention: a card's `balance` goes negative as it is spent on,
// exactly like any other account being debited. "Outstanding" is that debt
// expressed as a positive number, which is how people actually talk about it.
// =========================================================================

// new Date(2026, 1, 31) silently rolls into March. Statement and due days are
// user-chosen (a card can bill on the 31st), so every construction clamps to
// the real length of the target month.
export const clampToMonth = (year, month, day) => {
  const lastDay = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(Math.max(day, 1), lastDay));
};

export const getOutstanding = (balance) => Math.max(-Number(balance || 0), 0);

// A positive balance on a card means the issuer owes you (overpayment or a
// refund), which is worth showing rather than hiding as "zero due".
export const getCreditBalance = (balance) => Math.max(Number(balance || 0), 0);

export const getAvailableCredit = (balance, creditLimit) => {
  const limit = Number(creditLimit || 0);

  if (limit <= 0) return null;

  return Math.max(limit - getOutstanding(balance), 0);
};

export const getUtilisation = (balance, creditLimit) => {
  const limit = Number(creditLimit || 0);

  if (limit <= 0) return null;

  return Math.round((getOutstanding(balance) / limit) * 100);
};

// Works out the billing cycle that has most recently closed, the one still
// running, and when the closed one has to be paid.
export const getCardCycle = (card = {}, today = new Date()) => {
  const statementDay = Number(card.statementDay) || 1;
  const dueDay = Number(card.dueDay) || 20;

  const now = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  // Most recent statement date on or before today.
  let statementDate = clampToMonth(now.getFullYear(), now.getMonth(), statementDay);

  if (statementDate > now) {
    statementDate = clampToMonth(
      now.getFullYear(),
      now.getMonth() - 1,
      statementDay,
    );
  }

  // The closed statement covers the month leading up to that date.
  const closedPeriodStart = clampToMonth(
    statementDate.getFullYear(),
    statementDate.getMonth() - 1,
    statementDay,
  );

  // The cycle currently accruing runs from the last statement to the next.
  const nextStatementDate = clampToMonth(
    statementDate.getFullYear(),
    statementDate.getMonth() + 1,
    statementDay,
  );

  // Payment is due after the statement closes. A due day at or before the
  // statement day must mean the following month.
  const dueDate =
    dueDay > statementDay
      ? clampToMonth(statementDate.getFullYear(), statementDate.getMonth(), dueDay)
      : clampToMonth(
          statementDate.getFullYear(),
          statementDate.getMonth() + 1,
          dueDay,
        );

  const msPerDay = 24 * 60 * 60 * 1000;

  return {
    statementDate,
    closedPeriodStart,
    closedPeriodEnd: statementDate,
    currentPeriodStart: statementDate,
    nextStatementDate,
    dueDate,
    daysUntilDue: Math.round((dueDate - now) / msPerDay),
    daysUntilStatement: Math.round((nextStatementDate - now) / msPerDay),
  };
};

// Turns days-until-due into something the UI can colour and sort by, given
// how much is actually owed.
export const getDueStatus = (daysUntilDue, amountDue) => {
  if (!(Number(amountDue) > 0)) {
    return { key: "clear", label: "Nothing due", severity: 0 };
  }

  if (daysUntilDue < 0) {
    return {
      key: "overdue",
      label: `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"}`,
      severity: 4,
    };
  }

  if (daysUntilDue === 0) {
    return { key: "today", label: "Due today", severity: 3 };
  }

  if (daysUntilDue <= 3) {
    return {
      key: "urgent",
      label: `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`,
      severity: 2,
    };
  }

  if (daysUntilDue <= 7) {
    return { key: "soon", label: `Due in ${daysUntilDue} days`, severity: 1 };
  }

  return { key: "scheduled", label: `Due in ${daysUntilDue} days`, severity: 0 };
};
