import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocale } from "../../i18n/useLocale";
import { apiCall } from "../../config/api";
import { useAlert } from "../../context/alertStore";
import "../../styles/safeai-ui.css";

interface RequestData {
    title?: unknown; requestType?: unknown; description?: unknown; createdAt?: unknown; replies?: unknown[]; status?: unknown;
    attachments?: { url?: unknown; type?: unknown }[];
}


export default function RequestDetails() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { locale } = useLocale();
    const [request, setRequest] = useState<RequestData | null>(null);
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const [replyText, setReplyText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

        useEffect(() => {
        apiCall(`/contact/my-requests/${id}`, { method: "GET" })
            .then((data) => {
                const fetchedData = data as unknown as RequestData;
                setRequest(fetchedData);
            })
            .catch((err) => console.error("Failed to load request:", err));
    }, [id]);


    if (!request) return <div>{t("requests.loadingDetails")}</div>;

    const confirmCloseRequest = async () => {
        setIsClosing(true);
        try {
            await apiCall(`/contact/my-requests/${id}/close`, { method: "PATCH" });

            // עדכון ה-State של ה-request כדי שהסטטוס ישתנה ב-UI באופן מיידי
            setRequest({ ...request, status: 'closed' });
            navigate(-1); // נווט חזרה לרשימת הפניות לאחר סגירה
        } catch (error) {
            console.error("Failed to close request:", error);
            showAlert(t("requests.closeFailedAlert"), { type: "error" });
        } finally {
            setIsClosing(false);
            setShowCloseConfirm(false);
        }
    };

    const handleAddReply = async () => {
        if (!replyText.trim()) return;
        setIsSubmitting(true);
        try {
            const data = await apiCall(`/contact/my-requests/${id}/reply`, {
                method: "POST",
                body: JSON.stringify({ text: replyText }),
            });
            // עדכון ה-UI עם המידע החדש מהשרת
            setRequest((data as unknown as { request: RequestData }).request);
            setReplyText("");
        } catch (err) {
            console.error("Failed to send reply:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

        return (
        <div className="safeai-ui-page request-details-container">
            <button className="back-btn" onClick={() => navigate(-1)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t("requests.backToList")}
            </button>
            <h2>{t("requests.detailsTitle")}</h2>
            <div className="request-card">
                <h3>{String(request.title || "")}</h3>
                <p><strong>{t("requests.typeLabel")}</strong> {String(request.requestType || "")}</p>
                <p><strong>{t("requests.contentLabel")}</strong> {String(request.description || "")}</p>
                <p><strong>{t("requests.sentDateLabel")}</strong> {request.createdAt ? new Date(request.createdAt as string | number | Date).toLocaleDateString(locale) : ""}</p>
                {(request.attachments || []).length > 0 && (
                    <div className="request-attachment-list">
                        {(request.attachments || []).map((att, index) => {
                            if (typeof att.url !== "string" || !att.url) return null;
                            return (
                                <div key={index} className="request-attachment">
                                    {att.type === "video" ? (
                                        <video src={att.url} controls />
                                    ) : (
                                        <img src={att.url} alt={t("requests.attachmentAlt")} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                {String(request.status) === "closed" ? (
                    <button className="close-btn close-btn-disabled" disabled title={t("requests.alreadyClosedTitle")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {t("requests.requestClosedLabel")}
                    </button>
                ) : (
                    <button className="close-btn" onClick={() => setShowCloseConfirm(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {t("requests.closeRequestBtn")}
                    </button>
                )}

                <div className="replies-list">
                    {(request.replies || []).map((replyItem, index: number) => {
                        const reply = replyItem as Record<string, unknown>;
                        return (
                            <div key={index} className={`reply-bubble ${String(reply.senderRole || "")}`}>
                                <p><strong>{reply.senderRole === 'admin' ? t("requests.adminSenderLabel") : t("requests.meSenderLabel")}:</strong> {String(reply.text || "")}</p>
                                <small>{reply.createdAt ? new Date(reply.createdAt as string | number | Date).toLocaleString(locale) : ""}</small>
                            </div>
                        );
                    })}
                </div>

                <div className="reply-section">
                    <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={t("requests.replyPlaceholder")}
                    />
                    <button onClick={handleAddReply} disabled={isSubmitting}>
                        {isSubmitting ? t("requests.sendingReply") : t("requests.sendReplyBtn")}
                    </button>
                </div>
            </div>

            {showCloseConfirm && (
                <div className="modal-overlay" onClick={() => !isClosing && setShowCloseConfirm(false)}>
                    <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="confirm-modal-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 0 0 3.55 21H20.45A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h2 className="confirm-modal-title">{t("requests.closeConfirmTitle")}</h2>
                        <p className="confirm-modal-text">{t("requests.closeConfirmText")}</p>
                        <div className="modal-footer confirm-modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowCloseConfirm(false)} disabled={isClosing}>
                                {t("common.cancel")}
                            </button>
                            <button className="btn btn-danger" onClick={confirmCloseRequest} disabled={isClosing}>
                                {isClosing ? t("requests.closingBtn") : t("requests.confirmCloseBtn")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

}