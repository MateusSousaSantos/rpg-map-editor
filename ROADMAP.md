# RPG Map Editor — Feature Roadmap

**Status:** Living document. Ideas here are proposals, not commitments. Order is rough priority, not a schedule.

This roadmap tracks features that go beyond the current tile/prop painting core. Each entry notes the idea, why it's worth doing, and where it would plug into the existing architecture (see `PROJECT_RUNDOWN.md` and `CLAUDE.md` for the systems referenced below).

---

## 🏛️ 1. Room Populator (auto-decorate)

**The idea:** Select a region of tiles (or draw a box), pick a theme, and have the editor automatically place props that make it read as a furnished room — appropriate to its size and thematic.

**Why:** Hand-placing every barrel, chair, and torch is the slowest part of building a believable map. A one-click "populate" for a bounded area turns an empty stone room into a tavern, armory, or bedroom in seconds, then the user hand-tunes.

**How it fits:**
- New tool `room-populate` in `toolStore` (`ToolType` union in `types/map.ts`), reusing the existing box-drag selection from `useCanvasEvents.ts` to define the region.
- Extend `PropDefinition` in `tilesdefinition.ts` with placement metadata so the populator knows the rules:
  - `theme: string[]` — e.g. `["tavern", "kitchen"]`
  - `placement: "wall" | "corner" | "floor" | "center"` — where it belongs
  - `footprint: { w, h }` in tiles — for overlap avoidance
  - `minRoomSize` / `density` — how many to scatter and when it's worth placing
- A `populateRoom(region, theme, seed)` generator in a new `utils/roomPopulator.ts`:
  1. Analyze the region — find walls, corners, interior floor from the tile maps.
  2. Place "anchor" props first (bed, hearth, table) sized to the room.
  3. Scatter "filler" props (crates, rugs, clutter) by density, respecting footprints so nothing overlaps.
  4. Use the existing `pickRandomVariant()` weighted-random helper for variety.
- **Seeded RNG** so a room can be re-rolled deterministically ("give me another layout") — store the seed on the action.
- All placement flows through `mapStore.addProp()` and is wrapped in a **single undoable `MapAction`**, so one Ctrl+Z clears the whole populated room.

**Decisions:**
- **Region is defined by an explicit box selection** (drag a rectangle), not auto-detected from walls. Simpler, predictable, and gives the user direct control over what gets populated. Wall-based auto-detection is out of scope for now.

**Open questions:**
- Theme taxonomy: fixed enum vs. free tags on props.
- Wall-hugging placement needs the prop's "facing" — reuse `Direction` from `types/map.ts`.

**Prereqs:** A richer prop library than the current two hardcoded props (`fence`, `stone`). See #6.

---

## 💡 2. Dynamic Lighting & Atmosphere

**The idea:** Place light sources on the map (torches, windows, campfires, magical glow) that cast soft colored light, producing mood and atmosphere. Darkness by default, light reveals.

**Why:** Lighting is the single biggest lever for "feel" — a dungeon lit by scattered torches vs. a sunlit meadow are the same tiles with different light. This is what makes a map look finished rather than flat.

**How it fits:**
- New `LightLayer` Konva layer in `MapCanvas.tsx`, rendered **above** `TileLayer`/`PropLayer` and below `CursorLayer`.
- Two-pass render:
  1. A full-map dark overlay `Rect` (ambient darkness, configurable per-map).
  2. Radial gradients (Konva `Circle` with `fillRadialGradient`) per light, composited with `globalCompositeOperation` (`"lighten"` / `"screen"`) to punch holes in the dark and tint.
- New `LightInstance` type in `types/map.ts`: `{ id, x, y (world coords), radius, color, intensity, flicker }`. Free-positioned like props (world coordinates, via `screenToWorld()`).
- Store lights on the `MapLayer` (or a dedicated lights collection on `MapDocument`) so they persist and export.
- New tool `place-light` + a right-panel inspector for radius/color/intensity (mirror the existing `PropInspector`).
- **Flicker:** optional subtle animated intensity via Konva `Animation` / `requestAnimationFrame`, throttled and toggleable (respect reduced-motion; disable for export).
- **Export:** bake lighting into the PNG export as a final composited pass so exported maps carry the atmosphere.

**Nice extensions (later):**
- Day/night slider that shifts ambient color + darkness globally.
- Shadow casting from `wall` tiles (raycasting against the wall map) — expensive, gate behind a toggle.
- Light presets: "torch", "moonlight", "lava glow", "candle".

