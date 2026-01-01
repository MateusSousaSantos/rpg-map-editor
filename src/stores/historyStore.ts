import { create } from 'zustand';
import type {
  MapAction,
} from '../types/map';


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
  
  undo: () =>
    set((state) => ({
      historyIndex: state.historyIndex > 0 ? state.historyIndex - 1 : state.historyIndex,
    })),
  
  redo: () =>
    set((state) => ({
      historyIndex: state.historyIndex < state.history.length - 1 ? state.historyIndex + 1 : state.historyIndex,
    })),
  
  canUndo: () => {
    const state = get();
    return state.historyIndex > 0;
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