import { FiBell } from "react-icons/fi";

export default function Navbar() {
  return (
    <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8">
      <h1 className="text-2xl font-bold text-white">
        MoneyMind AI
      </h1>

      <div className="flex items-center gap-5">
        <button className="relative text-white">
          <FiBell size={20} />

          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <span className="text-slate-400">
          Welcome Aryan 👋
        </span>

        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
      </div>
    </header>
  );
}