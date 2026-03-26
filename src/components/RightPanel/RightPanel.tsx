import { useState, useCallback, useRef } from "react";
import { LayersSection } from "./LayersSection";
import { ContentTabs } from "./ContentTabs";

export const RightPanel = () => {
  const [splitRatio, setSplitRatio] = useState(0.38);
  const panelRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const onSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;

    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      const ratio = (e.clientY - rect.top) / rect.height;
      setSplitRatio(Math.min(0.7, Math.max(0.2, ratio)));
    };

    const onMouseUp = () => {
      draggingRef.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  return (
    <aside
      ref={panelRef}
      className="w-90 shrink-0 flex flex-col h-full bg-panel border-l border-edge overflow-hidden"
    >
      {/* Layers Section – top portion */}
      <div
        style={{ height: `${splitRatio * 100}%` }}
        className="flex flex-col overflow-hidden shrink-0"
      >
        <LayersSection />
      </div>

      {/* Draggable Splitter */}
      <div
        onMouseDown={onSplitterMouseDown}
        className="h-1 shrink-0 bg-edge hover:bg-accent/40 cursor-row-resize transition-colors"
        title="Drag to resize panels"
      />

      {/* Content Tabs – bottom portion */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <ContentTabs />
      </div>
    </aside>
  );
};
