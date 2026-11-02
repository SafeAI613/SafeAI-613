import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { directionFor } from "./useLocale";

export function useLanguageDirection() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.setAttribute("dir", directionFor(i18n.language));
    document.documentElement.setAttribute("lang", i18n.language);
  }, [i18n.language]);
}
