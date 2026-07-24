import { create } from 'zustand';
import type {
  MapAction,
  TileInstance,
} from '../types/map';
import { useMapStore } from './mapStore';
import { useUISelectionStore } from './uiSelectionStore';
import { useBusyStore } from './busyStore';
import { runHeavyTask, BUSY_TILE_THRESHOLD } from '../utils/busyTask';

/**
 * True when every sub-action is a plain tile add/remove, so the batch can be
 * replayed with the O(1)-update batch store methods instead of one store
 * update per tile. Mixed batches (props/layers/updates) fall back to the
 * per-action loop.
 */
function isTileOnlyBatch(actions: MapAction[]): boolean {
  return actions.every((a) => a.type === 'ADD_TILE' || a.type === 'REMOVE_TILE');
}

/** Append `value` to the array stored under `key`, creating it if absent. */
function pushGrouped<T>(map: Map<string, T[]>, key: string, value: T): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

/**
 * Whether replaying this action is heavy enough to warrant the busy overlay —
 * a large tile batch (big fill or long brush/eraser stroke).
 */
function isHeavyAction(action: MapAction): boolean {
  return action.type === 'BATCH' && action.actions.length >= BUSY_TILE_THRESHOLD;
}

/**
 * Dispatch grouped tile removals then additions per layer via the batch store
 * methods. Removes always run before adds to preserve the per-cell
 * remove-then-add ordering the actions were recorded in.
 */
function applyTileGroups(
  removesByLayer: Map<string, string[]>,
  addsByLayer: Map<string, TileInstance[]>,
): void {
  const ms = useMapStore.getState();
  for (const [layerId, tileIds] of removesByLayer) {
    if (tileIds.length > 0) ms.batchRemoveTiles(layerId, tileIds);
  }
  for (const [layerId, tiles] of addsByLayer) {
    if (tiles.length > 0) ms.batchAddTiles(layerId, tiles);
  }
}


// ============================================================================
// HISTORY HELPERS - Apply / Reverse actions via mapStore
// ============================================================================

/**
 * Apply a single MapAction forward (for redo or initial execution recording).
 */
function applyAction(action: MapAction): void {
  const ms = useMapStore.getState();

  switch (action.type) {
    case 'ADD_TILE':
      ms.addTile(action.layerId, action.tile);
      break;
    case 'REMOVE_TILE':
      ms.removeTile(action.layerId, action.removedTile.id);
      break;
    case 'UPDATE_TILE':
      ms.updateTile(action.layerId, action.tileId, action.changes);
      break;
    case 'ADD_PROP':
      ms.addProp(action.layerId, action.prop);
      break;
    case 'REMOVE_PROP':
      ms.removeProp(action.layerId, action.removedProp.id);
      break;
    case 'UPDATE_PROP':
      ms.updateProp(action.layerId, action.propId, action.changes);
      break;
    case 'ADD_LAYER':
      ms.addLayer(action.layer);
      break;
    case 'REMOVE_LAYER':
      ms.removeLayer(action.layerId);
      break;
    case 'UPDATE_LAYER':
      ms.updateLayer(action.layerId, action.changes);
      break;
    case 'REORDER_LAYERS':
      ms.reorderLayers(action.newOrder);
      break;
    case 'BATCH':
      // Fast path: collapse a tile-only batch into grouped batch store calls
      // (removes then adds), turning N store updates into ~2 per layer.
      if (isTileOnlyBatch(action.actions)) {
        const removesByLayer = new Map<string, string[]>();
        const addsByLayer = new Map<string, TileInstance[]>();
        for (const sub of action.actions) {
          if (sub.type === 'REMOVE_TILE') {
            pushGrouped(removesByLayer, sub.layerId, sub.removedTile.id);
          } else if (sub.type === 'ADD_TILE') {
            pushGrouped(addsByLayer, sub.layerId, sub.tile);
          }
        }
        applyTileGroups(removesByLayer, addsByLayer);
      } else {
        for (const sub of action.actions) {
          applyAction(sub);
        }
      }
      break;
  }
}

/**
 * Reverse a single MapAction (for undo).
 */
