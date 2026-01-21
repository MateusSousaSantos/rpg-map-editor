import type { BaseTileDefinition, PropDefinition } from '../types/map';

/**
 * Asset definitions - centralized, easy to maintain
 */
export const TILE_DEFINITIONS: Record<string, BaseTileDefinition> = {
  'grass-terrain': {
    id: 'grass-terrain',
    name: 'Grass',
    type: 'terrain',
    textureUrl: '/tilesets/terrain/grass/grass-1.png',
    tileSize: 16,
  },
  'wood-terrain': {
    id: 'wood-terrain',
    name: 'Wood Floor',
    type: 'terrain',
    textureUrl: '/tilesets/terrain/wood/wood-1.png',
    tileSize: 16,
  }
};

export const PROP_DEFINITIONS: Record<string, PropDefinition> = {
  'fence': {
    id: 'fence',
    name: 'Fence',
    category: 'furniture',
    textureUrl: '/props/fence.png',
    width: 16,
    height: 16,
    tags: ['furniture'],
  },
  'stone': {
    id: 'stone',
    name: 'Stone',
    category: 'nature',
    textureUrl: '/props/stone.png',
    width: 16,
    height: 16,
    tags: ['nature'],
  },
};

/**
 * Initialize all asset definitions in a map
 * Call this when creating a new map or loading a project
 */
export const initializeAssets = (
  addTileDefinition: (def: BaseTileDefinition) => void,
  addPropDefinition: (def: PropDefinition) => void
) => {
  Object.values(TILE_DEFINITIONS).forEach(addTileDefinition);
  Object.values(PROP_DEFINITIONS).forEach(addPropDefinition);
};