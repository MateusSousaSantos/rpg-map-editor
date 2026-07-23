import { useEffect, useRef, useState } from "react";
import { FiDroplet, FiTrash2 } from "react-icons/fi";
import { useToolStore } from "../../stores/toolStore";
import { useTranslation } from "../../hooks/useTranslation";
import { TileTintPopover } from "./TileTintPopover";

/**
 * Compact tint strip shown above the tile library: the current tint, a quick
 * "none" toggle, a few saved swatches for fast switching, and a button that
 * opens the full editor in a popover. Keeps the tile grid fully visible/selectable.
 */
export const TileTintBar = () => {
  const { selectedTileColor, customSwatches, setSelectedTileColor, removeSwatch } =
    useToolStore();
  const { t } = useTranslation();
  const [tintOpen, setTintOpen] = useState(false);
  const tintRef = useRef<HTMLDivElement>(null);

  // Close the popover on outside click or Escape.
  useEffect(() => {
    if (!tintOpen) return;
    const onDown = (e: MouseEvent) => {
      if (tintRef.current && !tintRef.current.contains(e.target as Node)) {
        setTintOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTintOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [tintOpen]);

  // Show the most recent saved swatches inline for quick access.
  const quickSwatches = customSwatches.slice(0, 6);

  return (
    <div className="flex items-center gap-1.5 rounded border border-edge bg-raised/40 px-2 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted shrink-0">
        {t("tint.label")}
      </span>

      {/* Current tint preview */}
      <div
        className="w-5 h-5 rounded border border-edge shrink-0"
        style={{ backgroundColor: selectedTileColor ?? "transparent" }}
        title={selectedTileColor ?? t("tint.noTintNatural")}
      />

      {/* Quick none toggle */}
      <button
        className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors shrink-0 ${
          selectedTileColor === null
            ? "ring-1 ring-inset ring-tile-sel border-tile-sel text-ink"
            : "border-edge text-ink-muted hover:text-ink hover:border-edge-strong"
        }`}
        onClick={() => setSelectedTileColor(null)}
        title={t("tint.paintNatural")}
      >
        {t("tint.none")}
      </button>

      {/* Quick saved swatches */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
        {quickSwatches.map((color) => (
          <button
            key={color}
            className={`w-5 h-5 rounded border shrink-0 transition-all ${
              selectedTileColor === color
                ? "ring-1 ring-inset ring-tile-sel border-tile-sel"
                : "border-edge hover:border-edge-strong"
            }`}
            style={{ backgroundColor: color }}
            onClick={() => setSelectedTileColor(color)}
            title={color}
          />
        ))}
      </div>

      {/* Delete the currently-selected swatch from quick access */}
      {selectedTileColor !== null && customSwatches.includes(selectedTileColor) && (
        <button
          className="flex items-center justify-center w-6 h-6 rounded border border-red-500/50 text-red-400 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500 transition-colors shrink-0"
          onClick={() => {
            removeSwatch(selectedTileColor);
            setSelectedTileColor(null);
          }}
          title={t("tint.removeFromQuick")}
        >
          <FiTrash2 size={13} />
        </button>
      )}

      {/* Open full editor in a popover anchored to this button */}
      <div className="relative shrink-0" ref={tintRef}>
        <button
          className={`flex items-center justify-center w-6 h-6 rounded border transition-colors ${
            tintOpen
              ? "border-tile-sel text-ink"
              : "border-edge text-ink-muted hover:text-ink hover:border-edge-strong"
          }`}
          onClick={() => setTintOpen((o) => !o)}
          title={t("tint.openEditor")}
        >
          <FiDroplet size={13} />
        </button>

        <TileTintPopover isOpen={tintOpen} onClose={() => setTintOpen(false)} />
      </div>
    </div>
  );
};
