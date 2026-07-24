import { useCallback, useRef, useState } from 'react';
import Konva from 'konva';
import { useMapStore } from '../stores/mapStore';
import { useToolStore } from '../stores/toolStore';
import { useUISelectionStore } from '../stores/uiSelectionStore';
import { useViewportStore } from '../stores/viewportStore';
import { useHistoryStore } from '../stores/historyStore';
import type { TileInstance, TileType, MapAction } from '../types/map';
import { createProp, getNextZIndex, findPropsAtPosition } from '../utils/props';
import { pickRandomVariant } from '../utils/tilesdefinition';
import { runTileCommit } from '../utils/busyTask';

interface CanvasEventsParams {
  tileSize: number;
  editable: boolean;
}

/**
 * Feature flag for the fill tool's matching strategy.
 *
 * When `true`, the flood fill matches by tile *group* — e.g. filling over one
 * "stone" variant replaces every connected stone variant, which is what users
 * usually expect (especially for regions painted with the random brush).
 *
 * Set to `false` to revert to exact-definition matching (only tiles sharing the
 * clicked tile's exact definition are replaced). Tiles without a group always
 * fall back to exact-definition matching regardless of this flag.
 */
const FILL_MATCH_BY_GROUP = true;

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
  const { activeTool, boxMode, selectedTileDefinitionId, selectedTileGridType, selectedPropDefinitionId } = useToolStore();
  const { addTile, removeTile, getTileAt, map, addProp } = useMapStore();
  const { zoom, panX, panY } = useViewportStore();
  const { selectTiles, toggleTileSelection, clearSelection, selectedLayerId, selectProps, togglePropSelection } = useUISelectionStore();

  // Track if we're currently drawing (for drag operations)
  const isDrawingRef = useRef(false);
  const lastDrawnTileRef = useRef<{ x: number; y: number } | null>(null);

  // Track box paint start position
  const boxStartRef = useRef<{ x: number; y: number } | null>(null);
  const [boxPreview, setBoxPreview] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  // Accumulate history actions during a brush/eraser drag stroke
  const strokeActionsRef = useRef<MapAction[]>([]);

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

    // Resolve variant (may be a random pick from the selected tile's group)
    const { randomBrushEnabled, variantWeights, selectedTileColor } = useToolStore.getState();
    let resolvedDefId = selectedTileDefinitionId;
    let resolvedType = selectedTileGridType as TileType;

    if (randomBrushEnabled) {
      const selectedDef = map.tileDefinitions.find((d) => d.id === selectedTileDefinitionId);
      if (selectedDef?.group) {
        const groupDefs = map.tileDefinitions.filter((d) => d.group === selectedDef.group && d.type === selectedDef.type);
        if (groupDefs.length > 1) {
          const weights = variantWeights[selectedDef.group] ?? {};
          resolvedDefId = pickRandomVariant(groupDefs, weights);
          const resolvedDef = groupDefs.find((d) => d.id === resolvedDefId);
          if (resolvedDef) resolvedType = resolvedDef.type;
        }
      }
    }

    // Check if tile already exists at this position for this type
    const existingTile = getTileAt(layer.id, gridX, gridY, resolvedType);

    // Don't place if the exact same tile (incl. tint) already exists —
    // a different selected color falls through so painting recolors the tile
    if (existingTile &&
        existingTile.definitionId === resolvedDefId &&
        existingTile.type === resolvedType &&
        (existingTile.tint ?? null) === selectedTileColor) {
      return;
    }

    // Remove existing tile of the same type if it exists (capture for history)
    if (existingTile) {
      strokeActionsRef.current.push({ type: 'REMOVE_TILE', layerId: layer.id, tileId: existingTile.id, removedTile: { ...existingTile } });
      removeTile(layer.id, existingTile.id);
    }

    // Also remove any overflow tile occupying this cell (placed by a neighboring parent tile)
    const existingOverflow = getTileAt(layer.id, gridX, gridY, 'overflow');
    if (existingOverflow) {
      strokeActionsRef.current.push({ type: 'REMOVE_TILE', layerId: layer.id, tileId: existingOverflow.id, removedTile: { ...existingOverflow } });
      removeTile(layer.id, existingOverflow.id);
    }

    // Create new tile
    const newTile: TileInstance = {
      id: crypto.randomUUID(),
      definitionId: resolvedDefId,
      gridX,
      gridY,
      type: resolvedType,
      ...(selectedTileColor ? { tint: selectedTileColor } : {}),
    };

    addTile(layer.id, newTile);
    strokeActionsRef.current.push({ type: 'ADD_TILE', layerId: layer.id, tile: { ...newTile } });
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
        strokeActionsRef.current.push({ type: 'REMOVE_TILE', layerId: layer.id, tileId: tile.id, removedTile: { ...tile } });
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
    const historyActions: MapAction[] = [];

    // Pre-compute group data for random variant selection (shared across all cells)
    const { randomBrushEnabled, variantWeights, selectedTileColor } = useToolStore.getState();
    let randomGroupDefs: typeof map.tileDefinitions | null = null;
    let randomGroupWeights: Record<string, number> = {};
    if (randomBrushEnabled) {
      const selectedDef = map.tileDefinitions.find((d) => d.id === selectedTileDefinitionId);
      if (selectedDef?.group) {
        const candidates = map.tileDefinitions.filter((d) => d.group === selectedDef.group && d.type === selectedDef.type);
        if (candidates.length > 1) {
          randomGroupDefs = candidates;
          randomGroupWeights = variantWeights[selectedDef.group] ?? {};
        }
      }
    }

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (!isInBounds(x, y)) continue;

        // Resolve variant independently per cell (each cell gets its own random roll)
        let resolvedDefId = selectedTileDefinitionId;
        let resolvedType = selectedTileGridType as TileType;
        if (randomGroupDefs) {
          resolvedDefId = pickRandomVariant(randomGroupDefs, randomGroupWeights);
          const resolvedDef = randomGroupDefs.find((d) => d.id === resolvedDefId);
          if (resolvedDef) resolvedType = resolvedDef.type;
        }

        // Check if tile already exists at this position for this type
        const existingTile = getTileAt(layer.id, x, y, resolvedType);

        // Mark existing tile for removal (capture for history)
        if (existingTile) {
          tileIdsToRemove.push(existingTile.id);
          historyActions.push({ type: 'REMOVE_TILE', layerId: layer.id, tileId: existingTile.id, removedTile: { ...existingTile } });
        }

        // Also remove any overflow tile occupying this cell
        const existingOverflow = getTileAt(layer.id, x, y, 'overflow');
        if (existingOverflow) {
          tileIdsToRemove.push(existingOverflow.id);
          historyActions.push({ type: 'REMOVE_TILE', layerId: layer.id, tileId: existingOverflow.id, removedTile: { ...existingOverflow } });
        }

        // Create new tile
        const newTile: TileInstance = {
          id: crypto.randomUUID(),
          definitionId: resolvedDefId,
          gridX: x,
          gridY: y,
          type: resolvedType,
          ...(selectedTileColor ? { tint: selectedTileColor } : {}),
        };

        tilesToAdd.push(newTile);
        historyActions.push({ type: 'ADD_TILE', layerId: layer.id, tile: { ...newTile } });
      }
    }

    // Apply the box paint and record it as a single history action. A large box
    // commits its whole region at once, so route big ones through the busy
    // overlay; small ones run inline to avoid a spinner flash.
    runTileCommit('generic', tilesToAdd.length + tileIdsToRemove.length, () => {
      if (tileIdsToRemove.length > 0) {
        useMapStore.getState().batchRemoveTiles(layer.id, tileIdsToRemove);
      }
      if (tilesToAdd.length > 0) {
        useMapStore.getState().batchAddTiles(layer.id, tilesToAdd);
      }
      if (historyActions.length > 0) {
        useHistoryStore.getState().addAction({ type: 'BATCH', actions: historyActions });
      }
    });
  }, [map, selectedTileDefinitionId, selectedTileGridType, selectedLayerId, isInBounds, getTileAt]);

  /**
   * Handle box erase tool - remove all tiles in a rectangular area
   */
  const handleBoxEraseTool = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    if (!map) return;

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

    const tileIdsToRemove: string[] = [];
    const historyActions: MapAction[] = [];
    const tileTypes: TileType[] = ['terrain', 'overlay', 'wall', 'overflow'];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (!isInBounds(x, y)) continue;
        tileTypes.forEach((type) => {
          const tile = getTileAt(layer.id, x, y, type);
          if (tile) {
            tileIdsToRemove.push(tile.id);
            historyActions.push({ type: 'REMOVE_TILE', layerId: layer.id, tileId: tile.id, removedTile: { ...tile } });
          }
        });
      }
    }

    // A large box erase clears its whole region at once, so route big ones
    // through the busy overlay; small ones run inline to avoid a spinner flash.
    runTileCommit('generic', tileIdsToRemove.length, () => {
      if (tileIdsToRemove.length > 0) {
        useMapStore.getState().batchRemoveTiles(layer.id, tileIdsToRemove);
      }
      if (historyActions.length > 0) {
        useHistoryStore.getState().addAction({ type: 'BATCH', actions: historyActions });
      }
    });
  }, [map, selectedLayerId, isInBounds, getTileAt]);

  /**
   * Handle fill tool - flood-fill the contiguous region of same-identity tiles
   * (matching definition + tint, or an all-empty region) that touches the
   * clicked cell, replacing each with the selected tile. 4-directional spread.
   */
  const handleFillTool = useCallback((gridX: number, gridY: number) => {
    if (!map || !selectedTileDefinitionId || !selectedTileGridType) return;
    if (!isInBounds(gridX, gridY)) return;

    // Get the selected layer, or default to first layer
    const layer = selectedLayerId
      ? map.layers.find(l => l.id === selectedLayerId)
      : map.layers[0];
    if (!layer || layer.locked) return;

    const targetType = selectedTileGridType as TileType;

    // Identity of the tile being filled from (null definition = empty region)
    const seedTile = getTileAt(layer.id, gridX, gridY, targetType);
    const targetDefId = seedTile?.definitionId ?? null;
    const targetTint = seedTile?.tint ?? null;

    // When group matching is enabled, the fill region is defined by the seed
    // tile's group (all "stone" variants, say) rather than one exact definition.
    // Tiles with no group fall back to exact-definition matching.
    const groupOfDef = (defId: string | null): string | null =>
      defId ? map.tileDefinitions.find((d) => d.id === defId)?.group ?? null : null;
    const seedGroup = groupOfDef(targetDefId);
    const matchByGroup = FILL_MATCH_BY_GROUP && seedGroup !== null;

    const { randomBrushEnabled, variantWeights, selectedTileColor } = useToolStore.getState();

    // Clicking a cell that already holds the exact selected tile is a no-op
    if (!randomBrushEnabled &&
        targetDefId === selectedTileDefinitionId &&
        (targetTint ?? null) === (selectedTileColor ?? null)) {
      return;
    }

    // Pre-compute group data for random variant selection (shared across all cells)
    let randomGroupDefs: typeof map.tileDefinitions | null = null;
    let randomGroupWeights: Record<string, number> = {};
    if (randomBrushEnabled) {
      const selectedDef = map.tileDefinitions.find((d) => d.id === selectedTileDefinitionId);
      if (selectedDef?.group) {
        const candidates = map.tileDefinitions.filter((d) => d.group === selectedDef.group && d.type === selectedDef.type);
        if (candidates.length > 1) {
          randomGroupDefs = candidates;
          randomGroupWeights = variantWeights[selectedDef.group] ?? {};
        }
      }
    }

    // A cell belongs to the fill region if its target-type tile shares the seed's
    // identity — same tint, and either the same group (group matching) or the
    // same exact definition (exact matching).
    const matches = (x: number, y: number): boolean => {
      const tile = getTileAt(layer.id, x, y, targetType);
      if ((tile?.tint ?? null) !== targetTint) return false;
      const defId = tile?.definitionId ?? null;
      return matchByGroup ? groupOfDef(defId) === seedGroup : defId === targetDefId;
    };

    // BFS over the contiguous matching region. The store is not mutated during
    // traversal (changes are collected and applied once at the end), so getTileAt
    // keeps returning the original state and `visited` prevents re-processing.
    const visited = new Set<string>();
    const queue: Array<[number, number]> = [[gridX, gridY]];
    const tilesToAdd: TileInstance[] = [];
    const tileIdsToRemove: string[] = [];
    const historyActions: MapAction[] = [];

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      if (!isInBounds(x, y)) continue;
      if (!matches(x, y)) continue;
      visited.add(key);

      // Resolve variant independently per cell (each cell gets its own random roll)
      let resolvedDefId = selectedTileDefinitionId;
      let resolvedType = targetType;
      if (randomGroupDefs) {
        resolvedDefId = pickRandomVariant(randomGroupDefs, randomGroupWeights);
        const resolvedDef = randomGroupDefs.find((d) => d.id === resolvedDefId);
        if (resolvedDef) resolvedType = resolvedDef.type;
      }

      // Remove the existing tile of the same type (capture for history)
      const existingTile = getTileAt(layer.id, x, y, resolvedType);
      if (existingTile) {
        tileIdsToRemove.push(existingTile.id);
        historyActions.push({ type: 'REMOVE_TILE', layerId: layer.id, tileId: existingTile.id, removedTile: { ...existingTile } });
      }

      // Also remove any overflow tile occupying this cell
      const existingOverflow = getTileAt(layer.id, x, y, 'overflow');
      if (existingOverflow) {
        tileIdsToRemove.push(existingOverflow.id);
        historyActions.push({ type: 'REMOVE_TILE', layerId: layer.id, tileId: existingOverflow.id, removedTile: { ...existingOverflow } });
      }

      // Create the new tile
      const newTile: TileInstance = {
        id: crypto.randomUUID(),
        definitionId: resolvedDefId,
        gridX: x,
        gridY: y,
        type: resolvedType,
        ...(selectedTileColor ? { tint: selectedTileColor } : {}),
      };
      tilesToAdd.push(newTile);
      historyActions.push({ type: 'ADD_TILE', layerId: layer.id, tile: { ...newTile } });

      // Enqueue orthogonal neighbors
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    // Apply the fill and record it as a single history action. A large fill
    // blocks the main thread long enough to look frozen, so route those through
    // the busy overlay; small fills run inline to avoid a spinner flash.
    runTileCommit('fill', tilesToAdd.length + tileIdsToRemove.length, () => {
      if (tileIdsToRemove.length > 0) {
        useMapStore.getState().batchRemoveTiles(layer.id, tileIdsToRemove);
      }
      if (tilesToAdd.length > 0) {
        useMapStore.getState().batchAddTiles(layer.id, tilesToAdd);
      }
      if (historyActions.length > 0) {
        useHistoryStore.getState().addAction({ type: 'BATCH', actions: historyActions });
      }
    });
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

    // Record history
    useHistoryStore.getState().addAction({ type: 'ADD_PROP', layerId: layer.id, prop: { ...newProp } });

    // Select the newly placed prop
    selectProps([newProp.id]);
  }, [map, selectedPropDefinitionId, selectedLayerId, addProp, selectProps]);

  /**
   * Handle tile picker - pick the tile under cursor (Alt+click)
   */
  const handlePickerTool = useCallback((gridX: number, gridY: number) => {
    if (!map) return;
    if (!isInBounds(gridX, gridY)) return;

    const layer = selectedLayerId
      ? map.layers.find(l => l.id === selectedLayerId)
      : map.layers[0];
    if (!layer) return;

    // Priority: overlay > wall > terrain (skip overflow)
    const tileTypes: TileType[] = ['overlay', 'wall', 'terrain'];
    for (const type of tileTypes) {
      const tile = getTileAt(layer.id, gridX, gridY, type);
      if (tile) {
        useToolStore.getState().setSelectedTileDefinition(tile.definitionId, tile.type);
        useToolStore.getState().setActiveTool('brush');
        return;
      }
    }
  }, [map, selectedLayerId, isInBounds, getTileAt]);

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

    // Alt+click: tile picker (eyedropper)
    if (e.evt.altKey) {
      handlePickerTool(gridX, gridY);
      return;
    }

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
      case 'fill':
        handleFillTool(gridX, gridY);
        break;
      case 'place-prop':
        handlePlacePropTool(worldX, worldY);
        break;
    }
  }, [editable, activeTool, screenToGrid, screenToWorld, handleBrushTool, handleEraserTool, handleSelectionTool, handleFillTool, handlePlacePropTool, handlePickerTool]);

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
    // Handle box tool completion (paint or erase)
    if (activeTool === 'box' && boxStartRef.current && isDrawingRef.current) {
      const stage = e.target.getStage();
      if (stage) {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          const { gridX, gridY } = screenToGrid(pointer.x, pointer.y);
          if (boxMode === 'erase') {
            handleBoxEraseTool(boxStartRef.current.x, boxStartRef.current.y, gridX, gridY);
          } else {
            handleBoxPaintTool(boxStartRef.current.x, boxStartRef.current.y, gridX, gridY);
          }
        }
      }
    }

    // Flush accumulated stroke actions as a single history entry
    if (strokeActionsRef.current.length > 0) {
      const actions = strokeActionsRef.current;
      strokeActionsRef.current = [];
      if (actions.length === 1) {
        useHistoryStore.getState().addAction(actions[0]);
      } else {
        useHistoryStore.getState().addAction({ type: 'BATCH', actions });
      }
    }

    isDrawingRef.current = false;
    lastDrawnTileRef.current = null;
    boxStartRef.current = null;
    setBoxPreview(null);
  }, [activeTool, boxMode, screenToGrid, handleBoxPaintTool, handleBoxEraseTool]);

  /**
   * Handle touch start — single finger only; mirrors handleMouseDown
   */
  const handleTouchStart = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (!editable || e.evt.touches.length !== 1) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const { gridX, gridY } = screenToGrid(pointer.x, pointer.y);
    const { worldX, worldY } = screenToWorld(pointer.x, pointer.y);

    isDrawingRef.current = true;
    lastDrawnTileRef.current = { x: gridX, y: gridY };

    switch (activeTool) {
      case 'brush':
        handleBrushTool(gridX, gridY);
        break;
      case 'eraser':
        handleEraserTool(gridX, gridY);
        break;
      case 'select':
        handleSelectionTool(gridX, gridY, worldX, worldY, false);
        break;
      case 'box':
        boxStartRef.current = { x: gridX, y: gridY };
        break;
      case 'fill':
        handleFillTool(gridX, gridY);
        break;
      case 'place-prop':
        handlePlacePropTool(worldX, worldY);
        break;
    }
  }, [editable, activeTool, screenToGrid, screenToWorld, handleBrushTool, handleEraserTool, handleSelectionTool, handleFillTool, handlePlacePropTool]);

  /**
   * Handle touch move — single finger only; mirrors handleMouseMove
   */
  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (!editable || !isDrawingRef.current || e.evt.touches.length !== 1) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const { gridX, gridY } = screenToGrid(pointer.x, pointer.y);

    if (activeTool === 'box' && boxStartRef.current) {
      setBoxPreview({
        startX: boxStartRef.current.x,
        startY: boxStartRef.current.y,
        endX: gridX,
        endY: gridY,
      });
      return;
    }

    if (lastDrawnTileRef.current &&
        lastDrawnTileRef.current.x === gridX &&
        lastDrawnTileRef.current.y === gridY) {
      return;
    }

    lastDrawnTileRef.current = { x: gridX, y: gridY };

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
   * Handle touch end — mirrors handleMouseUp
   */
  const handleTouchEnd = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (activeTool === 'box' && boxStartRef.current && isDrawingRef.current) {
      const stage = e.target.getStage();
      if (stage) {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          const { gridX, gridY } = screenToGrid(pointer.x, pointer.y);
          if (boxMode === 'erase') {
            handleBoxEraseTool(boxStartRef.current.x, boxStartRef.current.y, gridX, gridY);
          } else {
            handleBoxPaintTool(boxStartRef.current.x, boxStartRef.current.y, gridX, gridY);
          }
        }
      }
    }

    // Flush accumulated stroke actions as a single history entry
    if (strokeActionsRef.current.length > 0) {
      const actions = strokeActionsRef.current;
      strokeActionsRef.current = [];
      if (actions.length === 1) {
        useHistoryStore.getState().addAction(actions[0]);
      } else {
        useHistoryStore.getState().addAction({ type: 'BATCH', actions });
      }
    }

    isDrawingRef.current = false;
    lastDrawnTileRef.current = null;
    boxStartRef.current = null;
    setBoxPreview(null);
  }, [activeTool, boxMode, screenToGrid, handleBoxPaintTool, handleBoxEraseTool]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    boxPreview,
  };
};
