/**
 * server/src/controllers/fundingRequestController.ts
 *
 * A regular org member's own funding requests: create one asking for more
 * monthly budget, and list their own request history/status. Approving or
 * rejecting a request is out of scope here (a follow-up, admin-facing task).
 */

import { Request, Response } from "express";
import { getUserById } from "../repositories/userRepository";
import * as fundingRequestService from "../services/fundingRequestService";
import logger from "../logger";

// Sanity ceiling only, to reject obviously-bad input before it ever reaches
// an admin - the real, meaningful limit is whatever the org admin is willing
// to approve out of the organization's wallet.
const MAX_FUNDING_REQUEST_AMOUNT = 100000;

/**
 * POST /users/me/funding-requests
 * Body: { amount: number (required, > 0), note?: string }
 * Creates a pending funding request for the authenticated user's organization.
 */
export async function createFundingRequestHandler(req: Request, res: Response) {
  try {
    const authUser = (req as any).user;
    const userId = authUser?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Access token required" });
    }

    const { amount, note } = req.body ?? {};

    if (
      amount === undefined ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({ error: "A positive amount is required" });
    }

    if (amount > MAX_FUNDING_REQUEST_AMOUNT) {
      return res
        .status(400)
        .json({ error: `Amount exceeds the maximum allowed (${MAX_FUNDING_REQUEST_AMOUNT})` });
    }

    if (note !== undefined && typeof note !== "string") {
      return res.status(400).json({ error: "Note must be a string" });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.organizationId) {
      return res
        .status(400)
        .json({ error: "Funding requests require the user to belong to an organization" });
    }

    const fundingRequest = await fundingRequestService.createFundingRequestForUser({
      userId,
      organizationId: user.organizationId.toString(),
      amount,
      note: note?.trim() || undefined,
    });

    logger.info("Funding request created", {
      userId,
      organizationId: user.organizationId.toString(),
      amount,
    });

    return res.status(201).json({ fundingRequest });
  } catch (error: any) {
    logger.error("Failed to create funding request", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
    });
    return res.status(500).json({ error: "Failed to submit funding request" });
  }
}

/**
 * GET /users/me/funding-requests
 * Returns the authenticated user's own funding request history, newest first.
 */
export async function listMyFundingRequestsHandler(req: Request, res: Response) {
  try {
    const authUser = (req as any).user;
    const userId = authUser?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Access token required" });
    }

    const fundingRequests = await fundingRequestService.getMyFundingRequests(userId);
    return res.json({ fundingRequests });
  } catch (error: any) {
    logger.error("Failed to list funding requests", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
    });
    return res.status(500).json({ error: "Failed to retrieve funding requests" });
  }
}
