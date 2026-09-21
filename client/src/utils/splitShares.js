// =========================================================================
// SHARE PREVIEW
//
// Mirrors computeShares in the split controller so a form can show each
// person's amount as it is typed. The server recomputes on save and its
// answer is the one that is stored - this exists only so the user is not
// typing blind.
//
// Shared by the Splits page and the event expense form. Two copies of this
// would drift, and a preview that disagrees with what gets saved is worse
// than no preview.
// =========================================================================

export const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

export const previewShares = (total, method, participants) => {
  const amount = Number(total || 0);
  const people = participants || [];

  if (people.length === 0) return [];

  let shares;

  if (method === "exact") {
    shares = people.map((p) => round2(p.shareInput));
  } else if (method === "percentage") {
    shares = people.map((p) =>
      round2((amount * Number(p.shareInput || 0)) / 100),
    );
  } else if (method === "shares") {
    const weights = people.map((p) => Math.max(Number(p.shareInput || 0), 0));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    shares = totalWeight
      ? weights.map((w) => round2((amount * w) / totalWeight))
      : people.map(() => 0);
  } else {
    const even = round2(amount / people.length);

    shares = people.map(() => even);
  }

  // The bill has to be fully accounted for: an equal three-way split of
  // 1,000 is 333.33 each, and the stray paisa goes to the first person
  // rather than vanishing. The server does exactly the same.
  if (method !== "exact") {
    const drift = round2(amount - shares.reduce((sum, s) => sum + s, 0));

    if (drift !== 0) shares[0] = round2(shares[0] + drift);
  }

  return shares.map((value) => Math.max(value, 0));
};

// What a bill costs the user, as opposed to what it costs the group.
//
//   my share            what I consumed
//   + treats            shares I am covering with no expectation of return
//   = my cost           the figure booked as an expense
//   bill - my cost      advanced, and owed back
//
// Kept beside the share maths because the two are always read together.
export const summariseSplit = (shares, participants, total, paidByMe) => {
  const people = participants || [];

  const myIndex = people.findIndex((person) => person.isMe);
  const myShare = myIndex >= 0 ? Number(shares[myIndex] || 0) : 0;

  const treated = people.reduce(
    (sum, person, index) =>
      !person.isMe && person.recoverable === false
        ? sum + Number(shares[index] || 0)
        : sum,
    0,
  );

  const iWasTreated = !paidByMe && myIndex >= 0 && people[myIndex].recoverable === false;

  const myCost = paidByMe ? round2(myShare + treated) : iWasTreated ? 0 : myShare;

  const owedToMe = paidByMe
    ? people.reduce(
        (sum, person, index) =>
          !person.isMe && person.recoverable !== false
            ? sum + Number(shares[index] || 0)
            : sum,
        0,
      )
    : 0;

  return {
    myShare: round2(myShare),
    treated: round2(treated),
    myCost: round2(myCost),
    advance: paidByMe ? round2(Number(total || 0) - myCost) : 0,
    owedToMe: round2(owedToMe),
    iOwe: paidByMe || iWasTreated ? 0 : round2(myShare),
    iWasTreated,
  };
};
