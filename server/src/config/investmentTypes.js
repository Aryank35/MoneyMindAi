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
        // Only the instalments actually paid so far count as invested.
        key: "invested",
        label: "Deposited So Far",
        formula: {
          op: "multiply",
          args: ["monthlyAmount", { op: "min", args: ["_monthsHeld", "months"] }],
        },
      },
      {
        // Each instalment earns for roughly half the elapsed term on
        // average, which is the standard approximation for an RD.
        key: "currentValue",
        label: "Value Today",
        tone: "positive",
        formula: {
          op: "simpleInterest",
          args: [
            {
              op: "multiply",
              args: [
                "monthlyAmount",
                { op: "min", args: ["_monthsHeld", "months"] },
              ],
            },
            "interestRate",
            {
              op: "divide",
              args: [{ op: "min", args: ["_monthsHeld", "months"] }, 24],
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

// Time held, injected so fixed-return formulas can grow without a snapshot.
export const getHoldingContext = (purchaseDate, asOf = new Date()) => {
  const start = purchaseDate ? new Date(purchaseDate) : asOf;
  const days = Math.max((asOf - start) / MS_PER_DAY, 0);

  return {
    _yearsHeld: days / 365.25,
    _monthsHeld: days / 30.44,
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
