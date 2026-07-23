import { useLanguageStore } from "../../stores/languageStore";
import type { Language } from "../../i18n";

const OPTIONS: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "pt", label: "PT" },
];

/**
 * Compact EN/PT segmented toggle. Reads/writes the persisted language store so
 * the whole UI switches language live and the choice survives reloads.
 */
export const LanguageSelector = () => {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  return (
    <div className="flex rounded-lg border border-edge overflow-hidden">
      {OPTIONS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
            language === code
              ? "bg-accent/15 text-accent"
              : "text-ink-muted hover:text-ink hover:bg-raised"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
