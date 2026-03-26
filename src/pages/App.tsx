import { useEffect, useState } from "react";
import { MapCanvas } from "../components/Canvas/MapCanvas";
import { RightPanel } from "../components/RightPanel/RightPanel";
import { PropsHierarchy } from "../components/PropsHierarchy";
import { Toolbar } from "../components/Toolbar/Toolbar";
import { ExportModal } from "../components/ExportModal/ExportModal";
import { Navbar } from "../components/Layout/Navbar";
import { useMapStore } from "../stores/mapStore";
import { useUISelectionStore } from "../stores/uiSelectionStore";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { SpeedInsights } from "@vercel/speed-insights/react";

function App() {
  const { map } = useMapStore();
  const { selectLayer, selectedLayerId } = useUISelectionStore();
  const [exportOpen, setExportOpen] = useState(false);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  useEffect(() => {
    if (map && map.layers.length > 0 && !selectedLayerId) {
      selectLayer(map.layers[0].id);
    }
  }, [map, selectLayer, selectedLayerId]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* Top Navbar */}
      <Navbar />

      {/* Editor row */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Props Hierarchy */}
        <PropsHierarchy />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-canvas min-w-0 relative">
          {/* Map info sub-bar */}
          {map && (
            <div className="h-8 border-b border-edge bg-panel/60 flex items-center px-4 gap-2 shrink-0">
              <span className="text-xs font-semibold text-ink">{map.name}</span>
              <span className="text-ink-muted text-xs">·</span>
              <span className="text-xs text-ink-muted">
                {map.width}×{map.height} tiles · {map.tileSize}px
              </span>
            </div>
          )}

          {/* Map Canvas */}
          <MapCanvas editable={true} />
          {/* Floating Toolbar */}
          <Toolbar onExportClick={() => setExportOpen(true)} />
        </main>

        {/* Right Panel */}
        <RightPanel />
      </div>

      <SpeedInsights />
      <ExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}

export default App;
