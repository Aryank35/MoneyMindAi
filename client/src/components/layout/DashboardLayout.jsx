import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function DashboardLayout({
  children,
}) {
  const [isSidebarOpen, setIsSidebarOpen] =
    useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar
        onMenuClick={() =>
          setIsSidebarOpen(
            !isSidebarOpen
          )
        }
      />

      <div className="flex">

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="
              fixed
              inset-0
              bg-black/50
              z-40
              lg:hidden
            "
            onClick={() =>
              setIsSidebarOpen(
                false
              )
            }
          />
        )}

        {/* Sidebar */}
        <div
          className={`
            fixed
            top-0
            left-0
            h-full
            z-50
            transform
            transition-transform
            duration-300
            lg:translate-x-0
            lg:static
            ${isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
            }
          `}
        >
          <Sidebar
            closeSidebar={() =>
              setIsSidebarOpen(
                false
              )
            }
          />
        </div>

        {/* Main Content */}
        <main
          className="
            flex-1
            text-white
            p-4
            sm:p-6
            lg:p-8
            w-full
            overflow-x-hidden
          "
        >
          {children}
        </main>

      </div>
    </div>
  );
}