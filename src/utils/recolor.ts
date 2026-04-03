// ============================================================================
// SPRITE RECOLORING — Pure CPU / Canvas-2D utilities
// No React deps; safe to call synchronously from draw loops or hooks.
// ============================================================================

import type { TerrainTintConfig, PropColorSlot } from '../types/map';

// ─── Color conversion helpers ───────────────────────────────────────────────

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// ─── Strategy 1: Grayscale HSL Tint ─────────────────────────────────────────

/**
 * Apply an HSL tint to a grayscale source image.
 * Each pixel's gray value becomes the lightness of the target color.
 * Returns a new HTMLCanvasElement; never modifies the source.
 */
export function tintGrayscaleCanvas(
  source: HTMLImageElement,
  tintConfig: TerrainTintConfig,
): HTMLCanvasElement {
  const { hue, saturation, brightness } = tintConfig;
  const canvas = document.createElement('canvas');
  canvas.width = source.naturalWidth;
  canvas.height = source.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imgData;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue; // skip transparent pixels

    const gray = data[i]; // R = G = B for grayscale source
    const l = Math.min(100, Math.max(0, (gray / 255) * 100 * (brightness / 100)));
    const s = saturation * (l > 5 && l < 95 ? 1 : 0.1); // desaturate near black/white
    const [r, g, b] = hslToRgb(hue, s, l);

    data[i]     = r;
    data[i + 1] = g;
    data[i + 2] = b;
    // alpha unchanged
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// ─── Strategy 2: Palette Swap ────────────────────────────────────────────────

export interface PropColorConfig {
  slots: PropColorSlot[];
  hues: Record<string, number>; // user-chosen hue per slot name
}

/**
 * Swap palette zones in a prop sprite.
 * For each slot, pixels within HSL tolerance of the slot's baseColor have
 * their hue remapped while saturation and lightness are preserved.
 * Returns a new HTMLCanvasElement; never modifies the source.
 */
export function paletteSwapCanvas(
  source: HTMLImageElement,
  config: PropColorConfig,
  tolerance = 40,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.naturalWidth;
  canvas.height = source.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imgData;

  // Pre-compute HSL of each base color once
  const slotEntries = config.slots.map((slot) => ({
    name: slot.name,
    baseHsl: rgbToHsl(...slot.baseColor),
    targetHue: config.hues[slot.name] ?? rgbToHsl(...slot.baseColor)[0],
  }));

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;

    const [ph, ps, pl] = rgbToHsl(data[i], data[i + 1], data[i + 2]);

    for (const { baseHsl, targetHue } of slotEntries) {
      const hueDist = Math.abs(ph - baseHsl[0]);
      const satDist = Math.abs(ps - baseHsl[1]);
      const litDist = Math.abs(pl - baseHsl[2]);

      if (hueDist < tolerance && satDist < 30 && litDist < 40) {
        const [r, g, b] = hslToRgb(targetHue, ps, pl);
        data[i]     = r;
        data[i + 1] = g;
        data[i + 2] = b;
        break; // first matching slot wins
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
