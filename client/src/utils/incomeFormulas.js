// Client-side twin of the formula evaluator in
// server/src/config/incomeSources.js. It exists only so the form can show a
// live preview while typing - the server always recomputes on save and its
// answer wins. This file is generic: adding a new income source never
// requires touching it.

const toNumber = (value) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

export const evaluateFormula = (formula, values = {}) => {
  if (formula === null || formula === undefined) return 0;

  if (typeof formula === "number") return formula;

  if (typeof formula === "string") return toNumber(values[formula]);

  const args = (formula.args || []).map((arg) => evaluateFormula(arg, values));

  switch (formula.op) {
    case "sum":
      return args.reduce((total, value) => total + value, 0);

    case "subtract":
      return args.slice(1).reduce((total, value) => total - value, args[0] || 0);

    case "multiply":
      return args.reduce((total, value) => total * value, 1);

    case "max0":
      return Math.max(args[0] || 0, 0);

    default:
      return 0;
  }
};

// Mirrors computeIncomeTotals on the server: resolve derived fields in order,
// then the three headline numbers.
export const computeIncomeTotals = (source, rawFields = {}) => {
  if (!source) {
    return { fields: {}, creditedAmount: 0, budgetableAmount: 0, epfAmount: 0 };
  }

  const values = {};

  for (const field of source.fields || []) {
    values[field.key] = toNumber(rawFields[field.key]);
  }

  for (const derived of source.derived || []) {
    values[derived.key] = evaluateFormula(derived.formula, values);
  }

  return {
    fields: values,
    creditedAmount: Math.max(evaluateFormula(source.creditFormula, values), 0),
    budgetableAmount: Math.max(evaluateFormula(source.budgetFormula, values), 0),
    epfAmount: source.epfFormula
      ? Math.max(evaluateFormula(source.epfFormula, values), 0)
      : 0,
  };
};

export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
