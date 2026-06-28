import DashboardLayout from "../components/layout/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiEdit2,
  FiFilter,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiTrendingUp,
} from "react-icons/fi";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getIncomesByUser,
  createIncome,
  updateIncome,
  deleteIncome,
} from "../services/incomeService";
import { getAccountsByUser } from "../services/accountService";
import { getUserId } from "../utils/auth";

const incomeSources = [
  "Salary",
  "Business",
  "Freelancing",
  "Rental",
  "Investments",
  "Interest",
  "Bonus",
  "Dividend",
  "Gift",
  "Other",
];

const paymentModes = ["Bank Transfer", "Cash", "UPI", "Cheque", "Card"];
const recurringTypes = ["Monthly", "Quarterly", "Yearly", "Weekly", "Daily"];
const monthNames = [
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
const chartColors = ["#22c55e", "#38bdf8", "#a78bfa", "#f59e0b", "#f472b6"];

const createEmptyForm = () => {
  const now = new Date();

  return {
    source: "Salary",
    category: "Salary",
    amount: "",
    note: "",
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().slice(0, 5),
    accountId: "",
    paymentMode: "Bank Transfer",
    employer: "",
    isRecurring: true,
    recurringType: "Monthly",
    salaryMonth: now.getMonth() + 1,
    salaryYear: now.getFullYear(),
    grossSalary: "",
    basic: "",
    hra: "",
    specialAllowance: "",
    variablePay: "",
    bonus: "",
    pf: "",
    professionalTax: "",
    incomeTax: "",
    insurance: "",
    tds: "0",
    netSalary: "",
    attachments: "",
  };
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const shortMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const toNumber = (value) => Number(value || 0);

const getIncomeAmount = (income) =>
  Number(income.netSalary || income.amount || 0);

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

const formatDayMonth = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
      })
    : "-";

const getRecurringDay = (income) => {
  if (income.source === "Salary" && income.salaryMonth && income.salaryYear) {
    return new Date(
      Number(income.salaryYear),
      Number(income.salaryMonth) - 1,
      new Date(income.incomeDate).getDate(),
    );
  }

  return income.incomeDate ? new Date(income.incomeDate) : null;
};

