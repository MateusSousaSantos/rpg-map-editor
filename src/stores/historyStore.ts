import { create } from 'zustand';
import type {
  MapAction,
} from '../types/map';
import { useMapStore } from './mapStore';
import { useUISelectionStore } from './uiSelectionStore';


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
      for (const sub of action.actions) {
        applyAction(sub);
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
      // Reverse in opposite order
      for (let i = action.actions.length - 1; i >= 0; i--) {
        reverseAction(action.actions[i]);
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
    const state = get();
    if (state.historyIndex < 0) return;

    const action = state.history[state.historyIndex];
    reverseAction(action);
    useUISelectionStore.getState().clearSelection();

    set({ historyIndex: state.historyIndex - 1 });
  },
  
  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;

    const action = state.history[state.historyIndex + 1];
    applyAction(action);
    useUISelectionStore.getState().clearSelection();

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