import { useToolStore } from "../../stores/toolStore";
import { FiEdit2, FiTrash2, FiSquare, FiDownload } from "react-icons/fi";

interface ToolbarProps {
  onExportClick: () => void;
}

export const Toolbar = ({ onExportClick }: ToolbarProps) => {
  const { activeTool, boxMode, setActiveTool } = useToolStore();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 rounded-full border border-edge bg-panel/95 backdrop-blur-sm shadow-2xl">
      {/* Brush Tool */}
      <button
        onClick={() => setActiveTool("brush")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
          activeTool === "brush"
            ? "bg-accent text-white"
            : "text-ink-muted hover:text-ink hover:bg-raised"
        }`}
        title="Brush Tool (B)"
      >
        <FiEdit2 size={16} />
        <span className="text-xs font-medium">Brush</span>
      </button>

      {/* Eraser Tool */}
      <button
        onClick={() => setActiveTool("eraser")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
          activeTool === "eraser"
            ? "bg-danger/20 text-danger"
            : "text-ink-muted hover:text-ink hover:bg-raised"
        }`}
        title="Eraser Tool (E)"
      >
        <FiTrash2 size={16} />
        <span className="text-xs font-medium">Eraser</span>
      </button>

      {/* Box Tool */}
      <button
        onClick={() => setActiveTool("box")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
          activeTool === "box"
            ? boxMode === "erase"
              ? "bg-danger/20 text-danger"
              : "bg-prop/20 text-prop"
            : "text-ink-muted hover:text-ink hover:bg-raised"
        }`}
        title={`Box Tool (X) — ${boxMode === "erase" ? "Erase" : "Paint"} mode`}
      >
        <FiSquare size={16} />
        <span className="text-xs font-medium">Box</span>
        {boxMode === "erase" ? (
          <FiTrash2 size={10} className="opacity-70" />
        ) : (
          <FiEdit2 size={10} className="opacity-70" />
        )}
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-edge mx-1" />

      {/* Export */}
      <button
        onClick={onExportClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-ok hover:bg-raised"
        title="Export Map"
      >
        <FiDownload size={16} />
        <span className="text-xs font-medium">Export</span>
      </button>
    </div>
  );
};
