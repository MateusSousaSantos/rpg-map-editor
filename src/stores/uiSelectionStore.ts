import { create } from 'zustand';

type SelectionMode = 'tiles' | 'props' | 'lights' | null;

interface UISelectionState {
  selectionMode: SelectionMode;
  selectedTileIds: Set<string>;
  selectedPropIds: Set<string>;
  selectedLightIds: Set<string>;
  selectedLayerId: string | null;
  showGrid: boolean;
  sidebarOpen: boolean;

  // Actions
  selectTiles: (tileIds: string[]) => void;
  deselectTile: (tileId: string) => void;
  clearTileSelection: () => void;
  toggleTileSelection: (tileId: string) => void;

  selectProps: (propIds: string[]) => void;
  deselectProp: (propId: string) => void;
  clearPropSelection: () => void;
  togglePropSelection: (propId: string) => void;

  selectLights: (lightIds: string[]) => void;
  deselectLight: (lightId: string) => void;
  clearLightSelection: () => void;
  toggleLightSelection: (lightId: string) => void;

  selectLayer: (layerId: string | null) => void;
  clearSelection: () => void;
  toggleGrid: () => void;
  setShowGrid: (show: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUISelectionStore = create<UISelectionState>((set) => ({
  selectionMode: null,
  selectedTileIds: new Set(),
  selectedPropIds: new Set(),
  selectedLightIds: new Set(),
  selectedLayerId: null,
  showGrid: true,
  sidebarOpen: true,

  selectTiles: (tileIds) =>
    set(() => ({
      selectionMode: 'tiles',
      selectedTileIds: new Set(tileIds),
      selectedPropIds: new Set(),
      selectedLightIds: new Set(),
    })),
  
  deselectTile: (tileId) =>
    set((state) => {
      const newTileIds = new Set(state.selectedTileIds);
      newTileIds.delete(tileId);
      return {
        selectedTileIds: newTileIds,
        selectionMode: newTileIds.size === 0 ? null : state.selectionMode,
      };
    }),
  
  clearTileSelection: () =>
    set((state) => ({
      selectedTileIds: new Set(),
      selectionMode: state.selectionMode === 'tiles' ? null : state.selectionMode,
    })),
  
  toggleTileSelection: (tileId) =>
    set((state) => {
      const newTileIds = new Set(state.selectedTileIds);
      let newSelectionMode: SelectionMode = 'tiles';
      
      if (newTileIds.has(tileId)) {
        newTileIds.delete(tileId);
        if (newTileIds.size === 0) {
          newSelectionMode = null;
        }
      } else {
        newTileIds.add(tileId);
      }
      
      return {
        selectionMode: newSelectionMode,
        selectedTileIds: newTileIds,
        selectedPropIds: state.selectionMode === 'props' ? new Set() : state.selectedPropIds,
      };
    }),
  
  selectProps: (propIds) =>
    set((state) => {
      // An empty selection means "deselect props" — it must not force the panel
      // into props mode, otherwise the tile library disappears with nothing to show.
      if (propIds.length === 0) {
        return {
          selectedPropIds: new Set(),
          selectionMode: state.selectionMode === 'props' ? null : state.selectionMode,
        };
      }
      return {
        selectionMode: 'props',
        selectedPropIds: new Set(propIds),
        selectedTileIds: new Set(),
        selectedLightIds: new Set(),
      };
    }),

  deselectProp: (propId) =>
    set((state) => {
      const newPropIds = new Set(state.selectedPropIds);
      newPropIds.delete(propId);
      return {
        selectedPropIds: newPropIds,
        selectionMode: newPropIds.size === 0 ? null : state.selectionMode,
      };
    }),
  
  clearPropSelection: () =>
    set((state) => ({
      selectedPropIds: new Set(),
      selectionMode: state.selectionMode === 'props' ? null : state.selectionMode,
    })),
  
  togglePropSelection: (propId) =>
    set((state) => {
      const newPropIds = new Set(state.selectedPropIds);
      let newSelectionMode: SelectionMode = 'props';
      
      if (newPropIds.has(propId)) {
        newPropIds.delete(propId);
        if (newPropIds.size === 0) {
          newSelectionMode = null;
        }
      } else {
        newPropIds.add(propId);
      }
      
      return {
        selectionMode: newSelectionMode,
        selectedPropIds: newPropIds,
        selectedTileIds: state.selectionMode === 'tiles' ? new Set() : state.selectedTileIds,
      };
    }),
  
  selectLights: (lightIds) =>
    set((state) => {
      // Empty selection means "deselect lights" — don't force the panel into lights mode.
      if (lightIds.length === 0) {
        return {
          selectedLightIds: new Set(),
          selectionMode: state.selectionMode === 'lights' ? null : state.selectionMode,
        };
      }
      return {
        selectionMode: 'lights',
        selectedLightIds: new Set(lightIds),
        selectedTileIds: new Set(),
        selectedPropIds: new Set(),
      };
    }),

  deselectLight: (lightId) =>
    set((state) => {
      const newLightIds = new Set(state.selectedLightIds);
      newLightIds.delete(lightId);
      return {
        selectedLightIds: newLightIds,
        selectionMode: newLightIds.size === 0 ? null : state.selectionMode,
      };
    }),

  clearLightSelection: () =>
    set((state) => ({
      selectedLightIds: new Set(),
      selectionMode: state.selectionMode === 'lights' ? null : state.selectionMode,
    })),

  toggleLightSelection: (lightId) =>
    set((state) => {
      const newLightIds = new Set(state.selectedLightIds);
      let newSelectionMode: SelectionMode = 'lights';

      if (newLightIds.has(lightId)) {
        newLightIds.delete(lightId);
        if (newLightIds.size === 0) {
          newSelectionMode = null;
        }
      } else {
        newLightIds.add(lightId);
      }

      return {
        selectionMode: newSelectionMode,
        selectedLightIds: newLightIds,
        selectedTileIds: state.selectionMode === 'tiles' ? new Set() : state.selectedTileIds,
        selectedPropIds: state.selectionMode === 'props' ? new Set() : state.selectedPropIds,
      };
    }),

  selectLayer: (layerId) =>
    set(() => ({
      selectedLayerId: layerId,
    })),

  clearSelection: () =>
    set(() => ({
      selectedTileIds: new Set(),
      selectedPropIds: new Set(),
      selectedLightIds: new Set(),
      selectionMode: null,
      selectedLayerId: null,
    })),
  
  toggleGrid: () =>
    set((state) => ({
      showGrid: !state.showGrid,
    })),
  
  setShowGrid: (show) =>
    set(() => ({
      showGrid: show,
    })),
  
  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),
  
  setSidebarOpen: (open) =>
    set(() => ({
      sidebarOpen: open,
    })),
}));