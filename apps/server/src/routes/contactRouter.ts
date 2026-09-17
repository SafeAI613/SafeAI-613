import { Router } from "express";
import { submitContactForm, registerAttachment } from "../controllers/contactController";
import {
  getMyRequests,
  getRequestById,
  closeRequestById,
  addReply,
  getAllRequests,
  deleteRequestById,
  updateClassification,
} from "../controllers/contactMessageController";
import { authenticateToken, authenticateTokenOrServiceToken, requireAdmin, requireAdminOrServiceToken } from "../middleware/auth";

const router = Router();

// GET /contact/my-requests - Get all contact requests of the authenticated user
router.get("/my-requests", authenticateToken, getMyRequests);

// POST /contact - Submit contact form (requires authentication)
router.post("/", authenticateToken, submitContactForm);

// POST /contact/attachments - Register a screenshot/recording just uploaded
// to S3 as "pending", before it's necessarily attached to a submitted request
router.post("/attachments", authenticateToken, registerAttachment);

// Admin (or apps/agents/inquiry-agent, via AGENT_SERVICE_TOKEN) only.
router.get("/all", requireAdminOrServiceToken, getAllRequests);

router.get("/my-requests/:id", authenticateToken, getRequestById);

// Used by regular users (closing/replying to their own request) AND by the
// inquiry-agent (closing/replying on an admin's behalf after approval) -
// authenticateTokenOrServiceToken accepts either identity; the handlers
// themselves already enforce ownership-or-admin.
router.patch("/my-requests/:id/close", authenticateTokenOrServiceToken, closeRequestById);

router.post("/my-requests/:id/reply", authenticateTokenOrServiceToken, addReply);

// Admin (or the inquiry-agent) only - persists the triage agent's
// urgency/category classification for a request.
router.patch("/my-requests/:id/classification", requireAdminOrServiceToken, updateClassification);

router.delete("/:id", authenticateToken, requireAdmin, deleteRequestById);

export default router;
