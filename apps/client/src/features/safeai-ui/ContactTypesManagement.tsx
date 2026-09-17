import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { API_ENDPOINTS, apiCall } from "../../config/api";

export interface ContactRequestType {
  _id: string;
  label: string;
  value: string;
  isActive: boolean;
}

type FormState = { label: string; value: string; isActive: boolean };

const EMPTY_FORM: FormState = { label: "", value: "", isActive: true };

export default function ContactTypesManagement() {
  const { t } = useTranslation();
  const [types, setTypes] = useState<ContactRequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingType, setEditingType] = useState<ContactRequestType | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    fetchTypes();
  }, []);

  async function fetchTypes() {
    try {
      setLoading(true);
      const response = await apiCall<{ data: ContactRequestType[] }>(`${API_ENDPOINTS.contactTypes}/all`);
      setTypes(response.data);
    } catch (error) {
      console.error("Failed to fetch contact types:", error);
      alert(t("contactTypesManagement.errorLoading"));
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiCall(API_ENDPOINTS.contactTypes, {
        method: "POST",
        body: JSON.stringify(formData),
      });
      await fetchTypes();
      setShowCreateModal(false);
      setFormData(EMPTY_FORM);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("usersManagement.errorUnknown");
      alert(t("contactTypesManagement.createErrorPrefix", { message }));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    setSaving(true);
    try {
      await apiCall(`${API_ENDPOINTS.contactTypes}/${editingType._id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      await fetchTypes();
      setEditingType(null);
      setFormData(EMPTY_FORM);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("usersManagement.errorUnknown");
      alert(t("contactTypesManagement.updateErrorPrefix", { message }));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (type: ContactRequestType) => {
    try {
      await apiCall(`${API_ENDPOINTS.contactTypes}/${type._id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !type.isActive }),
      });
      await fetchTypes();
    } catch (error) {
      console.error("Failed to toggle contact type:", error);
      alert(t("contactTypesManagement.toggleError"));
    }
  };

  const handleDelete = async (type: ContactRequestType) => {
    if (!window.confirm(t("contactTypesManagement.deleteConfirm", { label: type.label }))) return;
    try {
      await apiCall(`${API_ENDPOINTS.contactTypes}/${type._id}`, { method: "DELETE" });
      setTypes((prev) => prev.filter((t2) => t2._id !== type._id));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("usersManagement.errorUnknown");
      alert(t("contactTypesManagement.deleteErrorPrefix", { message }));
    }
  };

  const openEditModal = (type: ContactRequestType) => {
    setEditingType(type);
    setFormData({ label: type.label, value: type.value, isActive: type.isActive });
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setEditingType(null);
    setFormData(EMPTY_FORM);
  };

  if (loading) {
    return <div className="loading-state">{t("contactTypesManagement.loading")}</div>;
  }

  const formModal = (showCreateModal || editingType) && (
    <div className="modal-overlay" onClick={closeModals}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {editingType
              ? t("contactTypesManagement.editTitle")
              : t("contactTypesManagement.newTitle")}
          </h2>
          <button className="modal-close" onClick={closeModals}>×</button>
        </div>
        <form onSubmit={editingType ? handleUpdate : handleCreate} className="auth-form">
          <div className="form-group">
            <label htmlFor="ct-label">{t("contactTypesManagement.labelField")}</label>
            <input
              id="ct-label"
              type="text"
              value={formData.label}
              onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
              required
              maxLength={50}
            />
          </div>
          <div className="form-group">
            <label htmlFor="ct-value">{t("contactTypesManagement.valueField")}</label>
            <input
              id="ct-value"
              type="text"
              value={formData.value}
              onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
              required
              maxLength={50}
              dir="ltr"
            />
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            {t("contactTypesManagement.activeField")}
          </label>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeModals}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div>
      <div className="management-header">
        <h2>{t("contactTypesManagement.title")}</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + {t("contactTypesManagement.newTypeButton")}
        </button>
      </div>

      {types.length === 0 ? (
        <div className="empty-state">
          <p>{t("contactTypesManagement.noTypesFound")}</p>
        </div>
      ) : (
        <table className="requests-table">
          <thead>
            <tr>
              <th>{t("contactTypesManagement.labelField")}</th>
              <th>{t("contactTypesManagement.valueField")}</th>
              <th>{t("contactTypesManagement.activeField")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {types.map((type) => (
              <tr key={type._id}>
                <td>{type.label}</td>
                <td dir="ltr">{type.value}</td>
                <td>
                  <button
                    className={type.isActive ? "badge badge-success" : "badge badge-danger"}
                    onClick={() => handleToggleActive(type)}
                    style={{ border: "none", cursor: "pointer" }}
                  >
                    {type.isActive ? t("contactTypesManagement.activeYes") : t("contactTypesManagement.activeNo")}
                  </button>
                </td>
                <td>
                  <div className="item-card-actions">
                    <button className="btn btn-secondary" onClick={() => openEditModal(type)}>
                      {t("common.edit")}
                    </button>
                    <button className="delete-request-btn" onClick={() => handleDelete(type)}>
                      {t("common.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {formModal}
    </div>
  );
}
