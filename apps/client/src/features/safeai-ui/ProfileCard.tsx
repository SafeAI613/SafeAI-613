import { useTranslation } from "react-i18next";
import type { Profile } from "./ProfilesManagement";

interface Props {
  profile: Profile;
  onEdit: (profile: Profile) => void;
  onDelete: (id: string, name: string) => void;
}

function PromptSection({ label, prompts }: { label: string; prompts: string[] }) {
  const { t } = useTranslation();
  if (!prompts.length) return null;
  return (
    <div style={{ marginBottom: "5px", fontSize: "13px" }}>
      <strong>{label}:</strong> {t("profilesManagement.promptCount", { count: prompts.length })}
      <div style={{ marginTop: "3px", paddingInlineStart: "10px", fontSize: "12px", color: "var(--text-muted)" }}>
        {prompts.map((p, i) => (
          <div key={i} style={{ marginBottom: "2px" }}>• {p.substring(0, 50)}{p.length > 50 ? "..." : ""}</div>
        ))}
      </div>
    </div>
  );
}

export default function ProfileCard({ profile, onEdit, onDelete }: Props) {
  const { t } = useTranslation();
  const hasPrompts =
    (profile.contentPrompts?.length ?? 0) +
    (profile.behaviorPrompts?.length ?? 0) +
    (profile.knowledgePrompts?.length ?? 0) > 0;

  return (
    <div className="item-card">
      <div className="item-card-header">
        <h3 className="item-card-title">{profile.name}</h3>
      </div>
      <div className="item-card-body">
        <div className="item-detail">
          <span className="item-detail-label">{t("profilesManagement.createdByLabel")}</span>
          <span className="item-detail-value">{profile.createdBy}</span>
        </div>
        <div className="item-detail">
          <span className="item-detail-label">{t("profilesManagement.emailLabel")}</span>
          <span className="item-detail-value">{profile.creatorEmail}</span>
        </div>
        <div className="item-detail">
          <span className="item-detail-label">{t("profilesManagement.approvalStatusLabel")}</span>
          <span className={`badge ${
            profile.approvalStatus === "approved" ? "badge-success" :
            profile.approvalStatus === "rejected" ? "badge-danger" : "badge-warning"
          }`}>
            {profile.approvalStatus === "approved" ? `✅ ${t("profilesManagement.approvedBadge")}` :
             profile.approvalStatus === "rejected" ? `❌ ${t("profilesManagement.rejectedBadge")}` : `⏳ ${t("profilesManagement.pendingBadge")}`}
          </span>
        </div>
        <div className="item-detail">
          <span className="item-detail-label">{t("profilesManagement.visibilityLabel")}</span>
          <span className={`badge ${profile.visibility === "public" ? "badge-info" : "badge-secondary"}`}>
            {profile.visibility === "public" ? `🌐 ${t("profilesManagement.publicBadge")}` : `🔒 ${t("profilesManagement.internalBadge")}`}
          </span>
        </div>
        {(profile.allowedCategories?.length ?? 0) > 0 && (
          <div className="item-detail">
            <span className="item-detail-label">{t("profilesManagement.allowedCategoriesLabel")}</span>
            <span className="item-detail-value">{profile.allowedCategories!.length}</span>
          </div>
        )}
        {(profile.blockedCategories?.length ?? 0) > 0 && (
          <div className="item-detail">
            <span className="item-detail-label">{t("profilesManagement.blockedCategoriesLabel")}</span>
            <span className="item-detail-value">{profile.blockedCategories!.length}</span>
          </div>
        )}
        <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}>
          <strong style={{ display: "block", marginBottom: "5px" }}>📝 Prompts:</strong>
          <PromptSection label="Content" prompts={profile.contentPrompts ?? []} />
          <PromptSection label="Behavior" prompts={profile.behaviorPrompts ?? []} />
          <PromptSection label="Knowledge" prompts={profile.knowledgePrompts ?? []} />
          {!hasPrompts && <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{t("profilesManagement.noPromptsDefined")}</div>}
        </div>
      </div>
      <div className="item-card-footer" style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
        <button className="btn btn-secondary" onClick={() => onEdit(profile)} style={{ flex: 1 }}>
          {t("common.edit")}
        </button>
        <button className="btn btn-danger" onClick={() => onDelete(profile._id, profile.name)} style={{ flex: 1 }}>
          {t("common.delete")}
        </button>
      </div>
    </div>
  );
}
