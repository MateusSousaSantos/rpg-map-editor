/**
 * Utility functions for light management.
 *
 * Lights are free-positioned like props, but their (x, y) is the light's CENTER
 * (props anchor at top-left). Placement, hit-testing and the inspector all use
 * the center convention.
 */

import type { LightInstance, LightType } from '../types/map';

/** On-screen size of a light's draggable handle, in world pixels. */
export const LIGHT_HANDLE_RADIUS = 12;

/**
 * Create a new light instance of the given type at a world-space center point.
 * Sensible defaults are scaled off the map's tile size so a light reads well
 * regardless of tile resolution.
 */
export const createLight = (
  type: LightType,
  x: number,
  y: number,
  maxZIndex: number = 0,
  tileSize: number = 32,
): LightInstance => {
  const base: LightInstance = {
    id: crypto.randomUUID(),
    type,
    x,
    y,
    color: '#ffd9a0',
    intensity: 1,
    radius: tileSize * 4,
    z: tileSize,
    castsShadows: true,
    flicker: 0,
    zIndex: maxZIndex + 1,
    visible: true,
  };

  switch (type) {
    case 'spot':
      return { ...base, angle: 90, coneAngle: 60, radius: tileSize * 6 };
    case 'area': {
      const width = tileSize * 3;
      const height = tileSize * 2;
      return {
        ...base,
        width,
        height,
        radius: tileSize * 2,
        corners: rectCorners(width, height),
      };
    }
    case 'point':
    default:
      return base;
  }
};

/** A centered axis-aligned rectangle as four corner offsets (TL, TR, BR, BL). */
const rectCorners = (w: number, h: number): { x: number; y: number }[] => [
  { x: -w / 2, y: -h / 2 },
  { x: w / 2, y: -h / 2 },
  { x: w / 2, y: h / 2 },
  { x: -w / 2, y: h / 2 },
];

/**
 * The four corner offsets of an area light's emitter. Uses the light's authored
 * `corners` when present, otherwise derives a centered rectangle from its legacy
 * width/height (falling back to `radius` so there's always a valid quad).
 */
export const getAreaCorners = (light: LightInstance): { x: number; y: number }[] => {
  if (light.corners && light.corners.length === 4) return light.corners;
  return rectCorners(light.width ?? light.radius, light.height ?? light.radius);
};

/** Next available z-index for a layer's lights. */
export const getNextLightZIndex = (lights: LightInstance[]): number => {
  if (!lights || lights.length === 0) return 0;
  return Math.max(...lights.map((l) => l.zIndex)) + 1;
};

/**
 * Distance from a world point to a light's center handle.
 */
const distanceToLight = (light: LightInstance, worldX: number, worldY: number): number => {
  const dx = worldX - light.x;
  const dy = worldY - light.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Find lights whose handle contains the given world point, nearest first.
 * `handleRadius` is expressed in world pixels (scale it by 1/zoom at the call
 * site if you want a constant on-screen pick radius).
 */
export const findLightsAtPosition = (
  lights: LightInstance[],
  worldX: number,
  worldY: number,
  handleRadius: number = LIGHT_HANDLE_RADIUS,
): LightInstance[] => {
  return lights
    .filter((light) => light.visible && distanceToLight(light, worldX, worldY) <= handleRadius)
    .sort((a, b) => distanceToLight(a, worldX, worldY) - distanceToLight(b, worldX, worldY));
};
