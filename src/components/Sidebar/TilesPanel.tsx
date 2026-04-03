import { useState, useEffect, useRef } from "react";
import { useMapStore } from "../../stores/mapStore";
import { useToolStore } from "../../stores/toolStore";
import type { BaseTileDefinition, TileType } from "../../types/map";
import { tintGrayscaleCanvas } from "../../utils/recolor";
import { useTextureCache } from "../../stores/textureCache";
import { FaChevronDown } from "react-icons/fa";

interface TileItemProps {
  tile: BaseTileDefinition;
  isSelected: boolean;
  onSelect: (tileId: string, gridType: TileType) => void;
  onDelete: (tileId: string) => void;
}

const TileItem = ({ tile, isSelected, onSelect }: TileItemProps) => {
  return (
    <div
      className={`border ${isSelected ? "border-slate-200" : "border-slate-700"} rounded cursor-pointer hover:border-slate-400 transition-colors`}
      onClick={() => {
        console.log("tile", tile);
        onSelect(tile.id, tile.type);
      }}
    >
      {/* Tile Preview */}
      <div className="relative w-16 h-16 bg-slate-900/50 rounded overflow-hidden">
        <img
          src={tile.textureUrl}
          alt={tile.name}
          className="w-full h-full object-cover"
          style={{
            imageRendering: "pixelated",
          }}
        />
      </div>
    </div>
  );
};

interface TileGroupBoxProps {
  label: string;
  color?: string;
  tiles: BaseTileDefinition[];
  selectedTileId: string | null;
  onSelectTile: (tileId: string, gridType: TileType) => void;
  onDeleteTile: (tileId: string) => void;
}

