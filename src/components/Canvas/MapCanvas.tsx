import { useEffect, useRef, useState } from 'react';
import { Stage } from 'react-konva';
import Konva from 'konva';
import { useMapStore } from '../../stores/mapStore';
import { useViewportStore } from '../../stores/viewportStore';
import { useUISelectionStore } from '../../stores/uiSelectionStore';
import { GridLayer } from './BackgroundLayer';
import { TileLayer } from './TileLayer';
import { CursorLayer } from './CursorLayer';
import { FiZoomIn, FiZoomOut, FiMaximize2 } from 'react-icons/fi';
import { useCanvasEvents } from '../../hooks/useCanvasEvents';


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
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  // Cursor position for preview
  const [cursorGridPos, setCursorGridPos] = useState<{ x: number; y: number } | null>(null);
  
  // Store state
  const map = useMapStore((state) => state.map);
  const { panX, panY, zoom, setPan, setZoom, resetViewport } = useViewportStore();
  const showGrid = useUISelectionStore((state) => state.showGrid);
  
  // Canvas events hook for tool interactions
  const canvasEvents = useCanvasEvents({
    tileSize: map?.tileSize || 32,
    editable,
  });
  
  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom with + / -
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleResetView();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom]);
  
  // Handle wheel zoom
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const oldScale = zoom;
    const pointer = stage.getPointerPosition();
    
    if (!pointer) return;
    
    // Zoom in whole number steps: 1x, 2x, 3x, 4x, 5x
    const zoomLevels = [1, 2, 3, 4, 5];
    const currentIndex = zoomLevels.findIndex(level => level >= oldScale);
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    
    let newScale: number;
    if (direction > 0) {
      // Zoom in
      const nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, zoomLevels.length - 1);
      newScale = zoomLevels[nextIndex];
    } else {
      // Zoom out
      const prevIndex = currentIndex === -1 ? zoomLevels.length - 1 : Math.max(currentIndex - 1, 0);
      newScale = zoomLevels[prevIndex];
    }
    
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
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
      
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
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
    canvasEvents.handleMouseUp();
  };
  
  // Zoom controls
  const handleZoomIn = () => {
    const zoomLevels = [1, 2, 3, 4, 5];
    const currentIndex = zoomLevels.findIndex(level => level > zoom);
    const newZoom = currentIndex !== -1 ? zoomLevels[currentIndex] : 5;
    setZoom(newZoom);
  };
  
  const handleZoomOut = () => {
    const zoomLevels = [1, 2, 3, 4, 5];
    const currentIndex = zoomLevels.findIndex(level => level >= zoom);
    const newZoom = currentIndex > 0 ? zoomLevels[currentIndex - 1] : 1;
    setZoom(newZoom);
  };
  
  const handleResetView = () => {
    resetViewport();
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
      tabIndex={0}
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
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={canvasEvents.handleMouseUp}
        onMouseLeave={handleStageMouseLeave}
      >
        {/* Tile Layers - Render all layers sorted by depth */}
        {map.layers
          .slice()
          .sort((a, b) => a.depthIndex - b.depthIndex)
          .filter(layer => layer.type === 'tile')
          .map(layer => (
            <TileLayer 
              key={layer.id} 
              layer={layer}
              tileSize={map.tileSize}
              canvasWidth={dimensions.width}
              canvasHeight={dimensions.height}
            />
          ))
        }
        
        {/* Cursor Preview Layer - Shows what will be placed */}
        {editable && (
          <CursorLayer
            tileSize={map.tileSize}
            cursorGridX={cursorGridPos?.x ?? null}
            cursorGridY={cursorGridPos?.y ?? null}
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
        <div className="font-semibold">{map.name}</div>
        <div className="text-gray-400 text-xs">
          {map.width} × {map.height} tiles ({map.tileSize}px)
        </div>
      </div>
      
      {/* Pan Instructions */}
      <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg shadow-lg px-3 py-2 text-xs text-gray-400">
        <div>🖱️ Shift + Drag to pan</div>
        <div>🖱️ Scroll to zoom</div>
      </div>
    </div>
  );
};
