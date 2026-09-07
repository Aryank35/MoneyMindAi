import Obligation from "../models/Obligation.js";
import Account from "../models/Account.js";
import { deductBalance, addBalance } from "../helpers/accountBalance.js";
import { daysBetween } from "../helpers/dates.js";
import { getDueStatus } from "../helpers/due.js";

// =========================================================================
// HELPERS
// =========================================================================

const decorate = (document, today = new Date()) => {
  const item = document.toObject ? document.toObject() : document;

  const settled = (item.settlements || []).reduce(
    (sum, entry) => sum + Number(entry.amount || 0),
    0,
  );

  const principal = Number(item.principal || 0);
  const outstanding = Math.max(principal - settled, 0);

  const daysUntil = item.promiseDate
    ? daysBetween(today, item.promiseDate)
    : null;

  const isClosed = Boolean(item.closedOn) || item.writtenOff || outstanding <= 0;

  const status = isClosed
    ? {
        key: item.writtenOff ? "written-off" : "settled",
        label: item.writtenOff ? "Written off" : "Settled",
        severity: 0,
      }
    : getDueStatus(daysUntil, outstanding);

  return {
    ...item,
    settledAmount: settled,
    outstanding,
    progressPercentage:
      principal > 0 ? Math.min((settled / principal) * 100, 100) : 0,
    daysUntil,
    isClosed,
    status,
    settlementCount: (item.settlements || []).length,
  };
};

const validate = (body) => {
  if (!["lent", "borrowed"].includes(body.direction)) {
    return "Say whether this was lent or borrowed";
  }

  if (!body.counterparty?.trim()) {
    return body.direction === "lent"
      ? "Who did you lend it to?"
      : "Who did you borrow it from?";
  }

  if (!(Number(body.principal) > 0)) {
    return "Amount must be greater than 0";
  }

  return null;
};

const buildPayload = (body) => ({
  direction: body.direction,
  counterparty: body.counterparty.trim(),
  relationship: body.relationship?.trim() || "",
  principal: Number(body.principal),
  accountId: body.accountId || null,
  promiseDate: body.promiseDate ? new Date(body.promiseDate) : null,
  agreedOn: body.agreedOn ? new Date(body.agreedOn) : new Date(),
  interestRate: Number(body.interestRate || 0),
  note: body.note?.trim() || "",
});

// =========================================================================
// CRUD
// =========================================================================

export const createObligation = async (req, res) => {
  try {
    const error = validate(req.body);

    if (error) return res.status(400).json({ success: false, message: error });

    const payload = buildPayload(req.body);

    // Recording the loan moves the money, unless the caller opts out - which
    // matters when logging something that happened weeks ago and has already
    // been reflected in the balance.
    const moveMoney = req.body.adjustBalance !== false && payload.accountId;

    if (moveMoney) {
      const account = await Account.findById(payload.accountId);

      if (!account) {
        return res
          .status(404)
          .json({ success: false, message: "Account not found" });
      }

      if (payload.direction === "lent") {
        await deductBalance(payload.accountId, payload.principal);
      } else {
        await addBalance(payload.accountId, payload.principal);
      }
    }

    const obligation = await Obligation.create({
      ...payload,
      userId: req.body.userId,
    });

    res.status(201).json({
      success: true,
      data: decorate(obligation),
      balanceMoved: Boolean(moveMoney),
    });
  } catch (error) {
    console.error("Obligation Error:", error);

    res.status(500).json({ success: false, message: error.message });
  }
};

