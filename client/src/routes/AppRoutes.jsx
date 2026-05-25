import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Dashboard from "../pages/Dashboard";
import Expenses from "../pages/Expenses";
import Budget from "../pages/Budget";
import Wishlist from "../pages/Wishlist";
import Investments from "../pages/Investments";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/signup" element={<Signup />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/expenses" element={<Expenses />} />

        <Route path="/budget" element={<Budget />} />

        <Route path="/wishlist" element={<Wishlist />} />

        <Route path="/investments" element={<Investments />} />
      </Routes>
    </BrowserRouter>
  );
}
