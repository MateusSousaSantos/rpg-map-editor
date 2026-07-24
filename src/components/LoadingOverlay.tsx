import { useBusyStore } from "../stores/busyStore";
import { useTranslation } from "../hooks/useTranslation";
import type { TranslationKey } from "../i18n";

const LABEL_KEYS = {
  generic: "busy.generic",
  fill: "busy.fill",
  undo: "busy.undo",
  redo: "busy.redo",
} as const;

/**
 * Full-cover overlay shown while a long-running, main-thread-blocking operation
 * (big fill, big undo/redo) runs, so the app doesn't look frozen. Renders
 * nothing when idle. Meant to be mounted inside a `relative` container.
 */
export function LoadingOverlay() {
  const { busy, labelKey } = useBusyStore();
  const { t } = useTranslation();

  if (!busy) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-canvas/50 backdrop-blur-[1px]">
      <div className="flex items-center gap-3 rounded-lg border border-edge bg-panel px-5 py-3 shadow-lg">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-edge border-t-ink" />
        <span className="text-sm text-ink">
          {t(LABEL_KEYS[labelKey] as TranslationKey)}
        </span>
      </div>
    </div>
  );
}
