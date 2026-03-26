// ============================================================================
// TILE SYSTEM
// ============================================================================

export type TileType = 'terrain' | 'wall' | 'overlay' | 'overflow';

/**
 * Base tile definition - defines what a tile IS
 * This is a template that can be reused across the map
 */
export interface BaseTileDefinition {
  id: string;
  name: string;
  type: TileType;
  textureUrl: string;      // path to sprite
  tileSize: number;        // 16, 32, 64, etc. - can change globally
  
  // Overflow tiles by direction - auto-placed when this tile is placed
  // Maps direction to overflow tile definition ID
  // E.g., { 'top': 'roof-top', 'left': 'wall-left' }
  overflowTilesByDirection?: Record<Direction, string>;
  
  // Autotiling system
  autotileGroup?: string;      // e.g., "grass", "stone_wall" — tiles with the same group connect
  autotileBasePath?: string;   // e.g., "/tilesets/terrain/grass/autotile/" — variant files named {bitmask}.png
  autotileRules?: AutotileRule[];
}

/**
 * Autotiling rule - how a tile behaves with neighbors
 */
export interface AutotileRule {
  id: string;
  name: string;
  // Direction neighbors: 'top' | 'right' | 'bottom' | 'left' | 'topRight' | etc.
  matchingNeighbors: {
    direction: Direction;
    requiredTileType?: string;        // specific autotile group
    requiresSameTileType?: boolean;   // must be exact same tile type
  }[];
  resultingTextureOffset?: {  // which part of spritesheet to use
    x: number;
    y: number;
  };
}

export type Direction = 
  | 'top' | 'right' | 'bottom' | 'left'
  | 'topRight' | 'bottomRight' | 'bottomLeft' | 'topLeft';

/**
 * Overlay tile definition - special for overlay tiles
 * Overlays can stack and don't fully cover other tiles
 */
export interface OverlayTileDefinition extends BaseTileDefinition {
  type: 'overlay';
  opacity?: number;           // default opacity (can be overridden per tile)
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export interface OverflowTileDefinition extends BaseTileDefinition {
  type: 'overflow';
  position: Direction;    // which side it overflows from
  zIndex: number;        // rendering order
}

/**
 * Instance of a tile placed on the map
 * References a tile definition + stores instance-specific data
 */
export interface TileInstance {
  id: string;
  definitionId: string;       // references BaseTileDefinition
  gridX: number;             // grid coordinates (0-based)
  gridY: number;
  
  // Autotiling state
  currentVariant?: number;    // which variant of the autotile is shown
  
  // Instance-specific overrides
  opacity?: number;           // overlay tiles might have custom opacity
  tint?: string;             // optional color overlay (hex)
  rotation?: 0 | 90 | 180 | 270;  // only for specific tile types
  
  type: TileType;
  // Metadata
  properties?: Record<string, any>;  // custom game data
  overflowTiles?: TileInstance[]; // for overflow tiles associated with this tile
}

// ============================================================================
// PROP SYSTEM
// ============================================================================

/**
 * Prop definition - what a prop IS (template/asset)
 */
export interface PropDefinition {
  id: string;
  name: string;
  category: string;           // "trees", "furniture", "objects", "npc", etc.
  textureUrl: string;         // path to sprite/image
  width: number;              // world width in pixels
  height: number;             // world height in pixels
  tags: string[];             // "outdoor", "wooden", "interactive", etc.
  
  // Default appearance
  defaultOpacity?: number;
  defaultScaleX?: number;
  defaultScaleY?: number;
  
  metadata?: Record<string, any>;  // asset metadata
}

/**
 * Instance of a prop placed on the map
 */
export interface PropInstance {
  id: string;
  definitionId: string;       // references PropDefinition
  
  // Free positioning (not grid-based)
  x: number;                  // world position
  y: number;
  width: number;              // can differ from definition
  height: number;
  
  // Transform
  rotation: number;           // 0-360 degrees
  scaleX: number;             // 1.0 = normal
  scaleY: number;
  
  // Appearance
  opacity: number;            // 0-1
  tint?: string;              // optional color overlay (hex)
  
  // Organization
  zIndex: number;             // ordering within layer
  locked?: boolean;
  
  // Data
  name?: string;              // optional custom name
  properties?: Record<string, any>;  // custom game data
  visible: boolean;
}

// ============================================================================
// LAYER SYSTEM
// ============================================================================

/**
 * A single layer in the map
 * Contains both tiles (organized by type) and props
 */
export interface MapLayer {
  id: string;
  name: string;
  type: 'tile' | 'mixed';     // 'tile' = only tiles, 'mixed' = tiles + props
  
