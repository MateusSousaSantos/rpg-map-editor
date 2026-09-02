/**
 * lightingStressTest.ts — dev-only helper to fill the current map with a large,
 * repeatable amount of tiles/props/lights so lighting-pipeline performance
 * changes can be measured before/after on the same scenario.
 *
 * Not shipped UI: wired up in App.tsx as `window.__stressLighting()`, gated
 * behind `import.meta.env.DEV`. Run it from the browser console, e.g.:
 *
 *   await __stressLighting()                       // defaults: 96×96, ~40 lights
 *   await __stressLighting({ width: 160, height: 160, lightCount: 80 })
 *
 * Creates a fresh map (like "New Map" in the Vault) and loads the same
 * manifest-driven tile/prop definitions Vault.tsx loads onto every new/opened
 * map, so textures resolve normally — it doesn't fabricate fake texture URLs.
 */
import { useMapStore } from '../stores/mapStore';
import { initializeAssets } from './tilesdefinition';
import { createLight, getNextLightZIndex } from './lights';
import { createProp, getNextZIndex } from './props';
import type { LightType, TileInstance } from '../types/map';

export interface StressTestOptions {
  /** Map size in tiles. Default 96×96. */
  width?: number;
  height?: number;
  tileSize?: number;
  /** Fraction of grid cells filled with a terrain tile. Default 1 (fully paved). */
  tileDensity?: number;
  /** Number of props scattered across the map. Default 300. */
  propCount?: number;
  /** Number of lights scattered across the map. Default 40. */
  lightCount?: number;
  /** Fraction of lights that cast shadows (the expensive raymarch path). Default 0.5. */
  shadowFraction?: number;
}

const LIGHT_TYPES: LightType[] = ['point', 'spot', 'area'];
const LIGHT_COLORS = ['#ffd9a0', '#a0d9ff', '#ffa0d9', '#d9ffa0', '#ffffff'];

/** Build a fresh map and pack it with tiles/props/lights for perf testing. */
export async function generateLightingStressMap(options: StressTestOptions = {}): Promise<void> {
  const {
    width = 96,
    height = 96,
    tileSize = 32,
    tileDensity = 1,
    propCount = 300,
    lightCount = 40,
    shadowFraction = 0.5,
  } = options;

  const { createMap, addTileDefinition, addPropDefinition } = useMapStore.getState();
  createMap(`Lighting Stress ${width}x${height}`, width, height, tileSize);
  // Same asset-load Vault.tsx runs after creating/opening a map — the fresh
  // map from createMap starts with empty tileDefinitions/propDefinitions.
  await initializeAssets(addTileDefinition, addPropDefinition);

  const loaded = useMapStore.getState().map;
  if (!loaded) {
    console.warn('[stressTest] No map after createMap — aborting.');
    return;
  }

  const terrainDef = loaded.tileDefinitions.find((d) => d.type === 'terrain');
  const propDef = loaded.propDefinitions[0];
  if (!terrainDef) console.warn('[stressTest] No terrain tile definition found in the manifest.');
  if (!propDef) console.warn('[stressTest] No prop definition found in the manifest.');

  const layerId = loaded.layers[0].id;
  const { addTile, addProp, addLight, updateLighting } = useMapStore.getState();

  // ── Tiles: fill the ground layer directly via the store (same addTile path
  // real brush painting uses). ────────────────────────────────────────────
  if (terrainDef) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.random() > tileDensity) continue;
        const tile: TileInstance = {
          id: crypto.randomUUID(),
          definitionId: terrainDef.id,
          gridX: x,
          gridY: y,
          type: 'terrain',
        };
        addTile(layerId, tile);
      }
    }
  }

  // ── Props: scattered at random world positions. ────────────────────────
  if (propDef) {
    for (let i = 0; i < propCount; i++) {
      const x = Math.random() * width * tileSize;
      const y = Math.random() * height * tileSize;
      const nextZ = getNextZIndex(useMapStore.getState().map!.layers[0].props);
      addProp(layerId, createProp(propDef, x, y, nextZ));
    }
  }

  // ── Lights: mixed types, half casting shadows by default. ──────────────
  for (let i = 0; i < lightCount; i++) {
    const x = Math.random() * width * tileSize;
    const y = Math.random() * height * tileSize;
    const type = LIGHT_TYPES[i % LIGHT_TYPES.length];
    const nextZ = getNextLightZIndex(useMapStore.getState().map!.layers[0].lights ?? []);
    const light = createLight(type, x, y, nextZ, tileSize);
    light.color = LIGHT_COLORS[i % LIGHT_COLORS.length];
    light.castsShadows = i < lightCount * shadowFraction;
    addLight(layerId, light);
  }

  updateLighting({ enabled: true });

  console.log(
    `[stressTest] Generated ${width}x${height} map: ${propCount} props, ${lightCount} lights ` +
    `(${Math.round(shadowFraction * 100)}% shadow-casting), lighting enabled.`,
  );
}
