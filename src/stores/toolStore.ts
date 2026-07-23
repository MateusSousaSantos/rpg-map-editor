// ============================================================================
// TOOL STORE - Active tool and tool settings
// ============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

  // Tile color / tint — active paint tint (null = natural / no tint)
  selectedTileColor: string | null;
  // User-built palette of saved shades (persisted across sessions)
  customSwatches: string[];

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
  setSelectedTileColor: (color: string | null) => void;
  addSwatch: (color: string) => void;
  removeSwatch: (color: string) => void;
  setRandomBrushEnabled: (enabled: boolean) => void;
  setVariantWeight: (group: string, definitionId: string, weight: number) => void;
  clearToolSelection: () => void;
}

export const useToolStore = create<ToolState>()(
  persist(
    (set) => ({
  activeTool: 'brush',
  boxMode: 'paint',
  selectedTileDefinitionId: null,
  selectedTileGridType: null,
  selectedPropDefinitionId: null,
  brushSize: 1,
  selectedTileColor: null,
  customSwatches: [],
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

  setSelectedTileColor: (color) =>
    set(() => ({
      selectedTileColor: color,
    })),

  addSwatch: (color) =>
    set((state) =>
      state.customSwatches.includes(color)
        ? {}
        : { customSwatches: [...state.customSwatches, color] },
    ),

  removeSwatch: (color) =>
    set((state) => ({
      customSwatches: state.customSwatches.filter((c) => c !== color),
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
    }),
    {
      name: 'rpg-tool-palette',
      storage: createJSONStorage(() => localStorage),
      // Only persist the user-built palette; keep transient tool state ephemeral
      partialize: (state) => ({ customSwatches: state.customSwatches }),
    },
  ),
);
