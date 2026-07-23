import { LayersSection } from "./LayersSection";
import { ContextBody } from "./ContextBody";
import { PropsHierarchyContent } from "../PropsHierarchy/PropsHierarchyContent";

export const RightPanel = () => {
  return (
    <aside className="w-80 shrink-0 flex flex-col h-full bg-panel border-l border-edge overflow-y-auto">
      {/* Context body – library (tiles/props) or the selected-prop inspector */}
      <div className="border-b border-edge">
        <ContextBody />
      </div>

      {/* Objects – collapsible placed-props hierarchy, sits under the tiles */}
      <PropsHierarchyContent />

      {/* Layers – anchored to the bottom of the panel */}
      <LayersSection />
    </aside>
  );
};
