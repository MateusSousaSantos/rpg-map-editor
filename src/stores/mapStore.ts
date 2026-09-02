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
  LightInstance,
  LightingConfig,
  BaseTileDefinition,
  OverlayTileDefinition,
  PropDefinition,
  TileType,
  Direction,
} from '../types/map';
import { useHistoryStore } from './historyStore';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate adjacent grid position based on direction
 */
const getAdjacentCoordinate = (gridX: number, gridY: number, direction: Direction): { x: number; y: number } => {
  const directionMap: Record<Direction, { dx: number; dy: number }> = {
    'top': { dx: 0, dy: -1 },
    'bottom': { dx: 0, dy: 1 },
    'left': { dx: -1, dy: 0 },
    'right': { dx: 1, dy: 0 },
    'topLeft': { dx: -1, dy: -1 },
    'topRight': { dx: 1, dy: -1 },
    'bottomLeft': { dx: -1, dy: 1 },
    'bottomRight': { dx: 1, dy: 1 },
  };

  const offset = directionMap[direction];
  return { x: gridX + offset.dx, y: gridY + offset.dy };
};

/**
 * Create overflow tile instances from definition for adjacent coordinates
 */
const createOverflowTilesFromDefinition = (
  parentTile: TileInstance,
  parentDefinition: BaseTileDefinition | OverlayTileDefinition,
  map: MapDocument,
  layer: MapLayer
): TileInstance[] => {
  const overflowTiles: TileInstance[] = [];

  // Check if definition has overflow tiles by direction
  if (!parentDefinition.overflowTilesByDirection) {
    return overflowTiles;
  }

  for (const [direction, overflowDefId] of Object.entries(parentDefinition.overflowTilesByDirection)) {
    const overflowDef = map.tileDefinitions.find((def) => def.id === overflowDefId);
    if (!overflowDef) {
      console.warn(`Overflow tile definition not found: ${overflowDefId}`);
      continue;
    }

    // Calculate adjacent coordinate
    const { x, y } = getAdjacentCoordinate(parentTile.gridX, parentTile.gridY, direction as Direction);

    // Check bounds
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
      continue;
    }

    // Check if there's already a tile of the same group at this position (overflow would be redundant)
    // Only skip if the existing tile belongs to the same group as the overflow being placed
    let existingParentTile = false;
    for (const tileType of ['terrain', 'wall', 'overlay'] as const) {
      const coordKey = `${x},${y},${tileType}`;
      const existingTile = layer.tiles.get(coordKey);
      if (existingTile) {
        const existingDef = map.tileDefinitions.find((def) => def.id === existingTile.definitionId);
        // Only block if the existing tile is the same group as the overflow tile (overflow would be redundant)
        if (existingDef && existingDef.group && overflowDef.group && existingDef.group === overflowDef.group) {
          existingParentTile = true;
          break;
        }
      }
    }

    // Skip if a tile of the same group already covers this position
    if (existingParentTile) {
      continue;
    }

    // Create overflow tile instance at adjacent coordinate
    const overflowTile: TileInstance = {
      id: crypto.randomUUID(),
      definitionId: overflowDefId,
      gridX: x,
      gridY: y,
      type: overflowDef.type,
      parentTileId: parentTile.id,
    };

    overflowTiles.push(overflowTile);
  }

  return overflowTiles;
};

// ============================================================================
// MAP STORE - Core map data
// ============================================================================

interface MapState {
  // Map document (current working copy)
  map: MapDocument | null;

  // All saved maps
  savedMaps: Map<string, MapDocument>;

  // ID of currently loaded map
  currentMapId: string | null;

  // Actions
  createMap: (name: string, width: number, height: number, tileSize: number) => void;
  loadMap: (mapData: MapDocument) => void;
  updateMapMetadata: (changes: Partial<Pick<MapDocument, 'name' | 'width' | 'height' | 'tileSize'>>) => void;

