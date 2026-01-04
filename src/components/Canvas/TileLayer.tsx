import { useEffect, useState, useMemo, useRef } from 'react';
import { Layer, Image as KonvaImage, Rect } from 'react-konva';
import Konva from 'konva';
import type { MapLayer, TileInstance, BaseTileDefinition, OverlayTileDefinition, MapDocument } from '../../types/map';
import { useMapStore } from '../../stores/mapStore';
import { useUISelectionStore } from '../../stores/uiSelectionStore';
import { useViewportStore } from '../../stores/viewportStore';
import { useTextureCache } from '../../stores/textureCache';

interface TileLayerProps {
  layer: MapLayer;
  tileSize: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * TileLayer - Highly optimized tile rendering with 4 performance enhancements
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 
 * 1. VIEWPORT CULLING (Lines 45-63)
 *    - Only renders tiles within visible viewport bounds
 *    - Calculates visible grid area from canvas dimensions and viewport transform
 *    - Adds 2-tile padding for smooth scrolling
 *    - Reduces render calls from O(all tiles) to O(visible tiles)
 *    - Example: 10,000 tile map → only ~50-100 tiles rendered at once
 * 
 * 2. TEXTURE CACHING (Lines 97-122)
 *    - Shared texture cache across all tiles (useTextureCache store)
 *    - Loads each unique texture only once
 *    - Reuses HTMLImageElement instances for same tile definitions
 *    - Prevents duplicate network requests and memory usage
 *    - Example: 1000 grass tiles → 1 texture load instead of 1000
 * 
 * 3. LAYER POOLING (Lines 126-159)
 *    - React reconciliation reuses Konva shapes when key stays same
 *    - Konva.Image components are updated in-place, not destroyed/recreated
 *    - Reduces garbage collection and DOM manipulation
 *    - Stable component keys (tile.id) enable efficient diffing
 * 
 * 4. BATCH UPDATES (mapStore)
 *    - batchAddTiles() and batchRemoveTiles() methods in mapStore
 *    - Groups multiple tile changes into single Zustand state update
 *    - Triggers only one React re-render for multiple operations
 *    - Example: Fill tool placing 100 tiles → 1 render instead of 100
 */
export const TileLayer = ({ layer, tileSize, canvasWidth = 800, canvasHeight = 600 }: TileLayerProps) => {
  const map = useMapStore((state) => state.map);
  const selectedTileIds = useUISelectionStore((state) => state.selectedTileIds);
  const { panX, panY, zoom } = useViewportStore();
  
  // Get the current layer state from the store to ensure fresh visibility data
  const currentLayer = map?.layers.find(l => l.id === layer.id);
  
  // OPTIMIZATION 1: Viewport Culling
  // Calculate visible tile bounds
  const visibleBounds = useMemo(() => {
    if (!map) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    
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
      maxX: Math.min(map.width - 1, Math.ceil(worldRight / tileSize) + padding),
      maxY: Math.min(map.height - 1, Math.ceil(worldBottom / tileSize) + padding),
    };
  }, [panX, panY, zoom, canvasWidth, canvasHeight, tileSize, map]);
  
