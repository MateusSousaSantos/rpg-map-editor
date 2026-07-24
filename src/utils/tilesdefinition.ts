import type { BaseTileDefinition, PropDefinition, TileType, Direction } from "../types/map";

// ============================================================================
// tiles.json SCHEMA
// ============================================================================

interface TileEntry {
  id: string;
  name: string;
  file: string;
  /** Override the folder-level type for this tile (e.g. "overflow") */
  type?: TileType;
  overflowTilesByDirection?: Record<Direction, string>;
  autotileGroup?: string;
  autotileBasePath?: string;
}

interface TilesetJson {
  group?: string;
  groupColor?: string;
  type: TileType;
  tileSize: number;
  tiles: TileEntry[];
}

interface TilesetManifest {
  tilesets: string[];
  props: string[];
}

// ============================================================================
// props.json SCHEMA
// ============================================================================

interface PropEntry {
  id: string;
  name: string;
  file: string;
  /** Per-entry overrides for any folder-level default */
  category?: string;
  group?: string;
  groupColor?: string;
  theme?: string;
  tags?: string[];
  width?: number;
  height?: number;
}

interface PropsJson {
  category?: string;
  group?: string;
  groupColor?: string;
  theme?: string;
  tags?: string[];
  props: PropEntry[];
}

/** Fallback prop dimensions when unset at both folder and entry level. */
const DEFAULT_PROP_SIZE = 16;

// ============================================================================
// DYNAMIC LOADER
// ============================================================================

export async function loadTileDefinitions(): Promise<BaseTileDefinition[]> {
  const manifestRes = await fetch("/tilesets/manifest.json");
  if (!manifestRes.ok) {
    console.error("Failed to load /tilesets/manifest.json");
    return [];
  }
  const manifest: TilesetManifest = await manifestRes.json();

  const results = await Promise.allSettled(
    manifest.tilesets.map(async (folderPath) => {
      const res = await fetch(`${folderPath}/tiles.json`);
      if (!res.ok) {
        console.warn(`Failed to load tiles.json for ${folderPath}`);
        return [] as BaseTileDefinition[];
      }
      const json: TilesetJson = await res.json();

      return json.tiles.map((tile): BaseTileDefinition => ({
        id: tile.id,
        name: tile.name,
        type: tile.type ?? json.type,
        textureUrl: `${folderPath}/${tile.file}`,
        tileSize: json.tileSize,
        ...(json.group && { group: json.group }),
        ...(json.groupColor && { groupColor: json.groupColor }),
        ...(tile.overflowTilesByDirection && { overflowTilesByDirection: tile.overflowTilesByDirection }),
        ...(tile.autotileGroup && { autotileGroup: tile.autotileGroup }),
        ...(tile.autotileBasePath && { autotileBasePath: tile.autotileBasePath }),
      }));
    }),
  );

  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

export async function loadPropDefinitions(): Promise<PropDefinition[]> {
  const manifestRes = await fetch("/tilesets/manifest.json");
  if (!manifestRes.ok) {
    console.error("Failed to load /tilesets/manifest.json");
    return [];
  }
  const manifest: TilesetManifest = await manifestRes.json();
  if (!manifest.props) return [];

  const results = await Promise.allSettled(
    manifest.props.map(async (folderPath) => {
      const res = await fetch(`${folderPath}/props.json`);
      if (!res.ok) {
        console.warn(`Failed to load props.json for ${folderPath}`);
        return [] as PropDefinition[];
      }
      const json: PropsJson = await res.json();

      return json.props.map((prop): PropDefinition => {
        const group = prop.group ?? json.group;
        const groupColor = prop.groupColor ?? json.groupColor;
        const theme = prop.theme ?? json.theme;
        return {
          id: prop.id,
          name: prop.name,
          category: prop.category ?? json.category ?? "",
          textureUrl: `${folderPath}/${prop.file}`,
          width: prop.width ?? DEFAULT_PROP_SIZE,
          height: prop.height ?? DEFAULT_PROP_SIZE,
          tags: prop.tags ?? json.tags ?? [],
          ...(group && { group }),
          ...(groupColor && { groupColor }),
          ...(theme && { theme }),
        };
      });
    }),
  );

  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

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
  if (groupDefinitions.length === 0) return "";

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
 * Initialize all asset definitions in a map.
 * Fetches tile and prop definitions from the public manifest at runtime.
 * Call this when creating a new map or loading a project.
 */
export const initializeAssets = async (
  addTileDefinition: (def: BaseTileDefinition) => void,
  addPropDefinition: (def: PropDefinition) => void,
): Promise<void> => {
  const [tileDefs, propDefs] = await Promise.all([
    loadTileDefinitions(),
    loadPropDefinitions(),
  ]);
  tileDefs.forEach(addTileDefinition);
  propDefs.forEach(addPropDefinition);
};
