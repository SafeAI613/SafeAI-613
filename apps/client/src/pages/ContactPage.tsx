import { useState, type FormEvent, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { API_ENDPOINTS, apiCall } from "../config/api";
import { useScreenCapture } from "../hooks/useScreenCapture";
import "../styles/contact-page.css";
import { SEO } from "../components/SEO";
import { ROUTES, loginPath } from "../router/paths";

const MAX_ATTACHMENTS = 5;

// Fallback cap when S3 is unavailable and the file is stored directly in
// MongoDB instead (as a base64 data URI) - must match the server's own cap
// in contactController.ts's registerAttachment (kept well under the 16MB
// BSON document limit even with several attachments on one message).
const MAX_FALLBACK_FILE_SIZE = 2 * 1024 * 1024;

// No single step in the upload chain (get-url, S3 PUT, registering the
// attachment, reading a file as base64) should ever be able to hang
// indefinitely - each is wrapped in this so a stalled request fails loudly
// with a clear message instead of leaving the UI stuck with no error and
// no network activity to point at.
const UPLOAD_STEP_TIMEOUT_MS = 15000;

const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} - timed out`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (err) => {
        clearTimeout(timeoutId);
        reject(err);
      },
    );
  });

type UploadStatus = "uploading" | "uploaded" | "error";

interface CapturedAttachment {
  id: string;
  file: File;
  previewUrl: string;
  type: "image" | "video";
  uploadStatus: UploadStatus;
  uploadedUrl?: string;
}

export default function ContactPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [requestType, setRequestType] = useState("כללי"); // default value sent to the server (data, not UI text) - ערך ברירת מחדל
  const [contactTypes, setContactTypes] = useState<{ label: string; value: string }[]>([]);

  const [attachments, setAttachments] = useState<CapturedAttachment[]>([]);
  const attachmentLimitReached = attachments.length >= MAX_ATTACHMENTS;
  const hasUploadingAttachment = attachments.some((a) => a.uploadStatus === "uploading");

  const updateAttachment = (id: string, patch: Partial<CapturedAttachment>) => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  // Validation and upload problems are always shown in the error style;
  // only a successful submit uses the success style.
  const showError = (text: string) => {
    setMessageType("error");
    setMessage(text);
  };

  const readFileAsDataUri = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read the file"));
      reader.readAsDataURL(file);
    });

  // Used when the S3 upload itself fails (e.g. the bucket's CORS isn't
  // configured yet) - stores the file directly in MongoDB via the same
  // registerAttachment endpoint, just with `data` instead of `url`. Only a
  // stopgap: capped at MAX_FALLBACK_FILE_SIZE, nowhere near S3's headroom.
  const uploadAttachmentToMongoFallback = async (id: string, file: File, type: "image" | "video") => {
    if (file.size > MAX_FALLBACK_FILE_SIZE) {
      console.error(
        `[attachment-upload ${id}] file too large for MongoDB fallback (${file.size} bytes > ${MAX_FALLBACK_FILE_SIZE}).`,
      );
      showError(t("contactPage.errorFallbackTooLarge"));
      updateAttachment(id, { uploadStatus: "error" });
      return;
    }
    try {
      console.log(`[attachment-upload ${id}] reading file as data URI for MongoDB fallback...`);
      const dataUri = await withTimeout(readFileAsDataUri(file), UPLOAD_STEP_TIMEOUT_MS, "Reading the file");

      console.log(`[attachment-upload ${id}] registering fallback attachment in MongoDB...`);
      await withTimeout(
        apiCall(API_ENDPOINTS.contactAttachments, {
          method: "POST",
          body: JSON.stringify({ data: dataUri, type }),
        }),
        UPLOAD_STEP_TIMEOUT_MS,
        "Saving the fallback file",
      );

      console.log(`[attachment-upload ${id}] done via MongoDB fallback.`);
      updateAttachment(id, { uploadStatus: "uploaded", uploadedUrl: dataUri });
    } catch (fallbackErr) {
      console.error(`[attachment-upload ${id}] MongoDB fallback also failed:`, fallbackErr);
      showError(t("contactPage.errorFallbackFailed"));
      updateAttachment(id, { uploadStatus: "error" });
    }
  };

  // Uploads a single captured file to S3 (same get-url + PUT pattern as
  // AddPostModal.tsx) and registers it with the server as "pending", right
  // away instead of waiting for form submit - so the file survives even if
  // the user closes the page before ever clicking "שלח הודעה". The daily
  // cleanup job (server-side) removes anything left "pending" for 24h.
  //
  // Every network step is wrapped in withTimeout and logged with the
  // attachment's id, so a stuck upload is always diagnosable from the
  // console instead of showing as a silent, indefinite spinner.
  const uploadAttachment = async (id: string, file: File, type: "image" | "video") => {
    updateAttachment(id, { uploadStatus: "uploading" });
    console.log(`[attachment-upload ${id}] start (size=${file.size}, type=${type})`);
    try {
      console.log(`[attachment-upload ${id}] requesting presigned S3 URL...`);
      // POST /api/upload/get-url requires authentication - must go through
      // apiCall() (which attaches the Authorization header and refreshes an
      // expired token) rather than a bare fetch(), or this always 401s. A
      // 401 here was silently masked by the MongoDB fallback below, so every
      // attachment was quietly going through the slow/size-capped path
      // instead of S3.
      const { uploadUrl, fileUrl } = await withTimeout(
        apiCall<{ uploadUrl: string; fileUrl: string }>(API_ENDPOINTS.upload.getUrl, {
          method: "POST",
          body: JSON.stringify({ fileName: file.name, fileType: file.type }),
        }),
        UPLOAD_STEP_TIMEOUT_MS,
        "Requesting a presigned URL",
      );

      console.log(`[attachment-upload ${id}] uploading to S3...`);
      const s3Response = await withTimeout(
        fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        }),
        UPLOAD_STEP_TIMEOUT_MS,
        "Uploading to S3",
      );
      if (!s3Response.ok) throw new Error("Attachment upload to S3 failed");

      console.log(`[attachment-upload ${id}] S3 upload ok, registering as pending...`);
      await withTimeout(
        apiCall(API_ENDPOINTS.contactAttachments, {
          method: "POST",
          body: JSON.stringify({ url: fileUrl, type }),
        }),
        UPLOAD_STEP_TIMEOUT_MS,
        "Registering the file on the server",
      );

      console.log(`[attachment-upload ${id}] done via S3.`);
      updateAttachment(id, { uploadStatus: "uploaded", uploadedUrl: fileUrl });
    } catch (err) {
      console.error(`[attachment-upload ${id}] S3 path failed, falling back to MongoDB:`, err);
      await uploadAttachmentToMongoFallback(id, file, type);
    }
  };

  const addCapturedAttachment = (file: File, type: "image" | "video") => {
    // Built outside the setAttachments updater, on purpose: React doesn't run
    // that updater synchronously, so a variable only assigned inside it (the
    // previous approach) is still null on the very next line - uploadAttachment
    // would silently never be called and the attachment would stay stuck on
    // "uploading" forever. Guard against the attachment limit here too so we
    // don't kick off an upload for an item that the updater below ends up
    // dropping.
    if (attachments.length >= MAX_ATTACHMENTS) return;
    const item: CapturedAttachment = {
      id: `${Date.now()}-${attachments.length}`,
      file,
      type,
      previewUrl: URL.createObjectURL(file),
      uploadStatus: "uploading",
    };
    setAttachments((prev) => (prev.length >= MAX_ATTACHMENTS ? prev : [...prev, item]));
    uploadAttachment(item.id, item.file, item.type);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => {
      const toRemove = prev.find((a) => a.id === id);
      if (toRemove) URL.revokeObjectURL(toRemove.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const clearAttachments = () => {
    setAttachments((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.previewUrl));
      return [];
    });
  };

  // Called whenever a recording finishes, whether stopped via our own
  // button or via the browser's own "stop sharing" control. `file` is null
  // if the recording came out empty (see useScreenCapture for why that can
  // happen) - surface that instead of silently doing nothing.
  const { isSupported: isCaptureSupported, isRecording, captureScreenshot, startRecording, stopRecording } =
    useScreenCapture((file) => {
      if (file) addCapturedAttachment(file, "video");
      else showError(t("contactPage.errorEmptyRecording"));
    });

  const handleScreenshotClick = async () => {
    try {
      const file = await captureScreenshot();
      if (file) addCapturedAttachment(file, "image");
    } catch (err) {
      console.error("Error capturing screenshot:", err);
      showError(t("contactPage.errorScreenshot"));
    }
  };

  const handleRecordingClick = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    try {
      await startRecording();
    } catch (err) {
      console.error("Error starting screen recording:", err);
      showError(t("contactPage.errorRecordingStart"));
    }
  };

  // הוספת useEffect לטעינת הנתונים מהשרת
useEffect(() => {
  const fetchTypes = async () => {
    try {
      const response = await apiCall<{ data: {label: string, value: string}[] }>(API_ENDPOINTS.contactTypes);
      setContactTypes(response.data);
    } catch (e) {
      console.error("Failed to load types", e);
    }
  };
  fetchTypes();
}, []);
  
  // Check if user is logged in
  const accessToken = localStorage.getItem("accessToken");
  const user = localStorage.getItem("user");
  const isLoggedIn = !!(accessToken && user);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

     if (!isLoggedIn) {
       showError(t("contact.requiresLogin"));
       return;
     }

    if (!title.trim() || !description.trim()) {
      showError(t("contact.allFieldsRequired"));
      return;
    }

    if (hasUploadingAttachment) {
      showError(t("contactPage.errorStillUploading"));
      return;
    }
    if (attachments.some((a) => a.uploadStatus === "error")) {
      showError(t("contactPage.errorFailedUpload"));
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      // Every attachment was already uploaded to S3 and registered as
      // "pending" the moment it was captured (see uploadAttachment) - just
      // send the URLs already on hand, no re-uploading here.
      const uploadedAttachments = attachments
        .filter((a) => a.uploadStatus === "uploaded" && a.uploadedUrl)
        .map((a) => ({ url: a.uploadedUrl as string, type: a.type }));

      // Send contact form to backend
      const response = await apiCall<{ success: boolean; message: string }>(
        API_ENDPOINTS.contact,
        {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            requestType: requestType.trim(),
            ...(uploadedAttachments.length ? { attachments: uploadedAttachments } : {}),
          }),
        }
      );

      setMessageType("success");
      setMessage(response.message || t("contact.successMessage"));
      setTitle("");
      setDescription("");
      clearAttachments();

      // Redirect to the user's personal requests area after 2 seconds
      setTimeout(() => {
        navigate(`${ROUTES.platform.account}/requests`);
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("contact.errorSending");
      showError(errorMessage);
      console.error("Error sending message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="contact-page">
        <SEO
          title={t("contactPage.seoTitle")}
          description={t("contactPage.seoDescription")}
          canonicalUrl="https://safeai613.com/contact"
        />
        <div className="contact-container">
          <h1>{t("contact.title")}</h1>
          <div className="login-required">
            <p>{t("contact.requiresLogin")}</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate(loginPath(ROUTES.contact))}
            >
              {t("contact.loginButton")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-page">
      <SEO
        title={t("contactPage.seoTitle")}
        description={t("contactPage.seoDescription")}
        canonicalUrl="https://safeai613.com/contact"
      />
      <div className="contact-container">
        <h1>{t("contact.title")}</h1>
        <p className="contact-subtitle">{t("contact.subtitle")}</p>

        {/* Design Partner Message */}
        <div className="design-partner-banner">
          <div className="design-partner-icon">🤝</div>
          <div className="design-partner-content">
            <h3>{t("contact.partnerBannerTitle")}</h3>
            <p>
              {t("contactPage.partnerLine1")}
              <br />
              {t("contactPage.partnerLine2")}
              <br />
              {t("contactPage.partnerLine3")} <br />
              {t("contactPage.partnerLine4")}
            </p>
            <p className="design-partner-highlight">
              💡 {t("contact.partnerHighlight")}
            </p>
            <div className="guides-link-section">
              <p>{t("contact.guidesSection")}</p>
              <Link
                to={ROUTES.hub.articles}
                className="guides-link-button"
              >
                📚 {t("contact.guidesDocs")}
              </Link>
              <a
                href="https://drive.google.com/drive/folders/1-x8qSkCQRWxfIGyNzjszUW_u3eiggY8b?usp=drive_link"
                target="_blank"
                rel="noopener noreferrer"
                className="guides-link-button secondary"
              >
                📂 {t("contact.guidesDrive")}
              </a>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="contact-form">
          <div className="form-group">
            <label htmlFor="title">{t("contact.labelTitle")}</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("contact.titlePlaceholder")}
              disabled={isSubmitting}
              required
              maxLength={100}
            />
          </div>
          <div className="form-group">
        <label htmlFor="requestType">{t("contactPage.requestTypeLabel")}</label>
        <select
  id="requestType"
  value={requestType}
  onChange={(e) => setRequestType(e.target.value)}
  disabled={isSubmitting}
  required
>
  <option value="" hidden>{t("contact.requestTypePlaceholder")}</option>
  {contactTypes.map((type) => (
    <option key={type.value} value={type.value}>{type.label}</option>
  ))}
</select>
        </div>

              <div className="form-group">
            <label htmlFor="description">{t("contact.labelDescription")}</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("contact.descriptionPlaceholder")}
              rows={8}
              disabled={isSubmitting}
              required
              maxLength={1000}
            />
          </div>

          {isCaptureSupported && (
            <div className="form-group">
              <label>{t("contactPage.attachmentsLabel", { max: MAX_ATTACHMENTS })}</label>
              <div className="screen-capture-buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleScreenshotClick}
                  disabled={isSubmitting || isRecording || attachmentLimitReached}
                >
                  {t("contactPage.screenshotButton")}
                </button>
                <button
                  type="button"
                  className={`btn ${isRecording ? "btn-danger" : "btn-secondary"}`}
                  onClick={handleRecordingClick}
                  disabled={isSubmitting || (attachmentLimitReached && !isRecording)}
                >
                  {isRecording ? t("contactPage.stopRecordingButton") : t("contactPage.startRecordingButton")}
                </button>
              </div>
              <small className="capture-hint">
                {attachmentLimitReached
                  ? t("contactPage.attachmentLimitHint", { max: MAX_ATTACHMENTS })
                  : t("contactPage.audioHint")}
              </small>

              {attachments.length > 0 && (
                <div className="attachment-preview-list">
                  {attachments.map((att) => (
                    <div key={att.id} className="attachment-preview">
                      <div className="attachment-thumb-wrap">
                        {att.type === "image" ? (
                          <img src={att.previewUrl} alt={t("contactPage.screenshotPreviewAlt")} />
                        ) : (
                          <video src={att.previewUrl} controls />
                        )}
                        {att.uploadStatus === "uploading" && (
                          <div className="attachment-spinner-overlay" aria-label={t("contactPage.uploadingFileAria")}>
                            <span className="attachment-spinner" />
                          </div>
                        )}
                      </div>
                      {att.uploadStatus === "error" && (
                        <div className="attachment-error">
                          <span>{t("contactPage.uploadFailed")}</span>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => uploadAttachment(att.id, att.file, att.type)}
                            disabled={isSubmitting}
                          >
                            {t("contactPage.retryButton")}
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary attachment-remove-btn"
                        onClick={() => handleRemoveAttachment(att.id)}
                        disabled={isSubmitting}
                      >
                        {t("contactPage.removeAttachmentButton")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || hasUploadingAttachment}
          >
            {isSubmitting
              ? t("contact.buttonSubmitting")
              : hasUploadingAttachment
                ? t("contactPage.uploadingFilesButton")
                : t("contact.buttonSubmit")}
          </button>
        </form>
      </div>
    </div>
  );
}
