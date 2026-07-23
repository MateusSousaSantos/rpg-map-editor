import { useToolStore } from "../../stores/toolStore";
import { useHistoryStore } from "../../stores/historyStore";
import { FiEdit2, FiTrash2, FiSquare, FiDownload, FiRotateCcw, FiRotateCw, FiShuffle } from "react-icons/fi";

interface ToolDockProps {
  onExportClick: () => void;
}

export const ToolDock = ({ onExportClick }: ToolDockProps) => {
  const { activeTool, boxMode, setActiveTool, setBoxMode, randomBrushEnabled, setRandomBrushEnabled, selectedTileDefinitionId } = useToolStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  const handleToolClick = (tool: 'brush' | 'eraser') => {
    const correspondingBoxMode = tool === 'brush' ? 'paint' : 'erase';
    if (activeTool === tool) {
      // Clicking already-selected tool → deselect
      setActiveTool('select');
    } else if (activeTool === 'box') {
      if (boxMode === correspondingBoxMode) {
        // Box is same type as clicked tool → switch to that tool
        setActiveTool(tool);
      } else {
        // Box is different type → change box mode
        setBoxMode(correspondingBoxMode);
      }
    } else {
      setActiveTool(tool);
    }
  };

  const handleBoxClick = () => {
    if (activeTool === 'box') {
      setActiveTool('select');
    } else {
      setActiveTool('box');
    }
  };

  const randomDisabled = activeTool === 'eraser' || !selectedTileDefinitionId;

  return (
    <aside className="w-14 shrink-0 flex flex-col items-center gap-1 py-3 bg-panel border-r border-edge">
      {/* Brush Tool */}
      <button
        onClick={() => handleToolClick("brush")}
        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
          activeTool === "brush"
            ? "bg-accent text-white"
            : "text-ink-muted hover:text-ink hover:bg-raised"
        }`}
        title="Brush Tool (B)"
      >
        <FiEdit2 size={18} />
      </button>

      {/* Eraser Tool */}
      <button
        onClick={() => handleToolClick("eraser")}
        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
          activeTool === "eraser"
            ? "bg-danger/20 text-danger"
            : "text-ink-muted hover:text-ink hover:bg-raised"
        }`}
        title="Eraser Tool (E)"
      >
        <FiTrash2 size={18} />
      </button>

      {/* Box Tool */}
      <button
        onClick={handleBoxClick}
        className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
          activeTool === "box"
            ? boxMode === "erase"
              ? "bg-danger/20 text-danger"
              : "bg-prop/20 text-prop"
            : "text-ink-muted hover:text-ink hover:bg-raised"
        }`}
        title={`Box Tool (X) — ${boxMode === "erase" ? "Erase" : "Paint"} mode`}
      >
        <FiSquare size={18} />
        {boxMode === "erase" ? (
          <FiTrash2 size={9} className="absolute bottom-1 right-1 opacity-70" />
        ) : (
          <FiEdit2 size={9} className="absolute bottom-1 right-1 opacity-70" />
        )}
      </button>

      {/* Random Brush Toggle */}
      <button
        onClick={() => setRandomBrushEnabled(!randomBrushEnabled)}
        disabled={randomDisabled}
        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none ${
          randomBrushEnabled && selectedTileDefinitionId
            ? "bg-accent text-white"
            : "text-ink-muted hover:text-ink hover:bg-raised"
        }`}
        title="Random Brush (R) — picks a random variant from the selected tile's group"
      >
        <FiShuffle size={18} />
      </button>

      {/* Divider */}
      <div className="h-px w-6 bg-edge my-1" />

      {/* Undo */}
      <button
        onClick={undo}
        disabled={!canUndo()}
        className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors text-ink-muted hover:text-ink hover:bg-raised disabled:opacity-30 disabled:pointer-events-none"
        title="Undo (Ctrl+Z)"
      >
        <FiRotateCcw size={18} />
      </button>

      {/* Redo */}
      <button
        onClick={redo}
        disabled={!canRedo()}
        className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors text-ink-muted hover:text-ink hover:bg-raised disabled:opacity-30 disabled:pointer-events-none"
        title="Redo (Ctrl+Shift+Z)"
      >
        <FiRotateCw size={18} />
      </button>

      {/* Divider */}
      <div className="h-px w-6 bg-edge my-1" />

      {/* Export */}
      <button
        onClick={onExportClick}
        className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors text-ok hover:bg-raised"
        title="Export Map"
      >
        <FiDownload size={18} />
      </button>
    </aside>
  );
};
