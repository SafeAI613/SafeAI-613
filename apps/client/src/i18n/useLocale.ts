import { useTranslation } from "react-i18next";

const RTL_LANGUAGES = ["he"];

export type TextDirection = "rtl" | "ltr";

/** BCP-47 locale for Intl / toLocale*String calls, matching the UI language. */
export function localeFor(language: string): string {
  return language === "en" ? "en-US" : "he-IL";
}

export function directionFor(language: string): TextDirection {
  return RTL_LANGUAGES.includes(language) ? "rtl" : "ltr";
}

/**
 * The current UI language as everything a component needs to render it:
 * the text direction (for `dir=`), the locale (for dates and numbers) and
 * a flag for the few places that branch on it.
 *
 * @example
 *   const { dir, locale } = useLocale();
 *   <div dir={dir}>{new Date(x).toLocaleDateString(locale)}</div>
 */
export function useLocale() {
  const { i18n } = useTranslation();
  const language = i18n.language;
  return {
    language,
    dir: directionFor(language),
    locale: localeFor(language),
    isRtl: directionFor(language) === "rtl",
  };
}
