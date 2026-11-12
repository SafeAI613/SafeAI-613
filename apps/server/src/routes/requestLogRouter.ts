/**
 * server/src/routes/requestLogRouter.ts
 *
 * מעקב אחרי בקשות הפרוקסי — אדמין בלבד. ראו requestLogController לחוזה.
 */

import express from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { getRequestLog, listRequestLogs } from "../controllers/requestLogController";

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get("/", listRequestLogs);
router.get("/:requestId", getRequestLog);

export default router;
