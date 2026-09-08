import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Dashboard from "../pages/Dashboard";
import Expenses from "../pages/Expenses";
import Budget from "../pages/Budget";
import Pots from "../pages/Pots";
import Lending from "../pages/Lending";
import Splits from "../pages/Splits";
import Investments from "../pages/Investments";
import ProtectedRoute from "./ProtectedRoute";
import Analytics from "../pages/Analytics";
import Income from "../pages/Income";
import Accounts from "../pages/Accounts";
import Transfer from "../pages/Transfer";
import Cards from "../pages/Cards";
import Planner from "../pages/Planner";
import { getToken } from "../utils/auth";

// The installed app launches at /dashboard, but a plain visit to "/" while
// already signed in should land there too rather than re-showing the login
// screen. The token lives in localStorage and survives an app relaunch, so
// this is the whole of "stay signed in".
function LandingRoute() {
  return getToken() ? <Navigate to="/dashboard" replace /> : <Login />;
}

// Every page behind the dashboard layout reads the signed-in user's id, so
// each one is protected. Previously only /dashboard was, which left every
// other page reachable without a session.
const PROTECTED = [
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/income", element: <Income /> },
  { path: "/expenses", element: <Expenses /> },
  { path: "/budget", element: <Budget /> },
  { path: "/pots", element: <Pots /> },
  { path: "/lending", element: <Lending /> },
  { path: "/splits", element: <Splits /> },
  { path: "/investments", element: <Investments /> },
  { path: "/analytics", element: <Analytics /> },
  { path: "/accounts", element: <Accounts /> },
  { path: "/cards", element: <Cards /> },
  { path: "/transfer", element: <Transfer /> },
  { path: "/planner", element: <Planner /> },
];

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRoute />} />

        {/* ProtectedRoute sends unauthenticated visitors here, so the path
            has to resolve to something. */}
        <Route path="/login" element={<LandingRoute />} />

        <Route path="/signup" element={<Signup />} />

        {/* The wishlist became a funded pot; keep the old path working. */}
        <Route path="/wishlist" element={<Navigate to="/pots" replace />} />

        {PROTECTED.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<ProtectedRoute>{route.element}</ProtectedRoute>}
          />
        ))}

        {/* A deep link the app does not have - and, in the installed app, any
            stale URL - should land somewhere useful. */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
