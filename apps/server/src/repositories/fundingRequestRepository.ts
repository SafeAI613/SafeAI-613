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
