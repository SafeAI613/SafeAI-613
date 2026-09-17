import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";
import {
  createOrganizationMember,
  getMyOrganization,
  getOrganizationUsers,
  updateOrganizationDetails,
  addUserByEmailToOrganization,
  updateOrganizationMember,
  distributeOrganizationBudgetEqually,
  getOrganizationTransactions,
  type WalletTransaction,
} from "../features/organizations/api/organizationApi";
import { apiCall, API_ENDPOINTS } from "../config/api";
import "../styles/organization-wallet.css";

// Display-only estimate for the "available to distribute" indicators below -
// must match the authoritative conversion the server applies in
// organizationService.distributeOrganizationBudgetEqually (utils/currency.ts).
// The wallet itself is charged in ILS via PayMe; per-user budgets are USD.
const ILS_TO_USD_RATE = 3.7;

interface User {
  _id: string;
  email: string;
  name?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  mode: string;
  lastLogin?: string;
  costLimits?: {
    monthlyBudget: number;
    currentMonthSpent: number;
  };
}

interface Organization {
  _id: string;
  name: string;
  description: string;
  ownerId: OrganizationOwner;
  isActive: boolean;
  walletBalance?: number; // ILS
  logoUrl?: string;
}

interface OrganizationOwner {
  _id: string;
  email?: string;
  name?: string;
}

