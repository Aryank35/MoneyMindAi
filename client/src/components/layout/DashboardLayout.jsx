import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function DashboardLayout({
  children,
}) {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-8 text-white">
          {children}
        </main>
      </div>
    </div>
  );
}