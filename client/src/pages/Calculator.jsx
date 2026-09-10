import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  FiAlertCircle,
  FiCornerDownLeft,
  FiDelete,
  FiTrendingUp,
} from "react-icons/fi";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import DashboardLayout from "../components/layout/DashboardLayout";
import { evaluateExpression } from "../utils/calc";
import {
  amortisationByYear,
  calculateEmi,
  calculateFd,
  calculateInflation,
  calculateLumpsum,
  calculateRd,
  calculateSimpleInterest,
  calculateSip,
  sipForGoal,
  yearsToDouble,
} from "../utils/financeMath";
import { money } from "../utils/incomeFormulas";
import { CHART_COLORS, TOOLTIP_STYLE } from "../utils/chartTheme";

const TABS = [
  { key: "basic", label: "Calculator" },
  { key: "emi", label: "Loan / EMI" },
  { key: "sip", label: "SIP" },
  { key: "goal", label: "Goal" },
  { key: "deposit", label: "FD / RD" },
  { key: "inflation", label: "Inflation" },
];

const KEYPAD = [
  ["7", "8", "9", "÷"],
  ["4", "5", "6", "×"],
  ["1", "2", "3", "-"],
  [".", "0", "back", "+"],
];

const OPERATORS = new Set(["+", "-", "×", "÷"]);

// A labelled number field. Rates and years want plain numbers, so this stays
// a number input rather than the expression-aware AmountInput.
function Field({ label, value, onChange, suffix, step = "any", hint }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="relative">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 tabular-nums outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
            {suffix}
          </span>
        )}
      </span>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Result({ label, value, tone, big }) {
  return (
    <div className="rounded-xl bg-slate-800/80 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p
        className={`mt-1 break-words font-bold tabular-nums ${
          big ? "text-3xl" : "text-xl"
        } ${tone || ""}`}
      >
        {value}
      </p>
    </div>
  );
}

