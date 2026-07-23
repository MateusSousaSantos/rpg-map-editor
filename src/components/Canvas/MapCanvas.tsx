import { useEffect, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import Konva from "konva";
import { useMapStore } from "../../stores/mapStore";
import { useViewportStore } from "../../stores/viewportStore";
import { useToolStore } from "../../stores/toolStore";
import { useUISelectionStore } from "../../stores/uiSelectionStore";
import { GridLayer } from "./BackgroundLayer";
import { TileLayer } from "./TileLayer";
import { PropLayer } from "./PropLayer";
import { CursorLayer } from "./CursorLayer";
import { FiZoomIn, FiZoomOut, FiMaximize2 } from "react-icons/fi";
import { useCanvasEvents } from "../../hooks/useCanvasEvents";
import { createProp, getNextZIndex } from "../../utils/props";

interface MapCanvasProps {
  mapId?: string;
  editable?: boolean;
}

/**
 * MapCanvas - Root container for the Konva Stage
 * Orchestrates the entire canvas, manages Stage lifecycle, coordinates layers
 *
 * Responsibilities:
 * - Creates and manages the Konva Stage
 * - Handles viewport (pan/zoom)
 * - Passes layer information to child components
 * - Manages global canvas events
 * - Coordinates rendering order
 */
export const MapCanvas = ({ editable = true }: MapCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // Canvas dimensions
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Cursor position for preview
  const [cursorGridPos, setCursorGridPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Store state
  const map = useMapStore((state) => state.map);
  const { addProp } = useMapStore();
  const { panX, panY, zoom, setPan, setZoom, resetViewport, setDefaultPan } =
    useViewportStore();
  const showGrid = useUISelectionStore((state) => state.showGrid);
  const { selectedLayerId, selectProps } = useUISelectionStore();

  // Canvas events hook for tool interactions
  const canvasEvents = useCanvasEvents({
    tileSize: map?.tileSize || 32,
    editable,
  });

  // Picker (Alt key) state
  const isPickerActive = useToolStore((s) => s.isPickerActive);
  const setPickerActive = useToolStore((s) => s.setPickerActive);

  // Touch pinch/pan state
  const lastTouchDistRef = useRef<number | null>(null);
  const lastTouchMidRef = useRef<{ x: number; y: number } | null>(null);

  // Track Alt key for tile picker
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setPickerActive(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setPickerActive(false);
    };
    const handleBlur = () => setPickerActive(false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [setPickerActive]);

  // Handle container resize (covers both window resize and sidebar collapse/expand)
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { inlineSize: width, blockSize: height } = entry.contentBoxSize[0];
      setDimensions({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Keep the default (centered) pan in sync with map dimensions and container size
  useEffect(() => {
    if (!map) return;
    const mapPixelWidth = map.width * map.tileSize;
    const mapPixelHeight = map.height * map.tileSize;
    const centeredX = (dimensions.width - mapPixelWidth) / 2;
    const centeredY = (dimensions.height - mapPixelHeight) / 2;
    setDefaultPan(centeredX, centeredY);
  }, [map?.width, map?.height, map?.tileSize, dimensions.width, dimensions.height]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom with + / -
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleResetView();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoom]);

  // Handle wheel zoom / trackpad scroll
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    // Trackpad two-finger scroll (no ctrlKey) → pan the canvas
    if (!e.evt.ctrlKey) {
      setPan(panX - e.evt.deltaX, panY - e.evt.deltaY);
      return;
    }

    // Pinch gesture on trackpad OR ctrl+wheel on mouse → zoom
    const oldScale = zoom;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Pinch/ctrl-wheel: use continuous scale so trackpad feels natural
    const delta = -e.evt.deltaY * 0.005;
    const newScale = Math.min(5, Math.max(0.1, oldScale * (1 + delta)));

    // Calculate new position to zoom towards pointer
    const mousePointTo = {
      x: (pointer.x - panX) / oldScale,
      y: (pointer.y - panY) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setZoom(newScale);
    setPan(newPos.x, newPos.y);
  };

  // Handle panning with middle mouse or space + drag
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // If clicking on empty canvas (stage), deselect props
    if (e.target === e.target.getStage()) {
      selectProps([]);
    }

    // Middle mouse button or shift key + left mouse for panning
    if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.shiftKey)) {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const startPos = stage.getPointerPosition();
      if (!startPos) return;

      const startPan = { x: panX, y: panY };

      const handleMouseMove = () => {
        const stage = stageRef.current;
        if (!stage) return;

        const currentPos = stage.getPointerPosition();
        if (!currentPos) return;

        const dx = currentPos.x - startPos.x;
        const dy = currentPos.y - startPos.y;

        setPan(startPan.x + dx, startPan.y + dy);
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      // Left mouse button without shift - handle tool interactions
      canvasEvents.handleMouseDown(e);
    }
  };

  // Track cursor position for preview
  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage || !map) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) {
      setCursorGridPos(null);
      return;
    }

    // Convert to grid coordinates
    const worldX = (pointer.x - panX) / zoom;
    const worldY = (pointer.y - panY) / zoom;
    const gridX = Math.floor(worldX / map.tileSize);
    const gridY = Math.floor(worldY / map.tileSize);

    setCursorGridPos({ x: gridX, y: gridY });

    // Also handle canvas events
    canvasEvents.handleMouseMove(e);
  };

  const handleStageMouseLeave = () => {
    setCursorGridPos(null);
    // Note: canvasEvents handles its own mouseup cleanup via Stage events
  };

  // ── Touch handlers ──────────────────────────────────────────────────────
  const handleStageTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length === 1) {
      // Single finger: delegate to tool handler
      if (e.target === e.target.getStage()) selectProps([]);
      canvasEvents.handleTouchStart(e);
    } else if (touches.length === 2) {
      // Two fingers: begin pinch + pan tracking
      const t0 = touches[0];
      const t1 = touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      lastTouchDistRef.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchMidRef.current = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };
    }
  };

  const handleStageTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
    e.evt.preventDefault();
    const touches = e.evt.touches;
    if (touches.length === 1) {
      canvasEvents.handleTouchMove(e);
    } else if (touches.length === 2 && lastTouchDistRef.current !== null && lastTouchMidRef.current !== null) {
      const t0 = touches[0];
      const t1 = touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const newMid = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };

      // Pan: midpoint delta
      const panDx = newMid.x - lastTouchMidRef.current.x;
      const panDy = newMid.y - lastTouchMidRef.current.y;

      // Zoom: distance ratio, zoom towards midpoint
      const scaleFactor = newDist / lastTouchDistRef.current;
      const oldScale = zoom;
      const newScale = Math.min(5, Math.max(0.1, oldScale * scaleFactor));

      const stage = stageRef.current;
      if (stage) {
        const rect = containerRef.current?.getBoundingClientRect();
        const midX = rect ? newMid.x - rect.left : newMid.x;
        const midY = rect ? newMid.y - rect.top : newMid.y;
        const pointTo = {
          x: (midX - panX) / oldScale,
          y: (midY - panY) / oldScale,
        };
        const newPanX = midX - pointTo.x * newScale + panDx;
        const newPanY = midY - pointTo.y * newScale + panDy;
        setZoom(newScale);
        setPan(newPanX, newPanY);
      }

      lastTouchDistRef.current = newDist;
      lastTouchMidRef.current = newMid;
    }
  };

  const handleStageTouchEnd = (e: Konva.KonvaEventObject<TouchEvent>) => {
    canvasEvents.handleTouchEnd(e);
    lastTouchDistRef.current = null;
    lastTouchMidRef.current = null;
  };

  // Zoom controls
  const handleZoomIn = () => {
    const zoomLevels = [1, 2, 3, 4, 5];
    const currentIndex = zoomLevels.findIndex((level) => level > zoom);
    const newZoom = currentIndex !== -1 ? zoomLevels[currentIndex] : 5;
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const zoomLevels = [1, 2, 3, 4, 5];
    const currentIndex = zoomLevels.findIndex((level) => level >= zoom);
    const newZoom = currentIndex > 0 ? zoomLevels[currentIndex - 1] : 1;
    setZoom(newZoom);
  };

  const handleResetView = () => {
    resetViewport();
  };

  // Handle prop drop from library
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    const propDefinitionId = e.dataTransfer.getData("propDefinitionId");
    if (!propDefinitionId || !map) return;

    // Get drop position relative to container
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dropX = e.clientX - rect.left;
    const dropY = e.clientY - rect.top;

    // Convert to world coordinates
    const worldX = (dropX - panX) / zoom;
    const worldY = (dropY - panY) / zoom;

    // Get the selected layer, or default to first layer
    const layer = selectedLayerId
      ? map.layers.find((l) => l.id === selectedLayerId)
      : map.layers[0];
    if (!layer || layer.locked) return;

    // Get prop definition
    const propDefinition = map.propDefinitions.find(
      (def) => def.id === propDefinitionId,
    );
    if (!propDefinition) return;

    // Get next z-index
    const nextZIndex = getNextZIndex(layer.props);

    // Create prop instance
    const newProp = createProp(propDefinition, worldX, worldY, nextZIndex);

    // Add to map
    addProp(layer.id, newProp);

    // Select the newly placed prop
    selectProps([newProp.id]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  // If no map is loaded, show placeholder
  if (!map) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-center text-gray-500">
          <p className="text-xl mb-2">No map loaded</p>
          <p className="text-sm">Create or load a map to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-slate-900"
      style={{ touchAction: "none", cursor: isPickerActive ? "crosshair" : undefined }}
      tabIndex={0}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Konva Stage */}
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        x={Math.round(panX)}
        y={Math.round(panY)}
        scaleX={zoom}
        scaleY={zoom}
        pixelRatio={window.devicePixelRatio || 1}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={canvasEvents.handleMouseUp}
        onMouseLeave={handleStageMouseLeave}
        onTouchStart={handleStageTouchStart}
        onTouchMove={handleStageTouchMove}
        onTouchEnd={handleStageTouchEnd}
      >
        {/* Render each layer with its tiles and props grouped together, sorted by depthIndex */}
        {map.layers
          .slice()
          .sort((a, b) => a.depthIndex - b.depthIndex)
          .map((layer) => (
            <Layer
              key={layer.id}
              imageSmoothingEnabled={false}
              opacity={layer.opacity}
              visible={layer.visible}
            >
              {/* Render tiles for this layer using native canvas */}
              <TileLayer
                layer={layer}
                tileSize={map.tileSize}
                canvasWidth={dimensions.width}
                canvasHeight={dimensions.height}
              />

              {/* Render props for this layer (Konva elements for interactivity) */}
              <PropLayer layer={layer} />
            </Layer>
          ))}

        {/* Cursor Preview Layer - Shows what will be placed */}
        {editable && (
          <CursorLayer
            tileSize={map.tileSize}
            cursorGridX={cursorGridPos?.x ?? null}
            cursorGridY={cursorGridPos?.y ?? null}
            boxPreview={canvasEvents.boxPreview}
          />
        )}

        {/* Grid Layer - Rendered on top of everything */}
        <GridLayer
          width={map.width}
          height={map.height}
          tileSize={map.tileSize}
          showGrid={showGrid}
        />

        {/* Overlay Layer - UI elements, selection, etc. */}
        {/* <OverlayLayer /> */}
      </Stage>

      {/* Canvas Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 bg-slate-800 rounded-lg shadow-lg p-2">
        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Zoom In (+)"
        >
          <FiZoomIn size={20} />
        </button>

        {/* Zoom Level Display */}
        <div className="px-2 py-1 text-xs text-center text-gray-400 border-y">
          {Math.round(zoom * 100)}%
        </div>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Zoom Out (-)"
        >
          <FiZoomOut size={20} />
        </button>

        {/* Reset View */}
        <button
          onClick={handleResetView}
          className="p-2 hover:bg-gray-700 rounded transition-colors border-t"
          title="Reset View (Ctrl+0)"
        >
          <FiMaximize2 size={20} />
        </button>
      </div>

      {/* Map Info */}
      <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg shadow-lg px-3 py-2 text-sm">
        <div className="font-semibold text-gray-400">{map.name}</div>
        <div className="text-gray-400 text-xs">
          {map.width} × {map.height} tiles ({map.tileSize}px)
        </div>
      </div>
    </div>
  );
};
