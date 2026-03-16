# RPG Map Editor - Project Rundown

**Last Updated:** March 12, 2026  
**Project Version:** 0.0.0 (Early Development)

---

## 📋 Project Overview

**RPG Map Editor** is a web-based tile and prop placement application for creating 2D RPG maps. It provides an intuitive editor interface for placing terrain tiles, walls, overlays, and decorative props on a grid-based canvas with layer management, undo/redo functionality, and real-time editing.

**Current Status:** Phase 3 - Core demo with essential editing tools

---

## 🛠️ Technology Stack

### Core Framework
- **React** 19.2.0 - UI framework
- **TypeScript** ~5.9.3 - Static type checking
- **Vite** 7.2.4 - Build tool and dev server

### Canvas & Graphics
- **Konva** 10.0.11 - 2D canvas framework
- **react-konva** 19.2.0 - React bindings for Konva
- **use-image** 1.1.4 - Image loading hook

### State Management
- **Zustand** 5.0.9 - Lightweight state management library
- **Immer** 11.1.3 - Immutable state updates with Immer middleware
- **@tailwindcss/vite** 4.1.17 - Tailwind CSS integration

### UI & Styling
- **Tailwind CSS** 4.1.17 - Utility-first CSS framework
- **react-icons** 5.5.0 - Icon library
- **PostCSS** 8.5.6 - CSS transformation

### Routing & Navigation
- **react-router-dom** 7.12.0 - Client-side routing

### Drag & Drop (Pre-installed, not currently used)
- **@dnd-kit/core** 6.0.8
- **@dnd-kit/sortable** 7.0.2
- **@dnd-kit/utilities** 3.2.1

### Development Tools
- **ESLint** 9.39.1 - Code linting
- **TypeScript ESLint** 8.46.4 - TypeScript linting
- **@vitejs/plugin-react** 5.1.1 - React fast refresh
- **Vercel Speed Insights** 1.3.1 - Performance monitoring

### Development Dependencies
- TypeScript types for React, Node.js, and React DOM
- Autoprefixer 10.4.22 - CSS vendor prefixing

---

## 🏗️ Architecture Decisions

### 1. **Zustand for State Management**
- **Why:** Lightweight alternative to Redux, simpler boilerplate
- **How:** Multiple focused stores (mapStore, toolStore, uiSelectionStore, viewportStore, historyStore)
- **Pattern:** Immer middleware for immutable updates with Map/Set support
- **Persistence:** LocalStorage integration for map persistence

### 2. **Layer-Based Canvas Architecture**
```
MapCanvas (Konva Stage)
├── BackgroundLayer (Grid)
├── TileLayer (Terrain, Walls, Overlays)
├── PropLayer (Decorative objects)
└── CursorLayer (Tool preview)
```
- **Rationale:** Clear separation of concerns, efficient rendering, independent layer management
- **Performance:** Each layer rendered separately with Konva Groups

### 3. **Grid-Based Tile System**
- **Tiles:** Grid-aligned (0,0), fixed size, organized by type (terrain/wall/overlay)
- **Props:** Free-positioned (pixel-perfect), with width/height, rotation, scale, z-index
- **Separation:** Tiles stored as `Map<"x,y,type", TileInstance>` for O(1) lookups
- **Overflow Tiles:** Support for automatic "overflow" tiles (e.g., roof overhang) based on adjacent placements

### 4. **Dual Storage Pattern for Tiles**
```typescript
tiles: Map<string, TileInstance>    // Key: "x,y,type" for spatial lookups
tilesById: Map<string, TileInstance> // Key: tile.id for ID-based operations
```
- **Why:** Both spatial and ID-based access needed for different operations
- **Performance:** O(1) lookups in both directions

### 5. **Tool-Based Interaction Model**
- **Active Tool:** Single active tool at a time (brush, eraser, select, pan, box, place-prop, fill)
- **Context-Aware:** Tool behavior depends on selected tile definition or prop definition
- **State:** Tool state stored separately from map data (no pollution of core map structure)

### 6. **Undo/Redo with History Stack**
- **Pattern:** Linear timeline with branching support
- **Mechanism:** Store `MapAction` objects, replay on undo/redo
- **Limit:** Max 50 actions in history to prevent memory bloat
- **Timeline:** Branching when new action added after undo

