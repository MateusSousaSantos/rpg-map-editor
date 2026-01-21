import { useState } from "react";
import { useMapStore } from "../stores/mapStore";
import { useNavigate } from "react-router-dom";
import { initializeAssets } from "../utils/tilesdefinition";

function Home() {
  const navigate = useNavigate();
  const createMap = useMapStore((state) => state.createMap);
  const [formData, setFormData] = useState({
    name: "Untitled Map",
    width: 32,
    height: 32,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "name" ? value : parseInt(value) || 0,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMap(formData.name, formData.width, formData.height, 16);
    const { addTileDefinition, addPropDefinition } = useMapStore.getState();
    initializeAssets(addTileDefinition, addPropDefinition);
    // Navigate to the editor after creating the map
    navigate("/app");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <main className="flex-1 flex flex-col bg-slate-950 min-w-0">
        <header className="bg-slate-900 w-full h-20 flex items-center justify-center border-b border-slate-800 py-2">
          <h1 className="text-5xl text-white font-bold">RPG MAP EDITOR</h1>
        </header>
        <div className="w-full h-full flex">
          <div className="flex-1 bg-slate-800 border border-slate-700"></div>

          <aside
            className={`h-full bg-slate-900 border-l border-slate-800 transition-all duration-300 ease-in-out shrink-0 flex flex-col w-80`}
          >
            <>
              {/* Sidebar Header */}
              <div className="h-12 border-b border-slate-800 flex items-center justify-between px-3 bg-slate-900/80">
                <h2 className="text-sm font-semibold text-slate-100 whitespace-nowrap">
                  Criar mapa
                </h2>
              </div>

              {/* Sidebar Content */}
              <div className="p-4 overflow-y-auto flex-1">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Map Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Map Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Enter map name"
                    />
                  </div>

                  {/* Width */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Width (tiles)
                    </label>
                    <input
                      type="number"
                      name="width"
                      value={formData.width}
                      onChange={handleChange}
                      min="1"
                      max="256"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Height */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Height (tiles)
                    </label>
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      min="1"
                      max="256"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors duration-200"
                  >
                    Create Map
                  </button>
                </form>
              </div>
            </>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Home;
