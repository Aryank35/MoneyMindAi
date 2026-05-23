import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Expenses from "../pages/Expenses";
import Budget from "../pages/Budget";
import Wishlist from "../pages/Wishlist";
import Investments from "../pages/Investments";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/expenses" element={<Expenses />} />

        <Route path="/budget" element={<Budget />} />

        <Route path="/wishlist" element={<Wishlist />} />

        <Route path="/investments" element={<Investments />} />
      </Routes>
    </BrowserRouter>
  );
}