### 7. **React Router for Navigation**
- **Routes:**
  - `/` - Home page (map creation/loading)
  - `/app` - Editor page
- **Why:** Clean separation between map selection and editing contexts

### 8. **Konva for Canvas Rendering**
- **Why:** Abstraction over raw Canvas API, event handling, transformation support
- **Features Used:** Stage, Layer, Group, Rect (tiles), Image (props), event system
- **Performance:** Native canvas rendering, batch updates

---

## 📁 Project Structure

```
rpg-map-editor/
├── src/
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── MapCanvas.tsx          # Root canvas container, Stage management
│   │   │   ├── BackgroundLayer.tsx    # Grid rendering
│   │   │   ├── TileLayer.tsx          # Tile rendering (terrain/wall/overlay)
│   │   │   ├── PropLayer.tsx          # Prop rendering
│   │   │   └── CursorLayer.tsx        # Tool cursor preview
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx            # Main sidebar container
│   │   │   ├── LayersPanel.tsx        # Layer management
│   │   │   ├── TilesPanel.tsx         # Tile selection
│   │   │   └── PropsPanel.tsx         # Prop selection
│   │   ├── PropsHierarchy/            # Left panel prop display
│   │   ├── Toolbar/                   # Top toolbar
│   │   ├── ErrorBoundary.tsx          # React error boundary
│   │   └── (other components)
│   │
│   ├── stores/
│   │   ├── mapStore.ts                # Core map data (tiles, props, layers)
│   │   ├── toolStore.ts               # Active tool + selections
│   │   ├── uiSelectionStore.ts        # UI state (selected items, grid visibility)
│   │   ├── viewportStore.ts           # Viewport (pan, zoom)
│   │   ├── historyStore.ts            # Undo/redo system
│   │   ├── textureCache.ts            # Image caching
│   │   └── index.ts                   # Store exports
│   │
│   ├── hooks/
│   │   ├── useCanvasEvents.ts         # Canvas interaction handlers
│   │   ├── useKeyboardShortcuts.ts    # Keyboard bindings
│   │   └── useNativeCanvasTiles.ts    # Native canvas tile rendering (optional)
│   │
│   ├── types/
│   │   └── map.ts                     # Core type definitions
│   │
│   ├── utils/
│   │   ├── props.ts                   # Prop helpers (create, find, z-index)
│   │   ├── tilesdefinition.ts         # Tile asset initialization
│   │   └── testHelpers.ts             # Testing utilities
│   │
│   ├── pages/
│   │   ├── Home.tsx                   # Map creation/loading page
│   │   └── App.tsx                    # Editor page
│   │
│   ├── main.tsx                       # React entry point
│   ├── index.css                      # Global styles
│   └── assets/                        # Static assets
│
├── public/
│   ├── props/                         # Prop textures
│   └── tilesets/
│       ├── terrain/                   # Terrain tile textures
│       │   ├── grass/
│       │   ├── sand/
│       │   ├── water/
│       │   └── wood/
│       └── wall/                      # Wall tile textures
│           └── wood/
│
├── package.json                       # Dependencies
├── vite.config.ts                     # Vite configuration
├── tsconfig.json                      # TypeScript configuration
├── eslint.config.js                   # ESLint configuration
└── index.html                         # HTML entry point
```

---

## 🎯 Core Systems

### 1. **Map Store (mapStore.ts)**
- **Responsibilities:**
  - Central map document state
  - Layer management (add, remove, reorder)
  - Tile operations (place, remove, query by position/type)
  - Prop operations (add, remove, modify)
  - Tile/Prop definitions (asset library)
  - PNG export options

- **Key Methods:**
  - `createMap()` - Initialize new map with dimensions
  - `addTile()`, `removeTile()`, `updateTile()` - Tile manipulation
  - `addProp()`, `removeProp()` - Prop manipulation
  - `getTileAt()`, `getNeighbors()` - Spatial queries
  - `addLayer()`, `reorderLayers()` - Layer management
  - `saveMap()`, `loadMapById()` - Persistence

- **Middleware:** Immer for immutable updates

