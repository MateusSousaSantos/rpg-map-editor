# Dynamic Lighting Engine — Handoff

This document is a self-contained brief so a local Claude Code agent (or you) can
continue the work. It covers the goal, the locked design decisions, exactly what
is already built (Phase 1), and the concrete next steps (Phase 2–4).

---

## Goal

Add a dynamic lighting engine to the RPG map editor (ROADMAP.md #2): darkness by
default, colored lights that reveal the scene, props sculpted by light via
**normal maps**, and **shadows cast by walls and props**. Multiple light shapes,
easy to edit following the app's existing patterns, **baked on change (not per
frame)** — it does not need to re-render every frame.

## Locked design decisions (from the user)

- **Renderer:** WebGL lighting pass (highest fidelity: per-pixel normals, soft
  shadows, many lights). Encapsulated in one standalone module so the rest of the
  app keeps its current patterns.
- **Normals:** auto-derive from each sprite's **alpha silhouette** (bevel →
  normal), with an optional authored `normalMapUrl` override per prop.
- **Shadows:** cast by **walls + props**.
- **Shapes:** point/radial, spot/cone, area/rectangular, and a map-level global
  **ambient/sun**.

## Key architecture facts (why the renderer is built the way it is)

- Tiles render to a **native 2D canvas** (`src/hooks/useNativeCanvasTiles.ts`)
  shown as one `Konva.Image`. Props are **live interactive Konva `Image` nodes**
  (`src/components/Canvas/PropLayer.tsx`). The grid is a baked offscreen canvas
  (`src/components/Canvas/BackgroundLayer.tsx`).
- **Konva blend modes only composite within a single Konva layer.** A separate
  light layer can NOT blend against the layers beneath it. The established pattern
  is: **bake to an offscreen canvas, show it as one `Konva.Image`.**
- **PNG export is a fully separate hand-rolled 2D-canvas path**
  (`src/utils/exportMap.ts`, `drawTile`/`drawProp`) — no `stage.toDataURL()`.
  Lighting must be applied on BOTH paths, so the WebGL engine must be a standalone
  module both the live layer and the export path call.
- Prop world rect (for occluders/normals): origin `(prop.x, prop.y)` is
  **top-left** in the render path but **center** in `isPointInProp`
  (`src/utils/props.ts`). Reconcile to ONE convention in the buffer builder or
  shadows/normals will be offset. Prop size on screen =
  `definition.width*scaleX × definition.height*scaleY`.

---

## Phase 1 — DONE (commit `0588e47` on branch `feature/dynamic-lighting`)

The full editing foundation + a Konva placeholder renderer. Builds clean
(`npm run build`), verified in-browser. 17 files, +1187/−18.

Lights are placeable instances following the exact prop pattern: tool → instance
→ inspector → history. The placeholder renders every light as a soft radial pool
(all shapes look the same for now) and has no normal mapping or shadows yet — that
is Phase 2–4.

### Files changed/added in Phase 1
- `src/types/map.ts` — `LightType` (`'point'|'spot'|'area'`), `LightInstance`
  (center-anchored x/y, color, intensity, radius, z, angle, coneAngle, width,
  height, castsShadows, flicker, zIndex, visible, locked), `LightingConfig`
  (enabled, ambientColor, ambientIntensity, optional sun{angle,color,intensity});
  `lights: LightInstance[]` on `MapLayer` + `SerializedMapLayer`; `lighting?` on
  `MapDocument` + `SerializedMapDocument`; `normalMapUrl?` on `PropDefinition`;
  `ADD_LIGHT`/`REMOVE_LIGHT`/`UPDATE_LIGHT` in the `MapAction` union.
