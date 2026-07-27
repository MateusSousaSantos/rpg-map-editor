import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Layer, Circle, Group, Line, Wedge, Image as KonvaImage } from "react-konva";
import Konva from "konva";
import { useMapStore } from "../../stores/mapStore";
import { useUISelectionStore } from "../../stores/uiSelectionStore";
import { useToolStore } from "../../stores/toolStore";
import { useHistoryStore } from "../../stores/historyStore";
import { useTextureCache } from "../../stores/textureCache";
import { useViewportStore } from "../../stores/viewportStore";
import type { LightInstance, MapLayer, MapDocument } from "../../types/map";
import { buildLightingBuffers, type LightingBuffers } from "../../utils/lighting/buffers";
import { renderLighting, hexToRgb01, type EngineLight } from "../../utils/lighting/engine";
import { getAreaCorners } from "../../utils/lights";

/**
 * LightLayer — Phase 2 WebGL renderer.
 *
 * Bakes a normal-mapped, ambient + point-light composite of the whole map to a
 * single canvas (via the standalone lighting engine) and shows it as one
 * non-interactive `Konva.Image` over the map. The bake is debounced and keyed on
 * map/texture changes — never per frame. A separate interactive layer of
 * draggable handles lets lights be selected and moved (Phase 1 behaviour, kept).
 *
 * During a prop/handle drag the lit overlay is hidden so the raw map and the
 * moving node are visible; it rebakes on drop.
 */
interface LightLayerProps {
  editable?: boolean;
}

/** Bake at 1 buffer pixel per map pixel; the stage zoom scales the result. */
const BAKE_SCALE = 1;
/** Debounce window for rebaking after a change (ms). */
const BAKE_DEBOUNCE = 80;

/** Konva `name` on draggable light handles — lets the stage drag handler tell a
 *  light drag (kept live) from a prop/tile drag (overlay hidden). */
const LIGHT_HANDLE_NAME = "light-handle";

/**
 * A dragged light's live values, applied on top of the stored light so the
 * overlay can relight without committing to the store on every frame. Only the
 * fields the engine actually consumes matter (position + radius + elevation);
 * angle/cone/size don't affect the current point-light shader.
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

/**
 * A cheap identity list of everything that affects the albedo/normal buffers —
 * map dimensions, the texture cache, and each layer's tile/prop collections and
 * compositing params. Immer replaces these references on mutation, so a shallow
 * comparison detects "map content changed" without a deep walk. Lights and the
 * lighting config are deliberately excluded (they don't touch the buffers).
 */
function contentKey(m: MapDocument, textures: unknown): unknown[] {
  const key: unknown[] = [m.width, m.height, m.tileSize, textures];
  for (const l of m.layers) {
    key.push(l.id, l.visible, l.opacity, l.depthIndex, l.tiles, l.props);
  }
  return key;
}

function sameKey(a: unknown[] | null, b: unknown[] | null): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/** Build the engine light list, optionally overriding one light's live fields. */
function gatherEngineLights(m: MapDocument, override?: LightOverride | null): EngineLight[] {
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
          light.type === "area"
            ? o?.corners ?? getAreaCorners(light)
            : undefined,
        castsShadows: light.castsShadows,
      });
    }
  }
  return lights;
}

/** Directional sun/moon term for the engine (undefined = off). */
function gatherSun(
  m: MapDocument,
): { dir: [number, number, number]; color: [number, number, number] } | undefined {
  const sun = m.lighting?.sun;
  if (!sun || sun.intensity <= 0) return undefined;
  const rad = (sun.angle * Math.PI) / 180;
  const [r, g, b] = hexToRgb01(sun.color);
  const i = sun.intensity;
  return { dir: [Math.cos(rad), Math.sin(rad), 0.7], color: [r * i, g * i, b * i] };
}

