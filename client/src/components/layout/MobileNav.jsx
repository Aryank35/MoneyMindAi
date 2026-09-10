import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiBarChart2,
  FiCalendar,
  FiCreditCard,
  FiDollarSign,
  FiGrid,
  FiHeart,
  FiHome,
  FiLayers,
  FiPlus,
  FiRepeat,
  FiTarget,
  FiTrendingUp,
  FiPieChart,
  FiUsers,
  FiX,
} from "react-icons/fi";

// Five slots is what fits a phone thumb comfortably; the rest lives behind
// "More" rather than being crammed in.
const PRIMARY = [
  { label: "Home", path: "/dashboard", icon: FiHome },
  { label: "Spend", path: "/expenses", icon: FiDollarSign },
  { label: "Cards", path: "/cards", icon: FiLayers },
  { label: "Income", path: "/income", icon: FiTrendingUp },
];

const MORE = [
  { label: "Planner", path: "/planner", icon: FiCalendar },
  { label: "Budget", path: "/budget", icon: FiTarget },
  { label: "Accounts", path: "/accounts", icon: FiCreditCard },
  { label: "Transfer", path: "/transfer", icon: FiRepeat },
  { label: "Investments", path: "/investments", icon: FiTrendingUp },
  { label: "Pots", path: "/pots", icon: FiHeart },
  { label: "Lending", path: "/lending", icon: FiUsers },
  { label: "Splits", path: "/splits", icon: FiPieChart },
  { label: "Analytics", path: "/analytics", icon: FiBarChart2 },
];

export default function MobileNav({ onQuickAdd }) {
  const [showMore, setShowMore] = useState(false);
  const navigate = useNavigate();

  const tabClass = ({ isActive }) =>
    `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] transition-colors ${
      isActive ? "text-indigo-300" : "text-slate-500"
    }`;

  return (
    <>
      {/* More sheet */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/70 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMore(false)}
            />

            <motion.div
              role="dialog"
              aria-label="More sections"
              className="
                fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t
                border-white/10 bg-slate-900 p-5 lg:hidden
              "
              style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">More</h2>
                <button
                  onClick={() => setShowMore(false)}
                  aria-label="Close"
                  className="rounded-lg bg-slate-800 p-2"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {MORE.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        setShowMore(false);
                        navigate(item.path);
                      }}
                      className="
                        flex flex-col items-center gap-2 rounded-2xl border
                        border-white/10 bg-white/5 p-4 text-xs text-slate-300
                        transition active:scale-95
                      "
                    >
                      <Icon size={22} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tab bar */}
      <nav
        aria-label="Main navigation"
        className="
          fixed inset-x-0 bottom-0 z-40 flex items-stretch
          border-t border-white/10 bg-slate-950/95 backdrop-blur-xl
          lg:hidden
        "
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {PRIMARY.slice(0, 2).map((item) => {
          const Icon = item.icon;

          return (
            <NavLink key={item.path} to={item.path} className={tabClass}>
              <Icon size={20} />
              {item.label}
            </NavLink>
          );
        })}

        {/* Quick add sits in the thumb's natural resting spot. */}
        <div className="flex flex-1 justify-center">
          <button
            onClick={onQuickAdd}
            aria-label="Add an expense"
            className="
              -mt-5 flex h-14 w-14 items-center justify-center rounded-2xl
              bg-indigo-400 text-slate-950 shadow-lg shadow-black/50
              transition active:scale-95
            "
          >
            <FiPlus size={26} />
          </button>
        </div>

        {PRIMARY.slice(2).map((item) => {
          const Icon = item.icon;

          return (
            <NavLink key={item.path} to={item.path} className={tabClass}>
              <Icon size={20} />
              {item.label}
            </NavLink>
          );
        })}

        <button
          onClick={() => setShowMore(true)}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-slate-500"
        >
          <FiGrid size={20} />
          More
        </button>
      </nav>
    </>
  );
}
