/**
 * PropsHierarchy - Left sidebar showing all props per layer with drag-to-reorder z-index
 */

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMapStore } from '../../stores/mapStore';
import { useUISelectionStore } from '../../stores/uiSelectionStore';
import { FiEye, FiEyeOff, FiChevronDown, FiChevronRight, FiPackage, FiLayers, FiTrash } from 'react-icons/fi';
import { FaGripVertical } from 'react-icons/fa';
import type { PropInstance, MapLayer } from '../../types/map';

interface PropItemProps {
  prop: PropInstance;
  layerId: string;
  isSelected: boolean;
  onSelect: (propId: string) => void;
  onDelete?: (propId: string) => void;
}

const PropItem = ({ prop, layerId, isSelected, onSelect, onDelete }: PropItemProps) => {
  const updateProp = useMapStore((state) => state.updateProp);
  const propDefinitions = useMapStore((state) => state.map?.propDefinitions || []);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  const definition = propDefinitions.find(def => def.id === prop.definitionId);
  const displayName = prop.name || definition?.name || 'Unnamed Prop';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded border transition-all ${
        isSelected
          ? 'bg-blue-600/20 border-blue-500/50'
          : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
      }`}
      onClick={() => onSelect(prop.id)}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300"
      >
        <FaGripVertical size={12} />
      </div>

      {/* Prop Icon */}
      <FiPackage size={14} className="text-slate-400 shrink-0" />

      {/* Prop Name */}
      <div className="flex-1 min-w-0">
        <div className="text-xs truncate text-slate-200">{displayName}</div>
        <div className="text-[10px] text-slate-500">z: {prop.zIndex}</div>
      </div>

      {/* Visibility Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          updateProp(layerId, prop.id, { visible: !prop.visible });
        }}
        className="text-slate-500 hover:text-slate-300 transition-colors"
        title={prop.visible ? 'Hide' : 'Show'}
      >
        {prop.visible ? <FiEye size={14} /> : <FiEyeOff size={14} />}
      </button>
      <button onClick={(e)=> {
        e.stopPropagation();
        if (onDelete) onDelete(prop.id);
      }}>
        <FiTrash size={14} className="text-slate-500 hover:text-red-500 transition-colors" />
      </button>
    </div>
  );
};

interface LayerPropsGroupProps {
  layer: MapLayer;
}

const LayerPropsGroup = ({ layer }: LayerPropsGroupProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { selectedPropIds, selectProps, togglePropSelection } = useUISelectionStore();
  const updateProp = useMapStore((state) => state.updateProp);
  const removeProp = useMapStore((state) => state.removeProp);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort props by z-index (highest first, so topmost items appear at top of list)
  const sortedProps = [...layer.props].sort((a, b) => b.zIndex - a.zIndex);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedProps.findIndex((p) => p.id === active.id);
      const newIndex = sortedProps.findIndex((p) => p.id === over.id);

      // Reorder the array
      const newOrder = arrayMove(sortedProps, oldIndex, newIndex);
      
      // Update z-indices based on new order (higher index = higher z-index)
      // Since we display highest z-index first, we need to reverse the assignment
      newOrder.forEach((prop, index) => {
        const newZIndex = newOrder.length - 1 - index;
        if (prop.zIndex !== newZIndex) {
          updateProp(layer.id, prop.id, { zIndex: newZIndex });
        }
      });
    }
  };

  const handlePropSelect = (propId: string, isMultiSelect: boolean) => {
    if (isMultiSelect) {
      togglePropSelection(propId);
    } else {
      selectProps([propId]);
    }
  };

  if (layer.props.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-slate-800 pb-2">
      {/* Layer Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/50 transition-colors rounded"
      >
        {isExpanded ? (
          <FiChevronDown size={14} className="text-slate-400" />
        ) : (
          <FiChevronRight size={14} className="text-slate-400" />
        )}
        <FiLayers size={14} className="text-slate-400" />
        <span className="text-xs font-medium text-slate-300 flex-1 text-left">
          {layer.name}
        </span>
        <span className="text-[10px] text-slate-500">
          {layer.props.length} prop{layer.props.length !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Props List */}
      {isExpanded && (
        <div className="mt-1 space-y-0.5 pl-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedProps.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedProps.map((prop) => (
                <PropItem
                  key={prop.id}
                  prop={prop}
                  layerId={layer.id}
                  isSelected={selectedPropIds.has(prop.id)}
                  onSelect={(propId) => handlePropSelect(propId, false)}
                  onDelete={(propId) => removeProp(layer.id, propId)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
};

export const PropsHierarchy = () => {
  const map = useMapStore((state) => state.map);
  const [isOpen, setIsOpen] = useState(true);
  const { clearSelection } = useUISelectionStore();

  if (!map) return null;

  // Get layers sorted by depth index
  const sortedLayers = [...map.layers].sort((a, b) => b.depthIndex - a.depthIndex);
  
  // Filter to only show layers that have props
  const layersWithProps = sortedLayers.filter(layer => layer.props.length > 0);
  
  const handleEmptyClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on the container, not on children
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  };

  return (
    <aside
      className={`h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out flex flex-col ${
        isOpen ? 'w-64' : 'w-12'
      }`}
    >
      {isOpen ? (
        <>
          {/* Header */}
          <div className="h-12 border-b border-slate-800 flex items-center justify-between px-3 bg-slate-900/80">
            <h2 className="text-sm font-semibold text-slate-100">Props Hierarchy</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Collapse"
            >
              ←
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-2" onClick={handleEmptyClick}>
            {layersWithProps.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <FiPackage size={32} className="mx-auto mb-2 opacity-50" />
                <p>No props placed yet</p>
                <p className="mt-1 text-[10px]">Use the Prop tool to add props</p>
              </div>
            ) : (
              <div className="space-y-2">
                {layersWithProps.map((layer) => (
                  <LayerPropsGroup key={layer.id} layer={layer} />
                ))}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="border-t border-slate-800 px-3 py-2 text-[10px] text-slate-500">
            <p>💡 Drag to reorder (top = front)</p>
            <p>Click empty space or press Esc to deselect</p>
          </div>
        </>
      ) : (
        /* Collapsed state */
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Expand Props Hierarchy"
          >
            →
          </button>
        </div>
      )}
    </aside>
  );
};
