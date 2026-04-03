/**
 * PropsPanel - Shows available prop definitions and properties of selected props
 */

import { useMapStore } from "../../stores/mapStore";
import { useToolStore } from "../../stores/toolStore";
import { useUISelectionStore } from "../../stores/uiSelectionStore";
import { FiTrash2, FiEye, FiEyeOff, FiLock, FiUnlock } from "react-icons/fi";
import { FaChevronDown } from "react-icons/fa";
import { useState } from "react";
import type { PropColorSlot } from "../../types/map";

// ─── Prop Palette Panel ────────────────────────────────────────────────────

const HUE_PRESETS = [
  { label: "Green",  hue: 120, color: "#4ade80" },
  { label: "Blue",   hue: 210, color: "#60a5fa" },
  { label: "Red",    hue: 0,   color: "#f87171" },
  { label: "Yellow", hue: 55,  color: "#facc15" },
  { label: "Purple", hue: 270, color: "#c084fc" },
  { label: "Brown",  hue: 30,  color: "#a78a5a" },
  { label: "Cyan",   hue: 185, color: "#22d3ee" },
  { label: "Orange", hue: 25,  color: "#fb923c" },
];

interface PropPalettePanelProps {
  colorSlots: PropColorSlot[];
  slotHues: Record<string, number>;
  onSetSlotHue: (slot: string, hue: number) => void;
  onReset: () => void;
}

