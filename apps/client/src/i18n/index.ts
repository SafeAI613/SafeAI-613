import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import he from "./locales/he.json";

type Messages = Record<string, unknown>;

// Besides the main en.json / he.json, each area of the app may keep its own
// file under locales/<lang>/<area>.json (e.g. locales/en/forum.json). They
// are merged into the single "translation" namespace, so keys are still used
// as t("forum.title"). Keeping areas in separate files avoids merge conflicts
// when several people translate different pages at the same time.
const areaFiles = import.meta.glob<Messages>("./locales/*/*.json", { eager: true, import: "default" });

function isPlainObject(value: unknown): value is Messages {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(target: Messages, source: Messages): Messages {
  const result: Messages = { ...target };
  for (const [key, value] of Object.entries(source)) {
    result[key] = isPlainObject(value) && isPlainObject(result[key]) ? deepMerge(result[key] as Messages, value) : value;
  }
  return result;
}

function buildMessages(language: "en" | "he", base: Messages): Messages {
  return Object.entries(areaFiles)
    .filter(([path]) => path.startsWith(`./locales/${language}/`))
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((messages, [, file]) => deepMerge(messages, file), base);
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: buildMessages("en", en) },
    he: { translation: buildMessages("he", he) },
  },
  lng: localStorage.getItem("language") || "he",
  fallbackLng: "he",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
