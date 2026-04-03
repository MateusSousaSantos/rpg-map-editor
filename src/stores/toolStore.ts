// ============================================================================
// TOOL STORE - Active tool and tool settings
// ============================================================================

import { create } from 'zustand';
import type { TileType, TerrainTintConfig } from '../types/map';
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

  // Terrain tint (HSL, applied at placement time)
  terrainTintConfig: TerrainTintConfig;

  // Prop palette slot hues (applied at placement time)
  propSlotHues: Record<string, number>;

  // Actions
  setActiveTool: (tool: ToolType) => void;
  setPickerActive: (active: boolean) => void;
  setSelectedTileDefinition: (defId: string, gridType: TileType) => void;
  setSelectedPropDefinition: (defId: string) => void;
  setBrushSize: (size: number) => void;
  setRandomBrushEnabled: (enabled: boolean) => void;
  setVariantWeight: (group: string, definitionId: string, weight: number) => void;
  clearToolSelection: () => void;
  setTerrainTint: (config: Partial<TerrainTintConfig>) => void;
  setPropSlotHue: (slot: string, hue: number) => void;
  resetPropSlotHues: () => void;
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
  terrainTintConfig: { hue: 0, saturation: 0, brightness: 100 },
  propSlotHues: {},

  setPickerActive: (active) => set(() => ({ isPickerActive: active })),

  setActiveTool: (tool) =>
    set(() => ({
      activeTool: tool,
      ...(tool === 'brush' ? { boxMode: 'paint' } : tool === 'eraser' ? { boxMode: 'erase' } : {}),
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

  setTerrainTint: (config) =>
    set((state) => ({
      terrainTintConfig: { ...state.terrainTintConfig, ...config },
    })),

  setPropSlotHue: (slot, hue) =>
    set((state) => ({
      propSlotHues: { ...state.propSlotHues, [slot]: hue },
    })),

  resetPropSlotHues: () => set(() => ({ propSlotHues: {} })),
}));