  // Map management
  saveMap: (map: MapDocument) => void;
  loadMapById: (mapId: string) => void;
  deleteMapById: (mapId: string) => void;
  getAllMaps: () => MapDocument[];
  setMapThumbnail: (mapId: string, dataUrl: string) => void;

  // Layer management
  addLayer: (layer: MapLayer) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, changes: Partial<MapLayer>) => void;
  reorderLayers: (layerIds: string[]) => void;

  // Tile operations
  addTile: (layerId: string, tile: TileInstance) => void;
  removeTile: (layerId: string, tileId: string) => void;
  updateTile: (layerId: string, tileId: string, changes: Partial<TileInstance>) => void;
  getTileAt: (layerId: string, gridX: number, gridY: number, type: TileType) => TileInstance | undefined;
  getNeighbors: (layerId: string, gridX: number, gridY: number, type: TileType) => TileInstance[];
  getTilesByType: (layerId: string, type: TileType) => TileInstance[];

  // Batch operations for performance
  batchAddTiles: (layerId: string, tiles: TileInstance[]) => void;
  batchRemoveTiles: (layerId: string, tileIds: string[]) => void;

  // Prop operations
  addProp: (layerId: string, prop: PropInstance) => void;
  removeProp: (layerId: string, propId: string) => void;
  updateProp: (layerId: string, propId: string, changes: Partial<PropInstance>) => void;
  getProp: (layerId: string, propId: string) => PropInstance | undefined;

  // Light operations
  addLight: (layerId: string, light: LightInstance) => void;
  removeLight: (layerId: string, lightId: string) => void;
  updateLight: (layerId: string, lightId: string, changes: Partial<LightInstance>) => void;
  getLight: (layerId: string, lightId: string) => LightInstance | undefined;

  // Map-wide lighting environment
  updateLighting: (changes: Partial<LightingConfig>) => void;

  // Asset management
  addTileDefinition: (definition: BaseTileDefinition | OverlayTileDefinition) => void;
  removeTileDefinition: (definitionId: string) => void;
  updateTileDefinition: (definitionId: string, changes: Partial<BaseTileDefinition>) => void;

  addPropDefinition: (definition: PropDefinition) => void;
  removePropDefinition: (definitionId: string) => void;
  updatePropDefinition: (definitionId: string, changes: Partial<PropDefinition>) => void;
}

// ============================================================================
// PERSISTENCE — manual, debounced
// ============================================================================
//
// This store used to be wrapped in Zustand's `persist` middleware, which
// re-serializes the ENTIRE document (every tile of every saved map) and
// synchronously writes it to localStorage after every single `set()` call.
// Since `addTile`/`removeTile` fire once per grid cell during a brush/eraser
// drag, that meant a full JSON.stringify + localStorage.setItem of the whole
// app's data on every pixel the brush touched — the single biggest source of
// input lag while painting. We hydrate once on startup and persist on a
// trailing debounce instead, flushing immediately on tab close/navigation so
// nothing is lost.

const MAP_STORAGE_KEY = 'rpg-map-storage';
const MAP_PERSIST_DEBOUNCE_MS = 500;

type PersistedLayer = Omit<MapLayer, 'tiles' | 'tilesById'> & {
  tiles: [string, TileInstance][];
  tilesById: [string, TileInstance][];
};
type PersistedMapDocument = Omit<MapDocument, 'layers'> & { layers: PersistedLayer[] };

