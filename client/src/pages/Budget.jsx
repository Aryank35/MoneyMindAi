import DashboardLayout from "../components/layout/DashboardLayout";
import {
  FiPlus,
  FiTarget,
  FiTrendingUp,
  FiAlertTriangle,
} from "react-icons/fi";

const budgetCategories = [
  {
    id: 1,
    category: "Food",
    budget: 10000,
    spent: 7200,
    color: "bg-orange-500",
  },
  {
    id: 2,
    category: "Travel",
    budget: 5000,
    spent: 2300,
    color: "bg-cyan-500",
  },
  {
    id: 3,
    category: "Shopping",
    budget: 8000,
    spent: 5800,
    color: "bg-pink-500",
  },
  {
    id: 4,
    category: "Bills",
    budget: 6000,
    spent: 4100,
    color: "bg-green-500",
  },
];

export default function Budget() {
  const totalBudget = 50000;
  const totalSpent = 31200;
  const remaining = totalBudget - totalSpent;

  const utilization = Math.round(
    (totalSpent / totalBudget) * 100
  );

  return (
    <DashboardLayout>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

        <div>
          <h1 className="text-4xl font-bold">
            Budget Planner
          </h1>

          <p className="text-slate-400 mt-2">
            Plan, track and optimize your monthly budget
          </p>
        </div>

        <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition">
          <FiPlus />
          Set Budget
        </button>

      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">
            Monthly Budget
          </p>

          <h3 className="text-3xl font-bold mt-2">
            ₹50,000
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">
            Total Spent
          </p>

          <h3 className="text-3xl font-bold text-red-400 mt-2">
            ₹31,200
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">
            Remaining
          </p>

          <h3 className="text-3xl font-bold text-green-400 mt-2">
            ₹{remaining.toLocaleString()}
          </h3>
        </div>

      </div>

      {/* Budget Health + Overview */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">

        {/* Budget Health */}
        <div className="xl:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">

          <div className="flex items-center gap-3 mb-5">
            <FiTrendingUp
              className="text-indigo-400"
              size={22}
            />

            <h3 className="text-xl font-semibold">
              Budget Health
            </h3>
          </div>

          <div className="flex justify-between mb-3">
            <span>Budget Utilization</span>

            <span className="font-semibold">
              {utilization}%
            </span>
          </div>

          <div className="w-full bg-slate-700 rounded-full h-4">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
              style={{
                width: `${utilization}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">

            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-slate-400 text-sm">
                Daily Average
              </p>

              <h4 className="text-xl font-bold mt-2">
                ₹1,040
              </h4>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-slate-400 text-sm">
                Remaining Days
              </p>

              <h4 className="text-xl font-bold mt-2">
                12
              </h4>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-slate-400 text-sm">
                Safe Spending
              </p>

              <h4 className="text-xl font-bold mt-2 text-green-400">
                ₹1,566/day
              </h4>
            </div>

          </div>

        </div>

        {/* Quick Summary */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

          <h3 className="text-xl font-semibold mb-5">
            Budget Status
          </h3>

          <div className="space-y-4">

            <div className="flex justify-between">
              <span>Food</span>
              <span className="text-yellow-400">
                Near Limit
              </span>
            </div>

            <div className="flex justify-between">
              <span>Travel</span>
              <span className="text-green-400">
                Healthy
              </span>
            </div>

            <div className="flex justify-between">
              <span>Shopping</span>
              <span className="text-orange-400">
                Moderate
              </span>
            </div>

            <div className="flex justify-between">
              <span>Bills</span>
              <span className="text-green-400">
                Healthy
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* Category Budgets */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

        <div className="flex items-center gap-3 mb-6">
          <FiTarget
            className="text-cyan-400"
            size={22}
          />

          <h3 className="text-xl font-semibold">
            Category Budgets
          </h3>
        </div>

        <div className="space-y-6">

          {budgetCategories.map((item) => {
            const percentage = Math.round(
              (item.spent / item.budget) * 100
            );

            return (
              <div key={item.id}>

                <div className="flex justify-between mb-2">

                  <span className="font-medium">
                    {item.category}
                  </span>

                  <span className="text-slate-400">
                    ₹{item.spent.toLocaleString()} /
                    ₹{item.budget.toLocaleString()}
                  </span>

                </div>

                <div className="w-full bg-slate-700 rounded-full h-3">

                  <div
                    className={`${item.color} h-3 rounded-full`}
                    style={{
                      width: `${percentage}%`,
                    }}
                  />

                </div>

                <div className="flex justify-between mt-2 text-sm">

                  <span className="text-slate-400">
                    {percentage}% used
                  </span>

                  <span className="text-green-400">
                    ₹
                    {(
                      item.budget -
                      item.spent
                    ).toLocaleString()} left
                  </span>

                </div>

              </div>
            );
          })}

        </div>

      </div>

      {/* AI Insight */}
      <div className="mt-8 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-2xl p-6">

        <div className="flex items-center gap-3">

          <FiAlertTriangle
            className="text-yellow-400"
            size={22}
          />

          <h3 className="text-xl font-semibold">
            AI Budget Suggestion
          </h3>

        </div>

        <p className="text-slate-300 mt-4 leading-relaxed">
          Your food expenses are nearing the monthly
          limit. Reducing dining expenses by ₹1,500
          could increase your yearly savings by
          approximately ₹18,000.
        </p>

        <p className="text-green-400 mt-4 font-medium">
          Potential Annual Savings: ₹18,000
        </p>

      </div>

    </DashboardLayout>
  );
}