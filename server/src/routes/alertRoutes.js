import express from "express";

import { getTodayAlerts } from "../controllers/alertController.js";

const alertRoutes = express.Router();

// Everything dated for today or already past, across to-dos, the planner,
// lending and plans. Read on app open; there is no background job.
alertRoutes.get("/today/:userId", getTodayAlerts);

export default alertRoutes;
