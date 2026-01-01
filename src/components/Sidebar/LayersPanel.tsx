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
import { FiEye, FiEyeOff, FiLock, FiUnlock } from "react-icons/fi";
import {
  FaPlus,
  FaMinus,
  FaCopy,
  FaGripVertical,
  FaChevronDown,
} from "react-icons/fa";
import type { MapLayer } from "../../types/map";

interface LayerItemProps {
  layer: MapLayer;
  isActive: boolean;
  onSelect: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onRename: (layerId: string, newName: string) => void;
  onDelete: (layerId: string) => void;
}

const LayerItem = ({
  layer,
  isActive,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
}: LayerItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

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
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setEditName(layer.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 p-2 rounded border transition-all ${
        isActive
          ? "bg-slate-600/20 border-slate-200"
          : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
      } ${layer.locked ? "opacity-60" : ""}`}
      onClick={() => !isEditing && onSelect(layer.id)}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-1"
      >
        <FaGripVertical size={16} />
      </div>

      {/* Layer Name */}
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="flex-1 px-2 py-1 text-sm bg-slate-900 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-slate-200"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          className="flex-1 text-sm text-slate-200 truncate"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          {layer.name}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Toggle Lock */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock(layer.id);
          }}
          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title={layer.locked ? "Unlock layer" : "Lock layer"}
        >
          {layer.locked ? <FiLock size={14} /> : <FiUnlock size={14} />}
        </button>

        {/* Toggle Visibility */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(layer.id);
          }}
          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title={layer.visible ? "Hide layer" : "Show layer"}
        >
          {layer.visible ? <FiEye size={14} /> : <FiEyeOff size={14} />}
        </button>
      </div>
    </div>
  );
};

export const LayersPanel = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { map, addLayer, removeLayer, updateLayer, reorderLayers } =
    useMapStore();
  const { selectedLayerId, selectLayer } = useUISelectionStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!map) return null;

  // Sort layers by depthIndex (bottom to top)
  const sortedLayers = [...map.layers].sort(
    (a, b) => a.depthIndex - b.depthIndex
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedLayers.findIndex((l) => l.id === active.id);
      const newIndex = sortedLayers.findIndex((l) => l.id === over.id);

      const newOrder = arrayMove(sortedLayers, oldIndex, newIndex);
      reorderLayers(newOrder.map((l) => l.id));
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
      tileGrids: [
        {
          type: "terrain",
          tiles: new Map(),
        },
        {
          type: "overlay",
          tiles: new Map(),
        },
      ],
      props: [],
    };
    addLayer(newLayer);
    selectLayer(newLayer.id);
  };

  const handleToggleVisibility = (layerId: string) => {
    const layer = map.layers.find((l) => l.id === layerId);
    if (layer) {
      updateLayer(layerId, { visible: !layer.visible });
    }
  };

  const handleToggleLock = (layerId: string) => {
    const layer = map.layers.find((l) => l.id === layerId);
    if (layer) {
      updateLayer(layerId, { locked: !layer.locked });
    }
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
    if (selectedLayerId === layerId) {
      selectLayer(null);
    }
  };

  return (
    <div className="space-y-3 border-b border-slate-700 pb-4">
      {/* Header */}
      <div>
        <div
          className="space-y-2 flex flex-row justify-between items-center w-full"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <button className="flex items-center gap-2 hover:text-slate-100 transition-colors">
            <h2 className="text-lg text-slate-200">Layers</h2>
          </button>
          <FaChevronDown
            size={14}
            className={`text-slate-400 transition-transform ${
              isExpanded ? "rotate-0" : "-rotate-180"
            }`}
          />
        </div>
        {/* Layer Controls */}
      </div>

      {/* Layers List (Reversed - top layer first in UI) */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-250 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2 pb-5">
          <button
            onClick={() => handleAddLayer()}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
            title="Add Layer"
          >
            <FaPlus size={10} />
            Add
          </button>
          <button
            onClick={() => {}}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
            title="Duplicate Layer"
          >
            <FaCopy size={10} />
            Duplicate
          </button>
          <button
            onClick={() =>
              selectedLayerId != null && handleDelete(selectedLayerId)
            }
            disabled={map.layers.length <= 1}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-700 hover:bg-red-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-200 rounded transition-colors"
            title="Remove Layer"
          >
            <FaMinus size={10} />
            Remove
          </button>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedLayers.map((l) => l.id).reverse()}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {/* Reverse to show top layer first */}
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
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Info */}
        {sortedLayers.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-4">
            No layers yet. Click "+ Add Layer" to create one.
          </div>
        )}
      </div>
    </div>
  );
};
