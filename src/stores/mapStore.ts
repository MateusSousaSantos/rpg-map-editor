// ============================================================================
// STORE ARCHITECTURE - Zustand + Immer
// ============================================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  MapDocument,
  MapLayer,
  TileInstance,
  PropInstance,
  BaseTileDefinition,
  OverlayTileDefinition,
  PropDefinition,
} from '../types/map';

// ============================================================================
// MAP STORE - Core map data
// ============================================================================

interface MapState {
  // Map document
  map: MapDocument | null;
  
  // Actions
  createMap: (width: number, height: number, tileSize: number) => void;
  loadMap: (mapData: MapDocument) => void;
  updateMapMetadata: (changes: Partial<Pick<MapDocument, 'name' | 'width' | 'height' | 'tileSize'>>) => void;
  
  // Layer management
  addLayer: (layer: MapLayer) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, changes: Partial<MapLayer>) => void;
  reorderLayers: (layerIds: string[]) => void;
  
  // Tile operations
  addTile: (layerId: string, tile: TileInstance) => void;
  removeTile: (layerId: string, tileGridType: string, tileId: string) => void;
  updateTile: (layerId: string, tileGridType: string, tileId: string, changes: Partial<TileInstance>) => void;
  getTile: (layerId: string, gridX: number, gridY: number) => TileInstance | undefined;
  getTilesByGridType: (layerId: string, gridType: string) => TileInstance[];
  
  // Prop operations
  addProp: (layerId: string, prop: PropInstance) => void;
  removeProp: (layerId: string, propId: string) => void;
  updateProp: (layerId: string, propId: string, changes: Partial<PropInstance>) => void;
  getProp: (layerId: string, propId: string) => PropInstance | undefined;
  
  // Asset management
  addTileDefinition: (definition: BaseTileDefinition | OverlayTileDefinition) => void;
  removeTileDefinition: (definitionId: string) => void;
  updateTileDefinition: (definitionId: string, changes: Partial<BaseTileDefinition>) => void;
  
  addPropDefinition: (definition: PropDefinition) => void;
  removePropDefinition: (definitionId: string) => void;
  updatePropDefinition: (definitionId: string, changes: Partial<PropDefinition>) => void;
}

