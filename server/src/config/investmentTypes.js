// =========================================================================
// INVESTMENT TYPE REGISTRY
//
// Same shape as the income-source registry: each type declares its own
// fields and the formulas that produce the two numbers a portfolio needs.
//
//   investedFormula -> total capital put in
//   currentFormula  -> what the holding is worth today
//
// TO ADD A NEW INVESTMENT TYPE: add one object to INVESTMENT_TYPES below.
// The API exposes the list at GET /api/investments/types and the client
// builds its forms, its "update value" action and its charts from it.
//
// Formulas can reference two injected values alongside their own fields:
//   _yearsHeld   fractional years since the purchase date
//   _monthsHeld  fractional months since the purchase date
// which is how fixed-return instruments grow without storing a snapshot.
// =========================================================================

import { evaluateFormula, resolveFields } from "./formula.js";

export const INVESTMENT_CATEGORIES = {
  market: { key: "market", label: "Market-linked", risk: "High" },
  fixed: { key: "fixed", label: "Fixed income", risk: "Low" },
  physical: { key: "physical", label: "Physical", risk: "Medium" },
  retirement: { key: "retirement", label: "Retirement", risk: "Low" },
};

// units x price, on both sides. Covers most market-linked holdings.
const unitPriced = (key, label, icon, opts = {}) => ({
  key,
  label,
  icon,
  category: "market",
  quantityLabel: opts.quantityLabel || "Units",
  fields: [
    {
      key: "quantity",
      label: opts.quantityLabel || "Units",
      type: "number",
      required: true,
      step: "any",
    },
    {
      key: "avgBuyPrice",
      label: opts.buyLabel || "Average Buy Price",
      type: "number",
      required: true,
      step: "any",
    },
    {
      key: "currentPrice",
      label: opts.currentLabel || "Current Price",
      type: "number",
      required: true,
      step: "any",
      help: "Update this as the price moves.",
    },
  ],
  derived: [
    {
      key: "invested",
      label: "Invested",
      formula: { op: "multiply", args: ["quantity", "avgBuyPrice"] },
    },
    {
      key: "currentValue",
      label: "Current Value",
      tone: "positive",
      formula: { op: "multiply", args: ["quantity", "currentPrice"] },
    },
  ],
  investedFormula: "invested",
  currentFormula: "currentValue",
  // The single field the "Update Value" action edits when prices move.
  valueField: "currentPrice",
  ...opts.overrides,
});

