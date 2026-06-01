import DashboardLayout from "../components/layout/DashboardLayout";
import {
    getExpensesByUser,
} from "../services/expenseService";

import {
    getBudgetByUser,
} from "../services/budgetService";

import { getUserId } from "../utils/auth";

import {
    useEffect,
    useState,
} from "react";




export default function Analytics() {

    const [expenses, setExpenses] =
        useState([]);

    const [budget, setBudget] =
        useState(null);

    const [
        selectedDate,
        setSelectedDate,
    ] = useState(null);

    const [loading, setLoading] =
        useState(true);

    const loadData = async () => {
        try {
            const userId =
                getUserId();

            const expenseRes =
                await getExpensesByUser(
                    userId
                );

            const budgetRes =
                await getBudgetByUser(
                    userId
                );

            setExpenses(
                expenseRes.data || []
            );

            setBudget(
                budgetRes.data?.[0] ||
                null
            );
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const categorySummary =
        {};
    expenses.forEach((expense) => {
        categorySummary[expense.category] =
            (categorySummary[
                expense.category
            ] || 0) +
            expense.amount;
    });

    const categoryUtilization =
        (
            budget?.categories ||
            []
        ).map(
            (category) => {
                const spent =
                    expenses
                        .filter(
                            (
                                expense
                            ) =>
                                expense.category
                                    ?.toLowerCase()
                                    .trim() ===
                                category.name
                                    ?.toLowerCase()
                                    .trim()
                        )
                        .reduce(
                            (
                                sum,
                                expense
                            ) =>
                                sum +
                                expense.amount,
                            0
                        );

                const percentage =
                    category.limit >
                        0
                        ? Math.round(
                            (spent /
                                category.limit) *
                            100
                        )
                        : 0;

                return {
                    ...category,

                    spent,

                    percentage,

                    remaining:
                        category.limit -
                        spent,

                    isOverBudget:
                        spent >
                        category.limit,
                };
            }
        );

    const expensesByDate = {};
    expenses.forEach((expense) => {
        const date = new Date(
            expense.expenseDate
        )
            .toISOString()
            .split("T")[0];

        expensesByDate[date] =
            (expensesByDate[date] || 0) +
            expense.amount;
    });

    const today = new Date();

    const year =
        today.getFullYear();

    const month =
        today.getMonth();

    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();

    const sortedDays =
        Object.entries(expensesByDate)
            .sort((a, b) => b[1] - a[1]);

    const highestDay =
        sortedDays[0] || [null, 0];

    const lowestDay =
        sortedDays.length
            ? [...sortedDays].sort((a, b) => a[1] - b[1])[0]
            : [null, 0];

    const calendarDays =
        Array.from(
            {
                length:
                    daysInMonth,
            },
            (_, index) =>
                index + 1
        );

    const getCellColor = (
        amount
    ) => {
        if (!amount)
            return "bg-slate-800";

        if (amount < 500)
            return "bg-green-500/20";

        if (amount < 1500)
            return "bg-yellow-500/20";

        return "bg-red-500/20";
    };

    const selectedExpenses = expenses.filter(
        (expense) =>
            new Date(expense.expenseDate)
                .toISOString()
                .split("T")[0] === selectedDate
    );

    const totalSpent =
        expenses.reduce(
            (sum, expense) =>
                sum + expense.amount,
            0
        );

    const totalBudget =
        budget?.totalBudget ||
        0;


    const remaining = Math.max(
        0,
        totalBudget - totalSpent
    );

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[70vh]">
                    Loading Analytics...
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="grid md:grid-cols-3 gap-5 mb-6">

                <div className="bg-white/5 rounded-2xl p-5">
                    <p>Total Budget</p>
                    <h2>
                        ₹{totalBudget.toLocaleString()}
                    </h2>
                </div>

                <div className="bg-white/5 rounded-2xl p-5">
                    <p>Total Spent</p>
                    <h2>
                        ₹{totalSpent.toLocaleString()}
                    </h2>
                </div>

                <div className="bg-white/5 rounded-2xl p-5">
                    <p>Remaining</p>
                    <h2>
                        ₹{remaining.toLocaleString()}
                    </h2>
                </div>

            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-semibold mb-4">
                    Category Breakdown
                </h3>

                {Object.entries(categorySummary)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, amount]) => {
                        const percentage =
                            totalSpent > 0
                                ? Math.round(
                                    (amount /
                                        totalSpent) *
                                    100
                                )
                                : 0;

                        return (
                            <div
                                key={category}
                                className="mb-4"
                            >
                                <div className="flex justify-between">
                                    <span>
                                        {category}
                                    </span>

                                    <span>
                                        ₹{amount}
                                    </span>
                                </div>

                                <div className="w-full bg-slate-700 h-2 rounded-full mt-2">
                                    <div
                                        className="bg-indigo-500 h-2 rounded-full"
                                        style={{
                                            width: `${percentage}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-semibold mb-6">
                    Budget Utilization
                </h3>

                <div className="space-y-5">
                    {categoryUtilization.map(
                        (item) => (
                            <div
                                key={item.name}
                            >
                                <div className="flex justify-between mb-2">
                                    <span>
                                        {item.name}
                                    </span>

                                    <span>
                                        ₹
                                        {item.spent}
                                        /
                                        ₹
                                        {item.limit}
                                    </span>
                                </div>

                                <div className="w-full bg-slate-700 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full ${item.isOverBudget
                                            ? "bg-red-500"
                                            : "bg-green-500"
                                            }`}
                                        style={{
                                            width: `${Math.min(
                                                item.percentage,
                                                100
                                            )}%`,
                                        }}
                                    />
                                </div>

                                <div className="flex justify-between mt-2 text-sm">
                                    <span>
                                        {
                                            item
                                                .percentage
                                        }
                                        %
                                    </span>

                                    <span
                                        className={
                                            item.isOverBudget
                                                ? "text-red-400"
                                                : "text-green-400"
                                        }
                                    >
                                        {item.isOverBudget
                                            ? `Over by ₹${(
                                                item.spent -
                                                item.limit
                                            ).toLocaleString()}`
                                            : `₹${item.remaining.toLocaleString()} left`}
                                    </span>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-6">
                <h3 className="text-xl font-semibold mb-5">
                    Spending Calendar
                </h3>

                <div className="grid grid-cols-7 gap-3">
                    {calendarDays.map(
                        (day) => {
                            const dateKey =
                                `${year}-${String(
                                    month + 1
                                ).padStart(
                                    2,
                                    "0"
                                )}-${String(
                                    day
                                ).padStart(
                                    2,
                                    "0"
                                )}`;

                            const amount =
                                expensesByDate[
                                dateKey
                                ] || 0;

                            return (
                                <div
                                    key={day}
                                    className={`p-3 rounded-xl border border-white/10 ${getCellColor(
                                        amount
                                    )}`} onClick={() =>
                                        setSelectedDate(
                                            dateKey
                                        )
                                    }
                                >
                                    <div className="font-semibold" >
                                        {day}
                                    </div>

                                    <div className="text-xs mt-2">
                                        ₹
                                        {amount.toLocaleString()}
                                    </div>
                                </div>
                            );
                        }
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">

                <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-slate-400">
                        Highest Spending Day
                    </p>

                    <h3 className="text-red-400 text-xl font-bold">
                        ₹
                        {highestDay?.[1] ||
                            0}
                    </h3>
                </div>

                <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-slate-400">
                        Lowest Spending Day
                    </p>

                    <h3 className="text-green-400 text-xl font-bold">
                        ₹
                        {lowestDay?.[1] ||
                            0}
                    </h3>
                </div>

            </div>

            {
                selectedDate && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-slate-900 rounded-2xl p-6 w-[500px]">
                            <h3 className="text-xl font-bold mb-4">
                                {selectedDate}
                            </h3>

                            {selectedExpenses.length === 0 ? (
                                <p className="text-slate-400">
                                    No expenses on this day
                                </p>
                            ) : selectedExpenses.map(
                                (
                                    expense
                                ) => (
                                    <div
                                        key={
                                            expense._id
                                        }
                                        className="flex justify-between py-2"
                                    >
                                        <span>
                                            {
                                                expense.category
                                            }
                                        </span>

                                        <span>
                                            ₹
                                            {
                                                expense.amount
                                            }
                                        </span>
                                    </div>
                                )
                            )}

                            <button
                                onClick={() =>
                                    setSelectedDate(
                                        null
                                    )
                                }
                                className="mt-4 px-4 py-2 bg-indigo-600 rounded-xl"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )
            }


        </DashboardLayout>
    );
}