// Invested vs returns, which is the whole story of a compounding chart.
function SplitChart({ parts }) {
  const data = parts.filter((part) => part.value > 0);

  if (data.length === 0) return null;

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={78}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => money(value)}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Calculator() {
  const shouldReduceMotion = useReducedMotion();
  const [tab, setTab] = useState("basic");

  // ---- plain calculator ----
  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState([]);
  const parsed = evaluateExpression(expression);

  // ---- loan ----
  const [loan, setLoan] = useState({ principal: 1000000, rate: 8.5, years: 20 });
  const emi = useMemo(
    () =>
      calculateEmi({
        principal: loan.principal,
        annualRate: loan.rate,
        months: Number(loan.years) * 12,
      }),
    [loan],
  );
  const schedule = useMemo(
    () =>
      amortisationByYear({
        principal: loan.principal,
        annualRate: loan.rate,
        months: Number(loan.years) * 12,
      }),
    [loan],
  );

  // ---- sip / lumpsum ----
  const [sip, setSip] = useState({ monthly: 10000, rate: 12, years: 10, lumpsum: 100000 });
  const sipResult = useMemo(
    () =>
      calculateSip({
        monthlyAmount: sip.monthly,
        annualRate: sip.rate,
        months: Number(sip.years) * 12,
      }),
    [sip],
  );
  const lumpsumResult = useMemo(
    () =>
      calculateLumpsum({
        principal: sip.lumpsum,
        annualRate: sip.rate,
        years: sip.years,
      }),
    [sip],
  );

  // ---- goal ----
  const [goal, setGoal] = useState({ target: 2000000, rate: 12, years: 10 });
  const goalResult = useMemo(
    () =>
      sipForGoal({
        targetAmount: goal.target,
        annualRate: goal.rate,
        months: Number(goal.years) * 12,
      }),
    [goal],
  );

  // ---- deposits ----
  const [deposit, setDeposit] = useState({
    fdPrincipal: 100000,
    fdRate: 7,
    fdYears: 5,
    rdMonthly: 5000,
    rdRate: 7,
    rdMonths: 24,
  });
  const fdResult = useMemo(
    () =>
      calculateFd({
        principal: deposit.fdPrincipal,
        annualRate: deposit.fdRate,
        years: deposit.fdYears,
      }),
    [deposit],
  );
  const rdResult = useMemo(
    () =>
      calculateRd({
        monthlyAmount: deposit.rdMonthly,
        annualRate: deposit.rdRate,
        months: deposit.rdMonths,
      }),
    [deposit],
  );

  // ---- inflation ----
  const [inflation, setInflation] = useState({ amount: 100000, rate: 6, years: 10 });
  const inflationResult = useMemo(
    () =>
      calculateInflation({
        amount: inflation.amount,
        annualRate: inflation.rate,
        years: inflation.years,
      }),
    [inflation],
  );
  const simple = useMemo(
    () =>
      calculateSimpleInterest({
        principal: inflation.amount,
        annualRate: inflation.rate,
        years: inflation.years,
      }),
    [inflation],
  );
  const doubling = yearsToDouble(inflation.rate);

  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      };

  // ---- keypad ----
  const lastNumber = (text) => text.split(/[+\-×÷]/).pop() || "";

  const press = (key) => {
    if (key === "back") {
      setExpression((prev) => prev.slice(0, -1));

      return;
    }

    if (OPERATORS.has(key)) {
      setExpression((prev) => {
        if (!prev) return "";

        return OPERATORS.has(prev.slice(-1)) ? prev.slice(0, -1) + key : prev + key;
      });

      return;
    }

    if (key === ".") {
      const tail = lastNumber(expression);

      if (tail.includes(".")) return;

      setExpression((prev) => (tail === "" ? `${prev}0.` : prev + key));

      return;
    }

    setExpression((prev) => (prev === "0" ? key : prev + key));
  };

  const commit = () => {
    if (parsed.value === null) return;

    setHistory((prev) => [
      { expression, result: parsed.value },
      ...prev.slice(0, 7),
    ]);
    setExpression(String(parsed.value));
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-4xl">Calculator</h1>
        <p className="mt-2 text-sm text-slate-400">
          Plain arithmetic, and the numbers behind a loan, a SIP or a deposit
          before you commit to it.
        </p>
      </div>

      {/* Tabs - scrollable on a phone rather than wrapping into a wall */}
      <div className="mb-6 -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <div className="flex w-max gap-1 rounded-xl bg-slate-800 p-1">
          {TABS.map((option) => (
            <button
              key={option.key}
              onClick={() => setTab(option.key)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm transition ${
                tab === option.key
                  ? "bg-indigo-400/15 text-indigo-200"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============ PLAIN CALCULATOR ============ */}
      {tab === "basic" && (
        <motion.div {...motionProps} className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <div className="rounded-2xl bg-slate-950 p-5 text-right">
              <input
                aria-label="Expression"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commit()}
                placeholder="0"
                className="w-full bg-transparent text-right text-3xl font-bold tabular-nums outline-none"
              />

              <p
                className={`mt-2 text-lg font-semibold tabular-nums ${
                  parsed.error ? "text-red-300" : "text-emerald-300"
                }`}
              >
                {parsed.error ? (
                  <span className="flex items-center justify-end gap-1 text-sm">
                    <FiAlertCircle />
                    {parsed.error}
                  </span>
                ) : parsed.value !== null ? (
                  `= ${money(parsed.value)}`
                ) : (
                  <span className="text-slate-600">= 0</span>
                )}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {KEYPAD.flat().map((key) => (
                <button
                  key={key}
                  onClick={() => press(key)}
                  aria-label={key === "back" ? "Delete last character" : key}
                  className={`flex h-14 items-center justify-center rounded-2xl border text-xl font-semibold transition active:scale-95 ${
                    OPERATORS.has(key)
                      ? "border-indigo-400/30 bg-indigo-400/10 text-indigo-200"
                      : "border-white/10 bg-slate-800 active:bg-slate-700"
                  }`}
                >
                  {key === "back" ? <FiDelete /> : key}
                </button>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => setExpression("")}
                className="h-12 rounded-2xl border border-white/10 bg-slate-800 text-sm transition active:scale-95"
              >
                Clear
              </button>
              <button
                onClick={commit}
                disabled={parsed.value === null}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-400 text-sm font-semibold text-slate-950 transition active:scale-95 disabled:opacity-40"
              >
                <FiCornerDownLeft />
                Equals
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Brackets and percent work too — try 1200/3, or 900 + 18% for GST.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Recent</h2>

            {history.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Nothing yet. Results you confirm with Equals are kept here.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {history.map((entry, index) => (
                  <button
                    key={index}
                    onClick={() => setExpression(entry.expression)}
                    className="w-full rounded-xl bg-slate-800/60 p-3 text-left transition hover:bg-slate-800"
                  >
                    <span className="block text-xs text-slate-500">
                      {entry.expression}
                    </span>
                    <span className="block font-semibold tabular-nums">
                      {money(entry.result)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ============ LOAN ============ */}
      {tab === "emi" && (
        <motion.div {...motionProps} className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Loan details</h2>

            <div className="mt-4 grid gap-3">
              <Field
                label="Loan amount"
                value={loan.principal}
                onChange={(v) => setLoan({ ...loan, principal: v })}
                suffix="₹"
              />
              <Field
                label="Interest rate"
                value={loan.rate}
                onChange={(v) => setLoan({ ...loan, rate: v })}
                suffix="% p.a."
              />
              <Field
                label="Tenure"
                value={loan.years}
                onChange={(v) => setLoan({ ...loan, years: v })}
                suffix="years"
                hint={`${Math.round(Number(loan.years) * 12)} monthly instalments`}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Result label="Monthly EMI" value={money(emi.emi)} big tone="text-indigo-200" />
              <Result label="Total interest" value={money(emi.totalInterest)} tone="text-red-300" />
              <Result label="Total payable" value={money(emi.totalPayable)} />
              <Result
                label="Interest share"
                value={`${emi.interestShare}%`}
                tone={emi.interestShare > 50 ? "text-red-300" : ""}
              />
            </div>

            {emi.interestShare > 50 && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
                <FiAlertCircle className="mt-0.5 shrink-0" />
                More than half of what you repay is interest. Shortening the
                tenure cuts that sharply, even at the same rate.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Principal vs interest</h2>

            <SplitChart
              parts={[
                { name: "Principal", value: Number(loan.principal) },
                { name: "Interest", value: emi.totalInterest },
              ]}
            />

            <h3 className="mt-4 text-sm font-semibold text-slate-300">
              Year by year
            </h3>
            <p className="text-xs text-slate-500">
              Early instalments are mostly interest — this is why paying extra
              in the first years saves the most.
            </p>

            <div className="mt-3 max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500">
                  <tr>
                    <th className="p-2">Year</th>
                    <th className="p-2 text-right">Principal</th>
                    <th className="p-2 text-right">Interest</th>
                    <th className="p-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row) => (
                    <tr key={row.year} className="border-t border-white/5">
                      <td className="p-2">{row.year}</td>
                      <td className="p-2 text-right tabular-nums">
                        {money(row.principal)}
                      </td>
                      <td className="p-2 text-right tabular-nums text-red-300">
                        {money(row.interest)}
                      </td>
                      <td className="p-2 text-right tabular-nums text-slate-400">
                        {money(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ============ SIP ============ */}
      {tab === "sip" && (
        <motion.div {...motionProps} className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Monthly investment</h2>

            <div className="mt-4 grid gap-3">
              <Field
                label="Monthly amount"
                value={sip.monthly}
                onChange={(v) => setSip({ ...sip, monthly: v })}
                suffix="₹"
              />
              <Field
                label="Expected return"
                value={sip.rate}
                onChange={(v) => setSip({ ...sip, rate: v })}
                suffix="% p.a."
                hint="Equity funds have historically returned 10-13% over long periods. It is an estimate, not a promise."
              />
              <Field
                label="Duration"
                value={sip.years}
                onChange={(v) => setSip({ ...sip, years: v })}
                suffix="years"
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Result
                label="Future value"
                value={money(sipResult.futureValue)}
                big
                tone="text-emerald-300"
              />
              <Result label="You invest" value={money(sipResult.invested)} />
              <Result
                label="Returns"
                value={money(sipResult.gain)}
                tone="text-emerald-300"
              />
              <Result label="Returns share" value={`${sipResult.gainShare}%`} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Invested vs returns</h2>

            <SplitChart
              parts={[
                { name: "Invested", value: sipResult.invested },
                { name: "Returns", value: sipResult.gain },
              ]}
            />

            <div className="mt-4 border-t border-white/10 pt-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FiTrendingUp className="text-indigo-300" />
                Same rate, as a lump sum
              </h3>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field
                  label="One-off amount"
                  value={sip.lumpsum}
                  onChange={(v) => setSip({ ...sip, lumpsum: v })}
                  suffix="₹"
                />
                <Result
                  label={`After ${sip.years} years`}
                  value={money(lumpsumResult.futureValue)}
                  tone="text-emerald-300"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ============ GOAL ============ */}
      {tab === "goal" && (
        <motion.div {...motionProps} className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">What it takes</h2>
            <p className="mt-1 text-sm text-slate-400">
              Work backwards from the number you need.
            </p>

            <div className="mt-4 grid gap-3">
              <Field
                label="Target amount"
                value={goal.target}
                onChange={(v) => setGoal({ ...goal, target: v })}
                suffix="₹"
              />
              <Field
                label="Expected return"
                value={goal.rate}
                onChange={(v) => setGoal({ ...goal, rate: v })}
                suffix="% p.a."
              />
              <Field
                label="Time available"
                value={goal.years}
                onChange={(v) => setGoal({ ...goal, years: v })}
                suffix="years"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <div className="grid gap-3">
              <Result
                label="Invest each month"
                value={money(goalResult.monthlyAmount)}
                big
                tone="text-indigo-200"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Result label="Total you put in" value={money(goalResult.invested)} />
                <Result
                  label="Growth does the rest"
                  value={money(goalResult.gain)}
                  tone="text-emerald-300"
                />
              </div>
            </div>

            <SplitChart
              parts={[
                { name: "Your money", value: goalResult.invested },
                { name: "Growth", value: goalResult.gain },
              ]}
            />
          </div>
        </motion.div>
      )}

      {/* ============ DEPOSITS ============ */}
      {tab === "deposit" && (
        <motion.div {...motionProps} className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Fixed deposit</h2>
            <p className="mt-1 text-xs text-slate-500">
              Compounded quarterly, as Indian banks do.
            </p>

            <div className="mt-4 grid gap-3">
              <Field
                label="Principal"
                value={deposit.fdPrincipal}
                onChange={(v) => setDeposit({ ...deposit, fdPrincipal: v })}
                suffix="₹"
              />
              <Field
                label="Interest rate"
                value={deposit.fdRate}
                onChange={(v) => setDeposit({ ...deposit, fdRate: v })}
                suffix="% p.a."
              />
              <Field
                label="Tenure"
                value={deposit.fdYears}
                onChange={(v) => setDeposit({ ...deposit, fdYears: v })}
                suffix="years"
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Result
                label="At maturity"
                value={money(fdResult.maturityValue)}
                big
                tone="text-emerald-300"
              />
              <Result label="Interest earned" value={money(fdResult.interest)} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Recurring deposit</h2>
            <p className="mt-1 text-xs text-slate-500">
              Each instalment earns for the months remaining, so the interest
              is far less than on a lump sum of the same total.
            </p>

            <div className="mt-4 grid gap-3">
              <Field
                label="Monthly deposit"
                value={deposit.rdMonthly}
                onChange={(v) => setDeposit({ ...deposit, rdMonthly: v })}
                suffix="₹"
              />
              <Field
                label="Interest rate"
                value={deposit.rdRate}
                onChange={(v) => setDeposit({ ...deposit, rdRate: v })}
                suffix="% p.a."
              />
              <Field
                label="Tenure"
                value={deposit.rdMonths}
                onChange={(v) => setDeposit({ ...deposit, rdMonths: v })}
                suffix="months"
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Result
                label="At maturity"
                value={money(rdResult.maturityValue)}
                big
                tone="text-emerald-300"
              />
              <Result label="You deposit" value={money(rdResult.invested)} />
            </div>
          </div>
        </motion.div>
      )}

      {/* ============ INFLATION ============ */}
      {tab === "inflation" && (
        <motion.div {...motionProps} className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">What money is worth later</h2>

            <div className="mt-4 grid gap-3">
              <Field
                label="Amount today"
                value={inflation.amount}
                onChange={(v) => setInflation({ ...inflation, amount: v })}
                suffix="₹"
              />
              <Field
                label="Rate"
                value={inflation.rate}
                onChange={(v) => setInflation({ ...inflation, rate: v })}
                suffix="% p.a."
                hint="Indian CPI inflation has averaged roughly 5-6%."
              />
              <Field
                label="Years"
                value={inflation.years}
                onChange={(v) => setInflation({ ...inflation, years: v })}
                suffix="years"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <div className="grid gap-3">
              <Result
                label={`What ${money(inflation.amount)} of shopping costs in ${inflation.years} years`}
                value={money(inflationResult.futureCost)}
                big
                tone="text-red-300"
              />
              <Result
                label={`What ${money(inflation.amount)} received then is worth today`}
                value={money(inflationResult.presentValue)}
                tone="text-slate-300"
              />
            </div>

            <div className="mt-4 border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold text-slate-300">
                At this rate
              </h3>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Result
                  label="Money doubles in"
                  value={
                    doubling.exact === null
                      ? "—"
                      : `${doubling.exact} years`
                  }
                />
                <Result
                  label="Rule of 72 says"
                  value={
                    doubling.ruleOf72 === null
                      ? "—"
                      : `${doubling.ruleOf72} years`
                  }
                />
                <Result
                  label="Simple interest would give"
                  value={money(simple.interest)}
                />
                <Result label="Total, simple" value={money(simple.total)} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </DashboardLayout>
  );
}