const serializeMapDocument = (map: MapDocument): PersistedMapDocument => ({
  ...map,
  layers: map.layers.map((layer) => ({
    ...layer,
    tiles: Array.from(layer.tiles.entries()),
    tilesById: Array.from(layer.tilesById.entries()),
  })),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reviveMapDocument = (raw: any): MapDocument => ({
  ...raw,
  createdAt: new Date(raw.createdAt),
  lastModified: new Date(raw.lastModified),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layers: (raw.layers ?? []).map((layer: any) => ({
    ...layer,
    tiles: new Map(layer.tiles || []),
    tilesById: new Map(layer.tilesById || []),
    lights: layer.lights || [],
  })),
});

interface PersistedMapState {
  map: MapDocument | null;
  savedMaps: Map<string, MapDocument>;
  currentMapId: string | null;
}

const loadPersistedMapState = (): PersistedMapState => {
  const empty: PersistedMapState = { map: null, savedMaps: new Map(), currentMapId: null };
  try {
    const raw = localStorage.getItem(MAP_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    const persisted = parsed?.state;
    if (!persisted) return empty;

    const map = persisted.map ? reviveMapDocument(persisted.map) : null;
    const savedMaps = new Map<string, MapDocument>(
      Array.isArray(persisted.savedMaps)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? persisted.savedMaps.map(([id, m]: [string, any]) => [id, reviveMapDocument(m)])
        : []
    );
    return { map, savedMaps, currentMapId: persisted.currentMapId ?? null };
  } catch (err) {
    console.error('Failed to load persisted map state:', err);
    return empty;
  }
};

let mapPersistTimer: ReturnType<typeof setTimeout> | null = null;

/** Synchronously serialize the current store state and write it to localStorage. */
const flushMapPersistence = () => {
  if (mapPersistTimer) {
    clearTimeout(mapPersistTimer);
    mapPersistTimer = null;
  }
  const state = useMapStore.getState();
  try {
    const payload = {
      state: {
        map: state.map ? serializeMapDocument(state.map) : null,
        savedMaps: Array.from(state.savedMaps.entries()).map(([id, m]) => [id, serializeMapDocument(m)]),
        currentMapId: state.currentMapId,
      },
      version: 0,
    };
    localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to persist map state:', err);
  }
};

/** Trailing-debounce a write; rapid edits (e.g. a brush stroke) coalesce into one. */
const scheduleMapPersistence = () => {
  if (mapPersistTimer) clearTimeout(mapPersistTimer);
  mapPersistTimer = setTimeout(flushMapPersistence, MAP_PERSIST_DEBOUNCE_MS);
};

export const useMapStore = create<MapState>()(
  immer((set, get) => {
    const persisted = loadPersistedMapState();
    return {
      map: persisted.map,
      savedMaps: persisted.savedMaps,
      currentMapId: persisted.currentMapId,

      createMap: (name, width, height, tileSize) =>
        set((state) => {
          const newMap: MapDocument = {
            id: crypto.randomUUID(),
            name,
            version: '1.0',
            createdAt: new Date(),
            lastModified: new Date(),
            width,
            height,
            tileSize,
            layers: [
              // Add a default layer with flattened tile storage
              {
                id: crypto.randomUUID(),
                name: 'Ground',
                type: 'tile',
                visible: true,
                opacity: 1,
                depthIndex: 0,
                tiles: new Map(),
                tilesById: new Map(),
                props: [],
                lights: [],
              }
            ],
            tileDefinitions: [],
            propDefinitions: [],
            lighting: {
              enabled: false,
              ambientColor: '#0a0a1e',
              ambientIntensity: 1,
            },
          };

          // Save to savedMaps
          state.savedMaps.set(newMap.id, newMap);

          // Set as current
          state.map = newMap;
          state.currentMapId = newMap.id;

          // Clear undo/redo history for the new map
          useHistoryStore.getState().clearHistory();
        }),

    loadMap: (mapData) =>
      set((state) => {
        state.map = {
          ...mapData,
          createdAt: new Date(mapData.createdAt),
          lastModified: new Date(mapData.lastModified),
        };
      }),

    saveMap: (map) =>
      set((state) => {
        map.lastModified = new Date();
        state.savedMaps.set(map.id, map);
        state.map = map;
        state.currentMapId = map.id;
      }),

    loadMapById: (mapId) =>
      set((state) => {
        // addTile/removeTile no longer eagerly sync into savedMaps (see the
        // persistence note above) — catch the outgoing map up before we
        // abandon `state.map` for it, so its edits aren't lost if it's
        // reopened later.
        if (state.map && state.currentMapId && state.currentMapId !== mapId) {
          state.savedMaps.set(state.currentMapId, state.map);
        }
        const mapToLoad = state.savedMaps.get(mapId);
        if (mapToLoad) {
          state.map = {
            ...mapToLoad,
            createdAt: new Date(mapToLoad.createdAt),
            lastModified: new Date(mapToLoad.lastModified),
            layers: mapToLoad.layers.map(layer => ({
              ...layer,
              tiles: new Map(layer.tiles),
              tilesById: new Map(layer.tilesById),
              lights: layer.lights ?? [],
            })),
          };
          state.currentMapId = mapId;

          // Clear undo/redo history when switching maps
          useHistoryStore.getState().clearHistory();
        }
      }),

    deleteMapById: (mapId) =>
      set((state) => {
        state.savedMaps.delete(mapId);
        if (state.currentMapId === mapId) {
          state.map = null;
          state.currentMapId = null;
        }
      }),

    getAllMaps: () => {
      const state = get();
      const maps = Array.from(state.savedMaps.values());
      // The currently open map may be ahead of its savedMaps entry (see the
      // persistence note above) — substitute the live copy so callers like
      // the Vault listing never show stale data for it.
      if (state.map && state.currentMapId) {
        const currentMapId = state.currentMapId;
        const liveMap = state.map;
        return maps.map((m) => (m.id === currentMapId ? liveMap : m));
      }
      return maps;
    },

    setMapThumbnail: (mapId, dataUrl) =>
      set((state) => {
        const m = state.savedMaps.get(mapId);
        if (m) {
          m.thumbnail = dataUrl;
          m.thumbnailTimestamp = new Date();
        }
        if (state.map && state.map.id === mapId) {
          state.map.thumbnail = dataUrl;
          state.map.thumbnailTimestamp = new Date();
        }
      }),

    updateMapMetadata: (changes) =>
      set((state) => {
        if (state.map) {
          Object.assign(state.map, changes);
          state.map.lastModified = new Date();
          // Update in savedMaps
          if (state.currentMapId) {
            state.savedMaps.set(state.currentMapId, state.map);
          }
        }
      }),

    addLayer: (layer) =>
      set((state) => {
        if (state.map) {
          state.map.layers.push(layer);
          state.map.lastModified = new Date();
          // Sync to savedMaps
          if (state.currentMapId) {
            state.savedMaps.set(state.currentMapId, state.map);
          }
        }
      }),

    removeLayer: (layerId) =>
      set((state) => {
        if (state.map) {
          // Find layer and clear its Maps to prevent memory leaks
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            layer.tiles.clear();
            layer.tilesById.clear();
          }

          state.map.layers = state.map.layers.filter((l) => l.id !== layerId);
          state.map.lastModified = new Date();
          // Sync to savedMaps
          if (state.currentMapId) {
            state.savedMaps.set(state.currentMapId, state.map);
          }
        }
      }),

    updateLayer: (layerId, changes) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            Object.assign(layer, changes);
            state.map.lastModified = new Date();
            // Sync to savedMaps
            if (state.currentMapId) {
              state.savedMaps.set(state.currentMapId, state.map);
            }
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
          // Sync to savedMaps
          if (state.currentMapId) {
            state.savedMaps.set(state.currentMapId, state.map);
          }
        }
      }),

    addTile: (layerId, tile) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            // Composite key: "x,y,type"
            const coordKey = `${tile.gridX},${tile.gridY},${tile.type}`;
            layer.tiles.set(coordKey, tile);
            layer.tilesById.set(tile.id, tile);

            // Auto-create overflow tiles at adjacent coordinates if definition specifies them
            const definition = state.map.tileDefinitions.find((def) => def.id === tile.definitionId);
            if (definition && definition.overflowTilesByDirection) {
              const overflowTiles = createOverflowTilesFromDefinition(tile, definition, state.map, layer);
              if (overflowTiles.length > 0) {
                // Add overflow tiles to the map as regular tiles
                for (const overflowTile of overflowTiles) {
                  const overflowKey = `${overflowTile.gridX},${overflowTile.gridY},${overflowTile.type}`;
                  layer.tiles.set(overflowKey, overflowTile);
                  layer.tilesById.set(overflowTile.id, overflowTile);
                }
              }
            }

            // `state.map` is the live source of truth for the currently open
            // map; savedMaps/localStorage are kept in sync by the debounced
            // persistence flush (see above) rather than on every tile — that's
            // what keeps brush drag strokes cheap.
            state.map.lastModified = new Date();
          }
        }
      }),

    removeTile: (layerId, tileId) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            // O(1) lookup by ID
            const tile = layer.tilesById.get(tileId);
            if (tile) {
              const coordKey = `${tile.gridX},${tile.gridY},${tile.type}`;
              layer.tiles.delete(coordKey);
              layer.tilesById.delete(tileId);
              // Cascade delete: remove all overflow tiles that were spawned by this parent
              for (const candidate of layer.tilesById.values()) {
                if (candidate.parentTileId === tileId) {
                  const childKey = `${candidate.gridX},${candidate.gridY},${candidate.type}`;
                  layer.tiles.delete(childKey);
                  layer.tilesById.delete(candidate.id);
                }
              }
              // See addTile above — savedMaps/localStorage sync is deferred to
              // the debounced persistence flush, not done per tile removed.
              state.map.lastModified = new Date();
            }
          }
        }
      }),

    updateTile: (layerId, tileId, changes) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            // O(1) lookup by ID
            const tile = layer.tilesById.get(tileId);
            if (tile) {
              // Check if coordinate or type changes (affects Map key)
              const coordChanged =
                (changes.gridX !== undefined && changes.gridX !== tile.gridX) ||
                (changes.gridY !== undefined && changes.gridY !== tile.gridY) ||
                (changes.type !== undefined && changes.type !== tile.type);

              if (coordChanged) {
                // Remove old key from tiles Map
                const oldKey = `${tile.gridX},${tile.gridY},${tile.type}`;
                layer.tiles.delete(oldKey);

                // Update tile properties
                Object.assign(tile, changes);

                // Add with new key to tiles Map
                const newKey = `${tile.gridX},${tile.gridY},${tile.type}`;
                layer.tiles.set(newKey, tile);
              } else {
                // No coordinate change, just update properties
                Object.assign(tile, changes);
              }

              state.map.lastModified = new Date();
              // Sync to savedMaps
              if (state.currentMapId) {
                state.savedMaps.set(state.currentMapId, state.map);
              }
            }
          }
        }
      }),

    getTileAt: (layerId, gridX, gridY, type) => {
      const state = get();
      const layer = state.map?.layers.find((l) => l.id === layerId);
      if (!layer) return undefined;

      // O(1) lookup with composite key
      const key = `${gridX},${gridY},${type}`;
      return layer.tiles.get(key);
    },

    getNeighbors: (layerId, gridX, gridY, type) => {
      const state = get();
      const layer = state.map?.layers.find((l) => l.id === layerId);
      if (!layer) return [];

      const neighbors: TileInstance[] = [];
      const offsets = [
        { dx: 0, dy: -1 },   // top
        { dx: 1, dy: -1 },   // topRight
        { dx: 1, dy: 0 },    // right
        { dx: 1, dy: 1 },    // bottomRight
        { dx: 0, dy: 1 },    // bottom
        { dx: -1, dy: 1 },   // bottomLeft
        { dx: -1, dy: 0 },   // left
        { dx: -1, dy: -1 },  // topLeft
      ];

      for (const { dx, dy } of offsets) {
        const nx = gridX + dx;
        const ny = gridY + dy;
        const key = `${nx},${ny},${type}`;
        const neighbor = layer.tiles.get(key);
        if (neighbor) {
          neighbors.push(neighbor);
        }
      }

      return neighbors;
    },

    getTilesByType: (layerId, type) => {
      const state = get();
      const layer = state.map?.layers.find((l) => l.id === layerId);
      if (!layer) return [];

      const tiles: TileInstance[] = [];
      for (const tile of layer.tilesById.values()) {
        if (tile.type === type) {
          tiles.push(tile);
        }
      }
      return tiles;
    },

    batchAddTiles: (layerId, tiles) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            // Batch add all tiles in a single state update
            for (const tile of tiles) {
              const coordKey = `${tile.gridX},${tile.gridY},${tile.type}`;
              layer.tiles.set(coordKey, tile);
              layer.tilesById.set(tile.id, tile);

              // Auto-create overflow tiles at adjacent coordinates if definition specifies them
              const definition = state.map.tileDefinitions.find((def) => def.id === tile.definitionId);
              if (definition && definition.overflowTilesByDirection) {
                const overflowTiles = createOverflowTilesFromDefinition(tile, definition, state.map, layer);
                if (overflowTiles.length > 0) {
                  // Add overflow tiles to the map as regular tiles
                  for (const overflowTile of overflowTiles) {
                    const overflowKey = `${overflowTile.gridX},${overflowTile.gridY},${overflowTile.type}`;
                    layer.tiles.set(overflowKey, overflowTile);
                    layer.tilesById.set(overflowTile.id, overflowTile);
                  }
                }
              }
            }
            state.map.lastModified = new Date();
            // Sync to savedMaps
            if (state.currentMapId) {
              state.savedMaps.set(state.currentMapId, state.map);
            }
          }
        }
      }),

    batchRemoveTiles: (layerId, tileIds) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            // Batch remove all tiles in a single state update
            // Also collect overflow children to cascade-delete
            const allIdsToRemove = new Set(tileIds);
            for (const tileId of tileIds) {
              for (const candidate of layer.tilesById.values()) {
                if (candidate.parentTileId === tileId) {
                  allIdsToRemove.add(candidate.id);
                }
              }
            }
            for (const tileId of allIdsToRemove) {
              const tile = layer.tilesById.get(tileId);
              if (tile) {
                const coordKey = `${tile.gridX},${tile.gridY},${tile.type}`;
                layer.tiles.delete(coordKey);
                layer.tilesById.delete(tileId);
              }
            }
            state.map.lastModified = new Date();
            // Sync to savedMaps
            if (state.currentMapId) {
              state.savedMaps.set(state.currentMapId, state.map);
            }
          }
        }
      }),

    addProp: (layerId, prop) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            layer.props.push(prop);
            state.map.lastModified = new Date();
            // Sync to savedMaps
            if (state.currentMapId) {
              state.savedMaps.set(state.currentMapId, state.map);
            }
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
            // Sync to savedMaps
            if (state.currentMapId) {
              state.savedMaps.set(state.currentMapId, state.map);
            }
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
              // Sync to savedMaps
              if (state.currentMapId) {
                state.savedMaps.set(state.currentMapId, state.map);
              }
            }
          }
        }
      }),

    getProp: (layerId, propId) => {
      const state = get();
      const layer = state.map?.layers.find((l) => l.id === layerId);
      return layer?.props.find((p) => p.id === propId);
    },

    addLight: (layerId, light) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer) {
            // Older maps persisted before lights existed may lack the array
            if (!layer.lights) layer.lights = [];
            layer.lights.push(light);
            state.map.lastModified = new Date();
            if (state.currentMapId) {
              state.savedMaps.set(state.currentMapId, state.map);
            }
          }
        }
      }),

    removeLight: (layerId, lightId) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          if (layer?.lights) {
            layer.lights = layer.lights.filter((l) => l.id !== lightId);
            state.map.lastModified = new Date();
            if (state.currentMapId) {
              state.savedMaps.set(state.currentMapId, state.map);
            }
          }
        }
      }),

    updateLight: (layerId, lightId, changes) =>
      set((state) => {
        if (state.map) {
          const layer = state.map.layers.find((l) => l.id === layerId);
          const light = layer?.lights?.find((l) => l.id === lightId);
          if (light) {
            Object.assign(light, changes);
            state.map.lastModified = new Date();
            if (state.currentMapId) {
              state.savedMaps.set(state.currentMapId, state.map);
            }
          }
        }
      }),

    getLight: (layerId, lightId) => {
      const state = get();
      const layer = state.map?.layers.find((l) => l.id === layerId);
      return layer?.lights?.find((l) => l.id === lightId);
    },

    updateLighting: (changes) =>
      set((state) => {
        if (state.map) {
          const current: LightingConfig = state.map.lighting ?? {
            enabled: false,
            ambientColor: '#0a0a1e',
            ambientIntensity: 1,
          };
          state.map.lighting = { ...current, ...changes };
          state.map.lastModified = new Date();
          if (state.currentMapId) {
            state.savedMaps.set(state.currentMapId, state.map);
          }
        }
      }),

    addTileDefinition: (definition) =>
      set((state) => {
        if (state.map) {
          // Check if definition already exists
          const exists = state.map.tileDefinitions.some(d => d.id === definition.id);
          if (!exists) {
            state.map.tileDefinitions.push(definition);
            state.map.lastModified = new Date();
            if (state.currentMapId) {
              state.savedMaps.set(state.currentMapId, state.map);
            }
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
          if (state.currentMapId) {
            state.savedMaps.set(state.currentMapId, state.map);
          }
        }
      }),

    updateTileDefinition: (definitionId, changes) =>
      set((state) => {
        if (state.map) {
          const def = state.map.tileDefinitions.find((d) => d.id === definitionId);
          if (def) {
            Object.assign(def, changes);
            state.map.lastModified = new Date();
            if (state.currentMapId) {
              state.savedMaps.set(state.currentMapId, state.map);
            }
          }
        }
      }),

    addPropDefinition: (definition) =>
      set((state) => {
        if (state.map) {
          const exists = state.map.propDefinitions.some(d => d.id === definition.id);
          if (!exists) {
            state.map.propDefinitions.push(definition);
            state.map.lastModified = new Date();
            if (state.currentMapId) {
              state.savedMaps.set(state.currentMapId, state.map);
            }
          }
        }
      }),

    removePropDefinition: (definitionId) =>
      set((state) => {
        if (state.map) {
          state.map.propDefinitions = state.map.propDefinitions.filter(
            (d) => d.id !== definitionId
          );
          state.map.lastModified = new Date();
          if (state.currentMapId) {
            state.savedMaps.set(state.currentMapId, state.map);
          }
        }
      }),

    updatePropDefinition: (definitionId, changes) =>
      set((state) => {
        if (state.map) {
          const def = state.map.propDefinitions.find((d) => d.id === definitionId);
          if (def) {
            Object.assign(def, changes);
            state.map.lastModified = new Date();
            if (state.currentMapId) {
              state.savedMaps.set(state.currentMapId, state.map);
            }
          }
        }
      }),
    };
  })
);

// Persist on a trailing debounce whenever the document, saved-maps collection,
// or current-map pointer actually changes reference (i.e. something mutated).
useMapStore.subscribe((state, prevState) => {
  if (
    state.map !== prevState.map ||
    state.savedMaps !== prevState.savedMaps ||
    state.currentMapId !== prevState.currentMapId
  ) {
    scheduleMapPersistence();
  }
});

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushMapPersistence);
  window.addEventListener('pagehide', flushMapPersistence);
}

export { flushMapPersistence };