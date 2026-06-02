import express from "express";
import cors from "cors";

import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import incomeRoutes from "./routes/incomeRoutes.js";

const app = express();


app.use(cors());
app.use(express.json());

app.use(
  "/api/auth",
  authRoutes
);
app.use(
  "/api/users",
  userRoutes
);
app.use(
  "/api/expenses",
  expenseRoutes
);
app.use(
  "/api/budget",
  budgetRoutes
);
app.use(
  "/api/wishlist",
  wishlistRoutes
);

app.use(
  "/api/income",
  incomeRoutes,
);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "MoneyMind API Running",
  });
});

app.use("/api/users", userRoutes);

export default app;