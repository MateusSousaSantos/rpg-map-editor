import { useState } from "react";
import { useMapStore } from "../../stores/mapStore";
import { useToolStore } from "../../stores/toolStore";
import { FiTrash2, FiPlus } from "react-icons/fi";
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
}: PropItemProps) => (
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
      title={`Remove "${def.name}" from library`}
      aria-label={`Remove ${def.name}`}
    >
      <FiTrash2 size={10} />
    </button>
  </div>
);

interface PropCategoryProps {
  title: string;
  props: PropDefinition[];
  selectedPropId: string | null;
  draggedPropId: string | null;
  onDragStart: (e: React.DragEvent, propDefId: string) => void;
  onDragEnd: () => void;
  onSelect: (propDefId: string) => void;
  onRemove: (defId: string) => void;
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
}: PropCategoryProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

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
            onClick={() => setSelectedGroup(null)}
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
            <p className="col-span-4 text-xs text-ink-muted py-2">No props in this group</p>
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
            onClick={() => setSelectedGroup(groupLabel)}
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
          <p className="text-xs text-ink-muted py-2">No {title.toLowerCase()} props yet</p>
        )}
      </div>
    </div>
  );
};

export const PropsLibrary = () => {
  const map = useMapStore((state) => state.map);
  const { selectedPropDefinitionId, setSelectedPropDefinition } = useToolStore();
  const removePropDefinition = useMapStore((state) => state.removePropDefinition);

  const [draggedPropId, setDraggedPropId] = useState<string | null>(null);
  const [isAddPropModalOpen, setIsAddPropModalOpen] = useState(false);

  if (!map) return null;

  // Group props by tags
  const propsByTag = new Map<string, PropDefinition[]>();
  const uncategorizedProps: PropDefinition[] = [];

  map.propDefinitions.forEach((def) => {
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
          Library
          <span className="ml-1.5 text-ink-muted font-normal">({map.propDefinitions.length})</span>
        </span>
        <button
          onClick={() => setIsAddPropModalOpen(true)}
          className="rounded p-0.5 text-ink-muted hover:bg-raised hover:text-prop transition-colors"
          title="Add custom prop"
          aria-label="Add custom prop"
        >
          <FiPlus size={14} />
        </button>
      </div>

      {map.propDefinitions.length === 0 ? (
        <p className="text-xs text-ink-muted py-2">No props available</p>
      ) : (
        <div className="space-y-4">
          {sortedTags.map((tag) => (
            <PropCategory
              key={tag}
              title={tag}
              props={propsByTag.get(tag)!}
              selectedPropId={selectedPropDefinitionId}
              draggedPropId={draggedPropId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onSelect={setSelectedPropDefinition}
              onRemove={removePropDefinition}
            />
          ))}
          {uncategorizedProps.length > 0 && (
            <PropCategory
              title="Other"
              props={uncategorizedProps}
              selectedPropId={selectedPropDefinitionId}
              draggedPropId={draggedPropId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onSelect={setSelectedPropDefinition}
              onRemove={removePropDefinition}
            />
          )}
        </div>
      )}
      <p className="text-[10px] text-ink-muted mt-2">💡 Drag props onto the canvas</p>

      <AddPropModal isOpen={isAddPropModalOpen} onClose={() => setIsAddPropModalOpen(false)} />
    </div>
  );
};
