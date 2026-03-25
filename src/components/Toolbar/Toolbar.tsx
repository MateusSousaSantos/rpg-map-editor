import { useToolStore } from "../../stores/toolStore";
import { FiEdit2, FiTrash2, FiSquare, FiDownload } from "react-icons/fi";

interface ToolbarProps {
  onExportClick: () => void;
}

export const Toolbar = ({ onExportClick }: ToolbarProps) => {
  const { activeTool, setActiveTool } = useToolStore();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full border border-slate-700 bg-slate-900/90 backdrop-blur-sm shadow-xl">
      {/* Brush Tool */}
      <button
        onClick={() => setActiveTool("brush")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
          activeTool === "brush"
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        }`}
        title="Brush Tool (Paint Tiles)"
      >
        <FiEdit2 size={16} />
        <span className="text-xs font-medium">Brush</span>
      </button>

      {/* Eraser Tool */}
      <button
        onClick={() => setActiveTool("eraser")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
          activeTool === "eraser"
            ? "bg-red-600 text-white"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        }`}
        title="Eraser Tool (Remove Tiles)"
      >
        <FiTrash2 size={16} />
        <span className="text-xs font-medium">Eraser</span>
      </button>

      {/* Box Tool */}
      <button
        onClick={() => setActiveTool("box")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
          activeTool === "box"
            ? "bg-purple-600 text-white"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        }`}
        title="Box Paint Tool (Drag to paint area)"
      >
        <FiSquare size={16} />
        <span className="text-xs font-medium">Box</span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-700 mx-1" />

      {/* Export */}
      <button
        onClick={onExportClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-emerald-400 hover:text-emerald-300 hover:bg-slate-800"
        title="Export Map"
      >
        <FiDownload size={16} />
        <span className="text-xs font-medium">Export</span>
      </button>
    </div>
  );
};
