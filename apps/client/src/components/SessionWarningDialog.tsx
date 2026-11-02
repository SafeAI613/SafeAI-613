import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { extendSession, handleSessionExpired, SESSION_WARNING_EVENT } from "../utils/tokenManager";

/**
 * In-app replacement for the old blocking window.confirm session warning.
 * Opens when tokenManager dispatches SESSION_WARNING_EVENT after a real idle
 * period. Accessible: role="alertdialog", labelled, focus moves to the
 * primary action, and Escape means "stay signed in" (the non-destructive choice).
 */
export default function SessionWarningDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const stayButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onWarning = () => setOpen(true);
    window.addEventListener(SESSION_WARNING_EVENT, onWarning);
    return () => window.removeEventListener(SESSION_WARNING_EVENT, onWarning);
  }, []);

  const stay = async () => {
    if (busy) return;
    setBusy(true);
    // On failure extendSession() already logs out and redirects.
    await extendSession();
    setBusy(false);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    stayButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") void stay();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stay() only reads state set here
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "var(--bg-overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-warning-title"
        aria-describedby="session-warning-body"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderRadius: "var(--radius-sm)",
          padding: "28px",
          maxWidth: "440px",
          width: "90%",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <h2 id="session-warning-title" style={{ marginBottom: "12px", fontSize: "20px", fontWeight: "bold" }}>
          {t("tokenManager.warningTitle")}
        </h2>
        <p id="session-warning-body" style={{ marginBottom: "24px" }}>
          {t("tokenManager.warningBody")}
        </p>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            ref={stayButtonRef}
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => void stay()}
            disabled={busy}
          >
            {t("tokenManager.stayButton")}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={handleSessionExpired}
            disabled={busy}
          >
            {t("tokenManager.logoutButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
