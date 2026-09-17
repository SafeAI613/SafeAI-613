import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  getMyOrganization,
  getOrganizationInvoices,
  type OrganizationInvoice,
} from "../api/organizationApi";
import "../../../styles/organization-wallet.css";

const STATUS_COLOR: Record<OrganizationInvoice["status"], string> = {
  completed: "var(--color-success)",
  pending: "var(--color-warning)",
  failed: "var(--color-danger)",
};

export default function OrganizationInvoicesPage() {
  const { t, i18n } = useTranslation();
  const [invoices, setInvoices] = useState<OrganizationInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError("");

      const { organization: myOrg } = await getMyOrganization();
      if (!myOrg) {
        setError(t("orgUsers.noOrgMessage"));
        return;
      }

      const { invoices: orgInvoices } = await getOrganizationInvoices(myOrg._id);
      setInvoices(orgInvoices);
    } catch (err: unknown) {
      console.error("Error fetching organization invoices:", err);
      setError(err instanceof Error ? err.message : t("orgInvoices.errorTitle"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const statusLabel = (status: OrganizationInvoice["status"]) => {
    switch (status) {
      case "completed":
        return t("orgInvoices.statusCompleted");
      case "pending":
        return t("orgInvoices.statusPending");
      case "failed":
        return t("orgInvoices.statusFailed");
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="organization-page">
        <h1>{t("orgInvoices.pageTitle")}</h1>
        <p>{t("orgInvoices.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="organization-page">
        <h1>{t("orgInvoices.pageTitle")}</h1>
        <p className="error-title">{t("orgInvoices.errorTitle")}</p>
        <p className="error-text">{error}</p>
        <button className="retry-button" onClick={fetchInvoices}>
          {t("orgInvoices.retryButton")}
        </button>
      </div>
    );
  }

  return (
    <div className="organization-page">
      <h1>{t("orgInvoices.pageTitle")}</h1>
      <p>{t("orgInvoices.pageSubtitle")}</p>
      <p>
        <Link to="/organization/users">{t("orgInvoices.backToDashboard")}</Link>
      </p>

      {invoices.length === 0 ? (
        <p>{t("orgInvoices.noInvoices")}</p>
      ) : (
        <table className="organization-table">
          <thead>
            <tr>
              <th>{t("orgInvoices.tableHeaders.date")}</th>
              <th>{t("orgInvoices.tableHeaders.amount")}</th>
              <th>{t("orgInvoices.tableHeaders.status")}</th>
              <th>{t("orgInvoices.tableHeaders.reference")}</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{new Date(invoice.date).toLocaleDateString(i18n.language)}</td>
                <td dir="ltr">
                  {invoice.currency === "ILS" ? `₪${invoice.amount}` : `${invoice.amount} ${invoice.currency}`}
                </td>
                <td className="status-cell">
                  <span
                    className="status-pill"
                    style={{ backgroundColor: STATUS_COLOR[invoice.status] }}
                  >
                    {statusLabel(invoice.status)}
                  </span>
                </td>
                <td dir="ltr">{invoice.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
