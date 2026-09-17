import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getOrganizationFundingRequests,
  resolveFundingRequest,
  OrganizationFundingRequest,
  OrganizationUser,
} from "../api/organizationApi";
import "../../../styles/organization-wallet.css";

interface Props {
  organizationId: string;
  // Lets the parent page (OrganizationUsersPage) keep its own wallet
  // balance / users table in sync when an approval actually moves money -
  // mirrors how handleAllocateBudget already updates that local state.
  onApproved?: (result: { walletBalance?: number; user?: OrganizationUser }) => void;
}

type ResolveOutcome = { requestId: string; decision: "approved" | "rejected" } | null;

function statusPillColor(status: OrganizationFundingRequest["status"]): string {
  if (status === "approved") return "var(--color-success)";
  if (status === "rejected") return "var(--color-danger)";
  return "var(--color-warning)";
}

export default function OrganizationFundingRequestsSection({ organizationId, onApproved }: Props) {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<OrganizationFundingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveErrors, setResolveErrors] = useState<Record<string, string>>({});
  const [lastOutcome, setLastOutcome] = useState<ResolveOutcome>(null);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const { fundingRequests } = await getOrganizationFundingRequests(organizationId);
      setRequests(fundingRequests);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("orgUsers.fundingRequests.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (requestId: string, decision: "approved" | "rejected") => {
    setResolvingId(requestId);
    setResolveErrors((prev) => ({ ...prev, [requestId]: "" }));
    setLastOutcome(null);
    try {
      const result = await resolveFundingRequest(organizationId, requestId, decision);
      setRequests((prev) =>
        prev.map((r) => (r._id === requestId ? { ...r, ...result.fundingRequest } : r))
      );
      setLastOutcome({ requestId, decision });
      if (decision === "approved") {
        onApproved?.({ walletBalance: result.walletBalance, user: result.user });
      }
    } catch (err: unknown) {
      setResolveErrors((prev) => ({
        ...prev,
        [requestId]:
          err instanceof Error ? err.message : t("orgUsers.fundingRequests.resolveFailedFallback"),
      }));
    } finally {
      setResolvingId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="organization-info-card" style={{ marginTop: "24px" }}>
      <div className="org-users-header">
        <h3>
          {t("orgUsers.fundingRequests.title")} ({pendingCount})
        </h3>
        <button type="button" className="retry-button" onClick={fetchRequests} disabled={loading}>
          {t("orgUsers.retryButton")}
        </button>
      </div>

      {loading ? (
        <p>{t("orgUsers.loading")}</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : requests.length === 0 ? (
        <p>{t("orgUsers.fundingRequests.empty")}</p>
      ) : (
        <table className="organization-table">
          <thead>
            <tr>
              <th>{t("orgUsers.fundingRequests.tableHeaders.requester")}</th>
              <th>{t("orgUsers.fundingRequests.tableHeaders.amount")}</th>
              <th>{t("orgUsers.fundingRequests.tableHeaders.note")}</th>
              <th>{t("orgUsers.fundingRequests.tableHeaders.status")}</th>
              <th>{t("orgUsers.fundingRequests.tableHeaders.date")}</th>
              <th>{t("orgUsers.tableHeaders.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => [
              <tr key={req._id}>
                <td>{req.userId?.name || req.userId?.email || "-"}</td>
                <td dir="ltr">${req.amount}</td>
                <td>{req.note || "-"}</td>
                <td className="status-cell">
                  <span className="status-pill" style={{ backgroundColor: statusPillColor(req.status) }}>
                    {t(`orgUsers.fundingRequests.status.${req.status}`)}
                  </span>
                </td>
                <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                <td>
                  {req.status === "pending" ? (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="topup-button"
                        disabled={resolvingId === req._id}
                        onClick={() => handleResolve(req._id, "approved")}
                      >
                        {resolvingId === req._id
                          ? t("orgUsers.processingButton")
                          : t("orgUsers.fundingRequests.approveButton")}
                      </button>
                      <button
                        type="button"
                        className="retry-button"
                        disabled={resolvingId === req._id}
                        onClick={() => handleResolve(req._id, "rejected")}
                      >
                        {t("orgUsers.fundingRequests.rejectButton")}
                      </button>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>,
              resolveErrors[req._id] ? (
                <tr key={`${req._id}-error`}>
                  <td colSpan={6}>
                    <p className="error-text">{resolveErrors[req._id]}</p>
                  </td>
                </tr>
              ) : null,
              lastOutcome?.requestId === req._id ? (
                <tr key={`${req._id}-success`}>
                  <td colSpan={6}>
                    <p className="wallet-balance">
                      {lastOutcome.decision === "approved"
                        ? t("orgUsers.fundingRequests.approveSuccess")
                        : t("orgUsers.fundingRequests.rejectSuccess")}
                    </p>
                  </td>
                </tr>
              ) : null,
            ])}
          </tbody>
        </table>
      )}
    </div>
  );
}
