import Split from "../models/Split.js";
import Expense from "../models/Expense.js";
import Account from "../models/Account.js";
import { deductBalance, addBalance } from "../helpers/accountBalance.js";

// =========================================================================
// SHARE MATHS
// =========================================================================

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

// Splits have to add up to the bill exactly. An equal three-way split of
// 1,000 is 333.33 each, which leaves a paisa unaccounted for - the remainder
// is pushed onto the first participant rather than quietly lost.
export const computeShares = (totalAmount, method, participants) => {
  const total = Number(totalAmount || 0);
  const people = participants || [];

  if (people.length === 0) return [];

  let shares;

  if (method === "exact") {
    shares = people.map((p) => round2(p.shareInput));
  } else if (method === "percentage") {
    shares = people.map((p) => round2((total * Number(p.shareInput || 0)) / 100));
  } else if (method === "shares") {
    const weights = people.map((p) => Math.max(Number(p.shareInput || 0), 0));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    shares = totalWeight
      ? weights.map((w) => round2((total * w) / totalWeight))
      : people.map(() => 0);
  } else {
    const even = round2(total / people.length);

    shares = people.map(() => even);
  }

  // Absorb the rounding drift so the shares sum to the bill.
  if (method !== "exact") {
    const drift = round2(total - shares.reduce((sum, s) => sum + s, 0));

    if (drift !== 0) shares[0] = round2(shares[0] + drift);
  }

  return people.map((p, i) => ({ ...p, share: Math.max(shares[i], 0) }));
};

const validate = (body) => {
  if (!body.description?.trim()) return "Give this a description";

  if (!(Number(body.totalAmount) > 0)) return "Amount must be greater than 0";

  const people = body.participants || [];

  if (people.length < 2) {
    return "A split needs at least two people, including you";
  }

  if (people.some((p) => !p.name?.trim())) return "Every person needs a name";

  const names = people.map((p) => p.name.trim().toLowerCase());

  if (new Set(names).size !== names.length) {
    return "Two people cannot have the same name";
  }

  if (!people.some((p) => p.isMe)) {
    return "Mark which participant is you";
  }

  if (people.filter((p) => p.isMe).length > 1) {
    return "Only one participant can be you";
  }

  if (!body.paidByMe && !body.payerName?.trim()) {
    return "Who paid the bill?";
  }

  const total = Number(body.totalAmount);

  if (body.splitMethod === "exact") {
    const sum = round2(
      people.reduce((acc, p) => acc + Number(p.shareInput || 0), 0),
    );

    if (sum !== round2(total)) {
      return `Exact shares add up to ${sum}, but the bill is ${round2(total)}`;
    }
  }

  if (body.splitMethod === "percentage") {
    const sum = round2(
      people.reduce((acc, p) => acc + Number(p.shareInput || 0), 0),
    );

    if (sum !== 100) return `Percentages add up to ${sum}%, not 100%`;
  }

  if (body.splitMethod === "shares") {
    const sum = people.reduce((acc, p) => acc + Number(p.shareInput || 0), 0);

    if (!(sum > 0)) return "Give at least one person a share weight";
  }

  return null;
};

const decorate = (document) => {
  const split = document.toObject ? document.toObject() : document;

  const me = (split.participants || []).find((p) => p.isMe);
  const myShare = Number(me?.share || 0);

  const others = (split.participants || []).filter((p) => !p.isMe);

  // What is still moving. When I paid, others owe me their unsettled share;
  // when someone else paid, I owe mine.
  const owedToMe = split.paidByMe
    ? others.reduce(
        (sum, p) => sum + Math.max(Number(p.share || 0) - Number(p.settledAmount || 0), 0),
        0,
      )
    : 0;

  const iOwe = split.paidByMe
    ? 0
    : Math.max(myShare - Number(me?.settledAmount || 0), 0);

  const settledTotal = (split.settlements || []).reduce(
    (sum, s) => sum + Number(s.amount || 0),
    0,
  );

  return {
    ...split,
    myShare,
    owedToMe: round2(owedToMe),
    iOwe: round2(iOwe),
    settledTotal: round2(settledTotal),
    isFullySettled: round2(owedToMe) === 0 && round2(iOwe) === 0,
    participantCount: (split.participants || []).length,
  };
};

// =========================================================================
// OPTIONS
// =========================================================================

export const getSplitOptions = (req, res) => {
  res.json({
    success: true,
    data: {
      methods: [
        { key: "equal", label: "Split equally", hint: "Everyone pays the same" },
        { key: "exact", label: "Exact amounts", hint: "Type each person's amount" },
        { key: "shares", label: "By shares", hint: "e.g. 2 shares to 1" },
        { key: "percentage", label: "By percentage", hint: "Must total 100%" },
      ],
    },
  });
};

// =========================================================================
// CRUD
// =========================================================================