export const getObligationsByUser = async (req, res) => {
  try {
    const items = await Obligation.find({ userId: req.params.userId }).sort({
      promiseDate: 1,
    });

    const decorated = items.map((item) => decorate(item));

    decorated.sort(
      (a, b) =>
        b.status.severity - a.status.severity ||
        (a.daysUntil ?? 99999) - (b.daysUntil ?? 99999),
    );

    res.json({ success: true, data: decorated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateObligation = async (req, res) => {
  try {
    const existing = await Obligation.findById(req.params.id);

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    const merged = { ...existing.toObject(), ...req.body };

    const error = validate(merged);

    if (error) return res.status(400).json({ success: false, message: error });

    // Editing never touches settlements or moves money - repayments are
    // recorded through their own endpoint so balances stay traceable.
    existing.set(buildPayload(merged));

    if (req.body.writtenOff !== undefined) {
      existing.writtenOff = Boolean(req.body.writtenOff);
      existing.closedOn = existing.writtenOff ? new Date() : null;
    }

    const saved = await existing.save();

    res.json({ success: true, data: decorate(saved) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getObligationDeleteImpact = async (req, res) => {
  try {
    const obligation = await Obligation.findById(req.params.id);

    if (!obligation) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    const decorated = decorate(obligation);

    res.json({
      success: true,
      data: {
        counterparty: decorated.counterparty,
        direction: decorated.direction,
        principal: decorated.principal,
        outstanding: decorated.outstanding,
        settlementCount: decorated.settlementCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteObligation = async (req, res) => {
  try {
    const obligation = await Obligation.findByIdAndDelete(req.params.id);

    if (!obligation) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    // Balances are left as they stand. Unwinding the original movement and
    // every settlement would be guesswork about which of them the user
    // considers real.
    res.json({ success: true, message: "Record removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// SETTLEMENT
// =========================================================================

export const settleObligation = async (req, res) => {
  try {
    const obligation = await Obligation.findById(req.params.id);

    if (!obligation) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    const current = decorate(obligation);

    if (current.outstanding <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "This is already settled" });
    }

    const amount = Number(req.body.amount ?? current.outstanding);

    if (!(amount > 0)) {
      return res
        .status(400)
        .json({ success: false, message: "Amount must be greater than 0" });
    }

    if (amount > current.outstanding) {
      return res.status(400).json({
        success: false,
        message: `Only ${current.outstanding} is outstanding`,
      });
    }

    const accountId = req.body.accountId || obligation.accountId;

    if (accountId) {
      // Repayment of money you lent comes back to you; repayment of money
      // you borrowed goes out.
      if (obligation.direction === "lent") {
        await addBalance(accountId, amount);
      } else {
        await deductBalance(accountId, amount);
      }
    }

    obligation.settlements.push({
      date: req.body.date ? new Date(req.body.date) : new Date(),
      amount,
      accountId: accountId || null,
      note: req.body.note?.trim() || "",
    });

    const settled = obligation.settlements.reduce(
      (sum, entry) => sum + Number(entry.amount || 0),
      0,
    );

    if (settled >= Number(obligation.principal || 0)) {
      obligation.closedOn = new Date();
    }

    const saved = await obligation.save();

    res.json({ success: true, data: decorate(saved) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const undoSettlement = async (req, res) => {
  try {
    const obligation = await Obligation.findById(req.params.id);

    if (!obligation) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    const last = obligation.settlements[obligation.settlements.length - 1];

    if (!last) {
      return res
        .status(400)
        .json({ success: false, message: "No repayment to undo" });
    }

    if (last.accountId) {
      if (obligation.direction === "lent") {
        await deductBalance(last.accountId, last.amount);
      } else {
        await addBalance(last.accountId, last.amount);
      }
    }

    obligation.settlements.pop();
    obligation.closedOn = null;

    const saved = await obligation.save();

    res.json({ success: true, data: decorate(saved) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// OVERVIEW
// =========================================================================

export const getObligationOverview = async (req, res) => {
  try {
    const items = await Obligation.find({ userId: req.params.userId });

    const decorated = items.map((item) => decorate(item));
    const open = decorated.filter((item) => !item.isClosed);

    const sum = (list) =>
      list.reduce((total, item) => total + item.outstanding, 0);

    const lent = open.filter((item) => item.direction === "lent");
    const borrowed = open.filter((item) => item.direction === "borrowed");

    const owedToMe = sum(lent);
    const iOwe = sum(borrowed);

    // Money lent out is an asset you cannot spend; money borrowed is a
    // liability. Netting them is the figure that actually matters.
    res.json({
      success: true,
      data: {
        obligations: decorated.sort(
          (a, b) =>
            b.status.severity - a.status.severity ||
            (a.daysUntil ?? 99999) - (b.daysUntil ?? 99999),
        ),
        totals: {
          owedToMe,
          iOwe,
          net: owedToMe - iOwe,
          openCount: open.length,
          overdue: open.filter((item) => item.status.key === "overdue").length,
          // Informal lending with no agreed date is the kind that never
          // comes back, so it is counted out loud.
          undated: open.filter((item) => !item.promiseDate).length,
          writtenOff: decorated
            .filter((item) => item.writtenOff)
            .reduce((total, item) => total + item.outstanding, 0),
        },
        people: [
          ...decorated
            .filter((item) => !item.isClosed)
            .reduce((map, item) => {
              const key = item.counterparty.toLowerCase();
              const entry = map.get(key) || {
                name: item.counterparty,
                owesMe: 0,
                iOwe: 0,
                count: 0,
              };

              if (item.direction === "lent") entry.owesMe += item.outstanding;
              else entry.iOwe += item.outstanding;

              entry.count += 1;
              map.set(key, entry);

              return map;
            }, new Map())
            .values(),
        ]
          .map((entry) => ({ ...entry, net: entry.owesMe - entry.iOwe }))
          .sort((a, b) => Math.abs(b.net) - Math.abs(a.net)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
