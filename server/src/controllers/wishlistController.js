import Wishlist from "../models/Wishlist.js";
import Account from "../models/Account.js";
import Investment from "../models/Investment.js";
import { deductBalance, addBalance } from "../helpers/accountBalance.js";
import { daysBetween, startOfDay } from "../helpers/dates.js";
import { computeInvestmentValues, getInvestmentType } from "../config/investmentTypes.js";

// =========================================================================
// POTS
//
// A savings pot: a named target with money set aside toward it. A wishlist
// goal and an emergency fund are the same container, told apart by `kind`.
//
// `backing` decides where the money actually lives:
//   pot        the pot holds its own balance, fed by real transfers out of
//              an account - the money is genuinely moved aside
//   account    the pot mirrors a linked account's balance
//   investment the pot mirrors a linked investment's current value
//
// Mirroring exists so an emergency fund already sitting in an FD is not
// counted twice.
//
// Progress, days remaining and "how much per week" are all derived on read.
// They used to be stored, which meant a pot created last week still claimed
// its original days-remaining figure.
// =========================================================================

const deriveBalance = async (pot) => {
  if (pot.backing === "account" && pot.linkedAccountId) {
    const account = await Account.findById(pot.linkedAccountId);

    return Math.max(Number(account?.balance || 0), 0);
  }

  if (pot.backing === "investment" && pot.linkedInvestmentId) {
    const investment = await Investment.findById(pot.linkedInvestmentId);

    if (!investment) return 0;

    const { currentValue } = computeInvestmentValues(
      getInvestmentType(investment.typeKey),
      investment.fields || {},
      investment.purchaseDate,
    );

    return currentValue;
  }

  return Math.max(Number(pot.savedAmount || 0), 0);
};

const decorate = async (document, today = new Date()) => {
  const pot = document.toObject ? document.toObject() : document;

  const saved = await deriveBalance(pot);
  const target = Number(pot.targetAmount || 0);
  const remaining = Math.max(target - saved, 0);

  const progress = target > 0 ? Math.min((saved / target) * 100, 100) : 0;

  const daysRemaining = pot.targetDate
    ? daysBetween(today, pot.targetDate)
    : null;

  // What it takes to finish on time. Only meaningful while there is both
  // something left to save and time left to save it in.
  const perDay =
    remaining > 0 && daysRemaining && daysRemaining > 0
      ? remaining / daysRemaining
      : 0;

  let status = "Not Started";

  if (target > 0 && saved >= target) {
    status = "Completed";
  } else if (saved <= 0) {
    status = "Not Started";
  } else if (daysRemaining === null) {
    status = "On Track";
  } else if (daysRemaining < 0) {
    status = "Urgent";
  } else {
    // Compare progress against elapsed time rather than a fixed threshold,
    // so a pot is only "behind" relative to its own deadline.
    const totalDays = pot.createdAt
      ? Math.max(daysBetween(pot.createdAt, pot.targetDate), 1)
      : null;

    const elapsedShare =
      totalDays !== null
        ? Math.min(Math.max((totalDays - daysRemaining) / totalDays, 0), 1)
        : 0;

    status =
      progress / 100 >= elapsedShare - 0.05
        ? "On Track"
        : daysRemaining <= 14
          ? "Urgent"
          : "Behind";
  }

  return {
    ...pot,
    savedAmount: saved,
    remainingAmount: remaining,
    progressPercentage: Math.round(progress * 10) / 10,
    daysRemaining,
    requiredPerDay: Math.round(perDay),
    requiredPerWeek: Math.round(perDay * 7),
    requiredPerMonth: Math.round(perDay * 30.44),
    status,
    // A mirrored pot cannot be funded directly - the money is added to the
    // account or investment behind it.
    isMirrored: pot.backing !== "pot",
    contributionCount: (pot.savingsHistory || []).length,
  };
};

