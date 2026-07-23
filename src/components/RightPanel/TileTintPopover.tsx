import { FiDroplet, FiX } from "react-icons/fi";
import { TileColorPicker } from "./TileColorPicker";
import { useTranslation } from "../../hooks/useTranslation";

interface TileTintPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Full tile-tint editor (hue/saturation, shade ramp, saved palette) shown as a
 * small popover anchored beneath the TileTintBar's droplet button, so the user
 * can tweak the tint without a full-screen overlay. The parent bar owns
 * open/close (toggle button + click-outside); this component is presentational.
 */
export const TileTintPopover = ({ isOpen, onClose }: TileTintPopoverProps) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div
      className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-edge bg-panel p-4 shadow-2xl"
      role="dialog"
      aria-label={t("tint.editorTitle")}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiDroplet className="text-accent" size={15} />
          <h2 className="text-sm font-semibold text-ink">{t("tint.editorTitle")}</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-ink-secondary transition-colors hover:bg-raised hover:text-ink"
          aria-label={t("common.close")}
        >
          <FiX size={15} />
        </button>
      </div>

      <TileColorPicker />
    </div>
  );
};
