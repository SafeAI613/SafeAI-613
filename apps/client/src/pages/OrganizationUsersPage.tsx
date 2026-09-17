import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  allocateBudgetToUser,
  createOrganizationMember,
  getMyOrganization,
  getOrganizationUsers,
  updateOrganizationDetails,
} from "../features/organizations/api/organizationApi";
import OrganizationFundingRequestsSection from "../features/organizations/components/OrganizationFundingRequestsSection";
import OrganizationProfilesSection from "../features/organizations/components/OrganizationProfilesSection";
import { apiCall, API_ENDPOINTS } from "../config/api";
import { useAlert } from "../context/alertStore";
import "../styles/organization-wallet.css";

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
  walletBalance?: number;
}

interface OrganizationOwner {
  _id: string;
  email?: string;
  name?: string;
}

export default function OrganizationUsersPage() {
  const { t, i18n } = useTranslation();
  const { showAlert } = useAlert();
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

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [createdMembers, setCreatedMembers] = useState<
    { name: string; email: string; password: string }[]
  >([]);

  // Autocomplete state for the domain suffix of the new member's email
  // (e.g. typing "@" suggests completing it to the organization's own domain).
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const [allocatingUserId, setAllocatingUserId] = useState<string | null>(null);
  const [allocateAmount, setAllocateAmount] = useState<number | "">("");
  const [allocateSubmitting, setAllocateSubmitting] = useState(false);
  const [allocateError, setAllocateError] = useState<string | null>(null);
  const [allocateSuccessUserId, setAllocateSuccessUserId] = useState<string | null>(null);

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
      showAlert(err instanceof Error ? err.message : "נכשלה יצירת בקשת התשלום", { type: "error" });
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
      showAlert(err instanceof Error ? err.message : t("orgUsers.updateOrgFailedFallback"), { type: "error" });
    } finally {
      setIsSavingOrg(false);
    }
  };

  const reloadUsers = async () => {
    if (!organization) return;
    const usersData = await getOrganizationUsers(organization._id);
    setUsers(usersData as unknown as User[]);
  };

  // The organization has no dedicated "domain" field on the server, so we derive
  // a sensible suggestion from the domains already used by existing org members,
  // most common first. Falls back to an empty list when the org has no members yet.
  const orgDomainsByFrequency = useMemo(() => {
    const domainCounts = new Map<string, number>();
    for (const user of users) {
      const atIndex = user.email.indexOf("@");
      if (atIndex === -1) continue;
      const domain = user.email.slice(atIndex + 1).trim().toLowerCase();
      if (!domain) continue;
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    }
    return Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([domain]) => domain);
  }, [users]);

  const emailAtIndex = memberEmail.indexOf("@");
  const emailLocalPart = emailAtIndex === -1 ? memberEmail : memberEmail.slice(0, emailAtIndex);
  const emailDomainQuery = emailAtIndex === -1 ? null : memberEmail.slice(emailAtIndex + 1);

  const emailDomainSuggestions =
    emailDomainQuery === null
      ? []
      : orgDomainsByFrequency
          .filter(
            (domain) =>
              domain !== emailDomainQuery.toLowerCase() &&
              domain.startsWith(emailDomainQuery.toLowerCase())
          )
          .slice(0, 5);

  const handleSelectDomainSuggestion = (domain: string) => {
    setMemberEmail(`${emailLocalPart}@${domain}`);
    setShowEmailSuggestions(false);
    setActiveSuggestionIndex(-1);
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showEmailSuggestions || emailDomainSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev + 1) % emailDomainSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex(
        (prev) => (prev - 1 + emailDomainSuggestions.length) % emailDomainSuggestions.length
      );
    } else if (e.key === "Enter" && activeSuggestionIndex > -1) {
      e.preventDefault();
      handleSelectDomainSuggestion(emailDomainSuggestions[activeSuggestionIndex]);
    } else if (e.key === "Escape") {
      setShowEmailSuggestions(false);
    }
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

  const toggleAllocateForm = (userId: string) => {
    setAllocateSuccessUserId(null);
    setAllocateError(null);
    if (allocatingUserId === userId) {
      setAllocatingUserId(null);
      return;
    }
    setAllocatingUserId(userId);
    setAllocateAmount("");
  };

  const handleAllocateBudget = async (e: React.FormEvent, userId: string) => {
    e.preventDefault();
    if (!organization || !allocateAmount || allocateAmount <= 0) return;

    try {
      setAllocateSubmitting(true);
      setAllocateError(null);

      const result = await allocateBudgetToUser(organization._id, userId, Number(allocateAmount));

      setOrganization((prev) => (prev ? { ...prev, walletBalance: result.walletBalance } : prev));
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId
            ? { ...u, costLimits: { ...u.costLimits, ...result.user.costLimits } as User["costLimits"] }
            : u
        )
      );

      setAllocateSuccessUserId(userId);
      setAllocateAmount("");
      setAllocatingUserId(null);
    } catch (err: unknown) {
      setAllocateError(err instanceof Error ? err.message : t("orgUsers.allocateBudgetFailedFallback"));
    } finally {
      setAllocateSubmitting(false);
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

  // Exports the full, currently-displayed organization users table (not just
  // members created in this session) to an .xlsx file. Kept separate from
  // handleDownloadExcel, which only covers freshly-created member credentials.
  const handleDownloadAllUsersExcel = () => {
    const rows = users.map((u) => ({
      [t("orgUsers.tableHeaders.email")]: u.email,
      [t("orgUsers.tableHeaders.name")]: u.name || "-",
      [t("orgUsers.tableHeaders.role")]:
        u.role === "org_owner"
          ? t("orgUsers.roleOrgOwner")
          : u.role === "admin"
          ? t("orgUsers.roleAdmin")
          : t("orgUsers.roleUser"),
      [t("orgUsers.tableHeaders.status")]: u.isActive ? t("orgUsers.active") : t("orgUsers.inactive"),
      [t("orgUsers.tableHeaders.joinStatus")]: u.lastLogin
        ? t("orgUsers.joinedLabel")
        : t("orgUsers.pendingFirstLoginLabel"),
      [t("orgUsers.tableHeaders.joinedDate")]: new Date(u.createdAt).toLocaleDateString(),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("orgUsers.allUsersExcelSheetName"));
    const dateStamp = new Date().toISOString().slice(0, 10);
    const orgName = organization?.name || t("orgUsers.excelFallbackOrgName");
    XLSX.writeFile(workbook, `${t("orgUsers.allUsersExcelFileNamePrefix")}-${orgName}-${dateStamp}.xlsx`);
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

  return (
    <div className="organization-page">
      <h1>{t("orgUsers.title")}</h1>

      {organization && (
        <div className="organization-grid">
          <div className="organization-info-card">
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
              {t("orgUsers.walletBalanceLabel")} <strong className="wallet-balance-amount">${organization.walletBalance ?? 0}</strong>
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

            <p style={{ marginTop: "14px" }}>
              <Link to="/organization/invoices">{t("orgUsers.invoicesLinkLabel")}</Link>
            </p>
          </div>
        </div>
      )}

      {organization && <OrganizationProfilesSection orgId={organization._id} />}

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
        <div className="email-autocomplete">
          <input
            type="email"
            dir="ltr"
            value={memberEmail}
            onChange={(e) => {
              setMemberEmail(e.target.value);
              setShowEmailSuggestions(true);
              setActiveSuggestionIndex(-1);
            }}
            onFocus={() => setShowEmailSuggestions(true)}
            onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 150)}
            onKeyDown={handleEmailKeyDown}
            placeholder={t("orgUsers.emailPlaceholder")}
            className="org-edit-input"
            role="combobox"
            aria-expanded={showEmailSuggestions && emailDomainSuggestions.length > 0}
            aria-autocomplete="list"
            aria-controls="email-domain-suggestions-list"
          />
          {showEmailSuggestions && emailDomainSuggestions.length > 0 && (
            <div
              id="email-domain-suggestions-list"
              role="listbox"
              className="email-autocomplete-list"
              aria-label={t("orgUsers.emailDomainSuggestionsAriaLabel")}
            >
              {emailDomainSuggestions.map((domain, index) => (
                <div
                  key={domain}
                  role="option"
                  aria-selected={index === activeSuggestionIndex}
                  tabIndex={-1}
                  className={`email-autocomplete-item${
                    index === activeSuggestionIndex ? " active" : ""
                  }`}
                  onMouseDown={() => handleSelectDomainSuggestion(domain)}
                >
                  {emailLocalPart}@{domain}
                </div>
              ))}
            </div>
          )}
        </div>
        {addMemberError && <p className="error-text">{addMemberError}</p>}
        <button type="submit" disabled={addingMember} className="topup-button">
          {addingMember ? t("orgUsers.addingButton") : t("orgUsers.addMemberButton")}
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

      <div className="org-users-header">
        <h3>{t("orgUsers.usersInOrg")} ({users.length})</h3>
        {users.length > 0 && (
          <button type="button" className="topup-button" onClick={handleDownloadAllUsersExcel}>
            {t("orgUsers.downloadAllUsersButton")}
          </button>
        )}
      </div>

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
              <th>{t("orgUsers.tableHeaders.monthlyBudget")}</th>
              <th>{t("orgUsers.tableHeaders.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => [
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
                <td dir="ltr">${user.costLimits?.monthlyBudget ?? 0}</td>
                <td>
                  <button
                    type="button"
                    className="topup-button"
                    onClick={() => toggleAllocateForm(user._id)}
                  >
                    {t("orgUsers.allocateBudgetButton")}
                  </button>
                </td>
              </tr>,
              allocatingUserId === user._id && (
                <tr key={`${user._id}-allocate`}>
                  <td colSpan={8}>
                    <form
                      onSubmit={(e) => handleAllocateBudget(e, user._id)}
                      className="topup-form"
                    >
                      <input
                        type="number"
                        min="1"
                        dir="ltr"
                        placeholder={t("orgUsers.amountPlaceholder")}
                        value={allocateAmount}
                        onChange={(e) =>
                          setAllocateAmount(e.target.value !== "" ? Number(e.target.value) : "")
                        }
                        required
                        className="topup-input"
                        autoFocus
                      />
                      <button type="submit" disabled={allocateSubmitting} className="topup-button">
                        {allocateSubmitting
                          ? t("orgUsers.processingButton")
                          : t("orgUsers.allocateBudgetSubmit")}
                      </button>
                      <button
                        type="button"
                        className="retry-button"
                        disabled={allocateSubmitting}
                        onClick={() => setAllocatingUserId(null)}
                      >
                        {t("orgUsers.cancelButton")}
                      </button>
                    </form>
                    {allocateError && <p className="error-text">{allocateError}</p>}
                  </td>
                </tr>
              ),
              allocateSuccessUserId === user._id && (
                <tr key={`${user._id}-success`}>
                  <td colSpan={8}>
                    <p className="wallet-balance">{t("orgUsers.allocateBudgetSuccess")}</p>
                  </td>
                </tr>
              ),
            ])}
          </tbody>
        </table>
      )}

      {organization && (
        <OrganizationFundingRequestsSection
          organizationId={organization._id}
          onApproved={({ walletBalance, user }) => {
            if (walletBalance !== undefined) {
              setOrganization((prev) => (prev ? { ...prev, walletBalance } : prev));
            }
            if (user) {
              setUsers((prev) =>
                prev.map((u) =>
                  u._id === user._id
                    ? { ...u, costLimits: { ...u.costLimits, ...user.costLimits } as User["costLimits"] }
                    : u
                )
              );
            }
          }}
        />
      )}
    </div>
  );
}
