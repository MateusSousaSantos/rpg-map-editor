// ============================================================================
// TOOL STORE - Active tool and tool settings
// ============================================================================

import { create } from 'zustand';
import type { TileType } from '../types/map';
export type ToolType = 'brush' | 'eraser' | 'fill' | 'place-prop' | 'select' | 'pan' | 'box';

interface ToolState {
  activeTool: ToolType;
  // Brush/Fill tool
  selectedTileDefinitionId: string | null;
  selectedTileGridType: TileType | null;
  
  // Place prop tool
  selectedPropDefinitionId: string | null;
  
  // Tool settings
  brushSize: number; // for future multi-tile brush
  
  // Actions
  setActiveTool: (tool: ToolType) => void;
  setSelectedTileDefinition: (defId: string, gridType: TileType) => void;
  setSelectedPropDefinition: (defId: string) => void;
  setBrushSize: (size: number) => void;
  clearToolSelection: () => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: 'brush',
  selectedTileDefinitionId: null,
  selectedTileGridType: null,
  selectedPropDefinitionId: null,
  brushSize: 1,
  
  setActiveTool: (tool) =>
    set(() => ({
      activeTool: tool,
    })),
  
  setSelectedTileDefinition: (defId, gridType) =>
    set(() => ({
      selectedTileDefinitionId: defId,
      selectedTileGridType: gridType,
      selectedPropDefinitionId: null,
    })),
  
  setSelectedPropDefinition: (defId) =>
    set(() => ({
      selectedPropDefinitionId: defId,
      selectedTileDefinitionId: null,
      selectedTileGridType: null,
    })),
  
  setBrushSize: (size) =>
    set(() => ({
      brushSize: Math.max(1, size),
    })),
  
  clearToolSelection: () =>
    set(() => ({
      selectedTileDefinitionId: null,
      selectedTileGridType: null,
      selectedPropDefinitionId: null,
    })),
}));
