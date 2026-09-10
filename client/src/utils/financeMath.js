// =========================================================================
// FINANCE MATHS
//
// The standard personal-finance calculations, kept apart from the UI so each
// can be checked against a known figure. Rates are always annual percentages
// and periods are stated in the units each function names.
// =========================================================================

const num = (value) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const round = (value) => Math.round(num(value) * 100) / 100;

// -------------------------------------------------------------------------
// LOAN / EMI
//
// E = P·r·(1+r)^n / ((1+r)^n − 1), with r the monthly rate.
// -------------------------------------------------------------------------
export const calculateEmi = ({ principal, annualRate, months }) => {
  const p = num(principal);
  const n = Math.round(num(months));
  const r = num(annualRate) / 12 / 100;

  if (p <= 0 || n <= 0) {
    return { emi: 0, totalPayable: 0, totalInterest: 0, interestShare: 0 };
  }

  // An interest-free loan is just the principal split evenly, and the
  // formula above divides by zero for it.
  const emi = r === 0 ? p / n : (p * r * (1 + r) ** n) / ((1 + r) ** n - 1);

  const totalPayable = emi * n;

  return {
    emi: round(emi),
    totalPayable: round(totalPayable),
    totalInterest: round(totalPayable - p),
    interestShare: totalPayable > 0 ? round(((totalPayable - p) / totalPayable) * 100) : 0,
  };
};

// Year-by-year split of principal and interest, for showing how a loan
// front-loads its interest.
export const amortisationByYear = ({ principal, annualRate, months }) => {
  const { emi } = calculateEmi({ principal, annualRate, months });
  const r = num(annualRate) / 12 / 100;

  let balance = num(principal);
  const years = [];
  const total = Math.round(num(months));

  for (let month = 1; month <= total; month += 1) {
    const interest = balance * r;

    // The EMI is quoted to the paisa, so 240 of them do not retire the
    // principal to the rupee. The last instalment absorbs the difference,
    // which is what a lender actually does.
    const principalPaid =
      month === total ? balance : Math.min(emi - interest, balance);

    balance = Math.max(balance - principalPaid, 0);

    const yearIndex = Math.floor((month - 1) / 12);

    if (!years[yearIndex]) {
      years[yearIndex] = { year: yearIndex + 1, principal: 0, interest: 0, balance: 0 };
    }

    years[yearIndex].principal += principalPaid;
    years[yearIndex].interest += interest;
    years[yearIndex].balance = balance;
  }

  return years.map((entry) => ({
    ...entry,
    principal: round(entry.principal),
    interest: round(entry.interest),
    balance: round(entry.balance),
  }));
};

// -------------------------------------------------------------------------
// SIP
//
// FV = P·[((1+i)^n − 1)/i]·(1+i) — the trailing (1+i) is because an
// instalment is invested at the start of the month, which is how Indian SIP
// calculators quote it.
// -------------------------------------------------------------------------
export const calculateSip = ({ monthlyAmount, annualRate, months }) => {
  const p = num(monthlyAmount);
  const n = Math.round(num(months));
  const i = num(annualRate) / 12 / 100;

  if (p <= 0 || n <= 0) {
    return { futureValue: 0, invested: 0, gain: 0, gainShare: 0 };
  }

  const invested = p * n;

  const futureValue =
    i === 0 ? invested : p * (((1 + i) ** n - 1) / i) * (1 + i);

  return {
    futureValue: round(futureValue),
    invested: round(invested),
    gain: round(futureValue - invested),
    gainShare: futureValue > 0 ? round(((futureValue - invested) / futureValue) * 100) : 0,
  };
};

// What monthly amount reaches a target - the SIP formula inverted.
export const sipForGoal = ({ targetAmount, annualRate, months }) => {
  const fv = num(targetAmount);
  const n = Math.round(num(months));
  const i = num(annualRate) / 12 / 100;

  if (fv <= 0 || n <= 0) return { monthlyAmount: 0, invested: 0, gain: 0 };

  const monthly =
    i === 0 ? fv / n : (fv * i) / (((1 + i) ** n - 1) * (1 + i));

  const invested = monthly * n;

  return {
    monthlyAmount: round(monthly),
    invested: round(invested),
    gain: round(fv - invested),
  };
};

// -------------------------------------------------------------------------
// LUMPSUM
// -------------------------------------------------------------------------
export const calculateLumpsum = ({ principal, annualRate, years }) => {
  const p = num(principal);
  const t = num(years);
  const r = num(annualRate) / 100;

  const futureValue = p * (1 + r) ** t;

  return {
    futureValue: round(futureValue),
    invested: round(p),
    gain: round(futureValue - p),
  };
};

// -------------------------------------------------------------------------
// FIXED DEPOSIT
//
// Indian banks compound quarterly by default, so that is the standard here
// rather than annually.
// -------------------------------------------------------------------------
export const calculateFd = ({ principal, annualRate, years, compoundsPerYear = 4 }) => {
  const p = num(principal);
  const t = num(years);
  const r = num(annualRate) / 100;
  const k = Math.max(Math.round(num(compoundsPerYear)), 1);

  const maturity = p * (1 + r / k) ** (k * t);

  return {
    maturityValue: round(maturity),
    invested: round(p),
    interest: round(maturity - p),
  };
};

// -------------------------------------------------------------------------
// RECURRING DEPOSIT
//
// Interest = P·(r/1200)·n(n−1)/2 — the kth of n instalments earns for
// (n−k) months. Same formula the RD holding on the investments page uses.
// -------------------------------------------------------------------------
export const calculateRd = ({ monthlyAmount, annualRate, months }) => {
  const p = num(monthlyAmount);
  const n = Math.round(num(months));
  const r = num(annualRate);

  const deposited = p * n;
  const interest = p * (r / 1200) * ((n * (n - 1)) / 2);

  return {
    maturityValue: round(deposited + interest),
    invested: round(deposited),
    interest: round(interest),
  };
};

// -------------------------------------------------------------------------
// INFLATION
// -------------------------------------------------------------------------
export const calculateInflation = ({ amount, annualRate, years }) => {
  const a = num(amount);
  const t = num(years);
  const r = num(annualRate) / 100;

  const futureCost = a * (1 + r) ** t;
  const presentValue = (1 + r) ** t === 0 ? 0 : a / (1 + r) ** t;

  return {
    // What the same basket costs later.
    futureCost: round(futureCost),
    // What a future amount is worth in today's money.
    presentValue: round(presentValue),
    erosion: round(a - presentValue),
  };
};

// -------------------------------------------------------------------------
// SIMPLE / COMPOUND INTEREST
// -------------------------------------------------------------------------
export const calculateSimpleInterest = ({ principal, annualRate, years }) => {
  const p = num(principal);
  const interest = (p * num(annualRate) * num(years)) / 100;

  return { interest: round(interest), total: round(p + interest) };
};

// Years to double at a given rate - the rule of 72, and the exact answer.
export const yearsToDouble = (annualRate) => {
  const r = num(annualRate);

  if (r <= 0) return { ruleOf72: null, exact: null };

  return {
    ruleOf72: round(72 / r),
    exact: round(Math.log(2) / Math.log(1 + r / 100)),
  };
};
