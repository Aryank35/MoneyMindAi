import Schedule from "../models/Schedule.js";
import Expense from "../models/Expense.js";
import Account from "../models/Account.js";
import { deductBalance, addBalance } from "../helpers/accountBalance.js";
import {
  CADENCE_PRESETS,
  describeRecurrence,
  getScheduleStatus,
  monthlyEquivalent,
  occurrencesBetween,
} from "../helpers/recurrence.js";
import { addDays, startOfDay } from "../helpers/dates.js";

// =========================================================================
// HELPERS
// =========================================================================

// The nested recurrence subdocument always materialises with defaults, so
// `isRecurring` is what actually decides whether a schedule repeats.
const effectiveRecurrence = (schedule) =>
  schedule.isRecurring
    ? {
        every: schedule.recurrence?.every || 1,
        unit: schedule.recurrence?.unit || "month",
      }
    : null;

const decorate = (schedule, today = new Date()) => {
  const plain = schedule.toObject ? schedule.toObject() : schedule;
  const recurrence = effectiveRecurrence(plain);

  const status = getScheduleStatus({ ...plain, recurrence }, today);

  return {
    ...plain,
    recurrence,
    status,
    cadenceLabel: describeRecurrence(recurrence),
    monthlyEquivalent: monthlyEquivalent(plain.amount, recurrence),
    paidCount: plain.payments?.length || 0,
    totalPaid: (plain.payments || []).reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    ),
  };
};

const validate = (body) => {
  if (!body.name?.trim()) return "Give this a name";

  if (!(Number(body.amount) > 0)) return "Amount must be greater than 0";

  if (!body.startDate) return "A start date is required";

  if (body.isRecurring && !(Number(body.recurrence?.every) > 0)) {
    return "Repeat interval must be at least 1";
  }

  if (
    body.endDate &&
    startOfDay(body.endDate) < startOfDay(body.startDate)
  ) {
    return "The end date cannot be before the start date";
  }

  return null;
};

const buildPayload = (body) => ({
  kind: body.kind || "payment",
  name: body.name.trim(),
  amount: Number(body.amount),
  isRecurring: body.isRecurring !== false,
  recurrence: {
    every: Number(body.recurrence?.every) || 1,
    unit: body.recurrence?.unit || "month",
  },
  startDate: new Date(body.startDate),
  endDate: body.endDate ? new Date(body.endDate) : null,
  accountId: body.accountId || null,
  category: body.category?.trim() || "",
  contributor: body.contributor?.trim() || "",
  includeInBudget: body.includeInBudget !== false,
  policy:
    body.kind === "insurance"
      ? {
          insurer: body.policy?.insurer?.trim() || "",
          policyNumber: body.policy?.policyNumber?.trim() || "",
          policyType: body.policy?.policyType || "Other",
          coverAmount: Number(body.policy?.coverAmount || 0),
          maturityDate: body.policy?.maturityDate
            ? new Date(body.policy.maturityDate)
            : null,
          nominee: body.policy?.nominee?.trim() || "",
        }
      : undefined,
  isActive: body.isActive !== false,
  note: body.note?.trim() || "",
});

// =========================================================================
// REGISTRY
// =========================================================================

export const getScheduleOptions = (req, res) => {
  res.json({
    success: true,
    data: {
      cadences: CADENCE_PRESETS,
      kinds: [
        {
          key: "payment",
          label: "Payment",
          icon: "📤",
          description: "Rent, EMI, subscriptions, or a one-off future bill.",
        },
        {
          key: "insurance",
          label: "Insurance",
          icon: "🛡️",
          description: "A premium and the policy behind it.",
        },
        {
          key: "contribution",
          label: "Contribution",
          icon: "🎁",
          description:
            "Money someone else puts in for you - a parent's monthly deposit, for instance.",
        },
      ],
      policyTypes: ["Life", "Term", "Health", "Motor", "Home", "Travel", "Other"],
    },
  });
};

// =========================================================================
// CRUD
// =========================================================================

