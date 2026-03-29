import { useState } from "react";
import { useMapStore } from "../../stores/mapStore";
import { useToolStore } from "../../stores/toolStore";
import { useUISelectionStore } from "../../stores/uiSelectionStore";
import { FiTrash2, FiEye, FiEyeOff, FiLock, FiUnlock, FiPlus } from "react-icons/fi";
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

export const PropsTab = () => {
  const map = useMapStore((state) => state.map);
  const { selectedPropDefinitionId, setSelectedPropDefinition } = useToolStore();
  const { selectedPropIds, selectedLayerId, selectionMode } = useUISelectionStore();
  const updateProp = useMapStore((state) => state.updateProp);
  const removeProp = useMapStore((state) => state.removeProp);
  const removePropDefinition = useMapStore((state) => state.removePropDefinition);

  const [draggedPropId, setDraggedPropId] = useState<string | null>(null);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);
  const [isPropertiesExpanded, setIsPropertiesExpanded] = useState(true);
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

  const selectedProp =
    selectedPropIds.size === 1 && selectedLayerId
      ? map.layers
          .find((l) => l.id === selectedLayerId)
          ?.props.find((p) => p.id === Array.from(selectedPropIds)[0])
      : null;

  const selectedPropDefinition = selectedProp
    ? map.propDefinitions.find((def) => def.id === selectedProp.definitionId)
    : null;

  const handleDragStart = (e: React.DragEvent, propDefId: string) => {
    setDraggedPropId(propDefId);
    e.dataTransfer.setData("propDefinitionId", propDefId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragEnd = () => setDraggedPropId(null);

  return (
    <div className="space-y-4">
      {/* Prop Library */}
      <div className="space-y-2">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsLibraryExpanded(!isLibraryExpanded)}
        >
          <span className="text-xs font-semibold text-ink-secondary hover:text-ink transition-colors">
            Library
            <span className="ml-1.5 text-ink-muted font-normal">
              ({map.propDefinitions.length})
            </span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAddPropModalOpen(true);
              }}
              className="rounded p-0.5 text-ink-muted hover:bg-raised hover:text-prop transition-colors"
              title="Add custom prop"
              aria-label="Add custom prop"
            >
              <FiPlus size={14} />
            </button>
            <FaChevronDown
              size={12}
              className={`text-ink-muted transition-transform ${
                isLibraryExpanded ? "rotate-0" : "-rotate-180"
              }`}
            />
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isLibraryExpanded ? "max-h-150 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
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
          <p className="text-[10px] text-ink-muted mt-2">
            💡 Drag props onto the canvas
          </p>
        </div>
      </div>

      {/* Selected Prop Properties */}
      {selectionMode === "props" && selectedProp && selectedPropDefinition && selectedLayerId && (
        <div className="space-y-2 border-t border-edge pt-3">
          {/* Section header */}
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsPropertiesExpanded(!isPropertiesExpanded)}
          >
            <span className="text-xs font-semibold text-ink-secondary hover:text-ink transition-colors">
              Selected Prop
            </span>
            <FaChevronDown
              size={12}
              className={`text-ink-muted transition-transform ${
                isPropertiesExpanded ? "rotate-0" : "-rotate-180"
              }`}
            />
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isPropertiesExpanded ? "max-h-150 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="text-xs text-ink-muted block mb-1">Name</label>
                <div className="text-sm text-ink">{selectedPropDefinition.name}</div>
              </div>

              {/* Position */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-ink-muted block mb-1">X</label>
                  <div className="w-full px-2 py-1 text-sm bg-canvas border border-edge rounded text-ink-secondary">
                    {Math.round(selectedProp.x)}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Y</label>
                  <div className="w-full px-2 py-1 text-sm bg-canvas border border-edge rounded text-ink-secondary">
                    {Math.round(selectedProp.y)}
                  </div>
                </div>
              </div>

              {/* Size */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Width</label>
                  <div className="w-full px-2 py-1 text-sm bg-canvas border border-edge rounded text-ink-secondary">
                    {Math.round(selectedProp.width)}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Height</label>
                  <div className="w-full px-2 py-1 text-sm bg-canvas border border-edge rounded text-ink-secondary">
                    {Math.round(selectedProp.height)}
                  </div>
                </div>
              </div>

              {/* Rotation */}
              <div>
                <label className="text-xs text-ink-muted block mb-1">Rotation</label>
                <div className="w-full px-2 py-1 text-sm bg-canvas border border-edge rounded text-ink-secondary">
                  {Math.round(selectedProp.rotation)}°
                </div>
              </div>

              {/* Scale */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Scale X</label>
                  <div className="w-full px-2 py-1 text-sm bg-canvas border border-edge rounded text-ink-secondary">
                    {selectedProp.scaleX.toFixed(2)}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Scale Y</label>
                  <div className="w-full px-2 py-1 text-sm bg-canvas border border-edge rounded text-ink-secondary">
                    {selectedProp.scaleY.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-ink-muted bg-raised rounded px-2 py-1.5">
                💡 Use handles on canvas to resize and rotate
              </div>

              {/* Opacity */}
              <div>
                <label className="text-xs text-ink-muted block mb-1">
                  Opacity: {Math.round(selectedProp.opacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={selectedProp.opacity}
                  onChange={(e) =>
                    updateProp(selectedLayerId, selectedProp.id, {
                      opacity: parseFloat(e.target.value),
                    })
                  }
                  className="opacity-slider w-full"
                />
              </div>

              {/* Z-Index */}
              <div>
                <label className="text-xs text-ink-muted block mb-1">Z-Index</label>
                <input
                  type="number"
                  value={selectedProp.zIndex}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v))
                      updateProp(selectedLayerId, selectedProp.id, { zIndex: v });
                  }}
                  className="w-full px-2 py-1 text-sm bg-raised border border-edge rounded text-ink focus:outline-none focus:border-accent-light"
                />
              </div>

              {/* Visibility & Lock */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updateProp(selectedLayerId, selectedProp.id, {
                      visible: !selectedProp.visible,
                    })
                  }
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded border transition-colors ${
                    selectedProp.visible
                      ? "bg-vis/15 border-vis/30 text-vis hover:bg-vis/25"
                      : "bg-raised border-edge text-ink-muted hover:bg-overlay"
                  }`}
                  title={selectedProp.visible ? "Visible" : "Hidden"}
                >
                  {selectedProp.visible ? <FiEye size={15} /> : <FiEyeOff size={15} />}
                </button>

                <button
                  onClick={() =>
                    updateProp(selectedLayerId, selectedProp.id, {
                      locked: !selectedProp.locked,
                    })
                  }
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded border transition-colors ${
                    selectedProp.locked
                      ? "bg-lock/15 border-lock/30 text-lock hover:bg-lock/25"
                      : "bg-raised border-edge text-ink-muted hover:bg-overlay"
                  }`}
                  title={selectedProp.locked ? "Locked" : "Unlocked"}
                >
                  {selectedProp.locked ? <FiLock size={15} /> : <FiUnlock size={15} />}
                </button>
              </div>

              {/* Delete */}
              <button
                onClick={() => removeProp(selectedLayerId, selectedProp.id)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-danger/15 border border-danger/30 text-danger rounded hover:bg-danger/25 transition-colors"
              >
                <FiTrash2 size={15} />
                <span className="text-sm">Delete Prop</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-selection info */}
      {selectionMode === "props" && selectedPropIds.size > 1 && (
        <div className="border-t border-edge pt-3">
          <p className="text-xs text-ink-secondary font-semibold">
            Multiple Props Selected
          </p>
          <p className="text-xs text-ink-muted mt-1">{selectedPropIds.size} props selected</p>
        </div>
      )}

      <AddPropModal
        isOpen={isAddPropModalOpen}
        onClose={() => setIsAddPropModalOpen(false)}
      />
    </div>
  );
};
