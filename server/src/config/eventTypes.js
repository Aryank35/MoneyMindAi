// =========================================================================
// EVENT TYPE REGISTRY
//
// Same idea as the income-source and investment-type registries: the kinds
// of thing a person organises are data, not code. Each type declares the
// budget heads it is usually spent under and a starter checklist, so a new
// event arrives already useful instead of empty.
//
// TO ADD A NEW EVENT TYPE: add one object below. The API exposes the list
// at GET /api/events/types and the client builds its picker, its category
// chips and its seeded checklist from it - nothing else needs touching.
//
//   key         stable identifier stored on the event
//   label       what the user sees
//   icon        emoji, so no icon font has to ship for it
//   blurb       one line shown under the label in the picker
//   dated       false for open-ended things (a house move, a renovation)
//   categories  budget heads; the first is the default for a new expense
//   checklist   starter tasks, seeded on create unless the user opts out
// =========================================================================

export const EVENT_TYPES = [
  {
    key: "trip",
    label: "Trip",
    icon: "🧳",
    blurb: "A holiday, a road trip, a weekend away",
    dated: true,
    categories: [
      "Travel",
      "Stay",
      "Food",
      "Activities",
      "Local transport",
      "Shopping",
      "Tips & misc",
    ],
    checklist: [
      "Confirm who is coming",
      "Book travel tickets",
      "Book the stay",
      "Plan the day-by-day route",
      "Carry cash / check UPI limits",
      "Pack and share the packing list",
    ],
  },
  {
    key: "picnic",
    label: "Picnic / day out",
    icon: "🧺",
    blurb: "A single day - park, beach, farmhouse",
    dated: true,
    categories: [
      "Food & drinks",
      "Transport",
      "Entry tickets",
      "Games & gear",
      "Misc",
    ],
    checklist: [
      "Fix the spot and the time",
      "Confirm headcount",
      "Decide the food - cook or order",
      "Arrange transport",
      "Pack mats, speaker, games",
    ],
  },
  {
    key: "party",
    label: "Party",
    icon: "🎉",
    blurb: "Birthday, farewell, house party",
    dated: true,
    categories: [
      "Food",
      "Drinks",
      "Cake",
      "Decoration",
      "Venue",
      "Gifts",
      "Music & lights",
    ],
    checklist: [
      "Send invites and confirm headcount",
      "Book the venue",
      "Order the cake",
      "Sort food and drinks",
      "Buy decorations",
      "Make the playlist",
    ],
  },
  {
    key: "wedding",
    label: "Wedding / big function",
    icon: "💍",
    blurb: "Multi-day, many heads, many vendors",
    dated: true,
    categories: [
      "Venue",
      "Catering",
      "Decor",
      "Clothing",
      "Jewellery",
      "Photography",
      "Invitations",
      "Travel & stay",
      "Gifts & shagun",
      "Priest & rituals",
      "Misc",
    ],
    checklist: [
      "Lock the dates",
      "Book the venue",
      "Finalise the caterer",
      "Book photographer",
      "Send invitations",
      "Arrange guest travel and stay",
      "Confirm vendor advances paid",
    ],
  },
  {
    key: "festival",
    label: "Festival",
    icon: "🪔",
    blurb: "Diwali, Puja, Eid, Christmas",
    dated: true,
    categories: [
      "Gifts",
      "Sweets & food",
      "Clothing",
      "Decoration",
      "Pooja items",
      "Travel home",
      "Donations",
    ],
    checklist: [
      "List who gets gifts",
      "Book travel home early",
      "Order sweets",
      "Buy clothes",
      "Plan the decoration",
    ],
  },
  {
    key: "gettogether",
    label: "Get-together",
    icon: "🍽️",
    blurb: "Dinner out, reunion, team lunch",
    dated: true,
    categories: ["Food", "Drinks", "Transport", "Venue", "Misc"],
    checklist: [
      "Pick the date everyone can do",
      "Book the table",
      "Confirm headcount",
      "Agree how the bill gets split",
    ],
  },
  {
    key: "project",
    label: "Project / renovation",
    icon: "🛠️",
    blurb: "Home work, a purchase project, a move",
    dated: false,
    categories: [
      "Materials",
      "Labour",
      "Transport",
      "Permits & fees",
      "Tools",
      "Contingency",
    ],
    checklist: [
      "Get at least two quotes",
      "Agree the scope in writing",
      "Set the payment milestones",
      "Keep every bill",
    ],
  },
  {
    key: "other",
    label: "Something else",
    icon: "📌",
    blurb: "Anything you want to plan and track",
    dated: true,
    categories: ["General", "Travel", "Food", "Misc"],
    checklist: [],
  },
];

export const getEventType = (key) =>
  EVENT_TYPES.find((type) => type.key === key) ||
  EVENT_TYPES[EVENT_TYPES.length - 1];

export const EVENT_TYPE_KEYS = EVENT_TYPES.map((type) => type.key);

// Statuses are stored rather than derived, because "we cancelled it" and
// "we finished early" are facts the dates cannot tell you. The dates are
// still used to *suggest* a status on the client.
export const EVENT_STATUSES = [
  { key: "planning", label: "Planning", tone: "indigo" },
  { key: "ongoing", label: "Happening now", tone: "emerald" },
  { key: "done", label: "Done", tone: "slate" },
  { key: "cancelled", label: "Cancelled", tone: "red" },
];

export const EVENT_STATUS_KEYS = EVENT_STATUSES.map((status) => status.key);