  // Visibility & depth
  visible: boolean;
  opacity: number;            // 0-1, affects everything in layer
  depthIndex: number;         // 0 = bottom, higher = on top
  locked?: boolean;           // prevent editing
  
  // Content - Flattened tile storage for O(1) lookups
  tiles: Map<string, TileInstance>;      // key: "x,y,type" for coordinate lookups
  tilesById: Map<string, TileInstance>;  // key: tile.id for ID-based lookups
  props: PropInstance[];
  
  // Metadata
  metadata?: Record<string, any>;
}

// ============================================================================
// MAP STRUCTURE
// ============================================================================

/**
 * The complete map document
 */
export interface MapDocument {
  // Meta
  id: string;
  name: string;
  version: string;            // for future compatibility
  createdAt: Date;
  lastModified: Date;
  
  // Dimensions
  width: number;              // grid width (tiles)
  height: number;             // grid height (tiles)
  tileSize: number;           // 16, 32, 64, etc. (matches TileDefinition.tileSize)
  
  // Content
  layers: MapLayer[];         // ordered by depthIndex
  
  // Asset libraries
  tileDefinitions: (BaseTileDefinition | OverlayTileDefinition)[];
  propDefinitions: PropDefinition[];
  
  // Viewport/canvas state (optional, for resuming editing session)
  viewport?: {
    panX: number;
    panY: number;
    zoom: number;
  };
  
  // UI state (optional)
  selectedLayerId?: string;
  selectedTileIds?: string[];
  selectedPropId?: string;

  // Vault thumbnail (generated JPEG snapshot, base64 data URL)
  thumbnail?: string;
  thumbnailTimestamp?: Date;
}

// ============================================================================
// SAVE FORMAT
// ============================================================================

/**
 * Serializable version of MapDocument
 * Dates converted to ISO strings, Maps converted to arrays
 */
export interface SerializedMapDocument {
  id: string;
  name: string;
  version: string;
  createdAt: string;          // ISO date string
  lastModified: string;       // ISO date string
  width: number;
  height: number;
  tileSize: number;
  
  layers: SerializedMapLayer[];
  tileDefinitions: (BaseTileDefinition | OverlayTileDefinition)[];
  propDefinitions: PropDefinition[];
  
  viewport?: {
    panX: number;
    panY: number;
    zoom: number;
  };
  
  selectedLayerId?: string;
  selectedTileIds?: string[];
  selectedPropId?: string;
}

export interface SerializedMapLayer {
  id: string;
  name: string;
  type: 'tile' | 'mixed';
  visible: boolean;
  opacity: number;
  depthIndex: number;
  locked?: boolean;
  
  tiles: {
    key: string;               // "x,y,type"
    value: TileInstance;
  }[];
  tilesById: {
    key: string;               // tile.id
    value: TileInstance;
  }[];
  props: PropInstance[];
  
  metadata?: Record<string, any>;
}

// ============================================================================
// EXPORT FORMATS
// ============================================================================

/**
 * Data structure for PNG export
 */
export interface ExportPNGOptions {
  scale?: number;             // multiplier for output size (default 1)
  transparent?: boolean;      // transparent background or solid color
  backgroundColor?: string;   // hex color if not transparent
  includeGrid?: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * For coordinate conversion and grid operations
 */
export interface GridCoordinate {
  x: number;
  y: number;
}

export interface WorldCoordinate {
  x: number;
  y: number;
}

/**
 * For undo/redo system
 */
export type MapAction = 
  | { type: 'ADD_TILE'; layerId: string; tile: TileInstance }
  | { type: 'REMOVE_TILE'; layerId: string; tileId: string }
  | { type: 'UPDATE_TILE'; layerId: string; tileId: string; changes: Partial<TileInstance> }
  | { type: 'ADD_PROP'; layerId: string; prop: PropInstance }
  | { type: 'REMOVE_PROP'; layerId: string; propId: string }
  | { type: 'UPDATE_PROP'; layerId: string; propId: string; changes: Partial<PropInstance> }
  | { type: 'ADD_LAYER'; layer: MapLayer }
  | { type: 'REMOVE_LAYER'; layerId: string }
  | { type: 'UPDATE_LAYER'; layerId: string; changes: Partial<MapLayer> }
  | { type: 'REORDER_LAYERS'; newOrder: string[] }
  | { type: 'BATCH'; actions: MapAction[] };