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
      className={`border ${isSelected ? "border-slate-200" : "border-slate-700"} rounded cursor-pointer hover:border-slate-400 transition-colors`}
      onClick={() => onSelect(tile.id, tile.type)}
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

interface TileCategoryProps {
  title: string;
  type: TileType;
  tiles: BaseTileDefinition[];
  selectedTileId: string | null;
  onSelectTile: (tileId: string, gridType: TileType) => void;
  onDeleteTile: (tileId: string) => void;
  onAddTile: (type: TileType) => void;
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
      {/* Category Header */}
      <div
        className="flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="flex-1 text-left text-sm font-semibold text-slate-200 hover:text-slate-100 transition-colors">
          {title} ({tiles.length})
        </button>
        <FaChevronDown
          size={14}
          className={`text-slate-400 hover:text-slate-200 transition-transform ${
            isExpanded ? "rotate-0" : "-rotate-180"
          }`}
        />
      </div>

      {/* Tiles Grid */}
      <div
        className={`flex flex-row flex-wrap gap-2 overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-250 opacity-100" : "max-h-0 opacity-0"
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
          <div className="col-span-3 text-xs text-slate-500 text-center py-4">
            No {title.toLowerCase()} tiles yet
          </div>
        )}
      </div>
    </div>
  );
};

export const TilesPanel = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { map, addTileDefinition, removeTileDefinition } = useMapStore();
  const {
    selectedTileDefinitionId,
    selectedTileGridType,
    setSelectedTileDefinition,
    setActiveTool,
  } = useToolStore();

  if (!map) return null;

  // Group tiles by type
  const terrainTiles = map.tileDefinitions.filter((t) => t.type === "terrain");
  const wallTiles = map.tileDefinitions.filter((t) => t.type === "wall");
  const overlayTiles = map.tileDefinitions.filter((t) => t.type === "overlay");

  const handleSelectTile = (tileId: string, gridType: TileType) => {
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

  const handleAddTile = (type: TileType) => {
    // For now, we'll add sample tiles from the public folder
    // In a real app, you'd open a file picker or asset browser
    const sampleTiles: Record<TileType, { url: string; name: string }> = {
      terrain: {
        url: "/tilesets/terrain/grass/grass-1.png",
        name: "Grass Tile",
      },
      overlay: {
        url: "/tilesets/overlay/wood/wood-1.png",
        name: "Wood Overlay",
      },
      wall: {
        url: "/tilesets/terrain/grass/grass-1.png",
        name: "Wall Tile",
      },
    };

    const sample = sampleTiles[type];
    const newTile: BaseTileDefinition = {
      id: crypto.randomUUID(),
      name: `${sample.name} ${
        map.tileDefinitions.filter((t) => t.type === type).length + 1
      }`,
      type: type,
      textureUrl: sample.url,
      tileSize: map.tileSize,
    };

    addTileDefinition(newTile);
  };

  const currentSelectedTileId = selectedTileGridType
    ? selectedTileDefinitionId
    : null;

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
          onAddTile={handleAddTile}
        />

        <TileCategory
          title="Overlay"
          type="overlay"
          tiles={overlayTiles}
          selectedTileId={currentSelectedTileId}
          onSelectTile={handleSelectTile}
          onDeleteTile={handleDeleteTile}
          onAddTile={handleAddTile}
        />

        <TileCategory
          title="Walls"
          type="wall"
          tiles={wallTiles}
          selectedTileId={currentSelectedTileId}
          onSelectTile={handleSelectTile}
          onDeleteTile={handleDeleteTile}
          onAddTile={handleAddTile}
        />
      </div>

      {/* Info */}
      {map.tileDefinitions.length === 0 && (
        <div className="text-xs text-slate-500 text-center py-4 border border-slate-700 rounded">
          No tiles yet. Click the + button to add tiles.
        </div>
      )}
    </div>
  );
};
