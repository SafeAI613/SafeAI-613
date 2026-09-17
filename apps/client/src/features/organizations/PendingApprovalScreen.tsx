import { useTranslation } from "react-i18next";
import "../../styles/organizations-admin.css";

export const PendingApprovalScreen = ({
  orgName,
  status = "pending",
}: {
  orgName?: string;
  status?: "pending" | "rejected";
}) => {
  const { t } = useTranslation();

  if (status === "rejected") {
    return (
      <div className="orgs-admin-container">
        <div className="org-pending-card">
          <h2>{t("organizations.rejectedScreenTitle")}</h2>
          <p>{t("organizations.rejectedScreenPrefix")} {orgName ? <strong>{orgName}</strong> : t("organizations.pendingScreenYours")} {t("organizations.rejectedScreenSuffix")}</p>
          <p>{t("organizations.rejectedScreenFooter")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orgs-admin-container">
      <div className="org-pending-card">
        <h2>{t("organizations.pendingScreenTitle")}</h2>
        <p>{t("organizations.pendingScreenPrefix")} {orgName ? <strong>{orgName}</strong> : t("organizations.pendingScreenYours")} {t("organizations.pendingScreenSuffix")}</p>
        <p>{t("organizations.pendingScreenFooter")}</p>
      </div>
    </div>
  );
};
