import { en } from "./en";
import { pt } from "./pt";

export type Language = "en" | "pt";

export const dictionaries = { en, pt } as const;

/** Dot-notation union of every leaf key in the dictionary, e.g. "home.cta". */
export type TranslationKey = DotKeys<typeof en>;

type DotKeys<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : `${K}.${DotKeys<T[K]>}`;
}[keyof T & string];

/** Detect the initial language from the browser, defaulting to English. */
export function detectLanguage(): Language {
  if (typeof navigator === "undefined") return "en";
  return navigator.language?.toLowerCase().startsWith("pt") ? "pt" : "en";
}

/** Resolve a dot-path key against a dictionary, falling back to English. */
function resolve(language: Language, key: string): string {
  const lookup = (dict: unknown) =>
    key
      .split(".")
      .reduce<unknown>(
        (obj, part) =>
          obj && typeof obj === "object"
            ? (obj as Record<string, unknown>)[part]
            : undefined,
        dict,
      );

  const value = lookup(dictionaries[language]) ?? lookup(dictionaries.en);
  return typeof value === "string" ? value : key;
}

/** Replace `{placeholder}` tokens with the matching values. */
function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * Translate a key for a given language. Used by the `useTranslation` hook and by
 * non-hook callers (e.g. the ErrorBoundary class component).
 */
export function translate(
  language: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  return interpolate(resolve(language, key), vars);
}
