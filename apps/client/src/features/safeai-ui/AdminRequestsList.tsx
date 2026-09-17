import { useState, useEffect } from "react";
import { apiCall, API_ENDPOINTS } from "../../config/api";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAlert } from "../../context/alertStore";

type Reply = {
  senderRole: string;
};

type RequestUser = {
  _id?: string;
  name?: string;
  email?: string;
};

type Request = {
  _id: string;
  userId?: RequestUser | string;
  title?: string;
  status: string;
  requestType?: string;
  replies?: Reply[];
  // Set by apps/agents/inquiry-agent's classify_node, once it has looked at a request.
  urgency?: "urgent" | "normal" | "low";
  category?: "bug" | "feature" | "feedback";
};

const URGENCY_BADGE_CLASS: Record<string, string> = {
  urgent: "badge badge-danger",
  normal: "badge badge-info",
  low: "badge",
};

type ContactType = { label: string; value: string };

export default function AdminRequestsList() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showAlert } = useAlert();

  const [contactTypes, setContactTypes] = useState<ContactType[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [requestTypeFilter, setRequestTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  // Only the applied values trigger a fetch, so typing in the fields above
  // doesn't hit the server on every keystroke.
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    status: "",
    requestType: "",
    fromDate: "",
    toDate: "",
  });

  const isRequestNew = (req: Request) => {
    const hasAdminReply = req.replies?.some((reply: Reply) => reply.senderRole === "admin");
    return req.status === "open" && !hasAdminReply;
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("requests.confirmDeletePermanent"))) return;

    try {
      setDeletingRequestId(id);
      await apiCall(`${API_ENDPOINTS.contact}/${id}`, { method: "DELETE" });
      setRequests((prev) => prev.filter((req) => req._id !== id));
    } catch (err) {
      console.error("שגיאה במחיקת הפנייה:", err);
      showAlert(t("requests.deleteFailedAlert"), { type: "error" });
    } finally {
      setDeletingRequestId(null);
    }
  };

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await apiCall<{ data: ContactType[] }>(API_ENDPOINTS.contactTypes);
        setContactTypes(response.data);
      } catch (err) {
        console.error("שגיאה בטעינת סוגי הפניות:", err);
      }
    };
    fetchTypes();
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (appliedFilters.search.trim()) params.set("search", appliedFilters.search.trim());
        if (appliedFilters.status) params.set("status", appliedFilters.status);
        if (appliedFilters.requestType) params.set("requestType", appliedFilters.requestType);
        if (appliedFilters.fromDate) params.set("fromDate", appliedFilters.fromDate);
        if (appliedFilters.toDate) params.set("toDate", appliedFilters.toDate);
        const query = params.toString();

        const data = await apiCall<Request[]>(
          query ? `${API_ENDPOINTS.allRequests}?${query}` : API_ENDPOINTS.allRequests,
          { method: "GET" },
        );
        setRequests(data || []);
      } catch (err) {
        console.error("שגיאה בטעינה:", err);
        setError(t("requests.loadAllFailedError"));
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [appliedFilters]);

  const applyFilters = () => {
    setAppliedFilters({
      search: searchText,
      status: statusFilter,
      requestType: requestTypeFilter,
      fromDate,
      toDate,
    });
  };

  const resetFilters = () => {
    setSearchText("");
    setStatusFilter("");
    setRequestTypeFilter("");
    setFromDate("");
    setToDate("");
    setAppliedFilters({ search: "", status: "", requestType: "", fromDate: "", toDate: "" });
  };

  const filtersBar = (
    <div className="requests-filters-card">
      <div className="requests-filters-row">
        <input
          className="requests-filters-search"
          type="text"
          placeholder={t("requests.searchPlaceholder")}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t("requests.allStatuses")}</option>
          <option value="open">{t("inquiries.statusOpen")}</option>
          <option value="closed">{t("requests.closedStatus")}</option>
        </select>

        <select value={requestTypeFilter} onChange={(e) => setRequestTypeFilter(e.target.value)}>
          <option value="">{t("requests.allTypes")}</option>
          {contactTypes.map((ct) => (
            <option key={ct.value} value={ct.value}>{ct.label}</option>
          ))}
        </select>

        <label>{t("inquiries.fromDate")}</label>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />

        <label>{t("inquiries.toDate")}</label>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

        <div className="requests-filters-buttons">
          <button className="btn btn-primary" onClick={applyFilters}>{t("inquiries.filterBtn")}</button>
          <button className="btn btn-secondary" onClick={resetFilters} type="button">{t("inquiries.resetBtn")}</button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="admin-requests-container">
        <h2>{t("requests.adminTitle")}</h2>
        {filtersBar}
        <p>{t("requests.loadingRequests")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-requests-container">
        <h2>{t("requests.adminTitle")}</h2>
        {filtersBar}
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-requests-container">
      <h2>{t("requests.adminTitle")}</h2>
      {filtersBar}
      {requests.length === 0 ? (
        <p>{t("requests.noRequestsYet")}</p>
      ) : (
        <table className="requests-table">
          <thead>
            <tr>
              <th></th>
              <th>{t("requests.userColumn")}</th>
              <th>{t("requests.emailColumn")}</th>
              <th>{t("requests.subjectColumn")}</th>
              <th>{t("requests.statusColumn")}</th>
              <th>{t("requests.urgencyColumn")}</th>
              <th>{t("requests.categoryColumn")}</th>
              <th>{t("common.delete")}</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => {
              const newBadge = isRequestNew(req);
              const needsAdminAttention = req.status === "open" && (!req.replies || req.replies.length === 0 || req.replies[req.replies.length - 1].senderRole === "user");
              const userInfo = typeof req.userId === "object" ? req.userId : undefined;
              return (
                <tr key={req._id}>
                  <td>
                    {needsAdminAttention && (
                      <span className="request-new-badge request-new-icon">{t("requests.newReplyBadge")}</span>
                    )}
                  </td>
                  <td onClick={() => navigate(`/request/${req._id}`)} style={{ cursor: "pointer" }}>
                    {userInfo?.name || t("requests.unknownValue")}
                  </td>
                  <td onClick={() => navigate(`/request/${req._id}`)} style={{ cursor: "pointer" }}>
                    {userInfo?.email ? <span dir="ltr">{userInfo.email}</span> : t("requests.noEmailValue")}
                  </td>
                  <td onClick={() => navigate(`/request/${req._id}`)} style={{ cursor: "pointer" }}>
                    {req.title || t("requests.noSubject")}
                  </td>
                  <td onClick={() => navigate(`/request/${req._id}`)} style={{ cursor: "pointer" }}>
                    {req.status === "closed" ? t("requests.closedStatus") : t("inquiries.statusOpen")}
                    {newBadge && <span className="request-new-badge">{t("requests.newBadge")}</span>}
                  </td>
                  <td>
                    {req.urgency ? (
                      <span className={URGENCY_BADGE_CLASS[req.urgency] || "badge"}>
                        {t(`requests.urgency.${req.urgency}`)}
                      </span>
                    ) : (
                      <span className="badge">{t("requests.notClassifiedYet")}</span>
                    )}
                  </td>
                  <td>
                    {req.category ? t(`requests.category.${req.category}`) : "—"}
                  </td>
                  <td>
                    <button
                      className="delete-request-btn"
                      onClick={() => handleDelete(req._id)}
                      disabled={deletingRequestId === req._id}
                      title={t("requests.deleteRequestTitle")}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19 6L18.3333 19.3333C18.3333 20.0512 17.7386 20.6458 17.0208 20.6458H6.97917C6.26126 20.6458 5.66667 20.0512 5.66667 19.3333L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 6V4.33333C8 3.61542 8.59459 3.02083 9.3125 3.02083H14.6875C15.4054 3.02083 16 3.61542 16 4.33333V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
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
