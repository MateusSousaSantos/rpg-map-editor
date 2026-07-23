// ============================================================================
// LANGUAGE STORE - Active UI language, persisted to localStorage
// ============================================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { detectLanguage, type Language } from "../i18n";

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      // First visit auto-detects from the browser; `persist` rehydration
      // overrides this with the saved choice on subsequent visits.
      language: detectLanguage(),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "rpg-map-language-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
