// =========================================================================
// WHO OWES WHOM
//
// Money between you and another person arrives from two places and they have
// never been added up together:
//
//   Obligations  an explicit loan - "I lent Rahul 5,000"
//   Splits       a shared bill - either others owe you their share, or you
//                owe whoever fronted it
//
// Both are the same fact from a person's point of view, so this nets them
// per person. Four rules:
//
//   1. Net, but keep the parts. If Rahul owes you 500 from dinner and you
//      owe him 300 from a loan, the useful answer is "Rahul owes you 200" -
//      with both lines still visible, because netting without showing the
//      workings is how people stop trusting a balance.
//
//   2. A treat is not a debt. A split share marked non-recoverable was a
//      gift; it never becomes something owed.
//
//   3. Settled money is gone from both sides. Shares and loans each track
//      what has already changed hands, and only the remainder counts.
//
//   4. People are matched by trimmed, case-insensitive name. It is the only
//      key there is - participants are free text on purpose - so "rahul"
//      and "Rahul " are one person rather than two half-balances.
// =========================================================================

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const keyOf = (name) => String(name || "").trim().toLowerCase();

export const buildPeopleBalances = ({ obligations = [], splits = [] }) => {
  const people = new Map();

  const touch = (name) => {
    const key = keyOf(name);

    if (!key) return null;

    if (!people.has(key)) {
      people.set(key, {
        key,
        // The first spelling seen wins for display; the key does the matching.
        name: String(name).trim(),
        owesMe: 0,
        iOwe: 0,
        items: [],
      });
    }

    return people.get(key);
  };

  // ---------------------------------------------------------------- loans
  for (const item of obligations) {
    if (item.isClosed || !(Number(item.outstanding) > 0)) continue;

    const person = touch(item.counterparty);

    if (!person) continue;

    const amount = round2(item.outstanding);

    const lent = item.direction === "lent";

    if (lent) person.owesMe += amount;
    else person.iOwe += amount;

    person.items.push({
      source: "loan",
      id: String(item._id),
      direction: lent ? "owesMe" : "iOwe",
      label: item.note?.trim() || (lent ? "Lent out" : "Borrowed"),
      amount,
      date: item.promiseDate || item.agreedOn || item.createdAt || null,
      overdue: Boolean(
        item.promiseDate && new Date(item.promiseDate) < new Date(),
      ),
    });
  }

  // --------------------------------------------------------------- splits
  for (const split of splits) {
    const participants = split.participants || [];

    if (split.paidByMe) {
      // I fronted the bill, so everyone else owes me whatever is left of
      // their share - except anyone I chose to treat (rule 2).
      for (const participant of participants) {
        if (participant.isMe || participant.recoverable === false) continue;

        const outstanding = round2(
          Math.max(
            Number(participant.share || 0) -
              Number(participant.settledAmount || 0),
            0,
          ),
        );

        if (outstanding <= 0) continue;

        const person = touch(participant.name);

        if (!person) continue;

        person.owesMe += outstanding;

        person.items.push({
          source: "split",
          id: String(split._id),
          direction: "owesMe",
          label: split.description || "Split",
          amount: outstanding,
          date: split.date || split.createdAt || null,
          overdue: false,
        });
      }

      continue;
    }

    // Someone else paid. I owe them my share, unless they treated me.
    const me = participants.find((participant) => participant.isMe);

    if (!me || me.recoverable === false) continue;

    const outstanding = round2(
      Math.max(Number(me.share || 0) - Number(me.settledAmount || 0), 0),
    );

    if (outstanding <= 0) continue;

    // The payer is named on the split; without a name there is nobody to
    // owe, so it is left out rather than attributed to a blank person.
    const person = touch(split.payerName);

    if (!person) continue;

    person.iOwe += outstanding;

    person.items.push({
      source: "split",
      id: String(split._id),
      direction: "iOwe",
      label: split.description || "Split",
      amount: outstanding,
      date: split.date || split.createdAt || null,
      overdue: false,
    });
  }

  // ------------------------------------------------------------- the view
  const list = [...people.values()]
    .map((person) => {
      const owesMe = round2(person.owesMe);
      const iOwe = round2(person.iOwe);
      const net = round2(owesMe - iOwe);

      return {
        ...person,
        owesMe,
        iOwe,
        net,
        // Rule 1: netting is shown, and "both ways" says the parts matter.
        direction: net > 0 ? "owesMe" : net < 0 ? "iOwe" : "settled",
        bothWays: owesMe > 0 && iOwe > 0,
        items: person.items.sort(
          (a, b) => new Date(b.date || 0) - new Date(a.date || 0),
        ),
        overdue: person.items.some((item) => item.overdue),
      };
    })
    .filter((person) => person.owesMe > 0 || person.iOwe > 0)
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  return {
    people: list,
    totals: {
      owedToMe: round2(
        list.reduce((sum, person) => sum + person.owesMe, 0),
      ),
      iOwe: round2(list.reduce((sum, person) => sum + person.iOwe, 0)),
      // What would remain if everyone settled up at once.
      net: round2(
        list.reduce((sum, person) => sum + person.net, 0),
      ),
      people: list.length,
      fromSplits: round2(
        list.reduce(
          (sum, person) =>
            sum +
            person.items
              .filter((item) => item.source === "split")
              .reduce((inner, item) => inner + item.amount, 0),
          0,
        ),
      ),
      fromLoans: round2(
        list.reduce(
          (sum, person) =>
            sum +
            person.items
              .filter((item) => item.source === "loan")
              .reduce((inner, item) => inner + item.amount, 0),
          0,
        ),
      ),
    },
  };
};
