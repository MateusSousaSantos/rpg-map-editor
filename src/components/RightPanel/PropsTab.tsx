import { useState } from "react";
import { useMapStore } from "../../stores/mapStore";
import { useToolStore } from "../../stores/toolStore";
import { useUISelectionStore } from "../../stores/uiSelectionStore";
import { FiTrash2, FiEye, FiEyeOff, FiLock, FiUnlock } from "react-icons/fi";
import { FaChevronDown } from "react-icons/fa";

interface PropCategoryProps {
  title: string;
  props: any[];
  selectedPropId: string | null;
  draggedPropId: string | null;
  onDragStart: (e: React.DragEvent, propDefId: string) => void;
  onDragEnd: () => void;
  onSelect: (propDefId: string) => void;
}

const PropCategory = ({
  title,
  props,
  selectedPropId,
  draggedPropId,
  onDragStart,
  onDragEnd,
  onSelect,
}: PropCategoryProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="space-y-2">
      {/* Category header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="flex-1 text-left text-xs font-semibold text-ink-secondary hover:text-ink transition-colors capitalize">
          {title}
          <span className="ml-1.5 text-ink-muted font-normal">({props.length})</span>
        </button>
        <FaChevronDown
          size={12}
          className={`text-ink-muted transition-transform ${
            isExpanded ? "rotate-0" : "-rotate-180"
          }`}
        />
      </div>

      {/* Props grid */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="grid grid-cols-4 gap-2">
          {props.map((def) => (
            <div
              key={def.id}
              draggable
              onDragStart={(e) => onDragStart(e, def.id)}
              onDragEnd={onDragEnd}
              onClick={() => onSelect(def.id)}
              className={`relative rounded cursor-grab active:cursor-grabbing transition-all ${
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
            </div>
          ))}
          {props.length === 0 && (
            <div className="col-span-4 text-xs text-ink-muted text-center py-2">
              No {title.toLowerCase()} props
            </div>
          )}
        </div>
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

  const [draggedPropId, setDraggedPropId] = useState<string | null>(null);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);
  const [isPropertiesExpanded, setIsPropertiesExpanded] = useState(true);

  if (!map) return null;

  // Group props by tags
  const propsByTag = new Map<string, any[]>();
  const uncategorizedProps: any[] = [];

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
          <FaChevronDown
            size={12}
            className={`text-ink-muted transition-transform ${
              isLibraryExpanded ? "rotate-0" : "-rotate-180"
            }`}
          />
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
    </div>
  );
};
