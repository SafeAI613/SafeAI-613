import { useEffect, useState, useCallback } from "react";
import { apiCall, API_ENDPOINTS } from "../config/api";
import "./forum-permissions-admin-page.css";

interface ForumUser {
  _id: string;
  name?: string;
  email: string;
  role: string;
  canCreatePosts?: boolean;
  canComment?: boolean;
}

export default function ForumPermissionsAdminPage() {
  const [users, setUsers] = useState<ForumUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const data = await apiCall<ForumUser[]>(API_ENDPOINTS.users, { signal });
      setUsers(data);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError("שגיאה בטעינת רשימת המשתמשים");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const togglePermission = async (
    user: ForumUser,
    field: "canCreatePosts" | "canComment"
  ) => {
    const nextValue = !(field === "canCreatePosts" ? user.canCreatePosts : user.canComment);
    setSavingId(user._id);
    setError(null);

    // עדכון אופטימי - כדי שהממשק יגיב מיד, עם חזרה למצב הקודם אם הבקשה נכשלת
    setUsers((prev) =>
      prev.map((u) => (u._id === user._id ? { ...u, [field]: nextValue } : u))
    );

    try {
      await apiCall(`${API_ENDPOINTS.users}/${user._id}`, {
        method: "PUT",
        body: JSON.stringify({ [field]: nextValue }),
      });
    } catch (err) {
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, [field]: !nextValue } : u))
      );
      setError((err as Error).message || "שגיאה בעדכון ההרשאה");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="forum-permissions-admin-page" dir="rtl">
      <div className="forum-permissions-admin-header">
        <h1>ניהול הרשאות לפוסטים בפורום</h1>
        <p className="forum-permissions-admin-subtitle">
          קביעה אילו משתמשים רשאים לפרסם פוסטים חדשים ולהגיב בפורום. למנהלי מערכת יש תמיד גישה מלאה.
        </p>
      </div>

      {error && <div className="forum-permissions-admin-error">{error}</div>}

      {loading ? (
        <div className="forum-permissions-admin-loading">טוען...</div>
      ) : (
        <table className="forum-permissions-admin-table">
          <thead>
            <tr>
              <th>שם</th>
              <th>אימייל</th>
              <th>תפקיד</th>
              <th>יצירת פוסטים</th>
              <th>הגבה בתגובות</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="forum-permissions-admin-empty">
                  לא נמצאו משתמשים
                </td>
              </tr>
            )}
            {users.map((user) => {
              const isAdmin = user.role === "admin";
              return (
                <tr key={user._id}>
                  <td>{user.name || "-"}</td>
                  <td dir="ltr">{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <label className="forum-permissions-admin-toggle">
                      <input
                        type="checkbox"
                        checked={isAdmin || !!user.canCreatePosts}
                        disabled={isAdmin || savingId === user._id}
                        onChange={() => togglePermission(user, "canCreatePosts")}
                      />
                      {isAdmin ? "מותר (מנהל)" : user.canCreatePosts ? "מותר" : "אסור"}
                    </label>
                  </td>
                  <td>
                    <label className="forum-permissions-admin-toggle">
                      <input
                        type="checkbox"
                        checked={isAdmin || user.canComment !== false}
                        disabled={isAdmin || savingId === user._id}
                        onChange={() => togglePermission(user, "canComment")}
                      />
                      {isAdmin ? "מותר (מנהל)" : user.canComment !== false ? "מותר" : "אסור"}
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
