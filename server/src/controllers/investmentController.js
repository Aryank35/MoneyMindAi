import Investment from "../models/Investment.js";
import {
  INVESTMENT_TYPES,
  INVESTMENT_CATEGORIES,
  getInvestmentType,
  computeInvestmentValues,
} from "../config/investmentTypes.js";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

// =========================================================================
// HELPERS
// =========================================================================

// Fixed-return holdings grow with time, so their figures are recomputed on
// every read rather than trusted from the last write.
const decorate = (investment, asOf = new Date()) => {
  const type = getInvestmentType(investment.typeKey);

  const { fields, investedAmount, currentValue } = computeInvestmentValues(
    type,
    investment.fields || {},
    investment.purchaseDate,
    asOf,
  );

  const gain = currentValue - investedAmount;

  const yearsHeld = Math.max(
    (asOf - new Date(investment.purchaseDate || asOf)) / MS_PER_YEAR,
    0,
  );

  // Annualised only once a holding has a meaningful track record - a 3-day
  // old position would otherwise report an absurd yearly rate.
  const annualisedReturn =
    investedAmount > 0 && yearsHeld >= 0.25 && currentValue > 0
      ? (Math.pow(currentValue / investedAmount, 1 / yearsHeld) - 1) * 100
      : null;

  return {
    ...(investment.toObject ? investment.toObject() : investment),
    fields,
    investedAmount,
    currentValue,
    gain,
    gainPercent: investedAmount > 0 ? (gain / investedAmount) * 100 : 0,
    yearsHeld,
    annualisedReturn,
    type: type
      ? {
          key: type.key,
          label: type.label,
          icon: type.icon,
          category: type.category,
          valueField: type.valueField,
          platformLabel: type.platformLabel,
        }
      : null,
  };
};

const validate = (body, type) => {
  if (!type) return `Unknown investment type: ${body.typeKey}`;

  if (!body.name?.trim()) return "Give this holding a name";

  for (const field of type.fields) {
    if (field.required && !(Number(body.fields?.[field.key]) > 0)) {
      return `${field.label} is required and must be greater than 0`;
    }
  }

  return null;
};

const buildPayload = (body, type) => {
  const purchaseDate = body.purchaseDate
    ? new Date(body.purchaseDate)
    : new Date();

  const { fields, investedAmount, currentValue } = computeInvestmentValues(
    type,
    body.fields || {},
    purchaseDate,
  );

  return {
    typeKey: type.key,
    name: body.name.trim(),
    platform: body.platform?.trim() || "",
    fields,
    investedAmount,
    currentValue,
    purchaseDate,
    isSip: Boolean(body.isSip),
    sipAmount: body.isSip ? Number(body.sipAmount || 0) : 0,
    sipDay: body.isSip ? Number(body.sipDay) || undefined : undefined,
    accountId: body.accountId || null,
    goal: body.goal?.trim() || "",
    note: body.note?.trim() || "",
    valuedAt: new Date(),
  };
};

// =========================================================================
// REGISTRY
// =========================================================================

export const getInvestmentTypeCatalog = (req, res) => {
  res.json({
    success: true,
    data: {
      types: INVESTMENT_TYPES,
      categories: INVESTMENT_CATEGORIES,
    },
  });
};

// =========================================================================
// CRUD
// =========================================================================

