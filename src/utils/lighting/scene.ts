/**
 * scene.ts — translate a MapDocument's lights + lighting config into the params
 * the WebGL engine consumes.
 *
 * This is the SINGLE source of truth for "how the map's lights map to engine
 * lights", shared by the live `LightLayer` overlay and the PNG/JPEG export bake
 * so both paths relight identically (see LIGHTING_HANDOFF.md — the live and
 * export paths must stay in sync through the one engine module).
 */

import type { MapDocument } from '../../types/map';
import { getAreaCorners } from '../lights';
import { hexToRgb01, type EngineLight, type RenderLightingParams } from './engine';
import type { LightingBuffers } from './buffers';

/**
 * A dragged light's live values, applied on top of the stored light so the
 * overlay can relight without committing to the store on every frame. Only the
 * fields the engine consumes matter (position / radius / elevation / shape).
 */
export interface LightOverride {
  id: string;
  x?: number;
  y?: number;
  radius?: number;
  z?: number;
  angle?: number;
  coneAngle?: number;
  width?: number;
  height?: number;
  corners?: { x: number; y: number }[];
}

/** Build the engine light list, optionally overriding one light's live fields. */
export function gatherEngineLights(
  m: MapDocument,
  override?: LightOverride | null,
): EngineLight[] {
  const lights: EngineLight[] = [];
  for (const layer of m.layers) {
    if (!layer.visible) continue;
    for (const light of layer.lights ?? []) {
      if (!light.visible) continue;
      const o = override && override.id === light.id ? override : null;
      lights.push({
        x: o?.x ?? light.x,
        y: o?.y ?? light.y,
        radius: o?.radius ?? light.radius,
        z: o?.z ?? light.z ?? m.tileSize,
        color: hexToRgb01(light.color),
        intensity: Math.max(0, light.intensity),
        type: light.type,
        angle: o?.angle ?? light.angle,
        coneAngle: o?.coneAngle ?? light.coneAngle,
        corners:
          light.type === 'area'
            ? o?.corners ?? getAreaCorners(light)
            : undefined,
        castsShadows: light.castsShadows,
      });
    }
  }
  return lights;
}

/** Directional sun/moon term for the engine (undefined = off). */
export function gatherSun(
  m: MapDocument,
): { dir: [number, number, number]; color: [number, number, number] } | undefined {
  const sun = m.lighting?.sun;
  if (!sun || sun.intensity <= 0) return undefined;
  const rad = (sun.angle * Math.PI) / 180;
  const [r, g, b] = hexToRgb01(sun.color);
  const i = sun.intensity;
  return { dir: [Math.cos(rad), Math.sin(rad), 0.7], color: [r * i, g * i, b * i] };
}

/**
 * Compose the full `renderLighting` params from a map + prebuilt buffers. Both
 * the live overlay and the export bake go through here so they can never drift.
 */
export function buildRenderParams(
  m: MapDocument,
  buffers: LightingBuffers,
  scale: number,
  opts?: { uploadBuffers?: boolean; override?: LightOverride | null },
): RenderLightingParams {
  const lighting = m.lighting!;
  return {
    albedo: buffers.albedo,
    normal: buffers.normal,
    occluder: buffers.occluder,
    width: buffers.width,
    height: buffers.height,
    scale,
    ambientColor: hexToRgb01(lighting.ambientColor),
    ambientIntensity: Math.max(0, Math.min(1, lighting.ambientIntensity)),
    lights: gatherEngineLights(m, opts?.override),
    sun: gatherSun(m),
    uploadBuffers: opts?.uploadBuffers ?? true,
  };
}
