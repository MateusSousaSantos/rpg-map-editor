// English dictionary — the source of truth for all translation keys.
// Other locales are typed as `LocaleDictionary`, which mirrors this structure
// but widens each leaf to `string`, so any key added here must also be added
// there (a missing/renamed key is a compile error).
export const en = {
  common: {
    tiles: "tiles",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
  },

  nav: {
    home: "Home",
    myMaps: "My Maps",
    brand: "RPG Map Editor",
    language: "Language",
  },

  home: {
    badge: "Early Access - v0.0.0",
    heroPrefix: "Build your RPG maps in the browser with the ",
    heroHighlight: "Ordem Paranormal map editor",
    heroDescription:
      "Made by an RPG fan for RPG fans. Create, export and share the maps of your Ordem campaigns.",
    cta: "Open my maps",
    footer:
      "RPG Map Editor - Early Access v0.0.0 - Built with React, Konva and Tailwind CSS",
    features: {
      layers: {
        title: "Layer-based editing",
        description:
          "Stack unlimited layers of tiles and props. Non-destructive editing at its core.",
      },
      autotile: {
        title: "Autotiling",
        description:
          "Place your terrain and let the engine handle corner and edge variants.",
      },
      props: {
        title: "Props & Objects",
        description:
          "Freely position props with z-index, opacity, rotation and scale.",
      },
      export: {
        title: "Export PNG / JPEG",
        description:
          "Export maps at 1x, 2x or 4x with an optional grid overlay.",
      },
    },
  },

  vault: {
    title: "My Maps",
    noMapsYet: "No maps yet",
    savedMapOne: "{count} saved map",
    savedMapMany: "{count} saved maps",
    newMap: "New Map",
    searchPlaceholder: "Search maps…",
    sortNewest: "Newest",
    sortAZ: "A–Z",
    noMapsMatch: "No maps match your search",
    createFirstPrompt: "Create your first map to get started",
    tryDifferent: "Try a different search term",
    createFirst: "Create your first map",
    deleteMap: "Delete map",
    createNewMap: "Create New Map",
    mapName: "Map Name",
    untitledMap: "Untitled Map",
    presets: "Presets",
    sizeSmall: "Small",
    sizeMedium: "Medium",
    sizeLarge: "Large",
    sizeHuge: "Huge",
    widthTiles: "Width (tiles)",
    heightTiles: "Height (tiles)",
    aspectRatio: "Aspect ratio",
    preview: "Preview",
    total: "total",
    create: "Create",
  },

  tools: {
    brush: "Brush Tool (B)",
    eraser: "Eraser Tool (E)",
    box: "Box Tool (X) — {mode} mode",
    fill: "Fill Tool (G)",
    light: "Light Tool — place a light source",
    modePaint: "Paint",
    modeErase: "Erase",
    randomBrush:
      "Random Brush (R) — picks a random variant from the selected tile's group",
    undo: "Undo (Ctrl+Z)",
    redo: "Redo (Ctrl+Shift+Z)",
    exportMap: "Export Map",
  },

  editor: {
    renameMap: "Rename map",
  },

  canvas: {
    noMapLoaded: "No map loaded",
    createOrLoad: "Create or load a map to start editing",
    zoomIn: "Zoom In (+)",
    zoomOut: "Zoom Out (-)",
    resetView: "Reset View (Ctrl+0)",
  },

  library: {
    tabTiles: "Tiles",
    tabProps: "Props",
    tabLights: "Lights",
    heading: "Library",
    addCustomProp: "Add custom prop",
    noPropsAvailable: "No props available",
    other: "Other",
    noPropsInGroup: "No props in this group",
    noCategoryProps: "No {category} props yet",
    dragHint: "Drag props onto the canvas",
    removeFromLibrary: 'Remove "{name}" from library',
    removeAria: "Remove {name}",
    searchPlaceholder: "Search props…",
    noSearchResults: "No props match your filter",
    filterAll: "All",
  },

  tiles: {
    terrain: "Terrain",
    walls: "Walls",
    noTilesInGroup: "No tiles in this group",
    noTilesYet: "No tiles yet.",
    noCategoryTiles: "No {category} tiles yet",
    decreaseWeight: "Decrease weight",
    increaseWeight: "Increase weight",
    confirmDelete: "Are you sure you want to delete this tile definition?",
  },

  tint: {
    label: "Tint",
    editorTitle: "Tile Tint",
    none: "None",
    natural: "natural",
    noTintNatural: "No tint (natural texture)",
    paintNatural: "Paint tiles with their natural texture (no tint)",
    removeFromQuick: "Remove selected tint from quick access",
    openEditor: "Open tint editor",
    save: "+ Save",
    saveColor: "Save this color to your palette",
    lighter: "Lighter",
    darker: "Darker",
    hue: "Hue",
    saturation: "Saturation",
    removeFromPalette: "Remove from palette",
  },

  inspector: {
    selectedProp: "Selected Prop",
    multipleSelected: "Multiple Props Selected",
    propsSelected: "{count} props selected",
    name: "Name",
    x: "X",
    y: "Y",
    width: "Width",
    height: "Height",
    rotation: "Rotation",
    scaleX: "Scale X",
    scaleY: "Scale Y",
    handlesHint: "Use handles on canvas to resize and rotate",
    opacity: "Opacity",
    zIndex: "Z-Index",
    visible: "Visible",
    hidden: "Hidden",
    locked: "Locked",
    unlocked: "Unlocked",
    deleteProp: "Delete Prop",
  },

  light: {
    selectedLight: "Selected Light",
    multipleSelected: "Multiple Lights Selected",
    lightsSelected: "{count} lights selected",
    type: "Type",
    typePoint: "Point",
    typeSpot: "Spot",
    typeArea: "Area",
    color: "Color",
    intensity: "Intensity",
    radius: "Radius",
    elevation: "Elevation",
    angle: "Direction",
    coneAngle: "Cone",
    width: "Width",
    height: "Height",
    castsShadows: "Casts shadows",
    flicker: "Flicker",
    visible: "Visible",
    hidden: "Hidden",
    locked: "Locked",
    unlocked: "Unlocked",
    deleteLight: "Delete Light",
    placeHint: "Click on the canvas to place a light. Drag its handle to move it.",
    newLightShape: "New light shape",
    // Lights library
    libraryHeading: "Lights",
    dragHint: "Drag a light onto the canvas",
    pointDesc: "Radial glow in all directions",
    spotDesc: "Directional cone of light",
    areaDesc: "Rectangular area glow",
    // Environment section
    environment: "Lighting & Atmosphere",
    enable: "Enable lighting",
    disabled: "Lighting off",
    day: "Day (sun)",
    night: "Night (moon)",
    ambientColor: "Ambient color",
    ambientIntensity: "Darkness",
    sun: "Sun / Moonlight",
    sunEnable: "Enable sun",
    sunAngle: "Sun direction",
    sunColor: "Sun color",
    sunIntensity: "Sun intensity",
  },

  objects: {
    title: "Objects",
    unnamedProp: "Unnamed Prop",
    unnamedLight: "Unnamed Light",
    hide: "Hide",
    show: "Show",
    noPropsPlaced: "No props placed yet",
    noLightsPlaced: "No lights placed yet",
    propOne: "prop",
    propMany: "props",
    lightOne: "light",
    lightMany: "lights",
  },

  layers: {
    title: "Layers",
    layerPrefix: "Layer",
    opacity: "Opacity",
    lockLayer: "Lock layer",
    unlockLayer: "Unlock layer",
    hideLayer: "Hide layer",
    showLayer: "Show layer",
    hideGrid: "Hide grid",
    showGrid: "Show grid",
    add: "Add",
    addLayer: "Add layer",
    remove: "Remove",
    removeLayer: "Remove selected layer",
    cannotDeleteLast: "Cannot delete the last layer!",
  },

  addProp: {
    title: "Add Prop",
    image: "Image",
    clickToUpload: "Click to upload image",
    changeImage: "Change image…",
    chooseImage: "Choose image…",
    name: "Name",
    namePlaceholder: "Tree, Barrel, Chest…",
    tags: "Tags",
    removeTag: "Remove tag {tag}",
    tagPlaceholder: "Type a tag and press Enter…",
    widthPx: "Width (px)",
    heightPx: "Height (px)",
    group: "Group",
    optional: "(optional)",
    groupPlaceholder: "Nature, Furniture…",
    groupColor: "Group color",
    errInvalidImage: "Please select a valid image file.",
    errImage: "Please upload an image.",
    errName: "Name is required.",
    errSize: "Width and height must be greater than 0.",
  },

  export: {
    title: "Export Map",
    preview: "Preview",
    format: "Format",
    scale: "Scale",
    outputSize: "Output size",
    gridIncluded: "Grid lines will be included",
    bakeLighting: "Bake lighting",
    bakeLightingHint: "Apply dynamic lights, shadows & ambient to the image",
    failed: "Export failed",
    exporting: "Exporting…",
    export: "Export",
  },

  busy: {
    generic: "Working…",
    fill: "Filling…",
    undo: "Undoing…",
    redo: "Redoing…",
  },

  error: {
    title: "Oops! Something went wrong",
    subtitle: "The application encountered an unexpected error",
    details: "Error Details",
    tryAgain: "Try Again",
    reloadPage: "Reload Page",
    tipLabel: "Tip:",
    tipText:
      "If this error persists, try clearing your browser cache or checking the console for more details.",
  },
} as const;

/**
 * The English dictionary's structure with every leaf widened from its literal
 * type to `string`. Locale dictionaries (e.g. `pt`) are typed with this so they
 * must supply every key without being pinned to the English wording.
 */
export type LocaleDictionary = {
  [K in keyof typeof en]: LocaleSection<(typeof en)[K]>;
};

type LocaleSection<T> = {
  [K in keyof T]: T[K] extends string ? string : LocaleSection<T[K]>;
};
