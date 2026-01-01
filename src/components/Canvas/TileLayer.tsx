import { useEffect, useState } from 'react';
import { Layer, Image as KonvaImage, Rect } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import type { MapLayer, TileInstance, BaseTileDefinition, OverlayTileDefinition, MapDocument } from '../../types/map';
import { useMapStore } from '../../stores/mapStore';
import { useUISelectionStore } from '../../stores/uiSelectionStore';

interface TileLayerProps {
  layer: MapLayer;
  tileSize: number;
}

/**
 * TileLayer - Renders all tiles in a layer
 * 
 * Responsibilities:
 * - Render tile images from definitions
 * - Handle tile selection visual feedback
 * - Optimize rendering (only visible tiles)
 * - Support overlay blending
 */
export const TileLayer = ({ layer, tileSize }: TileLayerProps) => {
  const map = useMapStore((state) => state.map);
  const selectedTileIds = useUISelectionStore((state) => state.selectedTileIds);
  
  if (!map || !layer.visible) return null;
  
  // Collect all tiles from all grids in this layer
  // Use a Map to ensure unique tile IDs (in case of duplicates)
  const tilesMap = new Map<string, TileInstance>();
  for (const tileGrid of layer.tileGrids) {
    for (const tile of tileGrid.tiles.values()) {
      tilesMap.set(tile.id, tile);
    }
  }
  const allTiles = Array.from(tilesMap.values());
  
  return (
    <Layer 
      opacity={layer.opacity}
      imageSmoothingEnabled={false}
      listening={false}
    >
      {allTiles.map((tile) => (
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
 * TileRenderer - Renders a single tile instance
 * Handles image loading and selection feedback
 */
const TileRenderer = ({ tile, tileSize, map, isSelected }: TileRendererProps) => {
  // Find tile definition
  const definition = map.tileDefinitions.find(
    (def: BaseTileDefinition | OverlayTileDefinition) => def.id === tile.definitionId
  ) as BaseTileDefinition | OverlayTileDefinition | undefined;
  
  if (!definition) {
    console.warn(`Tile definition not found: ${tile.definitionId}`);
    return null;
  }
  
  // Load tile image
  const [image, status] = useImage(definition.textureUrl);
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    if (status === 'failed') {
      setImageError(true);
      console.error(`Failed to load tile texture: ${definition.textureUrl}`);
    }
  }, [status, definition.textureUrl]);
  
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
  
  return (
    <>
      {/* Tile Image */}
      {image && !imageError ? (
        <KonvaImage
          image={image}
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
