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
  },
  'water-terrain': {
    id: 'water-terrain',
    name: 'Water',
    type: 'terrain',
    textureUrl: '/tilesets/terrain/water/center.png',
    tileSize: 16,
    overflowTilesByDirection: {
      'top': 'water-top',
      'bottom': 'water-bottom',
      'left': 'water-left',
      'right': 'water-right',
      'topLeft': 'water-topLeft',
      'topRight': 'water-topRight',
      'bottomLeft': 'water-bottomLeft',
      'bottomRight': 'water-bottomRight',
    }
  },
  'water-top': {
    id: 'water-top',
    name: 'Water Overflow Top',
    type: 'overflow',
    textureUrl: '/tilesets/terrain/water/water-top.png',
    tileSize: 16,
  },
  'water-bottom': {
    id: 'water-bottom',
    name: 'Water Overflow Bottom',
    type: 'overflow',
    textureUrl: '/tilesets/terrain/water/water-bottom.png',
    tileSize: 16,
  },
  'water-left': {
    id: 'water-left',
    name: 'Water Overflow Left',
    type: 'overflow',
    textureUrl: '/tilesets/terrain/water/water-left.png',
    tileSize: 16,
  },
  'water-right': {
    id: 'water-right',
    name: 'Water Overflow Right',
    type: 'overflow',
    textureUrl: '/tilesets/terrain/water/water-right.png',
    tileSize: 16,
  },
  'water-topLeft': {
    id: 'water-topLeft',
    name: 'Water Overflow Top-Left',
    type: 'overflow',
    textureUrl: '/tilesets/terrain/water/water-topLeft.png',
    tileSize: 16,
  },
  'water-topRight': {
    id: 'water-topRight',
    name: 'Water Overflow Top-Right',
    type: 'overflow',
    textureUrl: '/tilesets/terrain/water/water-topRight.png',
    tileSize: 16,
  },
  'water-bottomLeft': {
    id: 'water-bottomLeft',
    name: 'Water Overflow Bottom-Left',
    type: 'overflow',
    textureUrl: '/tilesets/terrain/water/water-bottomLeft.png',
    tileSize: 16,
  },
  'water-bottomRight': {
    id: 'water-bottomRight',
    name: 'Water Overflow Bottom-Right',
    type: 'overflow',
    textureUrl: '/tilesets/terrain/water/water-bottomRight.png',
    tileSize: 16,
  },
  'sand-terrain': {
    id: 'sand-terrain',
    name: 'Sand',
    type: 'terrain',
    textureUrl: '/tilesets/terrain/sand/center.png',
    tileSize: 16,
  }
  
  // Example: Tile with overflow tiles at adjacent coordinates
  // 'house-with-roof': {
  //   id: 'house-with-roof',
  //   name: 'House',
  //   type: 'terrain',
  //   textureUrl: '/tilesets/terrain/house-base.png',
  //   tileSize: 16,
  //   overflowTilesByDirection: {
  //     'top': 'roof-top',
  //     'topLeft': 'roof-corner-tl',
  //     'topRight': 'roof-corner-tr',
  //   }
  // },
  // 'roof-top': {
  //   id: 'roof-top',
  //   name: 'Roof (Top)',
  //   type: 'overflow',
  //   textureUrl: '/tilesets/terrain/roof-top.png',
  //   tileSize: 16,
  // },
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