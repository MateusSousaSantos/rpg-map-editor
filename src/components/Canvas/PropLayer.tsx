/**
 * PropLayer - Renders all props for a single map layer
 * 
 * Handles:
 * - Rendering props in z-index order
 * - Selection state visualization
 * - Click events for selection
 * - Interactive resize and rotation handles
 */

import { Layer, Group, Image, Transformer } from 'react-konva';
import { useEffect, useState, useRef } from 'react';
import { useUISelectionStore } from '../../stores/uiSelectionStore';
import type { MapLayer, PropInstance } from '../../types/map';
import { useMapStore } from '../../stores/mapStore';
import Konva from 'konva';

interface PropLayerProps {
  layer: MapLayer;
}

export const PropLayer = ({ layer }: PropLayerProps) => {
  // Sort props by z-index (lowest to highest, so highest renders on top)
  const sortedProps = [...layer.props].sort((a, b) => a.zIndex - b.zIndex);
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
  
  return (
    <Layer imageSmoothingEnabled={false}>
      {sortedProps.map(prop => (
        <PropGroup 
          key={prop.id} 
          prop={prop} 
          layerId={layer.id}
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
    </Layer>
  );
};

/**
 * PropGroup - Renders a single prop with selection border
 */
interface PropGroupProps {
  prop: PropInstance;
  layerId: string;
  onMount: (node: Konva.Group) => void;
  onUnmount: () => void;
}

const PropGroup = ({ prop, layerId, onMount, onUnmount }: PropGroupProps) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const { selectProps, togglePropSelection } = useUISelectionStore();
  const selectedPropIds = useUISelectionStore((state) => state.selectedPropIds);
  const propDefinitions = useMapStore((state) => state.map?.propDefinitions || []);
  const updateProp = useMapStore((state) => state.updateProp);
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
  
  // Load image
  useEffect(() => {
    if (!definition) return;
    
    const img = new window.Image();
    img.crossOrigin = 'anonymous'; // Enable CORS if needed
    img.src = definition.textureUrl;
    img.onload = () => {
      setImage(img);
    };
    img.onerror = () => {
      console.error(`Failed to load prop image: ${definition.textureUrl}`);
    };
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [definition]);
  
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
    
    // Reset the scale on the node (we'll store it in the prop data)
    node.scaleX(1);
    node.scaleY(1);
    
    // Update the prop with new dimensions and transform
    updateProp(layerId, prop.id, {
      x: node.x(),
      y: node.y(),
      width: prop.width * scaleX,
      height: prop.height * scaleY,
      rotation: rotation,
      scaleX: prop.scaleX * scaleX,
      scaleY: prop.scaleY * scaleY,
    });
  };
  
  // Handle drag end - update prop position
  const handleDragEnd = () => {
    const node = groupRef.current;
    if (!node) return;
    
    updateProp(layerId, prop.id, { 
      x: node.x(), 
      y: node.y() 
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
      opacity={prop.opacity}
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
};
