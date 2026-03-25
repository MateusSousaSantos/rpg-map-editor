import { create } from 'zustand';

// ============================================================================
// TEXTURE CACHE STORE - Optimized texture loading and caching
// Note: Not using Immer because it doesn't work well with DOM elements
// ============================================================================

interface TextureCacheState {
  // Cache of loaded images
  textures: Map<string, HTMLImageElement>;
  // In-flight loading promises (deduplicates concurrent requests)
  pending: Map<string, Promise<HTMLImageElement>>;
  
  // Actions
  loadTexture: (url: string) => Promise<HTMLImageElement>;
  getTexture: (url: string) => HTMLImageElement | undefined;
  clearCache: () => void;
  getCacheStats: () => { count: number; urls: string[] };
}

export const useTextureCache = create<TextureCacheState>((set, get) => ({
  textures: new Map(),
  pending: new Map(),
  
  loadTexture: async (url: string) => {
    const state = get();
    
    // Return cached texture if available
    const cached = state.textures.get(url);
    if (cached) {
      return cached;
    }
    
    // If already loading, return the existing promise (no polling needed)
    const inflight = state.pending.get(url);
    if (inflight) {
      return inflight;
    }
    
    // Create a new loading promise
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const newTextures = new Map(get().textures);
        const newPending = new Map(get().pending);
        newTextures.set(url, img);
        newPending.delete(url);
        set({ textures: newTextures, pending: newPending });
        resolve(img);
      };
      
      img.onerror = (error) => {
        const newPending = new Map(get().pending);
        newPending.delete(url);
        set({ pending: newPending });
        console.error(`Failed to load texture: ${url}`, error);
        reject(new Error(`Failed to load texture: ${url}`));
      };
      
      img.src = url;
    });
    
    // Store the pending promise so concurrent callers reuse it
    const newPending = new Map(get().pending);
    newPending.set(url, promise);
    set({ pending: newPending });
    
    return promise;
  },
  
  getTexture: (url: string) => {
    return get().textures.get(url);
  },
  
  clearCache: () => {
    set({ textures: new Map(), pending: new Map() });
  },
  
  getCacheStats: () => {
    const state = get();
    return {
      count: state.textures.size,
      urls: Array.from(state.textures.keys()),
    };
  },
}));