function reverseAction(action: MapAction): void {
  const ms = useMapStore.getState();

  switch (action.type) {
    case 'ADD_TILE':
      // Undo an add → remove
      ms.removeTile(action.layerId, action.tile.id);
      break;
    case 'REMOVE_TILE':
      // Undo a remove → re-add the stored tile
      ms.addTile(action.layerId, action.removedTile);
      break;
    case 'UPDATE_TILE':
      ms.updateTile(action.layerId, action.tileId, action.previousChanges);
      break;
    case 'ADD_PROP':
      ms.removeProp(action.layerId, action.prop.id);
      break;
    case 'REMOVE_PROP':
      ms.addProp(action.layerId, action.removedProp);
      break;
    case 'UPDATE_PROP':
      ms.updateProp(action.layerId, action.propId, action.previousChanges);
      break;
    case 'ADD_LAYER':
      ms.removeLayer(action.layer.id);
      break;
    case 'REMOVE_LAYER':
      ms.addLayer(action.removedLayer);
      break;
    case 'UPDATE_LAYER':
      ms.updateLayer(action.layerId, action.previousChanges);
      break;
    case 'REORDER_LAYERS':
      ms.reorderLayers(action.previousOrder);
      break;
    case 'BATCH':
      // Fast path: reversing a tile-only batch means removing every added tile
      // and re-adding every removed tile. Grouped removes-then-adds keeps the
      // same net effect as reversing the per-action loop while using ~2 store
      // updates per layer instead of one per tile.
      if (isTileOnlyBatch(action.actions)) {
        const removesByLayer = new Map<string, string[]>();
        const addsByLayer = new Map<string, TileInstance[]>();
        for (const sub of action.actions) {
          if (sub.type === 'ADD_TILE') {
            pushGrouped(removesByLayer, sub.layerId, sub.tile.id);
          } else if (sub.type === 'REMOVE_TILE') {
            pushGrouped(addsByLayer, sub.layerId, sub.removedTile);
          }
        }
        applyTileGroups(removesByLayer, addsByLayer);
      } else {
        // Reverse in opposite order
        for (let i = action.actions.length - 1; i >= 0; i--) {
          reverseAction(action.actions[i]);
        }
      }
      break;
  }
}

// ============================================================================
// HISTORY STORE - Undo/Redo system
// ============================================================================

interface HistoryState {
  history: MapAction[];
  historyIndex: number;
  maxHistorySize: number;

  // Actions
  addAction: (action: MapAction) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,

  addAction: (action) =>
    set((state) => {
      // Remove any actions after current index (branching timeline)
      let newHistory = state.history.slice(0, state.historyIndex + 1);

      // Add new action
      newHistory.push(action);
      let newIndex = newHistory.length - 1;

      // Limit history size
      if (newHistory.length > state.maxHistorySize) {
        newHistory.shift();
        newIndex--;
      }

      return {
        history: newHistory,
        historyIndex: newIndex,
      };
    }),

  undo: () => {
    // A heavy undo/redo is applied a frame later; ignore new requests until it
    // finishes so historyIndex can't advance past unapplied work.
    if (useBusyStore.getState().busy) return;

    const state = get();
    if (state.historyIndex < 0) return;

    const action = state.history[state.historyIndex];
    const work = () => {
      reverseAction(action);
      useUISelectionStore.getState().clearSelection();
    };
    if (isHeavyAction(action)) runHeavyTask('undo', work);
    else work();

    set({ historyIndex: state.historyIndex - 1 });
  },

  redo: () => {
    if (useBusyStore.getState().busy) return;

    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;

    const action = state.history[state.historyIndex + 1];
    const work = () => {
      applyAction(action);
      useUISelectionStore.getState().clearSelection();
    };
    if (isHeavyAction(action)) runHeavyTask('redo', work);
    else work();

    set({ historyIndex: state.historyIndex + 1 });
  },

  canUndo: () => {
    const state = get();
    return state.historyIndex >= 0;
  },

  canRedo: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },

  clearHistory: () =>
    set(() => ({
      history: [],
      historyIndex: -1,
    })),
}));

// ============================================================================
// EXPORT FORMATS
// ============================================================================

/**
 * Data structure for PNG export
 */
export interface ExportPNGOptions {
  scale?: number;             // multiplier for output size (default 1)
  transparent?: boolean;      // transparent background or solid color
  backgroundColor?: string;   // hex color if not transparent
  includeGrid?: boolean;
}