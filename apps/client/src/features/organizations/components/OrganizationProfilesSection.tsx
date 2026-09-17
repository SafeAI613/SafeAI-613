import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getOrganizationProfiles,
  updateOrganizationProfiles,
} from "../api/organizationApi";
import type { OrganizationProfile } from "../api/organizationApi";

interface OrganizationProfilesSectionProps {
  orgId: string;
}

/**
 * Lets an org admin pick, out of the approved AI profiles available in the
 * system, which ones are allowed for their organization.
 */
export default function OrganizationProfilesSection({ orgId }: OrganizationProfilesSectionProps) {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<OrganizationProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { profiles: fetchedProfiles, selectedProfileIds } = await getOrganizationProfiles(orgId);
        if (cancelled) return;
        setProfiles(fetchedProfiles);
        setSelectedIds(new Set(selectedProfileIds));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("orgUsers.profilesFetchErrorFallback"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, t]);

  const toggleProfile = (profileId: string) => {
    setSaveSuccess(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);
      await updateOrganizationProfiles(orgId, Array.from(selectedIds));
      setSaveSuccess(true);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("orgUsers.profilesSaveFailedFallback"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="organization-info-card">
      <h3>{t("orgUsers.profilesTitle")}</h3>
      <p>{t("orgUsers.profilesDescription")}</p>

      {loading ? (
        <p>{t("orgUsers.profilesLoading")}</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : profiles.length === 0 ? (
        <p>{t("orgUsers.profilesEmpty")}</p>
      ) : (
        <>
          <ul className="org-profiles-list">
            {profiles.map((profile) => (
              <li key={profile._id} className="org-profiles-list-item">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(profile._id)}
                    onChange={() => toggleProfile(profile._id)}
                  />
                  <span className="org-profiles-list-name">{profile.name}</span>
                  {profile.creatorEmail && (
                    <span className="org-profiles-list-meta">
                      {t("orgUsers.profilesCreatedByLabel")} {profile.creatorEmail}
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>

          {saveError && <p className="error-text">{saveError}</p>}
          {saveSuccess && <p className="org-profiles-success">{t("orgUsers.profilesSaveSuccess")}</p>}

          <button
            type="button"
            className="topup-button"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? t("orgUsers.profilesSavingButton") : t("orgUsers.profilesSaveButton")}
          </button>
        </>
      )}
    </div>
  );
}
