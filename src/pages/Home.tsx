import { useState } from "react";
import { useMapStore } from "../stores/mapStore";
import { useNavigate } from "react-router-dom";
import { initializeAssets } from "../utils/tilesdefinition";
import { FaTrash } from "react-icons/fa";

function Home() {
  const navigate = useNavigate();
  const { createMap, loadMapById, deleteMapById, getAllMaps } = useMapStore();
  const [formData, setFormData] = useState({
    name: "Untitled Map",
    width: 32,
    height: 32,
  });

  const allMaps = getAllMaps();

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

  const handleLoadMap = (mapId: string) => {
    loadMapById(mapId);
    navigate("/app");
  };

  const handleDeleteMap = (e: React.MouseEvent, mapId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this map?")) {
      deleteMapById(mapId);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <main className="flex-1 flex flex-col bg-slate-950 min-w-0">
        <header className="bg-slate-900 w-full h-20 flex items-center justify-center border-b border-slate-800 py-2">
          <h1 className="text-5xl text-white font-bold">RPG MAP EDITOR</h1>
        </header>
        <div className="w-full h-full flex">
          {/* Main content area */}
          <div className="flex-1 bg-slate-800 border border-slate-700 flex gap-8 p-8">
            {/* Create New Map Section */}
            <div className="flex-1 bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-slate-100 mb-4">Create New Map</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
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

                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors duration-200"
                >
                  Create Map
                </button>
              </form>
            </div>

            {/* Your Maps Section */}
            <div className="flex-1 bg-slate-800/50 rounded-lg p-6 border border-slate-700 flex flex-col">
              <h2 className="text-xl font-bold text-slate-100 mb-4">
                Your Maps {allMaps.length > 0 && `(${allMaps.length})`}
              </h2>
              <div className="space-y-2 flex-1 overflow-y-auto">
                {allMaps.length === 0 ? (
                  <p className="text-slate-500 text-sm">No maps yet. Create one to get started!</p>
                ) : (
                  allMaps.map((map) => (
                    <div
                      key={map.id}
                      onClick={() => handleLoadMap(map.id)}
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded border border-slate-600 hover:bg-slate-700 cursor-pointer transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-100 truncate">{map.name}</p>
                        <p className="text-xs text-slate-400">
                          {map.width} × {map.height} tiles • {new Date(map.lastModified).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteMap(e, map.id)}
                        className="ml-2 p-2 hover:bg-red-600/20 rounded transition-colors shrink-0"
                        title="Delete map"
                      >
                        <FaTrash size={16} className="text-red-400" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
