import { useState } from "react";
import { useMapStore } from "../../stores/mapStore";
import { useToolStore } from "../../stores/toolStore";
import { useTranslation } from "../../hooks/useTranslation";
import { FiTrash2, FiPlus, FiSearch } from "react-icons/fi";
import { FaChevronDown, FaChevronLeft } from "react-icons/fa";
import { AddPropModal } from "../AddPropModal/AddPropModal";

import type { PropDefinition } from "../../types/map";

interface PropGroupBoxProps {
  label: string;
  color?: string;
  onClick: () => void;
}

const PropGroupBox = ({ label, color, onClick }: PropGroupBoxProps) => (
  <div
    className="w-5/11 aspect-square rounded border-2 border-slate-500 p-2 m-0 flex flex-col justify-end items-start gap-2 cursor-pointer hover:border-prop transition-colors"
    style={color ? { background: `linear-gradient(45deg, ${color}50, transparent)` } : undefined}
    onClick={onClick}
  >
    <div className="flex flex-row items-center gap-1">
      <h1 className="text-xl font-semibold text-ink-secondary">{label}</h1>
    </div>
  </div>
);

interface PropItemProps {
  def: PropDefinition;
  selectedPropId: string | null;
  draggedPropId: string | null;
  onDragStart: (e: React.DragEvent, propDefId: string) => void;
  onDragEnd: () => void;
  onSelect: (propDefId: string) => void;
  onRemove: (defId: string) => void;
}

const PropItem = ({
  def,
  selectedPropId,
  draggedPropId,
  onDragStart,
  onDragEnd,
  onSelect,
  onRemove,
}: PropItemProps) => {
  const { t } = useTranslation();
  return (
  <div
    draggable
    onDragStart={(e) => onDragStart(e, def.id)}
    onDragEnd={onDragEnd}
    onClick={() => onSelect(def.id)}
    className={`group relative rounded cursor-grab active:cursor-grabbing transition-all ${
      selectedPropId === def.id
        ? "ring-2 ring-prop border border-prop/50 bg-prop/10"
        : draggedPropId === def.id
        ? "border border-edge-strong opacity-50"
        : "border border-edge hover:border-edge-strong"
    }`}
    title={def.name}
  >
    <div className="relative w-full aspect-square bg-canvas rounded overflow-hidden">
      <img
        src={def.textureUrl}
        alt={def.name}
        className="w-full h-full object-contain"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
    {/* Remove button — visible on hover */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        onRemove(def.id);
      }}
      className="absolute top-0.5 right-0.5 z-10 rounded p-0.5 bg-panel/80 text-ink-muted opacity-0 group-hover:opacity-100 hover:bg-danger/20 hover:text-danger transition-all"
      title={t("library.removeFromLibrary", { name: def.name })}
      aria-label={t("library.removeAria", { name: def.name })}
    >
      <FiTrash2 size={10} />
    </button>
  </div>
  );
};

interface PropCategoryProps {
  title: string;
  props: PropDefinition[];
  selectedPropId: string | null;
  draggedPropId: string | null;
  onDragStart: (e: React.DragEvent, propDefId: string) => void;
  onDragEnd: () => void;
  onSelect: (propDefId: string) => void;
  onRemove: (defId: string) => void;
  selectedGroup: string | null;
  onSelectGroup: (group: string) => void;
  onBack: () => void;
}

