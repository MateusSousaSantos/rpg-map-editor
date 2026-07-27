import { useState } from "react";
import { useMapStore } from "../../stores/mapStore";
import { useUISelectionStore } from "../../stores/uiSelectionStore";
import { useTranslation } from "../../hooks/useTranslation";
import { FiTrash2, FiEye, FiEyeOff, FiLock, FiUnlock } from "react-icons/fi";
import { FaChevronDown } from "react-icons/fa";

/**
 * PropInspector - Properties panel for the currently selected prop(s).
 * Rendered by ContextBody when the selection mode is "props".
 */
export const PropInspector = () => {
  const map = useMapStore((state) => state.map);
  const { selectedPropIds, selectedLayerId, selectionMode } = useUISelectionStore();
  const updateProp = useMapStore((state) => state.updateProp);
  const removeProp = useMapStore((state) => state.removeProp);
  const { t } = useTranslation();

  const [isPropertiesExpanded, setIsPropertiesExpanded] = useState(true);

  if (!map) return null;

  const selectedProp =
    selectedPropIds.size === 1 && selectedLayerId
      ? map.layers
          .find((l) => l.id === selectedLayerId)
          ?.props.find((p) => p.id === Array.from(selectedPropIds)[0])
      : null;

  const selectedPropDefinition = selectedProp
    ? map.propDefinitions.find((def) => def.id === selectedProp.definitionId)
    : null;

  // Multi-selection summary
  if (selectionMode === "props" && selectedPropIds.size > 1) {
    return (
      <div className="p-3">
        <p className="text-xs text-ink-secondary font-semibold">{t("inspector.multipleSelected")}</p>
        <p className="text-xs text-ink-muted mt-1">{t("inspector.propsSelected", { count: selectedPropIds.size })}</p>
      </div>
    );
  }

  if (!(selectionMode === "props" && selectedProp && selectedPropDefinition && selectedLayerId)) {
    return null;
  }

  return (
    <div className="p-3">
      <div className="space-y-2">
        {/* Section header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsPropertiesExpanded(!isPropertiesExpanded)}
        >
          <span className="text-xs font-semibold text-ink-secondary hover:text-ink transition-colors">
            {t("inspector.selectedProp")}
          </span>
          <FaChevronDown
            size={12}
            className={`text-ink-muted transition-transform ${
              isPropertiesExpanded ? "rotate-0" : "-rotate-180"
            }`}
          />
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isPropertiesExpanded ? "max-h-150 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="text-xs text-ink-muted block mb-1">{t("inspector.name")}</label>
              <div className="text-sm text-ink">{selectedPropDefinition.name}</div>
            </div>

            {/* Position */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-ink-muted block mb-1">{t("inspector.x")}</label>
                <div className="w-full px-2 py-1 text-sm bg-canvas border border-edge rounded text-ink-secondary">
                  {Math.round(selectedProp.x)}
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-muted block mb-1">{t("inspector.y")}</label>
                <div className="w-full px-2 py-1 text-sm bg-canvas border border-edge rounded text-ink-secondary">
                  {Math.round(selectedProp.y)}
                </div>
              </div>
            </div>

            {/* Size */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-ink-muted block mb-1">{t("inspector.width")}</label>
                <div className="w-full px-2 py-1 text-sm bg-canvas border border-edge rounded text-ink-secondary">
                  {Math.round(selectedProp.width * selectedProp.scaleX)}
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-muted block mb-1">{t("inspector.height")}</label>
                <div className="w-full px-2 py-1 text-sm bg-canvas border border-edge rounded text-ink-secondary">
                  {Math.round(selectedProp.height * selectedProp.scaleY)}
                </div>
              </div>
            </div>

            {/* Rotation */}
            <div>
              <label className="text-xs text-ink-muted block mb-1">{t("inspector.rotation")}</label>
              <div className="w-full px-2 py-1 text-sm bg-canvas border border-edge rounded text-ink-secondary">
                {Math.round(selectedProp.rotation)}°
              </div>
            </div>

            {/* Scale */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-ink-muted block mb-1">{t("inspector.scaleX")}</label>
                <div className="w-full px-2 py-1 text-sm bg-canvas border border-edge rounded text-ink-secondary">
                  {selectedProp.scaleX.toFixed(2)}
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-muted block mb-1">{t("inspector.scaleY")}</label>
                <div className="w-full px-2 py-1 text-sm bg-canvas border border-edge rounded text-ink-secondary">
                  {selectedProp.scaleY.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="text-[10px] text-ink-muted bg-raised rounded px-2 py-1.5">
              💡 {t("inspector.handlesHint")}
            </div>

            {/* Opacity */}
            <div>
              <label className="text-xs text-ink-muted block mb-1">
                {t("inspector.opacity")}: {Math.round(selectedProp.opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={selectedProp.opacity}
                onChange={(e) =>
                  updateProp(selectedLayerId, selectedProp.id, {
                    opacity: parseFloat(e.target.value),
                  })
                }
                className="opacity-slider w-full"
              />
            </div>

            {/* Z-Index */}
            <div>
              <label className="text-xs text-ink-muted block mb-1">{t("inspector.zIndex")}</label>
              <input
                type="number"
                value={selectedProp.zIndex}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) updateProp(selectedLayerId, selectedProp.id, { zIndex: v });
                }}
                className="w-full px-2 py-1 text-sm bg-raised border border-edge rounded text-ink focus:outline-none focus:border-accent-light"
              />
            </div>

            {/* Visibility & Lock */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateProp(selectedLayerId, selectedProp.id, {
                    visible: !selectedProp.visible,
                  })
                }
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded border transition-colors ${
                  selectedProp.visible
                    ? "bg-vis/15 border-vis/30 text-vis hover:bg-vis/25"
                    : "bg-raised border-edge text-ink-muted hover:bg-overlay"
                }`}
                title={selectedProp.visible ? t("inspector.visible") : t("inspector.hidden")}
              >
                {selectedProp.visible ? <FiEye size={15} /> : <FiEyeOff size={15} />}
              </button>

              <button
                onClick={() =>
                  updateProp(selectedLayerId, selectedProp.id, {
                    locked: !selectedProp.locked,
                  })
                }
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded border transition-colors ${
                  selectedProp.locked
                    ? "bg-lock/15 border-lock/30 text-lock hover:bg-lock/25"
                    : "bg-raised border-edge text-ink-muted hover:bg-overlay"
                }`}
                title={selectedProp.locked ? t("inspector.locked") : t("inspector.unlocked")}
              >
                {selectedProp.locked ? <FiLock size={15} /> : <FiUnlock size={15} />}
              </button>
            </div>

            {/* Delete */}
            <button
              onClick={() => removeProp(selectedLayerId, selectedProp.id)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-danger/15 border border-danger/30 text-danger rounded hover:bg-danger/25 transition-colors"
            >
              <FiTrash2 size={15} />
              <span className="text-sm">{t("inspector.deleteProp")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
