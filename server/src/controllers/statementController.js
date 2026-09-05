import Account from "../models/Account.js";
import Income from "../models/Income.js";
import Expense from "../models/Expense.js";
import Transfer from "../models/Transfer.js";
import {
  getCardCycle,
  getDueStatus,
  getOutstanding,
  getCreditBalance,
  getAvailableCredit,
  getUtilisation,
} from "../helpers/creditCard.js";

// =========================================================================
// LEDGER
//
// Balances are mutated incrementally as records are written, so a statement
// is reconstructed by taking the account's live balance and walking the
// movements back. Every entry is signed exactly the way it moved the
// balance, which keeps the statement and the account card in agreement.
// =========================================================================

// Expense.accountId is a String (unlike Income and Transfer, which store
// ObjectIds), so it is matched on the string form.
const collectEntries = async (account) => {
  const id = account._id;

  const [incomes, expenses, transfers] = await Promise.all([
    Income.find({
      $or: [{ accountId: id }, { epfAccountId: id }],
    }),
    Expense.find({ accountId: String(id) }),
    Transfer.find({
      $or: [{ fromAccountId: id }, { toAccountId: id }],
    }),
  ]);

  const entries = [];

  for (const income of incomes) {
    // One income row can touch two accounts: the bank it credits and the EPF
    // account it contributes to. Each side is its own ledger entry.
    if (String(income.accountId) === String(id)) {
      entries.push({
        id: String(income._id),
        kind: "income",
        date: income.incomeDate,
        amount: Number(income.creditedAmount || 0),
        label: income.payer || "Income",
        detail: income.sourceKey,
        note: income.note || "",
      });
    }

    if (String(income.epfAccountId || "") === String(id)) {
      entries.push({
        id: `${income._id}-epf`,
        kind: "epf",
        date: income.incomeDate,
        amount: Number(income.epfAmount || 0),
        label: "EPF contribution",
        detail: income.payer || "",
        note: income.note || "",
      });
    }
  }

  for (const expense of expenses) {
    entries.push({
      id: String(expense._id),
      kind: "expense",
      date: expense.expenseDate,
      amount: -Number(expense.amount || 0),
      label: expense.category || "Expense",
      detail: "",
      note: expense.note || "",
    });
  }

  for (const transfer of transfers) {
    const isOutgoing = String(transfer.fromAccountId) === String(id);

    entries.push({
      id: `${transfer._id}-${isOutgoing ? "out" : "in"}`,
      kind: isOutgoing ? "transfer-out" : "transfer-in",
      date: transfer.transferDate,
      amount: isOutgoing
        ? -Number(transfer.amount || 0)
        : Number(transfer.amount || 0),
      label: isOutgoing ? "Transfer out" : "Transfer in",
      detail: "",
      note: transfer.note || "",
    });
  }

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  return entries;
};

const sumAfter = (entries, cutoff) =>
  entries
    .filter((entry) => new Date(entry.date) > cutoff)
    .reduce((total, entry) => total + entry.amount, 0);

// The account's balance as it stood at the end of a given moment.
const balanceAsOf = (currentBalance, entries, cutoff) =>
  Number(currentBalance || 0) - sumAfter(entries, cutoff);

const buildStatement = (account, entries, from, to) => {
  const closingBalance = balanceAsOf(account.balance, entries, to);

  const inPeriod = entries.filter((entry) => {
    const date = new Date(entry.date);

    return date > from && date <= to;
  });

  const openingBalance =
    closingBalance - inPeriod.reduce((total, entry) => total + entry.amount, 0);

  let running = openingBalance;

  const rows = inPeriod.map((entry) => {
    running += entry.amount;

    return { ...entry, balance: running };
  });

  const credits = inPeriod
    .filter((entry) => entry.amount > 0)
    .reduce((total, entry) => total + entry.amount, 0);

  const debits = inPeriod
    .filter((entry) => entry.amount < 0)
    .reduce((total, entry) => total - entry.amount, 0);

  return {
    period: { from, to },
    openingBalance,
    closingBalance,
    totals: {
      credits,
      debits,
      net: credits - debits,
      count: rows.length,
    },
    // Newest first for display; the running balance was computed in
    // chronological order above.
    entries: rows.reverse(),
  };
};