  // Filter tiles to only visible ones
  const visibleTiles = useMemo(() => {
    if (!currentLayer) return [];
    
    const tiles: TileInstance[] = [];
    // Use currentLayer to ensure we have the latest data
    for (const tile of currentLayer.tilesById.values()) {
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
  }, [currentLayer, visibleBounds]);
  
  // Early returns AFTER all hooks have been called
  if (!map || !currentLayer || !currentLayer.visible) return null;
  
  return (
    <Layer 
      opacity={currentLayer.opacity}
      imageSmoothingEnabled={false}
      listening={false}
    >
      {visibleTiles.map((tile) => (
        <TileRenderer
          key={tile.id}
          tile={tile}
          tileSize={tileSize}
          map={map}
          isSelected={selectedTileIds.has(tile.id)}
        />
      ))}
    </Layer>
  );
};

interface TileRendererProps {
  tile: TileInstance;
  tileSize: number;
  map: MapDocument;
  isSelected: boolean;
}

/**
 * TileRenderer - Renders a single tile with texture caching and pooling
 * 
 * OPTIMIZATION 2: Texture Caching
 * OPTIMIZATION 3: Layer Pooling (Konva shape reuse via React reconciliation)
 */
const TileRenderer = ({ tile, tileSize, map, isSelected }: TileRendererProps) => {
  const loadTexture = useTextureCache((state) => state.loadTexture);
  const getTexture = useTextureCache((state) => state.getTexture);
  const [imageError, setImageError] = useState(false);
  const loadingRef = useRef(false);
  
  // Find tile definition
  const definition = map.tileDefinitions.find(
    (def: BaseTileDefinition | OverlayTileDefinition) => def.id === tile.definitionId
  ) as BaseTileDefinition | OverlayTileDefinition | undefined;
  
  if (!definition) {
    console.warn(`Tile definition not found: ${tile.definitionId}`);
    return null;
  }
  
  // OPTIMIZATION 2: Use cached texture or load it
  const [cachedImage, setCachedImage] = useState<HTMLImageElement | undefined>(() => 
    getTexture(definition.textureUrl)
  );
  
  useEffect(() => {
    const texture = getTexture(definition.textureUrl);
    if (texture) {
      setCachedImage(texture);
      return;
    }
    
    // Load texture if not cached
    if (!loadingRef.current) {
      loadingRef.current = true;
      loadTexture(definition.textureUrl)
        .then((img) => {
          setCachedImage(img);
          setImageError(false);
          loadingRef.current = false;
        })
        .catch(() => {
          setImageError(true);
          loadingRef.current = false;
          console.error(`Failed to load tile texture: ${definition.textureUrl}`);
        });
    }
  }, [definition.textureUrl, loadTexture, getTexture]);
  
  // Calculate world position from grid position - ensure whole pixels to prevent gaps
  const x = Math.round(tile.gridX * tileSize);
  const y = Math.round(tile.gridY * tileSize);
  const width = Math.round(tileSize);
  const height = Math.round(tileSize);
  
  // Get opacity (instance override or definition default or layer default)
  const opacity = tile.opacity ?? 
    (definition.type === 'overlay' ? (definition as OverlayTileDefinition).opacity ?? 1 : 1);
  
  // Get rotation (0, 90, 180, 270)
  const rotation = tile.rotation ?? 0;
  
  // Rotation offset (rotate around center of tile)
  const offsetX = rotation !== 0 ? width / 2 : -0.5;
  const offsetY = rotation !== 0 ? height / 2 : -0.5;
  
  // OPTIMIZATION 3: React reconciliation reuses Konva shapes when key stays same
  return (
    <>
      {/* Tile Image */}
      {cachedImage && !imageError ? (
        <KonvaImage
          image={cachedImage}
          x={x}
          y={y}
          width={width}
          height={height}
          opacity={opacity}
          rotation={rotation}
          offsetX={offsetX}
          offsetY={offsetY}
          scaleX={1.01}
          scaleY={1.01}
          perfectDrawEnabled={false}
          imageSmoothingEnabled={false}
          listening={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={0}
          // Color tint (if specified)
          filters={tile.tint ? [Konva.Filters.RGB] : undefined}
          red={tile.tint ? parseInt(tile.tint.slice(1, 3), 16) : undefined}
          green={tile.tint ? parseInt(tile.tint.slice(3, 5), 16) : undefined}
          blue={tile.tint ? parseInt(tile.tint.slice(5, 7), 16) : undefined}
        />
      ) : (
        // Fallback for missing/loading images
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={imageError ? '#ff0000' : '#333333'}
          opacity={0.3}
        />
      )}
      
      {/* Selection Border */}
      {isSelected && (
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          stroke="#00ffff"
          strokeWidth={2}
          listening={false}
          hitStrokeWidth={0}
        />
      )}
    </>
  );
};
