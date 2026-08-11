import { useMapStore } from "../../stores/mapStore";
import { useTranslation } from "../../hooks/useTranslation";
import { CollapsibleSection } from "./CollapsibleSection";
import { RangeSlider } from "./RangeSlider";
import { FiSun, FiMoon } from "react-icons/fi";
import type { LightingConfig } from "../../types/map";

const DEFAULT_LIGHTING: LightingConfig = {
  enabled: false,
  ambientColor: "#0a0a1e",
  ambientIntensity: 1,
};

/**
 * EnvironmentSection - map-wide lighting controls: master enable, ambient
 * darkness/tint, and an optional directional sun/moon. Writes through
 * mapStore.updateLighting.
 *
 * These settings are not per-instance, so they are intentionally NOT recorded in
 * undo history (mirroring how map metadata edits behave). Light placement lives
 * in the "Lights" library tab (drag-and-drop), not here.
 */
export const EnvironmentSection = () => {
  const map = useMapStore((state) => state.map);
  const updateLighting = useMapStore((state) => state.updateLighting);
  const { t } = useTranslation();

  if (!map) return null;

  const lighting = map.lighting ?? DEFAULT_LIGHTING;
  const sun = lighting.sun;
  // Older saved maps seeded a bluish directional without a mode → treat as moon.
  const sunMode = sun ? sun.mode ?? "moon" : null;

  /** Apply a day/night preset. Clicking the active mode again turns it off. */
  const setSunMode = (mode: "sun" | "moon") => {
    if (sunMode === mode) {
      updateLighting({ sun: undefined });
      return;
    }
    const preset =
      mode === "sun"
        ? { color: "#ffd9a0", intensity: 0.6 }
        : { color: "#bcd0ff", intensity: 0.4 };
    updateLighting({ sun: { angle: sun?.angle ?? 135, mode, ...preset } });
  };

  // Master enable — sun icon (lit when on, dimmed when off).
  const enabledToggle = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        updateLighting({ enabled: !lighting.enabled });
      }}
      className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
        lighting.enabled
          ? "bg-accent/20 text-accent hover:bg-accent/30"
          : "text-ink-muted hover:text-ink hover:bg-raised"
      }`}
      title={lighting.enabled ? t("light.enable") : t("light.disabled")}
    >
      <FiSun size={16} className={lighting.enabled ? "" : "opacity-40"} />
    </button>
  );

  return (
    <CollapsibleSection
      title={t("light.environment")}
      defaultOpen={false}
      headerRight={enabledToggle}
      bodyClassName="px-2.5 pb-3 space-y-3"
    >
      {/* Ambient color */}
      <div>
        <label className="text-xs text-ink-muted block mb-1">{t("light.ambientColor")}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={lighting.ambientColor}
            onChange={(e) => updateLighting({ ambientColor: e.target.value })}
            className="h-8 w-12 rounded border border-edge bg-canvas cursor-pointer"
          />
          <span className="text-sm text-ink-secondary font-mono">{lighting.ambientColor}</span>
        </div>
      </div>

      {/* Darkness (ambient intensity: 1 = fully lit, 0 = pitch black) */}
      <div>
        <label className="text-xs text-ink-muted block mb-1">
          {t("light.ambientIntensity")}: {Math.round((1 - lighting.ambientIntensity) * 100)}%
        </label>
        <RangeSlider
          min={0}
          max={1}
          step={0.02}
          value={lighting.ambientIntensity}
          onChange={(v) => updateLighting({ ambientIntensity: v })}
        />
      </div>

      {/* Sun / Moon */}
      <div className="pt-1 border-t border-edge">
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-ink-secondary font-semibold">{t("light.sun")}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSunMode("sun")}
              className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
                sunMode === "sun"
                  ? "bg-lock/20 text-lock"
                  : "text-ink-muted hover:text-ink hover:bg-raised"
              }`}
              title={t("light.day")}
            >
              <FiSun size={15} />
            </button>
            <button
              onClick={() => setSunMode("moon")}
              className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
                sunMode === "moon"
                  ? "bg-vis/20 text-vis"
                  : "text-ink-muted hover:text-ink hover:bg-raised"
              }`}
              title={t("light.night")}
            >
              <FiMoon size={15} />
            </button>
          </div>
        </div>

        {sun && (
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-ink-muted block mb-1">{t("light.sunColor")}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={sun.color}
                  onChange={(e) => updateLighting({ sun: { ...sun, color: e.target.value } })}
                  className="h-8 w-12 rounded border border-edge bg-canvas cursor-pointer"
                />
                <span className="text-sm text-ink-secondary font-mono">{sun.color}</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-ink-muted block mb-1">
                {t("light.sunAngle")}: {Math.round(sun.angle)}°
              </label>
              <RangeSlider
                min={0}
                max={360}
                step={1}
                value={sun.angle}
                onChange={(v) => updateLighting({ sun: { ...sun, angle: v } })}
              />
            </div>
            <div>
              <label className="text-xs text-ink-muted block mb-1">
                {t("light.sunIntensity")}: {sun.intensity.toFixed(2)}
              </label>
              <RangeSlider
                min={0}
                max={2}
                step={0.05}
                value={sun.intensity}
                onChange={(v) => updateLighting({ sun: { ...sun, intensity: v } })}
              />
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
};