const PropCategory = ({
  title,
  props,
  selectedPropId,
  draggedPropId,
  onDragStart,
  onDragEnd,
  onSelect,
  onRemove,
  selectedGroup,
  onSelectGroup,
  onBack,
}: PropCategoryProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  // Build group map and collect ungrouped props
  const groupMap = new Map<string, { props: PropDefinition[]; color?: string }>();
  const ungrouped: PropDefinition[] = [];
  for (const def of props) {
    if (def.group) {
      const existing = groupMap.get(def.group);
      if (existing) {
        existing.props.push(def);
      } else {
        groupMap.set(def.group, { props: [def], color: def.groupColor });
      }
    } else {
      ungrouped.push(def);
    }
  }

  // Drill-down view: show props of the selected group
  if (selectedGroup) {
    const groupData = groupMap.get(selectedGroup);
    const groupProps = groupData?.props ?? [];
    return (
      <div className="space-y-2">
        {/* Group header with back button */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
            onClick={onBack}
          >
            <FaChevronLeft size={10} />
            <span className="uppercase tracking-wide font-semibold">{title}</span>
          </button>
          <span className="text-xs text-ink-muted">/</span>
          <span
            className="text-xs font-semibold text-ink uppercase tracking-wide"
            style={groupData?.color ? { color: groupData.color } : undefined}
          >
            {selectedGroup}
          </span>
        </div>
        {/* Props in this group */}
        <div className="grid grid-cols-4 gap-2">
          {groupProps.map((def) => (
            <PropItem
              key={def.id}
              def={def}
              selectedPropId={selectedPropId}
              draggedPropId={draggedPropId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          ))}
          {groupProps.length === 0 && (
            <p className="col-span-4 text-xs text-ink-muted py-2">{t("library.noPropsInGroup")}</p>
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
          <span className="ml-1.5 text-ink-muted font-normal normal-case tracking-normal">({props.length})</span>
        </button>
        <FaChevronDown
          size={12}
          className={`text-ink-muted transition-transform ${
            isExpanded ? "rotate-0" : "-rotate-180"
          }`}
        />
      </div>

      {/* Props — grouped boxes + ungrouped flat */}
      <div
        className={`space-y-2 flex flex-wrap flex-row transition-all duration-300 ease-in-out gap-5 ${
          isExpanded ? "max-h-125 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {Array.from(groupMap.entries()).map(([groupLabel, { color }]) => (
          <PropGroupBox
            key={groupLabel}
            label={groupLabel}
            color={color}
            onClick={() => onSelectGroup(groupLabel)}
          />
        ))}

        {ungrouped.length > 0 && (
          <div className="grid grid-cols-4 gap-2 w-full">
            {ungrouped.map((def) => (
              <PropItem
                key={def.id}
                def={def}
                selectedPropId={selectedPropId}
                draggedPropId={draggedPropId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
        {props.length === 0 && (
          <p className="text-xs text-ink-muted py-2">{t("library.noCategoryProps", { category: title.toLowerCase() })}</p>
        )}
      </div>
    </div>
  );
};

export const PropsLibrary = () => {
  const { t } = useTranslation();
  const map = useMapStore((state) => state.map);
  const { selectedPropDefinitionId, setSelectedPropDefinition } = useToolStore();
  const removePropDefinition = useMapStore((state) => state.removePropDefinition);

  const [draggedPropId, setDraggedPropId] = useState<string | null>(null);
  const [isAddPropModalOpen, setIsAddPropModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  // Which single group (across all tag categories) is drilled into. When set,
  // only that category renders, so the focus is unambiguous.
  const [drill, setDrill] = useState<{ tag: string; group: string } | null>(null);

  if (!map) return null;

  // Distinct filter values — prefer theme, fall back to category
  const filterValues = Array.from(
    new Set(
      map.propDefinitions
        .map((def) => def.theme ?? def.category)
        .filter((v): v is string => !!v),
    ),
  ).sort();

  // Apply search + active filter before grouping
  const query = search.trim().toLowerCase();
  const filteredProps = map.propDefinitions.filter((def) => {
    if (activeFilter && (def.theme ?? def.category) !== activeFilter) return false;
    if (!query) return true;
    return (
      def.name.toLowerCase().includes(query) ||
      def.category?.toLowerCase().includes(query) ||
      def.group?.toLowerCase().includes(query) ||
      def.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  // Group props by tags
  const propsByTag = new Map<string, PropDefinition[]>();
  const uncategorizedProps: PropDefinition[] = [];

  filteredProps.forEach((def) => {
    if (!def.tags || def.tags.length === 0) {
      uncategorizedProps.push(def);
    } else {
      def.tags.forEach((tag: string) => {
        if (!propsByTag.has(tag)) propsByTag.set(tag, []);
        propsByTag.get(tag)!.push(def);
      });
    }
  });

  const sortedTags = Array.from(propsByTag.keys()).sort();

  // Unified category list (tag groups + the "Other" bucket), so a single drill
  // state can hide every other category when one group is opened.
  const categories: { title: string; props: PropDefinition[] }[] = [
    ...sortedTags.map((tag) => ({ title: tag, props: propsByTag.get(tag)! })),
    ...(uncategorizedProps.length > 0
      ? [{ title: t("library.other"), props: uncategorizedProps }]
      : []),
  ];

  // When drilled in, render only the active category; otherwise show all.
  const visibleCategories = drill
    ? categories.filter((c) => c.title === drill.tag)
    : categories;

  const handleDragStart = (e: React.DragEvent, propDefId: string) => {
    setDraggedPropId(propDefId);
    e.dataTransfer.setData("propDefinitionId", propDefId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragEnd = () => setDraggedPropId(null);

  return (
    <div className="space-y-2">
      {/* Library header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-secondary">
          {t("library.heading")}
          <span className="ml-1.5 text-ink-muted font-normal">({map.propDefinitions.length})</span>
        </span>
        <button
          onClick={() => setIsAddPropModalOpen(true)}
          className="rounded p-0.5 text-ink-muted hover:bg-raised hover:text-prop transition-colors"
          title={t("library.addCustomProp")}
          aria-label={t("library.addCustomProp")}
        >
          <FiPlus size={14} />
        </button>
      </div>

      {map.propDefinitions.length === 0 ? (
        <p className="text-xs text-ink-muted py-2">{t("library.noPropsAvailable")}</p>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <FiSearch
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("library.searchPlaceholder")}
              className="w-full pl-8 pr-2 py-1.5 bg-panel border border-edge rounded-lg text-ink text-xs placeholder:text-ink-muted focus:outline-none focus:border-accent-light"
            />
          </div>

          {/* Filter chips */}
          {filterValues.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveFilter(null)}
                className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                  activeFilter === null
                    ? "bg-accent/15 border-accent/40 text-accent"
                    : "bg-panel border-edge text-ink-muted hover:text-ink hover:border-edge-strong"
                }`}
              >
                {t("library.filterAll")}
              </button>
              {filterValues.map((value) => (
                <button
                  key={value}
                  onClick={() => setActiveFilter(value)}
                  className={`px-2 py-1 rounded-full text-[10px] font-medium border capitalize transition-colors ${
                    activeFilter === value
                      ? "bg-accent/15 border-accent/40 text-accent"
                      : "bg-panel border-edge text-ink-muted hover:text-ink hover:border-edge-strong"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          )}

          {filteredProps.length === 0 ? (
            <p className="text-xs text-ink-muted py-2">{t("library.noSearchResults")}</p>
          ) : (
            <div className="space-y-4">
              {visibleCategories.map((cat) => (
                <PropCategory
                  key={cat.title}
                  title={cat.title}
                  props={cat.props}
                  selectedPropId={selectedPropDefinitionId}
                  draggedPropId={draggedPropId}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onSelect={setSelectedPropDefinition}
                  onRemove={removePropDefinition}
                  selectedGroup={drill?.tag === cat.title ? drill.group : null}
                  onSelectGroup={(group) => setDrill({ tag: cat.title, group })}
                  onBack={() => setDrill(null)}
                />
              ))}
            </div>
          )}
        </>
      )}
      <p className="text-[10px] text-ink-muted mt-2">💡 {t("library.dragHint")}</p>

      <AddPropModal isOpen={isAddPropModalOpen} onClose={() => setIsAddPropModalOpen(false)} />
    </div>
  );
};
