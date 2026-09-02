import { useEffect, useState } from "react";
import { MapCanvas } from "../components/Canvas/MapCanvas";
import { RightPanel } from "../components/RightPanel/RightPanel";
import { ToolDock } from "../components/Toolbar/ToolDock";
import { ExportModal } from "../components/ExportModal/ExportModal";
import { Navbar } from "../components/Layout/Navbar";
import { MapNameEditor } from "../components/MapNameEditor";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useMapStore, flushMapPersistence } from "../stores/mapStore";
import { useUISelectionStore } from "../stores/uiSelectionStore";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { SpeedInsights } from "@vercel/speed-insights/react";

function App() {
  const { map } = useMapStore();
  const { selectLayer, selectedLayerId } = useUISelectionStore();
  const [exportOpen, setExportOpen] = useState(false);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Map edits persist to localStorage on a trailing debounce (see mapStore) so
  // a `beforeunload` write covers a real tab close, but a client-side route
  // change (e.g. back to the Vault) doesn't fire that event — flush explicitly
  // on unmount so nothing from the last debounce window is lost.
  useEffect(() => {
    return () => {
      flushMapPersistence();
    };
  }, []);

  // Dev-only: expose the lighting perf stress-test generator on `window` so it
  // can be run from the browser console (`__stressLighting()`) without any
  // shipped UI. See utils/lightingStressTest.ts.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let cancelled = false;
    import("../utils/lightingStressTest").then(({ generateLightingStressMap }) => {
      if (cancelled) return;
      (window as unknown as { __stressLighting: typeof generateLightingStressMap }).__stressLighting =
        generateLightingStressMap;
      console.log("[dev] __stressLighting(options?) is available on window — see utils/lightingStressTest.ts");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (map && map.layers.length > 0) {
      const layerExistsInMap = map.layers.some((l) => l.id === selectedLayerId);
      if (!layerExistsInMap) {
        selectLayer(map.layers[0].id);
      }
    }
  }, [map, selectLayer, selectedLayerId]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* Top Navbar */}
      <Navbar />

      {/* Editor row */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left vertical tool dock */}
        <ToolDock onExportClick={() => setExportOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-canvas min-w-0 relative">
          {/* Map info sub-bar */}
          {map && (
            <div className="h-8 border-b border-edge bg-panel/60 flex items-center px-4 gap-2 shrink-0">
              <MapNameEditor />
              <span className="text-ink-muted text-xs">·</span>
              <span className="text-xs text-ink-muted">
                {map.width}×{map.height} tiles · {map.tileSize}px
              </span>
            </div>
          )}

          {/* Map Canvas */}
          <MapCanvas editable={true} />

          {/* Busy overlay for long-running operations (big fill/undo) */}
          <LoadingOverlay />
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
