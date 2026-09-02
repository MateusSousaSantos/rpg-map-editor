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
import { renderLighting } from "../../utils/lighting/engine";
import { buildRenderParams, type LightOverride } from "../../utils/lighting/scene";
import { getAreaCorners } from "../../utils/lights";
import { timeStage } from "../../utils/lighting/devStats";

/**
 * LightLayer — Phase 2 WebGL renderer.
 *
 * Bakes a normal-mapped, ambient + point-light composite of the whole map to a
 * single canvas (via the standalone lighting engine) and shows it as one
 * non-interactive `Konva.Image` over the map. The bake is debounced and keyed on
 * map/texture changes — never per frame. A separate interactive layer of
 * draggable handles lets lights be selected and moved (Phase 1 behaviour, kept).
 *
 * During a prop/handle drag, or a brush/eraser paint stroke, the lit overlay
 * is hidden so the raw map (and the moving node, for a drag) stay visible and
 * update live; it rebakes once the drag/stroke ends. A brush stroke can touch
 * many cells before mouseup, so without this a full-map rebake would run on
 * every cell painted — see `isPaintingStroke` below.
 */
interface LightLayerProps {
  editable?: boolean;
}

/**
 * Bake at up to 1 buffer pixel per map pixel — the stage zoom scales the
 * composited result up or down from there, same as any other Konva image.
 * Capped by `MAX_BAKE_DIMENSION` (see below) for large maps.
 */
const NATIVE_BAKE_SCALE = 1;
/**
 * Largest side (in buffer px) the bake is allowed to use, on either axis. A
 * full-map-resolution bake costs three GPU texture uploads plus a full-map
 * shader pass (with per-pixel shadow raymarching) on every rebuild, most of
 * which is typically off-screen — this is the dominant lighting-pipeline
 * cost on a large map. 2048 keeps a single-viewport-sized map crisp while
 * capping worst-case buffer size on much larger ones; the `KonvaImage` in the
 * render below stretches the result back up to full map pixel size, so this
 * only costs a bit of upscale softness on maps larger than the cap, not
 * correctness. The PNG/JPEG export path (composeMapCanvas) is untouched — it
 * bakes once, on demand, at the user's chosen export scale.
 */
const MAX_BAKE_DIMENSION = 2048;
/** Debounce window for rebaking after a change (ms). */
const BAKE_DEBOUNCE = 80;

/** Bake scale for this map: native (1:1) unless that would exceed the cap. */
function computeBakeScale(m: MapDocument): number {
  const longestSide = Math.max(m.width * m.tileSize, m.height * m.tileSize);
  return Math.min(NATIVE_BAKE_SCALE, MAX_BAKE_DIMENSION / longestSide);
}

/** Konva `name` on draggable light handles — lets the stage drag handler tell a
 *  light drag (kept live) from a prop/tile drag (overlay hidden). */
const LIGHT_HANDLE_NAME = "light-handle";

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

/**
 * Everything that can change what's actually rendered: `contentKey` (buffer
 * validity) plus the map's ambient lighting config and each layer's lights
 * array. `map` bumps its reference on *every* store mutation — renaming a
 * layer, editing the tile palette, adding a prop definition — none of which
 * affect the lit result. Without this check the effect below would still run
 * a full-resolution GPU relight pass on every one of those, since it only
 * ever chose between "relight" and "bake", never "do nothing".
 */
