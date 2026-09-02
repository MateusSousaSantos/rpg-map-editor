import { useState } from "react";
import { useToolStore } from "../../stores/toolStore";
import { useUISelectionStore } from "../../stores/uiSelectionStore";
import type { LibraryTab } from "../../stores/uiSelectionStore";
import { useTranslation } from "../../hooks/useTranslation";
import { TilesTab } from "./TilesTab";
import { PropsLibrary } from "./PropsLibrary";
import { LightsLibrary } from "./LightsLibrary";
import { PropInspector } from "./PropInspector";
import { LightInspector } from "./LightInspector";
import { EnvironmentSection } from "./EnvironmentSection";

/**
 * ContextBody - the context-driven lower half of the right panel.
 *
 * Priority:
 *  1. A prop is selected on canvas → show the PropInspector.
 *  2. Otherwise → show the Library (Tiles or Props) with a segmented toggle.
 *     The default segment follows what the user is currently working with.
 *
 * `libraryTab` lives in uiSelectionStore (not local state) so the Objects
 * hierarchy panel can follow the same segment instead of keeping its own tab.
 */
export const ContextBody = () => {
  const selectionMode = useUISelectionStore((s) => s.selectionMode);
  const libraryTab = useUISelectionStore((s) => s.libraryTab);
  const setLibraryTab = useUISelectionStore((s) => s.setLibraryTab);
  const selectedTileDefinitionId = useToolStore((s) => s.selectedTileDefinitionId);
  const selectedPropDefinitionId = useToolStore((s) => s.selectedPropDefinitionId);
  const { t } = useTranslation();

  // Follow context: when the user actively picks a *new* tile or prop
  // definition (from the palette, or the canvas eyedropper), snap the segment
  // to match. Tracked independently per kind, and only on a transition into a
  // non-null id — never on a clear-to-null — so an unrelated reset (e.g. the
  // eyedropper nulling the other kind's id as a side effect) can't silently
  // overwrite a tab the user chose manually, "lights" included. Adjusting
  // state during render (with a previous-value guard) is the React-recommended
  // way to sync to a prop.
  const [prevTileDefId, setPrevTileDefId] = useState(selectedTileDefinitionId);
  const [prevPropDefId, setPrevPropDefId] = useState(selectedPropDefinitionId);
  if (selectedTileDefinitionId !== prevTileDefId || selectedPropDefinitionId !== prevPropDefId) {
    const pickedTile = selectedTileDefinitionId && selectedTileDefinitionId !== prevTileDefId;
    const pickedProp = selectedPropDefinitionId && selectedPropDefinitionId !== prevPropDefId;
    setPrevTileDefId(selectedTileDefinitionId);
    setPrevPropDefId(selectedPropDefinitionId);
    if (pickedProp) {
      setLibraryTab("props");
    } else if (pickedTile) {
      setLibraryTab("tiles");
    }
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