export const createSplit = async (req, res) => {
  try {
    const error = validate(req.body);

    if (error) return res.status(400).json({ success: false, message: error });

    const participants = computeShares(
      req.body.totalAmount,
      req.body.splitMethod || "equal",
      req.body.participants.map((p) => ({
        name: p.name.trim(),
        isMe: Boolean(p.isMe),
        shareInput: Number(p.shareInput || 0),
        settledAmount: 0,
      })),
    );

    const total = Number(req.body.totalAmount);
    const myShare = Number(participants.find((p) => p.isMe)?.share || 0);
    const date = req.body.date ? new Date(req.body.date) : new Date();
    const paidByMe = req.body.paidByMe !== false;

    let expenseId = null;
    let advanceAmount = 0;

    if (paidByMe) {
      if (!req.body.accountId) {
        return res.status(400).json({
          success: false,
          message: "Which account did you pay from?",
        });
      }

      const account = await Account.findById(req.body.accountId);

      if (!account) {
        return res
          .status(404)
          .json({ success: false, message: "Account not found" });
      }

      // My share is the only part that is genuinely my spending.
      if (myShare > 0) {
        const expense = await Expense.create({
          userId: req.body.userId,
          accountId: String(req.body.accountId),
          category: req.body.category?.trim() || "Shared",
          amount: myShare,
          note: `${req.body.description.trim()} (my share of a split)`,
          expenseDate: date,
        });

        await deductBalance(req.body.accountId, myShare);

        expenseId = expense._id;
      }

      // The rest left the account too, but it is owed back rather than spent.
      advanceAmount = round2(total - myShare);

      if (advanceAmount > 0) {
        await deductBalance(req.body.accountId, advanceAmount);
      }
    }

    const split = await Split.create({
      userId: req.body.userId,
      description: req.body.description.trim(),
      totalAmount: total,
      date,
      category: req.body.category?.trim() || "",
      groupName: req.body.groupName?.trim() || "",
      paidByMe,
      payerName: paidByMe ? "" : req.body.payerName.trim(),
      accountId: paidByMe ? req.body.accountId : null,
      splitMethod: req.body.splitMethod || "equal",
      participants,
      expenseId,
      advanceAmount,
      note: req.body.note?.trim() || "",
    });

    res.status(201).json({ success: true, data: decorate(split) });
  } catch (err) {
    console.error("Split Error:", err);

    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSplitsByUser = async (req, res) => {
  try {
    const splits = await Split.find({ userId: req.params.userId }).sort({
      date: -1,
    });

    res.json({ success: true, data: splits.map((s) => decorate(s)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSplitDeleteImpact = async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);

    if (!split) {
      return res.status(404).json({ success: false, message: "Split not found" });
    }

    const decorated = decorate(split);

    res.json({
      success: true,
      data: {
        description: decorated.description,
        totalAmount: decorated.totalAmount,
        myShare: decorated.myShare,
        advanceAmount: decorated.advanceAmount,
        owedToMe: decorated.owedToMe,
        iOwe: decorated.iOwe,
        settledTotal: decorated.settledTotal,
        paidByMe: decorated.paidByMe,
        hasExpense: Boolean(decorated.expenseId),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSplit = async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);

    if (!split) {
      return res.status(404).json({ success: false, message: "Split not found" });
    }

    // Unwind everything this split did to the balance, so removing it leaves
    // no phantom debit behind.
    let refunded = 0;

    if (split.paidByMe && split.accountId) {
      if (split.expenseId) {
        await Expense.findByIdAndDelete(split.expenseId);

        const myShare = Number(
          split.participants.find((p) => p.isMe)?.share || 0,
        );

        await addBalance(split.accountId, myShare);
        refunded += myShare;
      }

      if (split.advanceAmount > 0) {
        await addBalance(split.accountId, split.advanceAmount);
        refunded += Number(split.advanceAmount);
      }
    }

    // Reverse every settlement that moved money.
    for (const settlement of split.settlements || []) {
      if (!settlement.accountId) continue;

      if (split.paidByMe) {
        await deductBalance(settlement.accountId, settlement.amount);
        refunded -= Number(settlement.amount);
      } else {
        await addBalance(settlement.accountId, settlement.amount);
        refunded += Number(settlement.amount);
      }
    }

    await split.deleteOne();

    res.json({
      success: true,
      message: "Split removed",
      refunded: round2(refunded),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// SETTLEMENT
// =========================================================================

export const settleSplit = async (req, res) => {
  try {
    const split = await Split.findById(req.params.id);

    if (!split) {
      return res.status(404).json({ success: false, message: "Split not found" });
    }

    const name = req.body.participantName?.trim();

    const participant = split.participants.find(
      (p) => p.name.toLowerCase() === (name || "").toLowerCase(),
    );

    if (!participant) {
      return res
        .status(404)
        .json({ success: false, message: "That person is not in this split" });
    }

    // When I paid, only the others settle up; when someone else paid, the
    // only thing to settle is my own share.
    if (split.paidByMe && participant.isMe) {
      return res.status(400).json({
        success: false,
        message: "You paid this bill - there is nothing for you to settle",
      });
    }

    if (!split.paidByMe && !participant.isMe) {
      return res.status(400).json({
        success: false,
        message: `${split.payerName} paid this bill, so only your own share settles here`,
      });
    }

    const outstanding = round2(
      Number(participant.share || 0) - Number(participant.settledAmount || 0),
    );

    if (outstanding <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "That share is already settled" });
    }

    const amount = round2(req.body.amount ?? outstanding);

    if (!(amount > 0)) {
      return res
        .status(400)
        .json({ success: false, message: "Amount must be greater than 0" });
    }

    if (amount > outstanding) {
      return res.status(400).json({
        success: false,
        message: `Only ${outstanding} is outstanding for ${participant.name}`,
      });
    }

    const accountId = req.body.accountId || null;
    const date = req.body.date ? new Date(req.body.date) : new Date();

    if (accountId) {
      if (split.paidByMe) {
        // Someone is paying me back.
        await addBalance(accountId, amount);
      } else {
        // I am paying my share to whoever fronted it. That is the moment the
        // money leaves, so the expense is written here rather than at bill
        // time - the same pattern the planner uses for scheduled payments.
        await deductBalance(accountId, amount);

        await Expense.create({
          userId: split.userId,
          accountId: String(accountId),
          category: split.category || "Shared",
          amount,
          note: `${split.description} (my share, paid to ${split.payerName})`,
          expenseDate: date,
        });
      }
    }

    participant.settledAmount = round2(
      Number(participant.settledAmount || 0) + amount,
    );

    split.settlements.push({
      date,
      participantName: participant.name,
      amount,
      accountId,
      note: req.body.note?.trim() || "",
    });

    const saved = await split.save();

    res.json({ success: true, data: decorate(saved) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// OVERVIEW
// =========================================================================

export const getSplitOverview = async (req, res) => {
  try {
    const splits = (await Split.find({ userId: req.params.userId })).map((s) =>
      decorate(s),
    );

    // Net position per person across every split, which is the number that
    // actually matters when settling up with someone.
    const people = new Map();

    for (const split of splits) {
      for (const participant of split.participants) {
        if (participant.isMe) continue;

        const key = participant.name.toLowerCase();
        const entry = people.get(key) || {
          name: participant.name,
          owesMe: 0,
          iOwe: 0,
          splitCount: 0,
        };

        const unsettled = round2(
          Number(participant.share || 0) - Number(participant.settledAmount || 0),
        );

        if (split.paidByMe) {
          entry.owesMe = round2(entry.owesMe + Math.max(unsettled, 0));
        }

        entry.splitCount += 1;
        people.set(key, entry);
      }

      // A bill someone else paid is owed to them, not to a participant row.
      if (!split.paidByMe && split.iOwe > 0) {
        const key = split.payerName.toLowerCase();
        const entry = people.get(key) || {
          name: split.payerName,
          owesMe: 0,
          iOwe: 0,
          splitCount: 0,
        };

        entry.iOwe = round2(entry.iOwe + split.iOwe);
        people.set(key, entry);
      }
    }

    const peopleList = [...people.values()]
      .map((entry) => ({ ...entry, net: round2(entry.owesMe - entry.iOwe) }))
      .filter((entry) => entry.owesMe > 0 || entry.iOwe > 0)
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

    const owedToMe = round2(splits.reduce((sum, s) => sum + s.owedToMe, 0));
    const iOwe = round2(splits.reduce((sum, s) => sum + s.iOwe, 0));

    const groups = [
      ...splits
        .filter((s) => s.groupName)
        .reduce((map, s) => {
          const entry = map.get(s.groupName) || {
            name: s.groupName,
            total: 0,
            count: 0,
          };

          entry.total = round2(entry.total + s.totalAmount);
          entry.count += 1;
          map.set(s.groupName, entry);

          return map;
        }, new Map())
        .values(),
    ].sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      data: {
        splits: splits.sort((a, b) => new Date(b.date) - new Date(a.date)),
        people: peopleList,
        groups,
        totals: {
          count: splits.length,
          owedToMe,
          iOwe,
          net: round2(owedToMe - iOwe),
          open: splits.filter((s) => !s.isFullySettled).length,
          // The user's own spending across shared bills - not the bill totals,
          // which include other people's money.
          myShareTotal: round2(splits.reduce((sum, s) => sum + s.myShare, 0)),
          billedTotal: round2(splits.reduce((sum, s) => sum + s.totalAmount, 0)),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
