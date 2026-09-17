import crypto from "crypto";
import mongoose from "mongoose";
import * as repo from "../repositories/organizationRepository";
import * as userRepo from "../repositories/userRepository";
import * as fundingRequestRepo from "../repositories/fundingRequestRepository";
import * as profileRepo from "../repositories/profileRepository";
import { aggregateUsageStats } from "../repositories/usageRepository";
import { register } from "./authService";
import {
  sendOrgApprovalRequestEmail,
  sendOrgApprovedEmail,
  sendOrgStatusEmail,
  sendInviteEmail,
  sendOrgAdminActionEmail,
} from "../utils/email";
import logger from "../logger";

export class ValidationError extends Error {
  statusCode = 400;
}

function generateTemporaryPassword(): string {
  return crypto.randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
}

export async function createOrganization(data: any) {
  try {
    // Verify that the owner exists and update their role
    const owner = await userRepo.getUserById(data.ownerId);
    if (!owner) {
      throw new Error("Owner user not found");
    }

    // Create the organization
    const organization = await repo.createOrganization(data);

    // Update the owner's role to org_owner (unless they're already admin) and link to organization
    await userRepo.updateUser(data.ownerId, {
      role: owner.role === "admin" ? "admin" : "org_owner",
      organizationId: organization._id,
    });

    logger.info("Organization created", {
      organizationId: organization._id,
      ownerId: data.ownerId,
    });

    return organization;
  } catch (error: any) {
    logger.error("Failed to create organization", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export async function listOrganizations() {
  return repo.getOrganizations();
}

export async function getOrganizationById(orgId: string) {
  return repo.getOrganizationById(orgId);
}

export async function getOrganizationsByOwnerId(ownerId: string) {
  return repo.getOrganizationsByOwnerId(ownerId);
}

export async function updateOrganization(orgId: string, data: any) {
  return repo.updateOrganization(orgId, data);
}

export async function deleteOrganization(orgId: string) {
  try {
    // Remove organization reference from all members in bulk
    await userRepo.removeUsersFromOrganization(orgId);

    // Delete the organization
    const result = await repo.deleteOrganization(orgId);

    logger.info("Organization deleted", { organizationId: orgId });

    return result;
  } catch (error: any) {
    logger.error("Failed to delete organization", {
      error: error.message,
      stack: error.stack,
      organizationId: orgId,
    });
    throw error;
  }
}

export async function getOrganizationUsers(orgId: string) {
  try {
    return await userRepo.getUsersByOrganization(orgId);
  } catch (error: any) {
    logger.error("Failed to get organization users", {
      error: error.message,
      stack: error.stack,
      organizationId: orgId,
    });
    throw error;
  }
}

export async function addUserToOrganization(orgId: string, userId: string, role: string = "user") {
  try {
    const organization = await repo.getOrganizationById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const user = await userRepo.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const existingOrgId = (user as any).organizationId?.toString();
    const alreadyInOrg = existingOrgId === orgId;
    if (existingOrgId && !alreadyInOrg) {
      // המשתמש כבר משויך לארגון אחר - לא "גונבים" אותו בשקט; הסרה מהארגון
      // הקודם צריכה להיות פעולה מפורשת ונפרדת (למשל ע"י אותו ארגון).
      throw new Error("המשתמש כבר משויך לארגון אחר, יש להסיר אותו משם קודם");
    }
    if (!alreadyInOrg) {
      const maxUsers = (organization as any).settings?.maxUsers ?? 10;
      const currentUserCount = await userRepo.countUsersByOrganization(orgId);
      if (currentUserCount >= maxUsers) {
        throw new Error(`הארגון הגיע למספר המשתמשים המרבי המותר (${maxUsers})`);
      }
    }

    // Update user's organization and role
    await userRepo.updateUser(userId, {
      organizationId: orgId,
      role: role,
    });

    logger.info("User added to organization", { userId, organizationId: orgId, role });

    return user;
  } catch (error: any) {
    logger.error("Failed to add user to organization", {
      error: error.message,
      stack: error.stack,
      userId,
      organizationId: orgId,
    });
    throw error;
  }
}

export async function getOrganizationForUser(userId: string) {
  const user = await userRepo.getUserById(userId);
  if (!user || !(user as any).organizationId) {
    return null;
  }
  return repo.getOrganizationById((user as any).organizationId.toString());
}

export async function removeUserFromOrganization(userId: string) {
  try {
    const user = await userRepo.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Remove organization reference
    await userRepo.updateUser(userId, {
      organizationId: null,
    });

    logger.info("User removed from organization", { userId });

    return user;
  } catch (error: any) {
    logger.error("Failed to remove user from organization", {
      error: error.message,
      stack: error.stack,
      userId,
    });
    throw error;
  }
}

export async function addUserToOrganizationByEmail(
  orgId: string,
  email: string,
  role: string = "user"
) {
  const user = await userRepo.findUserByEmail(email.toLowerCase().trim());
  if (!user) {
    throw new Error("User not found");
  }

  return addUserToOrganization(orgId, user._id.toString(), role);
}

/**
 * Create a brand-new user account (with a generated temporary password)
 * directly inside an organization. Used by org owners/admins adding members
 * who don't already have a SafeAI account.
 */
export async function createOrganizationMember(
  orgId: string,
  data: { name: string; email: string; role?: string }
) {
  try {
    const organization = await repo.getOrganizationById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const maxUsers = (organization as any).settings?.maxUsers ?? 10;
    const currentUserCount = await userRepo.countUsersByOrganization(orgId);
    if (currentUserCount >= maxUsers) {
      throw new Error(`הארגון הגיע למספר המשתמשים המרבי המותר (${maxUsers})`);
    }

    const temporaryPassword = generateTemporaryPassword();

    const { user } = await register({
      email: data.email,
      password: temporaryPassword,
      name: data.name,
      organizationId: orgId,
      role: data.role || "user",
      // Org-created members are billed against a budget the org owner
      // funds from the org wallet (allocateBudgetToUser / funding requests),
      // not their own provider key - MANAGED, not the BYOK default, or
      // their balance never shows up anywhere (usageController only
      // returns `budget` for MANAGED users).
      mode: "MANAGED",
      skipEmailVerification: true,
      mustChangePassword: true,
    });

    logger.info("Organization member created", { organizationId: orgId, userId: user._id });

    const emailSent = await sendInviteEmail(data.email, data.name, temporaryPassword);

    return { user, temporaryPassword, emailSent };
  } catch (error: any) {
    logger.error("Failed to create organization member", {
      error: error.message,
      stack: error.stack,
      organizationId: orgId,
    });
    throw error;
  }
}

export async function topUpOrganizationWallet(orgId: string, amount: number) {
  try {
    const organization = await repo.getOrganizationById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const updateOrg = await repo.incrementWalletBalance(orgId, amount);

    logger.info("Organization wallet topped up successfully (Mock)", {
      organizationId: orgId,
      amount,
      newBalance: (updateOrg as any)?.walletBalance,
    });

    return updateOrg;
  } catch (error: any) {
    logger.error("Failed to top up organization wallet", {
      error: error.message,
      stack: error.stack,
      organizationId: orgId,
      amount,
    });
    throw error;
  }
}

/**
 * Allocate (add) dollars from the organization's wallet to a member's
 * personal monthly budget (costLimits.monthlyBudget).
 *
 * Additive by design, not "set to X": an org admin allocating funds is
 * giving the user *more* spending room on top of whatever they already
 * have this month, the same way topUpOrganizationWallet adds to the org
 * wallet instead of overwriting it. A "set to X" semantic would silently
 * erase any unspent budget the admin never intended to claw back.
 *
 * Money-movement safety: the wallet decrement
 * (repo.decrementWalletBalanceIfSufficient) is a single atomic,
 * conditional update - the `walletBalance >= amount` check and the `$inc`
 * happen in the same Mongo query - so two concurrent allocations can never
 * together overdraw the wallet. There is, however, no cross-collection
 * transaction wrapping the wallet decrement and the user's budget
 * increment together: if the process crashes in between, the wallet is
 * debited without the user being credited. The rest of this codebase's
 * money-moving code (paymeService.ts) has the same limitation - it isn't
 * running Mongo as a replica set / doesn't use sessions - so this follows
 * existing precedent rather than introducing a new one. A future fix would
 * wrap both writes in a Mongoose session transaction once that's available.
 */
export async function allocateBudgetToUser(orgId: string, userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const organization = await repo.getOrganizationById(orgId);
  if (!organization) {
    throw new Error("Organization not found");
  }

  const targetUser = await userRepo.getUserById(userId);
  if (!targetUser || (targetUser as any).organizationId?.toString() !== orgId) {
    throw new Error("User not found in this organization");
  }

  const updatedOrg = await repo.decrementWalletBalanceIfSufficient(orgId, amount);
  if (!updatedOrg) {
    throw new Error("יתרת הארנק של הארגון אינה מספיקה להקצאה זו");
  }

  const updatedUser = await userRepo.incrementUserMonthlyBudget(userId, amount);

  logger.info("Budget allocated from organization wallet to user", {
    organizationId: orgId,
    userId,
    amount,
    newWalletBalance: (updatedOrg as any)?.walletBalance,
    newUserMonthlyBudget: (updatedUser as any)?.costLimits?.monthlyBudget,
  });

  return { organization: updatedOrg, user: updatedUser };
}

/**
 * Org admin editing an existing member's own profile fields (name,
 * active/inactive) - not their email, role, organization membership, or
 * budget, which all go through their own dedicated, safety-checked
 * endpoints (add/remove/by-email, allocateBudgetToUser). Budget
 * deliberately isn't editable here: it must move through
 * allocateBudgetToUser so the org wallet is actually decremented, instead
 * of letting an owner grant budget nobody paid into the wallet for.
 */
export async function updateOrganizationMember(
  orgId: string,
  userId: string,
  data: { name?: string; isActive?: boolean }
) {
  const targetUser = await userRepo.getUserById(userId);
  if (!targetUser || (targetUser as any).organizationId?.toString() !== orgId) {
    throw new Error("המשתמש לא נמצא בארגון זה");
  }
  if ((targetUser as any).role === "org_owner") {
    throw new Error("לא ניתן לערוך את בעל הארגון דרך מסך זה");
  }

  const updateData: any = {};
  if (data.name !== undefined) {
    if (!data.name.trim()) {
      throw new Error("שם לא יכול להיות ריק");
    }
    updateData.name = data.name.trim();
  }
  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("אין נתונים לעדכון");
  }

  const updated = await userRepo.updateUser(userId, updateData);
  logger.info("Organization member updated", { organizationId: orgId, userId });
  return updated;
}

/**
 * Splits the org's entire wallet balance evenly across its members'
 * costLimits.monthlyBudget - excluding the owner, who draws on the org
 * account directly rather than a personal monthly budget. Uses the same
 * primitives and additive/atomicity conventions as allocateBudgetToUser
 * (single conditional wallet decrement up front, so two concurrent
 * distribute-equally clicks can't double-spend the wallet), just applied
 * to every member at once instead of one.
 */
export async function distributeOrganizationBudgetEqually(orgId: string) {
  const organization = await repo.getOrganizationById(orgId);
  if (!organization) {
    throw new Error("Organization not found");
  }

  const members = (await getOrganizationUsers(orgId)).filter((u: any) => u.role !== "org_owner");
  if (members.length === 0) {
    throw new Error("אין משתמשים בארגון לחלוקת התקציב ביניהם");
  }

  const walletBalance = (organization as any).walletBalance || 0;
  if (walletBalance <= 0) {
    throw new Error("אין יתרה בארנק הארגון לחלוקה");
  }

  const perMemberAmount = walletBalance / members.length;

  const updatedOrg = await repo.decrementWalletBalanceIfSufficient(orgId, walletBalance);
  if (!updatedOrg) {
    throw new Error("יתרת הארנק של הארגון אינה מספיקה לחלוקה זו");
  }

  await Promise.all(
    members.map((member: any) => userRepo.incrementUserMonthlyBudget(member._id.toString(), perMemberAmount))
  );

  logger.info("Organization budget distributed equally", {
    organizationId: orgId,
    memberCount: members.length,
    perMemberAmount,
    walletBalance,
  });

  return { organization: updatedOrg, memberCount: members.length, perMemberAmount };
}

/**
 * Org admin's approval screen: every FundingRequest submitted by this
 * organization's members (pending and resolved), newest first.
 */
export async function getOrganizationFundingRequests(orgId: string) {
  return fundingRequestRepo.findByOrganization(orgId);
}

/**
 * Approve or reject a member's FundingRequest (org admin / system admin
 * only - access is checked in the controller the same way as every other
 * org-admin-scoped endpoint).
 *
 * Approving deliberately does NOT reimplement money movement: it calls the
 * same `allocateBudgetToUser` used by PR #420's direct top-down allocation
 * flow, which atomically decrements the org's `walletBalance` and
 * increments the user's `costLimits.monthlyBudget`. If the org wallet no
 * longer has enough balance, the request is left in `pending` (never
 * marked approved without the money actually moving) and a clear error is
 * thrown for the controller to surface as 400.
 *
 * Rejecting only flips the status - no money movement.
 *
 * The request is atomically "claimed" (pending -> approved/rejected)
 * before any further work, so two concurrent admin clicks (or a stale UI
 * retry) can't resolve the same request twice.
 */
export async function resolveFundingRequest(
  orgId: string,
  requestId: string,
  decision: "approved" | "rejected",
) {
  if (decision === "rejected") {
    const updated = await fundingRequestRepo.updateStatus(requestId, orgId, "pending", "rejected");
    if (!updated) {
      throw new Error("Funding request not found or already resolved");
    }
    return { fundingRequest: updated };
  }

  // decision === "approved"
  const claimed = await fundingRequestRepo.updateStatus(requestId, orgId, "pending", "approved");
  if (!claimed) {
    throw new Error("Funding request not found or already resolved");
  }

  try {
    const { organization, user } = await allocateBudgetToUser(
      orgId,
      (claimed as any).userId.toString(),
      (claimed as any).amount,
    );
    logger.info("Funding request approved and budget allocated", {
      organizationId: orgId,
      requestId,
      userId: (claimed as any).userId.toString(),
      amount: (claimed as any).amount,
    });
    return { fundingRequest: claimed, organization, user };
  } catch (error) {
    // Money movement failed (e.g. insufficient wallet balance, or the
    // member was removed from the org meanwhile) - roll the claim back to
    // `pending` rather than leaving it stuck as "approved" with no money
    // ever having moved.
    await fundingRequestRepo.updateStatus(requestId, orgId, "approved", "pending");
    throw error;
  }
}

export async function getPendingOrganizationsForAdmin() {
  return repo.getPendingOrganizations();
}

/**
 * Public sign-up flow: creates a brand-new org_owner user account together
 * with a pending organization, in one step. No prior login/registration
 * required — this IS the registration for org owners. Called from a public,
 * unauthenticated endpoint.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function publicRequestOrganization(data: {
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  orgName: string;
  orgDescription?: string;
}) {
  if (!EMAIL_REGEX.test(data.ownerEmail)) {
    throw new Error("כתובת האימייל אינה תקינה");
  }

  // בדיקה מוקדמת - נמנעת מיצירת משתמש כשברור מראש ששם הארגון תפוס
  const existingOrg = await repo.findOrganizationByName(data.orgName);
  if (existingOrg) {
    throw new Error("שם הארגון כבר תפוס, אנא בחרו שם אחר");
  }

  // יוצר את חשבון בעל הארגון ישירות במצב מאומת
  // (אימות המייל מדולג — אישור המנהל הוא השער האמיתי)
  const { user } = await register({
    email: data.ownerEmail,
    password: data.ownerPassword,
    name: data.ownerName,
    role: "org_owner",
    skipEmailVerification: true,
  });

  // יצירת הארגון במצב ממתין ולא פעיל. אם זה נכשל (למשל מרוץ נדיר על אותו שם
  // ארגון בין הבדיקה המוקדמת לכאן), מבטלים את המשתמש שכבר נוצר כדי לא
  // להשאיר רשומת משתמש "יתומה" ללא ארגון.
  let organization;
  try {
    organization = await repo.createOrganization({
      name: data.orgName,
      description: data.orgDescription || "",
      ownerId: user._id,
      status: "pending",
      isActive: false,
    });
  } catch (error: any) {
    await userRepo.deleteUser(user._id.toString());
    if (error?.code === 11000) {
      throw new Error("שם הארגון כבר תפוס, אנא בחרו שם אחר");
    }
    throw error;
  }

  // קישור המשתמש לארגון שנוצר
  await userRepo.updateUser(user._id.toString(), {
    organizationId: organization._id,
  });

  logger.info("Public organization request created", {
    organizationId: organization._id,
    ownerEmail: data.ownerEmail,
  });

  // התראה לכל האדמינים (best-effort)
  try {
    const users = await userRepo.getUsers();
    const admins = users.filter((u: any) => u.role === "admin");
    await Promise.all(
      admins.map((admin: any) =>
        sendOrgApprovalRequestEmail(admin.email, data.orgName, data.ownerEmail)
      )
    );
  } catch (error: any) {
    logger.error("Failed to notify admins about org request", {
      error: error.message,
      stack: error.stack,
      organizationId: organization._id,
    });
  }

  return organization;
}

async function notifyOtherAdmins(
  kind: "approved" | "rejected" | "suspended" | "reactivated",
  orgName: string,
  actingAdminEmail?: string,
) {
  if (!actingAdminEmail) return;
  try {
    const users = await userRepo.getUsers();
    const otherAdmins = users.filter(
      (u: any) => u.role === "admin" && u.email !== actingAdminEmail
    );
    await Promise.all(
      otherAdmins.map((admin: any) =>
        sendOrgAdminActionEmail(admin.email, kind, orgName, actingAdminEmail)
      )
    );
  } catch (error) {
    logger.error("Failed to notify other admins about org action", { error, kind });
  }
}

export async function approveOrganization(orgId: string, actingAdminEmail?: string) {
  const organization = await repo.getOrganizationById(orgId);
  if (!organization) {
    throw new Error("Organization not found");
  }
  if ((organization as any).status !== "pending") {
    throw new Error(`ניתן לאשר רק ארגון שממתין לאישור (מצב נוכחי: ${(organization as any).status})`);
  }

  const updated = await repo.updateOrganization(orgId, {
    status: "approved",
    isActive: true,
  });

  // מייל לבעל הארגון (best-effort). ownerId מגיע populated עם email+name
  try {
    const owner = organization.ownerId as any;
    if (owner?.email) {
      await sendOrgApprovedEmail(owner.email, (organization as any).name, owner.name);
    }
  } catch (error: any) {
    logger.error("Failed to send org approved email", {
      error: error.message,
      stack: error.stack,
      organizationId: orgId,
    });
  }
  await notifyOtherAdmins("approved", (organization as any).name, actingAdminEmail);

  logger.info("Organization approved", { organizationId: orgId });
  return updated;
}

export async function rejectOrganization(orgId: string, actingAdminEmail?: string) {
  const organization = await repo.getOrganizationById(orgId);
  if (!organization) {
    throw new Error("Organization not found");
  }
  if ((organization as any).status !== "pending") {
    throw new Error(`ניתן לדחות רק ארגון שממתין לאישור (מצב נוכחי: ${(organization as any).status})`);
  }

  const updated = await repo.updateOrganization(orgId, {
    status: "rejected",
    isActive: false,
  });

  // מייל לבעל הארגון (best-effort), לעקביות עם approveOrganization
  try {
    const owner = organization.ownerId as any;
    if (owner?.email) {
      await sendOrgStatusEmail("rejected", owner.email, (organization as any).name, owner.name);
    }
  } catch (error: any) {
    logger.error("Failed to send org rejected email", {
      error: error.message,
      stack: error.stack,
      organizationId: orgId,
    });
  }
  await notifyOtherAdmins("rejected", (organization as any).name, actingAdminEmail);

  logger.info("Organization rejected", { organizationId: orgId });
  return updated;
}

/**
 * Return the organization that the given user owns/belongs to (with its status),
 * or null. Used by the frontend to decide between the pending screen and the
 * full management screen.
 */
export async function getMyOrganization(userId: string) {
  const user = await userRepo.getUserById(userId);
  if (!user || !user.organizationId) {
    return null;
  }
  return repo.getOrganizationById(user.organizationId.toString());
}

export async function listAllOrganizationsWithStats() {
  return repo.getOrganizationsWithUserCount();
}

export async function setOrganizationActive(
  orgId: string,
  isActive: boolean,
  actingAdminEmail?: string,
) {
  const organization = await repo.getOrganizationById(orgId);
  if (!organization) {
    throw new Error("Organization not found");
  }
  if ((organization as any).status !== "approved") {
    throw new Error(`ניתן להשעות או להפעיל מחדש רק ארגון מאושר (מצב נוכחי: ${(organization as any).status})`);
  }
  if ((organization as any).isActive === isActive) {
    throw new Error(isActive ? "הארגון כבר פעיל" : "הארגון כבר מושעה");
  }

  const updated = await repo.updateOrganization(orgId, { isActive });

  // מייל לבעל הארגון (best-effort), לעקביות עם approveOrganization
  try {
    const owner = organization.ownerId as any;
    if (owner?.email) {
      await sendOrgStatusEmail(
        isActive ? "reactivated" : "suspended",
        owner.email,
        (organization as any).name,
        owner.name
      );
    }
  } catch (error: any) {
    logger.error("Failed to send org active-state email", {
      error: error.message,
      stack: error.stack,
      organizationId: orgId,
    });
  }
  await notifyOtherAdmins(
    isActive ? "reactivated" : "suspended",
    (organization as any).name,
    actingAdminEmail,
  );

  logger.info("Organization active state changed", { organizationId: orgId, isActive });
  return updated;
}

/**
 * List every approved AI profile available in the system, marking which
 * ones the given organization currently has selected. Used by the org
 * admin's "select profiles" screen.
 */
export async function getOrganizationAvailableProfiles(orgId: string) {
  const organization = await repo.getOrganizationById(orgId);
  if (!organization) {
    throw new Error("Organization not found");
  }

  const allowedProfileIds = new Set(
    ((organization as any).allowedProfileIds || []).map((id: any) => id.toString())
  );

  const profiles = await profileRepo.getProfiles();

  return {
    profiles: profiles.map((profile: any) => ({
      ...profile,
      selected: allowedProfileIds.has(profile._id.toString()),
    })),
    selectedProfileIds: Array.from(allowedProfileIds),
  };
}

/**
 * Set the list of AI profiles an organization admin has chosen for their
 * organization, out of the profiles available in the system. Every id must
 * be a real, existing, approved AIProfile - otherwise the whole update is
 * rejected (no partial application of an invalid selection).
 */
export async function setOrganizationAllowedProfiles(orgId: string, profileIds: unknown) {
  const organization = await repo.getOrganizationById(orgId);
  if (!organization) {
    throw new Error("Organization not found");
  }

  if (!Array.isArray(profileIds)) {
    throw new ValidationError("profileIds must be an array of profile ids");
  }

  const uniqueIds = Array.from(new Set(profileIds.map((id) => String(id))));

  const invalidFormatId = uniqueIds.find((id) => !mongoose.Types.ObjectId.isValid(id));
  if (invalidFormatId) {
    throw new ValidationError(`Invalid profile id: ${invalidFormatId}`);
  }

  if (uniqueIds.length > 0) {
    const approvedProfiles = await profileRepo.getApprovedProfilesByIds(uniqueIds);
    const approvedIds = new Set(approvedProfiles.map((p: any) => p._id.toString()));
    const unknownIds = uniqueIds.filter((id) => !approvedIds.has(id));
    if (unknownIds.length > 0) {
      throw new ValidationError(
        `One or more profile ids are invalid or not approved: ${unknownIds.join(", ")}`
      );
    }
  }

  const updated = await repo.setAllowedProfileIds(orgId, uniqueIds);

  logger.info("Organization allowed profiles set", {
    organizationId: orgId,
    profileIds: uniqueIds,
  });

  return updated;
}

export async function getOrganizationUsageSummary(orgId: string) {
  const users = await getOrganizationUsers(orgId);
  const userIds = users.map((u: any) => u._id.toString());

  if (userIds.length === 0) {
    return { userCount: 0, totalRequests: 0, totalTokens: 0, totalCost: 0 };
  }

  const summary = await aggregateUsageStats(userIds);
  return {
    userCount: users.length,
    totalRequests: summary.totalRequests,
    totalTokens: summary.totalTokens,
    totalCost: summary.totalCost,
  };
}