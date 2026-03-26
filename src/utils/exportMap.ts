import type { BaseTileDefinition, OverlayTileDefinition, TileInstance } from '../types/map';
import { useMapStore } from '../stores/mapStore';
import { useTextureCache } from '../stores/textureCache';
import { isAutotileEnabled, computeBlobBitmask, resolveAutotileTexturePath } from './autotiling';

/**
 * Renders the full map (all visible layers) to an off-screen canvas and
 * triggers a browser download.
 *
 * @param format  - 'png' or 'jpeg'
 * @param scale   - Pixel multiplier applied to the tile grid (e.g. 2 → 2× size)
 * @param showGrid - Whether to draw grid lines over the exported image
 */
export async function exportMap(
  format: 'png' | 'jpeg',
  scale: number,
  showGrid: boolean,
): Promise<void> {
  const map = useMapStore.getState().map;
  if (!map) throw new Error('No map loaded');

  const { loadTexture, getTexture } = useTextureCache.getState();
  const tileSize = map.tileSize;

  const canvasWidth = map.width * tileSize * scale;
  const canvasHeight = map.height * tileSize * scale;

  // ─── Build tileDefinitions lookup ────────────────────────────────────────
  const tileDefinitions = new Map<string, BaseTileDefinition | OverlayTileDefinition>();
  for (const def of map.tileDefinitions) {
    tileDefinitions.set(def.id, def);
  }

  // ─── Resolve every texture URL we'll need before drawing ─────────────────
  const urlsToLoad = new Set<string>();

  for (const layer of map.layers) {
    if (!layer.visible) continue;
    for (const tile of layer.tilesById.values()) {
      const def = tileDefinitions.get(tile.definitionId);
      if (!def) continue;

      urlsToLoad.add(def.textureUrl);

      if (isAutotileEnabled(def)) {
        const bitmask = computeBlobBitmask(
          tile.gridX,
          tile.gridY,
          layer.tiles,
          def.autotileGroup!,
          tile.type,
          tileDefinitions as Map<string, BaseTileDefinition>,
        );
        urlsToLoad.add(resolveAutotileTexturePath(def, bitmask));
      }
    }
  }

  // Load all textures concurrently; ignore individual failures (tiles will be skipped)
  await Promise.allSettled([...urlsToLoad].map(url => loadTexture(url)));

  // ─── Create canvas ────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d', { alpha: format === 'png' });
  if (!ctx) throw new Error('Could not get 2D canvas context');

  ctx.imageSmoothingEnabled = false;

  // Fill background for JPEG (no transparency)
  if (format === 'jpeg') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // ─── Render layers (bottom → top) ─────────────────────────────────────────
  const sortedLayers = [...map.layers].sort((a, b) => a.depthIndex - b.depthIndex);

  for (const layer of sortedLayers) {
    if (!layer.visible) continue;

    for (const tile of layer.tilesById.values()) {
      const def = tileDefinitions.get(tile.definitionId);
      if (!def) continue;

      // Overflow tiles are stored as standalone entries in tilesById (type === 'overflow').
      // They don't have autotiling — use their base textureUrl directly.
      let resolvedUrl = def.textureUrl;
      if (tile.type !== 'overflow' && isAutotileEnabled(def)) {
        const bitmask = computeBlobBitmask(
          tile.gridX,
          tile.gridY,
          layer.tiles,
          def.autotileGroup!,
          tile.type,
          tileDefinitions as Map<string, BaseTileDefinition>,
        );
        resolvedUrl = resolveAutotileTexturePath(def, bitmask);
      }

      const texture = getTexture(resolvedUrl) ?? getTexture(def.textureUrl);
      if (!texture || !texture.complete) continue;

      drawTile(ctx, tile, def as OverlayTileDefinition, texture, tileSize, scale, layer.opacity);
    }
  }

  // ─── Grid overlay ─────────────────────────────────────────────────────────
  if (showGrid) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= map.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * tileSize * scale, 0);
      ctx.lineTo(x * tileSize * scale, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= map.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * tileSize * scale);
      ctx.lineTo(canvasWidth, y * tileSize * scale);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

    ctx.restore();
  }

  // ─── Download ─────────────────────────────────────────────────────────────
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpeg' ? 'jpg' : 'png';

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create image blob'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${map.name || 'map'}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve();
      },
      mimeType,
      0.95,
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: TileInstance,
  def: OverlayTileDefinition,
  texture: HTMLImageElement,
  tileSize: number,
  scale: number,
  layerOpacity: number,
): void {
  const x = tile.gridX * tileSize * scale;
  const y = tile.gridY * tileSize * scale;
  const size = tileSize * scale;

  const tileOpacity =
    tile.opacity ?? (def.type === 'overlay' ? (def.opacity ?? 1) : 1);
  const opacity = tileOpacity * layerOpacity;
  const rotation = tile.rotation ?? 0;

  ctx.save();
  ctx.globalAlpha = opacity;

  if (rotation !== 0) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  if (tile.tint) {
    const r = parseInt(tile.tint.slice(1, 3), 16);
    const g = parseInt(tile.tint.slice(3, 5), 16);
    const b = parseInt(tile.tint.slice(5, 7), 16);

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, y, size, size);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(texture, x, y, size, size);
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.drawImage(texture, x, y, size, size);
  }

  ctx.restore();
}
