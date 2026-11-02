import { useTranslation } from "react-i18next";
import { useLocale } from "../../i18n/useLocale";
import type { User } from "./UsersManagement";

interface Props {
  user: User;
  profileName: string;
  organizationName: string;
  onEdit: (user: User) => void;
  onDelete: (id: string, email: string) => void;
  onManageKeys: (user: User) => void;
}

export default function UserCard({ user, profileName, organizationName, onEdit, onDelete, onManageKeys }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  return (
    <div className="item-card">
      <div className="item-card-header">
        <h3 className="item-card-title">{user.name || user.email}</h3>
        <div className="item-card-actions">
          <span className={user.isActive ? "badge badge-success" : "badge badge-danger"}>
            {user.isActive ? t("orgUsers.active") : t("orgUsers.inactive")}
          </span>
        </div>
      </div>
      <div className="item-card-body">
        <div className="item-detail">
          <span className="item-detail-label">{t("profilesManagement.emailLabel")}</span>
          <span className="item-detail-value">{user.email}</span>
        </div>
        {user.name && (
          <div className="item-detail">
            <span className="item-detail-label">{t("usersManagement.nameColonLabel")}</span>
            <span className="item-detail-value">{user.name}</span>
          </div>
        )}
        <div className="item-detail">
          <span className="item-detail-label">{t("usersManagement.profileLabel")}</span>
          <span className="item-detail-value">
            <span className={user.profileId ? "badge badge-info" : "badge badge-secondary"}>{profileName}</span>
          </span>
        </div>
        <div className="item-detail">
          <span className="item-detail-label">{t("usersManagement.organizationLabel")}</span>
          <span className="item-detail-value">
            <span className={user.organizationId ? "badge badge-info" : "badge badge-secondary"}>{organizationName}</span>
          </span>
        </div>
        <div className="item-detail">
          <span className="item-detail-label">{t("usersManagement.modeLabel")}</span>
          <span className="item-detail-value">
            <span className={user.mode === "BYOK" ? "badge badge-info" : "badge badge-warning"}>{user.mode}</span>
          </span>
        </div>
        <div className="item-detail">
          <span className="item-detail-label">Proxy Key Prefix:</span>
          <span className="item-detail-value">{user.proxyKeyPrefix}</span>
        </div>
        <div className="item-detail">
          <span className="item-detail-label">LiteLLM Prefix:</span>
          <span className="item-detail-value">{user.litellmPrefix}</span>
        </div>
        {user.costLimits && (
          <div className="item-detail">
            <span className="item-detail-label">{t("usersManagement.monthlyCostLabel")}</span>
            <span className="item-detail-value">
              ${user.costLimits.currentMonthSpent.toFixed(2)} / ${user.costLimits.monthlyBudget.toFixed(2)}
            </span>
          </div>
        )}
        {user.createdAt && (
          <div className="item-detail">
            <span className="item-detail-label">{t("usersManagement.createdOnLabel")}</span>
            <span className="item-detail-value">{new Date(user.createdAt).toLocaleDateString(locale)}</span>
          </div>
        )}
      </div>
      <div className="item-card-footer" style={{ display: "flex", gap: "10px", marginTop: "15px", flexWrap: "wrap" }}>
        <button className="btn btn-secondary" onClick={() => onEdit(user)} style={{ flex: 1, minWidth: "100px" }}>{t("common.edit")}</button>
        {user.mode === "BYOK" && (
          <button className="btn btn-primary" onClick={() => onManageKeys(user)} style={{ flex: 1, minWidth: "100px" }}>🔑 API Keys</button>
        )}
        <button className="btn btn-danger" onClick={() => onDelete(user._id, user.email)} style={{ flex: 1, minWidth: "100px" }}>{t("common.delete")}</button>
      </div>
    </div>
  );
}