export default function Income() {
  const [incomes, setIncomes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm);
  const [filters, setFilters] = useState({
    month: "all",
    year: "all",
    account: "all",
    source: "all",
    paymentMode: "all",
    recurring: "all",
    search: "",
  });

  const loadIncomePage = async () => {
    try {
      const userId = getUserId();
      const [incomeResponse, accountResponse] = await Promise.all([
        getIncomesByUser(userId),
        getAccountsByUser(userId),
      ]);

      const loadedAccounts = accountResponse.data || [];

      setIncomes(incomeResponse.data || []);
      setAccounts(loadedAccounts);
      setFormData((prev) => ({
        ...prev,
        accountId: prev.accountId || loadedAccounts[0]?._id || "",
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadIncomePage();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const accountMap = useMemo(
    () =>
      accounts.reduce((map, account) => {
        map[account._id] = account;
        return map;
      }, {}),
    [accounts],
  );

  const salaryTotals = useMemo(() => {
    const additions =
      toNumber(formData.basic) +
      toNumber(formData.hra) +
      toNumber(formData.specialAllowance) +
      toNumber(formData.variablePay) +
      toNumber(formData.bonus);
    const gross = toNumber(formData.grossSalary) || additions;
    const deductions =
      toNumber(formData.pf) +
      toNumber(formData.professionalTax) +
      toNumber(formData.incomeTax) +
      toNumber(formData.insurance) +
      toNumber(formData.tds);
    const net = Math.max(gross - deductions, 0);

    return { gross, deductions, net };
  }, [formData]);

  const selectedDepositAccount = accountMap[formData.accountId];
  const depositAmount =
    formData.source === "Salary"
      ? salaryTotals.net
      : toNumber(formData.amount);
  const balanceAfterCredit =
    toNumber(selectedDepositAccount?.balance) + depositAmount;

  const filteredIncomes = useMemo(
    () =>
      incomes.filter((income) => {
        const date = new Date(income.incomeDate);
        const accountName =
          accountMap[income.accountId]?.name || income.accountName || "";
        const searchTarget = [
          income.source,
          income.category,
          income.note,
          income.employer,
          accountName,
          income.paymentMode,
        ]
          .join(" ")
          .toLowerCase();

        return (
          (filters.month === "all" ||
            date.getMonth() + 1 === Number(filters.month)) &&
          (filters.year === "all" ||
            date.getFullYear() === Number(filters.year)) &&
          (filters.account === "all" || income.accountId === filters.account) &&
          (filters.source === "all" || income.source === filters.source) &&
          (filters.paymentMode === "all" ||
            income.paymentMode === filters.paymentMode) &&
          (filters.recurring === "all" ||
            String(Boolean(income.isRecurring)) === filters.recurring) &&
          searchTarget.includes(filters.search.toLowerCase())
        );
      }),
    [accountMap, filters, incomes],
  );

  const analytics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const salaryEntries = incomes
      .filter((income) => income.source === "Salary")
      .sort((a, b) => new Date(b.incomeDate) - new Date(a.incomeDate));
    const totalIncome = incomes.reduce(
      (sum, income) => sum + getIncomeAmount(income),
      0,
    );
    const monthlyIncome = incomes
      .filter((income) => {
        const date = new Date(income.incomeDate);
        return (
          date.getMonth() === currentMonth && date.getFullYear() === currentYear
        );
      })
      .reduce((sum, income) => sum + getIncomeAmount(income), 0);
    const recurringIncome = incomes
      .filter((income) => income.isRecurring)
      .reduce((sum, income) => sum + getIncomeAmount(income), 0);
    const passiveIncome = incomes
      .filter((income) =>
        ["Rental", "Investments", "Interest", "Dividend"].includes(
          income.source,
        ),
      )
      .reduce((sum, income) => sum + getIncomeAmount(income), 0);
    const salaryIncome = incomes
      .filter((income) => income.source === "Salary")
      .reduce((sum, income) => sum + getIncomeAmount(income), 0);
    const variableIncome = incomes
      .filter((income) => !income.isRecurring || income.source === "Bonus")
      .reduce((sum, income) => sum + getIncomeAmount(income), 0);
    const averageMonthlyIncome = incomes.length
      ? Math.round(totalIncome / Math.max(new Set(incomes.map((income) => {
          const date = new Date(income.incomeDate);
          return `${date.getFullYear()}-${date.getMonth()}`;
        })).size, 1))
      : 0;
    const salaryDependency = totalIncome
      ? Math.round((salaryIncome / totalIncome) * 100)
      : 0;
    const sourceCount = new Set(incomes.map((income) => income.source)).size;
    const diversificationScore = Math.min(10, sourceCount * 1.7).toFixed(1);
    const annualIncome = Math.max(averageMonthlyIncome * 12, totalIncome);
    const expectedSavings = Math.round(annualIncome * 0.39);
    const expectedInvestments = Math.round(annualIncome * 0.17);
    const latestSalary = salaryEntries[0];
    const annualCtc = latestSalary?.grossSalary
      ? Number(latestSalary.grossSalary) * 12
      : annualIncome;
    const latestSalaryDate = latestSalary?.incomeDate
      ? new Date(latestSalary.incomeDate)
      : null;
    const expectedNextSalary = latestSalaryDate
      ? new Date(
          now.getFullYear(),
          now.getMonth() + (now.getDate() >= latestSalaryDate.getDate() ? 1 : 0),
          latestSalaryDate.getDate(),
        )
      : null;
    const salaryGrowth =
      salaryEntries.length > 1
        ? Math.round(
            ((getIncomeAmount(salaryEntries[0]) -
              getIncomeAmount(salaryEntries[salaryEntries.length - 1])) /
              Math.max(getIncomeAmount(salaryEntries[salaryEntries.length - 1]), 1)) *
              1000,
          ) / 10
        : 0;
    const sipIncrease = Math.max(
      0,
      Math.round((averageMonthlyIncome - monthlyIncome * 0.6) * 0.08),
    );

    return {
      totalIncome,
      monthlyIncome,
      recurringIncome,
      passiveIncome,
      salaryIncome,
      variableIncome,
      averageMonthlyIncome,
      salaryDependency,
      diversificationScore,
      annualIncome,
      expectedSavings,
      expectedInvestments,
      expectedNextSalary,
      annualCtc,
      netSalary: latestSalary?.netSalary || latestSalary?.amount || 0,
      salaryCreditDay: latestSalaryDate?.getDate(),
      salaryGrowth,
      sipIncrease,
    };
  }, [incomes]);

  const growthData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const total = incomes
        .filter((income) => {
          const incomeDate = new Date(income.incomeDate);
          return (
            incomeDate.getMonth() === date.getMonth() &&
            incomeDate.getFullYear() === date.getFullYear()
          );
        })
        .reduce((sum, income) => sum + getIncomeAmount(income), 0);

      return {
        month: date.toLocaleString("en-IN", { month: "short" }),
        income: total,
      };
    });
  }, [incomes]);

  const sourceData = useMemo(
    () =>
      incomeSources
        .map((source) => ({
          name: source,
          value: incomes
            .filter((income) => income.source === source)
            .reduce((sum, income) => sum + getIncomeAmount(income), 0),
        }))
        .filter((item) => item.value > 0),
    [incomes],
  );

  const timelineItems = useMemo(
    () =>
      incomeSources
        .map((source) => ({
          source,
          amount: incomes
            .filter((income) => income.source === source)
            .reduce((sum, income) => sum + getIncomeAmount(income), 0),
        }))
        .filter((item) => item.amount > 0)
        .slice(0, 5),
    [incomes],
  );

  const upcomingIncomeItems = useMemo(
    () =>
      incomes
        .filter((income) => income.isRecurring || income.source === "Salary")
        .map((income) => ({
          id: income._id,
          source: income.source,
          date: getRecurringDay(income),
        }))
        .filter((item) => item.date)
        .sort((a, b) => a.date - b.date)
        .slice(0, 5),
    [incomes],
  );

  const recentIncomeSources = useMemo(
    () =>
      [...incomes]
        .sort((a, b) => new Date(b.incomeDate) - new Date(a.incomeDate))
        .slice(0, 6),
    [incomes],
  );

  const hasIncomeData = incomes.length > 0;
  const hasChartData = sourceData.length > 0;

  const openAddModal = () => {
    setEditingIncome(null);
    setFormData({
      ...createEmptyForm(),
      accountId: accounts[0]?._id || "",
    });
    setShowModal(true);
  };

  const openEditModal = (income) => {
    const date = income.incomeDate ? new Date(income.incomeDate) : new Date();

    setEditingIncome(income);
    setFormData({
      ...createEmptyForm(),
      ...income,
      amount: String(income.amount || income.netSalary || ""),
      grossSalary: String(income.grossSalary || ""),
      basic: String(income.basic || ""),
      hra: String(income.hra || ""),
      specialAllowance: String(income.specialAllowance || ""),
      variablePay: String(income.variablePay || ""),
      bonus: String(income.bonus || ""),
      pf: String(income.pf || ""),
      professionalTax: String(income.professionalTax || ""),
      incomeTax: String(income.incomeTax || ""),
      insurance: String(income.insurance || ""),
      tds: String(income.tds || ""),
      netSalary: String(income.netSalary || income.amount || ""),
      attachments: Array.isArray(income.attachments)
        ? income.attachments.join(", ")
        : income.attachments || "",
      accountId: income.accountId || accounts[0]?._id || "",
      date: date.toISOString().split("T")[0],
      time: date.toTimeString().slice(0, 5),
    });
    setShowModal(true);
  };

  const handleSaveIncome = async () => {
    try {
      if (!formData.accountId) {
        alert("Please select deposit account");
        return;
      }

      if (depositAmount <= 0) {
        alert("Please enter a valid income amount");
        return;
      }

      const incomeDate = new Date(`${formData.date}T${formData.time}`);
      const isSalary = formData.source === "Salary";
      const payload = {
        userId: getUserId(),
        source: formData.source,
        category: formData.category || formData.source,
        accountId: formData.accountId,
        amount: isSalary ? salaryTotals.net : toNumber(formData.amount),
        paymentMode: formData.paymentMode,
        employer: formData.employer,
        isRecurring: Boolean(formData.isRecurring),
        recurringType: formData.isRecurring ? formData.recurringType : undefined,
        salaryMonth: isSalary ? Number(formData.salaryMonth) : undefined,
        salaryYear: isSalary ? Number(formData.salaryYear) : undefined,
        grossSalary: isSalary ? salaryTotals.gross : undefined,
        basic: isSalary ? toNumber(formData.basic) : undefined,
        hra: isSalary ? toNumber(formData.hra) : undefined,
        specialAllowance: isSalary
          ? toNumber(formData.specialAllowance)
          : undefined,
        variablePay: isSalary ? toNumber(formData.variablePay) : undefined,
        bonus: toNumber(formData.bonus),
        pf: isSalary ? toNumber(formData.pf) : undefined,
        professionalTax: isSalary
          ? toNumber(formData.professionalTax)
          : undefined,
        incomeTax: isSalary ? toNumber(formData.incomeTax) : undefined,
        insurance: isSalary ? toNumber(formData.insurance) : undefined,
        tds: isSalary ? toNumber(formData.tds) : undefined,
        netSalary: isSalary ? salaryTotals.net : undefined,
        attachments: formData.attachments
          ? formData.attachments.split(",").map((item) => item.trim())
          : [],
        note: formData.note,
        incomeDate,
      };

      if (editingIncome) {
        await updateIncome(editingIncome._id, payload);
      } else {
        await createIncome(payload);
      }

      setShowModal(false);
      setEditingIncome(null);
      await loadIncomePage();
    } catch (error) {
      console.error("Income Save Error:", error);
      alert(error?.response?.data?.message || "Failed to save income");
    }
  };

  const handleDeleteIncome = async (id) => {
    try {
      await deleteIncome(id);
      await loadIncomePage();
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to delete income");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] items-center justify-center text-slate-300">
          Loading Income...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-950 text-white">
        <section className="mb-6 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-lg border border-emerald-400/20 bg-slate-900 p-5 shadow-2xl shadow-emerald-950/20">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                  Hero Dashboard
                </p>
                <h1 className="mt-2 text-3xl font-bold leading-tight lg:text-4xl">
                  Income Command Center
                </h1>
              </div>
              <button
                onClick={openAddModal}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
              >
                <FiPlus />
                Add Income
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Annual Income (CTC)", money(analytics.annualCtc)],
                ["Net Salary", `${money(analytics.netSalary)}/month`],
                ["Income This Month", money(analytics.monthlyIncome)],
                [
                  "Expected Next Salary",
                  analytics.expectedNextSalary
                    ? formatDayMonth(analytics.expectedNextSalary)
                    : "Add salary",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                >
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-2 break-words text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">AI Suggestions</p>
            <div className="mt-4 space-y-3 text-sm">
              <p>
                {analytics.salaryCreditDay
                  ? `Salary credited around day ${analytics.salaryCreditDay} of every month.`
                  : "Add a salary entry to estimate your next salary date."}
              </p>
              <p>Average Monthly Income {money(analytics.averageMonthlyIncome)}</p>
              <p>
                {analytics.sipIncrease > 0
                  ? `You can safely increase your SIP by ${money(analytics.sipIncrease)}.`
                  : "SIP increase suggestion will appear after monthly income builds up."}
              </p>
              <p>Expected Annual Savings {shortMoney(analytics.expectedSavings)}</p>
              <div className="grid gap-2 pt-2 sm:grid-cols-2">
                <span className="rounded-lg bg-emerald-500/10 p-3 text-emerald-200">
                  Salary growth {analytics.salaryGrowth}%
                </span>
                <span className="rounded-lg bg-cyan-500/10 p-3 text-cyan-200">
                  Passive income {analytics.totalIncome
                    ? Math.round((analytics.passiveIncome / analytics.totalIncome) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Total Income", analytics.totalIncome, "text-emerald-300"],
            ["Recurring Income", analytics.recurringIncome, "text-cyan-300"],
            ["Passive Income", analytics.passiveIncome, "text-violet-300"],
            ["Variable Income", analytics.variableIncome, "text-amber-300"],
            ["Salary Dependency", `${analytics.salaryDependency}%`, "text-rose-300"],
          ].map(([label, value, color]) => (
            <div
              key={label}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className={`mt-2 break-words text-2xl font-bold ${color}`}>
                {typeof value === "number" ? money(value) : value}
              </p>
            </div>
          ))}
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-white/10 bg-slate-900 p-5">
            <div className="flex items-center gap-2">
              <FiTrendingUp className="text-emerald-300" />
              <h2 className="text-xl font-bold">Beautiful Analytics Cards</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {incomeSources.slice(0, 9).map((source) => {
                const total = incomes
                  .filter((income) => income.source === source)
                  .reduce((sum, income) => sum + getIncomeAmount(income), 0);
                return (
                  <button
                    key={source}
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, source }))
                    }
                    className="rounded-lg border border-white/10 bg-slate-800/70 p-4 text-left hover:border-emerald-300/60"
                  >
                    <p className="text-sm text-slate-400">{source}</p>
                    <p className="mt-2 break-words text-lg font-semibold">
                      {money(total)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Income Insights</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Recurring Income", analytics.recurringIncome],
                ["Passive Income", analytics.passiveIncome],
                ["Variable Income", analytics.variableIncome],
                ["Salary Dependency", `${analytics.salaryDependency}%`],
                ["Diversification Score", `${analytics.diversificationScore} / 10`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg bg-slate-800/80 p-4"
                >
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-2 break-words text-xl font-bold">
                    {typeof value === "number" ? money(value) : value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Salary Calculator</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["CTC / Gross Salary", "grossSalary"],
                ["Basic", "basic"],
                ["HRA", "hra"],
                ["PF", "pf"],
                ["Professional Tax", "professionalTax"],
                ["Bonus", "bonus"],
                ["Insurance", "insurance"],
                ["Income Tax", "incomeTax"],
              ].map(([label, key]) => (
                <label key={key} className="text-sm text-slate-300">
                  {label}
                  <input
                    type="number"
                    value={formData[key]}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        [key]: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 p-3 text-white"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-emerald-500/10 p-4">
                <p className="text-sm text-emerald-200">Gross Salary</p>
                <p className="break-words text-2xl font-bold">{money(salaryTotals.gross)}</p>
              </div>
              <div className="rounded-lg bg-rose-500/10 p-4">
                <p className="text-sm text-rose-200">Deductions</p>
                <p className="break-words text-2xl font-bold">{money(salaryTotals.deductions)}</p>
              </div>
              <div className="rounded-lg bg-cyan-500/10 p-4">
                <p className="text-sm text-cyan-200">Net Salary</p>
                <p className="break-words text-2xl font-bold">{money(salaryTotals.net)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Account Integration</h2>
            <div className="mt-4 rounded-lg bg-slate-800/80 p-4">
              <p className="text-sm text-slate-400">Salary</p>
              <p className="mt-1 break-words text-3xl font-bold text-emerald-300">
                {money(depositAmount)}
              </p>
              <div className="my-4 h-px bg-white/10" />
              <label className="text-sm text-slate-300">
                Deposit To
                <select
                  value={formData.accountId}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      accountId: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 p-3"
                >
                  <option value="">Select Account</option>
                  {accounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-400">Current Balance</p>
                  <p className="break-words text-xl font-bold">
                    {money(selectedDepositAccount?.balance || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Balance After Credit</p>
                  <p className="break-words text-xl font-bold text-emerald-300">
                    {money(balanceAfterCredit)}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-400">Live preview</p>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Monthly Income Timeline</h2>
            <p className="mt-1 text-sm text-slate-400">
              {monthNames[new Date().getMonth()]}
            </p>
            <div className="mt-4 space-y-3">
              {timelineItems.length > 0 ? (
                timelineItems.map((item) => (
                <div
                  key={item.source}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span>{item.source}</span>
                  <span className="font-semibold text-emerald-300">
                    {money(item.amount)}
                  </span>
                </div>
                ))
              ) : (
                <p className="rounded-lg bg-slate-800 p-3 text-sm text-slate-400">
                  Add income to build the monthly timeline.
                </p>
              )}
              <div className="border-t border-white/10 pt-3 font-bold">
                Total {money(analytics.monthlyIncome)}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Income Calendar</h2>
            <div className="mt-4 space-y-3">
              {upcomingIncomeItems.length > 0 ? (
                upcomingIncomeItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-800 p-3"
                  >
                    <span>{item.source}</span>
                    <span className="text-slate-300">
                      {formatDayMonth(item.date)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-slate-800 p-3 text-sm text-slate-400">
                  Recurring income dates will appear here.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Annual Projection</h2>
            <div className="mt-4 space-y-3">
              {[
                ["Expected Income", analytics.annualIncome],
                ["Expected Savings", analytics.expectedSavings],
                ["Expected Investments", analytics.expectedInvestments],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="text-slate-400">{label}</span>
                  <span className="break-words text-xl font-bold">
                    {money(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-lg border border-white/10 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Income Sources</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recentIncomeSources.length > 0 ? (
              recentIncomeSources.map((income) => (
              <div
                key={income._id}
                className="rounded-lg border border-white/10 bg-slate-800/80 p-4"
              >
                <p className="text-lg font-semibold">{income.source}</p>
                <p className="mt-1 break-words text-2xl font-bold text-emerald-300">
                  {money(getIncomeAmount(income))}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {income.isRecurring ? income.recurringType || "Recurring" : "One Time"} |{" "}
                  {accountMap[income.accountId]?.name || "No account"}
                </p>
                <button
                  onClick={() => openEditModal(income)}
                  className="mt-4 flex items-center gap-2 text-sm text-cyan-300"
                >
                  <FiEdit2 />
                  Edit
                </button>
              </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-white/15 bg-slate-800/50 p-5 text-sm text-slate-400 md:col-span-3">
                Add your first income source to see dynamic source cards here.
              </div>
            )}
          </div>
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Income Growth</h2>
            <div className="mt-4 h-64 sm:h-72">
              {hasIncomeData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData}>
                    <CartesianGrid stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" width={54} />
                    <Tooltip
                      formatter={(value) => money(value)}
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#22c55e"
                      fill="#22c55e"
                      fillOpacity={0.22}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg bg-slate-800/60 p-4 text-center text-sm text-slate-400">
                  Add dated income records to generate the growth chart.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Income Sources Chart</h2>
            <div className="mt-4 grid min-h-64 gap-4 md:h-72 md:grid-cols-2">
              {hasChartData ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={85}
                      >
                        {sourceData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={chartColors[index % chartColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => money(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceData.slice(0, 5)}>
                      <CartesianGrid stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" width={54} />
                      <Tooltip formatter={(value) => money(value)} />
                      <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="flex min-h-64 items-center justify-center rounded-lg bg-slate-800/60 p-4 text-center text-sm text-slate-400 md:col-span-2">
                  Add income sources to compare salary, business, freelancing,
                  rental, and interest income.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-lg border border-white/10 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <FiFilter className="text-cyan-300" />
            <h2 className="text-xl font-bold">Filters</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            <select
              value={filters.month}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, month: event.target.value }))
              }
              className="rounded-lg border border-white/10 bg-slate-800 p-3"
            >
              <option value="all">Month</option>
              {monthNames.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={filters.year}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, year: event.target.value }))
              }
              className="rounded-lg border border-white/10 bg-slate-800 p-3"
            >
              <option value="all">Year</option>
              {[2024, 2025, 2026, 2027].map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
            <select
              value={filters.account}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, account: event.target.value }))
              }
              className="rounded-lg border border-white/10 bg-slate-800 p-3"
            >
              <option value="all">Account</option>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
            <select
              value={filters.source}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, source: event.target.value }))
              }
              className="rounded-lg border border-white/10 bg-slate-800 p-3"
            >
              <option value="all">Income Source</option>
              {incomeSources.map((source) => (
                <option key={source}>{source}</option>
              ))}
            </select>
            <select
              value={filters.paymentMode}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  paymentMode: event.target.value,
                }))
              }
              className="rounded-lg border border-white/10 bg-slate-800 p-3"
            >
              <option value="all">Payment Mode</option>
              {paymentModes.map((mode) => (
                <option key={mode}>{mode}</option>
              ))}
            </select>
            <select
              value={filters.recurring}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  recurring: event.target.value,
                }))
              }
              className="rounded-lg border border-white/10 bg-slate-800 p-3"
            >
              <option value="all">Recurring</option>
              <option value="true">Recurring</option>
              <option value="false">One Time</option>
            </select>
            <div className="relative">
              <FiSearch className="absolute left-3 top-3.5 text-slate-400" />
              <input
                value={filters.search}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: event.target.value,
                  }))
                }
                placeholder="Search"
                className="w-full rounded-lg border border-white/10 bg-slate-800 py-3 pl-10 pr-3"
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-900">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <h2 className="text-xl font-bold">Income Table</h2>
            <span className="text-sm text-slate-400">
              {filteredIncomes.length} records
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="bg-slate-800/70 text-left text-sm text-slate-300">
                  <th className="p-4">Date</th>
                  <th className="p-4">Account</th>
                  <th className="p-4">Source</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Recurring</th>
                  <th className="p-4">Payment Mode</th>
                  <th className="p-4">Employer</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncomes.length > 0 ? (
                  filteredIncomes.map((income) => (
                    <tr key={income._id} className="border-t border-white/5">
                      <td className="p-4">{formatDate(income.incomeDate)}</td>
                      <td className="p-4">
                        {accountMap[income.accountId]?.name || "-"}
                      </td>
                      <td className="p-4">{income.source}</td>
                      <td className="p-4">{income.category || income.source}</td>
                      <td className="p-4">
                        {income.isRecurring ? income.recurringType || "Yes" : "No"}
                      </td>
                      <td className="p-4">{income.paymentMode || "-"}</td>
                      <td className="p-4">{income.employer || "-"}</td>
                      <td className="p-4 font-semibold text-emerald-300">
                        {money(getIncomeAmount(income))}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200">
                          <FiCheckCircle />
                          Credited
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-3">
                          <button
                            onClick={() => openEditModal(income)}
                            className="text-cyan-300 hover:text-cyan-200"
                            title="Edit"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => handleDeleteIncome(income._id)}
                            className="text-rose-300 hover:text-rose-200"
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="p-10 text-center text-slate-400">
                      No Income Found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">
                  {editingIncome ? "Edit Income" : "Add Income"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg bg-slate-800 px-3 py-2"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm text-slate-300">
                  Source
                  <select
                    value={formData.source}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        source: event.target.value,
                        category: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg bg-slate-800 p-3"
                  >
                    {incomeSources.map((source) => (
                      <option key={source}>{source}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-slate-300">
                  Category
                  <select
                    value={formData.category}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg bg-slate-800 p-3"
                  >
                    {incomeSources.map((source) => (
                      <option key={source}>{source}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-slate-300">
                  Amount
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        amount: event.target.value,
                      }))
                    }
                    disabled={formData.source === "Salary"}
                    className="mt-1 w-full rounded-lg bg-slate-800 p-3 disabled:opacity-60"
                  />
                </label>

                <label className="text-sm text-slate-300">
                  Account
                  <select
                    value={formData.accountId}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        accountId: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg bg-slate-800 p-3"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((account) => (
                      <option key={account._id} value={account._id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-slate-300">
                  Payment Mode
                  <select
                    value={formData.paymentMode}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentMode: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg bg-slate-800 p-3"
                  >
                    {paymentModes.map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-slate-300">
                  Employer
                  <input
                    value={formData.employer}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        employer: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg bg-slate-800 p-3"
                  />
                </label>

                <label className="text-sm text-slate-300">
                  Date
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        date: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg bg-slate-800 p-3"
                  />
                </label>

                <label className="text-sm text-slate-300">
                  Time
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        time: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg bg-slate-800 p-3"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-lg bg-slate-800 p-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        isRecurring: event.target.checked,
                      }))
                    }
                  />
                  Recurring Income
                </label>

                {formData.isRecurring && (
                  <label className="text-sm text-slate-300">
                    Recurring Type
                    <select
                      value={formData.recurringType}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          recurringType: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg bg-slate-800 p-3"
                    >
                      {recurringTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="text-sm text-slate-300 md:col-span-2">
                  Attachments
                  <input
                    value={formData.attachments}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        attachments: event.target.value,
                      }))
                    }
                    placeholder="Comma separated links"
                    className="mt-1 w-full rounded-lg bg-slate-800 p-3"
                  />
                </label>

                <label className="text-sm text-slate-300 md:col-span-3">
                  Note
                  <input
                    value={formData.note}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        note: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg bg-slate-800 p-3"
                  />
                </label>
              </div>

              {formData.source === "Salary" && (
                <div className="mt-5 rounded-lg border border-white/10 bg-slate-950 p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <FiCalendar className="text-emerald-300" />
                    <h3 className="text-lg font-bold">Salary Breakdown</h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    {[
                      ["Gross Salary", "grossSalary"],
                      ["Basic", "basic"],
                      ["HRA", "hra"],
                      ["Special Allowance", "specialAllowance"],
                      ["Variable Pay", "variablePay"],
                      ["Bonus", "bonus"],
                      ["PF", "pf"],
                      ["Professional Tax", "professionalTax"],
                      ["Income Tax", "incomeTax"],
                      ["Insurance", "insurance"],
                      ["TDS", "tds"],
                      ["Net Salary", "netSalary"],
                    ].map(([label, key]) => (
                      <label key={key} className="text-sm text-slate-300">
                        {label}
                        <input
                          type="number"
                          value={key === "netSalary" ? salaryTotals.net : formData[key]}
                          disabled={key === "netSalary"}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              [key]: event.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg bg-slate-800 p-3 disabled:opacity-70"
                        />
                      </label>
                    ))}
                    <label className="text-sm text-slate-300">
                      Salary Month
                      <select
                        value={formData.salaryMonth}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            salaryMonth: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg bg-slate-800 p-3"
                      >
                        {monthNames.map((month, index) => (
                          <option key={month} value={index + 1}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-slate-300">
                      Salary Year
                      <input
                        type="number"
                        value={formData.salaryYear}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            salaryYear: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg bg-slate-800 p-3"
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-lg bg-slate-800 p-4">
                <p className="text-sm text-slate-400">Balance After Credit</p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">
                  {money(balanceAfterCredit)}
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg bg-slate-700 px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveIncome}
                  className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
