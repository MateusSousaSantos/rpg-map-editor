import { useState, useEffect, useRef } from "react";
import { useMapStore } from "../../stores/mapStore";
import { useToolStore } from "../../stores/toolStore";
import { useTextureCache } from "../../stores/textureCache";
import { tintGrayscaleCanvas } from "../../utils/recolor";
import type { BaseTileDefinition, TileType } from "../../types/map";
import { FaChevronDown, FaChevronLeft } from "react-icons/fa";

interface TileItemProps {
  tile: BaseTileDefinition;
  isSelected: boolean;
  onSelect: (tileId: string, gridType: TileType) => void;
  onDelete: (tileId: string) => void;
  showWeightControls?: boolean;
  weight?: number;
  weightPercent?: number;
  onWeightIncrease?: () => void;
  onWeightDecrease?: () => void;
}

const TileItem = ({ tile, isSelected, onSelect, showWeightControls, weight = 1, weightPercent = 0, onWeightIncrease, onWeightDecrease }: TileItemProps) => {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`rounded cursor-pointer transition-all ${
          isSelected
            ? "ring-2 ring-tile-sel border border-tile-sel/50"
            : "border border-edge hover:border-edge-strong"
        }`}
        onClick={() => onSelect(tile.id, tile.type)}
        title={tile.name}
      >
        <div className="relative w-14 h-14 bg-canvas rounded overflow-hidden">
          <img
            src={tile.textureUrl}
            alt={tile.name}
            className="w-full h-full object-cover"
            style={{ imageRendering: "pixelated" }}
          />
          {showWeightControls && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-center text-[10px] py-0.5 font-semibold leading-tight">
              {weightPercent}%
            </div>
          )}
        </div>
      </div>
      {showWeightControls && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onWeightDecrease?.(); }}
            className="w-5 h-5 flex items-center justify-center rounded bg-raised hover:bg-edge text-ink-muted hover:text-ink text-sm transition-colors"
            title="Decrease weight"
          >−</button>
          <span className="text-[10px] text-ink-muted w-5 text-center">{weight}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onWeightIncrease?.(); }}
            className="w-5 h-5 flex items-center justify-center rounded bg-raised hover:bg-edge text-ink-muted hover:text-ink text-sm transition-colors"
            title="Increase weight"
          >+</button>
        </div>
      )}
    </div>
  );
};

interface TileGroupBoxProps {
  label: string;
  color?: string;
  tileCount: number;
  onClick: () => void;
}

const TileGroupBox = ({
  label,
  color,
  tileCount,
  onClick,
}: TileGroupBoxProps) => (
  <div
    className="w-5/11 aspect-square rounded border-2 border-slate-500 m-0 flex flex-col cursor-pointer hover:border-tile-sel transition-colors"
    style={color ? { background: `linear-gradient(45deg, ${color}50, transparent)` } : undefined}
    onClick={onClick}
  >
    <div className="w-full p-1 flex items-center justify-around">
      <h1 className="text-xl font-semibold text-ink-secondary">{label}</h1>
      <p className="text-xs text-ink-muted">{tileCount} tiles</p>
    </div>
  </div>
);

interface TileCategoryProps {
  title: string;
  type: TileType;
  tiles: BaseTileDefinition[];
  selectedTileId: string | null;
  onSelectTile: (tileId: string, gridType: TileType) => void;
  onDeleteTile: (tileId: string) => void;
  randomBrushEnabled: boolean;
  variantWeights: Record<string, Record<string, number>>;
  onSetVariantWeight: (group: string, definitionId: string, weight: number) => void;
}