const validate = (body) => {
  if (!body.itemName?.trim()) return "Give this pot a name";

  if (!(Number(body.targetAmount) > 0)) {
    return "Target amount must be greater than 0";
  }

  if (body.backing === "account" && !body.linkedAccountId) {
    return "Choose the account this pot mirrors";
  }

  if (body.backing === "investment" && !body.linkedInvestmentId) {
    return "Choose the investment this pot mirrors";
  }

  return null;
};

const buildPayload = (body) => ({
  kind: body.kind === "emergency" ? "emergency" : "goal",
  backing: ["pot", "account", "investment"].includes(body.backing)
    ? body.backing
    : "pot",
  itemName: body.itemName.trim(),
  targetAmount: Number(body.targetAmount),
  priority: body.priority || "Medium",
  targetDate: body.targetDate ? new Date(body.targetDate) : null,
  potIcon: body.potIcon || "🎯",
  potColor: body.potColor || "#CFAF66",
  description: body.description?.trim() || "",
  linkedAccountId: body.linkedAccountId || null,
  linkedInvestmentId: body.linkedInvestmentId || null,
  autoSaveEnabled: Boolean(body.autoSaveEnabled),
  autoSaveAmount: Number(body.autoSaveAmount || 0),
  autoSaveFrequency: body.autoSaveFrequency || "Monthly",
});

// =========================================================================
// CRUD
// =========================================================================

