import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="bg-slate-950 min-h-screen">
      {/* Navbar */}
      <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="
            fixed
            inset-0
            bg-black/60
            z-40
            lg:hidden
          "
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

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
        <Sidebar closeSidebar={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <main
        className="
    lg:ml-[280px]
    pt-24
    min-h-screen
    text-white
    p-4
    lg:p-8
    mt-15
  "
      >
        {children}
      </main>
    </div>
  );
}