### 2. **Tool Store (toolStore.ts)**
- **State:**
  - `activeTool` - Current tool (brush, eraser, fill, select, pan, box, place-prop)
  - `selectedTileDefinitionId` - Which tile type is selected
  - `selectedTileGridType` - Tile category (terrain/wall/overlay)
  - `selectedPropDefinitionId` - Which prop is selected
  - `brushSize` - For future multi-tile brush support

- **Interaction:** Updates on toolbar button clicks, disables when no definition selected

### 3. **UI Selection Store (uiSelectionStore.ts)**
- **State:**
  - `selectedTileIds` - Currently selected tiles
  - `selectedPropIds` - Currently selected props
  - `selectedLayerId` - Active layer
  - `showGrid` - Grid visibility toggle
  - `sidebarOpen` - Sidebar visibility (touch screen support)

- **Pattern:** Set-based selections for efficient multi-select

### 4. **Viewport Store (viewportStore.ts)**
- **State:**
  - `panX`, `panY` - Camera translation
  - `zoom` - Zoom level (0.1 to 5.0 typical)

- **Features:** Pan, zoom, reset view, fit to bounds

### 5. **History Store (historyStore.ts)**
- **Pattern:** Command/Action pattern
- **Max Size:** 50 actions (configurable)
- **Features:**
  - `addAction()` - Log an action, clear redo history if branching
  - `undo()`, `redo()` - Navigate timeline
  - `canUndo()`, `canRedo()` - Check availability
  - Prevents redo after new action following undo

### 6. **Canvas Events Hook (useCanvasEvents.ts)**
- **Responsibilities:**
  - Convert screen coordinates to grid/world coordinates
  - Handle tool interactions (brush, eraser, fill, select, box paint)
  - Validate bounds checking
  - Multi-selection support (Shift + click)
  - Box painting preview
  - Prop placement

- **Key Functions:**
  - `screenToGrid()` - Screen → grid transformation
  - `screenToWorld()` - Screen → pixel position
  - `handleBrushTool()`, `handleEraserTool()`, etc.
  - `handleMouseDown()`, `handleMouseMove()`, `handleMouseUp()`

---

## 🎨 Key Features

### Implemented
- ✅ **Tile Painting** - Brush tool with multiple tile types (terrain, walls, overlays)
- ✅ **Tile Erasing** - Remove tiles with eraser tool
- ✅ **Layer Management** - Create, hide, lock, reorder layers
- ✅ **Prop Placement** - Free-positioned decorative objects
- ✅ **Viewport Controls** - Pan (space + drag), zoom (mouse wheel, +/- keys), reset (Ctrl+0)
- ✅ **Grid Display** - Toggle grid visibility (G key)
- ✅ **Selection Tool** - Select individual or multiple tiles/props
- ✅ **Box Painting** - Drag to paint rectangular area
- ✅ **Undo/Redo** - Full undo/redo history with branching
- ✅ **Sidebar Panels** - Tile selection, prop selection, layers panel
- ✅ **Cursor Preview** - Show which tile will be placed before clicking
- ✅ **Map Persistence** - Save/load maps to localStorage

### In Development/Planned
- 🚧 Fill tool (flood fill)
- 🚧 Advanced autotiling system
- 🚧 Export to PNG
- 🚧 Export to game engines
- 🚧 Keyboard shortcuts (partial)
- 🚧 Asset/texture editor
- 🚧 Multi-user collaboration
- 🚧 Performance optimizations for very large maps

---

## 🔄 Data Flow

### Tile Placement Workflow
```
User clicks on canvas
  ↓
useCanvasEvents → screenToGrid()
  ↓
Calculate grid position from screen coordinates
  ↓
Validate: in bounds? tool ready? definition selected?
  ↓
mapStore.addTile(layerId, tileInstance)
  ↓
Store updates local state + creates overflow tiles if needed
  ↓
Layer updates: tiles Map + tilesById Map
  ↓
React re-renders TileLayer component
  ↓
Konva renders updated tile positions on canvas
```

### State Update Pattern (Zustand + Immer)
```typescript
set((state) => {
  // Immer handles Map/Set mutations safely
  state.map.layers[0].tiles.set("0,0,terrain", newTile)
  // Looks like mutation, but creates new immutable state
})
```

---

## 🎮 Tool System