export const createInvestment = async (req, res) => {
  try {
    const type = getInvestmentType(req.body.typeKey);

    const error = validate(req.body, type);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const investment = await Investment.create({
      ...buildPayload(req.body, type),
      userId: req.body.userId,
    });

    res.status(201).json({ success: true, data: decorate(investment) });
  } catch (error) {
    console.error("Investment Error:", error);

    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInvestmentsByUser = async (req, res) => {
  try {
    const investments = await Investment.find({
      userId: req.params.userId,
    }).sort({ purchaseDate: -1 });

    res.json({
      success: true,
      data: investments.map((investment) => decorate(investment)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInvestment = async (req, res) => {
  try {
    const existing = await Investment.findById(req.params.id);

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Investment not found" });
    }

    const type = getInvestmentType(req.body.typeKey || existing.typeKey);

    const error = validate({ ...req.body, name: req.body.name ?? existing.name }, type);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    existing.set(buildPayload({ ...req.body, name: req.body.name ?? existing.name }, type));

    const updated = await existing.save();

    res.json({ success: true, data: decorate(updated) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Refreshing a price is the most frequent action on this page, so it gets a
// route that touches one field instead of round-tripping the whole form.
export const updateInvestmentValue = async (req, res) => {
  try {
    const existing = await Investment.findById(req.params.id);

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Investment not found" });
    }

    const type = getInvestmentType(existing.typeKey);

    if (!type?.valueField) {
      return res
        .status(400)
        .json({ success: false, message: "This holding has no updatable value" });
    }

    const value = Number(req.body.value);

    if (!(value >= 0)) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a value of 0 or more" });
    }

    const nextFields = { ...(existing.fields || {}), [type.valueField]: value };

    const { fields, investedAmount, currentValue } = computeInvestmentValues(
      type,
      nextFields,
      existing.purchaseDate,
    );

    existing.set({ fields, investedAmount, currentValue, valuedAt: new Date() });

    const updated = await existing.save();

    res.json({ success: true, data: decorate(updated) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInvestmentDeleteImpact = async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id);

    if (!investment) {
      return res
        .status(404)
        .json({ success: false, message: "Investment not found" });
    }

    const decorated = decorate(investment);

    res.json({
      success: true,
      data: {
        name: decorated.name,
        typeLabel: decorated.type?.label || decorated.typeKey,
        investedAmount: decorated.investedAmount,
        currentValue: decorated.currentValue,
        gain: decorated.gain,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteInvestment = async (req, res) => {
  try {
    const investment = await Investment.findByIdAndDelete(req.params.id);

    if (!investment) {
      return res
        .status(404)
        .json({ success: false, message: "Investment not found" });
    }

    res.json({ success: true, message: "Investment removed from portfolio" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// PORTFOLIO
// =========================================================================

export const getPortfolio = async (req, res) => {
  try {
    const investments = (
      await Investment.find({ userId: req.params.userId })
    ).map((investment) => decorate(investment));

    const totalInvested = investments.reduce(
      (sum, item) => sum + item.investedAmount,
      0,
    );

    const totalCurrent = investments.reduce(
      (sum, item) => sum + item.currentValue,
      0,
    );

    const totalGain = totalCurrent - totalInvested;

    const group = (keyOf, labelOf) => {
      const buckets = new Map();

      for (const item of investments) {
        const key = keyOf(item);

        if (!buckets.has(key)) {
          buckets.set(key, {
            key,
            label: labelOf(item),
            icon: item.type?.icon,
            invested: 0,
            current: 0,
            count: 0,
          });
        }

        const bucket = buckets.get(key);

        bucket.invested += item.investedAmount;
        bucket.current += item.currentValue;
        bucket.count += 1;
      }

      return [...buckets.values()]
        .map((bucket) => ({
          ...bucket,
          gain: bucket.current - bucket.invested,
          gainPercent:
            bucket.invested > 0
              ? ((bucket.current - bucket.invested) / bucket.invested) * 100
              : 0,
          allocation: totalCurrent > 0 ? (bucket.current / totalCurrent) * 100 : 0,
        }))
        .sort((a, b) => b.current - a.current);
    };

    const ranked = [...investments]
      .filter((item) => item.investedAmount > 0)
      .sort((a, b) => b.gainPercent - a.gainPercent);

    // Weighted by capital, so a large holding moves the number more than a
    // token one - a plain average of percentages would mislead.
    const weightedYears =
      totalInvested > 0
        ? investments.reduce(
            (sum, item) => sum + item.yearsHeld * item.investedAmount,
            0,
          ) / totalInvested
        : 0;

    const annualisedReturn =
      totalInvested > 0 && weightedYears >= 0.25 && totalCurrent > 0
        ? (Math.pow(totalCurrent / totalInvested, 1 / weightedYears) - 1) * 100
        : null;

    res.json({
      success: true,
      data: {
        totals: {
          invested: totalInvested,
          current: totalCurrent,
          gain: totalGain,
          gainPercent: totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0,
          annualisedReturn,
          weightedYears,
          holdings: investments.length,
          sipTotal: investments
            .filter((item) => item.isSip)
            .reduce((sum, item) => sum + Number(item.sipAmount || 0), 0),
        },
        byType: group(
          (item) => item.typeKey,
          (item) => item.type?.label || item.typeKey,
        ),
        byCategory: group(
          (item) => item.type?.category || "other",
          (item) =>
            INVESTMENT_CATEGORIES[item.type?.category]?.label || "Other",
        ),
        best: ranked[0] || null,
        worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
        holdings: investments.sort((a, b) => b.currentValue - a.currentValue),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
