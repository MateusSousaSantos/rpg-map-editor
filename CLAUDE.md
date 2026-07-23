# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # TypeScript check + Vite production build
npm run lint     # ESLint
npm run preview  # Serve production build locally
```

No test suite is configured.

## Architecture

**Stack:** React 19 + TypeScript (strict), Vite, Zustand + Immer, Konva/react-konva, Tailwind CSS 4, React Router 7.

### State — six Zustand stores

| Store | Responsibility |
|---|---|
| `mapStore` | Map document, tile/prop CRUD, layer management, localStorage persistence |
| `toolStore` | Active tool, selected tile/prop definition, brush settings |
| `uiSelectionStore` | Selected tile/prop IDs (Sets), active layer, grid visibility |
| `viewportStore` | Pan (x, y) and zoom (0.1–5×) |
| `historyStore` | Undo/redo action log (max 50, branching) |
| `textureCache` | Memoized Konva Image objects |

All stores use Immer middleware. The `enableMapSet()` call in `main.tsx` is required for Immer to handle `Map`/`Set` inside state.

### Tile storage — dual-map pattern

Each layer holds tiles in two parallel maps:
```ts
layer.tiles:     Map<"x,y,type", TileInstance>  // spatial lookup for placement
layer.tilesById: Map<string,     TileInstance>  // id lookup for selection/deletion
```
Both maps must be kept in sync on every mutation.

### Canvas

`MapCanvas.tsx` mounts a Konva `Stage`. Four child layers render independently:
- `BackgroundLayer` — grid
- `TileLayer` — terrain / wall / overlay tiles as `Rect` nodes
- `PropLayer` — props as `Image` nodes
- `CursorLayer` — active-tool preview

### Coordinate systems

Three systems used throughout canvas code:
1. **Screen** — raw mouse event pixels (viewport-relative)
2. **Grid** — tile-aligned `{ gridX, gridY }` (used for `TileInstance` placement)
3. **World** — pixel position within the map (used for `PropInstance` free positioning)

Conversion helpers live in `useCanvasEvents.ts`: `screenToGrid()` and `screenToWorld()`.

### Interaction

`useCanvasEvents.ts` handles all mouse events on the Stage and dispatches to per-tool handlers (`handleBrushTool`, `handleEraserTool`, etc.). Keyboard shortcuts are in `useKeyboardShortcuts.ts`.

### Tile definitions

Loaded at startup by `loadTileDefinitions()` in `utils/tilesdefinition.ts`:
1. Fetch `/public/tilesets/manifest.json` for folder list
2. Fetch `tiles.json` inside each folder for tile metadata and texture paths

Prop definitions are currently hardcoded in `tilesdefinition.ts` as `PROP_DEFINITIONS`.

### Undo/redo

Actions are plain objects implementing `applyAction()` / `reverseAction()`. `historyStore.addAction()` appends and truncates redo history on new actions after an undo.
