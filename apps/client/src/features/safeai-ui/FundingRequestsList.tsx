import { useTranslation } from "react-i18next";

export type FundingRequestStatus = "pending" | "approved" | "rejected";

export type FundingRequest = {
  _id: string;
  amount: number;
  status: FundingRequestStatus;
  note?: string;
  createdAt: string;
};

interface Props {
  requests: FundingRequest[];
  loading: boolean;
}

function StatusBadge({ status }: { status: FundingRequestStatus }) {
  const { t } = useTranslation();
  const className =
    status === "approved"
      ? "badge badge-success"
      : status === "rejected"
        ? "badge badge-danger"
        : "badge badge-warning";
  return <span className={className}>{t(`billing.fundingRequests.status.${status}`)}</span>;
}

export default function FundingRequestsList({ requests, loading }: Props) {
  const { t } = useTranslation();

  return (
    <div className="card" style={{ marginTop: "24px" }}>
      <h3 style={{ marginTop: 0, marginBottom: "16px" }}>{t("billing.fundingRequests.title")}</h3>
      {loading ? (
        <div className="loading-state">{t("billing.loadingData")}</div>
      ) : requests.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>{t("billing.fundingRequests.empty")}</p>
      ) : (
        <table className="requests-table">
          <thead>
            <tr>
              <th>{t("billing.fundingRequests.amountColumn")}</th>
              <th>{t("billing.fundingRequests.statusColumn")}</th>
              <th>{t("billing.fundingRequests.dateColumn")}</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req._id}>
                <td>${req.amount.toFixed(2)}</td>
                <td>
                  <StatusBadge status={req.status} />
                </td>
                <td>{new Date(req.createdAt).toLocaleDateString("he-IL")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
