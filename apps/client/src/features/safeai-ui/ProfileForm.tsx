import { useTranslation } from "react-i18next";
import type { Profile } from "./ProfilesManagement";
import ArrayInput from "./ArrayInput";

interface Props {
  formData: Partial<Profile>;
  setFormData: (data: Partial<Profile>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
  submitLabel: string;
}

export default function ProfileForm({ formData, setFormData, onSubmit, onCancel, saving, title, submitLabel }: Props) {
  const { t } = useTranslation();
  const update = (patch: Partial<Profile>) => setFormData({ ...formData, ...patch });

  const updateArray = (field: keyof Profile, index: number, value: string) => {
    const arr = [...((formData[field] as string[]) ?? [])];
    arr[index] = value;
    update({ [field]: arr });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onCancel} aria-label={t("common.close")}>×</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>{t("profilesManagement.profileNameLabel")}</label>
            <input type="text" value={formData.name ?? ""} onChange={(e) => update({ name: e.target.value })} required placeholder={t("profilesManagement.profileNamePlaceholder")} />
          </div>

          <div className="form-group">
            <label>{t("profilesManagement.createdByRequiredLabel")}</label>
            <input type="text" value={formData.createdBy ?? ""} onChange={(e) => update({ createdBy: e.target.value })} required />
          </div>

          <div className="form-group">
            <label>{t("profilesManagement.creatorEmailRequiredLabel")}</label>
            <input type="email" value={formData.creatorEmail ?? ""} onChange={(e) => update({ creatorEmail: e.target.value })} required />
          </div>

          <div className="form-group">
            <label>{t("profilesManagement.approvalStatusRequiredLabel")}</label>
            <select value={formData.approvalStatus} onChange={(e) => update({ approvalStatus: e.target.value as Profile["approvalStatus"] })} required>
              <option value="pending">⏳ {t("profilesManagement.pendingBadge")}</option>
              <option value="approved">✅ {t("profilesManagement.approvedBadge")}</option>
              <option value="rejected">❌ {t("profilesManagement.rejectedBadge")}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t("profilesManagement.visibilityRequiredLabel")}</label>
            <select value={formData.visibility} onChange={(e) => update({ visibility: e.target.value as Profile["visibility"] })} required>
              <option value="public">🌐 {t("profilesManagement.publicBadge")}</option>
              <option value="internal">🔒 {t("profilesManagement.internalBadge")}</option>
            </select>
          </div>

          <hr style={{ margin: "20px 0" }} />

          {(["allowedCategories", "blockedCategories"] as const).map((field) => (
            <ArrayInput
              key={field}
              label={field === "allowedCategories" ? t("profilesManagement.allowedCategoriesInputLabel") : t("profilesManagement.blockedCategoriesInputLabel")}
              items={(formData[field] as string[]) ?? []}
              placeholder={field === "allowedCategories" ? t("profilesManagement.allowedCategoryPlaceholder") : t("profilesManagement.blockedCategoryPlaceholder")}
              onAdd={(v) => update({ [field]: [...((formData[field] as string[]) ?? []), v] })}
              onRemove={(i) => update({ [field]: ((formData[field] as string[]) ?? []).filter((_, idx) => idx !== i) })}
              onUpdate={(i, v) => updateArray(field, i, v)}
            />
          ))}

          {(["contentPrompts", "behaviorPrompts", "knowledgePrompts"] as const).map((field) => (
            <ArrayInput
              key={field}
              label={field === "contentPrompts" ? "Content Prompts" : field === "behaviorPrompts" ? "Behavior Prompts" : "Knowledge Prompts"}
              items={(formData[field] as string[]) ?? []}
              placeholder={field === "contentPrompts" ? t("profilesManagement.contentPromptsPlaceholder") : field === "behaviorPrompts" ? t("profilesManagement.behaviorPromptsPlaceholder") : t("profilesManagement.knowledgePromptsPlaceholder")}
              onAdd={(v) => update({ [field]: [...((formData[field] as string[]) ?? []), v] })}
              onRemove={(i) => update({ [field]: ((formData[field] as string[]) ?? []).filter((_, idx) => idx !== i) })}
              onUpdate={(i, v) => updateArray(field, i, v)}
            />
          ))}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>{t("common.cancel")}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t("common.saving") : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
