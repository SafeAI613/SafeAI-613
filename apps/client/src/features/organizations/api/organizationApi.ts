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
  walletBalance: number; // ILS - charged via PayMe, see utils/currency.ts server-side
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
    monthlyBudget: number; // USD
    currentMonthSpent: number; // USD
  };
}

export interface WalletTransaction {
  _id: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  requestedAt: string;
  completedAt?: string;
  payMeTransactionId?: string;
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

// עדכון שם/תיאור/לוגו הארגון
export const updateOrganizationDetails = async (
  id: string,
  data: { name: string; description: string; logoUrl?: string }
): Promise<{ organization: AdminOrganization }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.detail(id), {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

// הוספת משתמש קיים (שאינו משויך לארגון) לפי כתובת אימייל
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

// עריכת פרטי משתמש בתוך הארגון (שם / פעיל / תקציב חודשי)
export const updateOrganizationMember = async (
  orgId: string,
  userId: string,
  data: { name?: string; isActive?: boolean; monthlyBudget?: number }
): Promise<{ success: boolean; user: OrganizationUser }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.member(orgId, userId), {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

// חלוקה שווה של יתרת ארנק הארגון בין המשתמשים (ל-$, לפי utils/currency)
export const distributeOrganizationBudgetEqually = async (
  orgId: string
): Promise<{ success: boolean; organization: AdminOrganization; userCount: number; perUserUsd: number }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.distributeBudget(orgId), {
    method: "POST",
  });
};

// היסטוריית תשלומים לארנק הארגון ("חשבוניות")
export const getOrganizationTransactions = async (
  orgId: string
): Promise<{ transactions: WalletTransaction[] }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.transactions(orgId), { method: "GET" });
};

// בקשת תוספת תקציב חודשי (משתמש רגיל -> בעל הארגון שלו)
export const requestBudgetTopUp = async (
  amount: number,
  note?: string
): Promise<{ success: boolean; sent: boolean }> => {
  return apiCall(API_ENDPOINTS.adminOrganizations.requestTopUp, {
    method: "POST",
    body: JSON.stringify({ amount, note }),
  });
};