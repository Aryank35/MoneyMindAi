import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { getDashboardData } from "../../services/dashboardService";
import { getUserId } from "../../utils/auth";
import { computeFinancialHealth } from "../../utils/financialHealth";

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [health, setHealth] = useState(null);

  // Escape-key-to-close for the mobile sidebar drawer.
  useEffect(() => {
    if (!isSidebarOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  // Fetch the minimal data needed for the shared "financial health" score
  // once here, and hand it down to both Navbar and Sidebar, instead of
  // duplicating the fetch in each (both are rendered on every page).
  useEffect(() => {
    let cancelled = false;

    const loadHealth = async () => {
      try {
        const userId = getUserId();

        if (!userId) return;

        const data = await getDashboardData(userId);

        if (!cancelled) {
          setHealth(computeFinancialHealth(data));
        }
      } catch (error) {
        console.error("Financial health fetch error:", error);
      }
    };

    loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-slate-950 min-h-screen">
      {/* Navbar */}
      <Navbar
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        health={health}
      />

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            className="
              fixed
              inset-0
              bg-black/60
              z-40
              lg:hidden
            "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={`
          fixed
          top-0
          left-0
          h-screen
          z-50

          transform
          transition-transform
          duration-300

          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}

          lg:translate-x-0
        `}
      >
        <Sidebar closeSidebar={() => setIsSidebarOpen(false)} health={health} />
      </div>

      {/* Main Content */}
      {/* Padding is set per side. A `p-*` shorthand here would be generated
          after `pt-*` in the stylesheet - and its `lg:` variant later still -
          silently overriding the top padding at wide viewports and letting
          the fixed navbar overlap the content. */}
      <main
        className="
          lg:ml-[280px]
          min-h-screen
          text-white
          px-4
          lg:px-8
          pb-8
          lg:pb-10
          pt-[calc(var(--nav-h)+1rem)]
          lg:pt-[calc(var(--nav-h)+2rem)]
        "
      >
        {children}
      </main>
    </div>
  );
}
