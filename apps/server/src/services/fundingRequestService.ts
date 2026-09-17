/**
 * server/src/services/fundingRequestService.ts
 *
 * Business logic for a member requesting additional monthly budget.
 * Deliberately thin: creating a request never mutates `costLimits.monthlyBudget`
 * or `Organization.walletBalance` - approving/rejecting it is a separate,
 * admin-facing follow-up feature.
 */

import * as fundingRequestRepository from "../repositories/fundingRequestRepository";

export interface CreateFundingRequestParams {
  userId: string;
  organizationId: string;
  amount: number;
  note?: string;
}

export async function createFundingRequestForUser(params: CreateFundingRequestParams) {
  return fundingRequestRepository.createFundingRequest(params);
}

export async function getMyFundingRequests(userId: string) {
  return fundingRequestRepository.findByUserId(userId);
}
