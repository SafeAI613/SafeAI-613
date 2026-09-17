import { useEffect, useState, useCallback } from "react";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../features/forum/api";
import "./categories-admin-page.css";

interface Category {
  _id: string;
  name: string;
  createdAt: string;
}

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCategories();
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setError("שגיאה בטעינת הקטגוריות");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;

    setSaving(true);
    setError(null);
    try {
      const res = await createCategory(name);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "שגיאה ביצירת הקטגוריה");
      }
      setNewName("");
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category._id);
    setEditingName(category.name);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleUpdate = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;

    setSaving(true);
    setError(null);
    try {
      const res = await updateCategory(id, name);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "שגיאה בעדכון הקטגוריה");
      }
      cancelEdit();
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק את הקטגוריה?")) return;

    setError(null);
    try {
      const res = await deleteCategory(id);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "שגיאה במחיקת הקטגוריה");
      }
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="admin-categories-page" dir="rtl">
      <div className="admin-categories-header">
        <h1>ניהול קטגוריות לפוסטים</h1>
      </div>

      {error && <div className="admin-categories-error">{error}</div>}

      <div className="admin-categories-new-row">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="שם קטגוריה חדשה"
        />
        <button
          className="admin-categories-add-btn"
          onClick={handleCreate}
          disabled={saving || !newName.trim()}
        >
          + הוסף קטגוריה
        </button>
      </div>

      {loading ? (
        <div className="admin-categories-loading">טוען...</div>
      ) : (
        <table className="admin-categories-table">
          <thead>
            <tr>
              <th>שם הקטגוריה</th>
              <th>נוצרה בתאריך</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="admin-categories-empty">
                  אין עדיין קטגוריות
                </td>
              </tr>
            )}
            {categories.map((category) => (
              <tr key={category._id}>
                <td>
                  {editingId === category._id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate(category._id)}
                      autoFocus
                    />
                  ) : (
                    category.name
                  )}
                </td>
                <td>{new Date(category.createdAt).toLocaleDateString("he-IL")}</td>
                <td className="admin-categories-actions">
                  {editingId === category._id ? (
                    <>
                      <button onClick={() => handleUpdate(category._id)} disabled={saving}>
                        שמור
                      </button>
                      <button onClick={cancelEdit}>ביטול</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(category)}>ערוך</button>
                      <button
                        className="admin-categories-delete-btn"
                        onClick={() => handleDelete(category._id)}
                      >
                        מחק
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
