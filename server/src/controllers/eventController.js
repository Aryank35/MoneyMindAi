import Event from "../models/Event.js";
import EventAttachment, {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
} from "../models/EventAttachment.js";
import Split from "../models/Split.js";
import Account from "../models/Account.js";
import Expense from "../models/Expense.js";
import { addBalance, deductBalance } from "../helpers/accountBalance.js";
import { computeMyCost } from "./splitController.js";
import {
  EVENT_STATUSES,
  EVENT_TYPES,
  getEventType,
} from "../config/eventTypes.js";
import { daysBetween } from "../helpers/dates.js";

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

// =========================================================================
// DERIVED VIEW
//
// Nothing below is stored. The estimate is re-added from the plan lines and
// the actual is re-totalled from the event's splits on every read, so an
// edit anywhere shows up everywhere at once instead of leaving a stale
// snapshot behind on the event document.
// =========================================================================

// Per-head lines re-price themselves when the roster changes, which is the
// whole reason the flag exists - adding a seventh person to a trip should
// move the estimate without anyone re-typing six numbers.
const lineEstimate = (item, headcount) =>
  round2(
    Number(item.estimatedAmount || 0) *
      (item.perHead ? Math.max(headcount, 1) : 1),
  );

export const decorateEvent = (document, splits = [], today = new Date()) => {
  const event = document.toObject ? document.toObject() : document;

  const type = getEventType(event.type);
  const headcount = Math.max((event.participants || []).length, 1);

  // ---- the plan ----
  const planItems = (event.planItems || []).map((item) => ({
    ...item,
    estimate: lineEstimate(item, headcount),
  }));

  const estimated = round2(
    planItems.reduce((sum, item) => sum + item.estimate, 0),
  );

  // ---- what actually happened ----
  const decorated = splits;

  const actual = round2(
    decorated.reduce((sum, split) => sum + Number(split.totalAmount || 0), 0),
  );

  const myCost = round2(
    decorated.reduce((sum, split) => sum + Number(split.myCost || 0), 0),
  );

  const advanced = round2(
    decorated.reduce((sum, split) => sum + Number(split.advanceAmount || 0), 0),
  );

  const owedToMe = round2(
    decorated.reduce((sum, split) => sum + Number(split.owedToMe || 0), 0),
  );

  const iOwe = round2(
    decorated.reduce((sum, split) => sum + Number(split.iOwe || 0), 0),
  );

  const treated = round2(
    decorated.reduce((sum, split) => sum + Number(split.treatedAmount || 0), 0),
  );

  // ---- estimate against actual, per budget head ----
  //
  // Both sides are keyed on the category string. A plan line with no
  // category and an expense with no category both fall into "Uncategorised"
  // rather than being dropped, so the columns always sum to the totals.
  const buckets = new Map();

  const bucket = (name) => {
    const key = (name || "").trim() || "Uncategorised";

    if (!buckets.has(key)) {
      buckets.set(key, { category: key, estimated: 0, actual: 0, mine: 0 });
    }

    return buckets.get(key);
  };

  for (const item of planItems) {
    bucket(item.category).estimated = round2(
      bucket(item.category).estimated + item.estimate,
    );
  }

  for (const split of decorated) {
    const entry = bucket(split.category);

    entry.actual = round2(entry.actual + Number(split.totalAmount || 0));
    entry.mine = round2(entry.mine + Number(split.myCost || 0));
  }

  const categories = [...buckets.values()]
    .map((entry) => ({
      ...entry,
      variance: round2(entry.actual - entry.estimated),
      // Only meaningful once something was planned; an unplanned head is
      // reported as over by its whole amount rather than as a percentage
      // of nothing.
      usedPercentage: entry.estimated > 0
        ? round2((entry.actual / entry.estimated) * 100)
        : null,
    }))
    .sort((a, b) => b.actual - a.actual || b.estimated - a.estimated);

  // ---- who is square with whom, within this event ----
  const people = new Map();

  const person = (name) => {
    const key = name.toLowerCase();

    if (!people.has(key)) {
      people.set(key, { name, owesMe: 0, iOwe: 0, paidOut: 0, share: 0 });
    }

    return people.get(key);
  };

  for (const split of decorated) {
    for (const participant of split.participants || []) {
      const entry = person(participant.name);

      entry.share = round2(entry.share + Number(participant.share || 0));

      if (participant.isMe) continue;

      if (split.paidByMe && participant.recoverable !== false) {
        entry.owesMe = round2(
          entry.owesMe +
            Math.max(
              Number(participant.share || 0) -
                Number(participant.settledAmount || 0),
              0,
            ),
        );
      }
    }

    // Whoever fronted the bill carries it until it is settled.
    if (split.paidByMe) {
      person("Me").paidOut = round2(
        person("Me").paidOut + Number(split.totalAmount || 0),
      );
    } else if (split.payerName) {
      const entry = person(split.payerName);

      entry.paidOut = round2(entry.paidOut + Number(split.totalAmount || 0));

      if (Number(split.iOwe || 0) > 0) {
        entry.iOwe = round2(entry.iOwe + Number(split.iOwe));
      }
    }
  }

  const ledger = [...people.values()]
    .map((entry) => ({ ...entry, net: round2(entry.owesMe - entry.iOwe) }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || b.paidOut - a.paidOut);

  // ---- tasks ----
  const tasks = event.tasks || [];
  const doneCount = tasks.filter((task) => task.done).length;

  const overdueTasks = tasks.filter(
    (task) => !task.done && task.dueDate && new Date(task.dueDate) < today,
  ).length;

  // ---- timing ----
  const daysUntilStart = event.startDate
    ? daysBetween(today, event.startDate)
    : null;

  const daysUntilEnd = event.endDate ? daysBetween(today, event.endDate) : null;

  const durationDays =
    event.startDate && event.endDate
      ? Math.max(daysBetween(event.startDate, event.endDate) + 1, 1)
      : null;

  // The status the dates imply. Stored status wins - "we cancelled" is a
  // fact no date can express - but this is what the client offers.
  const suggestedStatus =
    event.status === "cancelled"
      ? "cancelled"
      : daysUntilStart === null
        ? event.status
        : daysUntilStart > 0
          ? "planning"
          : daysUntilEnd !== null && daysUntilEnd < 0
            ? "done"
            : "ongoing";

  // The cap is what you said you would spend; the plan is what you have
  // itemised. Reporting both stops an under-itemised plan from looking
  // like an under-spend.
  const cap = Number(event.budgetCap || 0);
  const budgetLine = cap > 0 ? cap : estimated;

  return {
    ...event,
    typeMeta: {
      key: type.key,
      label: type.label,
      icon: event.emoji || type.icon,
      categories: type.categories,
    },
    planItems,
    headcount: (event.participants || []).length,
    expenses: decorated,
    categories,
    ledger,
    totals: {
      estimated,
      budgetCap: cap,
      budgetLine,
      actual,
      myCost,
      advanced,
      owedToMe,
      iOwe,
      treated,
      // Positive means money still in hand against the plan.
      remaining: round2(budgetLine - actual),
      variance: round2(actual - budgetLine),
      usedPercentage:
        budgetLine > 0 ? round2((actual / budgetLine) * 100) : null,
      perHeadEstimated: round2(estimated / headcount),
      perHeadActual: round2(actual / headcount),
      // Not itemised yet: the gap between the cap and the plan lines.
      unplanned: cap > 0 ? round2(cap - estimated) : 0,
      expenseCount: decorated.length,
    },
    taskProgress: {
      done: doneCount,
      total: tasks.length,
      overdue: overdueTasks,
      percentage: tasks.length
        ? round2((doneCount / tasks.length) * 100)
        : 0,
    },
    counts: {
      notes: (event.notes || []).length,
      links: (event.links || []).length,
    },
    daysUntilStart,
    daysUntilEnd,
    durationDays,
    suggestedStatus,
    isPast: suggestedStatus === "done" || event.status === "done",
  };
};

// Splits carry the money, so they are always fetched and decorated through
// the split controller's own logic rather than re-derived here.
const loadSplits = async (eventId) => {
  const splits = await Split.find({ eventId }).sort({ date: -1 });

  return splits.map((split) => {
    const plain = split.toObject();
    const { treated, myCost } = computeMyCost(plain.participants);

    const me = (plain.participants || []).find((p) => p.isMe);
    const others = (plain.participants || []).filter((p) => !p.isMe);

    const owedToMe = plain.paidByMe
      ? others
          .filter((p) => p.recoverable !== false)
          .reduce(
            (sum, p) =>
              sum +
              Math.max(
                Number(p.share || 0) - Number(p.settledAmount || 0),
                0,
              ),
            0,
          )
      : 0;

    const iWasTreated = !plain.paidByMe && me?.recoverable === false;

    const iOwe =
      plain.paidByMe || iWasTreated
        ? 0
        : Math.max(
            Number(me?.share || 0) - Number(me?.settledAmount || 0),
            0,
          );

    return {
      ...plain,
      myShare: round2(Number(me?.share || 0)),
      myCost: plain.paidByMe ? myCost : iWasTreated ? 0 : round2(Number(me?.share || 0)),
      treatedAmount: plain.paidByMe ? treated : 0,
      iWasTreated,
      owedToMe: round2(owedToMe),
      iOwe: round2(iOwe),
      isFullySettled: round2(owedToMe) === 0 && round2(iOwe) === 0,
    };
  });
};

// =========================================================================
// OPTIONS
// =========================================================================

export const getEventOptions = (req, res) => {
  res.json({
    success: true,
    data: {
      types: EVENT_TYPES,
      statuses: EVENT_STATUSES,
      maxAttachmentBytes: MAX_ATTACHMENT_BYTES,
      allowedAttachmentTypes: ALLOWED_ATTACHMENT_TYPES,
    },
  });
};

// =========================================================================
// CRUD
// =========================================================================

const buildPayload = (body) => {
  const payload = {};

  if (body.name !== undefined) payload.name = String(body.name).trim();
  if (body.type !== undefined) payload.type = body.type;
  if (body.emoji !== undefined) payload.emoji = String(body.emoji).trim();

  if (body.destination !== undefined) {
    payload.destination = String(body.destination).trim();
  }

  if (body.startDate !== undefined) {
    payload.startDate = body.startDate ? new Date(body.startDate) : null;
  }

  if (body.endDate !== undefined) {
    payload.endDate = body.endDate ? new Date(body.endDate) : null;
  }

  if (body.status !== undefined) payload.status = body.status;

  if (body.budgetCap !== undefined) {
    payload.budgetCap = Math.max(Number(body.budgetCap || 0), 0);
  }

  if (body.note !== undefined) payload.note = String(body.note);

  return payload;
};

const validateEvent = (body) => {
  if (!body.name?.trim()) return "Give this a name";

  if (body.startDate && body.endDate) {
    if (new Date(body.endDate) < new Date(body.startDate)) {
      return "The end date cannot be before the start date";
    }
  }

  return null;
};

export const createEvent = async (req, res) => {
  try {
    const error = validateEvent(req.body);

    if (error) return res.status(400).json({ success: false, message: error });

    const type = getEventType(req.body.type);

    // A blank event is a chore to fill in, so the type's starter checklist
    // is seeded unless the caller says otherwise. They are ordinary tasks
    // from that point on - editable, deletable, nothing special about them.
    const tasks =
      req.body.seedChecklist === false
        ? []
        : type.checklist.map((title) => ({ title, done: false }));

    const participants = (req.body.participants || []).map((person) => ({
      name: String(person.name || "").trim(),
      isMe: Boolean(person.isMe),
      note: String(person.note || "").trim(),
    }));

    // You are in your own event by default; every expense form starts from
    // this roster, and every one of them needs to know which person is you.
    if (!participants.some((person) => person.isMe)) {
      participants.unshift({ name: "Me", isMe: true, note: "" });
    }

    const event = await Event.create({
      ...buildPayload(req.body),
      userId: req.body.userId,
      type: type.key,
      participants,
      tasks,
      planItems: (req.body.planItems || []).map((item) => ({
        label: String(item.label || "").trim(),
        category: String(item.category || "").trim(),
        estimatedAmount: Math.max(Number(item.estimatedAmount || 0), 0),
        perHead: Boolean(item.perHead),
        note: String(item.note || "").trim(),
      })),
    });

    res.status(201).json({ success: true, data: decorateEvent(event, []) });
  } catch (err) {
    console.error("Event create error:", err);

    res.status(500).json({ success: false, message: err.message });
  }
};

// The list view needs each event's money and task progress, which lives in
// other collections. One grouped query for the splits beats one query per
// event - a dozen events would otherwise be a dozen round trips.
export const getEventsByUser = async (req, res) => {
  try {
    const events = await Event.find({ userId: req.params.userId }).sort({
      startDate: -1,
      createdAt: -1,
    });

    const ids = events.map((event) => event._id);

    const splits = await Split.find({ eventId: { $in: ids } });

    const byEvent = new Map();

    for (const split of splits) {
      const key = String(split.eventId);
      const plain = split.toObject();
      const { treated, myCost } = computeMyCost(plain.participants);

      const me = (plain.participants || []).find((p) => p.isMe);
      const iWasTreated = !plain.paidByMe && me?.recoverable === false;

      const owedToMe = plain.paidByMe
        ? (plain.participants || [])
            .filter((p) => !p.isMe && p.recoverable !== false)
            .reduce(
              (sum, p) =>
                sum +
                Math.max(
                  Number(p.share || 0) - Number(p.settledAmount || 0),
                  0,
                ),
              0,
            )
        : 0;

      const iOwe =
        plain.paidByMe || iWasTreated
          ? 0
          : Math.max(
              Number(me?.share || 0) - Number(me?.settledAmount || 0),
              0,
            );

      if (!byEvent.has(key)) byEvent.set(key, []);

      byEvent.get(key).push({
        ...plain,
        myShare: round2(Number(me?.share || 0)),
        myCost: plain.paidByMe
          ? myCost
          : iWasTreated
            ? 0
            : round2(Number(me?.share || 0)),
        treatedAmount: plain.paidByMe ? treated : 0,
        owedToMe: round2(owedToMe),
        iOwe: round2(iOwe),
      });
    }

    const counts = await EventAttachment.aggregate([
      { $match: { eventId: { $in: ids } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ]);

    const attachmentCounts = new Map(
      counts.map((row) => [String(row._id), row.count]),
    );

    // The card list does not need every expense row, only the roll-ups.
    const data = events.map((event) => {
      const decorated = decorateEvent(
        event,
        byEvent.get(String(event._id)) || [],
      );

      const { expenses, planItems, notes, links, tasks, ...summary } = decorated;

      return {
        ...summary,
        attachmentCount: attachmentCounts.get(String(event._id)) || 0,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("Event list error:", err);

    res.status(500).json({ success: false, message: err.message });
  }
};

export const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const [splits, attachments, accounts] = await Promise.all([
      loadSplits(event._id),
      // Never the full image here - see the note on the attachment model.
      EventAttachment.find({ eventId: event._id })
        .select("-dataUrl")
        .sort({ createdAt: -1 }),
      Account.find({ userId: event.userId }).sort({ order: 1, createdAt: 1 }),
    ]);

    res.json({
      success: true,
      data: {
        ...decorateEvent(event, splits),
        attachments,
        accounts,
      },
    });
  } catch (err) {
    console.error("Event read error:", err);

    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const merged = { ...event.toObject(), ...req.body };
    const error = validateEvent(merged);

    if (error) return res.status(400).json({ success: false, message: error });

    event.set(buildPayload(req.body));

    const saved = await event.save();

    res.json({
      success: true,
      data: decorateEvent(saved, await loadSplits(saved._id)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// DELETE
//
// Deleting an event that holds spending has to unwind that spending, or the
// balances keep a debit whose explanation has just been thrown away. The
// impact endpoint states the damage first so the confirm dialog can.
// =========================================================================

export const getEventDeleteImpact = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const splits = await loadSplits(event._id);
    const decorated = decorateEvent(event, splits);
    const attachments = await EventAttachment.countDocuments({
      eventId: event._id,
    });

    // What goes back into the accounts if this is removed: everything the
    // event's bills took out, less anything already repaid.
    const refundable = round2(
      splits.reduce((sum, split) => {
        if (!split.paidByMe || !split.accountId) return sum;

        const settledIn = (split.settlements || []).reduce(
          (inner, entry) =>
            entry.accountId ? inner + Number(entry.amount || 0) : inner,
          0,
        );

        return sum + Number(split.totalAmount || 0) - settledIn;
      }, 0),
    );

    res.json({
      success: true,
      data: {
        name: decorated.name,
        expenseCount: splits.length,
        actual: decorated.totals.actual,
        myCost: decorated.totals.myCost,
        owedToMe: decorated.totals.owedToMe,
        iOwe: decorated.totals.iOwe,
        refundable,
        taskCount: (event.tasks || []).length,
        noteCount: (event.notes || []).length,
        linkCount: (event.links || []).length,
        attachmentCount: attachments,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const splits = await Split.find({ eventId: event._id });

    // Reverse each bill the same way deleting it from the Splits page would.
    for (const split of splits) {
      if (split.paidByMe && split.accountId) {
        if (split.expenseId) {
          await Expense.findByIdAndDelete(split.expenseId);

          const { myCost } = computeMyCost(split.participants);

          await addBalance(split.accountId, myCost);
        }

        if (split.advanceAmount > 0) {
          await addBalance(split.accountId, split.advanceAmount);
        }
      }

      for (const settlement of split.settlements || []) {
        if (!settlement.accountId) continue;

        if (split.paidByMe) {
          await deductBalance(settlement.accountId, settlement.amount);
        } else {
          await addBalance(settlement.accountId, settlement.amount);
        }
      }

      await split.deleteOne();
    }

    await EventAttachment.deleteMany({ eventId: event._id });
    await event.deleteOne();

    res.json({
      success: true,
      message: "Event removed",
      expensesRemoved: splits.length,
    });
  } catch (err) {
    console.error("Event delete error:", err);

    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// SUB-COLLECTIONS
//
// Plan lines, tasks, notes, links and the roster are all "a list of small
// things on the event". Rather than twenty near-identical endpoints, each
// declares how to clean an incoming item and one set of handlers does the
// rest. Adding a new list to the event means adding one entry here.
// =========================================================================

const text = (value) => String(value ?? "").trim();

const COLLECTIONS = {
  planItems: {
    label: "Plan line",
    sanitise: (body, existing = {}) => ({
      label: body.label !== undefined ? text(body.label) : existing.label,
      category:
        body.category !== undefined ? text(body.category) : existing.category,
      estimatedAmount:
        body.estimatedAmount !== undefined
          ? Math.max(Number(body.estimatedAmount || 0), 0)
          : existing.estimatedAmount,
      perHead:
        body.perHead !== undefined ? Boolean(body.perHead) : existing.perHead,
      note: body.note !== undefined ? text(body.note) : existing.note,
    }),
    validate: (item) => (item.label ? null : "Give this line a label"),
  },

  tasks: {
    label: "Task",
    sanitise: (body, existing = {}) => {
      const done =
        body.done !== undefined ? Boolean(body.done) : existing.done;

      return {
        title: body.title !== undefined ? text(body.title) : existing.title,
        done,
        // Stamped here rather than by the client so "finished on" survives a
        // device with the wrong clock.
        doneAt: done ? existing.doneAt || new Date() : null,
        assignedTo:
          body.assignedTo !== undefined
            ? text(body.assignedTo)
            : existing.assignedTo,
        dueDate:
          body.dueDate !== undefined
            ? body.dueDate
              ? new Date(body.dueDate)
              : null
            : existing.dueDate,
      };
    },
    validate: (item) => (item.title ? null : "Give this task a title"),
  },

  notes: {
    label: "Note",
    sanitise: (body, existing = {}) => ({
      title: body.title !== undefined ? text(body.title) : existing.title,
      body: body.body !== undefined ? String(body.body) : existing.body,
      pinned:
        body.pinned !== undefined ? Boolean(body.pinned) : existing.pinned,
    }),
    validate: (item) =>
      item.title || item.body ? null : "A note needs a title or some text",
  },

  links: {
    label: "Link",
    sanitise: (body, existing = {}) => {
      let url = body.url !== undefined ? text(body.url) : existing.url;

      // A pasted "maps.google.com/..." is a link, not a relative path.
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;

      return {
        url,
        title: body.title !== undefined ? text(body.title) : existing.title,
        note: body.note !== undefined ? text(body.note) : existing.note,
      };
    },
    validate: (item) => {
      if (!item.url) return "Paste a link";

      try {
        // Rejects "not a url" before it is stored and rendered as an anchor.
        const parsed = new URL(item.url);

        if (!["http:", "https:"].includes(parsed.protocol)) {
          return "Only http and https links can be saved";
        }
      } catch {
        return "That does not look like a valid link";
      }

      return null;
    },
  },

  participants: {
    label: "Person",
    sanitise: (body, existing = {}) => ({
      name: body.name !== undefined ? text(body.name) : existing.name,
      isMe: body.isMe !== undefined ? Boolean(body.isMe) : existing.isMe,
      note: body.note !== undefined ? text(body.note) : existing.note,
    }),
    validate: (item) => (item.name ? null : "Give this person a name"),
  },
};

// participants has _id disabled on its subdocument schema, so it is addressed
// by position. Everything else is addressed by subdocument id.
const findIndex = (list, key, id) =>
  key === "participants"
    ? Number(id)
    : list.findIndex((item) => String(item._id) === String(id));

const loadForCollection = async (req, res) => {
  // Object.hasOwn, not a plain lookup: "__proto__" and "constructor" resolve
  // to inherited members that are perfectly truthy, so a bare
  // COLLECTIONS[name] check would wave them past this guard and then fail
  // somewhere far less obvious.
  const config = Object.hasOwn(COLLECTIONS, req.params.collection)
    ? COLLECTIONS[req.params.collection]
    : null;

  if (!config) {
    res.status(404).json({
      success: false,
      message: `Unknown list "${req.params.collection}"`,
    });

    return null;
  }

  const event = await Event.findById(req.params.id);

  if (!event) {
    res.status(404).json({ success: false, message: "Event not found" });

    return null;
  }

  return { event, config, key: req.params.collection };
};

const respond = async (res, event) => {
  const saved = await event.save();

  res.json({
    success: true,
    data: decorateEvent(saved, await loadSplits(saved._id)),
  });
};

export const addCollectionItem = async (req, res) => {
  try {
    const loaded = await loadForCollection(req, res);

    if (!loaded) return;

    const { event, config, key } = loaded;

    // Accepts one item or an array, so "add these five plan lines" is a
    // single request rather than five.
    const incoming = Array.isArray(req.body.items)
      ? req.body.items
      : [req.body];

    for (const raw of incoming) {
      const item = config.sanitise(raw);
      const error = config.validate(item);

      if (error) {
        return res.status(400).json({ success: false, message: error });
      }

      // Only one participant can be the user.
      if (key === "participants" && item.isMe) {
        event.participants.forEach((person) => {
          person.isMe = false;
        });
      }

      event[key].push(item);
    }

    await respond(res, event);
  } catch (err) {
    console.error("Event item add error:", err);

    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCollectionItem = async (req, res) => {
  try {
    const loaded = await loadForCollection(req, res);

    if (!loaded) return;

    const { event, config, key } = loaded;
    const index = findIndex(event[key], key, req.params.itemId);

    if (index < 0 || index >= event[key].length) {
      return res
        .status(404)
        .json({ success: false, message: `${config.label} not found` });
    }

    const existing = event[key][index].toObject
      ? event[key][index].toObject()
      : event[key][index];

    const item = config.sanitise(req.body, existing);
    const error = config.validate(item);

    if (error) return res.status(400).json({ success: false, message: error });

    if (key === "participants" && item.isMe) {
      event.participants.forEach((person) => {
        person.isMe = false;
      });
    }

    event[key][index].set
      ? event[key][index].set(item)
      : Object.assign(event[key][index], item);

    await respond(res, event);
  } catch (err) {
    console.error("Event item update error:", err);

    res.status(500).json({ success: false, message: err.message });
  }
};

export const removeCollectionItem = async (req, res) => {
  try {
    const loaded = await loadForCollection(req, res);

    if (!loaded) return;

    const { event, config, key } = loaded;
    const index = findIndex(event[key], key, req.params.itemId);

    if (index < 0 || index >= event[key].length) {
      return res
        .status(404)
        .json({ success: false, message: `${config.label} not found` });
    }

    // Removing someone who is on a bill would leave that bill's shares
    // pointing at a person the event no longer knows about.
    if (key === "participants") {
      const name = event.participants[index].name;

      const onABill = await Split.countDocuments({
        eventId: event._id,
        "participants.name": name,
      });

      if (onABill > 0) {
        return res.status(400).json({
          success: false,
          message: `${name} is on ${onABill} expense${onABill === 1 ? "" : "s"} in this event. Remove or edit those first.`,
        });
      }
    }

    event[key].splice(index, 1);

    await respond(res, event);
  } catch (err) {
    console.error("Event item remove error:", err);

    res.status(500).json({ success: false, message: err.message });
  }
};

// The type's suggested checklist, added on demand for an event created
// without it or switched to a different type later.
export const seedChecklist = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const type = getEventType(req.body.type || event.type);

    const existing = new Set(
      event.tasks.map((task) => task.title.toLowerCase()),
    );

    const added = type.checklist.filter(
      (title) => !existing.has(title.toLowerCase()),
    );

    for (const title of added) {
      event.tasks.push({ title, done: false });
    }

    const saved = await event.save();

    res.json({
      success: true,
      added: added.length,
      data: decorateEvent(saved, await loadSplits(saved._id)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Turns the plan into reality in one go: every line that has not been spent
// against yet becomes a draft the user can confirm. Kept server-side so the
// category matching is the same one the variance table uses.
export const getPlanGaps = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const splits = await loadSplits(event._id);
    const decorated = decorateEvent(event, splits);

    res.json({
      success: true,
      data: {
        categories: decorated.categories,
        // Heads that were spent on but never planned - the answer to "where
        // did the extra go".
        unplanned: decorated.categories.filter(
          (entry) => entry.estimated === 0 && entry.actual > 0,
        ),
        // Planned and still untouched.
        untouched: decorated.categories.filter(
          (entry) => entry.estimated > 0 && entry.actual === 0,
        ),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// ATTACHMENTS
// =========================================================================

const DATA_URL = /^data:([a-zA-Z0-9/+.-]+);base64,([A-Za-z0-9+/=]+)$/;

export const addAttachment = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const match = DATA_URL.exec(req.body.dataUrl || "");

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "That file could not be read",
      });
    }

    const [, mimeType, base64] = match;

    if (!ALLOWED_ATTACHMENT_TYPES.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: "Only images and PDFs can be attached",
      });
    }

    // Base64 carries a third more bytes than the file it encodes, so the
    // real size is what gets checked - not the string length.
    const size = Math.floor((base64.length * 3) / 4);

    if (size > MAX_ATTACHMENT_BYTES) {
      return res.status(400).json({
        success: false,
        message: `That file is ${(size / 1024 / 1024).toFixed(1)}MB. The limit is ${MAX_ATTACHMENT_BYTES / 1024 / 1024}MB.`,
      });
    }

    const attachment = await EventAttachment.create({
      userId: event.userId,
      eventId: event._id,
      kind: req.body.kind === "photo" ? "photo" : "bill",
      name: text(req.body.name),
      caption: text(req.body.caption),
      mimeType,
      size,
      dataUrl: req.body.dataUrl,
      thumbUrl: req.body.thumbUrl || "",
      splitId: req.body.splitId || null,
    });

    const { dataUrl, ...meta } = attachment.toObject();

    res.status(201).json({ success: true, data: meta });
  } catch (err) {
    console.error("Attachment error:", err);

    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAttachment = async (req, res) => {
  try {
    const attachment = await EventAttachment.findById(req.params.attachmentId);

    if (!attachment) {
      return res
        .status(404)
        .json({ success: false, message: "Attachment not found" });
    }

    res.json({ success: true, data: attachment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateAttachment = async (req, res) => {
  try {
    const attachment = await EventAttachment.findById(req.params.attachmentId);

    if (!attachment) {
      return res
        .status(404)
        .json({ success: false, message: "Attachment not found" });
    }

    if (req.body.caption !== undefined) {
      attachment.caption = text(req.body.caption);
    }

    if (req.body.kind !== undefined) {
      attachment.kind = req.body.kind === "photo" ? "photo" : "bill";
    }

    if (req.body.splitId !== undefined) {
      attachment.splitId = req.body.splitId || null;
    }

    await attachment.save();

    const { dataUrl, ...meta } = attachment.toObject();

    res.json({ success: true, data: meta });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteAttachment = async (req, res) => {
  try {
    const attachment = await EventAttachment.findByIdAndDelete(
      req.params.attachmentId,
    );

    if (!attachment) {
      return res
        .status(404)
        .json({ success: false, message: "Attachment not found" });
    }

    res.json({ success: true, message: "Attachment removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// OVERVIEW
// =========================================================================

export const getEventOverview = async (req, res) => {
  try {
    const userId = req.params.userId;

    const events = await Event.find({ userId });
    const ids = events.map((event) => event._id);
    const splits = await Split.find({ eventId: { $in: ids } });

    const spentByEvent = new Map();

    for (const split of splits) {
      const key = String(split.eventId);
      const { myCost } = computeMyCost(split.participants);

      const entry = spentByEvent.get(key) || { actual: 0, mine: 0 };

      entry.actual = round2(entry.actual + Number(split.totalAmount || 0));
      entry.mine = round2(entry.mine + (split.paidByMe ? myCost : 0));

      spentByEvent.set(key, entry);
    }

    const upcoming = events.filter(
      (event) =>
        event.status !== "cancelled" &&
        event.startDate &&
        daysBetween(new Date(), event.startDate) >= 0,
    );

    res.json({
      success: true,
      data: {
        count: events.length,
        upcomingCount: upcoming.length,
        // What the events still in front of you are budgeted to cost - the
        // number worth knowing before committing to another one.
        committed: round2(
          upcoming.reduce((sum, event) => {
            const decorated = decorateEvent(event, []);

            return sum + decorated.totals.budgetLine;
          }, 0),
        ),
        spentAllTime: round2(
          [...spentByEvent.values()].reduce(
            (sum, entry) => sum + entry.actual,
            0,
          ),
        ),
        mineAllTime: round2(
          [...spentByEvent.values()].reduce((sum, entry) => sum + entry.mine, 0),
        ),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
