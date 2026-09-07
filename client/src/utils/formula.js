// =========================================================================
// DECLARATIVE FORMULA ENGINE
//
// Client-side twin of server/src/config/formula.js. It exists so forms can
// preview figures while the user types; the server always recomputes on save
// and its answer is what gets stored. Generic by design - adding a new income
// source or investment type never requires touching this file.
//
// A formula is one of:
//   number   -> a literal
//   string   -> the name of a field in the values bag
//   object   -> { op, args: [...formulas] }
// =========================================================================

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

    // Division by zero yields 0 rather than Infinity - every caller here is
    // producing a figure for display, and "∞%" helps nobody.
    case "divide": {
      const [numerator, denominator] = args;

      return denominator ? numerator / denominator : 0;
    }

    case "power":
      return Math.pow(args[0] || 0, args[1] || 0);

    // principal * (1 + rate/100) ^ periods - compound growth, used by every
    // fixed-return instrument.
    case "compound": {
      const [principal, ratePercent, periods] = args;

      return principal * Math.pow(1 + (ratePercent || 0) / 100, periods || 0);
    }

    // principal * (1 + rate*periods/100) - simple interest.
    case "simpleInterest": {
      const [principal, ratePercent, periods] = args;

      return principal * (1 + ((ratePercent || 0) * (periods || 0)) / 100);
    }

    // Clamps at zero - a "profit" of -5000 is a loss, not negative profit.
    case "max0":
      return Math.max(args[0] || 0, 0);

    // Whole units. A recurring deposit is paid in discrete instalments, so
    // the count has to be floored - there is no such thing as 5.99 of them.
    case "floor":
      return Math.floor(args[0] || 0);

    case "ceil":
      return Math.ceil(args[0] || 0);

    case "min":
      return Math.min(...args);

    case "max":
      return Math.max(...args);

    default:
      return 0;
  }
};

// Resolves a registry entry's derived fields in declaration order, folding
// each result back into the bag so later formulas can build on earlier ones.
export const resolveFields = (definition, rawFields = {}, context = {}) => {
  const values = { ...context };

  for (const field of definition?.fields || []) {
    values[field.key] = toNumber(rawFields[field.key]);
  }

  for (const derived of definition?.derived || []) {
    values[derived.key] = evaluateFormula(derived.formula, values);
  }

  return values;
};

export { toNumber };
