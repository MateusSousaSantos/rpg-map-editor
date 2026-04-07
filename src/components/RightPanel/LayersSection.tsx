import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMapStore } from "../../stores/mapStore";
import { useUISelectionStore } from "../../stores/uiSelectionStore";
import { FiEye, FiEyeOff, FiLock, FiUnlock, FiGrid } from "react-icons/fi";
import { FaPlus, FaMinus, FaCopy, FaGripVertical } from "react-icons/fa";
import type { MapLayer } from "../../types/map";

interface LayerItemProps {
  layer: MapLayer;
  isActive: boolean;
  onSelect: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onRename: (layerId: string, newName: string) => void;
  onDelete: (layerId: string) => void;
  onChangeOpacity: (layerId: string, opacity: number) => void;
}

const LayerItem = ({
  layer,
  isActive,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onChangeOpacity,
}: LayerItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRename = () => {
    if (editName.trim() && editName !== layer.name) {
      onRename(layer.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRename();
    else if (e.key === "Escape") {
      setEditName(layer.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded border transition-all flex-wrap ${
        isActive
          ? "bg-accent/10 border-accent-light"
          : "bg-raised/50 border-edge hover:border-edge-strong"
      } ${layer.locked ? "opacity-60" : ""}`}
      onClick={() => !isEditing && onSelect(layer.id)}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-ink-muted hover:text-ink-secondary p-0.5 shrink-0"
      >
        <FaGripVertical size={14} />
      </div>

      {/* Layer Name */}
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="flex-1 px-2 py-0.5 text-sm bg-canvas border border-edge rounded text-ink focus:outline-none focus:border-accent-light"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          className="flex-1 text-sm text-ink truncate"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          {layer.name}
        </div>
      )}

      {/* Action buttons – visible on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock(layer.id);
          }}
          className="p-1 rounded hover:bg-overlay text-ink-muted hover:text-ink transition-colors"
          title={layer.locked ? "Unlock layer" : "Lock layer"}
        >
          {layer.locked ? <FiLock size={13} /> : <FiUnlock size={13} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(layer.id);
          }}
          className="p-1 rounded hover:bg-overlay text-ink-muted hover:text-ink transition-colors"
          title={layer.visible ? "Hide layer" : "Show layer"}
        >
          {layer.visible ? <FiEye size={13} /> : <FiEyeOff size={13} />}
        </button>
      </div>

      {/* Opacity slider – visible when active */}
      {isActive && (
        <div
          className="flex items-center gap-1.5 w-full mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] text-ink-muted shrink-0">Opacity</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={layer.opacity}
            onChange={(e) => onChangeOpacity(layer.id, parseFloat(e.target.value))}
            className="flex-1 h-1 accent-accent cursor-pointer"
          />
          <span className="text-[10px] text-ink-muted w-7 text-right shrink-0">
            {Math.round(layer.opacity * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};

export const LayersSection = () => {
  const { map, addLayer, removeLayer, updateLayer, reorderLayers } = useMapStore();
  const { selectedLayerId, selectLayer, showGrid, toggleGrid } = useUISelectionStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!map) return null;

  const sortedLayers = [...map.layers].sort((a, b) => a.depthIndex - b.depthIndex);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedLayers.findIndex((l) => l.id === active.id);
      const newIndex = sortedLayers.findIndex((l) => l.id === over.id);
      reorderLayers(arrayMove(sortedLayers, oldIndex, newIndex).map((l) => l.id));
    }
  };

  const handleAddLayer = () => {
    const newLayer: MapLayer = {
      id: crypto.randomUUID(),
      name: `Layer ${map.layers.length + 1}`,
      type: "tile",
      visible: true,
      opacity: 1,
      depthIndex: map.layers.length,
      tiles: new Map(),
      tilesById: new Map(),
      props: [],
    };
    addLayer(newLayer);
    selectLayer(newLayer.id);
  };

  const handleToggleVisibility = (layerId: string) => {
    const layer = map.layers.find((l) => l.id === layerId);
    if (layer) updateLayer(layerId, { visible: !layer.visible });
  };

  const handleToggleLock = (layerId: string) => {
    const layer = map.layers.find((l) => l.id === layerId);
    if (layer) updateLayer(layerId, { locked: !layer.locked });
  };

  const handleRename = (layerId: string, newName: string) => {
    updateLayer(layerId, { name: newName });
  };

  const handleDelete = (layerId: string) => {
    if (map.layers.length <= 1) {
      alert("Cannot delete the last layer!");
      return;
    }
    removeLayer(layerId);
    if (selectedLayerId === layerId) selectLayer(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-edge shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Layers
        </span>
        <button
          onClick={toggleGrid}
          className={`p-1.5 rounded transition-colors ${
            showGrid
              ? "bg-vis/15 text-vis border border-vis/30"
              : "text-ink-muted hover:text-ink hover:bg-raised"
          }`}
          title={showGrid ? "Hide grid" : "Show grid"}
        >
          <FiGrid size={14} />
        </button>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedLayers.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {[...sortedLayers].reverse().map((layer) => (
              <LayerItem
                key={layer.id}
                layer={layer}
                isActive={layer.id === selectedLayerId}
                onSelect={selectLayer}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
                onRename={handleRename}
                onDelete={handleDelete}
                onChangeOpacity={(layerId, opacity) => updateLayer(layerId, { opacity })}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-t border-edge shrink-0">
        <button
          onClick={handleAddLayer}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-raised hover:bg-overlay border border-edge text-ink rounded transition-colors"
          title="Add layer"
        >
          <FaPlus size={9} />
          Add
        </button>
        <button
          onClick={() => {}}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-raised hover:bg-overlay border border-edge text-ink rounded transition-colors"
          title="Duplicate layer"
        >
          <FaCopy size={9} />
          Dupe
        </button>
        <button
          onClick={() => selectedLayerId != null && handleDelete(selectedLayerId)}
          disabled={map.layers.length <= 1}
          className="flex items-center gap-1 px-2 py-1 text-xs border rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-danger border-danger/30 hover:bg-danger/15"
          title="Remove selected layer"
        >
          <FaMinus size={9} />
          Remove
        </button>
      </div>
    </div>
  );
};
