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
import { useHistoryStore } from '../../stores/historyStore';
import type { MapAction } from '../../types/map';
import { FiEye, FiEyeOff, FiChevronDown, FiChevronRight, FiPackage, FiLayers, FiTrash } from 'react-icons/fi';
import { FaGripVertical } from 'react-icons/fa';
import type { PropInstance, MapLayer } from '../../types/map';

interface PropItemProps {
  prop: PropInstance;
  layerId: string;
  isSelected: boolean;
  onSelect: (propId: string, isMultiSelect: boolean) => void;
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

  const handleClick = (e: React.MouseEvent) => {
    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
    onSelect(prop.id, isMultiSelect);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded border transition-all cursor-pointer ${
        isSelected
          ? 'bg-accent/10 border-accent/30'
          : 'bg-raised/30 border-edge hover:border-edge-strong'
      }`}
      onClick={handleClick}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-ink-muted hover:text-ink-secondary"
      >
        <FaGripVertical size={12} />
      </div>

      {/* Prop Icon */}
      <FiPackage size={14} className="text-ink-secondary shrink-0" />

      {/* Prop Name */}
      <div className="flex-1 min-w-0">
        <div className="text-xs truncate text-ink">{displayName}</div>
        <div className="text-[10px] text-ink-muted">z: {prop.zIndex}</div>
      </div>

      {/* Visibility Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const newVisible = !prop.visible;
          updateProp(layerId, prop.id, { visible: newVisible });
          useHistoryStore.getState().addAction({
            type: 'UPDATE_PROP',
            layerId,
            propId: prop.id,
            changes: { visible: newVisible },
            previousChanges: { visible: prop.visible },
          });
        }}
        className="text-ink-muted hover:text-ink transition-colors"
        title={prop.visible ? 'Hide' : 'Show'}
      >
        {prop.visible ? <FiEye size={14} /> : <FiEyeOff size={14} />}
      </button>
      <button onClick={(e)=> {
        e.stopPropagation();
        if (onDelete) onDelete(prop.id);
      }}>
        <FiTrash size={14} className="text-ink-muted hover:text-danger transition-colors" />
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
      const historyActions: MapAction[] = [];
      newOrder.forEach((prop, index) => {
        const newZIndex = newOrder.length - 1 - index;
        if (prop.zIndex !== newZIndex) {
          historyActions.push({
            type: 'UPDATE_PROP',
            layerId: layer.id,
            propId: prop.id,
            changes: { zIndex: newZIndex },
            previousChanges: { zIndex: prop.zIndex },
          });
          updateProp(layer.id, prop.id, { zIndex: newZIndex });
        }
      });

      if (historyActions.length === 1) {
        useHistoryStore.getState().addAction(historyActions[0]);
      } else if (historyActions.length > 1) {
        useHistoryStore.getState().addAction({ type: 'BATCH', actions: historyActions });
      }
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
    <div className="border-b border-edge pb-2">
      {/* Layer Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-raised/50 transition-colors rounded"
      >
        {isExpanded ? (
          <FiChevronDown size={14} className="text-ink-secondary" />
        ) : (
          <FiChevronRight size={14} className="text-ink-secondary" />
        )}
        <FiLayers size={14} className="text-ink-secondary" />
        <span className="text-xs font-medium text-ink-secondary flex-1 text-left">
          {layer.name}
        </span>
        <span className="text-[10px] text-ink-muted">
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
                  onSelect={handlePropSelect}
                  onDelete={(propId) => {
                    const prop = layer.props.find(p => p.id === propId);
                    if (prop) {
                      useHistoryStore.getState().addAction({
                        type: 'REMOVE_PROP',
                        layerId: layer.id,
                        propId: prop.id,
                        removedProp: { ...prop },
                      });
                    }
                    removeProp(layer.id, propId);
                  }}
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
      className={`h-full bg-panel border-r border-edge transition-all duration-300 ease-in-out flex flex-col ${
        isOpen ? 'w-64' : 'w-12'
      }`}
    >
      {isOpen ? (
        <>
          {/* Header */}
          <div className="h-12 border-b border-edge flex items-center justify-between px-3 bg-panel/80">
            <h2 className="text-sm font-semibold text-ink">Props Hierarchy</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded hover:bg-raised text-ink-secondary hover:text-ink transition-colors"
              title="Collapse"
            >
              ←
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-2" onClick={handleEmptyClick}>
            {layersWithProps.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <FiPackage size={32} className="mx-auto mb-2 text-ink-muted opacity-50" />
                <p className="text-ink-muted">No props placed yet</p>
                <p className="mt-1 text-[10px] text-ink-muted">Use the Prop tool to add props</p>
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
          <div className="border-t border-edge px-3 py-2 text-[10px] text-ink-muted">
            <p>💡 Drag to reorder (top = front)</p>
            <p>Click empty space or press Esc to deselect</p>
          </div>
        </>
      ) : (
        /* Collapsed state */
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 rounded hover:bg-raised text-ink-secondary hover:text-ink transition-colors"
            title="Expand Props Hierarchy"
          >
            →
          </button>
        </div>
      )}
    </aside>
  );
};
