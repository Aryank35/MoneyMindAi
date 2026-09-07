// =========================================================================
// RECURRENCE
//
// One shape covers every cadence the app needs:
//
//   { every: 1, unit: "month" }  -> monthly
//   { every: 3, unit: "month" }  -> quarterly
//   { every: 6, unit: "month" }  -> half-yearly
//   { every: 4, unit: "month" }  -> every four months
//   { every: 1, unit: "year"  }  -> annually
//   { every: 2, unit: "week"  }  -> fortnightly
//   null                         -> a one-off, future-dated payment
//
// Occurrences are always computed as an offset from the *start* date rather
// than by stepping off the previous one. Stepping would drift: a bill due on
// the 31st would go 31 Jan -> 28 Feb -> 28 Mar, when it should return to
// 31 Mar.
// =========================================================================

import { addDays, clampToMonth, daysBetween, monthsBetween, startOfDay } from "./dates.js";

export const UNITS = ["day", "week", "month", "year"];

export const CADENCE_PRESETS = [
  { key: "once", label: "One-off", recurrence: null },
  { key: "weekly", label: "Weekly", recurrence: { every: 1, unit: "week" } },
  { key: "fortnightly", label: "Fortnightly", recurrence: { every: 2, unit: "week" } },
  { key: "monthly", label: "Monthly", recurrence: { every: 1, unit: "month" } },
  { key: "bimonthly", label: "Every 2 months", recurrence: { every: 2, unit: "month" } },
  { key: "quarterly", label: "Quarterly", recurrence: { every: 3, unit: "month" } },
  { key: "fourMonthly", label: "Every 4 months", recurrence: { every: 4, unit: "month" } },
  { key: "halfYearly", label: "Every 6 months", recurrence: { every: 6, unit: "month" } },
  { key: "yearly", label: "Yearly", recurrence: { every: 1, unit: "year" } },
  { key: "custom", label: "Custom", recurrence: { every: 1, unit: "month" } },
];

export const describeRecurrence = (recurrence) => {
  if (!recurrence) return "One-off";

  const { every, unit } = recurrence;

  const preset = CADENCE_PRESETS.find(
    (item) =>
      item.recurrence &&
      item.recurrence.every === every &&
      item.recurrence.unit === unit &&
      item.key !== "custom",
  );

  if (preset) return preset.label;

  return `Every ${every} ${unit}${every === 1 ? "" : "s"}`;
};

// The nth occurrence, counting the start date as n = 0.
export const occurrenceAt = (startDate, recurrence, n) => {
  const start = startOfDay(startDate);

  if (!recurrence) return n === 0 ? start : null;

  const { every, unit } = recurrence;

  if (!(every > 0)) return n === 0 ? start : null;

  // Anchored on the start date's day-of-month so month-end bills return to
  // their real day instead of drifting earlier each cycle.
  const anchorDay = start.getDate();

  switch (unit) {
    case "day":
      return addDays(start, every * n);

    case "week":
      return addDays(start, every * 7 * n);

    case "month":
      return clampToMonth(
        start.getFullYear(),
        start.getMonth() + every * n,
        anchorDay,
      );

    case "year":
      return clampToMonth(
        start.getFullYear() + every * n,
        start.getMonth(),
        anchorDay,
      );

    default:
      return null;
  }
};

