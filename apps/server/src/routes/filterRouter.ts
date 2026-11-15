import express from "express";
import { evaluateHandler } from "../controllers/filterController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = express.Router();


router.get("/health", (_req, res) => {
  res.send("AI Filter Service running");
});

// Admin only: מפעיל judge בתשלום (ProfileTester באזור האדמין). היה פתוח לכולם.
router.post("/evaluate", authenticateToken, requireAdmin, evaluateHandler);

export default router;