export const LightLayer = memo(({ editable = true }: LightLayerProps) => {
  const map = useMapStore((state) => state.map);
  // Subscribing to the textures map means late-loading sprites trigger a rebake.
  const textures = useTextureCache((state) => state.textures);
  const selectedLightIds = useUISelectionStore((state) => state.selectedLightIds);
  const selectLights = useUISelectionStore((state) => state.selectLights);
  // While a prop is selected we hide the lit composite so the prop's Transformer
  // handles (which render in the prop's map layer, beneath this overlay) are
  // visible for editing. The overlay is non-interactive, so the handles were
  // always clickable — this just makes them visible.
  const editingProp = useUISelectionStore((state) => state.selectionMode === 'props');
  const updateLight = useMapStore((state) => state.updateLight);
  // Drives constant on-screen handle sizing (handles shrink as the map zooms in).
  const zoom = useViewportStore((state) => state.zoom);

  const [litCanvas, setLitCanvas] = useState<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const imageRef = useRef<Konva.Image>(null);
  const overlayLayerRef = useRef<Konva.Layer>(null);
  const bakeTimer = useRef<number | null>(null);
  // Cached albedo/normal buffers + the content key that produced them, so a
  // light move can relight without rebuilding them.
  const buffersRef = useRef<LightingBuffers | null>(null);
  const contentKeyRef = useRef<unknown[] | null>(null);
  // rAF throttle for live relight during a handle drag.
  const rafRef = useRef<number | null>(null);
  const pendingOverrideRef = useRef<LightOverride | null>(null);

  const lightingOn = !!map?.lighting?.enabled;

  // Run the WebGL pass and repaint the overlay. The engine reuses one canvas, so
  // setState with the same ref won't re-render — force a Konva batchDraw.
  const runEngine = useCallback((m: MapDocument, buffers: LightingBuffers, upload: boolean, override?: LightOverride | null) => {
    const lighting = m.lighting!;
    const result = renderLighting({
      albedo: buffers.albedo,
      normal: buffers.normal,
      occluder: buffers.occluder,
      width: buffers.width,
      height: buffers.height,
      scale: BAKE_SCALE,
      ambientColor: hexToRgb01(lighting.ambientColor),
      ambientIntensity: Math.max(0, Math.min(1, lighting.ambientIntensity)),
      lights: gatherEngineLights(m, override),
      sun: gatherSun(m),
      uploadBuffers: upload,
    });
    if (!result) {
      setLitCanvas(null);
      return;
    }
    setLitCanvas(result);
    imageRef.current?.getLayer()?.batchDraw();
  }, []);

  // ── Full bake: rebuild the (expensive) buffers, then relight. ──────────────
  const bake = useCallback(() => {
    const current = useMapStore.getState().map;
    if (!current || !current.lighting?.enabled) {
      setLitCanvas(null);
      return;
    }
    const { getTexture, textures } = useTextureCache.getState();
    const buffers = buildLightingBuffers(current, BAKE_SCALE, getTexture);
    if (!buffers) {
      setLitCanvas(null);
      return;
    }
    buffersRef.current = buffers;
    contentKeyRef.current = contentKey(current, textures);
    runEngine(current, buffers, true);
  }, [runEngine]);

  // ── Cheap relight: reuse cached buffers (skip the texture upload). ─────────
  const relight = useCallback((override?: LightOverride | null) => {
    const current = useMapStore.getState().map;
    if (!current || !current.lighting?.enabled) {
      setLitCanvas(null);
      return;
    }
    const buffers = buffersRef.current;
    if (!buffers) {
      bake();
      return;
    }
    runEngine(current, buffers, false, override);
  }, [bake, runEngine]);

  const scheduleBake = useCallback(() => {
    if (bakeTimer.current !== null) window.clearTimeout(bakeTimer.current);
    bakeTimer.current = window.setTimeout(() => {
      bakeTimer.current = null;
      bake();
    }, BAKE_DEBOUNCE);
  }, [bake]);

  // Coalesce live relights during a drag to one per animation frame.
  const scheduleLiveRelight = useCallback((override: LightOverride) => {
    pendingOverrideRef.current = override;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const o = pendingOverrideRef.current;
      pendingOverrideRef.current = null;
      if (o) relight(o);
    });
  }, [relight]);

  // On map/texture change: if only lights/lighting changed (buffers still valid)
  // take the cheap relight path; otherwise rebuild the buffers (debounced).
  useEffect(() => {
    if (!lightingOn) {
      setLitCanvas(null);
      buffersRef.current = null;
      contentKeyRef.current = null;
      return;
    }
    const key = map ? contentKey(map, textures) : null;
    if (buffersRef.current && sameKey(key, contentKeyRef.current)) {
      relight();
    } else {
      scheduleBake();
    }
    return () => {
      if (bakeTimer.current !== null) {
        window.clearTimeout(bakeTimer.current);
        bakeTimer.current = null;
      }
    };
  }, [map, textures, lightingOn, scheduleBake, relight]);

  // Cancel any pending rAF on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Hide the lit overlay during a prop/tile drag (its albedo changes and can't
  // be cheaply relit), then rebake on drop. Light-handle drags are kept live and
  // relit per-frame by the handles themselves, so they skip this entirely.
  useEffect(() => {
    const stage = overlayLayerRef.current?.getStage();
    if (!stage) return;
    const isLightHandle = (e: Konva.KonvaEventObject<DragEvent>) =>
      (e.target?.name?.() || "").includes(LIGHT_HANDLE_NAME);
    const onStart = (e: Konva.KonvaEventObject<DragEvent>) => {
      if (isLightHandle(e)) return;
      setDragging(true);
    };
    const onEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
      if (isLightHandle(e)) return;
      setDragging(false);
      scheduleBake();
    };
    stage.on("dragstart.lighting", onStart);
    stage.on("dragend.lighting", onEnd);
    return () => {
      stage.off("dragstart.lighting");
      stage.off("dragend.lighting");
    };
  }, [scheduleBake, litCanvas]);

  // Deselect the current light when the user presses down anywhere that isn't a
  // light handle (a light or one of its editing knobs) — light handles cancel
  // bubbling, so they never reach here. Placing lights is exempt so a freshly
  // placed (auto-selected) light isn't immediately cleared.
  useEffect(() => {
    const stage = overlayLayerRef.current?.getStage();
    if (!stage) return;
    const onDown = (e: Konva.KonvaEventObject<Event>) => {
      const sel = useUISelectionStore.getState();
      if (sel.selectedLightIds.size === 0) return;
      if (useToolStore.getState().activeTool === "place-light") return;
      if ((e.target?.name?.() || "").includes(LIGHT_HANDLE_NAME)) return;
      sel.clearLightSelection();
    };
    stage.on("mousedown.lightdeselect touchstart.lightdeselect", onDown);
    return () => {
      stage.off("mousedown.lightdeselect");
      stage.off("touchstart.lightdeselect");
    };
  }, [map]);

  if (!map) return null;

  const mapPixelW = map.width * map.tileSize;
  const mapPixelH = map.height * map.tileSize;

  // Gather lights for the handle layer.
  const entries: { light: LightInstance; layer: MapLayer }[] = [];
  for (const layer of map.layers) {
    if (!layer.visible) continue;
    for (const light of layer.lights ?? []) {
      if (light.visible) entries.push({ light, layer });
    }
  }

  const handleDragEnd = (light: LightInstance, layerId: string, node: Konva.Group) => {
    const previousChanges = { x: light.x, y: light.y };
    const changes = { x: node.x(), y: node.y() };
    updateLight(layerId, light.id, changes);
    useHistoryStore.getState().addAction({
      type: "UPDATE_LIGHT",
      layerId,
      lightId: light.id,
      changes,
      previousChanges,
    });
  };

  return (
    <>
      {/* ── Composite lighting pass (non-interactive) ─────────────────────── */}
      <Layer ref={overlayLayerRef} listening={false} imageSmoothingEnabled={false}>
        {lightingOn && litCanvas && (
          <KonvaImage
            ref={imageRef}
            image={litCanvas}
            x={0}
            y={0}
            width={mapPixelW}
            height={mapPixelH}
            listening={false}
            visible={!dragging && !(editable && editingProp)}
          />
        )}
      </Layer>

      {/* ── Editable handles (interactive) ────────────────────────────────── */}
      {editable && (
        <Layer>
          {entries.map(({ light, layer }) => {
            const isSelected = selectedLightIds.has(light.id);
            return (
              <Group key={`handle-${light.id}`}>
                {/* Shape handles for the selected light (radius / direction / size). */}
                {isSelected && !light.locked && (
                  <LightShapeHandles
                    light={light}
                    layerId={layer.id}
                    zoom={zoom}
                    onLiveRelight={scheduleLiveRelight}
                  />
                )}

                {/* Center handle — drag to move, click to select. */}
                <Group
                  x={light.x}
                  y={light.y}
                  name={LIGHT_HANDLE_NAME}
                  draggable={!light.locked}
                  onMouseDown={(e) => {
                    e.cancelBubble = true;
                  }}
                  onTouchStart={(e) => {
                    e.cancelBubble = true;
                  }}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    selectLights([light.id]);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    selectLights([light.id]);
                  }}
                  onDragMove={(e) =>
                    scheduleLiveRelight({ id: light.id, x: e.target.x(), y: e.target.y() })
                  }
                  onDragEnd={(e) => handleDragEnd(light, layer.id, e.target as Konva.Group)}
                >
                  {/* Outer ring */}
                  <Circle
                    radius={9 / zoom}
                    stroke={isSelected ? "#ffffff" : light.color}
                    strokeWidth={(isSelected ? 2.5 : 1.5) / zoom}
                    fill="rgba(0,0,0,0.35)"
                  />
                  {/* Colored core */}
                  <Circle radius={4 / zoom} fill={light.color} />
                </Group>
              </Group>
            );
          })}
        </Layer>
      )}
    </>
  );
});

