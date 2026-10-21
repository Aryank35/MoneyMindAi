import Note from "../models/Note.js";
import Event from "../models/Event.js";
import Obligation from "../models/Obligation.js";
import { addDays, daysBetween, startOfDay } from "../helpers/dates.js";
import { getEventType } from "../config/eventTypes.js";
import { decorateObligation } from "./obligationController.js";
import {
  collectUpcomingSchedules,
  loadDecoratedSchedules,
} from "./scheduleController.js";

// =========================================================================
// WHAT TODAY WANTS FROM YOU
//
// There is no background job here - nothing fires on its own, and nothing
// pushes. So the moment the app is opened, everything that was dated for
// today or for a day already past is gathered into one answer, and the
// client shows it once a day.
//
// Four rules, each the result of a way a reminder stops being useful:
//
//   1. Overdue outranks due-today. Something you already missed is the more
//      urgent fact, so it sorts first and is never collapsed away.
//
//   2. One source of truth per thing. Scheduled bills come from the same
//      derivation the planner page uses, lending from the same decoration
//      the lending page uses. A digest that computed its own idea of "due"
//      would eventually disagree with the page it links to, and then neither
//      could be trusted.
//
//   3. Nothing already dealt with. A to-do that is done, a loan settled, a
//      plan completed or cancelled - none of it is news.
//
//   4. Every item carries where to go. A reminder you cannot act on from
//      the popup is just an interruption.
// =========================================================================

// Due-today and overdue are the whole point; a short look-ahead is included
// so "tomorrow" is not a surprise, but it is held in its own bucket and the
// popup only insists on the first two.
const LOOKAHEAD_DAYS = 3;

const severityOf = (days) => {
  if (days < 0) return "overdue";

  if (days === 0) return "today";

  return "soon";
};

const whenLabel = (days) => {
  if (days < 0) {
    const late = Math.abs(days);

    return `${late} day${late === 1 ? "" : "s"} overdue`;
  }

  if (days === 0) return "Today";

  if (days === 1) return "Tomorrow";

  return `In ${days} days`;
};

const RANK = { overdue: 0, today: 1, soon: 2 };

export const getTodayAlerts = async (req, res) => {
  try {
    const { userId } = req.params;

    const today = startOfDay(new Date());

    const horizon = addDays(today, LOOKAHEAD_DAYS);

    const [notes, schedules, obligations, events] = await Promise.all([
      Note.find({ userId, kind: "todo", done: false, dueDate: { $ne: null } }),
      loadDecoratedSchedules(userId, today),
      Obligation.find({ userId }),
      Event.find({ userId }),
    ]);

    const items = [];

    const push = (item, date) => {
      const days = daysBetween(today, date);

      if (days > LOOKAHEAD_DAYS) return;

      items.push({
        ...item,
        date,
        days,
        severity: severityOf(days),
        when: whenLabel(days),
      });
    };

    // ---- to-dos ----
    for (const note of notes) {
      push(
        {
          source: "todo",
          sourceLabel: "To-do",
          id: String(note._id),
          title: note.title,
          subtitle: note.group || "",
          link: "/notes",
        },
        note.dueDate,
      );
    }

    // ---- scheduled payments, SIPs and premiums ----
    // Derived by the planner's own helper, so the digest and the planner can
    // never disagree about what is due.
    const active = schedules.filter((item) => item.isActive);

    for (const due of collectUpcomingSchedules(active, today, horizon)) {
      push(
        {
          source: "schedule",
          sourceLabel:
            due.kind === "insurance"
              ? "Premium"
              : due.kind === "contribution"
                ? "Contribution"
                : "Scheduled payment",
          id: `${due.scheduleId}-${new Date(due.date).toISOString()}`,
          title: due.name,
          subtitle: due.category || "",
          amount: Number(due.amount || 0),
          link: "/planner",
        },
        due.date,
      );
    }

    // ---- money owed, in either direction ----
    for (const row of obligations) {
      const decorated = decorateObligation(row, today);

      if (decorated.isClosed || !decorated.promiseDate) continue;

      push(
        {
          source: "lending",
          sourceLabel:
            decorated.direction === "lent" ? "Owed to you" : "You owe",
          id: String(decorated._id),
          title: decorated.counterparty,
          subtitle:
            decorated.direction === "lent"
              ? "Repayment promised"
              : "Repayment due",
          amount: decorated.outstanding,
          link: "/lending",
        },
        decorated.promiseDate,
      );
    }

    // ---- plans: the trip itself, and the tasks on it ----
    for (const event of events) {
      const plain = event.toObject();

      // `typeMeta` is added by the event decorator, which is not run here -
      // the digest needs the label only, so it comes straight from config.
      const typeLabel = getEventType(plain.type).label;

      const isOver =
        plain.status === "done" ||
        plain.status === "cancelled" ||
        (plain.endDate && daysBetween(today, plain.endDate) < 0);

      // A task on a plan that is over is not something to be reminded about.
      if (!isOver) {
        if (plain.startDate) {
          const days = daysBetween(today, plain.startDate);

          if (days >= 0 && days <= LOOKAHEAD_DAYS) {
            push(
              {
                source: "event",
                sourceLabel: typeLabel,
                id: String(plain._id),
                title: plain.name,
                subtitle: days === 0 ? "Starts today" : "Starts soon",
                link: `/events/${plain._id}`,
              },
              plain.startDate,
            );
          }
        }

        for (const task of plain.tasks || []) {
          if (task.done || !task.dueDate) continue;

          push(
            {
              source: "event-task",
              sourceLabel: `${plain.name} · task`,
              id: String(task._id),
              title: task.title,
              subtitle: task.assignedTo || "",
              link: `/events/${plain._id}`,
            },
            task.dueDate,
          );
        }
      }

      // The end of a plan is where settling up happens, so it is worth its
      // own line - but not once the user has marked the plan done or
      // cancelled. That is precisely the "I have dealt with this" signal the
      // digest has to respect.
      if (
        plain.endDate &&
        plain.status !== "cancelled" &&
        plain.status !== "done"
      ) {
        const days = daysBetween(today, plain.endDate);

        if (days >= 0 && days <= LOOKAHEAD_DAYS) {
          push(
            {
              source: "event",
              sourceLabel: typeLabel,
              id: `${plain._id}-end`,
              title: plain.name,
              subtitle: days === 0 ? "Ends today" : "Ends soon",
              link: `/events/${plain._id}`,
            },
            plain.endDate,
          );
        }
      }
    }

    // Rule 1: overdue first, then today, then the look-ahead; oldest first
    // inside each band, because the thing you missed longest ago is the one
    // most likely to have been forgotten.
    items.sort(
      (a, b) =>
        RANK[a.severity] - RANK[b.severity] ||
        new Date(a.date) - new Date(b.date),
    );

    const counts = {
      overdue: items.filter((item) => item.severity === "overdue").length,
      today: items.filter((item) => item.severity === "today").length,
      soon: items.filter((item) => item.severity === "soon").length,
    };

    res.json({
      success: true,
      data: {
        // The date the digest was built for. The client shows it once per
        // day and keys that off this, so a session left open overnight gets
        // the new day's list rather than yesterday's.
        dateKey: `${today.getFullYear()}-${String(
          today.getMonth() + 1,
        ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
        items,
        counts,
        // Whether there is anything worth interrupting for. A look-ahead
        // item on its own is not - it can wait for the page it lives on.
        shouldPrompt: counts.overdue + counts.today > 0,
        amountDue: items
          .filter((item) => item.severity !== "soon")
          .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
