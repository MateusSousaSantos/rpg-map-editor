/**
 * PropsHierarchyContent - collapsible "Objects" section listing all placed props
 * per layer with drag-to-reorder z-index. Rendered inside the right panel below
 * the layers list.
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
import { useTranslation } from '../../hooks/useTranslation';
import { CollapsibleSection } from '../RightPanel/CollapsibleSection';
import type { MapAction } from '../../types/map';
import { FiEye, FiEyeOff, FiChevronDown, FiChevronRight, FiPackage, FiLayers, FiTrash, FiSun, FiSquare } from 'react-icons/fi';
import { TbCone } from 'react-icons/tb';
import { FaGripVertical } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import type { PropInstance, LightInstance, LightType, MapLayer } from '../../types/map';

/** Hierarchy row icon per light shape — mirrors LightsLibrary's card icons. */
const LIGHT_TYPE_ICON: Record<LightType, IconType> = {
  point: FiSun,
  spot: TbCone,
  area: FiSquare,
};

interface PropItemProps {
  prop: PropInstance;
  layerId: string;
  isSelected: boolean;
  onSelect: (propId: string, isMultiSelect: boolean) => void;
  onDelete?: (propId: string) => void;
}

const PropItem = ({ prop, layerId, isSelected, onSelect, onDelete }: PropItemProps) => {
  const { t } = useTranslation();
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
  const displayName = prop.name || definition?.name || t('objects.unnamedProp');

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
        title={prop.visible ? t('objects.hide') : t('objects.show')}
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

interface LightItemProps {
  light: LightInstance;
  layerId: string;
  isSelected: boolean;
  onSelect: (lightId: string, isMultiSelect: boolean) => void;
  onDelete?: (lightId: string) => void;
}

const LightItem = ({ light, layerId, isSelected, onSelect, onDelete }: LightItemProps) => {
  const { t } = useTranslation();
  const updateLight = useMapStore((state) => state.updateLight);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: light.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeLabel: Record<LightType, string> = {
    point: t('light.typePoint'),
    spot: t('light.typeSpot'),
    area: t('light.typeArea'),
  };
  const displayName = light.name || typeLabel[light.type] || t('objects.unnamedLight');
  const Icon = LIGHT_TYPE_ICON[light.type];

  const handleClick = (e: React.MouseEvent) => {
    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
    onSelect(light.id, isMultiSelect);
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

      {/* Light Icon */}
      <Icon size={14} className="text-ink-secondary shrink-0" />

      {/* Light Name */}
      <div className="flex-1 min-w-0">
        <div className="text-xs truncate text-ink">{displayName}</div>
        <div className="text-[10px] text-ink-muted">z: {light.zIndex}</div>
      </div>

      {/* Visibility Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const newVisible = !light.visible;
          updateLight(layerId, light.id, { visible: newVisible });
          useHistoryStore.getState().addAction({
            type: 'UPDATE_LIGHT',
            layerId,
            lightId: light.id,
            changes: { visible: newVisible },
            previousChanges: { visible: light.visible },
          });
        }}
        className="text-ink-muted hover:text-ink transition-colors"
        title={light.visible ? t('objects.hide') : t('objects.show')}
      >
        {light.visible ? <FiEye size={14} /> : <FiEyeOff size={14} />}
      </button>
      <button onClick={(e)=> {
        e.stopPropagation();
        if (onDelete) onDelete(light.id);
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
  const { t } = useTranslation();
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
          {layer.props.length}{' '}
          {layer.props.length !== 1 ? t('objects.propMany') : t('objects.propOne')}
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

interface LayerLightsGroupProps {
  layer: MapLayer;
}

const LayerLightsGroup = ({ layer }: LayerLightsGroupProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const { selectedLightIds, selectLights, toggleLightSelection } = useUISelectionStore();
  const updateLight = useMapStore((state) => state.updateLight);
  const removeLight = useMapStore((state) => state.removeLight);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const lights = layer.lights ?? [];
  // Sort lights by z-index (highest first, so topmost items appear at top of list)
  const sortedLights = [...lights].sort((a, b) => b.zIndex - a.zIndex);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedLights.findIndex((l) => l.id === active.id);
      const newIndex = sortedLights.findIndex((l) => l.id === over.id);

      // Reorder the array
      const newOrder = arrayMove(sortedLights, oldIndex, newIndex);

      // Update z-indices based on new order (higher index = higher z-index)
      // Since we display highest z-index first, we need to reverse the assignment
      const historyActions: MapAction[] = [];
      newOrder.forEach((light, index) => {
        const newZIndex = newOrder.length - 1 - index;
        if (light.zIndex !== newZIndex) {
          historyActions.push({
            type: 'UPDATE_LIGHT',
            layerId: layer.id,
            lightId: light.id,
            changes: { zIndex: newZIndex },
            previousChanges: { zIndex: light.zIndex },
          });
          updateLight(layer.id, light.id, { zIndex: newZIndex });
        }
      });

      if (historyActions.length === 1) {
        useHistoryStore.getState().addAction(historyActions[0]);
      } else if (historyActions.length > 1) {
        useHistoryStore.getState().addAction({ type: 'BATCH', actions: historyActions });
      }
    }
  };

  const handleLightSelect = (lightId: string, isMultiSelect: boolean) => {
    if (isMultiSelect) {
      toggleLightSelection(lightId);
    } else {
      selectLights([lightId]);
    }
  };

  if (lights.length === 0) {
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
          {lights.length}{' '}
          {lights.length !== 1 ? t('objects.lightMany') : t('objects.lightOne')}
        </span>
      </button>

      {/* Lights List */}
      {isExpanded && (
        <div className="mt-1 space-y-0.5 pl-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedLights.map(l => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedLights.map((light) => (
                <LightItem
                  key={light.id}
                  light={light}
                  layerId={layer.id}
                  isSelected={selectedLightIds.has(light.id)}
                  onSelect={handleLightSelect}
                  onDelete={(lightId) => {
                    const light = lights.find(l => l.id === lightId);
                    if (light) {
                      useHistoryStore.getState().addAction({
                        type: 'REMOVE_LIGHT',
                        layerId: layer.id,
                        lightId: light.id,
                        removedLight: { ...light },
                      });
                    }
                    removeLight(layer.id, lightId);
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

export const PropsHierarchyContent = () => {
  const { t } = useTranslation();
  const map = useMapStore((state) => state.map);
  // Follows the same segmented toggle as the library above (ContextBody)
  // instead of keeping its own tab — "tiles" has no hierarchy view, so it
  // falls back to showing props.
  const libraryTab = useUISelectionStore((state) => state.libraryTab);
  const activeTab: 'props' | 'lights' = libraryTab === 'lights' ? 'lights' : 'props';

  if (!map) return null;

  // Get layers sorted by depth index (topmost first)
  const sortedLayers = [...map.layers].sort((a, b) => b.depthIndex - a.depthIndex);

  // Filter to only show layers that have props / lights, respectively
  const layersWithProps = sortedLayers.filter(layer => layer.props.length > 0);
  const layersWithLights = sortedLayers.filter(layer => (layer.lights?.length ?? 0) > 0);

  const totalProps = layersWithProps.reduce((sum, l) => sum + l.props.length, 0);
  const totalLights = layersWithLights.reduce((sum, l) => sum + (l.lights?.length ?? 0), 0);

  return (
    <CollapsibleSection
      title={t("objects.title")}
      count={activeTab === 'props' ? totalProps : totalLights}
    >
      <div className="max-h-56 overflow-y-auto p-2">
        {activeTab === 'props' ? (
          layersWithProps.length === 0 ? (
            <div className="text-center py-4 text-xs">
              <FiPackage size={24} className="mx-auto mb-1.5 text-ink-muted opacity-50" />
              <p className="text-ink-muted">{t("objects.noPropsPlaced")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {layersWithProps.map((layer) => (
                <LayerPropsGroup key={layer.id} layer={layer} />
              ))}
            </div>
          )
        ) : (
          layersWithLights.length === 0 ? (
            <div className="text-center py-4 text-xs">
              <FiSun size={24} className="mx-auto mb-1.5 text-ink-muted opacity-50" />
              <p className="text-ink-muted">{t("objects.noLightsPlaced")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {layersWithLights.map((layer) => (
                <LayerLightsGroup key={layer.id} layer={layer} />
              ))}
            </div>
          )
        )}
      </div>
    </CollapsibleSection>
  );
};
