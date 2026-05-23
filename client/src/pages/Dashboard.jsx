import DashboardLayout from "../components/layout/DashboardLayout";

export default function Dashboard() {
  return (
    <DashboardLayout>
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-slate-400">
            Good Evening 👋
          </p>

          <h2 className="text-4xl font-bold">
            Welcome Back, Aryan
          </h2>

          <p className="text-slate-500 mt-2">
            Here's your financial summary for this month
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition">
            + Expense
          </button>

          <button className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 transition">
            + Income
          </button>

          <button className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 transition">
            + Goal
          </button>

          <button className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 transition">
            + Investment
          </button>
        </div>
      </div>

      {/* Financial Health Score */}
      <div className="mt-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold">
              Financial Health Score
            </h3>

            <p className="text-slate-400 mt-2">
              Excellent financial discipline
            </p>
          </div>

          <div className="text-right">
            <h2 className="text-5xl font-bold text-green-400">
              84
            </h2>

            <p className="text-slate-400">
              out of 100
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-5 mt-8">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">
            Total Balance
          </p>

          <h3 className="text-3xl font-bold mt-2 text-green-400">
            ₹2,50,000
          </h3>

          <p className="text-green-400 text-sm mt-2">
            ↑ 12% this month
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">
            Monthly Income
          </p>

          <h3 className="text-3xl font-bold mt-2 text-cyan-400">
            ₹50,000
          </h3>

          <p className="text-green-400 text-sm mt-2">
            ↑ 8% this month
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">
            Monthly Expense
          </p>

          <h3 className="text-3xl font-bold mt-2 text-red-400">
            ₹18,500
          </h3>

          <p className="text-red-400 text-sm mt-2">
            ↑ 4% this month
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">
            Savings Rate
          </p>

          <h3 className="text-3xl font-bold mt-2 text-yellow-400">
            63%
          </h3>

          <p className="text-green-400 text-sm mt-2">
            ↑ 6% this month
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">
            Investments
          </p>

          <h3 className="text-3xl font-bold mt-2 text-purple-400">
            ₹1,20,000
          </h3>

          <p className="text-green-400 text-sm mt-2">
            ↑ 9% this month
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">
            Net Worth
          </p>

          <h3 className="text-3xl font-bold mt-2 text-emerald-400">
            ₹3,70,000
          </h3>

          <p className="text-green-400 text-sm mt-2">
            ↑ 15% this month
          </p>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8">

        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-4">
            Monthly Spending Analysis
          </h3>

          <div className="h-72 flex flex-col items-center justify-center text-slate-500">
            <div className="text-6xl mb-4">
              📊
            </div>

            <p className="text-lg">
              Spending Analytics
            </p>

            <p className="text-sm mt-2">
              Charts will appear once transactions are added
            </p>
          </div>
        </div>

        <div className="space-y-5">

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4">
              Budget Progress
            </h3>

            <div className="flex justify-between mb-3">
              <span>Used</span>
              <span>62%</span>
            </div>

            <div className="w-full bg-slate-700 rounded-full h-3">
              <div className="w-[62%] h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4">
              Goal Progress
            </h3>

            <p className="text-slate-400">
              Royal Enfield Hunter 350
            </p>

            <div className="w-full h-3 bg-slate-700 rounded-full mt-3">
              <div className="w-[47%] h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            </div>

            <div className="flex justify-between mt-3 text-sm">
              <span className="text-indigo-400">
                ₹85,000 Saved
              </span>

              <span className="text-slate-400">
                ₹1,80,000 Goal
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Save ₹7,917/month to reach target by Dec 2026
            </p>
          </div>

        </div>
      </div>

      {/* Bottom Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-5">
            Recent Transactions
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Swiggy</span>
              <span className="text-red-400">
                -₹450
              </span>
            </div>

            <div className="flex justify-between">
              <span>Salary</span>
              <span className="text-green-400">
                +₹50,000
              </span>
            </div>

            <div className="flex justify-between">
              <span>Fuel</span>
              <span className="text-red-400">
                -₹1,200
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-5">
            Investment Snapshot
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Mutual Funds</span>
              <span>₹60,000</span>
            </div>

            <div className="flex justify-between">
              <span>Stocks</span>
              <span>₹40,000</span>
            </div>

            <div className="flex justify-between">
              <span>FD</span>
              <span>₹20,000</span>
            </div>

            <div className="border-t border-white/10 pt-3 flex justify-between font-semibold">
              <span>Total Return</span>
              <span className="text-green-400">
                +12.4%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-2xl p-6">
          <h3 className="text-xl font-semibold">
            🤖 AI Financial Coach
          </h3>

          <p className="text-slate-300 mt-4">
            Your food expenses increased by 12% this month.
            Reducing dining expenses by ₹1,500 could help
            save approximately ₹18,000 annually.
          </p>

          <p className="text-green-400 mt-4 font-medium">
            Potential Savings: ₹18,000/year
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
}