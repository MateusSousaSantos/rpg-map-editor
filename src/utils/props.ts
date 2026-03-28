/**
 * Utility functions for prop management
 */

import type { PropInstance, PropDefinition } from '../types/map';

const DUPLICATE_PROP_OFFSET = 16;

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
 * Duplicate an existing prop instance with a fresh ID and z-index.
 */
export const duplicateProp = (
  prop: PropInstance,
  maxZIndex: number = 0,
  offsetX: number = DUPLICATE_PROP_OFFSET,
  offsetY: number = DUPLICATE_PROP_OFFSET
): PropInstance => {
  return {
    ...prop,
    id: crypto.randomUUID(),
    x: prop.x + offsetX,
    y: prop.y + offsetY,
    zIndex: maxZIndex + 1,
    properties: prop.properties ? structuredClone(prop.properties) : undefined,
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
 * Check if a point is inside a prop, accounting for rotation
 */
export const isPointInProp = (
  prop: PropInstance,
  worldX: number,
  worldY: number
): boolean => {
  const width = prop.width * prop.scaleX;
  const height = prop.height * prop.scaleY;

  if (prop.rotation === 0) {
    // Fast path: axis-aligned bounding box
    return (
      worldX >= prop.x &&
      worldX <= prop.x + width &&
      worldY >= prop.y &&
      worldY <= prop.y + height
    );
  }

  // Transform the test point into the prop's local coordinate space
  // so we can do a simple AABB check in that space.
  const cx = prop.x + width / 2;
  const cy = prop.y + height / 2;

  const rad = -(prop.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = worldX - cx;
  const dy = worldY - cy;

  const localX = dx * cos - dy * sin + width / 2;
  const localY = dx * sin + dy * cos + height / 2;

  return (
    localX >= 0 &&
    localX <= width &&
    localY >= 0 &&
    localY <= height
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
