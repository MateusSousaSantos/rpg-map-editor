import { useState } from "react";
import { useToolStore } from "../../stores/toolStore";
import { useUISelectionStore } from "../../stores/uiSelectionStore";
import { useTranslation } from "../../hooks/useTranslation";
import { TilesTab } from "./TilesTab";
import { PropsLibrary } from "./PropsLibrary";
import { LightsLibrary } from "./LightsLibrary";
import { PropInspector } from "./PropInspector";
import { LightInspector } from "./LightInspector";
import { EnvironmentSection } from "./EnvironmentSection";

type LibraryTab = "tiles" | "props" | "lights";

/**
 * ContextBody - the context-driven lower half of the right panel.
 *
 * Priority:
 *  1. A prop is selected on canvas → show the PropInspector.
 *  2. Otherwise → show the Library (Tiles or Props) with a segmented toggle.
 *     The default segment follows what the user is currently working with.
 */
export const ContextBody = () => {
  const selectionMode = useUISelectionStore((s) => s.selectionMode);
  const selectedPropDefinitionId = useToolStore((s) => s.selectedPropDefinitionId);
  const { t } = useTranslation();

  const [libraryTab, setLibraryTab] = useState<LibraryTab>(
    selectedPropDefinitionId ? "props" : "tiles",
  );

  // Follow context: when the active library definition switches between a tile
  // and a prop, snap the segment to match. Adjusting state during render (with a
  // previous-value guard) is the React-recommended way to sync to a prop.
  const [prevPropDefId, setPrevPropDefId] = useState(selectedPropDefinitionId);
  if (selectedPropDefinitionId !== prevPropDefId) {
    setPrevPropDefId(selectedPropDefinitionId);
    setLibraryTab(selectedPropDefinitionId ? "props" : "tiles");
  }

  // A prop is selected on the canvas → inspector takes over.
  if (selectionMode === "props") {
    return <PropInspector />;
  }

  // A light is selected on the canvas → its inspector takes over.
  if (selectionMode === "lights") {
    return <LightInspector />;
  }

  return (
    <div className="flex flex-col">
      {/* Segmented library toggle */}
      <div className="flex items-center gap-1 p-1.5 border-b border-edge">
        {(["tiles", "props", "lights"] as LibraryTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setLibraryTab(tab)}
            className={`flex-1 px-3 py-1 text-xs font-medium capitalize rounded transition-colors ${
              libraryTab === tab
                ? "bg-accent/15 text-accent"
                : "text-ink-muted hover:text-ink hover:bg-raised"
            }`}
          >
            {tab === "tiles"
              ? t("library.tabTiles")
              : tab === "props"
              ? t("library.tabProps")
              : t("library.tabLights")}
          </button>
        ))}
      </div>

      {/* Library content */}
      <div className="p-2.5">
        {libraryTab === "tiles" ? (
          <TilesTab />
        ) : libraryTab === "props" ? (
          <PropsLibrary />
        ) : (
          <LightsLibrary />
        )}
      </div>

      {/* Lighting & atmosphere – map-wide ambient/sun, scoped to the Lights tab */}
      {libraryTab === "lights" && <EnvironmentSection />}
    </div>
  );
};
