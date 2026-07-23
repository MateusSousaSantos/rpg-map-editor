import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMapStore } from "../stores/mapStore";
import { generateThumbnail } from "../utils/generateThumbnail";
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

const SIZE_PRESETS = [
  { label: "Small", width: 16, height: 16 },
  { label: "Medium", width: 32, height: 32 },
  { label: "Large", width: 64, height: 64 },
  { label: "Huge", width: 128, height: 128 },
];

const RATIO_PRESETS = [
  { label: "1:1", w: 1, h: 1 },
  { label: "4:3", w: 4, h: 3 },
  { label: "16:9", w: 16, h: 9 },
  { label: "3:4", w: 3, h: 4 },
];

const MIN_SIZE = 1;
const MAX_SIZE = 256;
const clampSize = (n: number) =>
  Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(n) || MIN_SIZE));

function Vault() {
  const navigate = useNavigate();
  const { createMap, loadMapById, deleteMapById, getAllMaps } = useMapStore();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "Untitled Map",
    width: 32,
    height: 32,
  });

  const allMaps = getAllMaps();

  // Regenerate thumbnails for maps that are stale or missing one
  useEffect(() => {
    const maps = useMapStore.getState().getAllMaps();
    maps.forEach((m) => {
      const needsRegen =
        !m.thumbnail ||
        !m.thumbnailTimestamp ||
        new Date(m.lastModified).getTime() > new Date(m.thumbnailTimestamp).getTime();
      if (needsRegen) {
        generateThumbnail(m).then((url) => {
          if (url) useMapStore.getState().setMapThumbnail(m.id, url);
        });
      }
    });
  }, []);

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

  const applyPreset = (width: number, height: number) =>
    setFormData((prev) => ({ ...prev, width, height }));

  const applyRatio = (w: number, h: number) =>
    setFormData((prev) => ({
      ...prev,
      height: clampSize((prev.width || 32) * (h / w)),
    }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    createMap(formData.name, formData.width, formData.height, 32);
    const { addTileDefinition, addPropDefinition } = useMapStore.getState();
    await initializeAssets(addTileDefinition, addPropDefinition);
    navigate("/app");
  };

  const handleLoad = (mapId: string) => {
    loadMapById(mapId);
    navigate("/app");
  };

  const handleDeleteClick = (e: React.MouseEvent, mapId: string) => {
    e.stopPropagation();
    setConfirmDelete(mapId);
  };

  const handleDeleteConfirm = (e: React.MouseEvent, mapId: string) => {
    e.stopPropagation();
    deleteMapById(mapId);
    setConfirmDelete(null);
  };

  const handleDeleteCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(null);
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
          /* Pinterest-style masonry wall */
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {filteredMaps.map((map, i) => {
              // Preserve each map's real proportions, clamped to 3:1 … 1:3
              const ratio = Math.min(3, Math.max(1 / 3, map.width / map.height));
              return (
                <div
                  key={map.id}
                  onClick={() => handleLoad(map.id)}
                  style={{ aspectRatio: String(ratio) }}
                  className={`group relative mb-4 break-inside-avoid rounded-xl border border-edge hover:border-accent/50 overflow-hidden cursor-pointer transition-all hover:shadow-lg bg-vault-to-br ${MAP_GRADIENTS[i % MAP_GRADIENTS.length]} hero-grid-bg`}
                >
                  {/* Rendered map snapshot fills the whole card */}
                  {map.thumbnail && (
                    <img
                      src={map.thumbnail}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}

                  {/* Delete button – hidden until hover */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {confirmDelete === map.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleDeleteConfirm(e, map.id)}
                          className="px-2 py-1 rounded-lg bg-danger text-white text-[10px] font-semibold transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={handleDeleteCancel}
                          className="px-2 py-1 rounded-lg bg-canvas/80 text-ink-muted text-[10px] font-medium transition-colors hover:text-ink"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleDeleteClick(e, map.id)}
                        className="p-1.5 rounded-lg bg-canvas/80 hover:bg-danger/20 text-ink-muted hover:text-danger transition-colors"
                        title="Delete map"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Name + info – floats in on hover */}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-canvas/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="font-semibold text-ink text-sm truncate">
                      {map.name}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {map.width}×{map.height} tiles ·{" "}
                      {new Date(map.lastModified).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
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
            className="bg-panel border border-edge rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-edge">
              <h2 className="text-lg font-bold text-ink">Create New Map</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded text-ink-muted hover:text-ink hover:bg-raised transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2">
              {/* Left: controls */}
              <div className="p-6 space-y-4 border-b sm:border-b-0 sm:border-r border-edge">
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

                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                    Presets
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SIZE_PRESETS.map((p) => {
                      const active =
                        formData.width === p.width && formData.height === p.height;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => applyPreset(p.width, p.height)}
                          className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                            active
                              ? "bg-accent/15 border-accent/40 text-accent"
                              : "bg-raised border-edge text-ink-muted hover:text-ink hover:border-edge-strong"
                          }`}
                        >
                          <span className="block">{p.label}</span>
                          <span className="block text-[10px] opacity-70">
                            {p.width}×{p.height}
                          </span>
                        </button>
                      );
                    })}
                  </div>
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
                      min={MIN_SIZE}
                      max={MAX_SIZE}
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
                      min={MIN_SIZE}
                      max={MAX_SIZE}
                      className="w-full px-3 py-2 bg-raised border border-edge rounded-lg text-ink text-sm focus:outline-none focus:border-accent-light"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                    Aspect ratio
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {RATIO_PRESETS.map((r) => (
                      <button
                        key={r.label}
                        type="button"
                        onClick={() => applyRatio(r.w, r.h)}
                        className="px-2 py-1.5 rounded-lg text-xs font-medium border border-edge bg-raised text-ink-muted hover:text-ink hover:border-edge-strong transition-colors"
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: live preview */}
              <div className="p-6 flex flex-col">
                <label className="block text-xs font-semibold text-ink-secondary mb-2">
                  Preview
                </label>
                <div className="flex-1 min-h-40 bg-canvas border border-edge rounded-lg flex items-center justify-center p-4">
                  <div
                    className="hero-grid-bg border border-accent/40 bg-accent/5 rounded max-w-full max-h-full"
                    style={{
                      aspectRatio: `${clampSize(formData.width)} / ${clampSize(
                        formData.height
                      )}`,
                      width:
                        formData.width >= formData.height ? "100%" : "auto",
                      height:
                        formData.height > formData.width ? "100%" : "auto",
                    }}
                  />
                </div>
                <p className="text-center text-xs text-ink-muted mt-2">
                  {clampSize(formData.width)}×{clampSize(formData.height)} tiles ·{" "}
                  {(
                    clampSize(formData.width) * clampSize(formData.height)
                  ).toLocaleString()}{" "}
                  total
                </p>

                <div className="flex gap-3 mt-auto pt-4">
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vault;
