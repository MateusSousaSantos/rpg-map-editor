import type { MapDocument, BaseTileDefinition, OverlayTileDefinition } from '../types/map';
import { useTextureCache } from '../stores/textureCache';
import { isAutotileEnabled, computeBlobBitmask, resolveAutotileTexturePath } from './autotiling';
import { drawTile } from './exportMap';

const THUMB_MAX_W = 2480;
const THUMB_MAX_H = 896; // 2× h-28, downscaled by CSS to crisp display

/**
 * Renders a small JPEG snapshot of the given map document.
 * Returns a base64 data URL, or null if the map has no tiles to render.
 */
export async function generateThumbnail(map: MapDocument): Promise<string | null> {
  const { loadTexture, getTexture } = useTextureCache.getState();
  const tileSize = map.tileSize;

  // Determine how many tiles actually exist
  const totalTiles = map.layers.reduce(
    (acc, l) => acc + l.tilesById.size,
    0,
  );
  if (totalTiles === 0) return null;

  // Scale so the whole map fits within THUMB_MAX_W × THUMB_MAX_H
  const scale = Math.min(
    THUMB_MAX_W / (map.width * tileSize),
    THUMB_MAX_H / (map.height * tileSize),
    2, // never upscale beyond 2×
  );

  const canvasWidth = Math.round(map.width * tileSize * scale);
  const canvasHeight = Math.round(map.height * tileSize * scale);

  // Build tileDefinitions lookup
  const tileDefinitions = new Map<string, BaseTileDefinition | OverlayTileDefinition>();
  for (const def of map.tileDefinitions) {
    tileDefinitions.set(def.id, def);
  }

  // Collect all texture URLs we'll need
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

  await Promise.allSettled([...urlsToLoad].map(url => loadTexture(url)));

  // Draw to off-screen canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;

  const sortedLayers = [...map.layers].sort((a, b) => a.depthIndex - b.depthIndex);

  for (const layer of sortedLayers) {
    if (!layer.visible) continue;
    for (const tile of layer.tilesById.values()) {
      const def = tileDefinitions.get(tile.definitionId);
      if (!def) continue;

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

  return canvas.toDataURL('image/jpeg', 0.85);
}
