import { useEffect, useState } from "react";
import { MapCanvas } from "../components/Canvas/MapCanvas";
import { Sidebar } from "../components/Sidebar";
import { PropsHierarchy } from "../components/PropsHierarchy";
import { Toolbar } from "../components/Toolbar/Toolbar";
import { ExportModal } from "../components/ExportModal/ExportModal";
import { useMapStore } from "../stores/mapStore";
import { useUISelectionStore } from "../stores/uiSelectionStore";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Link } from "react-router-dom";

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
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Left Sidebar - Props Hierarchy */}
      <PropsHierarchy />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-slate-950 min-w-0">
        <header className="h-12 border-b border-slate-800 bg-slate-900/80 flex items-center px-4 justify-between">
          <Link to="/">
            <h1 className="text-sm font-semibold text-slate-100">
              RPG Map Editor
            </h1>
          </Link>
        </header>

        {/* Map Canvas */}
        <MapCanvas editable={true} />
        {/* Floating Toolbar */}
        <Toolbar onExportClick={() => setExportOpen(true)} />
      </main>
      <SpeedInsights />
      <ExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} />
      {/* Sidebar */}
      <Sidebar />
    </div>
  );
}

export default App;
