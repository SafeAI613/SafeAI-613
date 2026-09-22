import { apiCall, API_ENDPOINTS } from "../../../config/api";

interface OrganizationStatusResponse {
  data?: unknown;
}

export const getPendingOrganizations = async (): Promise<OrganizationStatusResponse> => {
    return apiCall<OrganizationStatusResponse>(API_ENDPOINTS.adminOrganizations.pending, { method: "GET" });
}

export const updateOrganizationStatus = async (id: string, status: "approved" | "rejected"): Promise<OrganizationStatusResponse> => {
    const url = status === "approved"
        ? API_ENDPOINTS.adminOrganizations.approve(id)
        : API_ENDPOINTS.adminOrganizations.reject(id);
    return apiCall<OrganizationStatusResponse>(url, { method: "PATCH" });
}

export interface OrganizationOwner {
  _id: string;
  email?: string;
  name?: string;
}

export interface AdminOrganization {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  status: string;
  walletBalance: number;
  logoUrl?: string;
  userCount: number;
  ownerId?: OrganizationOwner;
  createdAt: string;
}

export interface OrganizationUser {
  _id: string;
  email: string;
  name?: string;
  role: string;
  isActive: boolean;
  mode?: string;
  createdAt: string;
  lastLogin?: string;
  costLimits?: {
    monthlyBudget: number;
    currentMonthSpent: number;
    lastResetDate?: string;
  };
}

export interface OrganizationUsageSummary {
  userCount: number;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  walletBalance: number;
}

// רשימת כל הארגונים (Admin בלבד)
export const getAllOrganizations = async (): Promise<AdminOrganization[]> => {
  return apiCall<AdminOrganization[]>(API_ENDPOINTS.adminOrganizations.all, { method: "GET" });
};

// פרטי ארגון בודד
export const getOrganizationDetail = async (id: string): Promise<AdminOrganization> => {
  return apiCall<AdminOrganization>(API_ENDPOINTS.adminOrganizations.detail(id), { method: "GET" });
};

// משתמשי הארגון
export const getOrganizationUsers = async (id: string): Promise<OrganizationUser[]> => {
  return apiCall<OrganizationUser[]>(API_ENDPOINTS.adminOrganizations.users(id), { method: "GET" });
};

// סיכום שימוש + יתרת ארנק
export const getOrganizationStats = async (id: string): Promise<OrganizationUsageSummary> => {
  return apiCall<OrganizationUsageSummary>(API_ENDPOINTS.adminOrganizations.stats(id), { method: "GET" });
};

// חשבוניות (היסטוריית טעינות ארנק - אין מערכת חיוב נפרדת, כל טעינה מוצגת כחשבונית)
export interface OrganizationInvoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  reference: string;
}

export const getOrganizationInvoices = async (id: string): Promise<{ invoices: OrganizationInvoice[] }> => {
  return apiCall<{ invoices: OrganizationInvoice[] }>(API_ENDPOINTS.adminOrganizations.invoices(id), { method: "GET" });
};

// השעיית ארגון
export const suspendOrganization = async (id: string): Promise<{ success: boolean }> => {
  return apiCall<{ success: boolean }>(API_ENDPOINTS.adminOrganizations.suspend(id), { method: "PATCH" });
};

// הפעלה מחדש של ארגון
export const activateOrganization = async (id: string): Promise<{ success: boolean }> => {
  return apiCall<{ success: boolean }>(API_ENDPOINTS.adminOrganizations.activate(id), { method: "PATCH" });
};

// הרשמה ציבורית כמנהל ארגון (יוצר חשבון + ארגון ממתין, בלי צורך בהתחברות מוקדמת)
export const publicRequestOrganization = async (
  data: {
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    orgName: string;
    orgDescription?: string;
  }
): Promise<{ success: boolean; message?: string; organization?: AdminOrganization }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.publicRequest, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// יצירת משתמש חדש בארגון + סיסמה זמנית שנוצרת אוטומטית
export const createOrganizationMember = async (
  orgId: string,
  data: { name: string; email: string; role?: string }
): Promise<{
  success: boolean;
  user: { _id: string; name: string; email: string };
  temporaryPassword: string;
  emailSent: boolean;
}> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.members(orgId), {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// הארגון של המשתמש הנוכחי (בכל סטטוס)
export const getMyOrganization = async (): Promise<{ organization: AdminOrganization | null }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.my, { method: "GET" });
};

