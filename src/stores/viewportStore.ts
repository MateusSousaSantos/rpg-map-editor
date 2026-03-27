import { create } from 'zustand';

// ============================================================================
// VIEWPORT STORE - Canvas pan/zoom
// ============================================================================

interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
  defaultPanX: number;
  defaultPanY: number;

  // Actions
  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  setDefaultPan: (x: number, y: number) => void;
  resetViewport: () => void;
}

export const useViewportStore = create<ViewportState>((set) => ({
  panX: 0,
  panY: 0,
  zoom: 1,
  defaultPanX: 0,
  defaultPanY: 0,

  setPan: (x, y) =>
    set(() => ({
      panX: x,
      panY: y,
    })),

  setZoom: (zoom) =>
    set(() => ({
      zoom: Math.max(0.1, Math.min(zoom, 5)), // Clamp 0.1x to 5x
    })),

  setDefaultPan: (x, y) =>
    set(() => ({
      defaultPanX: x,
      defaultPanY: y,
    })),

  resetViewport: () =>
    set((state) => ({
      panX: state.defaultPanX,
      panY: state.defaultPanY,
      zoom: 1,
    })),
}));