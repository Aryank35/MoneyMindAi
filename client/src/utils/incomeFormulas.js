import { evaluateFormula, resolveFields } from "./formula.js";

export { evaluateFormula };

// Mirrors computeIncomeTotals on the server.
export const computeIncomeTotals = (source, rawFields = {}) => {
  if (!source) {
    return { fields: {}, creditedAmount: 0, budgetableAmount: 0, epfAmount: 0 };
  }

  const values = resolveFields(source, rawFields);

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

// Fits a spend into a calendar cell only ~30px wide on a phone: "450",
// "1.2k", "17k", "1.5L". Carries no currency glyph - the surrounding UI
// already establishes rupees, and the symbol costs width the cell lacks.
export const compactAmount = (value) => {
  const amount = Math.round(Math.abs(Number(value || 0)));

  if (amount < 1000) return String(amount);

  // One decimal only below 10 units, where it carries real information -
  // "1.2k" is worth the character, "17.4k" is not.
  const scale = (divisor, suffix) => {
    const scaled = amount / divisor;

    const text =
      scaled < 10 ? scaled.toFixed(1).replace(/\.0$/, "") : String(Math.round(scaled));

    return `${text}${suffix}`;
  };

  if (amount < 100000) return scale(1000, "k");

  // Indian convention switches to crore at a hundred lakh, so "1.2Cr" rather
  // than the "123L" a lakh-only scale would give.
  if (amount < 10000000) return scale(100000, "L");

  return scale(10000000, "Cr");
};

// Where a figure sits in a three-across tile on a 320px phone, the grouped
// form fits up to about ten lakh and is ellipsised past it - measured in a
// 71px box, where "₹9,99,999" renders at 65px and "₹12,34,567" at 74px.
// So the full amount is kept while it survives, and only beyond that does the
// compact form take over, a clipped "₹12,34,5..." being the worse of the two.
const GROUPED_FITS_BELOW = 1000000;

export const tileAmount = (value) => {
  const amount = Number(value || 0);

  return Math.abs(amount) < GROUPED_FITS_BELOW
    ? `₹${amount.toLocaleString("en-IN")}`
    : `₹${compactAmount(amount)}`;
};

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
