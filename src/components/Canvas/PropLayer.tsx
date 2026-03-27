/**
 * PropLayer - Renders all props for a single map layer
 *
 * Handles:
 * - Rendering props in z-index order
 * - Selection state visualization
 * - Click events for selection
 * - Interactive resize and rotation handles
 */

import { Group, Image, Transformer } from 'react-konva';
import { useEffect, useState, useRef, memo } from 'react';
import { useUISelectionStore } from '../../stores/uiSelectionStore';
import { useTextureCache } from '../../stores/textureCache';
import type { MapLayer, PropInstance } from '../../types/map';
import { useMapStore } from '../../stores/mapStore';
import { useHistoryStore } from '../../stores/historyStore';
import Konva from 'konva';

interface PropLayerProps {
  layer: MapLayer;
}

export const PropLayer = memo(({ layer }: PropLayerProps) => {
  // Sort props by global depth: (layer.depthIndex * 10000) + prop.zIndex
  // This ensures props in lower layers always appear beneath props in higher layers
  const sortedProps = [...layer.props].sort((a, b) => {
    const globalDepthA = layer.depthIndex * 10000 + a.zIndex;
    const globalDepthB = layer.depthIndex * 10000 + b.zIndex;
    return globalDepthA - globalDepthB;
  });
  const selectedPropIds = useUISelectionStore((state) => state.selectedPropIds);
  const transformerRef = useRef<Konva.Transformer>(null);
  const groupRefs = useRef<Map<string, Konva.Group>>(new Map());

  // Update transformer when selection changes
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const selectedNodes: Konva.Group[] = [];
    sortedProps.forEach(prop => {
      if (selectedPropIds.has(prop.id)) {
        const node = groupRefs.current.get(prop.id);
        if (node) {
          selectedNodes.push(node);
        }
      }
    });

    transformer.nodes(selectedNodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedPropIds, sortedProps]);

  if (!layer.visible) return null;

  return (
    <>
      {sortedProps.map(prop => (
        <PropGroup
          key={prop.id}
          prop={prop}
          layerId={layer.id}
          layerOpacity={layer.opacity}
          onMount={(node) => groupRefs.current.set(prop.id, node)}
          onUnmount={() => groupRefs.current.delete(prop.id)}
        />
      ))}

      {/* Transformer for resize and rotation */}
      <Transformer
        ref={transformerRef}
        rotateEnabled={true}
        enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
        boundBoxFunc={(oldBox, newBox) => {
          // Limit resize to minimum 8px
          if (newBox.width < 8 || newBox.height < 8) {
            return oldBox;
          }
          return newBox;
        }}
        rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
        rotationSnapTolerance={5}
      />
    </>
  );
});

/**
 * PropGroup - Renders a single prop with selection border
 */
interface PropGroupProps {
  prop: PropInstance;
  layerId: string;
  layerOpacity: number;
  onMount: (node: Konva.Group) => void;
  onUnmount: () => void;
}

const PropGroup = memo(({ prop, layerId, layerOpacity, onMount, onUnmount }: PropGroupProps) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const { selectProps, togglePropSelection } = useUISelectionStore();
  const selectedPropIds = useUISelectionStore((state) => state.selectedPropIds);
  const propDefinitions = useMapStore((state) => state.map?.propDefinitions || []);
  const updateProp = useMapStore((state) => state.updateProp);
  const { getTexture, loadTexture } = useTextureCache();
  const groupRef = useRef<Konva.Group>(null);

  // Get prop definition
  const definition = propDefinitions.find(def => def.id === prop.definitionId);

  // Register/unregister group ref
  useEffect(() => {
    if (groupRef.current) {
      onMount(groupRef.current);
    }
    return () => {
      onUnmount();
    };
  }, [onMount, onUnmount]);

  // Load image via shared texture cache (deduplicates loads across props)
  useEffect(() => {
    if (!definition) return;

    const url = definition.textureUrl;
    const cached = getTexture(url);
    if (cached) {
      setImage(cached);
      return;
    }

    loadTexture(url)
      .then((img) => setImage(img))
      .catch(() => {
        console.error(`Failed to load prop image: ${url}`);
      });
  }, [definition, getTexture, loadTexture]);

  // Handle click on prop
  const handleClick = (e: any) => {
    e.cancelBubble = true; // Stop event from propagating to stage

    const isMultiSelect = e.evt.ctrlKey || e.evt.metaKey;
    const isSelected = selectedPropIds.has(prop.id);

    if (isMultiSelect) {
      togglePropSelection(prop.id);
    } else {
      // If already selected and clicking again, deselect
      if (isSelected) {
        selectProps([]);
      } else {
        selectProps([prop.id]);
      }
    }
  };

  // Handle transform end - update prop transform properties
  const handleTransformEnd = () => {
    const node = groupRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();

    node.scaleX(1);
    node.scaleY(1);

    // Use the original dimensions to calculate the new width and height
    const newWidth = prop.width * scaleX;
    const newHeight = prop.height * scaleY;

    const newChanges = {
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight,
      rotation: rotation,
      scaleX: scaleX,
      scaleY: scaleY,
    };

    const previousChanges = {
      x: prop.x,
      y: prop.y,
      width: prop.width,
      height: prop.height,
      rotation: prop.rotation,
      scaleX: prop.scaleX,
      scaleY: prop.scaleY,
    };

    // Update the prop with new dimensions and transform
    updateProp(layerId, prop.id, newChanges);

    // Record history
    useHistoryStore.getState().addAction({
      type: 'UPDATE_PROP',
      layerId,
      propId: prop.id,
      changes: newChanges,
      previousChanges,
    });
  };

  // Handle drag end - update prop position
  const handleDragEnd = () => {
    const node = groupRef.current;
    if (!node) return;

    const newChanges = { x: node.x(), y: node.y() };
    const previousChanges = { x: prop.x, y: prop.y };

    updateProp(layerId, prop.id, newChanges);

    // Record history
    useHistoryStore.getState().addAction({
      type: 'UPDATE_PROP',
      layerId,
      propId: prop.id,
      changes: newChanges,
      previousChanges,
    });
  };

  if (!definition || !image || !prop.visible) {
    return null;
  }

  // Use definition dimensions for rendering to avoid blur from incorrect sizing
  const renderWidth = definition.width;
  const renderHeight = definition.height;

  return (
    <Group
      ref={groupRef}
      x={prop.x}
      y={prop.y}
      rotation={prop.rotation}
      scaleX={prop.scaleX}
      scaleY={prop.scaleY}
      opacity={prop.opacity * layerOpacity}
      draggable={!prop.locked}
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {/* The actual prop image - use definition dimensions for crisp rendering */}
      <Image
        image={image}
        width={renderWidth}
        height={renderHeight}
        listening={true}
      />
    </Group>
  );
});
