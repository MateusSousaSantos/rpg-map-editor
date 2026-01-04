import { create } from 'zustand';

// ============================================================================
// TEXTURE CACHE STORE - Optimized texture loading and caching
// Note: Not using Immer because it doesn't work well with DOM elements
// ============================================================================

interface TextureState {
  loading: boolean;
  error: boolean;
}

interface TextureCacheState {
  // Cache of loaded images
  textures: Map<string, HTMLImageElement>;
  // Loading states
  states: Map<string, TextureState>;
  
  // Actions
  loadTexture: (url: string) => Promise<HTMLImageElement>;
  getTexture: (url: string) => HTMLImageElement | undefined;
  clearCache: () => void;
  getCacheStats: () => { count: number; urls: string[] };
}

export const useTextureCache = create<TextureCacheState>((set, get) => ({
  textures: new Map(),
  states: new Map(),
  
  loadTexture: async (url: string) => {
    const state = get();
    
    // Return cached texture if available
    const cached = state.textures.get(url);
    if (cached) {
      return cached;
    }
    
    // Check if already loading
    const loadingState = state.states.get(url);
    if (loadingState?.loading) {
      // Wait for existing load to complete
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          const currentState = get();
          const texture = currentState.textures.get(url);
          const state = currentState.states.get(url);
          
          if (texture) {
            clearInterval(checkInterval);
            resolve(texture);
          } else if (state?.error) {
            clearInterval(checkInterval);
            reject(new Error(`Failed to load texture: ${url}`));
          }
        }, 50);
      });
    }
    
    // Mark as loading
    const newStates = new Map(get().states);
    newStates.set(url, { loading: true, error: false });
    set({ states: newStates });
    
    // Load the image
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const newTextures = new Map(get().textures);
        const newStates = new Map(get().states);
        newTextures.set(url, img);
        newStates.set(url, { loading: false, error: false });
        set({ textures: newTextures, states: newStates });
        resolve(img);
      };
      
      img.onerror = (error) => {
        const newStates = new Map(get().states);
        newStates.set(url, { loading: false, error: true });
        set({ states: newStates });
        console.error(`Failed to load texture: ${url}`, error);
        reject(new Error(`Failed to load texture: ${url}`));
      };
      
      img.src = url;
    });
  },
  
  getTexture: (url: string) => {
    return get().textures.get(url);
  },
  
  clearCache: () => {
    set({ textures: new Map(), states: new Map() });
  },
  
  getCacheStats: () => {
    const state = get();
    return {
      count: state.textures.size,
      urls: Array.from(state.textures.keys()),
    };
  },
}));