// =========================================================================
// ENDPOINTS
// =========================================================================

export const getAccountStatement = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const now = new Date();

    // Defaults to the current calendar month.
    const from = req.query.from
      ? new Date(req.query.from)
      : new Date(now.getFullYear(), now.getMonth(), 1);

    const to = req.query.to
      ? new Date(req.query.to)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // `from` is exclusive in the walk, so step back a moment to include
    // anything recorded exactly at the start of the day.
    const fromExclusive = new Date(from.getTime() - 1);

    const entries = await collectEntries(account);

    const statement = buildStatement(account, entries, fromExclusive, to);

    res.json({
      success: true,
      data: {
        account: {
          _id: account._id,
          name: account.name,
          type: account.type,
          balance: account.balance,
          isSalaryAccount: account.isSalaryAccount,
          isEpfAccount: account.isEpfAccount,
          card: account.type === "Credit Card" ? account.card : undefined,
        },
        ...statement,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCardsOverview = async (req, res) => {
  try {
    const cards = await Account.find({
      userId: req.params.userId,
      type: "Credit Card",
    });

    const now = new Date();

    const data = await Promise.all(
      cards.map(async (account) => {
        const entries = await collectEntries(account);
        const cycle = getCardCycle(account.card, now);

        // What the statement said, less anything paid toward it since.
        const balanceAtStatement = balanceAsOf(
          account.balance,
          entries,
          cycle.statementDate,
        );

        const statementOutstanding = getOutstanding(balanceAtStatement);

        const paidSinceStatement = entries
          .filter(
            (entry) =>
              entry.kind === "transfer-in" &&
              new Date(entry.date) > cycle.statementDate,
          )
          .reduce((total, entry) => total + entry.amount, 0);

        const amountDue = Math.max(statementOutstanding - paidSinceStatement, 0);

        const spendIn = (start, end) =>
          entries
            .filter((entry) => {
              const date = new Date(entry.date);

              return entry.amount < 0 && date > start && date <= end;
            })
            .reduce((total, entry) => total - entry.amount, 0);

        return {
          _id: account._id,
          name: account.name,
          balance: account.balance,
          card: account.card,
          outstanding: getOutstanding(account.balance),
          creditBalance: getCreditBalance(account.balance),
          availableCredit: getAvailableCredit(
            account.balance,
            account.card?.creditLimit,
          ),
          utilisation: getUtilisation(account.balance, account.card?.creditLimit),
          cycle,
          amountDue,
          paidSinceStatement,
          dueStatus: getDueStatus(cycle.daysUntilDue, amountDue),
          lastStatementSpend: spendIn(
            cycle.closedPeriodStart,
            cycle.closedPeriodEnd,
          ),
          currentCycleSpend: spendIn(cycle.currentPeriodStart, now),
          transactionCount: entries.length,
        };
      }),
    );

    // Most urgent first so the page leads with what needs paying.
    data.sort(
      (a, b) =>
        b.dueStatus.severity - a.dueStatus.severity ||
        a.cycle.daysUntilDue - b.cycle.daysUntilDue,
    );

    res.json({
      success: true,
      data: {
        cards: data,
        totals: {
          count: data.length,
          outstanding: data.reduce((sum, card) => sum + card.outstanding, 0),
          due: data.reduce((sum, card) => sum + card.amountDue, 0),
          creditLimit: data.reduce(
            (sum, card) => sum + Number(card.card?.creditLimit || 0),
            0,
          ),
          currentCycleSpend: data.reduce(
            (sum, card) => sum + card.currentCycleSpend,
            0,
          ),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
