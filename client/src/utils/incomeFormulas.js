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
