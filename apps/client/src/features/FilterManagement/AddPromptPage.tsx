import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { approvePrompt } from "./FilterManagementSlice";
import { useNavigate } from "react-router-dom";
import { useAlert } from "../../context/alertStore";

type PromptStatus = "active" | "not active";

type Prompt = {
  id: number;
  groupId: string;
  content: string;
  Status: PromptStatus;
};

const AddPromptPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [type, setType] = useState<"free" | "list">("free");
  const [freeText, setFreeText] = useState<string>("");
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");

  const addPromptsList = useAppSelector((state) => state.filterManagement.addPrompts) as Prompt[];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (type === "free") {
      if (!freeText.trim()) return showAlert(t("filterManagement.enterContentAlert"), { type: "error" });

      const newPrompt: Prompt = {
        id: Date.now(),
        groupId: "new",
        content: freeText.trim(),
        Status: "active",
      };

      dispatch(approvePrompt(newPrompt));
      showAlert(t("filterManagement.promptAddedSuccessAlert"), { type: "success" });
      navigate(-1);
      return;
    }

    const idNum = Number(selectedPromptId);
    const promptToAdd = addPromptsList.find((p) => p.id === idNum);

    if (promptToAdd) {
      dispatch(approvePrompt(promptToAdd));
      showAlert(t("filterManagement.promptAddedSuccessAlert"), { type: "success" });
      navigate(-1);
    } else {
      showAlert(t("filterManagement.selectValidPromptAlert"), { type: "error" });
    }
  };

  return (
    <div className="prompt-container" style={{ padding: "20px" }}>
      <h2>{t("filterManagement.addNewPromptTitle")}</h2>

      <div style={{ marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => setType("free")}
          style={{ marginLeft: "10px" }}
        >
          {t("filterManagement.freeTypeBtn")}
        </button>
        <button type="button" onClick={() => setType("list")}>
          {t("filterManagement.searchFromListBtn")}
        </button>
      </div>

      {type === "free" && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "10px" }}>
            <label>{t("filterManagement.promptContentLabel")} </label>
            <input
              type="text"
              value={freeText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFreeText(e.target.value)
              }
            />
          </div>
          <button type="submit">{t("common.addButton")}</button>
        </form>
      )}

      {type === "list" && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "10px" }}>
            <label>{t("filterManagement.selectPromptLabel")} </label>
            <select
              value={selectedPromptId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedPromptId(e.target.value)
              }
            >
              <option value="">{t("filterManagement.selectPlaceholderOption")}</option>
              {addPromptsList.map((prompt) => (
                <option key={prompt.id} value={String(prompt.id)}>
                  {prompt.content}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">{t("common.addButton")}</button>
        </form>
      )}

      <button onClick={() => navigate(-1)} style={{ marginTop: "20px" }}>
        {t("filterManagement.cancelAndBackBtn")}
      </button>
    </div>
  );
};

export default AddPromptPage;
