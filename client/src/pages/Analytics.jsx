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

    const [currentDate, setCurrentDate] =
        useState(new Date());

    const loadData = async () => {
        try {
            const userId =
                getUserId();

            if (!userId) {
                setLoading(false);
                return;
            }

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

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[70vh]">
                    <h2 className="text-2xl font-semibold text-slate-400">
                        Loading Analytics...
                    </h2>
                </div>
            </DashboardLayout>
        );
    }

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

    const year =
        currentDate.getFullYear();

    const month =
        currentDate.getMonth();

    const handlePrevMonth = () => {
        setCurrentDate(
            new Date(year, month - 1, 1)
        );
    };

    const handleNextMonth = () => {
        setCurrentDate(
            new Date(year, month + 1, 1)
        );
    };

    const sortedDays =
        Object.entries(expensesByDate)
            .sort((a, b) => b[1] - a[1]);

    const highestDay =
        sortedDays[0] || [null, 0];

    const lowestDay =
        sortedDays.length
            ? [...sortedDays].sort((a, b) => a[1] - b[1])[0]
            : [null, 0];

    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();

    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();

    const calendarCells =
        [
            ...Array(firstDay).fill(
                null
            ),
            ...Array.from(
                {
                    length:
                        daysInMonth,
                },
                (_, i) => i + 1
            ),
        ];

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

    const monthlyExpenses =
        expenses.filter(
            (expense) => {
                const date =
                    new Date(
                        expense.expenseDate
                    );

                return (
                    date.getMonth() ===
                    month &&
                    date.getFullYear() ===
                    year
                );
            }
        );

    const getAmountForDay =
        (day) => {
            const dateKey =
                `${year}-${String(
                    month + 1
                ).padStart(
                    2,
                    "0"
                )}-${String(day).padStart(
                    2,
                    "0"
                )}`;

            return (
                expensesByDate[
                dateKey
                ] || 0
            );
        };

    const getCellColor =
        (amount) => {
            if (amount === 0)
                return "bg-slate-800";

            if (amount < 500)
                return "bg-green-500/20";

            if (amount < 1000)
                return "bg-yellow-500/20";

            if (amount < 3000)
                return "bg-orange-500/20";

            return "bg-red-500/20";
        };

    return (
        <DashboardLayout>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-6">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={handlePrevMonth}
                        className="px-4 py-2 bg-slate-800 rounded-xl"
                    >
                        ←
                    </button>

                    <h2 className="text-2xl font-bold">
                        {currentDate.toLocaleString(
                            "default",
                            {
                                month: "long",
                                year: "numeric",
                            }
                        )}
                    </h2>

                    <button
                        onClick={handleNextMonth}
                        className="px-4 py-2 bg-slate-800 rounded-xl"
                    >
                        →
                    </button>
                </div>
                <h3 className="text-xl font-semibold mb-5">
                    Spending Calendar
                </h3>

                <h2 className="text-2xl font-bold">
                    {currentDate.toLocaleString(
                        "default",
                        {
                            month: "long",
                            year: "numeric",
                        }
                    )}
                </h2>

                <div className="grid grid-cols-7 gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (day) => (
                            <div
                                key={day}
                                className="text-center font-semibold text-slate-400"
                            >
                                {day}
                            </div>
                        )
                    )}

                    {calendarCells.map((day, index) => {
                        if (!day) {
                            return (
                                <div
                                    key={index}
                                    className="h-20"
                                />
                            );
                        }

                        const amount =
                            getAmountForDay(day);

                        const dateKey =
                            `${year}-${String(
                                month + 1
                            ).padStart(2, "0")}-${String(
                                day
                            ).padStart(2, "0")}`;

                        return (
                            <div
                                key={day}
                                onClick={() =>
                                    setSelectedDate(dateKey)
                                }
                                className={`h-20 rounded-xl cursor-pointer p-2 border border-white/10 ${getCellColor(
                                    amount
                                )}`}
                            >
                                <div className="font-semibold">
                                    {day}
                                </div>

                                <div className="text-xs mt-2">
                                    ₹{amount}
                                </div>
                            </div>
                        );
                    })}
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