// ============================================================================
// TOOL STORE - Active tool and tool settings
// ============================================================================

import { create } from 'zustand';
import type { TileType } from '../types/map';
export type ToolType = 'brush' | 'eraser' | 'fill' | 'place-prop' | 'select' | 'pan' | 'box';

interface ToolState {
  activeTool: ToolType;
  // Box tool mode: mirrors whether brush or eraser was last active
  boxMode: 'paint' | 'erase';
  // Brush/Fill tool
  selectedTileDefinitionId: string | null;
  selectedTileGridType: TileType | null;

  // Place prop tool
  selectedPropDefinitionId: string | null;

  // Tool settings
  brushSize: number; // for future multi-tile brush

  // Random brush
  randomBrushEnabled: boolean;
  variantWeights: Record<string, Record<string, number>>;

  // Picker (Alt key)
  isPickerActive: boolean;

  // Actions
  setActiveTool: (tool: ToolType) => void;
  setBoxMode: (mode: 'paint' | 'erase') => void;
  setPickerActive: (active: boolean) => void;
  setSelectedTileDefinition: (defId: string, gridType: TileType) => void;
  setSelectedPropDefinition: (defId: string) => void;
  setBrushSize: (size: number) => void;
  setRandomBrushEnabled: (enabled: boolean) => void;
  setVariantWeight: (group: string, definitionId: string, weight: number) => void;
  clearToolSelection: () => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: 'brush',
  boxMode: 'paint',
  selectedTileDefinitionId: null,
  selectedTileGridType: null,
  selectedPropDefinitionId: null,
  brushSize: 1,
  randomBrushEnabled: false,
  variantWeights: {},
  isPickerActive: false,

  setPickerActive: (active) => set(() => ({ isPickerActive: active })),

  setActiveTool: (tool) =>
    set(() => ({
      activeTool: tool,
      ...(tool === 'brush' ? { boxMode: 'paint' } : tool === 'eraser' ? { boxMode: 'erase' } : {}),
    })),

  setBoxMode: (mode) =>
    set(() => ({ boxMode: mode })),

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

  setRandomBrushEnabled: (enabled) =>
    set(() => ({
      randomBrushEnabled: enabled,
    })),

  setVariantWeight: (group, definitionId, weight) =>
    set((state) => ({
      variantWeights: {
        ...state.variantWeights,
        [group]: {
          ...(state.variantWeights[group] ?? {}),
          [definitionId]: Math.max(0, weight),
        },
      },
    })),
}));