// First occurrence strictly after `after`. An analytic guess gets close, then
// a tiny correction loop lands it exactly - a plain walk from the start date
// would iterate thousands of times for an old daily schedule.
export const nextOccurrenceAfter = (startDate, recurrence, after = new Date()) => {
  const start = startOfDay(startDate);
  const cutoff = startOfDay(after);

  if (!recurrence) return start > cutoff ? start : null;

  const { every, unit } = recurrence;

  if (!(every > 0)) return null;

  let guess = 0;

  if (unit === "day") {
    guess = Math.floor(daysBetween(start, cutoff) / every);
  } else if (unit === "week") {
    guess = Math.floor(daysBetween(start, cutoff) / (every * 7));
  } else if (unit === "month") {
    guess = Math.floor(monthsBetween(start, cutoff) / every);
  } else if (unit === "year") {
    guess = Math.floor((cutoff.getFullYear() - start.getFullYear()) / every);
  }

  let n = Math.max(guess - 2, 0);

  // Bounded: the guess is never more than a couple of periods out.
  for (let i = 0; i < 64; i += 1) {
    const occurrence = occurrenceAt(start, recurrence, n);

    if (!occurrence) return null;

    if (occurrence > cutoff) return occurrence;

    n += 1;
  }

  return null;
};

// Every occurrence in a window, used to project upcoming outgoings.
export const occurrencesBetween = (startDate, recurrence, from, to, endDate) => {
  const results = [];
  const limit = endDate ? startOfDay(endDate) : null;

  let cursor = nextOccurrenceAfter(startDate, recurrence, addDays(from, -1));

  for (let i = 0; cursor && i < 400; i += 1) {
    if (cursor > startOfDay(to)) break;
    if (limit && cursor > limit) break;

    results.push(cursor);

    cursor = nextOccurrenceAfter(startDate, recurrence, cursor);
  }

  return results;
};

// Where a schedule stands right now: what is next, and whether it is late.
// `lastPaidDate` is what separates "due tomorrow" from "you missed last
// month" - without it a monthly bill would always look merely upcoming.
export const getScheduleStatus = (schedule, today = new Date()) => {
  const now = startOfDay(today);
  const recurrence = schedule.recurrence || null;

  const ended = schedule.endDate && startOfDay(schedule.endDate) < now;

  // The occurrence a payment is currently owed for: the first one after the
  // last payment, or after the start if nothing has been paid yet.
  const paidThrough = schedule.lastPaidDate
    ? startOfDay(schedule.lastPaidDate)
    : null;

  const dueOccurrence = paidThrough
    ? nextOccurrenceAfter(schedule.startDate, recurrence, paidThrough)
    : startOfDay(schedule.startDate);

  const nextDate = dueOccurrence;

  if (!schedule.isActive || ended) {
    return {
      nextDate: null,
      daysUntil: null,
      state: ended ? "ended" : "paused",
      label: ended ? "Ended" : "Paused",
      severity: 0,
    };
  }

  if (!nextDate) {
    return {
      nextDate: null,
      daysUntil: null,
      state: "complete",
      label: "Nothing further due",
      severity: 0,
    };
  }

  const daysUntil = daysBetween(now, nextDate);

  if (daysUntil < 0) {
    return {
      nextDate,
      daysUntil,
      state: "overdue",
      label: `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"}`,
      severity: 4,
    };
  }

  if (daysUntil === 0) {
    return { nextDate, daysUntil, state: "today", label: "Due today", severity: 3 };
  }

  if (daysUntil <= 3) {
    return {
      nextDate,
      daysUntil,
      state: "urgent",
      label: `Due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
      severity: 2,
    };
  }

  if (daysUntil <= 7) {
    return {
      nextDate,
      daysUntil,
      state: "soon",
      label: `Due in ${daysUntil} days`,
      severity: 1,
    };
  }

  return {
    nextDate,
    daysUntil,
    state: "scheduled",
    label: `Due in ${daysUntil} days`,
    severity: 0,
  };
};

// Normalised monthly cost, so schedules on different cadences can be summed
// into one "what this commits me to each month" figure.
export const monthlyEquivalent = (amount, recurrence) => {
  const value = Number(amount || 0);

  if (!recurrence) return 0;

  const { every, unit } = recurrence;

  if (!(every > 0)) return 0;

  switch (unit) {
    case "day":
      return (value * 30.44) / every;
    case "week":
      return (value * 4.348) / every;
    case "month":
      return value / every;
    case "year":
      return value / (every * 12);
    default:
      return 0;
  }
};
