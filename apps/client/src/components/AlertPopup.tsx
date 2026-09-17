import { useEffect } from "react";
import "../styles/alert-popup.css";

export type AlertType = "info" | "success" | "error";

interface AlertPopupProps {
  message: string;
  type: AlertType;
  onClose: () => void;
}

function AlertIcon({ type }: { type: AlertType }) {
  if (type === "success") {
    return (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.5 2.5L16 9.5" />
      </svg>
    );
  }

  if (type === "error") {
    return (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 16h.01" />
      </svg>
    );
  }

  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.5h.01" />
    </svg>
  );
}

export default function AlertPopup({ message, type, onClose }: AlertPopupProps) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="alert-popup-overlay" onClick={onClose}>
      <div
        className={`alert-popup alert-popup-${type}`}
        role="alertdialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="alert-popup-icon">
          <AlertIcon type={type} />
        </div>
        <p className="alert-popup-message">{message}</p>
        <div className="alert-popup-actions">
          <button className="alert-popup-ok" onClick={onClose} autoFocus>
            אישור
          </button>
        </div>
      </div>
    </div>
  );
}