**Open questions:**
- Performance with many lights on large maps — cap count, or bake to an offscreen canvas and redraw only on change.
- Whether lights belong to a layer (hide with the layer) or live map-wide.

---

## 🌱 3. Smart Autotiling / Terrain Blending

**The idea:** When painting terrain, automatically pick the correct edge/corner tile so grass blends into sand, water gets shorelines, paths curve — without manually placing each transition tile.

**Why:** The `autotileGroup` / `overflowTilesByDirection` fields already exist in the tile schema but aren't fully leveraged. This is the natural next step and dramatically speeds up natural-looking terrain.

**How it fits:** Extend the brush/box handlers in `useCanvasEvents.ts` to, after placing a tile, re-evaluate the 8 neighbors (`getNeighbors()` in `mapStore`) and swap each to its correct autotile variant based on a bitmask of matching neighbors. Builds directly on the existing overflow-tile machinery.

---

## 🎨 4. Better Export Pipeline

**The idea:** First-class export beyond localStorage.
- **PNG export** with options: scale, transparent background, grid on/off, baked lighting (#2).
- **JSON export/import** of the raw `MapDocument` — share maps, back them up, version them in git.
- **Game-engine formats** (Tiled `.tmx`, Godot) — longer term.

**Why:** Right now maps live only in browser localStorage (~5–10MB, lost if cleared). Export makes the tool actually usable for real projects. `mapStore` already mentions PNG export options — flesh this out.

---

## 🪣 5. Fill Tool (flood fill)

**The idea:** The `fill` tool already exists in the `ToolType` union and toolbar but isn't implemented. Bucket-fill a contiguous region of same-type tiles.

**Why:** Low-hanging fruit — the plumbing (tool selection, cursor) is there; it needs a `handleFillTool` in `useCanvasEvents.ts` doing a BFS/DFS over `getTileAt()`/`getNeighbors()`, bounded to the region and wrapped in one undoable action.

---

## 📦 6. Prop Library Expansion & Data-Driven Props

**The idea:** Move props from the hardcoded `PROP_DEFINITIONS` object to the same manifest-driven loader the tiles use (`props/manifest.json` → per-folder `props.json`). Add categories, tags, themes (feeds #1), and a searchable/filterable prop browser.

**Why:** Only two props exist today (`fence`, `stone`), hardcoded. The room populator (#1) and a generally useful editor need a real, extensible asset library that non-coders can extend by dropping files in a folder.

---

## 🧩 7. Reusable Stamps / Prefabs

**The idea:** Select a group of tiles + props, save it as a named "stamp" (e.g. "campfire circle", "well", "market stall"), and re-stamp it anywhere.

**Why:** Complements the room populator with hand-authored building blocks. Users craft the perfect little scene once and reuse it. Stored alongside maps; a stamp is essentially a mini `MapDocument` fragment.

---

## 🗺️ 8. Minimap & Navigation

**The idea:** A small overview panel showing the whole map with a viewport rectangle; click/drag to jump around.

**Why:** Panning a large map by space-drag alone gets tedious. Reads directly from the tile maps and `viewportStore` — mostly a rendering concern.

---

## ✨ 9. Quality-of-Life Batch

Small wins that make daily editing pleasant:
- **Copy/paste** selected tiles & props (Ctrl+C / Ctrl+V).
- **Right-click context menu** on the canvas (delete, duplicate, send to front/back).
- **Keyboard tool switching** (B brush, E eraser, G already grid — add tool hotkeys).
- **Tile/prop rotation & flip** during placement.
- **Grid snap toggle** for props (free vs. snapped placement).
- **Map resize** after creation (currently fixed at create time).
- **Named layers with opacity** sliders.

---

## 🌫️ 10. Weather & Ambient Effects (stretch)

**The idea:** Overlay animated ambient effects — falling rain/snow, drifting fog, floating dust motes — as a layer above lighting. Pairs with #2 to complete the "atmosphere" story.

**Why:** Pure mood. A foggy graveyard or snowy pass sells a scene instantly. Implemented as a particle overlay on its own Konva layer, toggleable, and baked optionally on export.

---

### Suggested near-term order

1. **Fill tool** (#5) — quick, unblocks a half-built feature.
2. **Prop library expansion** (#6) — prerequisite for the room populator.
3. **Room Populator** (#1) — your headline feature.
4. **Dynamic Lighting** (#2) — your second headline feature, biggest visual payoff.
5. Everything else as appetite allows.

---

*Add ideas freely. Keep entries grounded in the actual stores/layers so they stay implementable.*
