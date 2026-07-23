// ============================================================================
// TILE TINTING
// ============================================================================
// Applies a multiply color tint to a tile texture while preserving its alpha
// mask. All compositing is done on an isolated offscreen scratch canvas so the
// `multiply` / `destination-in` operations never touch the caller's canvas —
// drawing them directly on a shared canvas would erase everything outside the
// tile (destination-in keeps destination pixels only where the source draws).

let scratch: HTMLCanvasElement | null = null;
let scratchCtx: CanvasRenderingContext2D | null = null;

/**
 * Render `texture` tinted by `tint` (hex, e.g. "#ff8800") into a width×height
 * offscreen canvas and return it. The returned canvas is reused between calls,
 * so draw from it immediately (do not retain it).
 *
 * Returns null if a 2D context can't be created; callers should fall back to
 * drawing the untinted texture.
 */
export function getTintedTile(
  texture: CanvasImageSource,
  width: number,
  height: number,
  tint: string,
): HTMLCanvasElement | null {
  const r = parseInt(tint.slice(1, 3), 16);
  const g = parseInt(tint.slice(3, 5), 16);
  const b = parseInt(tint.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  if (width <= 0 || height <= 0) return null;

  if (!scratch) {
    scratch = document.createElement('canvas');
    scratchCtx = scratch.getContext('2d');
  }
  if (!scratch || !scratchCtx) return null;

  // Setting width/height also clears the scratch canvas.
  scratch.width = width;
  scratch.height = height;

  const c = scratchCtx;
  // 1. Base texture.
  c.globalCompositeOperation = 'source-over';
  c.drawImage(texture, 0, 0, width, height);
  // 2. Multiply the tint color over it.
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = `rgb(${r}, ${g}, ${b})`;
  c.fillRect(0, 0, width, height);
  // 3. Re-apply the texture's alpha so transparent pixels stay transparent.
  c.globalCompositeOperation = 'destination-in';
  c.drawImage(texture, 0, 0, width, height);
  c.globalCompositeOperation = 'source-over';

  return scratch;
}
