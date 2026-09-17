/**
 * server/src/repositories/fundingRequestRepository.ts
 *
 * Data access for FundingRequest - a member's request for additional
 * monthly budget. See models/fundingRequest.ts for why this never touches
 * money on its own.
 */

import { FundingRequest } from "../models/fundingRequest";

export interface CreateFundingRequestData {
  organizationId: string;
  userId: string;
  amount: number;
  note?: string;
}

export async function createFundingRequest(data: CreateFundingRequestData) {
  return FundingRequest.create(data);
}

export async function findByUserId(userId: string) {
  return FundingRequest.find({ userId }).sort({ createdAt: -1 }).lean();
}

/**
 * An org admin's approval screen: every funding request for the
 * organization (pending and resolved), newest first, with the requesting
 * user's name/email populated so the UI doesn't need a second round trip.
 */
export async function findByOrganization(organizationId: string) {
  return FundingRequest.find({ organizationId })
    .sort({ createdAt: -1 })
    .populate("userId", "name email")
    .lean();
}

/**
 * Atomically flips a request from `fromStatus` to `toStatus`, only if it is
 * still in `fromStatus` - guards against double approval/rejection (e.g.
 * two concurrent admin clicks, a stale UI retry, or - for the
 * approve→rollback case below - concurrent resolution while money movement
 * was in flight). Returns null when the request wasn't in `fromStatus`
 * anymore (or doesn't belong to this org); the caller must treat that as
 * "already resolved elsewhere" rather than as a generic error.
 */
export async function updateStatus(
  requestId: string,
  organizationId: string,
  fromStatus: "pending" | "approved" | "rejected",
  toStatus: "pending" | "approved" | "rejected",
) {
  return FundingRequest.findOneAndUpdate(
    { _id: requestId, organizationId, status: fromStatus },
    { $set: { status: toStatus } },
    { new: true },
  ).lean();
}
