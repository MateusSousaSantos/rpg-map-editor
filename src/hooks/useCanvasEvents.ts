import { useCallback, useRef } from 'react';
import Konva from 'konva';
import { useMapStore } from '../stores/mapStore';
import { useToolStore } from '../stores/toolStore';
import { useUISelectionStore } from '../stores/uiSelectionStore';
import { useViewportStore } from '../stores/viewportStore';
import type { TileInstance } from '../types/map';

interface CanvasEventsParams {
  tileSize: number;
  editable: boolean;
}

/**
 * useCanvasEvents - Manages all canvas interaction events
 * 
 * Handles:
 * - Brush tool (place tiles)
 * - Eraser tool (remove tiles)
 * - Selection tool (select tiles/props)
 * - Pan tool (already in MapCanvas)
 * 
 * @param tileSize - Size of each tile in pixels
 * @param editable - Whether the canvas is in edit mode
 */
export const useCanvasEvents = ({ tileSize, editable }: CanvasEventsParams) => {
  const { activeTool, selectedTileDefinitionId, selectedTileGridType } = useToolStore();
  const { addTile, removeTile, getTile, map } = useMapStore();
  const { zoom, panX, panY } = useViewportStore();
  const { selectTiles, toggleTileSelection, clearSelection, selectedLayerId } = useUISelectionStore();
  
  // Track if we're currently drawing (for drag operations)
  const isDrawingRef = useRef(false);
  const lastDrawnTileRef = useRef<{ x: number; y: number } | null>(null);
  
  /**
   * Convert stage coordinates to grid coordinates
   */
  const screenToGrid = useCallback((stageX: number, stageY: number): { gridX: number; gridY: number } => {
    // Account for viewport transform
    const worldX = (stageX - panX) / zoom;
    const worldY = (stageY - panY) / zoom;
    
    const gridX = Math.floor(worldX / tileSize);
    const gridY = Math.floor(worldY / tileSize);
    
    return { gridX, gridY };
  }, [tileSize, zoom, panX, panY]);
  
  /**
   * Check if grid position is within map bounds
   */
  const isInBounds = useCallback((gridX: number, gridY: number): boolean => {
    if (!map) return false;
    return gridX >= 0 && gridX < map.width && gridY >= 0 && gridY < map.height;
  }, [map]);
  
  /**
   * Handle brush tool - place tiles
   */
  const handleBrushTool = useCallback((gridX: number, gridY: number) => {
    if (!map || !selectedTileDefinitionId || !selectedTileGridType) return;
    if (!isInBounds(gridX, gridY)) return;
    
    // Get the selected layer, or default to first layer
    const layer = selectedLayerId 
      ? map.layers.find(l => l.id === selectedLayerId)
      : map.layers[0];
    if (!layer || layer.locked) return;
    
    // Check if tile already exists at this position
    const existingTile = getTile(layer.id, gridX, gridY);
    
    // Don't place if same tile already exists
    if (existingTile && 
        existingTile.definitionId === selectedTileDefinitionId &&
        existingTile.type === selectedTileGridType) {
      return;
    }
    
    // Remove existing tile of the same type if it exists
    if (existingTile && existingTile.type === selectedTileGridType) {
      removeTile(layer.id, selectedTileGridType, existingTile.id);
    }
    
    // Create new tile
    const newTile: TileInstance = {
      id: crypto.randomUUID(),
      definitionId: selectedTileDefinitionId,
      gridX,
      gridY,
      type: selectedTileGridType,
    };
    
    addTile(layer.id, newTile);
  }, [map, selectedTileDefinitionId, selectedTileGridType, selectedLayerId, isInBounds, getTile, addTile, removeTile]);
  
  /**
   * Handle eraser tool - remove tiles
   */
  const handleEraserTool = useCallback((gridX: number, gridY: number) => {
    if (!map) return;
    if (!isInBounds(gridX, gridY)) return;
    
    // Get the selected layer, or default to first layer
    const layer = selectedLayerId 
      ? map.layers.find(l => l.id === selectedLayerId)
      : map.layers[0];
    if (!layer || layer.locked) return;
    
    // Find and remove ALL tiles at this position (terrain, overlay, wall)
    const key = `${gridX},${gridY}`;
    layer.tileGrids.forEach((tileGrid) => {
      const tile = tileGrid.tiles.get(key);
      if (tile) {
        removeTile(layer.id, tile.type, tile.id);
      }
    });
  }, [map, selectedLayerId, isInBounds, removeTile]);
  
  /**
   * Handle selection tool - select tiles
   */
  const handleSelectionTool = useCallback((gridX: number, gridY: number, isMultiSelect: boolean) => {
    if (!map) return;
    if (!isInBounds(gridX, gridY)) return;
    
    // Get the selected layer, or default to first layer
    const layer = selectedLayerId 
      ? map.layers.find(l => l.id === selectedLayerId)
      : map.layers[0];
    if (!layer) return;
    
    // Find tile at this position
    const tile = getTile(layer.id, gridX, gridY);
    
    if (tile) {
      if (isMultiSelect) {
        toggleTileSelection(tile.id);
      } else {
        selectTiles([tile.id]);
      }
    } else {
      if (!isMultiSelect) {
        clearSelection();
      }
    }
  }, [map, selectedLayerId, isInBounds, getTile, toggleTileSelection, selectTiles, clearSelection]);
  
  /**
   * Handle mouse down event
   */
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!editable) return;
    
    // Only handle left mouse button
    if (e.evt.button !== 0) return;
    
    // Don't handle if shift is pressed (that's for panning)
    if (e.evt.shiftKey) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    const { gridX, gridY } = screenToGrid(pointer.x, pointer.y);
    
    isDrawingRef.current = true;
    lastDrawnTileRef.current = { x: gridX, y: gridY };
    
    // Handle tool action
    switch (activeTool) {
      case 'brush':
        handleBrushTool(gridX, gridY);
        break;
      case 'eraser':
        handleEraserTool(gridX, gridY);
        break;
      case 'select':
        handleSelectionTool(gridX, gridY, e.evt.ctrlKey || e.evt.metaKey);
        break;
    }
  }, [editable, activeTool, screenToGrid, handleBrushTool, handleEraserTool, handleSelectionTool]);
  
  /**
   * Handle mouse move event (for drag drawing)
   */
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!editable || !isDrawingRef.current) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    const { gridX, gridY } = screenToGrid(pointer.x, pointer.y);
    
    // Only draw if we've moved to a new tile
    if (lastDrawnTileRef.current && 
        lastDrawnTileRef.current.x === gridX && 
        lastDrawnTileRef.current.y === gridY) {
      return;
    }
    
    lastDrawnTileRef.current = { x: gridX, y: gridY };
    
    // Only brush and eraser support drag drawing
    switch (activeTool) {
      case 'brush':
        handleBrushTool(gridX, gridY);
        break;
      case 'eraser':
        handleEraserTool(gridX, gridY);
        break;
    }
  }, [editable, activeTool, screenToGrid, handleBrushTool, handleEraserTool]);
  
  /**
   * Handle mouse up event
   */
  const handleMouseUp = useCallback(() => {
    isDrawingRef.current = false;
    lastDrawnTileRef.current = null;
  }, []);
  
  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
};
