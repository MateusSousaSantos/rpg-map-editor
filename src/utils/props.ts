/**
 * Utility functions for prop management
 */

import type { PropInstance, PropDefinition } from '../types/map';

/**
 * Create a new prop instance from a definition
 */
export const createProp = (
  definition: PropDefinition,
  x: number,
  y: number,
  maxZIndex: number = 0
): PropInstance => {
  return {
    id: crypto.randomUUID(),
    definitionId: definition.id,
    x,
    y,
    width: definition.width,
    height: definition.height,
    rotation: 0,
    scaleX: definition.defaultScaleX ?? 1,
    scaleY: definition.defaultScaleY ?? 1,
    opacity: definition.defaultOpacity ?? 1,
    zIndex: maxZIndex + 1,
    visible: true,
  };
};

/**
 * Get the next available z-index for a layer
 */
export const getNextZIndex = (props: PropInstance[]): number => {
  if (props.length === 0) return 0;
  return Math.max(...props.map(p => p.zIndex)) + 1;
};

/**
 * Recompute z-indices to be sequential (0, 1, 2, ..., N)
 */
export const recomputeZIndices = (props: PropInstance[]): PropInstance[] => {
  const sorted = [...props].sort((a, b) => a.zIndex - b.zIndex);
  return sorted.map((prop, index) => ({
    ...prop,
    zIndex: index,
  }));
};

/**
 * Validate a prop instance
 */
export const validatePropInstance = (prop: PropInstance): boolean => {
  return (
    !!prop.id &&
    !!prop.definitionId &&
    typeof prop.x === 'number' &&
    typeof prop.y === 'number' &&
    typeof prop.width === 'number' &&
    typeof prop.height === 'number' &&
    typeof prop.rotation === 'number' &&
    typeof prop.scaleX === 'number' &&
    typeof prop.scaleY === 'number' &&
    typeof prop.opacity === 'number' &&
    typeof prop.zIndex === 'number' &&
    typeof prop.visible === 'boolean'
  );
};

/**
 * Check if a point is inside a prop
 */
export const isPointInProp = (
  prop: PropInstance,
  worldX: number,
  worldY: number
): boolean => {
  // Simple bounding box check (no rotation considered yet)
  const width = prop.width * prop.scaleX;
  const height = prop.height * prop.scaleY;
  
  return (
    worldX >= prop.x &&
    worldX <= prop.x + width &&
    worldY >= prop.y &&
    worldY <= prop.y + height
  );
};

/**
 * Find props at a given position (returns in z-index order, topmost first)
 */
export const findPropsAtPosition = (
  props: PropInstance[],
  worldX: number,
  worldY: number
): PropInstance[] => {
  return props
    .filter(prop => prop.visible && isPointInProp(prop, worldX, worldY))
    .sort((a, b) => b.zIndex - a.zIndex); // Highest z-index first
};
