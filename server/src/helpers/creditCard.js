import { clampToMonth } from "./dates.js";

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

// Shared with the recurrence helpers - a card billing on the 31st and a
// bill due on the 31st need identical month-end handling.
export { clampToMonth } from "./dates.js";

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

// Shared with scheduled payments and lending promises.
export { getDueStatus } from "./due.js";
