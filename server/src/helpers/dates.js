// Shared calendar helpers. Everything works in local calendar terms - the
// day a bill falls on is a local date, not an instant in UTC.

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

// new Date(2026, 1, 31) silently rolls into March. Any day-of-month chosen
// by a user (a bill on the 31st, an FD maturing on the 30th) has to clamp to
// the real length of the target month instead.
export const clampToMonth = (year, month, day) => {
  const lastDay = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(Math.max(day, 1), lastDay));
};

export const startOfDay = (value) => {
  const date = new Date(value);

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const addDays = (value, days) => {
  const date = new Date(value);

  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
};

export const daysBetween = (from, to) =>
  Math.round((startOfDay(to) - startOfDay(from)) / MS_PER_DAY);

export const monthsBetween = (from, to) => {
  const a = new Date(from);
  const b = new Date(to);

  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
};
