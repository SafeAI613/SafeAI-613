import { useState, type ChangeEvent,  } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./inquiries.css";
import { addInquiry } from "./inquiriesSlice";
import { useAlert } from "../../context/alertStore";
import type { AppDispatch } from "../../app/store";

interface Attachment {
  url: string;
  file: File;
}

interface NewInquiry {
  name: string;
  email: string;
  subject: string;
  message: string;
  attachments: Attachment[];
  status: "open" | "closed";
  createdAt: string;
}

const AddInquiries: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showAlert } = useAlert();

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleFiles = (files: FileList | null): void => {
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));

    // מוסיף את הקבצים החדשים לרשימה הקיימת במקום להחליף
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const add = (): void => {
    if (!name || !email || !subject || !message) {
      showAlert("Please fill all required fields!", { type: "error" });
      return;
    }

    const newInquiry: NewInquiry = {
      name,
      email,
      subject,
      message,
      attachments,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    dispatch(addInquiry(newInquiry));
    navigate("/inquiry-list");
  };

  return (
    <div className="inquiries-page">
      <h2>{t("inquiries.addNew")}</h2>
      <form>
        <input
          type="text"
          placeholder={t("inquiries.namePlaceholder")}
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        />
        <br />

        <input
          type="email"
          placeholder={t("inquiries.emailPlaceholder")}
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        />
        <br />

        <input
          type="text"
          placeholder={t("inquiries.subjectPlaceholder")}
          value={subject}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
        />
        <br />

        <textarea
          placeholder={t("inquiries.messagePlaceholder")}
          value={message}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
        />
        <br />

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
        />
        <br />

        <div>
          {attachments.map((a, i) => (
            <img key={i} src={a.url} width={120} alt={t("inquiries.attachmentAlt", { index: i + 1 })} />
          ))}
        </div>

        <button type="button" className="btn btn-primary" onClick={add}>
          {t("inquiries.addBtn")}
        </button>
      </form>
    </div>
  );
};

export default AddInquiries;

