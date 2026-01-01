import { Layer, Image as KonvaImage, Rect } from 'react-konva';
import useImage from 'use-image';
import { useToolStore } from '../../stores/toolStore';
import { useMapStore } from '../../stores/mapStore';
import type { BaseTileDefinition, OverlayTileDefinition } from '../../types/map';

interface CursorLayerProps {
  tileSize: number;
  cursorGridX: number | null;
  cursorGridY: number | null;
}

/**
 * CursorLayer - Shows preview of the tile that will be placed
 * Displays a semi-transparent preview of the selected tile at cursor position
 */
export const CursorLayer = ({ tileSize, cursorGridX, cursorGridY }: CursorLayerProps) => {
  const { activeTool, selectedTileDefinitionId } = useToolStore();
  const map = useMapStore((state) => state.map);
  
  // Find tile definition (before any early returns)
  const definition = map?.tileDefinitions.find(
    (def: BaseTileDefinition | OverlayTileDefinition) => def.id === selectedTileDefinitionId
  );
  
  // Load tile image unconditionally (hooks must be called in the same order every render)
  const [image] = useImage(definition?.textureUrl || '');
  
  // Now we can do conditional rendering
  // Only show cursor for brush tool
  if (activeTool !== 'brush' || !selectedTileDefinitionId || !map) return null;
  if (cursorGridX === null || cursorGridY === null) return null;
  
  // Check if cursor is within bounds
  if (cursorGridX < 0 || cursorGridX >= map.width || cursorGridY < 0 || cursorGridY >= map.height) {
    return null;
  }
  
  if (!definition) return null;
  
  // Calculate world position
  const x = cursorGridX * tileSize;
  const y = cursorGridY * tileSize;
  
  return (
    <Layer listening={false}>
      {/* Grid highlight */}
      <Rect
        x={x}
        y={y}
        width={tileSize}
        height={tileSize}
        fill="rgba(255, 255, 255, 0.2)"
        stroke="rgba(255, 255, 255, 0.5)"
        strokeWidth={1}
      />
      
      {/* Tile preview */}
      {image && (
        <KonvaImage
          image={image}
          x={x}
          y={y}
          width={tileSize}
          height={tileSize}
          opacity={0.5}
          perfectDrawEnabled={false}
        />
      )}
    </Layer>
  );
};
