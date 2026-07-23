import { useState } from "react";
import { useMapStore } from "../../stores/mapStore";
import { useToolStore } from "../../stores/toolStore";
import { useTranslation } from "../../hooks/useTranslation";
import type { BaseTileDefinition, TileType } from "../../types/map";
import { FaChevronDown, FaChevronLeft } from "react-icons/fa";
import { TileTintBar } from "./TileTintBar";

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
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`rounded cursor-pointer transition-all ${
          isSelected
            ? "ring-1 ring-tile-sel border border-edge"
            : "border border-edge hover:border-edge-strong"
        }`}
        onClick={() => onSelect(tile.id, tile.type)}
        title={tile.name}
      >
        <div className="relative w-12 h-12 bg-canvas rounded overflow-hidden">
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
            title={t("tiles.decreaseWeight")}
          >−</button>
          <span className="text-[10px] text-ink-muted w-5 text-center">{weight}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onWeightIncrease?.(); }}
            className="w-5 h-5 flex items-center justify-center rounded bg-raised hover:bg-edge text-ink-muted hover:text-ink text-sm transition-colors"
            title={t("tiles.increaseWeight")}
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
}: TileGroupBoxProps) => {
  const { t } = useTranslation();
  return (
    <div
      className="w-5/11 aspect-square rounded border-2 border-slate-500 m-0 flex flex-col cursor-pointer hover:border-tile-sel transition-colors"
      style={color ? { background: `linear-gradient(45deg, ${color}50, transparent)` } : undefined}
      onClick={onClick}
    >
      <div className="w-full p-1 flex flex-col items-center gap-0.5 min-w-0">
        <h1 className="text-xl font-semibold text-ink-secondary text-center break-words w-full leading-tight">{label}</h1>
        <p className="text-xs text-ink-muted whitespace-nowrap shrink-0">{tileCount} {t("common.tiles")}</p>
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
  randomBrushEnabled: boolean;
  variantWeights: Record<string, Record<string, number>>;
  onSetVariantWeight: (group: string, definitionId: string, weight: number) => void;
  selectedGroup: string | null;
  onSelectGroup: (group: string) => void;
  onBack: () => void;
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
  selectedGroup,
  onSelectGroup,
  onBack,
}: TileCategoryProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

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
            onClick={onBack}
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
              {t("tiles.noTilesInGroup")}
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
              onClick={() => onSelectGroup(groupLabel)}
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
            {t("tiles.noCategoryTiles", { category: title.toLowerCase() })}
          </p>
        )}
      </div>
      </div>
    </div>
  );
};

export const TilesTab = () => {
  const { t } = useTranslation();
  const { map, removeTileDefinition } = useMapStore();
  const {
    selectedTileDefinitionId,
    selectedTileGridType,
    setSelectedTileDefinition,
    setActiveTool,
    randomBrushEnabled,
    variantWeights,
    setVariantWeight,
  } = useToolStore();

  // Which single group (across both categories) is drilled into. When set, only
  // that category renders, so the focus is unambiguous.
  const [drill, setDrill] = useState<{ type: TileType; group: string } | null>(
    null,
  );

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
    if (confirm(t("tiles.confirmDelete"))) {
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
        {t("tiles.noTilesYet")}
      </p>
    );
  }

  const categories = [
    { title: t("tiles.terrain"), type: "terrain" as TileType, tiles: terrainTiles },
    { title: t("tiles.walls"), type: "wall" as TileType, tiles: wallTiles },
  ];

  // When drilled in, render only the active category; otherwise show both.
  const visibleCategories = drill
    ? categories.filter((c) => c.type === drill.type)
    : categories;

  return (
    <div className="space-y-4">
      <TileTintBar />
      {visibleCategories.map((cat) => (
        <TileCategory
          key={cat.type}
          title={cat.title}
          type={cat.type}
          tiles={cat.tiles}
          selectedTileId={currentSelectedTileId}
          onSelectTile={handleSelectTile}
          onDeleteTile={handleDeleteTile}
          randomBrushEnabled={randomBrushEnabled && selectedTileGridType === cat.type}
          variantWeights={variantWeights}
          onSetVariantWeight={setVariantWeight}
          selectedGroup={drill?.type === cat.type ? drill.group : null}
          onSelectGroup={(group) => setDrill({ type: cat.type, group })}
          onBack={() => setDrill(null)}
        />
      ))}
    </div>
  );
};