const TileGroupBox = ({
  label,
  color,
  tiles,
  selectedTileId,
  onSelectTile,
  onDeleteTile,
}: TileGroupBoxProps) => (
  <div className="border border-slate-700 rounded p-2 space-y-1.5">
    <div className="flex items-center gap-1.5">
      {color && (
        <span
          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <p className="text-xs text-slate-400 font-medium">{label}</p>
    </div>
    <div className="flex flex-row flex-wrap gap-2">
      {tiles.map((tile) => (
        <TileItem
          key={tile.id}
          tile={tile}
          isSelected={tile.id === selectedTileId}
          onSelect={onSelectTile}
          onDelete={onDeleteTile}
        />
      ))}
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
}

const TileCategory = ({
  title,
  tiles,
  selectedTileId,
  onSelectTile,
  onDeleteTile,
}: TileCategoryProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Hide overflow tiles — they are placed automatically, not selected manually
  const visibleTiles = tiles.filter((t) => t.type !== "overflow");

  // Separate grouped tiles from ungrouped tiles
  const groupMap = new Map<string, { tiles: BaseTileDefinition[]; color?: string }>();
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

  return (
    <div className="space-y-2">
      {/* Category Header */}
      <div
        className="flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="flex-1 text-left text-sm font-semibold text-slate-200 hover:text-slate-100 transition-colors">
          {title} ({visibleTiles.length})
        </button>
        <FaChevronDown
          size={14}
          className={`text-slate-400 hover:text-slate-200 transition-transform ${
            isExpanded ? "rotate-0" : "-rotate-180"
          }`}
        />
      </div>

      {/* Tiles — grouped boxes + ungrouped flat */}
      <div
        className={`space-y-2 overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-250 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {Array.from(groupMap.entries()).map(([groupLabel, { tiles: groupTiles, color }]) => (
          <TileGroupBox
            key={groupLabel}
            label={groupLabel}
            color={color}
            tiles={groupTiles}
            selectedTileId={selectedTileId}
            onSelectTile={onSelectTile}
            onDeleteTile={onDeleteTile}
          />
        ))}
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
          <div className="col-span-3 text-xs text-slate-500 text-center py-4">
            No {title.toLowerCase()} tiles yet
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Terrain Tint Panel ────────────────────────────────────────────────────

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

  // Update preview canvas whenever tint config or source image changes
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
    if (existing) {
      draw(existing);
      return;
    }
    loadTexture(grayscalePath).then(draw).catch(() => {});
  }, [tileDef, tintConfig, getTexture, loadTexture]);

  // Preset hues for quick selection
  const HUE_PRESETS = [
    { label: "Green",  hue: 120, color: "#4ade80" },
    { label: "Blue",   hue: 210, color: "#60a5fa" },
    { label: "Red",    hue: 0,   color: "#f87171" },
    { label: "Yellow", hue: 55,  color: "#facc15" },
    { label: "Purple", hue: 270, color: "#c084fc" },
    { label: "Sand",   hue: 40,  color: "#fbbf24" },
  ];

  return (
    <div className="border border-slate-700 rounded p-3 space-y-3 bg-slate-900/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300">Terrain Color</span>
        <canvas
          ref={previewRef}
          width={32}
          height={32}
          className="rounded border border-slate-700"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      {/* Hue presets */}
      <div>
        <label className="text-[10px] text-slate-400 block mb-1">Hue presets</label>
        <div className="flex flex-wrap gap-1">
          {HUE_PRESETS.map((p) => (
            <button
              key={p.label}
              title={p.label}
              onClick={() => onTintChange({ hue: p.hue, saturation: tintConfig.saturation || 60 })}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: p.color,
                borderColor: tintConfig.hue === p.hue ? "#e2e8f0" : "transparent",
              }}
            />
          ))}
        </div>
      </div>

      {/* Hue slider */}
      <div>
        <label className="text-[10px] text-slate-400 block mb-1">
          Hue: {tintConfig.hue}°
        </label>
        <input
          type="range"
          min="0"
          max="359"
          value={tintConfig.hue}
          onChange={(e) => onTintChange({ hue: Number(e.target.value) })}
          className="w-full"
          style={{
            background: `linear-gradient(to right, hsl(0,70%,50%), hsl(60,70%,50%), hsl(120,70%,50%), hsl(180,70%,50%), hsl(240,70%,50%), hsl(300,70%,50%), hsl(360,70%,50%))`,
          }}
        />
      </div>

      {/* Saturation slider */}
      <div>
        <label className="text-[10px] text-slate-400 block mb-1">
          Saturation: {tintConfig.saturation}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={tintConfig.saturation}
          onChange={(e) => onTintChange({ saturation: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Brightness slider */}
      <div>
        <label className="text-[10px] text-slate-400 block mb-1">
          Brightness: {tintConfig.brightness}%
        </label>
        <input
          type="range"
          min="50"
          max="150"
          value={tintConfig.brightness}
          onChange={(e) => onTintChange({ brightness: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Reset */}
      <button
        onClick={() => onTintChange({ hue: 0, saturation: 0, brightness: 100 })}
        className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
      >
        Reset
      </button>
    </div>
  );
};

export const TilesPanel = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { map, removeTileDefinition } = useMapStore();
  const {
    selectedTileDefinitionId,
    selectedTileGridType,
    setSelectedTileDefinition,
    setActiveTool,
    terrainTintConfig,
    setTerrainTint,
  } = useToolStore();
  const { getTexture, loadTexture } = useTextureCache();

  if (!map) return null;

  // Group tiles by type
  const terrainTiles = map.tileDefinitions.filter((t) => t.type === "terrain");
  const wallTiles = map.tileDefinitions.filter((t) => t.type === "wall");
  const overlayTiles = map.tileDefinitions.filter((t) => t.type === "overlay");

  const currentSelectedTileId = selectedTileGridType
    ? selectedTileDefinitionId
    : null;

  const selectedDef = currentSelectedTileId
    ? map.tileDefinitions.find((d) => d.id === currentSelectedTileId)
    : null;

  const handleSelectTile = (tileId: string, gridType: TileType) => {
    if(selectedTileDefinitionId === tileId && selectedTileGridType === gridType) {
      // Deselect if clicking the same tile
      setSelectedTileDefinition("", "terrain");
      return;
    }
    setSelectedTileDefinition(tileId, gridType);
  };

  const handleDeleteTile = (tileId: string) => {
    if (confirm("Are you sure you want to delete this tile definition?")) {
      removeTileDefinition(tileId);
      // If the deleted tile was selected, clear the selection
      if (selectedTileDefinitionId === tileId) {
        setActiveTool("select");
      }
    }
  };

  return (
    <div className="space-y-4 border-b border-slate-700 pb-4">
      {/* Header */}
      <div
        className="flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="flex-1 text-left flex items-center gap-2 hover:text-slate-100 transition-colors">
          <h2 className="text-lg text-slate-200">Tiles</h2>
        </button>
        <FaChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${
            isExpanded ? "rotate-0" : "-rotate-180"
          }`}
        />
      </div>
      {/* Tile Categories */}
      <div
        className={`space-y-4 overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-250 opacity-100" : "max-h-0 opacity-0"
        } pl-5`}
      >
        <TileCategory
          title="Terrain"
          type="terrain"
          tiles={terrainTiles}
          selectedTileId={currentSelectedTileId}
          onSelectTile={handleSelectTile}
          onDeleteTile={handleDeleteTile}
        />

        <TileCategory
          title="Overlay"
          type="overlay"
          tiles={overlayTiles}
          selectedTileId={currentSelectedTileId}
          onSelectTile={handleSelectTile}
          onDeleteTile={handleDeleteTile}
        />

        <TileCategory
          title="Walls"
          type="wall"
          tiles={wallTiles}
          selectedTileId={currentSelectedTileId}
          onSelectTile={handleSelectTile}
          onDeleteTile={handleDeleteTile}
        />
      </div>

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

      {/* Info */}
      {map.tileDefinitions.length === 0 && (
        <div className="text-xs text-slate-500 text-center py-4 border border-slate-700 rounded">
          No tiles yet. Click the + button to add tiles.
        </div>
      )}
    </div>
  );
};