function lightingRelevantKey(m: MapDocument, textures: unknown): unknown[] {
  const key = contentKey(m, textures);
  key.push(m.lighting?.enabled, m.lighting?.ambientColor, m.lighting?.ambientIntensity, m.lighting?.sun);
  for (const l of m.layers) {
    key.push(l.lights);
  }
  return key;
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
  // True for the whole duration of a brush/eraser drag stroke — see the main
  // bake-scheduling effect below and useCanvasEvents' handleMouseDown/Up.
  const isPaintingStroke = useUISelectionStore((state) => state.isPaintingStroke);
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
  // Scale the currently cached buffers were built at (see computeBakeScale) —
  // stored alongside them so a cheap relight uses the exact same scale a
  // fresh bake chose, rather than recomputing it (which would happen to
  // match today, since it's a pure function of map size, but this keeps the
  // two paths from being able to drift).
  const bakeScaleRef = useRef<number>(1);
  const contentKeyRef = useRef<unknown[] | null>(null);
  // Last key that actually produced a render — lets the main effect skip
  // entirely when nothing lighting-relevant changed (see lightingRelevantKey).
  const lastLightingKeyRef = useRef<unknown[] | null>(null);
  // rAF throttle for live relight during a handle drag.
  const rafRef = useRef<number | null>(null);
  const pendingOverrideRef = useRef<LightOverride | null>(null);

  const lightingOn = !!map?.lighting?.enabled;

  // Run the WebGL pass and repaint the overlay. The engine reuses one canvas, so
  // setState with the same ref won't re-render — force a Konva batchDraw.
  const runEngine = useCallback((m: MapDocument, buffers: LightingBuffers, upload: boolean, override?: LightOverride | null) => {
    const result = timeStage("relight", () =>
      renderLighting(buildRenderParams(m, buffers, bakeScaleRef.current, { uploadBuffers: upload, override })),
    );
    if (!result) {
      setLitCanvas(null);
      return;
    }
    setLitCanvas(result);
    imageRef.current?.getLayer()?.batchDraw();
  }, []);

  // ── Full bake: rebuild the (expensive) buffers, then relight. ──────────────
  const bake = useCallback(() => {
    timeStage("bake", () => {
      const current = useMapStore.getState().map;
      if (!current || !current.lighting?.enabled) {
        setLitCanvas(null);
        return;
      }
      const { getTexture, textures } = useTextureCache.getState();
      const scale = computeBakeScale(current);
      const buffers = timeStage("buildBuffers", () => buildLightingBuffers(current, scale, getTexture));
      if (!buffers) {
        setLitCanvas(null);
        return;
      }
      buffersRef.current = buffers;
      bakeScaleRef.current = scale;
      contentKeyRef.current = contentKey(current, textures);
      runEngine(current, buffers, true);
    });
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
      lastLightingKeyRef.current = null;
      return;
    }

    // Skip entirely if nothing that affects the lit result changed — most
    // store mutations (renaming a layer, editing the tile/prop palette, undo
    // of an unrelated action, ...) land here and previously still triggered a
    // full-resolution relight.
    const fullKey = map ? lightingRelevantKey(map, textures) : null;
    if (sameKey(fullKey, lastLightingKeyRef.current)) {
      return;
    }

    // While a brush/eraser stroke is in progress, don't rebake per cell — a
    // full-map rebake (buildLightingBuffers' whole-map repaint + the GPU pass)
    // costs far more than the interval between mousemove events on a real map,
    // so doing it on every cell painted stalls the entire drag instead of just
    // relighting it once. Deliberately leave lastLightingKeyRef stale here —
    // `isPaintingStroke` is a dependency below, so the moment the stroke ends
    // this same effect reruns, this comparison sees the accumulated change,
    // and it bakes exactly once for the whole stroke. The overlay itself is
    // hidden meanwhile (see the `visible` prop below), so the raw, unlit tiles
    // stay visible and update live during the drag, the same way they did
    // before the lighting overlay existed.
    if (isPaintingStroke) return;

    lastLightingKeyRef.current = fullKey;

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
  }, [map, textures, lightingOn, scheduleBake, relight, isPaintingStroke]);

  // Cancel any pending rAF on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Hide the lit overlay during a prop/tile drag (its albedo changes and can't
  // be cheaply relit) — the change-detection effect above rebakes on drop,
  // once the drop commits to the store. Light-handle drags are kept live and
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
      // No explicit scheduleBake() here: dropping a prop commits its new
      // position through updateProp, which (via Immer) bumps `layer.props`
      // and therefore `map`'s reference. The change-detection effect above
      // already reacts to that — its contentKey compare will see the prop
      // moved and call scheduleBake() itself. A duplicate call here used to
      // be harmless (scheduleBake just resets the same debounce timer) but
      // was dead weight; removed rather than kept as a "just in case".
      setDragging(false);
    };
    stage.on("dragstart.lighting", onStart);
    stage.on("dragend.lighting", onEnd);
    return () => {
      stage.off("dragstart.lighting");
      stage.off("dragend.lighting");
    };
  }, [litCanvas]);

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
            visible={!dragging && !isPaintingStroke && !(editable && editingProp)}
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
