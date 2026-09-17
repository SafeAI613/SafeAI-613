/**
 * server/src/routes/fundingRequestRouter.ts
 *
 * A regular org member's own funding requests (asking for more monthly
 * budget). Mounted at /users/me/funding-requests - deliberately its own
 * router (not added to userRouter.ts) since userRouter is mounted behind
 * requireAdmin for everything else, and this must be reachable by any
 * logged-in member acting on their own data.
 */

import express from "express";
import { authenticateToken } from "../middleware/auth";
import {
  createFundingRequestHandler,
  listMyFundingRequestsHandler,
} from "../controllers/fundingRequestController";

const router = express.Router();

router.use(authenticateToken);

// POST /users/me/funding-requests - submit a new request for more budget
router.post("/", createFundingRequestHandler);

// GET /users/me/funding-requests - the caller's own request history/status
router.get("/", listMyFundingRequestsHandler);

export default router;
