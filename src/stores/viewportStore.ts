import { create } from 'zustand';

// ============================================================================
// VIEWPORT STORE - Canvas pan/zoom
// ============================================================================

interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
  
  // Actions
  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  resetViewport: () => void;
}

export const useViewportStore = create<ViewportState>((set) => ({
  panX: 0,
  panY: 0,
  zoom: 1,
  
  setPan: (x, y) =>
    set(() => ({
      panX: x,
      panY: y,
    })),
  
  setZoom: (zoom) =>
    set(() => ({
      zoom: Math.max(0.1, Math.min(zoom, 5)), // Clamp 0.1x to 5x
    })),
  
  resetViewport: () =>
    set(() => ({
      panX: 0,
      panY: 0,
      zoom: 1,
    })),
}));