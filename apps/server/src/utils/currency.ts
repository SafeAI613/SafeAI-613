/**
 * server/src/utils/currency.ts
 *
 * The organization wallet is charged via PayMe in ILS (see
 * models/walletTransaction.ts and services/paymeService.ts), while every
 * per-user budget/spend figure (User.costLimits, usage cost tracking) is in
 * USD - that's what LLM providers bill in. Anywhere the two meet (e.g.
 * turning wallet ILS into a per-user USD budget) needs an explicit
 * conversion instead of treating one unit as the other.
 *
 * The rate is a fixed approximation, not a live feed - good enough for
 * turning a top-up into budget, not for accounting/reconciliation.
 */

export const ILS_TO_USD_RATE = 3.7;

export function ilsToUsd(amountIls: number): number {
  return amountIls / ILS_TO_USD_RATE;
}

export function usdToIls(amountUsd: number): number {
  return amountUsd * ILS_TO_USD_RATE;
}
