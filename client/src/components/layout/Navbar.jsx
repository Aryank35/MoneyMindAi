import { FiBell, FiMenu, FiLogOut } from "react-icons/fi";

import { useNavigate } from "react-router-dom";

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();

    navigate("/");
  };

  const user = JSON.parse(localStorage.getItem("user"));

  const firstName = user?.name?.split(" ")[0] || "User";

  return (
    <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 lg:px-8 bg-slate-950 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden text-white">
          <FiMenu size={24} />
        </button>

        <h1 className="text-xl lg:text-2xl font-bold text-white">
          MoneyMind AI
        </h1>
      </div>

      <div className="flex items-center gap-3 lg:gap-5">
        <button className="relative text-white">
          <FiBell size={20} />

          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <span className="hidden md:block text-slate-400">
          Welcome {firstName || "User"} 👋
        </span>

        <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
          {firstName?.charAt(0) || "U"}
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm transition"
        >
          <FiLogOut />
          <span className="hidden md:block">Logout</span>
        </button>
      </div>
    </header>
  );
}
