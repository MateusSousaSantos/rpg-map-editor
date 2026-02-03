import { useMemo } from 'react';
import { Image as KonvaImage, Rect } from 'react-konva';
import type { MapLayer, BaseTileDefinition, OverlayTileDefinition } from '../../types/map';
import { useMapStore } from '../../stores/mapStore';
import { useUISelectionStore } from '../../stores/uiSelectionStore';
import { useNativeCanvasTiles } from '../../hooks/useNativeCanvasTiles';

interface TileLayerProps {
  layer: MapLayer;
  tileSize: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * TileLayer - Native Canvas Tile Renderer
 * 
 * Uses native Canvas 2D API for rendering tiles instead of Konva for better performance.
 * All tiles for this layer are rendered to a single off-screen canvas and displayed as a Konva.Image.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 
 * 1. NATIVE CANVAS API
 *    - Uses Canvas 2D API instead of Konva for tile rendering
 *    - Reduces overhead from creating individual Konva.Image components
 *    - Single canvas element per layer instead of N Konva nodes
 *    - Example: 1000 tiles → 1 canvas element instead of 1000 Konva.Image nodes
 * 
 * 2. VIEWPORT CULLING
 *    - Only renders tiles within visible viewport bounds + padding
 *    - Calculates visible grid area from canvas dimensions and viewport transform
 *    - Adds 2-tile padding for smooth scrolling
 *    - Example: 10,000 tile map → only ~50-100 tiles drawn to canvas
 * 
 * 3. TEXTURE CACHING
 *    - Shared texture cache across all tiles (useTextureCache store)
 *    - Loads each unique texture only once
 *    - Reuses HTMLImageElement instances for same tile definitions
 *    - Example: 1000 grass tiles → 1 texture load instead of 1000
 * 
 * 4. BATCH UPDATES
 *    - Canvas redraws only when tiles change, viewport changes, or textures load
 *    - Dirty-checking prevents unnecessary redraws
 *    - Example: Static map → 0 redraws while panning (canvas moves, not redraws)
 */
export const TileLayer = ({ layer, tileSize, canvasWidth = 800, canvasHeight = 600 }: TileLayerProps) => {
  const map = useMapStore((state) => state.map);
  const selectedTileIds = useUISelectionStore((state) => state.selectedTileIds);
  
  // Get the current layer state from the store to ensure fresh visibility data
  const currentLayer = map?.layers.find(l => l.id === layer.id);
  
  // Build tile definitions map for efficient lookup
  const tileDefinitionsMap = useMemo(() => {
    if (!map) return new Map<string, BaseTileDefinition | OverlayTileDefinition>();
    const defMap = new Map<string, BaseTileDefinition | OverlayTileDefinition>();
    for (const def of map.tileDefinitions) {
      defMap.set(def.id, def);
    }
    return defMap;
  }, [map?.tileDefinitions]);
  
  // Use native canvas renderer for tiles
  const { canvas, x: canvasX, y: canvasY } = useNativeCanvasTiles({
    layer,
    tileSize,
    canvasWidth,
    canvasHeight,
    layerOpacity: 1, // Layer opacity is handled by Konva Layer component
    mapWidth: map?.width ?? 0,
    mapHeight: map?.height ?? 0,
    tileDefinitions: tileDefinitionsMap,
  });
  
  // Early returns AFTER all hooks have been called
  if (!map || !currentLayer) return null;
  
  return (
    <>
      {/* Render the native canvas as a Konva.Image */}
      {canvas && (
        <KonvaImage
          image={canvas}
          x={canvasX}
          y={canvasY}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
      
      {/* Render selection borders for selected tiles (overlay on top of canvas) */}
      {Array.from(currentLayer.tilesById.values())
        .filter(tile => selectedTileIds.has(tile.id))
        .map((tile) => (
          <Rect
            key={`selection-${tile.id}`}
            x={Math.round(tile.gridX * tileSize)}
            y={Math.round(tile.gridY * tileSize)}
            width={Math.round(tileSize)}
            height={Math.round(tileSize)}
            stroke="#00ffff"
            strokeWidth={2}
            listening={false}
            hitStrokeWidth={0}
          />
        ))}
    </>
  );
};
