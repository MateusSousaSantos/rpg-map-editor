import { useEffect, useRef, useMemo, useState } from 'react';
import type { MapLayer, TileInstance, BaseTileDefinition, OverlayTileDefinition } from '../types/map';
import { useTextureCache } from '../stores/textureCache';
import { useViewportStore } from '../stores/viewportStore';
import { isAutotileEnabled, computeBlobBitmask, resolveAutotileTexturePath } from '../utils/autotiling';

interface UseNativeCanvasTilesProps {
  layer: MapLayer;
  tileSize: number;
  canvasWidth: number;
  canvasHeight: number;
  layerOpacity: number;
  mapWidth: number;
  mapHeight: number;
  tileDefinitions: Map<string, BaseTileDefinition | OverlayTileDefinition>;
}

interface VisibleBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Native Canvas Tile Renderer Hook
 *
 * Renders tiles to an off-screen canvas using Canvas 2D API for better performance.
 * Returns a canvas element that can be displayed as a Konva.Image.
 *
 * Features:
 * - Viewport culling (only draws visible tiles + padding)
 * - Texture caching integration
 * - Rotation and tinting support
 * - Handles overflow tiles
 * - Auto-redraws on tile changes, viewport changes, or texture loads
 */
export const useNativeCanvasTiles = ({
  layer,
  tileSize,
  canvasWidth,
  canvasHeight,
  layerOpacity,
  mapWidth,
  mapHeight,
  tileDefinitions,
}: UseNativeCanvasTilesProps) => {
  const { panX, panY, zoom } = useViewportStore();
  const { getTexture, loadTexture } = useTextureCache();

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Track if we need to redraw
  const [redrawTrigger, setRedrawTrigger] = useState(0);
  // Incremented after each completed draw so consumers can force Konva repaint
  const [drawVersion, setDrawVersion] = useState(0);
  const prevTilesRef = useRef<Map<string, TileInstance>>(new Map());
  const loadingTexturesRef = useRef<Set<string>>(new Set());

  // Calculate visible tile bounds with padding
  const visibleBounds = useMemo((): VisibleBounds => {
    // Convert canvas bounds to world coordinates
    const worldLeft = -panX / zoom;
    const worldTop = -panY / zoom;
    const worldRight = (canvasWidth - panX) / zoom;
    const worldBottom = (canvasHeight - panY) / zoom;

    // Convert to grid coordinates with padding for smooth scrolling
    const padding = 2;
    return {
      minX: Math.max(0, Math.floor(worldLeft / tileSize) - padding),
      minY: Math.max(0, Math.floor(worldTop / tileSize) - padding),
      maxX: Math.min(mapWidth - 1, Math.ceil(worldRight / tileSize) + padding),
      maxY: Math.min(mapHeight - 1, Math.ceil(worldBottom / tileSize) + padding),
    };
  }, [panX, panY, zoom, canvasWidth, canvasHeight, tileSize, mapWidth]);

  // Filter visible tiles
  const visibleTiles = useMemo(() => {
    const tiles: TileInstance[] = [];
    for (const tile of layer.tilesById.values()) {
      if (
        tile.gridX >= visibleBounds.minX &&
        tile.gridX <= visibleBounds.maxX &&
        tile.gridY >= visibleBounds.minY &&
        tile.gridY <= visibleBounds.maxY
      ) {
        tiles.push(tile);
      }
    }
    return tiles;
  }, [layer.tilesById, visibleBounds]);

  // Resolve the effective texture URL for each visible tile.
  // Autotile-enabled tiles get a per-bitmask variant path; others use textureUrl as-is.
  const resolvedTextureUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const tile of visibleTiles) {
      const def = tileDefinitions.get(tile.definitionId);
      if (!def) continue;
      if (isAutotileEnabled(def)) {
        const bitmask = computeBlobBitmask(
          tile.gridX,
          tile.gridY,
          layer.tiles,
          def.autotileGroup!,
          tile.type,
          tileDefinitions as Map<string, BaseTileDefinition>,
        );
        map.set(tile.id, resolveAutotileTexturePath(def, bitmask));
      } else {
        map.set(tile.id, def.textureUrl);
      }
    }
    return map;
  }, [visibleTiles, layer.tiles, tileDefinitions]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;
      const ctx = canvas.getContext('2d', { alpha: true });
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctxRef.current = ctx;
      }
      // Trigger initial draw
      setRedrawTrigger(prev => prev + 1);
    }
  }, []);

  // Update canvas size when viewport bounds change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Calculate canvas size to fit visible area + padding
    const width = (visibleBounds.maxX - visibleBounds.minX + 1) * tileSize;
    const height = (visibleBounds.maxY - visibleBounds.minY + 1) * tileSize;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    // Always trigger redraw when visible bounds change (pan/zoom)
    setRedrawTrigger(prev => prev + 1);
  }, [visibleBounds, tileSize]);

  // Check if tiles have changed
  useEffect(() => {
    const currentTiles = layer.tilesById;
    const prevTiles = prevTilesRef.current;

    // Quick size check
    if (currentTiles.size !== prevTiles.size) {
      prevTilesRef.current = new Map(currentTiles);
      setRedrawTrigger(prev => prev + 1);
      return;
    }

    // Deep check for changes
    let hasChanges = false;
    for (const [id, tile] of currentTiles) {
      const prevTile = prevTiles.get(id);
      if (!prevTile ||
          prevTile.gridX !== tile.gridX ||
          prevTile.gridY !== tile.gridY ||
          prevTile.definitionId !== tile.definitionId ||
          prevTile.rotation !== tile.rotation ||
          prevTile.opacity !== tile.opacity ||
          prevTile.tint !== tile.tint) {
        hasChanges = true;
        break;
      }
    }

    if (hasChanges) {
      prevTilesRef.current = new Map(currentTiles);
      setRedrawTrigger(prev => prev + 1);
    }
  }, [layer.tilesById]);

  // Load textures for visible tiles and trigger redraw when loaded
  useEffect(() => {
    const texturesToLoad: string[] = [];

    const enqueue = (url: string) => {
      if (!getTexture(url) && !loadingTexturesRef.current.has(url)) {
        texturesToLoad.push(url);
        loadingTexturesRef.current.add(url);
      }
    };

    for (const tile of visibleTiles) {
      const definition = tileDefinitions.get(tile.definitionId);
      if (!definition) continue;

      // Always ensure the base texture is loaded as a fallback
      enqueue(definition.textureUrl);

      // For autotile tiles, also load the resolved variant URL
      const resolvedUrl = resolvedTextureUrls.get(tile.id);
      if (resolvedUrl && resolvedUrl !== definition.textureUrl) {
        enqueue(resolvedUrl);
      }
    }

    // Load textures and trigger redraw when complete
    if (texturesToLoad.length > 0) {
      Promise.all(texturesToLoad.map(url =>
        loadTexture(url)
          .then(() => {
            loadingTexturesRef.current.delete(url);
          })
          .catch(() => {
            loadingTexturesRef.current.delete(url);
          })
      )).then(() => {
        setRedrawTrigger(prev => prev + 1);
      });
    }
  }, [visibleTiles, resolvedTextureUrls, tileDefinitions, getTexture, loadTexture]);

  // Draw tiles to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    if (canvas.width === 0 || canvas.height === 0) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate offset for rendering (tiles are offset by visible bounds)
    const offsetX = visibleBounds.minX * tileSize;
    const offsetY = visibleBounds.minY * tileSize;

    // Draw each visible tile
    for (const tile of visibleTiles) {
      const definition = tileDefinitions.get(tile.definitionId);
      if (!definition) continue;

      // Prefer the autotile variant; fall back to base texture when file is missing
      const resolvedUrl = resolvedTextureUrls.get(tile.id) ?? definition.textureUrl;
      const texture = getTexture(resolvedUrl) ?? getTexture(definition.textureUrl);
      if (!texture || !texture.complete) continue;

      // Calculate position relative to canvas
      const x = tile.gridX * tileSize - offsetX;
      const y = tile.gridY * tileSize - offsetY;

      // Get opacity
      const tileOpacity = tile.opacity ??
        (definition.type === 'overlay' ? (definition as OverlayTileDefinition).opacity ?? 1 : 1);
      const opacity = tileOpacity * layerOpacity;

      // Get rotation
      const rotation = tile.rotation ?? 0;

      // Save context state
      ctx.save();

      // Apply opacity
      ctx.globalAlpha = opacity;

      // Apply rotation if needed
      if (rotation !== 0) {
        const centerX = x + tileSize / 2;
        const centerY = y + tileSize / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }

      // Apply color tint if specified
      if (tile.tint) {
        // Parse hex color
        const r = parseInt(tile.tint.slice(1, 3), 16);
        const g = parseInt(tile.tint.slice(3, 5), 16);
        const b = parseInt(tile.tint.slice(5, 7), 16);

        // Draw with color tint using multiply blend
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, tileSize, tileSize);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(texture, x, y, tileSize, tileSize);
        ctx.globalCompositeOperation = 'source-over';
      } else {
        // Draw normally
        ctx.drawImage(texture, x, y, tileSize, tileSize);
      }

      // Restore context state
      ctx.restore();
    }

    // Signal consumers that a new frame was drawn
    setDrawVersion(prev => prev + 1);
  }, [redrawTrigger, visibleTiles, resolvedTextureUrls, visibleBounds, tileSize, layerOpacity, tileDefinitions, getTexture]);

  // Return canvas and position information
  return {
    canvas: canvasRef.current,
    x: visibleBounds.minX * tileSize,
    y: visibleBounds.minY * tileSize,
    drawVersion,
  };
};