export const createWishlist = async (req, res) => {
  try {
    const error = validate(req.body);

    if (error) return res.status(400).json({ success: false, message: error });

    const pot = await Wishlist.create({
      ...buildPayload(req.body),
      userId: req.body.userId,
      savedAmount: 0,
    });

    res.status(201).json({ success: true, data: await decorate(pot) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWishlistByUser = async (req, res) => {
  try {
    const pots = await Wishlist.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });

    const decorated = await Promise.all(pots.map((pot) => decorate(pot)));

    res.json({ success: true, data: decorated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateWishlist = async (req, res) => {
  try {
    const existing = await Wishlist.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: "Pot not found" });
    }

    const merged = { ...existing.toObject(), ...req.body };

    const error = validate(merged);

    if (error) return res.status(400).json({ success: false, message: error });

    // savedAmount and savingsHistory are moved only by fund/withdraw, never
    // by an edit - otherwise a form save could silently rewrite the balance.
    existing.set(buildPayload(merged));

    const saved = await existing.save();

    res.json({ success: true, data: await decorate(saved) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWishlistDeleteImpact = async (req, res) => {
  try {
    const pot = await Wishlist.findById(req.params.id);

    if (!pot) {
      return res.status(404).json({ success: false, message: "Pot not found" });
    }

    const decorated = await decorate(pot);

    res.json({
      success: true,
      data: {
        name: decorated.itemName,
        kind: decorated.kind,
        savedAmount: decorated.savedAmount,
        isMirrored: decorated.isMirrored,
        contributionCount: decorated.contributionCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteWishlist = async (req, res) => {
  try {
    const pot = await Wishlist.findById(req.params.id);

    if (!pot) {
      return res.status(404).json({ success: false, message: "Pot not found" });
    }

    // Money held in the pot itself would otherwise disappear. It goes back
    // where the caller says, or to the account that last funded it.
    const held = pot.backing === "pot" ? Number(pot.savedAmount || 0) : 0;

    let refundedTo = null;

    if (held > 0) {
      const lastIn = [...(pot.savingsHistory || [])]
        .reverse()
        .find((entry) => entry.direction !== "out" && entry.accountId);

      const target = req.body?.refundAccountId || lastIn?.accountId || null;

      if (target) {
        await addBalance(target, held);

        const account = await Account.findById(target);

        refundedTo = account?.name || null;
      }
    }

    await pot.deleteOne();

    res.json({
      success: true,
      message: "Pot removed",
      refunded: held,
      refundedTo,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// FUNDING
// =========================================================================

// Moving money in genuinely debits the source account, so a pot is money
// actually set aside rather than a note about intent.
export const fundWishlist = async (req, res) => {
  try {
    const pot = await Wishlist.findById(req.params.id);

    if (!pot) {
      return res.status(404).json({ success: false, message: "Pot not found" });
    }

    if (pot.backing !== "pot") {
      return res.status(400).json({
        success: false,
        message:
          "This pot mirrors a linked account or investment - add the money there instead.",
      });
    }

    const amount = Number(req.body.amount);

    if (!(amount > 0)) {
      return res
        .status(400)
        .json({ success: false, message: "Amount must be greater than 0" });
    }

    if (!req.body.fromAccountId) {
      return res
        .status(400)
        .json({ success: false, message: "Choose the account to move it from" });
    }

    const account = await Account.findById(req.body.fromAccountId);

    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    }

    await deductBalance(account._id, amount);

    pot.savedAmount = Number(pot.savedAmount || 0) + amount;
    pot.savingsHistory.push({
      amount,
      direction: "in",
      accountId: account._id,
      note: req.body.note?.trim() || "",
      date: req.body.date ? new Date(req.body.date) : new Date(),
    });

    const saved = await pot.save();

    res.json({ success: true, data: await decorate(saved) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Taking money back out credits the account it returns to.
export const withdrawFromWishlist = async (req, res) => {
  try {
    const pot = await Wishlist.findById(req.params.id);

    if (!pot) {
      return res.status(404).json({ success: false, message: "Pot not found" });
    }

    if (pot.backing !== "pot") {
      return res.status(400).json({
        success: false,
        message: "This pot mirrors a linked account or investment",
      });
    }

    const amount = Number(req.body.amount);

    if (!(amount > 0)) {
      return res
        .status(400)
        .json({ success: false, message: "Amount must be greater than 0" });
    }

    if (amount > Number(pot.savedAmount || 0)) {
      return res.status(400).json({
        success: false,
        message: `This pot only holds ${pot.savedAmount}`,
      });
    }

    const target = req.body.toAccountId;

    if (!target) {
      return res
        .status(400)
        .json({ success: false, message: "Choose the account to return it to" });
    }

    await addBalance(target, amount);

    pot.savedAmount = Number(pot.savedAmount || 0) - amount;
    pot.savingsHistory.push({
      amount,
      direction: "out",
      accountId: target,
      note: req.body.note?.trim() || "",
      date: new Date(),
    });

    const saved = await pot.save();

    res.json({ success: true, data: await decorate(saved) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// OVERVIEW
// =========================================================================

export const getWishlistOverview = async (req, res) => {
  try {
    const pots = await Wishlist.find({ userId: req.params.userId });

    const decorated = await Promise.all(pots.map((pot) => decorate(pot)));

    const sum = (list, key) =>
      list.reduce((total, item) => total + Number(item[key] || 0), 0);

    const goals = decorated.filter((pot) => pot.kind === "goal");
    const emergency = decorated.filter((pot) => pot.kind === "emergency");

    res.json({
      success: true,
      data: {
        pots: decorated.sort(
          (a, b) => b.progressPercentage - a.progressPercentage,
        ),
        totals: {
          count: decorated.length,
          saved: sum(decorated, "savedAmount"),
          target: sum(decorated, "targetAmount"),
          remaining: sum(decorated, "remainingAmount"),
          // Only pot-backed money is genuinely ring-fenced; mirrored pots
          // point at balances already counted elsewhere.
          setAside: sum(
            decorated.filter((pot) => !pot.isMirrored),
            "savedAmount",
          ),
          monthlyNeeded: sum(decorated, "requiredPerMonth"),
          completed: decorated.filter((pot) => pot.status === "Completed").length,
          behind: decorated.filter(
            (pot) => pot.status === "Behind" || pot.status === "Urgent",
          ).length,
        },
        goals,
        emergency,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
