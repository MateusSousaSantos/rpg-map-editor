import { useMapStore } from '../stores/mapStore';
import type { BaseTileDefinition, TileInstance } from '../types/map';

/**
 * Test utility to populate the map with sample tiles
 * This is for testing Phase 2 tile rendering
 */
export const useSampleTiles = () => {
  const { map, addTileDefinition, addTile } = useMapStore();

  const createSampleTiles = () => {
    if (!map || map.layers.length === 0) {
      console.warn('No map or layers found');
      return;
    }

    const groundLayerId = map.layers[0].id;

    // Create sample tile definitions
    const grassTileDef: BaseTileDefinition = {
      id: 'grass-1',
      name: 'Grass',
      type: 'terrain',
      textureUrl: '/tilesets/terrain/grass/grass-1.png',
      tileSize: map.tileSize,
    };

    const woodOverlayDef: BaseTileDefinition = {
      id: 'wood-1',
      name: 'Wood Floor',
      type: 'terrain',
      textureUrl: '/tilesets/overlay/wood/wood-1.png',
      tileSize: map.tileSize,
    };

    // Add definitions to map
    addTileDefinition(grassTileDef);
    addTileDefinition(woodOverlayDef);

    // Create a pattern of grass tiles
    for (let y = 0; y < Math.min(10, map.height); y++) {
      for (let x = 0; x < Math.min(10, map.width); x++) {
        const tile: TileInstance = {
          id: `tile-${x}-${y}`,
          definitionId: 'grass-1',
          gridX: x,
          gridY: y,
          type: 'terrain',
        };
        addTile(groundLayerId, tile);
      }
    }

    // Add some wood overlay tiles in a 3x3 area
    for (let y = 2; y < 5; y++) {
      for (let x = 2; x < 5; x++) {
        const tile: TileInstance = {
          id: `overlay-${x}-${y}`,
          definitionId: 'wood-1',
          gridX: x,
          gridY: y,
          type: 'terrain',
          opacity: 1,
        };
        addTile(groundLayerId, tile);
      }
    }

    console.log('✅ Sample tiles created');
  };

  return { createSampleTiles };
};
