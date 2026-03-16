import type { TileInstance, BaseTileDefinition, TileType } from '../types/map';

// ============================================================================
// BLOB AUTOTILING ENGINE — 8-directional bitmask (47 variants)
//
// Each tile checks its 8 neighbors. For each matching neighbor a bit is set.
// Diagonal bits are only counted when BOTH adjacent cardinals are set (the
// "blob" constraint), which collapses 256 raw values → 47 valid configurations.
//
// Bit layout (from LSB to MSB):
//   Bit 0  (  1) → NW  (topLeft)
//   Bit 1  (  2) → N   (top)
//   Bit 2  (  4) → NE  (topRight)
//   Bit 3  (  8) → W   (left)
//   Bit 4  ( 16) → E   (right)
//   Bit 5  ( 32) → SW  (bottomLeft)
//   Bit 6  ( 64) → S   (bottom)
//   Bit 7  (128) → SE  (bottomRight)
//
// Asset naming: <autotileBasePath><bitmask>.png
// Example: /tilesets/terrain/grass/autotile/255.png  (fully surrounded)
//          /tilesets/terrain/grass/autotile/0.png    (isolated)
//
// Expected folder layout for a "grass" autotile set:
//
//   public/tilesets/terrain/grass/
//   ├── grass-1.png          ← base / fallback texture (already exists)
//   └── autotile/
//       ├── 0.png            ← isolated
//       ├── 2.png            ← N
//       ├── 8.png            ← W
//       ├── 10.png           ← N + W
//       ├── 11.png           ← N + W,         NW corner
//       ├── 16.png           ← E
//       ├── 18.png           ← N + E
//       ├── 22.png           ← N + E,          NE corner
//       ├── 24.png           ← W + E
//       ├── 26.png           ← N + W + E
//       ├── 27.png           ← N + W + E,      NW corner
//       ├── 30.png           ← N + W + E,      NE corner
//       ├── 31.png           ← N + W + E,      NW + NE corners
//       ├── 64.png           ← S
//       ├── 66.png           ← N + S
//       ├── 72.png           ← W + S
//       ├── 74.png           ← N + W + S
//       ├── 75.png           ← N + W + S,      NW corner
//       ├── 80.png           ← E + S
//       ├── 82.png           ← N + E + S
//       ├── 86.png           ← N + E + S,      NE corner
//       ├── 88.png           ← W + E + S
//       ├── 90.png           ← N + W + E + S
//       ├── 91.png           ← N + W + E + S,  NW corner
//       ├── 94.png           ← N + W + E + S,  NE corner
//       ├── 95.png           ← N + W + E + S,  NW + NE corners
//       ├── 104.png          ← W + S,           SW corner
//       ├── 106.png          ← N + W + S,       SW corner
//       ├── 107.png          ← N + W + S,       NW + SW corners
//       ├── 120.png          ← W + E + S,       SW corner
//       ├── 122.png          ← N + W + E + S,   SW corner
//       ├── 123.png          ← N + W + E + S,   NW + SW corners
//       ├── 126.png          ← N + W + E + S,   NE + SW corners
//       ├── 127.png          ← N + W + E + S,   NW + NE + SW corners
//       ├── 208.png          ← E + S,            SE corner
//       ├── 210.png          ← N + E + S,        SE corner
//       ├── 214.png          ← N + E + S,        NE + SE corners
//       ├── 216.png          ← W + E + S,        SE corner
//       ├── 218.png          ← N + W + E + S,    SE corner
//       ├── 219.png          ← N + W + E + S,    NW + SE corners
//       ├── 222.png          ← N + W + E + S,    NE + SE corners
//       ├── 223.png          ← N + W + E + S,    NW + NE + SE corners
//       ├── 248.png          ← W + E + S,        SW + SE corners
//       ├── 250.png          ← N + W + E + S,    SW + SE corners
//       ├── 251.png          ← N + W + E + S,    NW + SW + SE corners
//       ├── 254.png          ← N + W + E + S,    NE + SW + SE corners
//       └── 255.png          ← fully surrounded (all 8 neighbors)
//
// Only the 47 files listed in VALID_BLOB_BITMASKS are ever requested.
// Any missing file silently falls back to the base texture (grass-1.png).
//
// The 47 valid bitmask values (after applying diagonal constraint):
//   0,   2,   8,  10,  11,  16,  18,  22,  24,  26,  27,  30,  31,
//  64,  66,  72,  74,  75,  80,  82,  86,  88,  90,  91,  94,  95,
// 104, 106, 107, 120, 122, 123, 126, 127, 208, 210, 214, 216, 218,
// 219, 222, 223, 248, 250, 251, 254, 255
// ============================================================================

/** All 47 valid blob bitmask values — useful for asset generation tooling. */
export const VALID_BLOB_BITMASKS: readonly number[] = [
    0,   2,   8,  10,  11,  16,  18,  22,  24,  26,  27,  30,  31,
   64,  66,  72,  74,  75,  80,  82,  86,  88,  90,  91,  94,  95,
  104, 106, 107, 120, 122, 123, 126, 127, 208, 210, 214, 216, 218,
  219, 222, 223, 248, 250, 251, 254, 255,
] as const;

/**
 * Returns true when a tile definition has autotiling configured.
 */
export function isAutotileEnabled(def: BaseTileDefinition): boolean {
  return !!(def.autotileGroup && def.autotileBasePath);
}

/**
 * Resolves the texture path for a given autotile definition + computed bitmask.
 */
export function resolveAutotileTexturePath(
  def: BaseTileDefinition,
  bitmask: number,
): string {
  return `${def.autotileBasePath}${bitmask}.png`;
}

/**
 * Computes the blob bitmask for a tile at (gridX, gridY).
 *
 * A neighbor "matches" if it has the same autotileGroup as `autotileGroup` and
 * the same tileType. The diagonal constraint ensures corners are only counted
 * when both adjacent cardinal neighbors also match.
 *
 * @param gridX         - tile X coordinate
 * @param gridY         - tile Y coordinate
 * @param tiles         - the layer's tiles Map  (key = "x,y,type")
 * @param autotileGroup - the group to check for (e.g. "grass")
 * @param tileType      - the TileType to check for (e.g. "terrain")
 * @param defsMap       - map of definitionId → BaseTileDefinition
 */
export function computeBlobBitmask(
  gridX: number,
  gridY: number,
  tiles: Map<string, TileInstance>,
  autotileGroup: string,
  tileType: TileType,
  defsMap: Map<string, BaseTileDefinition>,
): number {
  const hasMatch = (dx: number, dy: number): boolean => {
    const key = `${gridX + dx},${gridY + dy},${tileType}`;
    const neighbor = tiles.get(key);
    if (!neighbor) return false;
    const def = defsMap.get(neighbor.definitionId);
    return !!def && def.autotileGroup === autotileGroup;
  };

  const n  = hasMatch( 0, -1);
  const e  = hasMatch( 1,  0);
  const s  = hasMatch( 0,  1);
  const w  = hasMatch(-1,  0);

  // Diagonals only count when both adjacent cardinals match (blob constraint)
  const nw = w && n && hasMatch(-1, -1);
  const ne = n && e && hasMatch( 1, -1);
  const sw = s && w && hasMatch(-1,  1);
  const se = e && s && hasMatch( 1,  1);

  return (
    (nw ?   1 : 0) |
    (n  ?   2 : 0) |
    (ne ?   4 : 0) |
    (w  ?   8 : 0) |
    (e  ?  16 : 0) |
    (sw ?  32 : 0) |
    (s  ?  64 : 0) |
    (se ? 128 : 0)
  );
}
