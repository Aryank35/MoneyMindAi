import express from "express";
import cors from "cors";

import userRoutes from "./routes/userRoutes.js";

import expenseRoutes from "./routes/expenseRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";

const app = express();


app.use(cors());
app.use(express.json());
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

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "MoneyMind API Running",
  });
});

app.use("/api/users", userRoutes);

export default app;