export const createSchedule = async (req, res) => {
  try {
    const error = validate(req.body);

    if (error) return res.status(400).json({ success: false, message: error });

    const schedule = await Schedule.create({
      ...buildPayload(req.body),
      userId: req.body.userId,
    });

    res.status(201).json({ success: true, data: decorate(schedule) });
  } catch (err) {
    console.error("Schedule Error:", err);

    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSchedulesByUser = async (req, res) => {
  try {
    const schedules = await Schedule.find({ userId: req.params.userId }).sort({
      startDate: 1,
    });

    const decorated = schedules.map((schedule) => decorate(schedule));

    // Most pressing first, so the page leads with what needs paying.
    decorated.sort(
      (a, b) =>
        b.status.severity - a.status.severity ||
        (a.status.daysUntil ?? 9999) - (b.status.daysUntil ?? 9999),
    );

    res.json({ success: true, data: decorated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const existing = await Schedule.findById(req.params.id);

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Schedule not found" });
    }

    const merged = {
      ...existing.toObject(),
      ...req.body,
      name: req.body.name ?? existing.name,
      amount: req.body.amount ?? existing.amount,
      startDate: req.body.startDate ?? existing.startDate,
    };

    const error = validate(merged);

    if (error) return res.status(400).json({ success: false, message: error });

    // Payment history is never rewritten by an edit.
    existing.set(buildPayload(merged));

    const updated = await existing.save();

    res.json({ success: true, data: decorate(updated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);

    if (!schedule) {
      return res
        .status(404)
        .json({ success: false, message: "Schedule not found" });
    }

    // Expenses already written by past payments are real transactions and
    // are deliberately left alone - only the plan is removed.
    res.json({
      success: true,
      message: "Schedule removed",
      keptPayments: schedule.payments?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getScheduleDeleteImpact = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res
        .status(404)
        .json({ success: false, message: "Schedule not found" });
    }

    const decorated = decorate(schedule);

    res.json({
      success: true,
      data: {
        name: decorated.name,
        kind: decorated.kind,
        amount: decorated.amount,
        cadenceLabel: decorated.cadenceLabel,
        paidCount: decorated.paidCount,
        totalPaid: decorated.totalPaid,
        nextDate: decorated.status.nextDate,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// MARK PAID
// =========================================================================

// Recording a payment is what makes a schedule more than a reminder: for a
// payment or premium it writes a real Expense and debits the account, so the
// balance moves exactly as it would had the user logged it by hand.
export const markSchedulePaid = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res
        .status(404)
        .json({ success: false, message: "Schedule not found" });
    }

    const amount = Number(req.body.amount ?? schedule.amount);

    if (!(amount > 0)) {
      return res
        .status(400)
        .json({ success: false, message: "Amount must be greater than 0" });
    }

    const paidOn = req.body.paidOn ? new Date(req.body.paidOn) : new Date();

    let expenseId = null;

    // A contribution is money arriving from someone else, so it is not an
    // expense and must not debit an account.
    if (schedule.kind !== "contribution") {
      if (!schedule.accountId) {
        return res.status(400).json({
          success: false,
          message: "Link an account to this schedule before marking it paid",
        });
      }

      const account = await Account.findById(schedule.accountId);

      if (!account) {
        return res
          .status(404)
          .json({ success: false, message: "Linked account no longer exists" });
      }

      const expense = await Expense.create({
        userId: schedule.userId,
        accountId: String(schedule.accountId),
        category: schedule.category || schedule.name,
        amount,
        note: `${schedule.name} (scheduled)`,
        expenseDate: paidOn,
      });

      await deductBalance(schedule.accountId, amount);

      expenseId = expense._id;
    } else if (schedule.accountId) {
      // A contribution that lands in one of the user's own accounts does
      // credit it.
      await addBalance(schedule.accountId, amount);
    }

    schedule.payments.push({ paidOn, amount, expenseId });
    schedule.lastPaidDate = paidOn;

    const saved = await schedule.save();

    res.json({ success: true, data: decorate(saved) });
  } catch (err) {
    console.error("Schedule payment error:", err);

    res.status(500).json({ success: false, message: err.message });
  }
};

// Undo the most recent payment - the balance movement included.
export const undoLastPayment = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res
        .status(404)
        .json({ success: false, message: "Schedule not found" });
    }

    const last = schedule.payments[schedule.payments.length - 1];

    if (!last) {
      return res
        .status(400)
        .json({ success: false, message: "No payment to undo" });
    }

    if (last.expenseId) {
      // Deleting through the expense route would double-refund, so the
      // balance is restored here and the row removed directly.
      await Expense.findByIdAndDelete(last.expenseId);
      await addBalance(schedule.accountId, last.amount);
    } else if (schedule.kind === "contribution" && schedule.accountId) {
      await deductBalance(schedule.accountId, last.amount);
    }

    schedule.payments.pop();
    schedule.lastPaidDate =
      schedule.payments[schedule.payments.length - 1]?.paidOn || null;

    const saved = await schedule.save();

    res.json({ success: true, data: decorate(saved) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// OVERVIEW
// =========================================================================

export const getScheduleOverview = async (req, res) => {
  try {
    const schedules = await Schedule.find({ userId: req.params.userId });

    const today = startOfDay(new Date());
    const horizon = addDays(today, Number(req.query.days) || 30);

    const decorated = schedules.map((schedule) => decorate(schedule, today));
    const active = decorated.filter((item) => item.isActive);

    // Every individual due date in the window, so the user sees "three bills
    // this fortnight" rather than a list of abstract cadences.
    const upcoming = [];

    for (const item of active) {
      const dates = occurrencesBetween(
        item.lastPaidDate ? addDays(item.lastPaidDate, 1) : item.startDate,
        item.recurrence,
        today,
        horizon,
        item.endDate,
      );

      for (const date of dates) {
        upcoming.push({
          scheduleId: item._id,
          name: item.name,
          kind: item.kind,
          amount: item.amount,
          category: item.category,
          accountId: item.accountId,
          date,
          isOverdue: false,
        });
      }

      // An unpaid past due date is not in the forward window but is the most
      // important thing to show.
      if (item.status.state === "overdue") {
        upcoming.push({
          scheduleId: item._id,
          name: item.name,
          kind: item.kind,
          amount: item.amount,
          category: item.category,
          accountId: item.accountId,
          date: item.status.nextDate,
          isOverdue: true,
        });
      }
    }

    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

    const sumBy = (predicate, field = "amount") =>
      active
        .filter(predicate)
        .reduce((sum, item) => sum + Number(item[field] || 0), 0);

    const outgoing = active.filter((item) => item.kind !== "contribution");
    const incoming = active.filter((item) => item.kind === "contribution");

    res.json({
      success: true,
      data: {
        horizonDays: Number(req.query.days) || 30,
        schedules: decorated,
        upcoming,
        totals: {
          count: active.length,
          overdue: active.filter((item) => item.status.state === "overdue")
            .length,
          dueThisWeek: upcoming.filter(
            (item) => !item.isOverdue && new Date(item.date) <= addDays(today, 7),
          ).length,
          // Cadences normalised to a month so commitments are comparable.
          monthlyOutgoing: outgoing.reduce(
            (sum, item) => sum + item.monthlyEquivalent,
            0,
          ),
          monthlyIncoming: incoming.reduce(
            (sum, item) => sum + item.monthlyEquivalent,
            0,
          ),
          // Contributions the user chose to exclude are held apart.
          monthlyBudgetable: incoming
            .filter((item) => item.includeInBudget)
            .reduce((sum, item) => sum + item.monthlyEquivalent, 0),
          dueInWindow: upcoming.reduce(
            (sum, item) => sum + Number(item.amount || 0),
            0,
          ),
          insuranceCover: sumBy(
            (item) => item.kind === "insurance",
            "amount",
          ),
        },
        insurance: decorated
          .filter((item) => item.kind === "insurance")
          .map((item) => ({
            _id: item._id,
            name: item.name,
            amount: item.amount,
            cadenceLabel: item.cadenceLabel,
            status: item.status,
            policy: item.policy,
          })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
