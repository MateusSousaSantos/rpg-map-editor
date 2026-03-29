import { useState } from "react";
import { useMapStore } from "../../stores/mapStore";
import { useToolStore } from "../../stores/toolStore";
import type { BaseTileDefinition, TileType } from "../../types/map";
import { FaChevronDown, FaChevronLeft } from "react-icons/fa";

interface TileItemProps {
  tile: BaseTileDefinition;
  isSelected: boolean;
  onSelect: (tileId: string, gridType: TileType) => void;
  onDelete: (tileId: string) => void;
}

const TileItem = ({ tile, isSelected, onSelect }: TileItemProps) => {
  return (
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
      </div>
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
}

const TileCategory = ({
  title,
  tiles,
  selectedTileId,
  onSelectTile,
  onDeleteTile,
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
          {groupTiles.map((tile) => (
            <TileItem
              key={tile.id}
              tile={tile}
              isSelected={tile.id === selectedTileId}
              onSelect={onSelectTile}
              onDelete={onDeleteTile}
            />
          ))}
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
        className={`space-y-2 flex flex-wrap flex-row transition-all duration-300 ease-in-out gap-5 ${
          isExpanded ? "max-h-125 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
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
  );
};

export const TilesTab = () => {
  const { map, removeTileDefinition } = useMapStore();
  const {
    selectedTileDefinitionId,
    selectedTileGridType,
    setSelectedTileDefinition,
    setActiveTool,
  } = useToolStore();

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
  );
};