const TileCategory = ({
  title,
  tiles,
  selectedTileId,
  onSelectTile,
  onDeleteTile,
  randomBrushEnabled,
  variantWeights,
  onSetVariantWeight,
}: TileCategoryProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Hide overflow tiles — they are placed automatically, not selected manually
  const visibleTiles = tiles.filter((t) => t.type !== "overflow");

  // Separate grouped tiles from ungrouped tiles
  const groupMap = new Map<
    string,
    { tiles: BaseTileDefinition[]; color?: string }
  >();
  const ungrouped: BaseTileDefinition[] = [];
  for (const tile of visibleTiles) {
    if (tile.group) {
      const existing = groupMap.get(tile.group);
      if (existing) {
        existing.tiles.push(tile);
      } else {
        groupMap.set(tile.group, { tiles: [tile], color: tile.groupColor });
      }
    } else {
      ungrouped.push(tile);
    }
  }

  // Drill-down view: show tiles of the selected group
  if (selectedGroup) {
    const groupData = groupMap.get(selectedGroup);
    const groupTiles = groupData?.tiles ?? [];

    // Compute normalised percentages for weight display
    const groupWeights = variantWeights[selectedGroup] ?? {};
    const totalWeight = groupTiles.reduce((sum, t) => sum + Math.max(0, groupWeights[t.id] ?? 1), 0);

    return (
      <div className="space-y-2">
        {/* Group header with back button */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
            onClick={() => setSelectedGroup(null)}
          >
            <FaChevronLeft size={10} />
            <span className="uppercase tracking-wide font-semibold">
              {title}
            </span>
          </button>
          <span className="text-xs text-ink-muted">/</span>
          <span
            className="text-xs font-semibold text-ink uppercase tracking-wide"
            style={groupData?.color ? { color: groupData.color } : undefined}
          >
            {selectedGroup}
          </span>
        </div>
        {/* Tiles in this group */}
        <div className="flex flex-row flex-wrap gap-2">
          {groupTiles.map((tile) => {
            const rawWeight = groupWeights[tile.id] ?? 1;
            const pct = totalWeight > 0 ? Math.round((rawWeight / totalWeight) * 100) : 0;
            return (
              <TileItem
                key={tile.id}
                tile={tile}
                isSelected={tile.id === selectedTileId}
                onSelect={onSelectTile}
                onDelete={onDeleteTile}
                showWeightControls={randomBrushEnabled}
                weight={rawWeight}
                weightPercent={pct}
                onWeightIncrease={() => onSetVariantWeight(selectedGroup, tile.id, rawWeight + 1)}
                onWeightDecrease={() => onSetVariantWeight(selectedGroup, tile.id, Math.max(0, rawWeight - 1))}
              />
            );
          })}
          {groupTiles.length === 0 && (
            <p className="text-xs text-ink-muted py-2">
              No tiles in this group
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Category header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="flex-1 text-left text-xs font-semibold text-ink-secondary hover:text-ink transition-colors uppercase tracking-wide">
          {title}
          <span className="ml-1.5 text-ink-muted font-normal normal-case tracking-normal">
            ({visibleTiles.length})
          </span>
        </button>
        <FaChevronDown
          size={12}
          className={`text-ink-muted transition-transform ${
            isExpanded ? "rotate-0" : "-rotate-180"
          }`}
        />
      </div>

      {/* Tiles — grouped boxes + ungrouped flat */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-2500 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
      <div className="flex flex-wrap flex-row gap-5">
        {Array.from(groupMap.entries()).map(
          ([groupLabel, { tiles: groupTiles, color }]) => (
            <TileGroupBox
              key={groupLabel}
              label={groupLabel}
              color={color}
              tileCount={groupTiles.length}
              onClick={() => setSelectedGroup(groupLabel)}
            />
          ),
        )}

        {ungrouped.length > 0 && (
          <div className="flex flex-row flex-wrap gap-2">
            {ungrouped.map((tile) => (
              <TileItem
                key={tile.id}
                tile={tile}
                isSelected={tile.id === selectedTileId}
                onSelect={onSelectTile}
                onDelete={onDeleteTile}
              />
            ))}
          </div>
        )}
        {visibleTiles.length === 0 && (
          <p className="text-xs text-ink-muted py-2">
            No {title.toLowerCase()} tiles yet
          </p>
        )}
      </div>
      </div>
    </div>
  );
};

// ─── Terrain Tint Panel ────────────────────────────────────────────────────

/** Convert hue (0–360) + saturation (0–100) to a #rrggbb hex string at L=50%. */
function hslToHex(h: number, s: number): string {
  const lNorm = 0.5;
  const sNorm = s / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Extract hue (0–360) + saturation (0–100) from a #rrggbb hex string. */
function hexToHsl(hex: string): { hue: number; saturation: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { hue: Math.round(h * 360), saturation: Math.round(s * 100) };
}

interface TerrainTintPanelProps {
  tileDef: BaseTileDefinition;
  tintConfig: { hue: number; saturation: number; brightness: number };
  onTintChange: (config: Partial<{ hue: number; saturation: number; brightness: number }>) => void;
  getTexture: (url: string) => HTMLImageElement | undefined;
  loadTexture: (url: string) => Promise<HTMLImageElement>;
}

const TerrainTintPanel = ({
  tileDef,
  tintConfig,
  onTintChange,
  getTexture,
  loadTexture,
}: TerrainTintPanelProps) => {
  const previewRef = useRef<HTMLCanvasElement>(null);

  // Redraw the preview whenever the tint config or source tile changes
  useEffect(() => {
    const grayscalePath = tileDef.grayscaleTexturePath!;
    const draw = (img: HTMLImageElement) => {
      const preview = previewRef.current;
      if (!preview) return;
      const result = tintGrayscaleCanvas(img, tintConfig);
      const ctx = preview.getContext("2d")!;
      ctx.clearRect(0, 0, preview.width, preview.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(result, 0, 0, preview.width, preview.height);
    };
    const existing = getTexture(grayscalePath);
    if (existing) { draw(existing); return; }
    loadTexture(grayscalePath).then(draw).catch(() => {});
  }, [tileDef, tintConfig, getTexture, loadTexture]);

  // Presets come from the tile definition (loaded from tiles.json)
  const presets = tileDef.huePresets ?? [];

  // Hex value used for the <input type="color"> — derived from current hue+saturation
  const pickerHex = hslToHex(tintConfig.hue, tintConfig.saturation);

  const isPresetActive = (p: { hue: number; saturation: number }) =>
    tintConfig.hue === p.hue && tintConfig.saturation === p.saturation;

  return (
    <div className="border border-edge rounded p-3 space-y-3 bg-raised/40">

      {/* Header: label + live preview */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-secondary">Terrain Color</span>
        <canvas
          ref={previewRef}
          width={32}
          height={32}
          className="rounded border border-edge"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      {/* Named presets from tiles.json */}
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              title={`${p.label} (hue ${p.hue}°)`}
              onClick={() => onTintChange({ hue: p.hue, saturation: p.saturation })}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-colors ${
                isPresetActive(p)
                  ? "border-accent bg-accent/10 text-ink"
                  : "border-edge bg-raised text-ink-muted hover:border-edge-strong hover:text-ink"
              }`}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                style={{ backgroundColor: hslToHex(p.hue, p.saturation) }}
              />
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Color picker — clicking opens the native OS color dialog */}
      <div>
        <label className="text-[10px] text-ink-muted block mb-1">Custom color</label>
        <div className="relative h-7 rounded border border-edge overflow-hidden cursor-pointer">
          <div className="absolute inset-0" style={{ backgroundColor: pickerHex }} />
          <input
            type="color"
            value={pickerHex}
            onChange={(e) => {
              const { hue, saturation } = hexToHsl(e.target.value);
              onTintChange({ hue, saturation });
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Brightness slider */}
      <div>
        <label className="text-[10px] text-ink-muted block mb-1">
          Brightness: {tintConfig.brightness}%
        </label>
        <input
          type="range" min="50" max="150" value={tintConfig.brightness}
          onChange={(e) => onTintChange({ brightness: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Reset */}
      <button
        onClick={() => onTintChange({ hue: 0, saturation: 0, brightness: 100 })}
        className="text-[10px] text-ink-muted hover:text-ink transition-colors"
      >
        Reset
      </button>
    </div>
  );
};

export const TilesTab = () => {
  const { map, removeTileDefinition } = useMapStore();
  const {
    selectedTileDefinitionId,
    selectedTileGridType,
    setSelectedTileDefinition,
    setActiveTool,
    randomBrushEnabled,
    variantWeights,
    setVariantWeight,
    terrainTintConfig,
    setTerrainTint,
  } = useToolStore();
  const { getTexture, loadTexture } = useTextureCache();

  if (!map) return null;

  const terrainTiles = map.tileDefinitions.filter((t) => t.type === "terrain");
  const wallTiles = map.tileDefinitions.filter((t) => t.type === "wall");

  const handleSelectTile = (tileId: string, gridType: TileType) => {
    if (
      selectedTileDefinitionId === tileId &&
      selectedTileGridType === gridType
    ) {
      setSelectedTileDefinition("", "terrain");
      return;
    }
    setSelectedTileDefinition(tileId, gridType);
  };

  const handleDeleteTile = (tileId: string) => {
    if (confirm("Are you sure you want to delete this tile definition?")) {
      removeTileDefinition(tileId);
      if (selectedTileDefinitionId === tileId) setActiveTool("select");
    }
  };

  const currentSelectedTileId = selectedTileGridType
    ? selectedTileDefinitionId
    : null;

  const selectedDef = currentSelectedTileId
    ? map.tileDefinitions.find((d) => d.id === currentSelectedTileId)
    : null;

  if (map.tileDefinitions.length === 0) {
    return (
      <p className="text-xs text-ink-muted text-center py-8 border border-edge rounded">
        No tiles yet.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <TileCategory
        title="Terrain"
        type="terrain"
        tiles={terrainTiles}
        selectedTileId={currentSelectedTileId}
        onSelectTile={handleSelectTile}
        onDeleteTile={handleDeleteTile}
        randomBrushEnabled={randomBrushEnabled}
        variantWeights={variantWeights}
        onSetVariantWeight={setVariantWeight}
      />
      <TileCategory
        title="Walls"
        type="wall"
        tiles={wallTiles}
        selectedTileId={currentSelectedTileId}
        onSelectTile={handleSelectTile}
        onDeleteTile={handleDeleteTile}
        randomBrushEnabled={randomBrushEnabled}
        variantWeights={variantWeights}
        onSetVariantWeight={setVariantWeight}
      />

      {/* Terrain Tint Controls — shown when selected tile supports tinting */}
      {selectedDef?.supportsTinting && selectedDef.grayscaleTexturePath && (
        <TerrainTintPanel
          tileDef={selectedDef}
          tintConfig={terrainTintConfig}
          onTintChange={setTerrainTint}
          getTexture={getTexture}
          loadTexture={loadTexture}
        />
      )}
    </div>
  );
};
