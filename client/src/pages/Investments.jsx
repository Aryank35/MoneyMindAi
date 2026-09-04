import DashboardLayout from "../components/layout/DashboardLayout";
import EmptyState from "../components/common/EmptyState";
import {
  FiPlus,
  FiTrendingUp,
  FiDollarSign,
  FiPieChart,
  FiBarChart2,
} from "react-icons/fi";

const investments = [
  {
    id: 1,
    type: "Mutual Fund",
    platform: "Groww",
    invested: 50000,
    current: 58000,
  },
  {
    id: 2,
    type: "Stocks",
    platform: "Zerodha",
    invested: 45000,
    current: 52000,
  },
  {
    id: 3,
    type: "Fixed Deposit",
    platform: "SBI",
    invested: 30000,
    current: 31800,
  },
  {
    id: 4,
    type: "Crypto",
    platform: "Binance",
    invested: 25000,
    current: 36200,
  },
];

const DISTRIBUTION_COLORS = {
  "Mutual Fund": "bg-indigo-500",
  Stocks: "bg-green-500",
  "Fixed Deposit": "bg-yellow-500",
  Crypto: "bg-pink-500",
};

const totalInvested = investments.reduce(
  (sum, investment) => sum + investment.invested,
  0,
);

const totalCurrent = investments.reduce(
  (sum, investment) => sum + investment.current,
  0,
);

const totalProfit = totalCurrent - totalInvested;

const portfolioDistribution = Object.entries(
  investments.reduce((acc, investment) => {
    acc[investment.type] = (acc[investment.type] || 0) + investment.current;
    return acc;
  }, {}),
)
  .map(([type, value]) => ({
    type,
    value,
    percentage: totalCurrent > 0 ? (value / totalCurrent) * 100 : 0,
  }))
  .sort((a, b) => b.value - a.value);

export default function Investments() {
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold">Investments</h1>

          <p className="text-slate-400 mt-2">
            Track and monitor your portfolio
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled
            title="Investment tracking is coming soon"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600/40 text-white/70 cursor-not-allowed"
          >
            <FiPlus />
            Add Investment
          </button>

          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/20">
            Coming Soon
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start justify-between">
          <div>
            <p className="text-slate-400">Total Invested</p>

            <h3 className="text-3xl font-bold mt-2">
              ₹{totalInvested.toLocaleString()}
            </h3>
          </div>

          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-300">
            <FiDollarSign size={20} />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start justify-between">
          <div>
            <p className="text-slate-400">Current Value</p>

            <h3 className="text-3xl font-bold text-cyan-400 mt-2">
              ₹{totalCurrent.toLocaleString()}
            </h3>
          </div>

          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-300">
            <FiPieChart size={20} />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start justify-between">
          <div>
            <p className="text-slate-400">Total Profit</p>

            <h3
              className={`text-3xl font-bold mt-2 ${
                totalProfit >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {totalProfit >= 0 ? "+" : "-"}₹
              {Math.abs(totalProfit).toLocaleString()}
            </h3>
          </div>

          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              totalProfit >= 0
                ? "bg-green-500/10 text-green-300"
                : "bg-red-500/10 text-red-300"
            }`}
          >
            <FiTrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">
        {/* Portfolio Distribution */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-5">
            Portfolio Distribution
          </h3>

          <div className="space-y-5">
            {portfolioDistribution.map((item) => (
              <div key={item.type}>
                <div className="flex justify-between">
                  <span>{item.type}</span>
                  <span>{item.percentage.toFixed(0)}%</span>
                </div>

                <div className="h-2 bg-slate-700 rounded-full mt-2">
                  <div
                    className={`h-2 rounded-full ${
                      DISTRIBUTION_COLORS[item.type] || "bg-indigo-500"
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance */}
        <div className="xl:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-4">
            Investment Performance
          </h3>

          <EmptyState
            icon={FiBarChart2}
            title="Performance charts coming soon"
            message="Portfolio growth charts will appear here once real investment tracking is available."
          />
        </div>
      </div>

      {/* Portfolio Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
          <FiDollarSign />

          <h2 className="text-xl font-semibold">Investment Portfolio</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="text-left p-5">Type</th>
                <th className="text-left p-5">Platform</th>
                <th className="text-right p-5">Invested</th>
                <th className="text-right p-5">Current Value</th>
                <th className="text-right p-5">Return</th>
              </tr>
            </thead>

            <tbody>
              {investments.map((investment) => {
                const profit = investment.current - investment.invested;

                const percentage = (
                  (profit / investment.invested) *
                  100
                ).toFixed(1);

                const isPositive = profit >= 0;

                return (
                  <tr
                    key={investment.id}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="p-5">{investment.type}</td>

                    <td className="p-5 text-slate-400">
                      {investment.platform}
                    </td>

                    <td className="p-5 text-right">
                      ₹{investment.invested.toLocaleString()}
                    </td>

                    <td className="p-5 text-right">
                      ₹{investment.current.toLocaleString()}
                    </td>

                    <td
                      className={`p-5 text-right font-medium ${
                        isPositive ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {percentage}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
