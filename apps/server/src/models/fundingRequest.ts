/**
 * server/src/models/fundingRequest.ts
 *
 * A regular organization member's ask for additional monthly budget.
 *
 * This intentionally does NOT move any money or touch `Organization.walletBalance`
 * or `User.costLimits.monthlyBudget` by itself - it only records a pending request
 * for the org admin to review and approve. The actual budget allocation (org admin
 * increasing a user's `costLimits.monthlyBudget` and decrementing the org's
 * `walletBalance`) is a separate, admin-facing flow - keeping money movement in one
 * place instead of letting a member self-service their own budget.
 */

import mongoose from "mongoose";

export interface FundingRequestDoc extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  status: "pending" | "approved" | "rejected";
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FundingRequestSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    // Optional free-text context the member adds when asking for more budget
    // (e.g. why they need it) - purely informational for whoever reviews it.
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true },
);

// A member's own request history is always listed newest-first.
FundingRequestSchema.index({ userId: 1, createdAt: -1 });
// Follow-up admin approval screen (out of scope here) will list an org's
// pending requests this way.
FundingRequestSchema.index({ organizationId: 1, status: 1 });

FundingRequestSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const obj = ret as any;
    delete obj.__v;
    return obj;
  },
});

export const FundingRequest =
  mongoose.models.FundingRequest ||
  mongoose.model<FundingRequestDoc>("FundingRequest", FundingRequestSchema);
