import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiCall, API_ENDPOINTS } from "../../config/api";
import { ROUTES } from "../../router/paths";

interface WalletTransactionStatus {
  status: "pending" | "completed" | "failed";
  amount: number;
  currency: string;
}

interface OrganizationDetail {
  walletBalance?: number;
}

type ViewState =
  | { phase: "loading" }
  | { phase: "success"; walletBalance: number }
  | { phase: "failed" }
  // `message` is a server error text; `messageKey` a locale key used when there is none.
  | { phase: "error"; message?: string; messageKey?: string };

/**
 * Landing page PayMe redirects the browser to after a wallet top-up
 * attempt (GoodURL/ErrorURL, built per-request in paymeClient.ts). The
 * transaction's real status (from our own DB, not just which URL PayMe
 * happened to redirect to) decides what's shown - PayMe's redirect
 * choice is a hint, not the source of truth.
 */
export default function PaymeResultPage() {
  const { id: organizationId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const requestId = searchParams.get("requestId");

  const [view, setView] = useState<ViewState>(() =>
    organizationId && requestId
      ? { phase: "loading" }
      : { phase: "error", messageKey: "organizations.payme.missingDetails" }
  );

  useEffect(() => {
    if (!organizationId || !requestId) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { transaction } = await apiCall<{ transaction: WalletTransactionStatus }>(
          API_ENDPOINTS.payme.status(organizationId, requestId)
        );

        if (cancelled) return;

        if (transaction.status === "completed") {
          const organization = await apiCall<OrganizationDetail>(
            API_ENDPOINTS.adminOrganizations.detail(organizationId)
          );
          if (cancelled) return;
          setView({ phase: "success", walletBalance: organization.walletBalance ?? 0 });
        } else if (transaction.status === "failed") {
          setView({ phase: "failed" });
        } else {
          // Still pending - webhook hasn't landed yet. Rare in practice
          // since PayMe redirects the browser after the webhook fires,
          // but treat it as a failure to be safe rather than claim success.
          setView({ phase: "failed" });
        }
      } catch (err) {
        if (!cancelled) {
          setView({
            phase: "error",
            ...(err instanceof Error ? { message: err.message } : { messageKey: "organizations.payme.statusCheckFailed" }),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId, requestId]);

  if (view.phase === "loading") {
    return (
      <div className="auth-form-container">
        <div className="auth-form-wrapper">
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div className="spinner" style={{ margin: "0 auto 20px" }}></div>
            <h2>{t("organizations.payme.checkingStatus")}</h2>
            <p style={{ color: "var(--text-muted)" }}>{t("organizations.payme.pleaseWait")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (view.phase === "success") {
    return (
      <div className="auth-form-container">
        <div className="auth-form-wrapper">
          <div style={{ textAlign: "center", padding: "40px" }}>
            <h2>{t("organizations.payme.successTitle")}</h2>
            <p>{t("organizations.payme.updatedBalanceLabel")} <strong>{view.walletBalance.toFixed(2)}</strong></p>
            <button className="btn-primary" onClick={() => navigate(ROUTES.platform.organizationUsers)}>
              {t("organizations.payme.backToOrgButton")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form-container">
      <div className="auth-form-wrapper">
        <div style={{ textAlign: "center", padding: "40px" }}>
          <h2>{t("organizations.payme.failedTitle")}</h2>
          <p style={{ color: "var(--text-muted)" }}>
            {view.phase === "error"
              ? view.message ?? t(view.messageKey ?? "organizations.payme.statusCheckFailed")
              : t("organizations.payme.notCompleted")}
          </p>
          <button className="btn-primary" onClick={() => navigate(ROUTES.platform.organizationUsers)}>
            {t("organizations.payme.retryButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
