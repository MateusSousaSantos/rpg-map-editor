import { useUISelectionStore } from "../../stores/uiSelectionStore";
import { FiChevronRight, FiChevronLeft } from "react-icons/fi";
import { LayersPanel } from "./LayersPanel";
import { TilesPanel } from "./TilesPanel";
import { PropsPanel } from "./PropsPanel";

export const Sidebar = () => {
  const { sidebarOpen, toggleSidebar } = useUISelectionStore();

  return (
    <aside
      className={`h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out flex flex-col ${
        sidebarOpen ? "w-80" : "w-12"
      }`}
    >
      {sidebarOpen ? (
        <>
          {/* Sidebar Header */}
          <div className="h-12 border-b border-slate-800 flex items-center justify-between px-3 bg-slate-900/80">
            <h2 className="text-sm font-semibold text-slate-100 whitespace-nowrap">
              Properties
            </h2>
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Close sidebar"
            >
              <FiChevronRight size={18} />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="p-4 overflow-y-auto flex-1">
            <div className="space-y-6">
              {/* Tiles Panel */}
              <TilesPanel />

              {/* Props Panel */}
              <PropsPanel />

              {/* Layers Panel */}
              <LayersPanel />
            </div>
          </div>
        </>
      ) : (
        /* Collapsed state - button centered */
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Open sidebar"
          >
            <FiChevronLeft size={18} />
          </button>
        </div>
      )}
    </aside>
  );
};
