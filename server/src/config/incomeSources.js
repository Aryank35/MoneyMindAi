// =========================================================================
// INCOME SOURCE REGISTRY
// =========================================================================
//
// Single source of truth for every kind of money coming in. Each entry
// declares its own fields, and formulas for the three numbers the rest of
// the app cares about:
//
//   creditFormula  -> what actually lands in the bank account
//   budgetFormula  -> what the budget is allowed to plan against
//   epfFormula     -> what goes to the EPF account instead of the bank
//
// TO ADD A NEW INCOME SOURCE: add one object to INCOME_SOURCES below.
// Nothing else needs to change - the API exposes this list at
// GET /api/income/sources and the client builds its forms from it.
//
// Formulas are plain data (see evaluateFormula), never executable code, so
// they survive the trip to the browser and can be evaluated on both sides.
// =========================================================================

// The formula engine lives in ./formula.js and is shared with the investment
// registry - see that file for the operations available here.
import { evaluateFormula, resolveFields } from "./formula.js";

export { evaluateFormula };

// Resolves every derived field for a source, then the three headline
// numbers. Derived values are folded into the value bag as they are
// computed, so one derived field can build on another.
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

const amountOnly = (key, label, icon, extras = {}) => ({
  key,
  label,
  icon,
  fields: [
    {
      key: "amount",
      label: "Amount Received",
      type: "number",
      required: true,
    },
  ],
  derived: [],
  creditFormula: "amount",
  budgetFormula: "amount",
  includeInBudgetDefault: true,
  canToggleBudget: true,
  ...extras,
});

export const INCOME_SOURCES = [
  {
    key: "salary",
    label: "Salary",
    icon: "💼",
    description: "Monthly pay from an employer.",
    payerLabel: "Employer",
    fields: [
      {
        key: "inHandSalary",
        label: "In-hand Salary",
        type: "number",
        required: true,
        help: "What actually reaches your bank account.",
      },
      {
        key: "deductions",
        label: "Deductions",
        type: "number",
        help: "Tax, professional tax, insurance - anything withheld that is not EPF.",
      },
      {
        key: "epf",
        label: "EPF Contribution",
        type: "number",
        help: "Goes to your EPF account, not your bank. Never counted as budgetable income.",
      },
    ],
    derived: [
      {
        key: "grossSalary",
        label: "Gross (estimated)",
        formula: {
          op: "sum",
          args: ["inHandSalary", "deductions", "epf"],
        },
      },
    ],
    creditFormula: "inHandSalary",
    budgetFormula: "inHandSalary",
    epfFormula: "epf",
    includeInBudgetDefault: true,
    // Salary is the backbone of the budget - not optional.
    canToggleBudget: false,
    isRecurringDefault: true,
  },

  {
    key: "business",
    label: "Business",
    icon: "🏪",
    description:
      "Trading or business income. Profit is what reaches the account; you choose whether the budget may plan on it.",
    payerLabel: "Business Name",
    fields: [
      {
        key: "revenue",
        label: "Revenue / Turnover",
        type: "number",
        required: true,
      },
      {
        key: "expenditure",
        label: "Expenditure",
        type: "number",
        help: "Cost of running the business for this period.",
      },
      {
        key: "tax",
        label: "Tax",
        type: "number",
      },
    ],
    derived: [
      {
        key: "netProfit",
        label: "Net Profit",
        tone: "positive",
        formula: {
          op: "max0",
          args: [{ op: "subtract", args: ["revenue", "expenditure", "tax"] }],
        },
      },
      {
        key: "loss",
        label: "Loss",
        tone: "negative",
        formula: {
          op: "max0",
          args: [
            {
              op: "subtract",
              args: [{ op: "sum", args: ["expenditure", "tax"] }, "revenue"],
            },
          ],
        },
      },
    ],
    creditFormula: "netProfit",
    budgetFormula: "netProfit",
    // Business income swings month to month, so budgeting against it is
    // opt-in rather than assumed.
    includeInBudgetDefault: false,
    canToggleBudget: true,
    isRecurringDefault: false,
  },

  {
    key: "freelance",
    label: "Freelancing",
    icon: "💻",
    description: "Project or contract work.",
    payerLabel: "Client",
    fields: [
      {
        key: "grossAmount",
        label: "Gross Amount",
        type: "number",
        required: true,
      },
      {
        key: "tds",
        label: "TDS / Tax Withheld",
        type: "number",
      },
    ],
    derived: [
      {
        key: "netAmount",
        label: "Net Received",
        tone: "positive",
        formula: {
          op: "max0",
          args: [{ op: "subtract", args: ["grossAmount", "tds"] }],
        },
      },
    ],
    creditFormula: "netAmount",
    budgetFormula: "netAmount",
    includeInBudgetDefault: true,
    canToggleBudget: true,
    isRecurringDefault: false,
  },

  {
    key: "rental",
    label: "Rental",
    icon: "🏠",
    description: "Rent from property.",
    payerLabel: "Tenant / Property",
    fields: [
      { key: "rentReceived", label: "Rent Received", type: "number", required: true },
      {
        key: "maintenance",
        label: "Maintenance / Upkeep",
        type: "number",
      },
    ],
    derived: [
      {
        key: "netRent",
        label: "Net Rent",
        tone: "positive",
        formula: {
          op: "max0",
          args: [{ op: "subtract", args: ["rentReceived", "maintenance"] }],
        },
      },
    ],
    creditFormula: "netRent",
    budgetFormula: "netRent",
    includeInBudgetDefault: true,
    canToggleBudget: true,
    isRecurringDefault: true,
  },

  amountOnly("interest", "Interest", "🏦", {
    description: "Bank or deposit interest.",
    isRecurringDefault: true,
  }),

  amountOnly("dividend", "Dividend", "📈", {
    description: "Payouts from shares or funds.",
  }),

  amountOnly("investmentReturn", "Investment Return", "💹", {
    description: "Redemptions, capital gains, maturity proceeds.",
  }),

  amountOnly("bonus", "Bonus", "🎯", {
    description: "One-off performance or festive pay.",
    payerLabel: "Employer",
    includeInBudgetDefault: false,
  }),

  amountOnly("gift", "Gift", "🎁", {
    description: "Money received as a gift.",
    includeInBudgetDefault: false,
  }),

  amountOnly("refund", "Refund", "↩️", {
    description: "Reimbursements and returned money.",
    includeInBudgetDefault: false,
  }),

  amountOnly("other", "Other", "💰", {
    description: "Anything else credited to an account.",
  }),
];

export const getIncomeSource = (key) =>
  INCOME_SOURCES.find((source) => source.key === key) || null;

export const isValidSourceKey = (key) => Boolean(getIncomeSource(key));
