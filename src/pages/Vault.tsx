import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMapStore } from "../stores/mapStore";
import { initializeAssets } from "../utils/tilesdefinition";
import { Navbar } from "../components/Layout/Navbar";
import { FiPlus, FiTrash2, FiSearch, FiMap } from "react-icons/fi";

type SortMode = "newest" | "az";

const MAP_GRADIENTS = [
  "from-indigo-900/70 to-canvas",
  "from-violet-900/70 to-canvas",
  "from-cyan-900/70 to-canvas",
  "from-emerald-900/70 to-canvas",
  "from-orange-900/70 to-canvas",
  "from-rose-900/70 to-canvas",
];

function Vault() {
  const navigate = useNavigate();
  const { createMap, loadMapById, deleteMapById, getAllMaps } = useMapStore();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "Untitled Map",
    width: 32,
    height: 32,
  });

  const allMaps = getAllMaps();

  const filteredMaps = allMaps
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sort === "newest"
        ? new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        : a.name.localeCompare(b.name)
    );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "name" ? value : parseInt(value) || 0,
    }));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMap(formData.name, formData.width, formData.height, 16);
    const { addTileDefinition, addPropDefinition } = useMapStore.getState();
    initializeAssets(addTileDefinition, addPropDefinition);
    navigate("/app");
  };

  const handleLoad = (mapId: string) => {
    loadMapById(mapId);
    navigate("/app");
  };

  const handleDelete = (e: React.MouseEvent, mapId: string) => {
    e.stopPropagation();
    if (confirm("Delete this map? This cannot be undone.")) {
      deleteMapById(mapId);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas selectable">
      <Navbar />

      {/* Page header */}
      <div className="border-b border-edge bg-panel px-6 py-4 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink">My Maps</h1>
            <p className="text-sm text-ink-muted mt-0.5">
              {allMaps.length === 0
                ? "No maps yet"
                : `${allMaps.length} saved map${allMaps.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <FiPlus size={16} />
            New Map
          </button>
        </div>
      </div>

      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        {/* Search + sort controls */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <FiSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search maps…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-panel border border-edge rounded-lg text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:border-accent-light"
            />
          </div>

          <div className="flex rounded-lg border border-edge overflow-hidden shrink-0">
            {(["newest", "az"] as SortMode[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  sort === s
                    ? "bg-accent/15 text-accent"
                    : "bg-panel text-ink-muted hover:text-ink hover:bg-raised"
                }`}
              >
                {s === "newest" ? "Newest" : "A–Z"}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {filteredMaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <FiMap size={44} className="text-ink-muted mb-4" />
            <p className="text-ink-secondary font-semibold mb-1">
              {allMaps.length === 0 ? "No maps yet" : "No maps match your search"}
            </p>
            <p className="text-ink-muted text-sm mb-6">
              {allMaps.length === 0
                ? "Create your first map to get started"
                : "Try a different search term"}
            </p>
            {allMaps.length === 0 && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <FiPlus size={16} />
                Create your first map
              </button>
            )}
          </div>
        ) : (
          /* Map card grid */
          <div className="grid grid-cols-3 gap-4">
            {filteredMaps.map((map, i) => (
              <div
                key={map.id}
                onClick={() => handleLoad(map.id)}
                className="group rounded-xl border border-edge hover:border-accent/50 overflow-hidden cursor-pointer transition-all hover:shadow-lg"
              >
                {/* Thumbnail */}
                <div
                  className={`h-28 bg-gradient-to-br ${MAP_GRADIENTS[i % MAP_GRADIENTS.length]} hero-grid-bg relative`}
                >
                  {/* Delete button – visible on hover */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDelete(e, map.id)}
                      className="p-1.5 rounded-lg bg-canvas/80 hover:bg-danger/20 text-ink-muted hover:text-danger transition-colors"
                      title="Delete map"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>

                  {/* Layer count badge */}
                  <div className="absolute bottom-2 left-2">
                    <span className="px-1.5 py-0.5 rounded bg-canvas/70 text-ink-muted text-[10px]">
                      {map.layers.length} layer
                      {map.layers.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Info row */}
                <div className="p-3 bg-panel">
                  <p className="font-semibold text-ink text-sm truncate">
                    {map.name}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {map.width}×{map.height} tiles ·{" "}
                    {new Date(map.lastModified).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Create Map Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-canvas/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-panel border border-edge rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-ink">Create New Map</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded text-ink-muted hover:text-ink hover:bg-raised transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                  Map Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-raised border border-edge rounded-lg text-ink text-sm focus:outline-none focus:border-accent-light"
                  placeholder="Untitled Map"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                    Width (tiles)
                  </label>
                  <input
                    type="number"
                    name="width"
                    value={formData.width}
                    onChange={handleChange}
                    min="1"
                    max="256"
                    className="w-full px-3 py-2 bg-raised border border-edge rounded-lg text-ink text-sm focus:outline-none focus:border-accent-light"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                    Height (tiles)
                  </label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    min="1"
                    max="256"
                    className="w-full px-3 py-2 bg-raised border border-edge rounded-lg text-ink text-sm focus:outline-none focus:border-accent-light"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-raised hover:bg-overlay border border-edge text-ink-muted hover:text-ink text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-accent hover:bg-accent-light text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Create →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vault;
