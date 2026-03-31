import { memo, useMemo } from 'react';
import { Layer, Image as KonvaImage, Rect, Group } from 'react-konva';
import useImage from 'use-image';
import { useToolStore } from '../../stores/toolStore';
import { useMapStore } from '../../stores/mapStore';
import { useUISelectionStore } from '../../stores/uiSelectionStore';
import type { BaseTileDefinition, OverlayTileDefinition, TileType } from '../../types/map';

interface CursorLayerProps {
  tileSize: number;
  cursorGridX: number | null;
  cursorGridY: number | null;
  boxPreview?: { startX: number; startY: number; endX: number; endY: number } | null;
}

/**
 * CursorLayer - Shows preview of the tile that will be placed
 * Displays a semi-transparent preview of the selected tile at cursor position
 */
export const CursorLayer = memo(({ tileSize, cursorGridX, cursorGridY, boxPreview }: CursorLayerProps) => {
  const { activeTool, boxMode, selectedTileDefinitionId, isPickerActive } = useToolStore();
  const map = useMapStore((state) => state.map);
  const getTileAt = useMapStore((state) => state.getTileAt);
  const selectedLayerId = useUISelectionStore((state) => state.selectedLayerId);

  // Resolve picker tile at cursor position
  const pickerTile = useMemo(() => {
    if (!isPickerActive || cursorGridX === null || cursorGridY === null || !map) return null;
    const layer = selectedLayerId
      ? map.layers.find(l => l.id === selectedLayerId)
      : map.layers[0];
    if (!layer) return null;
    const types: TileType[] = ['overlay', 'wall', 'terrain'];
    for (const type of types) {
      const tile = getTileAt(layer.id, cursorGridX, cursorGridY, type);
      if (tile) return tile;
    }
    return null;
  }, [isPickerActive, cursorGridX, cursorGridY, map, selectedLayerId, getTileAt]);

  const pickerDefinition = map?.tileDefinitions.find(
    (def: BaseTileDefinition | OverlayTileDefinition) => def.id === pickerTile?.definitionId
  );
  const [pickerImage] = useImage(pickerDefinition?.textureUrl || '');

  // Find tile definition (before any early returns)
  const definition = map?.tileDefinitions.find(
    (def: BaseTileDefinition | OverlayTileDefinition) => def.id === selectedTileDefinitionId
  );

  // Load tile image unconditionally (hooks must be called in the same order every render)
  const [image] = useImage(definition?.textureUrl || '');

  // ── Picker mode overlay ──────────────────────────────────────────────────
  if (isPickerActive && map) {
    if (cursorGridX === null || cursorGridY === null) return null;
    if (cursorGridX < 0 || cursorGridX >= map.width || cursorGridY < 0 || cursorGridY >= map.height) return null;

    const px = cursorGridX * tileSize;
    const py = cursorGridY * tileSize;
    const previewSize = tileSize * 0.6;
    const previewOffset = tileSize * 0.55;

    return (
      <Layer listening={false}>
        {/* Highlight hovered cell */}
        <Rect
          x={px}
          y={py}
          width={tileSize}
          height={tileSize}
          fill={pickerTile ? 'rgba(0, 210, 211, 0.18)' : 'rgba(255, 255, 255, 0.08)'}
          stroke={pickerTile ? 'rgba(0, 210, 211, 0.8)' : 'rgba(255, 255, 255, 0.3)'}
          strokeWidth={2}
        />

        {/* Mini tile preview badge near cursor */}
        {pickerTile && pickerImage && (
          <Group x={px + previewOffset} y={py + previewOffset}>
            <Rect
              width={previewSize + 4}
              height={previewSize + 4}
              fill="rgba(15, 23, 42, 0.85)"
              cornerRadius={4}
              stroke="rgba(0, 210, 211, 0.7)"
              strokeWidth={1}
            />
            <KonvaImage
              image={pickerImage}
              x={2}
              y={2}
              width={previewSize}
              height={previewSize}
              perfectDrawEnabled={false}
            />
          </Group>
        )}
      </Layer>
    );
  }

  // Show box preview when dragging
  if (activeTool === 'box' && boxPreview && map) {
    const minX = Math.min(boxPreview.startX, boxPreview.endX);
    const maxX = Math.max(boxPreview.startX, boxPreview.endX);
    const minY = Math.min(boxPreview.startY, boxPreview.endY);
    const maxY = Math.max(boxPreview.startY, boxPreview.endY);

    const boxWidth = (maxX - minX + 1) * tileSize;
    const boxHeight = (maxY - minY + 1) * tileSize;
    const boxX = minX * tileSize;
    const boxY = minY * tileSize;

    const isErase = boxMode === 'erase';
    const fillColor = isErase ? 'rgba(220, 38, 38, 0.2)' : 'rgba(138, 43, 226, 0.2)';
    const strokeColor = isErase ? 'rgba(220, 38, 38, 0.8)' : 'rgba(138, 43, 226, 0.8)';

    return (
      <Layer listening={false}>
        {/* Box preview background */}
        <Rect
          x={boxX}
          y={boxY}
          width={boxWidth}
          height={boxHeight}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2}
        />

        {/* Preview tiles in the box (paint mode only) */}
        {!isErase && image && definition && (() => {
          const tiles = [];
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              // Check if within bounds
              if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
                tiles.push(
                  <KonvaImage
                    key={`${x}-${y}`}
                    image={image}
                    x={x * tileSize}
                    y={y * tileSize}
                    width={tileSize}
                    height={tileSize}
                    opacity={0.4}
                    perfectDrawEnabled={false}
                  />
                );
              }
            }
          }
          return tiles;
        })()}
      </Layer>
    );
  }

  // Show cursor for brush tool
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
});
