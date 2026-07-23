import { useEffect, useState } from "react";
import { useToolStore } from "../../stores/toolStore";

// ── color helpers ───────────────────────────────────────────────────────────

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Lightness stops for the quick shade ramp (light → dark).
const SHADE_STOPS = [92, 80, 68, 56, 44, 32, 22, 14];
const DEFAULT_HSL = { h: 120, s: 50, l: 50 };

// ── component ────────────────────────────────────────────────────────────────

export const TileColorPicker = () => {
  const {
    selectedTileColor,
    customSwatches,
    setSelectedTileColor,
    addSwatch,
    removeSwatch,
  } = useToolStore();

  // HSL is the source of truth for the sliders; the store holds the resulting hex.
  const [hsl, setHsl] = useState(() =>
    selectedTileColor ? hexToHsl(selectedTileColor) : DEFAULT_HSL,
  );

  // Re-sync sliders when the color changes from outside (swatch click, None, etc.)
  useEffect(() => {
    if (selectedTileColor && hslToHex(hsl.h, hsl.s, hsl.l) !== selectedTileColor) {
      setHsl(hexToHsl(selectedTileColor));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTileColor]);

  const currentHex = hslToHex(hsl.h, hsl.s, hsl.l);

  const apply = (next: { h?: number; s?: number; l?: number }) => {
    const updated = { ...hsl, ...next };
    setHsl(updated);
    setSelectedTileColor(hslToHex(updated.h, updated.s, updated.l));
  };

  const stepLightness = (delta: number) => apply({ l: clamp(hsl.l + delta, 0, 100) });

  return (
    <div className="space-y-2.5 border border-edge rounded p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">
          Tile Color
        </span>
        <button
          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            selectedTileColor === null
              ? "ring-2 ring-tile-sel border-tile-sel/50 text-ink"
              : "border-edge text-ink-muted hover:text-ink hover:border-edge-strong"
          }`}
          onClick={() => setSelectedTileColor(null)}
          title="Paint tiles with their natural texture (no tint)"
        >
          None
        </button>
      </div>

      {/* Preview + hex + save */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded border border-edge shrink-0"
          style={{ backgroundColor: selectedTileColor ?? "transparent" }}
        />
        <span className="text-xs text-ink-muted font-mono flex-1">
          {selectedTileColor ?? "natural"}
        </span>
        <button
          className="text-[10px] px-2 py-1 rounded bg-raised hover:bg-edge text-ink-muted hover:text-ink transition-colors"
          onClick={() => addSwatch(currentHex)}
          title="Save this color to your palette"
        >
          + Save
        </button>
      </div>

      {/* Shade ramp — quick cycle through shades of the current hue */}
      <div className="flex items-center gap-1">
        <button
          className="w-5 h-7 flex items-center justify-center rounded bg-raised hover:bg-edge text-ink-muted hover:text-ink text-sm shrink-0"
          onClick={() => stepLightness(6)}
          title="Lighter"
        >
          +
        </button>
        <div className="flex flex-1 h-7 rounded overflow-hidden border border-edge">
          {SHADE_STOPS.map((l) => {
            const shade = hslToHex(hsl.h, hsl.s, l);
            const isActive = selectedTileColor === shade;
            return (
              <button
                key={l}
                className={`flex-1 transition-transform ${isActive ? "ring-2 ring-tile-sel ring-inset z-10" : ""}`}
                style={{ backgroundColor: shade }}
                onClick={() => apply({ l })}
                title={shade}
              />
            );
          })}
        </div>
        <button
          className="w-5 h-7 flex items-center justify-center rounded bg-raised hover:bg-edge text-ink-muted hover:text-ink text-sm shrink-0"
          onClick={() => stepLightness(-6)}
          title="Darker"
        >
          −
        </button>
      </div>

      {/* Hue slider */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={360}
          value={hsl.h}
          onChange={(e) => apply({ h: Number(e.target.value) })}
          className="w-full h-3 appearance-none rounded cursor-pointer"
          style={{
            background:
              "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
          }}
          title="Hue"
        />
        {/* Saturation slider */}
        <input
          type="range"
          min={0}
          max={100}
          value={hsl.s}
          onChange={(e) => apply({ s: Number(e.target.value) })}
          className="w-full h-3 appearance-none rounded cursor-pointer"
          style={{
            background: `linear-gradient(to right, #ffffff, ${hslToHex(hsl.h, 100, 50)})`,
          }}
          title="Saturation"
        />
      </div>

      {/* Saved palette */}
      {customSwatches.length > 0 && (
        <div className="flex flex-row flex-wrap gap-1.5 pt-0.5">
          {customSwatches.map((color) => (
            <div key={color} className="relative group">
              <button
                className={`w-6 h-6 rounded border transition-all ${
                  selectedTileColor === color
                    ? "ring-2 ring-tile-sel border-tile-sel/50"
                    : "border-edge hover:border-edge-strong"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedTileColor(color)}
                title={color}
              />
              <button
                className="absolute -top-1 -right-1 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-raised border border-edge text-ink-muted hover:text-ink text-[8px] leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSwatch(color);
                }}
                title="Remove from palette"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
