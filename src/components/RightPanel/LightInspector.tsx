import { useState } from "react";
import { useMapStore } from "../../stores/mapStore";
import { useUISelectionStore } from "../../stores/uiSelectionStore";
import { useHistoryStore } from "../../stores/historyStore";
import { useTranslation } from "../../hooks/useTranslation";
import type { LightInstance, LightType } from "../../types/map";
import { FiTrash2, FiSun, FiLock, FiUnlock } from "react-icons/fi";
import { FaChevronDown } from "react-icons/fa";
import { RangeSlider } from "./RangeSlider";

/**
 * LightInspector - Properties panel for the currently selected light.
 * Rendered by ContextBody when the selection mode is "lights".
 * Mirrors PropInspector's structure and write-back pattern.
 */
export const LightInspector = () => {
  const map = useMapStore((state) => state.map);
  const { selectedLightIds, selectedLayerId, selectionMode } = useUISelectionStore();
  const updateLight = useMapStore((state) => state.updateLight);
  const removeLight = useMapStore((state) => state.removeLight);
  const { t } = useTranslation();

  const [isExpanded, setIsExpanded] = useState(true);

  if (!map) return null;

  const selectedLight: LightInstance | null | undefined =
    selectedLightIds.size === 1 && selectedLayerId
      ? map.layers
          .find((l) => l.id === selectedLayerId)
          ?.lights?.find((l) => l.id === Array.from(selectedLightIds)[0])
      : null;

  // Multi-selection summary
  if (selectionMode === "lights" && selectedLightIds.size > 1) {
    return (
      <div className="p-3">
        <p className="text-xs text-ink-secondary font-semibold">{t("light.multipleSelected")}</p>
        <p className="text-xs text-ink-muted mt-1">{t("light.lightsSelected", { count: selectedLightIds.size })}</p>
      </div>
    );
  }

  if (!(selectionMode === "lights" && selectedLight && selectedLayerId)) {
    return null;
  }

  const light = selectedLight;
  const layerId = selectedLayerId;

  /** Write a change through the store and record it as an undoable UPDATE_LIGHT. */
  const commit = (changes: Partial<LightInstance>) => {
    const previousChanges: Partial<LightInstance> = {};
    for (const key of Object.keys(changes) as (keyof LightInstance)[]) {
      (previousChanges as Record<string, unknown>)[key] = light[key];
    }
    updateLight(layerId, light.id, changes);
    useHistoryStore.getState().addAction({
      type: "UPDATE_LIGHT",
      layerId,
      lightId: light.id,
      changes,
      previousChanges,
    });
  };

  const handleDelete = () => {
    // Record before removing so undo can restore the exact light.
    useHistoryStore.getState().addAction({
      type: "REMOVE_LIGHT",
      layerId,
      lightId: light.id,
      removedLight: { ...light },
    });
    removeLight(layerId, light.id);
  };

  const lightTypes: LightType[] = ["point", "spot", "area"];
  const typeLabel: Record<LightType, string> = {
    point: t("light.typePoint"),
    spot: t("light.typeSpot"),
    area: t("light.typeArea"),
  };

  return (
    <div className="p-3">
      <div className="space-y-2">
        {/* Section header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-xs font-semibold text-ink-secondary hover:text-ink transition-colors">
            {t("light.selectedLight")}
          </span>
          <FaChevronDown
            size={12}
            className={`text-ink-muted transition-transform ${isExpanded ? "rotate-0" : "-rotate-180"}`}
          />
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? "max-h-300 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-3">
            {/* Type */}
            <div>
              <label className="text-xs text-ink-muted block mb-1">{t("light.type")}</label>
              <div className="flex gap-1">
                {lightTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => commit({ type })}
                    className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                      light.type === type
                        ? "bg-accent/15 border-accent/30 text-accent"
                        : "bg-raised border-edge text-ink-muted hover:text-ink"
                    }`}
                  >
                    {typeLabel[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="text-xs text-ink-muted block mb-1">{t("light.color")}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={light.color}
                  onChange={(e) => commit({ color: e.target.value })}
                  className="h-8 w-12 rounded border border-edge bg-canvas cursor-pointer"
                />
                <span className="text-sm text-ink-secondary font-mono">{light.color}</span>
              </div>
            </div>

            {/* Position */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-ink-muted block mb-1">X</label>
                <input
                  type="number"
                  value={Math.round(light.x)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) commit({ x: v });
                  }}
                  className="w-full px-2 py-1 text-sm bg-raised border border-edge rounded text-ink focus:outline-none focus:border-accent-light"
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted block mb-1">Y</label>
                <input
                  type="number"
                  value={Math.round(light.y)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) commit({ y: v });
                  }}
                  className="w-full px-2 py-1 text-sm bg-raised border border-edge rounded text-ink focus:outline-none focus:border-accent-light"
                />
              </div>
            </div>

            {/* Intensity */}
            <div>
              <label className="text-xs text-ink-muted block mb-1">
                {t("light.intensity")}: {light.intensity.toFixed(1)}
              </label>
              <RangeSlider
                min={0}
                max={4}
                step={0.1}
                value={light.intensity}
                onChange={(v) => commit({ intensity: v })}
              />
            </div>

            {/* Radius */}
            <div>
              <label className="text-xs text-ink-muted block mb-1">
                {t("light.radius")}: {Math.round(light.radius)}
              </label>
              <RangeSlider
                min={8}
                max={Math.max(512, Math.round(light.radius))}
                step={1}
                value={light.radius}
                onChange={(v) => commit({ radius: v })}
              />
            </div>

            {/* Elevation (feeds normal-map lighting) */}
            <div>
              <label className="text-xs text-ink-muted block mb-1">
                {t("light.elevation")}: {Math.round(light.z ?? 0)}
              </label>
              <RangeSlider
                min={0}
                max={256}
                step={1}
                value={light.z ?? 0}
                onChange={(v) => commit({ z: v })}
              />
            </div>

            {/* Spot-only: direction + cone */}
            {light.type === "spot" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-ink-muted block mb-1">{t("light.angle")}</label>
                  <input
                    type="number"
                    value={Math.round(light.angle ?? 0)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) commit({ angle: v });
                    }}
                    className="w-full px-2 py-1 text-sm bg-raised border border-edge rounded text-ink focus:outline-none focus:border-accent-light"
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-muted block mb-1">{t("light.coneAngle")}</label>
                  <input
                    type="number"
                    value={Math.round(light.coneAngle ?? 0)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) commit({ coneAngle: v });
                    }}
                    className="w-full px-2 py-1 text-sm bg-raised border border-edge rounded text-ink focus:outline-none focus:border-accent-light"
                  />
                </div>
              </div>
            )}

            {/* Area-only: emitter size */}
            {light.type === "area" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-ink-muted block mb-1">{t("light.width")}</label>
                  <input
                    type="number"
                    value={Math.round(light.width ?? 0)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) commit({ width: v });
                    }}
                    className="w-full px-2 py-1 text-sm bg-raised border border-edge rounded text-ink focus:outline-none focus:border-accent-light"
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-muted block mb-1">{t("light.height")}</label>
                  <input
                    type="number"
                    value={Math.round(light.height ?? 0)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) commit({ height: v });
                    }}
                    className="w-full px-2 py-1 text-sm bg-raised border border-edge rounded text-ink focus:outline-none focus:border-accent-light"
                  />
                </div>
              </div>
            )}

            {/* Casts shadows toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-ink-muted">{t("light.castsShadows")}</span>
              <input
                type="checkbox"
                checked={light.castsShadows ?? true}
                onChange={(e) => commit({ castsShadows: e.target.checked })}
                className="accent-accent"
              />
            </label>

            {/* Flicker */}
            <div>
              <label className="text-xs text-ink-muted block mb-1">
                {t("light.flicker")}: {Math.round((light.flicker ?? 0) * 100)}%
              </label>
              <RangeSlider
                min={0}
                max={1}
                step={0.05}
                value={light.flicker ?? 0}
                onChange={(v) => commit({ flicker: v })}
              />
            </div>

            {/* Visibility & Lock */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => commit({ visible: !light.visible })}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded border transition-colors ${
                  light.visible
                    ? "bg-accent/15 border-accent/30 text-accent hover:bg-accent/25"
                    : "bg-raised border-edge text-ink-muted hover:bg-overlay"
                }`}
                title={light.visible ? t("light.visible") : t("light.hidden")}
              >
                <FiSun size={15} className={light.visible ? "" : "opacity-40"} />
              </button>

              <button
                onClick={() => commit({ locked: !light.locked })}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded border transition-colors ${
                  light.locked
                    ? "bg-lock/15 border-lock/30 text-lock hover:bg-lock/25"
                    : "bg-raised border-edge text-ink-muted hover:bg-overlay"
                }`}
                title={light.locked ? t("light.locked") : t("light.unlocked")}
              >
                {light.locked ? <FiLock size={15} /> : <FiUnlock size={15} />}
              </button>
            </div>

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-danger/15 border border-danger/30 text-danger rounded hover:bg-danger/25 transition-colors"
            >
              <FiTrash2 size={15} />
              <span className="text-sm">{t("light.deleteLight")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