| Tool | Action | Icon | Selection |
|------|--------|------|-----------|
| **Brush** | Place tiles | FiEdit2 | Requires tile definition |
| **Eraser** | Remove tiles | FiTrash2 | None required |
| **Select** | Select tiles/props | FiMousePointer | Adds to toolStore |
| **Box** | Paint rectangular area | FiSquare | Requires tile definition |
| **Place Prop** | Place decorative objects | (custom) | Requires prop definition |
| **Pan** | Move viewport | (space bar) | None required |
| **Fill** | Flood fill area | (planned) | Requires tile definition |

---

## ⌨️ Keyboard Shortcuts

| Key(s) | Action |
|--------|--------|
| `+` / `=` | Zoom in |
| `-` / `_` | Zoom out |
| `Ctrl+0` | Reset view |
| `G` | Toggle grid |
| `Space + Drag` | Pan viewport |
| `Shift + Click` | Multi-select |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |

---

## 🗂️ Type System (types/map.ts)

### Core Interfaces
```typescript
// Tile Definitions (Templates)
BaseTileDefinition          // What a tile IS
OverlayTileDefinition       // Special overlay tile
OverflowTileDefinition      // Auto-placed tile
AutotileRule                // Autotiling configuration

// Tile Instances (In-Map)
TileInstance               // Actual tile placed on map

// Props (Templates)
PropDefinition             // What a prop IS

// Props (In-Map)
PropInstance               // Actual prop placed on map

// Layers
MapLayer                  // Container for tiles + props

// Document
MapDocument               // Complete map file
MapAction                 // History action

// Enums
TileType = 'terrain' | 'wall' | 'overlay' | 'overflow'
Direction = 'top' | 'right' | 'bottom' | 'left' | etc.
ToolType = 'brush' | 'eraser' | 'fill' | 'place-prop' | 'select' | 'pan' | 'box'
```

---

## 🚀 Build & Development

### Scripts
```bash
npm run dev        # Start development server (Vite)
npm run build      # Build for production (TypeScript + Vite)
npm run lint       # Run ESLint
npm run preview    # Preview production build locally
```

### Development Workflow
1. **Hot Module Replacement (HMR)** - Vite enables instant updates
2. **Type Checking** - TypeScript compilation during build
3. **CSS Processing** - Tailwind CSS with PostCSS
4. **Asset Serving** - Static assets from `/public` directory

---

## 📊 Component Hierarchy

```
App.tsx (Main editor page)
├── PropsHierarchy (Left sidebar - prop browser)
├── MapCanvas
│   ├── Stage (Konva)
│   ├── BackgroundLayer (Grid)
│   ├── TileLayer
│   │   ├── Group (per tile type)
│   │   └── Rect (visual representation)
│   ├── PropLayer
│   │   ├── Group (per prop)
│   │   └── Image (prop texture)
│   └── CursorLayer (Tool preview)
└── Sidebar
    ├── LayersPanel
    │   └── LayerItem (draggable list)
    ├── TilesPanel
    │   └── TileSelector
    └── PropsPanel
        └── PropSelector
```

---

## 💾 Persistence Strategy

### LocalStorage Serialization
- Maps stored in browser localStorage
- Uses Zustand's `persist` middleware
- Automatic saving on state changes
- Loads persisted state on app start

### Limitations
- Limited storage (~5-10MB per domain depending on browser)
- No backend sync
- Data lost if browser storage cleared

### Future: Planned Export Formats
- PNG export (with options for scale, transparency, grid overlay)
- JSON export (raw map data)
- Game engine exports (Tiled, Godot, Unity formats)

---

## 🔍 Asset Management

### Tile Definitions Initialization (tilesdefinition.ts)
- Loads tile metadata from `/public/tilesets/`
- Registers textures with texture cache
- Supports multiple categories: terrain, wall, overlay
- Fallback texture loading

### Texture Cache (textureCache.ts)
- Prevents duplicate image loads
- Caches Konva Image objects
- Improves performance on repeated tile types

### Directory Structure
```
public/tilesets/
├── terrain/
│   ├── grass/      → texture files
│   ├── sand/
│   ├── water/
│   └── wood/
└── wall/
    └── wood/
```

---