- `src/stores/mapStore.ts` — `addLight`/`removeLight`/`updateLight`/`getLight`
  (mirror the prop CRUD incl. `savedMaps` re-sync), `updateLighting`, `lights: []`
  in the default layer, and `lights` backfill in `loadMapById` + both rehydration
  paths (so older saved maps don't crash).
- `src/stores/toolStore.ts` — `'place-light'` in `ToolType`; `selectedLightType`
  + `setSelectedLightType`.
- `src/stores/uiSelectionStore.ts` — `'lights'` selection mode;
  `selectedLightIds`; `selectLights`/`deselectLight`/`clearLightSelection`/
  `toggleLightSelection`; `selectedLightIds` cleared in `clearSelection`.
- `src/stores/historyStore.ts` — `ADD/REMOVE/UPDATE_LIGHT` in `applyAction` and
  `reverseAction`.
- `src/utils/lights.ts` (new) — `createLight(type,x,y,zIndex,tileSize)` with
  per-type defaults, `getNextLightZIndex`, `findLightsAtPosition` (handle-radius
  hit test), `LIGHT_HANDLE_RADIUS`.
- `src/hooks/useCanvasEvents.ts` — `handlePlaceLightTool` (records `ADD_LIGHT`),
  `case 'place-light'` in BOTH the mouse and touch switches, and light
  pick-priority in `handleSelectionTool` (uses `LIGHT_HANDLE_RADIUS / zoom` for a
  constant on-screen pick radius).
- `src/components/Toolbar/ToolDock.tsx` — ☀ Light tool button (toggles
  `place-light`).
- `src/components/RightPanel/LightInspector.tsx` (new) — mirrors `PropInspector`;
  edits type/color/x/y/intensity/radius/elevation, spot angle+cone, area w/h,
  castsShadows, flicker, visibility/lock; delete records `REMOVE_LIGHT`; all edits
  record `UPDATE_LIGHT`.
- `src/components/RightPanel/EnvironmentSection.tsx` (new) — map-wide ambient
  color, darkness (=1−ambientIntensity), sun toggle+angle+color+intensity, and the
  "new light shape" picker. Writes via `updateLighting`. Not recorded in history
  (like map-metadata edits).
- `src/components/RightPanel/ContextBody.tsx` — routes `selectionMode==='lights'`
  → `LightInspector`.
- `src/components/RightPanel/RightPanel.tsx` — mounts `EnvironmentSection`.
- `src/components/RightPanel/LayersSection.tsx` — new layers get `lights: []`.
- `src/components/Canvas/MapCanvas.tsx` — mounts `<LightLayer editable={editable}/>`
  between the per-layer map layers and `CursorLayer`.
- `src/components/Canvas/LightLayer.tsx` (new) — PLACEHOLDER: a non-interactive
  Konva `Layer` (darkness `Rect` + per-light `destination-out` reveal + `lighten`
  glow) plus an interactive `Layer` of draggable handles (drag records
  `UPDATE_LIGHT`). This is the file Phase 2 mostly replaces.
- `src/i18n/en.ts`, `src/i18n/pt.ts` — `tools.light` + a `light.*` namespace.

### How to apply Phase 1 locally
Easiest is the **zip of the 17 files** (sent in chat): from the repo root,
`unzip -o dynamic-lighting-files.zip`, then FULLY restart `npm run dev` (new files
+ store changes don't hot-reload reliably), then hard-refresh the browser.
Verify with `ls src/utils/lights.ts src/components/Canvas/LightLayer.tsx`.
Alternatively `git am 0001-*.patch` or `git pull dynamic-lighting-full.bundle
feature/dynamic-lighting` — but those require your local `main` to be at
`9a3890a` ("update props for dataDrive store system…"); if it isn't, they apply
nothing, which is the most likely reason the earlier attempts showed no changes.

### Verify Phase 1 UI (with a map open, at /app)
- ☀ icon in the left tool dock (below the fill/bucket icon).
- "Lighting & Atmosphere" section in the right panel (collapsed; click to expand).
- Light tool → click canvas to place; drag handle to move; select tool → click a
  handle to edit in the inspector; enable lighting + raise Darkness to see pools;
  Ctrl+Z undoes placement/edits/deletes.

---

## Phase 2–4 — TODO (the WebGL engine)

Keep the Phase 1 editing scaffolding and the handle layer; replace only the
composite pass. Build the engine as a standalone module reused by both the live
`LightLayer` and `exportMap.ts`.

### Phase 2 — WebGL engine (replace the placeholder composite) — DONE

Implemented on `feature/dynamic-lighting`. Builds clean (`npm run build`); dev
server boots clean. The Konva placeholder composite is gone; the map is now
relit by a real WebGL2 pass baked to one `Konva.Image`.

**Scope shipped:** point lights + global ambient, normal-mapped diffuse (`N·L`),
no shadows and no spot/area/sun branches yet. A slight resequencing vs. the
original plan (documented so Phase 3 knows the seams):
- `deriveNormalFromAlpha` is **built** (`normals.ts`) but the normal buffer is
  currently filled **flat** `(0,0,1)`; per-prop stamping is wired as a marked
  TODO in `buffers.ts` and moves to Phase 3 (avoids the pivot-reconciliation risk
  before shadows exist to validate it).
- The **occluder mask is deferred to Phase 3** (it's only consumed by the shadow
  raymarch, which doesn't exist yet — building it now is dead per-bake work).

**Files added/changed:**
- `src/utils/lighting/normals.ts` (new) — `deriveNormalFromAlpha(image, cacheKey)`
  → normal canvas (alpha central-difference gradient → outward bevel, `nz` from
  remainder), cached by URL. `FLAT_NORMAL_RGB` + `clearNormalCache` helpers.
- `src/utils/lighting/buffers.ts` (new) — `buildLightingBuffers(map, scale,
  getTexture)` → `{ albedo, normal, width, height }` for the **whole map**. Albedo
  is painted by the shared `paintMapLayers`; normal is a flat fill (see TODO for
  Phase 3 stamping).
- `src/utils/exportMap.ts` — extracted the per-layer tile+prop draw loop into an
  exported `paintMapLayers(ctx, map, scale, getTexture)`; `exportMap` now calls
  it. Single source of truth for "unlit map" shared by export + lighting.
- `src/utils/lighting/engine.ts` (new) — **one persistent** WebGL2 context/canvas
  reused across bakes. `renderLighting({albedo, normal, width, height, scale,
  ambientColor, ambientIntensity, lights}) → canvas`. `MAX_LIGHTS=64`, dynamic
  loop, quadratic falloff, `N·L` with per-light `z`. `hexToRgb01` helper.
  NOTE: `UNPACK_FLIP_Y_WEBGL` is **false** on purpose — the vertex shader maps
  clip-top→`uv.y=0` and the framebuffer presents row 0 at the bottom, so no flip
  keeps the overlay upright and light coords aligned. Don't "fix" it to true.
- `src/components/Canvas/LightLayer.tsx` — placeholder replaced. Full-map bake at
  `scale=1` into one `Konva.Image` (`listening={false}`, world `0,0`,
  `mapPixel W×H`). Debounced (80 ms) bake keyed on `map` + `textureCache.textures`
  (late-loading sprites rebake). Overlay hidden during any stage drag
  (`dragstart/dragend.lighting`), rebakes on drop. Interactive handle layer kept.
  Textures load with `crossOrigin='anonymous'` (textureCache) so `texImage2D`
  doesn't taint the canvas.

**Not yet verified in-browser** (compile + boot only): open a map, enable
lighting, raise darkness, place point lights, confirm the lit pools render right
side up and aligned, and that pan/zoom + undo behave. If the overlay is
upside-down, flip `FLIP_Y` in `engine.ts` (the one intended toggle point).

### Phase 3 — normals, shadows, remaining shapes
- Stamp per-prop normals into the normal buffer (in `buffers.ts`, at the marked
  TODO) using `deriveNormalFromAlpha` + the authored `normalMapUrl` override;
  transform each stamp to match `drawProp`'s placement (watch the top-left pivot).
  Give wall tiles beveled face normals. The shader already samples the normal
  buffer and does `max(0, N·L)` with the light's `z`, so once the buffer carries
  real normals props become sculpted with no shader change.
- Build the **occluder mask** buffer here (deferred from Phase 2): walls as full
  squares + prop silhouettes from alpha; add it to `LightingBuffers` and upload
  it as a third texture in `engine.ts`.
- Shadow term: raymarch the occluder mask from each pixel toward the light (soft
  via multi-tap); honor per-light `castsShadows`.
- Add `spot` (direction `angle` + `coneAngle` falloff), `area` (rect emitter via
  `width`/`height`), and `sun` (global directional from
  `MapDocument.lighting.sun`) branches. Cap light count (~64) and cull offscreen
  lights before upload.

### Phase 4 — export bake + polish
- `src/utils/exportMap.ts` — after layers are composited (~line 136), build
  full-map normal/occluder buffers, run `renderLighting`, draw the lit result.
  Gate on a new `ExportPNGOptions.bakeLighting`; add the toggle to
  `src/components/ExportModal/ExportModal.tsx`.
- Polish: light presets ("torch/candle/moonlight/lava"); optional flicker (an
  rAF that only updates intensity uniforms and reruns the cheap shader; respect
  `prefers-reduced-motion`; disable for export); a light-tool hotkey in
  `src/hooks/useKeyboardShortcuts.ts`.

### Risks / watch-outs
- Keep the live WebGL path and the export path in sync via the single engine
  module — verify parity visually.
- Reconcile the top-left vs center prop pivot in the buffer builder.
- Don't drift into per-frame rendering; only flicker is allowed an rAF.
- Auto-normals look great on rounded sprites, flat on hard-edged ones — the
  authored `normalMapUrl` is the escape hatch.

### Verify (end to end)
`npm run build` (tsc + vite) clean; place point/spot/area lights and confirm each
is editable + undoable; toggle darkness/ambient/sun; place a prop between a light
and open floor to see a shadow that rebakes on drop; confirm props look sculpted
without authored maps, then drop a `*_n.png` + `normalFile` in a prop's
`props.json` and confirm the authored map is used; pan/zoom rebakes; export with
"bake lighting" carries the atmosphere.
