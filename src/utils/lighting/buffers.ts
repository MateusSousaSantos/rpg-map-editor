/**
 * buffers.ts — build the offscreen input buffers the WebGL lighting pass reads.
 *
 * For a full-map bake at a given pixel `scale` we produce three canvases the same
 * size as the composited map:
 *
 *   • albedo   — the unlit map (tiles + props), painted with the exact same code
 *                path as PNG export so live + export stay identical.
 *   • normal   — per-pixel surface normals encoded as `rgb = normal*0.5 + 0.5`.
 *                Ground is flat (0,0,1); props are stamped with alpha-derived
 *                bevels (normals.ts) and wall tiles with a procedural block bevel.
 *   • occluder — a shadow-caster mask (alpha = "solid here"): walls as full
 *                squares + prop alpha silhouettes. The shader raymarches this.
 *
 * Normals and the occluder are built in a single bottom→top layer walk (matching
 * paintMapLayers' order) so the map is only traversed once for both.
 */

import type {
  BaseTileDefinition,
  MapDocument,
  OverlayTileDefinition,
  PropDefinition,
} from '../../types/map';
import { paintMapLayers, resolveTileTextureUrl } from '../exportMap';
import { deriveNormalFromAlpha, FLAT_NORMAL_RGB } from './normals';

export interface LightingBuffers {
  albedo: HTMLCanvasElement;
  normal: HTMLCanvasElement;
  /** Shadow-caster mask; alpha channel is the occlusion. */
  occluder: HTMLCanvasElement;
  /** Buffer dimensions in device pixels (map pixels × scale). */
  width: number;
  height: number;
}

/**
 * Draw an image into `ctx` using the exact placement `drawProp` uses (top-left
 * origin at prop.x/prop.y, rotate about that origin), so stamps line up 1:1 with
 * the albedo. See exportMap.drawProp.
 */
function stampProp(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  rotationDeg: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  if (rotationDeg !== 0) ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
}

/**
 * Draw a square tile image into `ctx` using the exact placement `drawTile` uses:
 * axis-aligned at (x, y) with side `size`, rotated about the tile *center* (unlike
 * props, which rotate about their top-left origin). Keeps occluder/normal stamps
 * aligned 1:1 with the albedo. See exportMap.drawTile.
 */
function stampTileCentered(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  size: number,
  rotationDeg: number,
): void {
  ctx.save();
  if (rotationDeg !== 0) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotationDeg * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

/**
 * Build the albedo + normal + occluder buffers for the whole map.
 * @param scale  pixel multiplier (1 = one buffer pixel per map pixel)
 * @param getTexture  texture lookup (cached HTMLImageElements)
 */
export function buildLightingBuffers(
  map: MapDocument,
  scale: number,
  getTexture: (url: string) => HTMLImageElement | undefined,
): LightingBuffers | null {
  const tileSize = map.tileSize;
  const width = Math.max(1, Math.floor(map.width * tileSize * scale));
  const height = Math.max(1, Math.floor(map.height * tileSize * scale));

  // ── Albedo (shared painter — single source of truth for the unlit map) ─────
  const albedo = document.createElement('canvas');
  albedo.width = width;
  albedo.height = height;
  const actx = albedo.getContext('2d', { alpha: true });
  if (!actx) return null;
  actx.imageSmoothingEnabled = false;
  paintMapLayers(actx, map, scale, getTexture);

  // ── Normal (flat base) + occluder (transparent base) ───────────────────────
  const normal = document.createElement('canvas');
  normal.width = width;
  normal.height = height;
  const nctx = normal.getContext('2d', { alpha: true });
  if (!nctx) return null;
  nctx.imageSmoothingEnabled = false;
  const [fr, fg, fb] = FLAT_NORMAL_RGB;
  nctx.fillStyle = `rgb(${fr},${fg},${fb})`;
  nctx.fillRect(0, 0, width, height);

  const occluder = document.createElement('canvas');
  occluder.width = width;
  occluder.height = height;
  const octx = occluder.getContext('2d', { alpha: true });
  if (!octx) return null;
  octx.imageSmoothingEnabled = false;

  // ── Single layer walk: stamp wall + prop normals and occluders ─────────────
  const tileDefinitions = new Map<string, BaseTileDefinition | OverlayTileDefinition>();
  for (const def of map.tileDefinitions) tileDefinitions.set(def.id, def);
  const propDefinitions = new Map<string, PropDefinition>();
  for (const def of map.propDefinitions) propDefinitions.set(def.id, def);

  const sortedLayers = [...map.layers].sort((a, b) => a.depthIndex - b.depthIndex);
  const tilePx = tileSize * scale;

  for (const layer of sortedLayers) {
    if (!layer.visible) continue;

    // Walls: keep a FLAT normal (the buffer's base fill) — a per-sprite alpha
    // bevel covers most of a full-tile wall and bevels at every tile border, which
    // darkens the sprite and cuts visible seams between connected walls. Only the
    // occluder is stamped, from the sprite's alpha silhouette, so cast shadows
    // still follow the actual art shape. Resolve the same (autotiled) texture the
    // painter renders.
    for (const tile of layer.tilesById.values()) {
      const def = tileDefinitions.get(tile.definitionId);
      if (!def || def.type !== 'wall') continue;
      const resolvedUrl = resolveTileTextureUrl(tile, def, layer.tiles, tileDefinitions);
      const texture = getTexture(resolvedUrl) ?? getTexture(def.textureUrl);
      if (!texture || !texture.complete) continue;

      const tx = tile.gridX * tilePx;
      const ty = tile.gridY * tilePx;
      const rotation = tile.rotation ?? 0;

      // Occluder: only the silhouette (alpha) matters; RGB is ignored by the shader.
      stampTileCentered(octx, texture, tx, ty, tilePx, rotation);
    }

    // Props: alpha-derived normal stamp + alpha silhouette occluder.
    const sortedProps = [...layer.props]
      .filter((p) => p.visible)
      .sort((a, b) => a.zIndex - b.zIndex);
    for (const prop of sortedProps) {
      const def = propDefinitions.get(prop.definitionId);
      if (!def) continue;
      const texture = getTexture(def.textureUrl);
      if (!texture || !texture.complete) continue;

      const px = prop.x * scale;
      const py = prop.y * scale;
      const w = def.width * prop.scaleX * scale;
      const h = def.height * prop.scaleY * scale;

      // NOTE: a rotated prop rotates the normal-map *texels* but not the encoded
      // vectors — acceptable for MVP (most props aren't rotated).
      const propNormal = deriveNormalFromAlpha(texture, def.textureUrl);
      if (propNormal) stampProp(nctx, propNormal, px, py, w, h, prop.rotation);

      // Occluder: only the silhouette (alpha) matters; RGB is ignored by the shader.
      stampProp(octx, texture, px, py, w, h, prop.rotation);
    }
  }

  return { albedo, normal, occluder, width, height };
}