export default function OrganizationUsersPage() {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noOrganization, setNoOrganization] = useState(false);

  const [topUpAmount, setTopUpAmount] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [createdMembers, setCreatedMembers] = useState<
    { name: string; email: string; password: string }[]
  >([]);

  const [addByEmailValue, setAddByEmailValue] = useState("");
  const [addingByEmail, setAddingByEmail] = useState(false);
  const [addByEmailError, setAddByEmailError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserActive, setEditUserActive] = useState(true);
  const [editUserBudget, setEditUserBudget] = useState<number | "">("");
  const [savingUser, setSavingUser] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);

  const [distributing, setDistributing] = useState(false);
  const [distributeError, setDistributeError] = useState<string | null>(null);
  const [distributeMessage, setDistributeMessage] = useState<string | null>(null);

  const [showInvoices, setShowInvoices] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  useEffect(() => {
    fetchOrganizationAndUsers();
  }, []);

  const fetchOrganizationAndUsers = async () => {
    try {
      setLoading(true);
      setError("");
      setNoOrganization(false);

      const { organization: myOrg } = await getMyOrganization();

      if (!myOrg) {
        setNoOrganization(true);
        return;
      }

      setOrganization(myOrg as unknown as Organization);

      const usersData = await getOrganizationUsers(myOrg._id);
      setUsers(usersData as unknown as User[]);
    } catch (err: unknown) {
      console.error("Error fetching organization users:", err);
      setError(err instanceof Error ? err.message : t("orgUsers.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization || !topUpAmount || topUpAmount <= 0) return;

    try {
      setIsSubmitting(true);

      const { iframeUrl } = await apiCall<{ iframeUrl: string; requestId: string }>(
        API_ENDPOINTS.payme.initiate(organization._id),
        {
          method: "POST",
          body: JSON.stringify({ amount: Number(topUpAmount) }),
        }
      );

      // Hand off to PayMe - it redirects back to our success/fail page
      // (see PaymeResultPage.tsx) once the payment is done.
      window.location.href = iframeUrl;
    } catch (err: unknown) {
      console.error("Error initiating wallet top-up:", err);
      alert(err instanceof Error ? err.message : "נכשלה יצירת בקשת התשלום");
      setIsSubmitting(false);
    }
  };

  const startEditingOrg = () => {
    if (!organization) return;
    setEditName(organization.name);
    setEditDescription(organization.description || "");
    setIsEditingOrg(true);
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization) return;

    try {
      setIsSavingOrg(true);

      const { organization: updatedOrg } = await updateOrganizationDetails(organization._id, {
        name: editName,
        description: editDescription,
      });

      setOrganization(updatedOrg as unknown as Organization);
      setIsEditingOrg(false);
    } catch (err: unknown) {
      console.error("Error updating organization:", err);
      alert(err instanceof Error ? err.message : t("orgUsers.updateOrgFailedFallback"));
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;

    try {
      setUploadingLogo(true);
      setLogoError(null);

      const { uploadUrl, fileUrl } = await apiCall<{ uploadUrl: string; fileUrl: string }>(
        API_ENDPOINTS.upload.getUrl,
        {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            context: "orgLogo",
          }),
        }
      );

      const s3Response = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!s3Response.ok) throw new Error(t("orgUsers.logoUploadFailedFallback"));

      const { organization: updatedOrg } = await updateOrganizationDetails(organization._id, {
        name: organization.name,
        description: organization.description,
        logoUrl: fileUrl,
      });
      setOrganization(updatedOrg as unknown as Organization);
    } catch (err: unknown) {
      console.error("Error uploading organization logo:", err);
      setLogoError(err instanceof Error ? err.message : t("orgUsers.logoUploadFailedFallback"));
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const reloadUsers = async () => {
    if (!organization) return;
    const usersData = await getOrganizationUsers(organization._id);
    setUsers(usersData as unknown as User[]);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !memberName.trim() || !memberEmail.trim()) {
      setAddMemberError(t("orgUsers.addMemberFieldsRequired"));
      return;
    }
    try {
      setAddingMember(true);
      setAddMemberError(null);
      const result = await createOrganizationMember(organization._id, {
        name: memberName.trim(),
        email: memberEmail.trim(),
      });
      setCreatedMembers((prev) => [
        ...prev,
        {
          name: result.user.name || memberName.trim(),
          email: result.user.email,
          password: result.temporaryPassword,
        },
      ]);
      setMemberName("");
      setMemberEmail("");
      await reloadUsers();
    } catch (err: unknown) {
      setAddMemberError(err instanceof Error ? err.message : t("orgUsers.addMemberFailedFallback"));
    } finally {
      setAddingMember(false);
    }
  };

  const handleAddByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !addByEmailValue.trim()) return;
    try {
      setAddingByEmail(true);
      setAddByEmailError(null);
      await addUserByEmailToOrganization(organization._id, addByEmailValue.trim());
      setAddByEmailValue("");
      await reloadUsers();
    } catch (err: unknown) {
      setAddByEmailError(err instanceof Error ? err.message : t("orgUsers.addByEmailFailedFallback"));
    } finally {
      setAddingByEmail(false);
    }
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserName(user.name || "");
    setEditUserActive(user.isActive);
    setEditUserBudget(user.costLimits?.monthlyBudget ?? "");
    setEditUserError(null);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !editingUser) return;
    try {
      setSavingUser(true);
      setEditUserError(null);
      await updateOrganizationMember(organization._id, editingUser._id, {
        name: editUserName.trim() || undefined,
        isActive: editUserActive,
        monthlyBudget: editUserBudget === "" ? undefined : Number(editUserBudget),
      });
      setEditingUser(null);
      await reloadUsers();
    } catch (err: unknown) {
      setEditUserError(err instanceof Error ? err.message : t("orgUsers.editUserFailedFallback"));
    } finally {
      setSavingUser(false);
    }
  };

  const handleDistribute = async () => {
    if (!organization) return;
    if (!confirm(t("orgUsers.distributeConfirm"))) return;
    try {
      setDistributing(true);
      setDistributeError(null);
      setDistributeMessage(null);
      const result = await distributeOrganizationBudgetEqually(organization._id);
      setOrganization((prev) => (prev ? { ...prev, walletBalance: result.organization.walletBalance } : prev));
      setDistributeMessage(
        t("orgUsers.distributeSuccess", { count: result.userCount, amount: result.perUserUsd.toFixed(2) })
      );
      await reloadUsers();
    } catch (err: unknown) {
      setDistributeError(err instanceof Error ? err.message : t("orgUsers.distributeFailedFallback"));
    } finally {
      setDistributing(false);
    }
  };

  const toggleInvoices = async () => {
    if (!organization) return;
    const next = !showInvoices;
    setShowInvoices(next);
    if (next && transactions.length === 0) {
      try {
        setLoadingTransactions(true);
        const { transactions: data } = await getOrganizationTransactions(organization._id);
        setTransactions(data);
      } catch (err) {
        console.error("Error fetching invoices:", err);
      } finally {
        setLoadingTransactions(false);
      }
    }
  };

  const handleDownloadExcel = () => {
    const loginUrl = `${window.location.origin}/login`;
    const rows = createdMembers.map((m) => ({
      [t("orgUsers.excelHeaderName")]: m.name,
      [t("orgUsers.excelHeaderEmail")]: m.email,
      [t("orgUsers.excelHeaderPassword")]: m.password,
      [t("orgUsers.excelHeaderLoginLink")]: loginUrl,
      [t("orgUsers.excelHeaderStatus")]: t("orgUsers.excelStatusPendingLogin"),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("orgUsers.excelSheetName"));
    XLSX.writeFile(workbook, `${t("orgUsers.excelFileNamePrefix")}-${organization?.name || t("orgUsers.excelFallbackOrgName")}.xlsx`);
    setCreatedMembers([]);
  };

  if (loading) {
    return (
      <div className="organization-page">
        <h1>{t("orgUsers.title")}</h1>
        <p>{t("orgUsers.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="organization-page">
        <h1>{t("orgUsers.title")}</h1>
        <p className="error-title">{t("orgUsers.errorTitle")}</p>
        <p className="error-text">{error}</p>
        <button className="retry-button" onClick={fetchOrganizationAndUsers}>
          {t("orgUsers.retryButton")}
        </button>
      </div>
    );
  }

  if (noOrganization) {
    return (
      <div className="organization-page">
        <h1>{t("orgUsers.title")}</h1>
        <p>{t("orgUsers.noOrgMessage")}</p>
      </div>
    );
  }

  const walletBalanceIls = organization?.walletBalance ?? 0;
  const availableToDistributeUsd = walletBalanceIls / ILS_TO_USD_RATE;
  const nonOwnerUsers = users.filter((u) => u.role !== "org_owner");
  const totalHeldByUsersUsd = nonOwnerUsers.reduce((sum, u) => sum + (u.costLimits?.monthlyBudget ?? 0), 0);
  const totalAvailableEverywhereUsd = totalHeldByUsersUsd + availableToDistributeUsd;

  return (
    <div className="organization-page">
      <h1>{t("orgUsers.title")}</h1>

      {organization && (
        <div className="organization-grid">
          <div className="organization-info-card">
            <div className="org-logo-row" style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
              {organization.logoUrl ? (
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  style={{ width: "56px", height: "56px", borderRadius: "12px", objectFit: "cover", border: "1px solid var(--border-default)" }}
                />
              ) : (
                <div
                  style={{
                    width: "56px", height: "56px", borderRadius: "12px", display: "flex", alignItems: "center",
                    justifyContent: "center", backgroundColor: "var(--bg-elevated)", fontSize: "22px", fontWeight: 700,
                    color: "var(--text-muted)", border: "1px solid var(--border-default)",
                  }}
                >
                  {organization.name.charAt(0)}
                </div>
              )}
              <label className="org-edit-button" style={{ cursor: uploadingLogo ? "not-allowed" : "pointer" }}>
                {uploadingLogo ? t("orgUsers.uploadingLogo") : t("orgUsers.changeLogo")}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  disabled={uploadingLogo}
                  style={{ display: "none" }}
                />
              </label>
            </div>
            {logoError && <p className="error-text">{logoError}</p>}

            {isEditingOrg ? (
              <form onSubmit={handleSaveOrg} className="org-edit-form">
                <input
                  type="text"
                  dir={i18n.dir()}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="org-edit-input"
                  placeholder={t("orgUsers.orgNamePlaceholder")}
                />
                <textarea
                  dir={i18n.dir()}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="org-edit-input"
                  placeholder={t("orgUsers.orgDescriptionPlaceholder")}
                  rows={3}
                />
                <p><strong>{t("orgUsers.status")}</strong> {organization.isActive ? t("orgUsers.active") : t("orgUsers.inactive")}</p>
                <div className="org-edit-actions">
                  <button type="submit" disabled={isSavingOrg} className="topup-button">
                    {isSavingOrg ? t("orgUsers.savingButton") : t("orgUsers.saveButton")}
                  </button>
                  <button
                    type="button"
                    className="retry-button"
                    disabled={isSavingOrg}
                    onClick={() => setIsEditingOrg(false)}
                  >
                    {t("orgUsers.cancelButton")}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="org-info-header">
                  <h2>{organization.name}</h2>
                  <button className="org-edit-button" onClick={startEditingOrg}>
                    {t("orgUsers.editButton")}
                  </button>
                </div>
                <p>{organization.description || t("orgUsers.noDescription")}</p>
                <p><strong>{t("orgUsers.status")}</strong> {organization.isActive ? t("orgUsers.active") : t("orgUsers.inactive")}</p>
              </>
            )}
          </div>

          <div className="wallet-card">
            <h3 className="wallet-title">{t("orgUsers.walletTitle")}</h3>
            <p className="wallet-balance">
              {t("orgUsers.walletBalanceLabel")} <strong className="wallet-balance-amount">₪{walletBalanceIls}</strong>
            </p>

            <div className="simulation-warning">
              ⚠️ <strong>{t("orgUsers.simulationWarningLabel")}</strong> {t("orgUsers.simulationWarningText")}
            </div>

            <form onSubmit={handleTopUp} className="topup-form">
              <input
                type="number"
                min="1"
                dir="ltr"
                placeholder={t("orgUsers.amountPlaceholder")}
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value !== "" ? Number(e.target.value) : "")}
                required
                className="topup-input"
              />
              <button type="submit" disabled={isSubmitting} className="topup-button">
                {isSubmitting ? t("orgUsers.processingButton") : t("orgUsers.topUpButton")}
              </button>
            </form>

            <div className="org-edit-form" style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border-default)" }}>
              <h4 style={{ margin: 0 }}>{t("orgUsers.distributionTitle")}</h4>
              <p style={{ margin: 0 }}>{t("orgUsers.availableToDistribute", { amount: availableToDistributeUsd.toFixed(2) })}</p>
              <p style={{ margin: 0 }}>{t("orgUsers.totalHeldEverywhere", { amount: totalAvailableEverywhereUsd.toFixed(2) })}</p>
              {distributeError && <p className="error-text">{distributeError}</p>}
              {distributeMessage && <p className="wallet-balance-amount">{distributeMessage}</p>}
              <button
                type="button"
                className="topup-button"
                onClick={handleDistribute}
                disabled={distributing || walletBalanceIls <= 0 || nonOwnerUsers.length === 0}
              >
                {distributing ? t("orgUsers.distributing") : t("orgUsers.distributeButton")}
              </button>
            </div>

            <button type="button" className="retry-button" style={{ marginTop: "14px" }} onClick={toggleInvoices}>
              {showInvoices ? t("orgUsers.hideInvoices") : t("orgUsers.viewInvoices")}
            </button>
          </div>
        </div>
      )}

      {showInvoices && (
        <div className="organization-info-card" style={{ marginBottom: "24px" }}>
          <h3>{t("orgUsers.invoicesTitle")}</h3>
          {loadingTransactions ? (
            <p>{t("orgUsers.loading")}</p>
          ) : transactions.length === 0 ? (
            <p>{t("orgUsers.noInvoices")}</p>
          ) : (
            <table className="organization-table">
              <thead>
                <tr>
                  <th>{t("orgUsers.invoiceDate")}</th>
                  <th>{t("orgUsers.invoiceAmount")}</th>
                  <th>{t("orgUsers.invoiceStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td>{new Date(tx.requestedAt).toLocaleDateString()}</td>
                    <td>₪{tx.amount}</td>
                    <td>{t(`orgUsers.invoiceStatus_${tx.status}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <h3>{t("orgUsers.addMemberTitle")}</h3>
      <form onSubmit={handleAddMember} className="org-edit-form">
        <input
          type="text"
          dir={i18n.dir()}
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
          placeholder={t("orgUsers.fullNamePlaceholder")}
          className="org-edit-input"
        />
        <input
          type="email"
          dir="ltr"
          value={memberEmail}
          onChange={(e) => setMemberEmail(e.target.value)}
          placeholder={t("orgUsers.emailPlaceholder")}
          className="org-edit-input"
        />
        {addMemberError && <p className="error-text">{addMemberError}</p>}
        <button type="submit" disabled={addingMember} className="topup-button">
          {addingMember ? t("orgUsers.addingButton") : t("orgUsers.addMemberButton")}
        </button>
      </form>

      <h3>{t("orgUsers.addExistingByEmailTitle")}</h3>
      <form onSubmit={handleAddByEmail} className="org-edit-form">
        <input
          type="email"
          dir="ltr"
          value={addByEmailValue}
          onChange={(e) => setAddByEmailValue(e.target.value)}
          placeholder={t("orgUsers.emailPlaceholder")}
          className="org-edit-input"
          required
        />
        {addByEmailError && <p className="error-text">{addByEmailError}</p>}
        <button type="submit" disabled={addingByEmail} className="topup-button">
          {addingByEmail ? t("orgUsers.addingButton") : t("orgUsers.addExistingByEmailButton")}
        </button>
      </form>

      {createdMembers.length > 0 && (
        <div className="organization-info-card">
          <p>{t("orgUsers.createdMembersMessage", { count: createdMembers.length })}</p>
          <div className="simulation-warning">{t("orgUsers.tempPasswordWarning")}</div>
          <table className="organization-table">
            <thead>
              <tr>
                <th>{t("orgUsers.tableHeaders.name")}</th>
                <th>{t("orgUsers.tableHeaders.email")}</th>
                <th>{t("orgUsers.tableHeaders.password")}</th>
              </tr>
            </thead>
            <tbody>
              {createdMembers.map((m) => (
                <tr key={m.email}>
                  <td>{m.name}</td>
                  <td>{m.email}</td>
                  <td>{m.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="topup-button" onClick={handleDownloadExcel}>
            {t("orgUsers.downloadExcelButton")}
          </button>
          <button type="button" className="retry-button" onClick={() => setCreatedMembers([])}>
            {t("orgUsers.dismissCreatedMembersButton")}
          </button>
        </div>
      )}

      <h3>{t("orgUsers.usersInOrg")} ({users.length})</h3>

      {users.length === 0 ? (
        <p>{t("orgUsers.noUsers")}</p>
      ) : (
        <table className="organization-table">
          <thead>
            <tr>
              <th>{t("orgUsers.tableHeaders.email")}</th>
              <th>{t("orgUsers.tableHeaders.name")}</th>
              <th>{t("orgUsers.tableHeaders.role")}</th>
              <th>{t("orgUsers.tableHeaders.status")}</th>
              <th>{t("orgUsers.tableHeaders.joinStatus")}</th>
              <th>{t("orgUsers.tableHeaders.joinedDate")}</th>
              <th>{t("orgUsers.tableHeaders.budget")}</th>
              <th>{t("orgUsers.tableHeaders.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.email}</td>
                <td>{user.name || "-"}</td>
                <td>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    backgroundColor: user.role === "org_owner" ? "var(--color-success)" : "var(--color-info)",
                    color: "var(--text-inverse)",
                    fontSize: "12px"
                  }}>
                    {user.role === "org_owner" ? t("orgUsers.roleOrgOwner") : user.role === "admin" ? t("orgUsers.roleAdmin") : t("orgUsers.roleUser")}
                  </span>
                </td>
                <td className="status-cell">
                  <span className="status-pill" style={{
                    backgroundColor: user.isActive ? "var(--color-success)" : "var(--color-danger)"
                  }}>
                    {user.isActive ? `✓ ${t("orgUsers.active")}` : `✕ ${t("orgUsers.inactive")}`}
                  </span>
                </td>
                <td className="status-cell">
                  <span className="status-pill" style={{
                    backgroundColor: user.lastLogin ? "var(--color-success)" : "var(--color-danger)"
                  }}>
                    {user.lastLogin ? `✓ ${t("orgUsers.joinedLabel")}` : `⏳ ${t("orgUsers.pendingFirstLoginLabel")}`}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  {user.costLimits
                    ? `$${user.costLimits.currentMonthSpent.toFixed(2)} / $${user.costLimits.monthlyBudget.toFixed(2)}`
                    : "-"}
                </td>
                <td>
                  {user.role !== "org_owner" && (
                    <button className="org-edit-button" onClick={() => openEditUser(user)}>
                      {t("orgUsers.editButton")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingUser && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setEditingUser(null)}
        >
          <div className="organization-info-card" style={{ maxWidth: "420px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <h3>{t("orgUsers.editUserTitle", { email: editingUser.email })}</h3>
            <form onSubmit={handleSaveEditUser} className="org-edit-form">
              <input
                type="text"
                dir={i18n.dir()}
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                placeholder={t("orgUsers.fullNamePlaceholder")}
                className="org-edit-input"
              />
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" checked={editUserActive} onChange={(e) => setEditUserActive(e.target.checked)} />
                {t("orgUsers.active")}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                dir="ltr"
                value={editUserBudget}
                onChange={(e) => setEditUserBudget(e.target.value !== "" ? Number(e.target.value) : "")}
                placeholder={t("orgUsers.monthlyBudgetPlaceholder")}
                className="org-edit-input"
              />
              {editUserError && <p className="error-text">{editUserError}</p>}
              <div className="org-edit-actions">
                <button type="submit" disabled={savingUser} className="topup-button">
                  {savingUser ? t("orgUsers.savingButton") : t("orgUsers.saveButton")}
                </button>
                <button type="button" className="retry-button" disabled={savingUser} onClick={() => setEditingUser(null)}>
                  {t("orgUsers.cancelButton")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
