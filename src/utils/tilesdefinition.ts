import type { BaseTileDefinition, PropDefinition } from "../types/map";

/**
 * Asset definitions - centralized, easy to maintain
 */
export const TILE_DEFINITIONS: Record<string, BaseTileDefinition> = {
  "grass-terrain": {
    id: "grass-terrain",
    name: "Grass",
    type: "terrain",
    group: "Grass",
    groupColor: "#4ade80",
    textureUrl: "/tilesets/terrain/grass/grass-0.png",
    tileSize: 32,
  },
  "grass-terrain-1": {
    id: "grass-terrain-1",
    name: "Grass",
    type: "terrain",
    group: "Grass",
    groupColor: "#4ade80",
    textureUrl: "/tilesets/terrain/grass/grass-1.png",
    tileSize: 32,
  },
  "grass-terrain-2": {
    id: "grass-terrain-2",
    name: "Grass",
    type: "terrain",
    group: "Grass",
    groupColor: "#4ade80",
    textureUrl: "/tilesets/terrain/grass/grass-2.png",
    tileSize: 32,
  },
  "grass-terrain-3": {
    id: "grass-terrain-3",
    name: "Grass",
    type: "terrain",
    group: "Grass",
    groupColor: "#4ade80",
    textureUrl: "/tilesets/terrain/grass/grass-3.png",
    tileSize: 32,
  },
  "grass-terrain-4": {
    id: "grass-terrain-4",
    name: "Grass",
    type: "terrain",
    group: "Grass",
    groupColor: "#4ade80",
    textureUrl: "/tilesets/terrain/grass/grass-4.png",
    tileSize: 32,
  },

  "wood-terrain": {
    id: "wood-terrain",
    name: "Wood Floor",
    type: "terrain",
    group: "Wood",
    groupColor: "#d97706",
    textureUrl: "/tilesets/terrain/wood/wood-1.png",
    tileSize: 16,
  },
  "water-terrain": {
    id: "water-terrain",
    name: "Water",
    type: "terrain",
    group: "Water",
    groupColor: "#38bdf8",
    textureUrl: "/tilesets/terrain/water/water_center.png",
    tileSize: 32,
    overflowTilesByDirection: {
      top: "water-top",
      bottom: "water-bottom",
      left: "water-left",
      right: "water-right",
      topLeft: "water-topLeft",
      topRight: "water-topRight",
      bottomLeft: "water-bottomLeft",
      bottomRight: "water-bottomRight",
    },
  },
  "water-top": {
    id: "water-top",
    name: "Water Overflow Top",
    type: "overflow",
    textureUrl: "/tilesets/terrain/water/water_top.png",
    tileSize: 32,
  },
  "water-bottom": {
    id: "water-bottom",
    name: "Water Overflow Bottom",
    type: "overflow",
    textureUrl: "/tilesets/terrain/water/water_bottom.png",
    tileSize: 32,
  },
  "water-left": {
    id: "water-left",
    name: "Water Overflow Left",
    type: "overflow",
    textureUrl: "/tilesets/terrain/water/water_left.png",
    tileSize: 32,
  },
  "water-right": {
    id: "water-right",
    name: "Water Overflow Right",
    type: "overflow",
    textureUrl: "/tilesets/terrain/water/water_right.png",
    tileSize: 32,
  },
  "water-topLeft": {
    id: "water-topLeft",
    name: "Water Overflow Top-Left",
    type: "overflow",
    textureUrl: "/tilesets/terrain/water/water_top_left.png",
    tileSize: 32,
  },
  "water-topRight": {
    id: "water-topRight",
    name: "Water Overflow Top-Right",
    type: "overflow",
    textureUrl: "/tilesets/terrain/water/water_top_right.png",
    tileSize: 32,
  },
  "water-bottomLeft": {
    id: "water-bottomLeft",
    name: "Water Overflow Bottom-Left",
    type: "overflow",
    textureUrl: "/tilesets/terrain/water/water_bottom_left.png",
    tileSize: 32,
  },
  "water-bottomRight": {
    id: "water-bottomRight",
    name: "Water Overflow Bottom-Right",
    type: "overflow",
    textureUrl: "/tilesets/terrain/water/water_bottom_right.png",
    tileSize: 32,
  },
  "sand-terrain": {
    id: "sand-terrain",
    name: "Sand",
    type: "terrain",
    group: "Sand",
    groupColor: "#fbbf24",
    textureUrl: "/tilesets/terrain/sand/center.png",
    tileSize: 16,
  },
  "wood-wall": {
    id: "wood-wall",
    name: "Wood Wall",
    type: "wall",
    group: "Wood",
    groupColor: "#a16207",
    textureUrl: "/tilesets/walls/wood/center.png",
    tileSize: 16,
    autotileGroup: "wood_wall",
    autotileBasePath: "/tilesets/walls/wood/autotile/",
  },
};

export const PROP_DEFINITIONS: Record<string, PropDefinition> = {
  fence: {
    id: "fence",
    name: "Fence",
    category: "furniture",
    group: "Farm",
    groupColor: "#86efac",
    textureUrl: "/props/fence.png",
    width: 16,
    height: 16,
    tags: ["furniture"],
  },
  stone: {
    id: "stone",
    name: "Stone",

    category: "nature",
    group: "Nature",
    groupColor: "#a3e635",
    textureUrl: "/props/stone.png",
    width: 16,
    height: 16,
    tags: ["nature"],
  },
};

/**
 * Pick a random variant from a group of tile definitions using weighted random selection.
 * @param groupDefinitions - all definitions in the group
 * @param weights - raw integer weights per definitionId; defaults to 1 for unset entries
 * @returns the definitionId of the selected variant
 */
export const pickRandomVariant = (
  groupDefinitions: BaseTileDefinition[],
  weights: Record<string, number>,
): string => {
  if (groupDefinitions.length === 0) return '';

  const entries = groupDefinitions.map((def) => ({
    id: def.id,
    weight: Math.max(0, weights[def.id] ?? 1),
  }));

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight <= 0) return groupDefinitions[0].id;

  let roll = Math.random() * totalWeight;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return groupDefinitions[groupDefinitions.length - 1].id;
};

/**
 * Initialize all asset definitions in a map
 * Call this when creating a new map or loading a project
 */
export const initializeAssets = (
  addTileDefinition: (def: BaseTileDefinition) => void,
  addPropDefinition: (def: PropDefinition) => void,
) => {
  Object.values(TILE_DEFINITIONS).forEach(addTileDefinition);
  Object.values(PROP_DEFINITIONS).forEach(addPropDefinition);
};
