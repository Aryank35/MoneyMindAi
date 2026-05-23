import DashboardLayout from "../components/layout/DashboardLayout";
import {
  FiPlus,
  FiTarget,
  FiCheckCircle,
} from "react-icons/fi";

const goals = [
  {
    id: 1,
    emoji: "🏍️",
    title: "Royal Enfield Hunter",
    targetAmount: 180000,
    savedAmount: 85000,
    targetDate: "Dec 2026",
  },
  {
    id: 2,
    emoji: "📱",
    title: "iPhone 16",
    targetAmount: 90000,
    savedAmount: 55000,
    targetDate: "Sep 2026",
  },
  {
    id: 3,
    emoji: "✈️",
    title: "Goa Trip",
    targetAmount: 25000,
    savedAmount: 12500,
    targetDate: "Aug 2026",
  },
  {
    id: 4,
    emoji: "💻",
    title: "MacBook Air",
    targetAmount: 120000,
    savedAmount: 40000,
    targetDate: "Jan 2027",
  },
];

export default function Wishlist() {
  return (
    <DashboardLayout>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold">
            Wishlist & Goals
          </h1>

          <p className="text-slate-400 mt-2">
            Track your dreams and financial goals
          </p>
        </div>

        <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition">
          <FiPlus />
          Add Goal
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">
            Total Goals
          </p>

          <h3 className="text-3xl font-bold mt-2">
            8
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">
            Active Goals
          </p>

          <h3 className="text-3xl font-bold text-cyan-400 mt-2">
            5
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">
            Completed Goals
          </p>

          <h3 className="text-3xl font-bold text-green-400 mt-2">
            3
          </h3>
        </div>

      </div>

      {/* Goal Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {goals.map((goal) => {
          const progress = Math.round(
            (goal.savedAmount /
              goal.targetAmount) *
              100
          );

          const remaining =
            goal.targetAmount -
            goal.savedAmount;

          const monthlyRequired = Math.round(
            remaining / 12
          );

          return (
            <div
              key={goal.id}
              className="
                bg-white/5
                border
                border-white/10
                rounded-2xl
                p-6
                hover:border-indigo-500/30
                hover:-translate-y-1
                transition-all
                duration-300
              "
            >
              {/* Top */}
              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <span className="text-4xl">
                    {goal.emoji}
                  </span>

                  <div>

                    <h3 className="text-xl font-semibold">
                      {goal.title}
                    </h3>

                    <p className="text-slate-400 text-sm">
                      Target: {goal.targetDate}
                    </p>

                  </div>

                </div>

                <FiTarget
                  className="text-indigo-400"
                  size={22}
                />

              </div>

              {/* Amounts */}
              <div className="mt-6">

                <div className="flex justify-between mb-2">

                  <span className="text-slate-400">
                    Saved
                  </span>

                  <span className="font-semibold text-green-400">
                    ₹{goal.savedAmount.toLocaleString()}
                  </span>

                </div>

                <div className="flex justify-between mb-4">

                  <span className="text-slate-400">
                    Target
                  </span>

                  <span className="font-semibold">
                    ₹{goal.targetAmount.toLocaleString()}
                  </span>

                </div>

                {/* Progress */}
                <div className="w-full bg-slate-700 rounded-full h-3">

                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    style={{
                      width: `${progress}%`,
                    }}
                  />

                </div>

                <div className="flex justify-between mt-3">

                  <span className="text-indigo-400 font-medium">
                    {progress}% Completed
                  </span>

                  <span className="text-slate-400 text-sm">
                    Remaining ₹
                    {remaining.toLocaleString()}
                  </span>

                </div>

                <p className="text-xs text-slate-500 mt-3">
                  Save ₹
                  {monthlyRequired.toLocaleString()}
                  /month to reach goal faster
                </p>

              </div>

            </div>
          );
        })}

      </div>

      {/* Goal Insight */}
      <div className="mt-8 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-2xl p-6">

        <div className="flex items-center gap-3">

          <FiCheckCircle
            className="text-green-400"
            size={24}
          />

          <h3 className="text-xl font-semibold">
            AI Goal Insight
          </h3>

        </div>

        <p className="text-slate-300 mt-4 leading-relaxed">
          If you save ₹5,000 every month,
          you'll reach your Royal Enfield Hunter goal
          approximately 19 months earlier than planned.
        </p>

        <p className="text-green-400 mt-4 font-medium">
          Potential Time Saved: 19 Months 🚀
        </p>

      </div>

    </DashboardLayout>
  );
}