// הקצאת דולרים מהארנק הארגוני לתקציב החודשי האישי של משתמש (תוספתית - ראו
// allocateBudgetToUser ב-organizationService.ts בשרת להסבר הבחירה)
export const allocateBudgetToUser = async (
  orgId: string,
  userId: string,
  amount: number
): Promise<{ success: boolean; message?: string; walletBalance: number; user: OrganizationUser }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.allocateBudget(orgId, userId), {
    method: "PATCH",
    body: JSON.stringify({ amount }),
  });
};

// עריכת פרטי משתמש בתוך הארגון (שם / פעיל-לא פעיל בלבד - לא תקציב, ראו
// updateOrganizationMember ב-organizationService.ts בשרת)
export const updateOrganizationMember = async (
  orgId: string,
  userId: string,
  data: { name?: string; isActive?: boolean }
): Promise<{ success: boolean; user: OrganizationUser }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.member(orgId, userId), {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

// חלוקה שווה של יתרת ארנק הארגון בין כל חברי הארגון (לא כולל הבעלים)
export const distributeOrganizationBudgetEqually = async (
  orgId: string
): Promise<{ success: boolean; walletBalance: number; memberCount: number; perMemberAmount: number }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.distributeBudget(orgId), { method: "POST" });
};

// הוספת משתמש קיים שאינו משויך לארגון אחר, לפי כתובת אימייל
export const addUserByEmailToOrganization = async (
  orgId: string,
  email: string,
  role: string = "user"
): Promise<{ success: boolean; message: string; organization: AdminOrganization }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.userByEmail(orgId), {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
};

export interface OrganizationFundingRequest {
  _id: string;
  organizationId: string;
  userId: {
    _id: string;
    name?: string;
    email?: string;
  };
  amount: number;
  status: "pending" | "approved" | "rejected";
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// רשימת בקשות המימון של חברי הארגון (ממתינות + טופלו), חדש לישן
export const getOrganizationFundingRequests = async (
  orgId: string
): Promise<{ fundingRequests: OrganizationFundingRequest[] }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.fundingRequests(orgId), { method: "GET" });
};

// אישור/דחייה של בקשת מימון - אישור מבצע בפועל הקצאת תקציב (ראו
// resolveFundingRequest ב-organizationService.ts בשרת, המשתמש באותה לוגיקת
// הקצאה כמו allocateBudgetToUser)
export const resolveFundingRequest = async (
  orgId: string,
  requestId: string,
  decision: "approved" | "rejected"
): Promise<{
  success: boolean;
  message?: string;
  fundingRequest: OrganizationFundingRequest;
  walletBalance?: number;
  user?: OrganizationUser;
}> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.resolveFundingRequest(orgId, requestId), {
    method: "PATCH",
    body: JSON.stringify({ decision }),
  });
};

// עדכון שם/תיאור הארגון
export const updateOrganizationDetails = async (
  id: string,
  data: { name: string; description: string; logoUrl?: string }
): Promise<{ organization: AdminOrganization }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.detail(id), {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export interface OrganizationProfile {
  _id: string;
  name: string;
  createdBy: string;
  creatorEmail: string;
  selected: boolean;
}

// רשימת כל פרופילי ה-AI המאושרים במערכת + אילו מהם נבחרו עבור הארגון
export const getOrganizationProfiles = async (
  id: string
): Promise<{ profiles: OrganizationProfile[]; selectedProfileIds: string[] }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.profiles(id), { method: "GET" });
};

// עדכון רשימת פרופילי ה-AI המורשים לשימוש בארגון
export const updateOrganizationProfiles = async (
  id: string,
  profileIds: string[]
): Promise<{ success: boolean; organization: AdminOrganization }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.profiles(id), {
    method: "PATCH",
    body: JSON.stringify({ profileIds }),
  });
};