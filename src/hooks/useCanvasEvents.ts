import { useCallback, useRef, useState } from 'react';
import Konva from 'konva';
import { useMapStore } from '../stores/mapStore';
import { useToolStore } from '../stores/toolStore';
import { useUISelectionStore } from '../stores/uiSelectionStore';
import { useViewportStore } from '../stores/viewportStore';
import type { TileInstance, TileType } from '../types/map';
import { createProp, getNextZIndex, findPropsAtPosition } from '../utils/props';

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
  const { activeTool, selectedTileDefinitionId, selectedTileGridType, selectedPropDefinitionId } = useToolStore();
  const { addTile, removeTile, getTileAt, map, addProp } = useMapStore();
  const { zoom, panX, panY } = useViewportStore();
  const { selectTiles, toggleTileSelection, clearSelection, selectedLayerId, selectProps, togglePropSelection } = useUISelectionStore();
  
  // Track if we're currently drawing (for drag operations)
  const isDrawingRef = useRef(false);
  const lastDrawnTileRef = useRef<{ x: number; y: number } | null>(null);
  
  // Track box paint start position
  const boxStartRef = useRef<{ x: number; y: number } | null>(null);
  const [boxPreview, setBoxPreview] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  
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
   * Convert stage coordinates to world coordinates (for props)
   */
  const screenToWorld = useCallback((stageX: number, stageY: number): { worldX: number; worldY: number } => {
    const worldX = (stageX - panX) / zoom;
    const worldY = (stageY - panY) / zoom;
    
    return { worldX, worldY };
  }, [zoom, panX, panY]);
  
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
    
    // Check if tile already exists at this position for this type
    const existingTile = getTileAt(layer.id, gridX, gridY, selectedTileGridType as TileType);
    
    // Don't place if same tile already exists
    if (existingTile && 
        existingTile.definitionId === selectedTileDefinitionId &&
        existingTile.type === selectedTileGridType) {
      return;
    }
    
    // Remove existing tile of the same type if it exists
    if (existingTile) {
      removeTile(layer.id, existingTile.id);
    }

    // Also remove any overflow tile occupying this cell (placed by a neighboring parent tile)
    const existingOverflow = getTileAt(layer.id, gridX, gridY, 'overflow');
    if (existingOverflow) {
      removeTile(layer.id, existingOverflow.id);
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
  }, [map, selectedTileDefinitionId, selectedTileGridType, selectedLayerId, isInBounds, getTileAt, addTile, removeTile]);
  
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
    
    // Find and remove ALL tiles at this position (terrain, overlay, wall, overflow)
    const tileTypes: TileType[] = ['terrain', 'overlay', 'wall', 'overflow'];
    tileTypes.forEach((type) => {
      const tile = getTileAt(layer.id, gridX, gridY, type);
      if (tile) {
        removeTile(layer.id, tile.id);
      }
    });
  }, [map, selectedLayerId, isInBounds, getTileAt, removeTile]);
  
  /**
   * Handle box paint tool - paint tiles in a rectangular area
   */
  const handleBoxPaintTool = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    if (!map || !selectedTileDefinitionId || !selectedTileGridType) return;
    
    // Get the selected layer, or default to first layer
    const layer = selectedLayerId 
      ? map.layers.find(l => l.id === selectedLayerId)
      : map.layers[0];
    if (!layer || layer.locked) return;
    
    // Calculate bounds
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    
    // Collect all tiles to add
    const tilesToAdd: TileInstance[] = [];
    const tileIdsToRemove: string[] = [];
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (!isInBounds(x, y)) continue;
        
        // Check if tile already exists at this position for this type
        const existingTile = getTileAt(layer.id, x, y, selectedTileGridType as TileType);
        
        // Skip if same tile already exists
        // if (existingTile && 
        //     existingTile.definitionId === selectedTileDefinitionId &&
        //     existingTile.type === selectedTileGridType) {
        //   continue;
        // }
        
        // Mark existing tile for removal
        if (existingTile) {
          tileIdsToRemove.push(existingTile.id);
        }

        // Also remove any overflow tile occupying this cell
        const existingOverflow = getTileAt(layer.id, x, y, 'overflow');
        if (existingOverflow) {
          tileIdsToRemove.push(existingOverflow.id);
        }
        
        // Create new tile
        const newTile: TileInstance = {
          id: crypto.randomUUID(),
          definitionId: selectedTileDefinitionId,
          gridX: x,
          gridY: y,
          type: selectedTileGridType,
        };
        
        tilesToAdd.push(newTile);
      }
    }
    
    // Batch operations for better performance
    if (tileIdsToRemove.length > 0) {
      useMapStore.getState().batchRemoveTiles(layer.id, tileIdsToRemove);
    }
    if (tilesToAdd.length > 0) {
      useMapStore.getState().batchAddTiles(layer.id, tilesToAdd);
    }
  }, [map, selectedTileDefinitionId, selectedTileGridType, selectedLayerId, isInBounds, getTileAt]);
  
  /**
   * Handle selection tool - select tiles or props
   */
  const handleSelectionTool = useCallback((gridX: number, gridY: number, worldX: number, worldY: number, isMultiSelect: boolean) => {
    if (!map) return;
    
    // Get the selected layer, or default to first layer
    const layer = selectedLayerId 
      ? map.layers.find(l => l.id === selectedLayerId)
      : map.layers[0];
    if (!layer) return;
    
    // First, check for props at this position (they should have priority)
    const propsAtPosition = findPropsAtPosition(layer.props, worldX, worldY);
    
    if (propsAtPosition.length > 0) {
      // Select the topmost prop
      const topProp = propsAtPosition[0];
      if (isMultiSelect) {
        togglePropSelection(topProp.id);
      } else {
        selectProps([topProp.id]);
      }
      return;
    }
    
    // If no props found, check for tiles
    if (isInBounds(gridX, gridY)) {
      // Find tile at this position - check all types, prioritize overlay > wall > terrain
      const tileTypes: TileType[] = ['overlay', 'wall', 'terrain'];
      let tile: TileInstance | undefined;
      for (const type of tileTypes) {
        tile = getTileAt(layer.id, gridX, gridY, type);
        if (tile) break;
      }
      
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
    } else {
      if (!isMultiSelect) {
        clearSelection();
      }
    }
  }, [map, selectedLayerId, isInBounds, getTileAt, toggleTileSelection, selectTiles, clearSelection, togglePropSelection, selectProps]);
  
  /**
   * Handle place-prop tool - place a prop at clicked position
   */
  const handlePlacePropTool = useCallback((worldX: number, worldY: number) => {
    if (!map || !selectedPropDefinitionId) return;
    
    // Get the selected layer, or default to first layer
    const layer = selectedLayerId 
      ? map.layers.find(l => l.id === selectedLayerId)
      : map.layers[0];
    if (!layer || layer.locked) return;
    
    // Get prop definition
    const propDefinition = map.propDefinitions.find(def => def.id === selectedPropDefinitionId);
    if (!propDefinition) return;
    
    // Get next z-index
    const nextZIndex = getNextZIndex(layer.props);
    
    // Create prop instance
    const newProp = createProp(propDefinition, worldX, worldY, nextZIndex);
    
    // Add to map
    addProp(layer.id, newProp);
    
    // Select the newly placed prop
    selectProps([newProp.id]);
  }, [map, selectedPropDefinitionId, selectedLayerId, addProp, selectProps]);
  
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
    const { worldX, worldY } = screenToWorld(pointer.x, pointer.y);
    
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
        handleSelectionTool(gridX, gridY, worldX, worldY, e.evt.ctrlKey || e.evt.metaKey);
        break;
      case 'box':
        boxStartRef.current = { x: gridX, y: gridY };
        break;
      case 'place-prop':
        handlePlacePropTool(worldX, worldY);
        break;
    }
  }, [editable, activeTool, screenToGrid, screenToWorld, handleBrushTool, handleEraserTool, handleSelectionTool, handlePlacePropTool]);
  
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
    
    // Handle box tool preview
    if (activeTool === 'box' && boxStartRef.current) {
      setBoxPreview({
        startX: boxStartRef.current.x,
        startY: boxStartRef.current.y,
        endX: gridX,
        endY: gridY,
      });
      return;
    }
    
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
  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Handle box paint completion
    if (activeTool === 'box' && boxStartRef.current && isDrawingRef.current) {
      const stage = e.target.getStage();
      if (stage) {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          const { gridX, gridY } = screenToGrid(pointer.x, pointer.y);
          handleBoxPaintTool(boxStartRef.current.x, boxStartRef.current.y, gridX, gridY);
        }
      }
    }
    
    isDrawingRef.current = false;
    lastDrawnTileRef.current = null;
    boxStartRef.current = null;
    setBoxPreview(null);
  }, [activeTool, screenToGrid, handleBoxPaintTool]);
  
  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    boxPreview,
  };
};