export const useMapStore = create<MapState>()(
  immer((set, get) => ({
    map: null,
    
    createMap: (width, height, tileSize) =>
      set((state) => {
        state.map = {
          id: crypto.randomUUID(),
          name: 'Untitled Map',
          version: '1.0',
          createdAt: new Date(),
          lastModified: new Date(),
          width,
          height,
          tileSize,
          layers: [
            // Add a default layer with terrain and overlay grids
            {
              id: crypto.randomUUID(),
              name: 'Ground',
              type: 'tile',
              visible: true,
              opacity: 1,
              depthIndex: 0,
              tileGrids: [
                {
                  type: 'terrain',
                  tiles: new Map(),
                },
                {
                  type: 'overlay',
                  tiles: new Map(),
                }
              ],
              props: [],
            }
          ],
          tileDefinitions: [],
          propDefinitions: [],
        };
      }),
    
    loadMap: (mapData) =>
      set((state) => {
        state.map = {
          ...mapData,
          createdAt: new Date(mapData.createdAt),
          lastModified: new Date(mapData.lastModified),
        };
      }),
    
    updateMapMetadata: (changes) =>
      set((state) => {
        if (state.map) {
          Object.assign(state.map, changes);
          state.map.lastModified = new Date();
        }
      }),
    
    addLayer: (layer) =>
      set((state) => {
        if (state.map) {
          state.map.layers.push(layer);
          state.map.lastModified = new Date();
        }
      }),
    
    removeLayer: (layerId) =>
      set((state) => {
        if (state.map) {
          state.map.layers = state.map.layers.filter((l) => l.id !== layerId);
          state.map.lastModified = new Date();
        }
      }),
    
    updateLayer: (layerId, changes) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            Object.assign(layer, changes);
            state.map.lastModified = new Date();
          }
        }
      }),
    
    reorderLayers: (layerIds) =>
      set((state) => {
        if (state.map) {
          const layerMap = new Map(state.map.layers.map((l) => [l.id, l]));
          state.map.layers = layerIds
            .map((id) => layerMap.get(id))
            .filter(Boolean) as MapLayer[];
          
          state.map.layers.forEach((layer, index) => {
            layer.depthIndex = index;
          });
          state.map.lastModified = new Date();
        }
      }),
    
    addTile: (layerId, tile) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            const tileGrid = layer.tileGrids.find((tg) => tg.type === tile.type);
            if (tileGrid) {
              const key = `${tile.gridX},${tile.gridY}`;
              tileGrid.tiles.set(key, tile);
            }
            state.map.lastModified = new Date();
          }
        }
      }),
    
    removeTile: (layerId, tileGridType, tileId) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            const tileGrid = layer.tileGrids.find((tg) => tg.type === tileGridType);
            if (tileGrid) {
              // Find and remove by tileId
              for (const [key, tile] of tileGrid.tiles.entries()) {
                if (tile.id === tileId) {
                  tileGrid.tiles.delete(key);
                  break;
                }
              }
              state.map.lastModified = new Date();
            }
          }
        }
      }),
    
    updateTile: (layerId, tileGridType, tileId, changes) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            const tileGrid = layer.tileGrids.find((tg) => tg.type === tileGridType);
            if (tileGrid) {
              for (const tile of tileGrid.tiles.values()) {
                if (tile.id === tileId) {
                  Object.assign(tile, changes);
                  state.map.lastModified = new Date();
                  break;
                }
              }
            }
          }
        }
      }),
    
    getTile: (layerId, gridX, gridY) => {
      const state = get();
      const layer = state.map?.layers.find((l) => l.id === layerId);
      if (!layer) return undefined;
      
      const key = `${gridX},${gridY}`;
      for (const tileGrid of layer.tileGrids) {
        const tile = tileGrid.tiles.get(key);
        if (tile) return tile;
      }
      return undefined;
    },
    
    getTilesByGridType: (layerId, gridType) => {
      const state = get();
      const layer = state.map?.layers.find((l) => l.id === layerId);
      if (!layer) return [];
      
      const tileGrid = layer.tileGrids.find((tg) => tg.type === gridType);
      return tileGrid ? Array.from(tileGrid.tiles.values()) : [];
    },
    
    addProp: (layerId, prop) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            layer.props.push(prop);
            state.map.lastModified = new Date();
          }
        }
      }),
    
    removeProp: (layerId, propId) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            layer.props = layer.props.filter((p) => p.id !== propId);
            state.map.lastModified = new Date();
          }
        }
      }),
    
    updateProp: (layerId, propId, changes) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            const prop = layer.props.find((p) => p.id === propId);
            if (prop) {
              Object.assign(prop, changes);
              state.map.lastModified = new Date();
            }
          }
        }
      }),
    
    getProp: (layerId, propId) => {
      const state = get();
      const layer = state.map?.layers.find((l) => l.id === layerId);
      return layer?.props.find((p) => p.id === propId);
    },
    
    addTileDefinition: (definition) =>
      set((state) => {
        if (state.map) {
          // Check if definition already exists
          const exists = state.map.tileDefinitions.some(d => d.id === definition.id);
          if (!exists) {
            state.map.tileDefinitions.push(definition);
            state.map.lastModified = new Date();
          }
        }
      }),
    
    removeTileDefinition: (definitionId) =>
      set((state) => {
        if (state.map) {
          state.map.tileDefinitions = state.map.tileDefinitions.filter(
            (d) => d.id !== definitionId
          );
          state.map.lastModified = new Date();
        }
      }),
    
    updateTileDefinition: (definitionId, changes) =>
      set((state) => {
        if (state.map) {
          const def = state.map.tileDefinitions.find((d) => d.id === definitionId);
          if (def) {
            Object.assign(def, changes);
            state.map.lastModified = new Date();
          }
        }
      }),
    
    addPropDefinition: (definition) =>
      set((state) => {
        if (state.map) {
          state.map.propDefinitions.push(definition);
          state.map.lastModified = new Date();
        }
      }),
    
    removePropDefinition: (definitionId) =>
      set((state) => {
        if (state.map) {
          state.map.propDefinitions = state.map.propDefinitions.filter(
            (d) => d.id !== definitionId
          );
          state.map.lastModified = new Date();
        }
      }),
    
    updatePropDefinition: (definitionId, changes) =>
      set((state) => {
        if (state.map) {
          const def = state.map.propDefinitions.find((d) => d.id === definitionId);
          if (def) {
            Object.assign(def, changes);
            state.map.lastModified = new Date();
          }
        }
      }),
  }))
);