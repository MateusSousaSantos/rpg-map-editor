import { useEffect } from 'react';
import { MapCanvas } from './components/Canvas/MapCanvas';
import { Sidebar } from './components/Sidebar';
import { PropsHierarchy } from './components/PropsHierarchy';
import { useMapStore } from './stores/mapStore';
import { useToolStore } from './stores/toolStore';
import { useUISelectionStore } from './stores/uiSelectionStore';
import { useSampleTiles } from './utils/testHelpers';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { FiEdit2, FiTrash2, FiMousePointer, FiGrid, FiSquare } from 'react-icons/fi';

function App() {
  const { map, createMap, addPropDefinition } = useMapStore();
  const { createSampleTiles } = useSampleTiles();
  const { activeTool, setActiveTool } = useToolStore();
  const { showGrid, toggleGrid, selectLayer, selectedLayerId } = useUISelectionStore();
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();
  
  // Create a test map on first load
  useEffect(() => {
    if (!map) {
      createMap(10, 10, 16); // 20x15 tiles, 16px tile size
    }
  }, [map, createMap]);
  
  // Set default selected layer when map is created (only if no layer is selected)
  useEffect(() => {
    if (map && map.layers.length > 0 && !selectedLayerId) {
      selectLayer(map.layers[0].id);
    }
  }, [map, selectLayer, selectedLayerId]);
  
  // Create sample tiles after map is created (for testing Phase 2)
  useEffect(() => {
    if (map && map.tileDefinitions.length === 0) {
      // Wait a bit to ensure map is fully initialized
      setTimeout(() => {
        createSampleTiles();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  
  // Create sample prop definitions
  useEffect(() => {
    if (map && map.propDefinitions.length === 0) {
      // Add sample prop definitions for testing
      const sampleProps = [
        {
          id: 'stone-1',
          name: 'Pedra',
          category: 'terrain',
          textureUrl: '/props/pedra.png',
          width: 16,  // Use actual image dimensions to avoid blur
          height: 16,
          tags: ['outdoor', 'nature'],
          defaultOpacity: 1,
          defaultScaleX: 1,
          defaultScaleY: 1,
        }
      ];
      
      sampleProps.forEach(prop => addPropDefinition(prop));
    }
  }, [map, addPropDefinition]);
  
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Left Sidebar - Props Hierarchy */}
      <PropsHierarchy />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-slate-950 min-w-0">
        <header className="h-12 border-b border-slate-800 bg-slate-900/80 flex items-center px-4 justify-between">
          <h1 className="text-sm font-semibold text-slate-100">
            RPG Map Editor
          </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>
                Prop System - Phase 1-5 Complete
              </span>
            </div>
          </header>
          
          {/* Simple Toolbar for Phase 3 Demo */}
          <div className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center px-4 gap-3">
            {/* Tool Selection */}
            <div className="flex gap-1 border border-slate-700 rounded-lg p-1">
              <button
                onClick={() => setActiveTool('brush')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                  activeTool === 'brush'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Brush Tool (Paint Tiles)"
              >
                <FiEdit2 size={16} />
                <span className="text-xs font-medium">Brush</span>
              </button>
              
              <button
                onClick={() => setActiveTool('eraser')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                  activeTool === 'eraser'
                    ? 'bg-red-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Eraser Tool (Remove Tiles)"
              >
                <FiTrash2 size={16} />
                <span className="text-xs font-medium">Eraser</span>
              </button>
              
              <button
                onClick={() => setActiveTool('select')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                  activeTool === 'select'
                    ? 'bg-green-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Selection Tool"
              >
                <FiMousePointer size={16} />
                <span className="text-xs font-medium">Select</span>
              </button>
              
              <button
                onClick={() => setActiveTool('box')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                  activeTool === 'box'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Box Paint Tool (Drag to paint area)"
              >
                <FiSquare size={16} />
                <span className="text-xs font-medium">Box</span>
              </button>
            </div>
            
            {/* Grid Toggle */}
            <button
              onClick={toggleGrid}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
                showGrid
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Toggle Grid"
            >
              <FiGrid size={16} />
              <span className="text-xs font-medium">Grid</span>
            </button>
            {/* Instructions */}
            <div className="ml-auto text-xs text-slate-500">
              <span>💡 Drag props from sidebar • Shift+Drag to pan • Scroll to zoom</span>
            </div>
          </div>
          
          {/* Map Canvas */}
          <MapCanvas editable={true} />
        </main>
        
        {/* Sidebar */}
        <Sidebar />
      </div>
  );
}

export default App;
