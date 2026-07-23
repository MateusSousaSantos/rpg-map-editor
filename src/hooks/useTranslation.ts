import { useCallback } from "react";
import { useLanguageStore } from "../stores/languageStore";
import { translate, type Language, type TranslationKey } from "../i18n";

/**
 * Returns a `t()` function bound to the active language plus the current
 * language code. Components re-render automatically when the language changes.
 */
export function useTranslation() {
  const language = useLanguageStore((s) => s.language);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(language, key, vars),
    [language],
  );

  return { t, language };
}

export type { Language, TranslationKey };