const PropPalettePanel = ({
  colorSlots,
  slotHues,
  onSetSlotHue,
  onReset,
}: PropPalettePanelProps) => (
  <div className="border border-slate-700 rounded p-3 space-y-3 bg-slate-900/40">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-300">Prop Colors</span>
      <button
        onClick={onReset}
        className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
      >
        Reset
      </button>
    </div>
    {colorSlots.map((slot) => (
      <div key={slot.name} className="space-y-1">
        <label className="text-[10px] text-slate-400 block">
          {slot.label}
          {slotHues[slot.name] !== undefined && (
            <span className="ml-1 text-slate-500">— {slotHues[slot.name]}°</span>
          )}
        </label>
        {/* Hue preset chips */}
        <div className="flex flex-wrap gap-1">
          {HUE_PRESETS.map((p) => (
            <button
              key={p.label}
              title={p.label}
              onClick={() => onSetSlotHue(slot.name, p.hue)}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: p.color,
                borderColor: slotHues[slot.name] === p.hue ? "#e2e8f0" : "transparent",
              }}
            />
          ))}
        </div>
        {/* Fine-tune hue slider */}
        <input
          type="range"
          min="0"
          max="359"
          value={slotHues[slot.name] ?? 0}
          onChange={(e) => onSetSlotHue(slot.name, Number(e.target.value))}
          className="w-full"
          style={{
            background: `linear-gradient(to right, hsl(0,70%,50%), hsl(60,70%,50%), hsl(120,70%,50%), hsl(180,70%,50%), hsl(240,70%,50%), hsl(300,70%,50%), hsl(360,70%,50%))`,
          }}
        />
      </div>
    ))}
    <p className="text-[10px] text-slate-500">
      💡 Hues apply to the next placed prop
    </p>
  </div>
);

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
      {/* Category Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="flex-1 text-left text-xs font-semibold text-slate-300 hover:text-slate-100 transition-colors capitalize">
          {title} ({props.length})
        </button>
        <FaChevronDown
          size={12}
          className={`text-slate-400 hover:text-slate-200 transition-transform ${
            isExpanded ? "rotate-0" : "-rotate-180"
          }`}
        />
      </div>

      {/* Props Grid */}
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
              className={`relative border rounded cursor-grab active:cursor-grabbing transition-all ${
                selectedPropId === def.id
                  ? "border-orange-500 bg-orange-600/20"
                  : draggedPropId === def.id
                  ? "border-slate-500 opacity-50"
                  : "border-slate-700 hover:border-slate-500"
              }`}
              title={def.name}
            >
              {/* Prop Preview */}
              <div className="relative w-full aspect-square bg-slate-900/50 rounded overflow-hidden">
                <img
                  src={def.textureUrl}
                  alt={def.name}
                  className="w-full h-full object-contain"
                  style={{
                    imageRendering: "pixelated",
                  }}
                />
              </div>
            </div>
          ))}
          {props.length === 0 && (
            <div className="col-span-4 text-xs text-slate-500 text-center py-2">
              No {title.toLowerCase()} props
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const PropsPanel = () => {
  const map = useMapStore((state) => state.map);
  const {
    selectedPropDefinitionId,
    setSelectedPropDefinition,
    propSlotHues,
    setPropSlotHue,
    resetPropSlotHues,
  } = useToolStore();
  const { selectedPropIds, selectedLayerId, selectionMode } =
    useUISelectionStore();
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
      // Add prop to each of its tags
      def.tags.forEach((tag) => {
        if (!propsByTag.has(tag)) {
          propsByTag.set(tag, []);
        }
        propsByTag.get(tag)!.push(def);
      });
    }
  });

  // Sort tags alphabetically
  const sortedTags = Array.from(propsByTag.keys()).sort();

  // Get the selected prop instance if there's exactly one selected
  const selectedProp =
    selectedPropIds.size === 1 && selectedLayerId
      ? map.layers
          .find((l) => l.id === selectedLayerId)
          ?.props.find((p) => p.id === Array.from(selectedPropIds)[0])
      : null;

  const selectedPropDefinition = selectedProp
    ? map.propDefinitions.find((def) => def.id === selectedProp.definitionId)
    : null;

  // Prop def currently selected in the library (for placement tool)
  const activePlaceDef = selectedPropDefinitionId
    ? map.propDefinitions.find((d) => d.id === selectedPropDefinitionId)
    : null;

  const handleDragStart = (e: React.DragEvent, propDefId: string) => {
    setDraggedPropId(propDefId);
    e.dataTransfer.setData("propDefinitionId", propDefId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragEnd = () => {
    setDraggedPropId(null);
  };

  return (
    <div className="space-y-4 border-b border-slate-700 pb-4">
      {/* Prop Library Section */}
      <div className="space-y-2">
        {/* Section Header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsLibraryExpanded(!isLibraryExpanded)}
        >
          <h3 className="text-sm font-semibold text-slate-200 hover:text-slate-100 transition-colors">
            Prop Library ({map.propDefinitions.length})
          </h3>
          <FaChevronDown
            size={14}
            className={`text-slate-400 hover:text-slate-200 transition-transform ${
              isLibraryExpanded ? "rotate-0" : "-rotate-180"
            }`}
          />
        </div>

        {/* Library Content */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isLibraryExpanded ? "max-h-150 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {map.propDefinitions.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No props available</p>
          ) : (
            <div className="space-y-4 pl-2">
              {/* Render each tag category */}
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

              {/* Uncategorized props */}
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
          <p className="text-[10px] text-slate-500 mt-2">
            💡 Drag props onto the canvas
          </p>
        </div>
      </div>

      {/* Prop Palette Controls — shown when the selected library def supports recoloring */}
      {activePlaceDef?.supportsRecolor && activePlaceDef.colorSlots?.length && (
        <PropPalettePanel
          colorSlots={activePlaceDef.colorSlots}
          slotHues={propSlotHues}
          onSetSlotHue={setPropSlotHue}
          onReset={resetPropSlotHues}
        />
      )}

      {/* Selected Prop Properties Section */}
      {selectionMode === "props" &&
        selectedProp &&
        selectedPropDefinition &&
        selectedLayerId && (
          <div className="space-y-2">
            {/* Section Header */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsPropertiesExpanded(!isPropertiesExpanded)}
            >
              <h3 className="text-sm font-semibold text-slate-200 hover:text-slate-100 transition-colors">
                Selected Prop
              </h3>
              <FaChevronDown
                size={14}
                className={`text-slate-400 hover:text-slate-200 transition-transform ${
                  isPropertiesExpanded ? "rotate-0" : "-rotate-180"
                }`}
              />
            </div>

            {/* Properties Content */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isPropertiesExpanded
                  ? "max-h-200 opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="space-y-3 pl-1">
                {/* Name */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Name
                  </label>
                  <div className="text-sm text-slate-200">
                    {selectedPropDefinition.name}
                  </div>
                </div>

                {/* Position - Read only display */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      X
                    </label>
                    <div className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300">
                      {Math.round(selectedProp.x)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Y
                    </label>
                    <div className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300">
                      {Math.round(selectedProp.y)}
                    </div>
                  </div>
                </div>

                {/* Size - Read only display */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Width
                    </label>
                    <div className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300">
                      {Math.round(selectedProp.width)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Height
                    </label>
                    <div className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300">
                      {Math.round(selectedProp.height)}
                    </div>
                  </div>
                </div>

                {/* Rotation - Read only display */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Rotation
                  </label>
                  <div className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300">
                    {Math.round(selectedProp.rotation)}°
                  </div>
                </div>

                {/* Scale - Read only display */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Scale X
                    </label>
                    <div className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300">
                      {selectedProp.scaleX.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Scale Y
                    </label>
                    <div className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300">
                      {selectedProp.scaleY.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 bg-slate-800/50 rounded px-2 py-1.5">
                  💡 Use handles on canvas to resize and rotate
                </div>

                {/* Opacity */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Opacity: {Math.round(selectedProp.opacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={selectedProp.opacity}
                    onChange={(e) => {
                      const newOpacity = parseFloat(e.target.value);
                      updateProp(selectedLayerId, selectedProp.id, {
                        opacity: newOpacity,
                      });
                    }}
                    className="w-full"
                  />
                </div>

                {/* Z-Index */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Z-Index (Depth)
                  </label>
                  <input
                    type="number"
                    value={selectedProp.zIndex}
                    onChange={(e) => {
                      const newZIndex = parseInt(e.target.value);
                      if (!isNaN(newZIndex)) {
                        updateProp(selectedLayerId, selectedProp.id, {
                          zIndex: newZIndex,
                        });
                      }
                    }}
                    className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-slate-200"
                  />
                </div>

                {/* Visibility and Lock Controls */}
                <div className="flex items-center gap-2">
                  {/* Visibility Toggle */}
                  <button
                    onClick={() => {
                      updateProp(selectedLayerId, selectedProp.id, {
                        visible: !selectedProp.visible,
                      });
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${
                      selectedProp.visible
                        ? "bg-blue-600/20 border border-blue-600/50 text-blue-300 hover:bg-blue-600/30"
                        : "bg-slate-800 border border-slate-700 text-slate-500 hover:bg-slate-700"
                    }`}
                    title={selectedProp.visible ? "Visible" : "Hidden"}
                  >
                    {selectedProp.visible ? (
                      <FiEye size={16} />
                    ) : (
                      <FiEyeOff size={16} />
                    )}
                  </button>

                  {/* Lock Toggle */}
                  <button
                    onClick={() => {
                      updateProp(selectedLayerId, selectedProp.id, {
                        locked: !selectedProp.locked,
                      });
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${
                      selectedProp.locked
                        ? "bg-orange-600/20 border border-orange-600/50 text-orange-300 hover:bg-orange-600/30"
                        : "bg-slate-800 border border-slate-700 text-slate-500 hover:bg-slate-700"
                    }`}
                    title={selectedProp.locked ? "Locked" : "Unlocked"}
                  >
                    {selectedProp.locked ? (
                      <FiLock size={16} />
                    ) : (
                      <FiUnlock size={16} />
                    )}
                  </button>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => {
                    removeProp(selectedLayerId, selectedProp.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 border border-red-600/50 text-red-300 rounded hover:bg-red-600/30 transition-colors"
                >
                  <FiTrash2 size={16} />
                  <span className="text-sm">Delete Prop</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Multi-selection info */}
      {selectionMode === "props" && selectedPropIds.size > 1 && (
        <div className="space-y-2">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              Multiple Props Selected
            </h3>
          </div>
          <p className="text-xs text-slate-500 pl-1">
            {selectedPropIds.size} props selected
          </p>
        </div>
      )}
    </div>
  );
};