/**
 * LightShapeHandles — in-canvas editing of the selected light's shape.
 *
 * All handles live in a Group anchored at the light's center, so a dragged
 * knob's local (x, y) is its offset from the center — exactly the vector needed
 * to derive radius / direction / size. Visuals are non-listening; only the
 * knobs interact. Handle sizes are divided by `zoom` so they stay constant
 * on-screen. Each edit commits through updateLight and records an undoable
 * UPDATE_LIGHT (matching the move handle).
 */
interface LightShapeHandlesProps {
  light: LightInstance;
  layerId: string;
  zoom: number;
  /** Live, uncommitted relight of the overlay while a knob is dragged. */
  onLiveRelight: (override: LightOverride) => void;
}

const LightShapeHandles = ({ light, layerId, zoom, onLiveRelight }: LightShapeHandlesProps) => {
  const updateLight = useMapStore((state) => state.updateLight);

  const commit = (changes: Partial<LightInstance>) => {
    const previousChanges: Partial<LightInstance> = {};
    for (const key of Object.keys(changes) as (keyof LightInstance)[]) {
      (previousChanges as Record<string, unknown>)[key] = light[key];
    }
    updateLight(layerId, light.id, changes);
    useHistoryStore.getState().addAction({
      type: "UPDATE_LIGHT",
      layerId,
      lightId: light.id,
      changes,
      previousChanges,
    });
  };

  // Live, uncommitted edits while a knob is dragged, so the ring/wedge/rect and
  // knob positions track the drag in real time (the store only updates on drop).
  const [drag, setDrag] = useState<Partial<LightInstance> | null>(null);
  // Live position of the point-light radius knob, so it rides the cursor around
  // the reach ring during a drag (instead of snapping to the +x axis) — matching
  // how the spot's direction knob follows the pointer.
  const [knobPt, setKnobPt] = useState<{ x: number; y: number } | null>(null);
  const eff = drag ? { ...light, ...drag } : light;

  // Push a live preview to both the Konva handles (via drag state) and the
  // WebGL overlay (via onLiveRelight).
  const live = (changes: Partial<LightInstance>) => {
    setDrag((prev) => ({ ...prev, ...changes }));
    onLiveRelight({ id: light.id, ...changes });
  };
  // Commit the final value and drop the live preview.
  const finish = (changes: Partial<LightInstance>) => {
    commit(changes);
    setDrag(null);
  };

  const knobR = 6 / zoom;
  const stroke = 1.5 / zoom;
  const color = light.color;
  const radius = Math.max(8, eff.radius);

  const cancelBubble = (e: Konva.KonvaEventObject<Event>) => {
    e.cancelBubble = true;
  };
  const knobProps = {
    radius: knobR,
    fill: "#ffffff",
    stroke: color,
    strokeWidth: stroke,
    draggable: true,
    name: LIGHT_HANDLE_NAME,
    onMouseDown: cancelBubble,
    onTouchStart: cancelBubble,
  } as const;

  // Reach ring — a dashed outline at the light's radius.
  const ring = (
    <Circle
      radius={radius}
      stroke={color}
      strokeWidth={stroke}
      dash={[6 / zoom, 6 / zoom]}
      listening={false}
    />
  );

  if (light.type === "spot") {
    const angle = eff.angle ?? 0;
    const cone = eff.coneAngle ?? 60;
    const aRad = (angle * Math.PI) / 180;
    const halfRad = ((cone / 2) * Math.PI) / 180;
    // Tip knob: sets direction + reach. Cone knob: sets spread.
    const tip = { x: Math.cos(aRad) * radius, y: Math.sin(aRad) * radius };
    const edge = {
      x: Math.cos(aRad + halfRad) * radius,
      y: Math.sin(aRad + halfRad) * radius,
    };
    return (
      <Group x={light.x} y={light.y}>
        {/* Cone footprint (Konva sweeps `angle` deg clockwise from `rotation`). */}
        <Wedge
          radius={radius}
          angle={cone}
          rotation={angle - cone / 2}
          fill={color}
          opacity={0.12}
          listening={false}
        />
        {ring}
        {/* Direction + reach knob */}
        <Circle
          {...knobProps}
          x={tip.x}
          y={tip.y}
          onDragMove={(e) =>
            live({
              angle: (Math.atan2(e.target.y(), e.target.x()) * 180) / Math.PI,
              radius: Math.max(8, Math.hypot(e.target.x(), e.target.y())),
            })
          }
          onDragEnd={(e) =>
            finish({
              angle: (Math.atan2(e.target.y(), e.target.x()) * 180) / Math.PI,
              radius: Math.max(8, Math.hypot(e.target.x(), e.target.y())),
            })
          }
        />
        {/* Cone spread knob */}
        <Circle
          {...knobProps}
          x={edge.x}
          y={edge.y}
          onDragMove={(e) => {
            const nx = e.target.x();
            const ny = e.target.y();
            const edgeAngle = Math.atan2(ny, nx);
            let half = ((edgeAngle - aRad) * 180) / Math.PI;
            half = ((half % 360) + 360) % 360;
            if (half > 180) half = 360 - half;
            live({ coneAngle: Math.max(4, Math.min(170, half * 2)) });
          }}
          onDragEnd={(e) => {
            const nx = e.target.x();
            const ny = e.target.y();
            const edgeAngle = Math.atan2(ny, nx);
            let half = ((edgeAngle - aRad) * 180) / Math.PI;
            half = ((half % 360) + 360) % 360;
            if (half > 180) half = 360 - half;
            finish({ coneAngle: Math.max(4, Math.min(170, half * 2)) });
          }}
        />
      </Group>
    );
  }

  if (light.type === "area") {
    // Free quadrilateral: each of the four corners (offsets from center) drags
    // independently. The emitter polygon + falloff ring track the live corners.
    const corners = getAreaCorners(eff);
    const withCorner = (i: number, e: Konva.KonvaEventObject<DragEvent>) =>
      corners.map((p, j) => (j === i ? { x: e.target.x(), y: e.target.y() } : p));
    return (
      <Group x={light.x} y={light.y}>
        {ring}
        <Line
          points={corners.flatMap((c) => [c.x, c.y])}
          closed
          stroke={color}
          strokeWidth={stroke}
          fill={color}
          opacity={0.08}
          listening={false}
        />
        {corners.map((c, i) => (
          <Circle
            key={i}
            {...knobProps}
            x={c.x}
            y={c.y}
            onDragMove={(e) => live({ corners: withCorner(i, e) })}
            onDragEnd={(e) => finish({ corners: withCorner(i, e) })}
          />
        ))}
      </Group>
    );
  }

  // Point (default): a single radius knob that rides the reach ring wherever the
  // cursor pulls it (defaulting to the +x point at rest).
  const pt = knobPt ?? { x: radius, y: 0 };
  return (
    <Group x={light.x} y={light.y}>
      {ring}
      <Circle
        {...knobProps}
        x={pt.x}
        y={pt.y}
        onDragMove={(e) => {
          const nx = e.target.x();
          const ny = e.target.y();
          setKnobPt({ x: nx, y: ny });
          live({ radius: Math.max(8, Math.hypot(nx, ny)) });
        }}
        onDragEnd={(e) => {
          const nx = e.target.x();
          const ny = e.target.y();
          setKnobPt({ x: nx, y: ny });
          finish({ radius: Math.max(8, Math.hypot(nx, ny)) });
        }}
      />
    </Group>
  );
};
