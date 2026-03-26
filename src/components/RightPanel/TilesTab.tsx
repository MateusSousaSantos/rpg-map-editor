import { useState } from "react";
import { useMapStore } from "../../stores/mapStore";
import { useToolStore } from "../../stores/toolStore";
import type { BaseTileDefinition, TileType } from "../../types/map";
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
            ({tiles.length})
          </span>
        </button>
        <FaChevronDown
          size={12}
          className={`text-ink-muted transition-transform ${
            isExpanded ? "rotate-0" : "-rotate-180"
          }`}
        />
      </div>

      {/* Tiles grid */}
      <div
        className={`flex flex-row flex-wrap gap-2 overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-125 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {tiles.map((tile) => (
          <TileItem
            key={tile.id}
            tile={tile}
            isSelected={tile.id === selectedTileId}
            onSelect={onSelectTile}
            onDelete={onDeleteTile}
          />
        ))}
        {tiles.length === 0 && (
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
  const overlayTiles = map.tileDefinitions.filter((t) => t.type === "overlay");

  const handleSelectTile = (tileId: string, gridType: TileType) => {
    if (selectedTileDefinitionId === tileId && selectedTileGridType === gridType) {
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

  const currentSelectedTileId = selectedTileGridType ? selectedTileDefinitionId : null;

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
  );
};
