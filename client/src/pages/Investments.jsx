import DashboardLayout from "../components/layout/DashboardLayout";
import {
  FiPlus,
  FiTrendingUp,
  FiDollarSign,
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

export default function Investments() {
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold">
            Investments
          </h1>

          <p className="text-slate-400 mt-2">
            Track and monitor your portfolio
          </p>
        </div>

        <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition">
          <FiPlus />
          Add Investment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">
            Total Invested
          </p>

          <h3 className="text-3xl font-bold mt-2">
            ₹1,50,000
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">
            Current Value
          </p>

          <h3 className="text-3xl font-bold text-cyan-400 mt-2">
            ₹1,78,000
          </h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400">
            Total Profit
          </p>

          <h3 className="text-3xl font-bold text-green-400 mt-2">
            +₹28,000
          </h3>
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

            <div>
              <div className="flex justify-between">
                <span>Mutual Funds</span>
                <span>45%</span>
              </div>

              <div className="h-2 bg-slate-700 rounded-full mt-2">
                <div className="h-2 bg-indigo-500 rounded-full w-[45%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between">
                <span>Stocks</span>
                <span>30%</span>
              </div>

              <div className="h-2 bg-slate-700 rounded-full mt-2">
                <div className="h-2 bg-green-500 rounded-full w-[30%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between">
                <span>FD</span>
                <span>15%</span>
              </div>

              <div className="h-2 bg-slate-700 rounded-full mt-2">
                <div className="h-2 bg-yellow-500 rounded-full w-[15%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between">
                <span>Crypto</span>
                <span>10%</span>
              </div>

              <div className="h-2 bg-slate-700 rounded-full mt-2">
                <div className="h-2 bg-pink-500 rounded-full w-[10%]" />
              </div>
            </div>

          </div>

        </div>

        {/* Performance */}
        <div className="xl:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">

          <h3 className="text-xl font-semibold mb-4">
            Investment Performance
          </h3>

          <div className="h-64 flex flex-col items-center justify-center text-slate-500">

            <FiTrendingUp size={60} />

            <p className="mt-4 text-lg">
              Performance Analytics
            </p>

            <p className="text-sm mt-2">
              Portfolio growth charts will appear here
            </p>

          </div>

        </div>

      </div>

      {/* Portfolio Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">

        <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
          <FiDollarSign />

          <h2 className="text-xl font-semibold">
            Investment Portfolio
          </h2>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead>
              <tr className="border-b border-white/10 text-slate-400">

                <th className="text-left p-5">
                  Type
                </th>

                <th className="text-left p-5">
                  Platform
                </th>

                <th className="text-right p-5">
                  Invested
                </th>

                <th className="text-right p-5">
                  Current Value
                </th>

                <th className="text-right p-5">
                  Return
                </th>

              </tr>
            </thead>

            <tbody>

              {investments.map((investment) => {
                const profit =
                  investment.current -
                  investment.invested;

                const percentage = (
                  (profit / investment.invested) *
                  100
                ).toFixed(1);

                return (
                  <tr
                    key={investment.id}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="p-5">
                      {investment.type}
                    </td>

                    <td className="p-5 text-slate-400">
                      {investment.platform}
                    </td>

                    <td className="p-5 text-right">
                      ₹{investment.invested.toLocaleString()}
                    </td>

                    <td className="p-5 text-right">
                      ₹{investment.current.toLocaleString()}
                    </td>

                    <td className="p-5 text-right text-green-400 font-medium">
                      +{percentage}%
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