## ⚙️ Configuration Files

### vite.config.ts
- React plugin for JSX/TSX
- Tailwind CSS plugin for CSS processing

### tsconfig.json
- Strict mode enabled
- Module system: ES modules
- Target: ES2020+
- JSX: react-jsx

### eslint.config.js
- Global environment setup
- React Hooks linting
- React Refresh plugin

---

## 🐛 Error Handling

- **ErrorBoundary** component (React error boundary)
- Console warnings for:
  - Missing tile definitions
  - Missing prop definitions
  - Overflow tile calculation issues
  - Out-of-bounds operations

### Future Improvements
- User-facing error notifications
- Map validation on load
- Corruption recovery

---

## 📈 Performance Considerations

### Current Optimizations
- O(1) tile lookups via Map with "x,y,type" key
- Separate tiles/tilesById maps for dual access patterns
- Konva batch updates reduce redraws
- Layer separation prevents full-canvas redraws
- Texture caching prevents duplicate image loads
- History size limited to 50 actions

### Potential Bottlenecks
- Very large maps (1000+ x 1000+ tiles) may need optimization
- Many props with large textures
- Frequent undo/redo on large maps
- Pan/zoom with many visible elements

### Planned Optimizations
- Quadtree spatial partitioning for large maps
- Layer rendering optimization (only render visible area)
- Web Workers for heavy calculations
- Texture atlas creation for tiles

---

## 🔐 Git History

⚠️ **Note:** Git history information unavailable - `.git` folder not accessible in current context.  
To view commit history:
```bash
cd c:\Users\Pedro\Desktop\Programing\rpg-map-editor
git log --oneline
git log --graph --all --decorate
```

---

## 📝 Code Style & Conventions

### Naming
- **PascalCase:** React components, Stores, Classes, Types
- **camelCase:** Functions, variables, hook functions
- **UPPER_SNAKE_CASE:** Constants

### Comments
- Section headers with `// ============================================================================`
- JSDoc comments for complex functions
- Describe "why" not just "what"

### TypeScript
- Export types alongside implementations
- Use `interface` for object shapes
- Use `type` for unions/aliases
- Generic parameters when needed

### Organization
- Separate concerns into different files
- Group related functionality in folders
- Barrel exports (index.ts) for clean imports

---

## 🎓 Learning Resources for Future Development

### Key Concepts to Understand
1. **Zustand State Management** - Store slicing, middleware patterns
2. **Immutable State Updates** - Why Immer is needed
3. **Canvas Coordinate Systems** - Screen vs world vs grid
4. **Z-Index and Layer Ordering** - Rendering pipeline
5. **Spatial Data Structures** - Maps vs quadtrees for lookups
6. **React Hooks** - useCallback, useEffect cleanup, ref management
7. **Konva API** - Stage, Layer, Group, Image, rect primitives

### Recommended Reading
- Zustand Documentation: https://github.com/pmndrs/zustand
- Konva Documentation: https://konva.js.org/
- React Documentation: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/

---

## 📞 Development Notes

### Quick Start for New Developers
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Open http://localhost:5173
4. Create a map on home page
5. Start painting tiles!

### Common Tasks
- **Add new tool:** Edit `toolStore.ts`, add handler in `useCanvasEvents.ts`
- **Add new tile type:** Add to `/public/tilesets/`, register in `tilesdefinition.ts`
- **Modify keyboard shortcuts:** Edit `useKeyboardShortcuts.ts`
- **Fix a bug:** Use browser DevTools + check console for errors

### Debugging Tips
- Check browser console for warnings/errors
- Use Redux DevTools for Zustand (extension available)
- Inspect Konva stage with `window.__KONVA__`
- Check localStorage for persisted map data

---

## ✨ Project Highlights

✅ **Clean Architecture** - Clear separation between UI, state, and domain logic  
✅ **Type-Safe** - Full TypeScript coverage reduces bugs  
✅ **Responsive Design** - Tailwind CSS ensures mobile compatibility  
✅ **Efficient Rendering** - Konva + layer system = smooth performance  
✅ **Developer Experience** - Hot reload, clear file structure, good naming conventions  
✅ **Extensible** - Easy to add new tools, tile types, features  

---

**End of Project Rundown**
