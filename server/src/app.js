import express from "express";
import cors from "cors";

import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import incomeRoutes from "./routes/incomeRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import transferRoutes from "./routes/transferRoutes.js";
import investmentRoutes from "./routes/investmentRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/plans", planRoutes);

app.use("/api/income", incomeRoutes);

app.use("/api/accounts", accountRoutes);

app.use("/api/transfers", transferRoutes);

app.use("/api/investments", investmentRoutes);

// Cheap liveness probe: no database work, so the client can use it both to
// detect whether the API is reachable and to wake a sleeping instance
// (Render's free tier spins down after inactivity) without paying for a
// query that would block on a cold Mongo connection.
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    ready: true,
    uptime: Math.round(process.uptime()),
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "MoneyMind API Running",
  });
});

export default app;
