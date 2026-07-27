/**
 * normals.ts — derive a tangent-space normal map from a sprite's alpha silhouette.
 *
 * The idea (a cheap "bevel"): treat the alpha channel as a height field where the
 * opaque interior is "up" and the transparent exterior is "down". The gradient of
 * that field points outward along the silhouette edge, so we bend the surface
 * normal outward near edges (a rounded bevel) and keep it facing the viewer
 * (`+z`) in flat interior regions. This makes flat cut-out sprites read as
 * subtly three-dimensional under a moving light without any authored art.
 *
 * Output is an RGB canvas encoding `normal = rgb * 2 - 1` (the standard
 * OpenGL "+Y up" style is avoided here — see the sign note in the shader; we use
 * a top-left-origin, y-down convention to match the rest of the canvas code).
 *
 * Results are cached by texture URL so each sprite is processed at most once.
 */

/** How far the bevel reaches inward from the silhouette, in source pixels. */
const BEVEL_RADIUS = 3;
/** Strength of the outward tilt at the edge (higher = more pronounced bevel). */
const BEVEL_STRENGTH = 2.0;

const cache = new Map<string, HTMLCanvasElement>();

/**
 * Derive a normal-map canvas from an image's alpha channel.
 * @param image  a fully-loaded HTMLImageElement (must be same-origin / CORS-clean)
 * @param cacheKey  usually the texture URL; used to memoise the result
 */
export function deriveNormalFromAlpha(
  image: HTMLImageElement,
  cacheKey: string,
): HTMLCanvasElement | null {
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  if (!w || !h) return null;

  // Read the source alpha into a flat array.
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  const sctx = src.getContext('2d', { willReadFrequently: true });
  if (!sctx) return null;
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(image, 0, 0, w, h);

  let alpha: Uint8ClampedArray;
  try {
    alpha = sctx.getImageData(0, 0, w, h).data;
  } catch {
    // Tainted canvas (texture wasn't CORS-clean) — bail to a flat normal.
    return null;
  }

  const at = (x: number, y: number): number => {
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    return alpha[(y * w + x) * 4 + 3] / 255;
  };

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d');
  if (!octx) return null;
  const outData = octx.createImageData(w, h);
  const od = outData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = at(x, y);
      let nx = 0;
      let ny = 0;
      let nz = 1;

      if (a > 0.01) {
        // Central-difference gradient of the alpha field, sampled a few pixels
        // out so the bevel has some width. Gradient points from solid → empty.
        const gx = at(x + BEVEL_RADIUS, y) - at(x - BEVEL_RADIUS, y);
        const gy = at(x, y + BEVEL_RADIUS) - at(x, y - BEVEL_RADIUS);
        // Tilt the normal *outward* (down the height field) near edges.
        nx = -gx * BEVEL_STRENGTH;
        ny = -gy * BEVEL_STRENGTH;
        nz = 1;
      }

      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;

      const i = (y * w + x) * 4;
      od[i] = Math.round((nx * 0.5 + 0.5) * 255);
      od[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      od[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      od[i + 3] = Math.round(a * 255); // keep silhouette so stamping respects shape
    }
  }

  octx.putImageData(outData, 0, 0);
  cache.set(cacheKey, out);
  return out;
}

/** Encoded flat normal (0,0,1) as an [r,g,b] byte triple — for clearing buffers. */
export const FLAT_NORMAL_RGB: readonly [number, number, number] = [128, 128, 255];

/** Clear the derived-normal cache (e.g. on texture reload). */
export function clearNormalCache(): void {
  cache.clear();
}