export const INVESTMENT_TYPES = [
  unitPriced("mutualFund", "Mutual Fund", "📊", {
    quantityLabel: "Units",
    buyLabel: "Average NAV",
    currentLabel: "Current NAV",
    overrides: {
      description: "SIP or lump-sum fund holdings.",
      platformLabel: "Fund House / Platform",
      supportsSip: true,
    },
  }),

  unitPriced("stocks", "Stocks", "📈", {
    quantityLabel: "Shares",
    buyLabel: "Average Buy Price",
    currentLabel: "Current Market Price",
    overrides: {
      description: "Listed equity shares.",
      platformLabel: "Broker",
    },
  }),

  unitPriced("etf", "ETF", "🧺", {
    quantityLabel: "Units",
    buyLabel: "Average Buy Price",
    currentLabel: "Current Price",
    overrides: {
      description: "Exchange traded funds.",
      platformLabel: "Broker",
    },
  }),

  unitPriced("crypto", "Crypto", "🪙", {
    quantityLabel: "Coins / Tokens",
    buyLabel: "Average Buy Price",
    currentLabel: "Current Price",
    overrides: {
      description: "Digital assets. Expect wide swings.",
      platformLabel: "Exchange",
      risk: "Very High",
    },
  }),

  {
    key: "fixedDeposit",
    label: "Fixed Deposit",
    icon: "🔒",
    category: "fixed",
    description: "Compounds at a fixed rate until maturity.",
    platformLabel: "Bank",
    fields: [
      {
        key: "principal",
        label: "Principal",
        type: "number",
        required: true,
      },
      {
        key: "interestRate",
        label: "Interest Rate (% p.a.)",
        type: "number",
        required: true,
        step: "any",
      },
      {
        key: "tenureYears",
        label: "Tenure (years)",
        type: "number",
        required: true,
        step: "any",
      },
    ],
    derived: [
      {
        key: "invested",
        label: "Invested",
        formula: "principal",
      },
      {
        // Growth stops at maturity - past the tenure it holds its value
        // rather than compounding forever.
        key: "currentValue",
        label: "Value Today",
        tone: "positive",
        formula: {
          op: "compound",
          args: [
            "principal",
            "interestRate",
            { op: "min", args: ["_yearsHeld", "tenureYears"] },
          ],
        },
      },
      {
        key: "maturityValue",
        label: "At Maturity",
        formula: {
          op: "compound",
          args: ["principal", "interestRate", "tenureYears"],
        },
      },
    ],
    investedFormula: "invested",
    currentFormula: "currentValue",
    valueField: "interestRate",
    hasMaturity: true,
  },

  {
    key: "recurringDeposit",
    label: "Recurring Deposit",
    icon: "🗓️",
    category: "fixed",
    description: "A fixed amount deposited every month.",
    platformLabel: "Bank",
    fields: [
      {
        key: "monthlyAmount",
        label: "Monthly Deposit",
        type: "number",
        required: true,
      },
      {
        key: "months",
        label: "Tenure (months)",
        type: "number",
        required: true,
      },
      {
        key: "interestRate",
        label: "Interest Rate (% p.a.)",
        type: "number",
        required: true,
        step: "any",
      },
    ],
    derived: [
      {
        // An RD is paid in whole instalments, and the first one goes in when
        // the account is opened - so a brand-new RD already holds one
        // instalment, and after n completed months it holds n + 1. Capped at
        // the tenure. Counted off the calendar rather than fractional
        // months: multiplying by days/30.44 produced part-instalments
        // (Rs 29,997 instead of Rs 30,000), under-reported by a whole
        // instalment throughout, and drifted enough over a year to miscount
        // at the anniversary.
        key: "instalmentsPaid",
        label: "Instalments Paid",
        formula: {
          op: "min",
          args: [
            { op: "sum", args: ["_calendarMonthsHeld", 1] },
            "months",
          ],
        },
      },
      {
        key: "invested",
        label: "Deposited So Far",
        formula: { op: "multiply", args: ["monthlyAmount", "instalmentsPaid"] },
      },
      {
        // Interest on an RD accrues per instalment: the kth of n sits for
        // (n - k) months, so the instalments collectively earn
        // n(n-1)/2 month-deposits of interest at the monthly rate (r/1200).
        // This is the standard RD formula. It replaces a "half the term on
        // average" shortcut that ran about Rs 175 high over a year.
        key: "interestEarned",
        label: "Interest So Far",
        formula: {
          op: "multiply",
          args: [
            "monthlyAmount",
            { op: "divide", args: ["interestRate", 1200] },
            {
              op: "divide",
              args: [
                {
                  op: "multiply",
                  args: [
                    "instalmentsPaid",
                    { op: "subtract", args: ["instalmentsPaid", 1] },
                  ],
                },
                2,
              ],
            },
          ],
        },
      },
      {
        key: "currentValue",
        label: "Value Today",
        tone: "positive",
        formula: { op: "sum", args: ["invested", "interestEarned"] },
      },
      {
        // What it comes to if every instalment is paid.
        key: "maturityValue",
        label: "At Maturity",
        formula: {
          op: "sum",
          args: [
            { op: "multiply", args: ["monthlyAmount", "months"] },
            {
              op: "multiply",
              args: [
                "monthlyAmount",
                { op: "divide", args: ["interestRate", 1200] },
                {
                  op: "divide",
                  args: [
                    {
                      op: "multiply",
                      args: ["months", { op: "subtract", args: ["months", 1] }],
                    },
                    2,
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
    investedFormula: "invested",
    currentFormula: "currentValue",
    valueField: "interestRate",
    hasMaturity: true,
  },

  {
    key: "ppf",
    label: "PPF",
    icon: "🏛️",
    category: "retirement",
    description: "Public Provident Fund.",
    platformLabel: "Bank / Post Office",
    fields: [
      {
        key: "totalContributed",
        label: "Total Contributed",
        type: "number",
        required: true,
      },
      {
        key: "currentBalance",
        label: "Current Balance",
        type: "number",
        required: true,
        help: "As shown in your passbook.",
      },
    ],
    derived: [],
    investedFormula: "totalContributed",
    currentFormula: "currentBalance",
    valueField: "currentBalance",
  },

  {
    key: "nps",
    label: "NPS",
    icon: "🛡️",
    category: "retirement",
    description: "National Pension System.",
    platformLabel: "PFM",
    fields: [
      {
        key: "totalContributed",
        label: "Total Contributed",
        type: "number",
        required: true,
      },
      {
        key: "currentBalance",
        label: "Current Value",
        type: "number",
        required: true,
      },
    ],
    derived: [],
    investedFormula: "totalContributed",
    currentFormula: "currentBalance",
    valueField: "currentBalance",
  },

  {
    key: "gold",
    label: "Gold",
    icon: "🥇",
    category: "physical",
    description: "Physical gold, digital gold or sovereign bonds.",
    platformLabel: "Held With",
    fields: [
      {
        key: "grams",
        label: "Quantity (grams)",
        type: "number",
        required: true,
        step: "any",
      },
      {
        key: "buyRate",
        label: "Buy Rate (per gram)",
        type: "number",
        required: true,
        step: "any",
      },
      {
        key: "currentRate",
        label: "Current Rate (per gram)",
        type: "number",
        required: true,
        step: "any",
        help: "Update this as the gold rate moves.",
      },
    ],
    derived: [
      {
        key: "invested",
        label: "Invested",
        formula: { op: "multiply", args: ["grams", "buyRate"] },
      },
      {
        key: "currentValue",
        label: "Current Value",
        tone: "positive",
        formula: { op: "multiply", args: ["grams", "currentRate"] },
      },
    ],
    investedFormula: "invested",
    currentFormula: "currentValue",
    valueField: "currentRate",
  },

  {
    key: "realEstate",
    label: "Real Estate",
    icon: "🏘️",
    category: "physical",
    description: "Property held as an investment.",
    platformLabel: "Location",
    fields: [
      {
        key: "purchasePrice",
        label: "Purchase Price",
        type: "number",
        required: true,
      },
      {
        key: "currentValue",
        label: "Estimated Value Today",
        type: "number",
        required: true,
      },
    ],
    derived: [],
    investedFormula: "purchasePrice",
    currentFormula: "currentValue",
    valueField: "currentValue",
  },

  {
    key: "other",
    label: "Other",
    icon: "💼",
    category: "market",
    description: "Anything else you hold as an investment.",
    platformLabel: "Held With",
    fields: [
      {
        key: "investedAmount",
        label: "Amount Invested",
        type: "number",
        required: true,
      },
      {
        key: "currentValue",
        label: "Current Value",
        type: "number",
        required: true,
      },
    ],
    derived: [],
    investedFormula: "investedAmount",
    currentFormula: "currentValue",
    valueField: "currentValue",
  },
];

export const getInvestmentType = (key) =>
  INVESTMENT_TYPES.find((type) => type.key === key) || null;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Whole calendar months between two dates - the anniversary has to have been
// reached, so 15 Jan -> 14 Feb is 0 months and 15 Jan -> 15 Feb is 1.
//
// This exists because instalments land on calendar dates, not on 30.44-day
// blocks. Deriving an instalment count from days/30.44 drifts by about four
// days over a year, which is enough to miscount at the boundary.
const calendarMonthsBetween = (start, asOf) => {
  let months =
    (asOf.getFullYear() - start.getFullYear()) * 12 +
    (asOf.getMonth() - start.getMonth());

  // The anniversary clamps to the last day of a short month, the same way a
  // bank debits an RD opened on the 31st on 28 February. Comparing against
  // the raw start day would skip that instalment entirely.
  const lastDayThisMonth = new Date(
    asOf.getFullYear(),
    asOf.getMonth() + 1,
    0,
  ).getDate();

  const anniversaryDay = Math.min(start.getDate(), lastDayThisMonth);

  if (asOf.getDate() < anniversaryDay) months -= 1;

  return Math.max(months, 0);
};

// Time held, injected so fixed-return formulas can grow without a snapshot.
export const getHoldingContext = (purchaseDate, asOf = new Date()) => {
  const start = purchaseDate ? new Date(purchaseDate) : asOf;
  const days = Math.max((asOf - start) / MS_PER_DAY, 0);

  return {
    // Fractional - right for interest, which accrues continuously.
    _yearsHeld: days / 365.25,
    _monthsHeld: days / 30.44,
    // Whole - right for counting things that happen on a date.
    _calendarMonthsHeld: calendarMonthsBetween(start, asOf),
  };
};

export const computeInvestmentValues = (
  type,
  rawFields = {},
  purchaseDate,
  asOf = new Date(),
) => {
  if (!type) {
    return { fields: {}, investedAmount: 0, currentValue: 0 };
  }

  const values = resolveFields(
    type,
    rawFields,
    getHoldingContext(purchaseDate, asOf),
  );

  return {
    fields: values,
    investedAmount: Math.max(evaluateFormula(type.investedFormula, values), 0),
    currentValue: Math.max(evaluateFormula(type.currentFormula, values), 0),
  };
};
