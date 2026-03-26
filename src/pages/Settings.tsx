import { useState } from "react";
import { Navbar } from "../components/Layout/Navbar";

type SettingsTab = "general" | "appearance" | "shortcuts" | "language";

const SHORTCUTS = [
  {
    category: "Tools",
    items: [
      { key: "B", action: "Brush tool" },
      { key: "E", action: "Eraser tool" },
      { key: "X", action: "Box paint tool" },
      { key: "Escape", action: "Deselect / cancel" },
    ],
  },
  {
    category: "Canvas",
    items: [
      { key: "Scroll", action: "Zoom in / out" },
      { key: "+ / −", action: "Zoom in / out" },
      { key: "Space + Drag", action: "Pan canvas" },
      { key: "G", action: "Toggle grid" },
      { key: "Ctrl+Z", action: "Undo (coming soon)" },
      { key: "Ctrl+Y", action: "Redo (coming soon)" },
    ],
  },
  {
    category: "Layers",
    items: [
      { key: "Click", action: "Select layer" },
      { key: "Double-click name", action: "Rename layer" },
      { key: "Drag grip", action: "Reorder layers" },
    ],
  },
  {
    category: "Props",
    items: [
      { key: "Drag from panel", action: "Place prop on canvas" },
      { key: "Click prop", action: "Select prop" },
    ],
  },
];

const TABS: { key: SettingsTab; label: string }[] = [
  { key: "general", label: "General" },
  { key: "appearance", label: "Appearance" },
  { key: "shortcuts", label: "Shortcuts" },
  { key: "language", label: "Language" },
];

function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  // Local-only state (no persistence wiring yet)
  const [general, setGeneral] = useState({
    defaultWidth: 32,
    defaultHeight: 32,
    defaultTileSize: 16,
    showGrid: true,
    confirmDelete: true,
  });
  const [appearance, setAppearance] = useState({
    gridOpacity: 0.5,
  });

  return (
    <div className="min-h-screen flex flex-col bg-canvas selectable">
      <Navbar />

      {/* Page header */}
      <div className="border-b border-edge bg-panel px-6 py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-ink">Settings</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Customize your editor experience
          </p>
        </div>
      </div>

      <main className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-edge mb-8">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === key
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-muted hover:text-ink-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── General ── */}
        {activeTab === "general" && (
          <div className="space-y-5">
            <div className="bg-panel border border-edge rounded-xl p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">
                Default Map Settings
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                    Width (tiles)
                  </label>
                  <input
                    type="number"
                    value={general.defaultWidth}
                    onChange={(e) =>
                      setGeneral((p) => ({
                        ...p,
                        defaultWidth: parseInt(e.target.value) || 32,
                      }))
                    }
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
                    value={general.defaultHeight}
                    onChange={(e) =>
                      setGeneral((p) => ({
                        ...p,
                        defaultHeight: parseInt(e.target.value) || 32,
                      }))
                    }
                    min="1"
                    max="256"
                    className="w-full px-3 py-2 bg-raised border border-edge rounded-lg text-ink text-sm focus:outline-none focus:border-accent-light"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                    Tile Size (px)
                  </label>
                  <select
                    value={general.defaultTileSize}
                    onChange={(e) =>
                      setGeneral((p) => ({
                        ...p,
                        defaultTileSize: parseInt(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 bg-raised border border-edge rounded-lg text-ink text-sm focus:outline-none focus:border-accent-light"
                  >
                    <option value={8}>8 px</option>
                    <option value={16}>16 px</option>
                    <option value={32}>32 px</option>
                    <option value={64}>64 px</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-panel border border-edge rounded-xl p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">
                Editor Behavior
              </h3>
              <div className="space-y-4">
                {/* Show grid toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-ink">Show grid by default</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Grid is visible when opening a map
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setGeneral((p) => ({ ...p, showGrid: !p.showGrid }))
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                      general.showGrid ? "bg-accent" : "bg-edge-strong"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        general.showGrid ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Confirm delete toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-ink">Confirm before deleting</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Show a confirmation dialog on destructive actions
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setGeneral((p) => ({
                        ...p,
                        confirmDelete: !p.confirmDelete,
                      }))
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                      general.confirmDelete ? "bg-accent" : "bg-edge-strong"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        general.confirmDelete
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Appearance ── */}
        {activeTab === "appearance" && (
          <div className="space-y-5">
            <div className="bg-panel border border-edge rounded-xl p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Grid</h3>
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                  Grid Opacity: {Math.round(appearance.gridOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={appearance.gridOpacity}
                  onChange={(e) =>
                    setAppearance((p) => ({
                      ...p,
                      gridOpacity: parseFloat(e.target.value),
                    }))
                  }
                  className="opacity-slider w-full"
                />
              </div>
            </div>

            <div className="bg-panel border border-edge rounded-xl p-5">
              <p className="text-sm text-ink-muted">
                More appearance options coming soon.
              </p>
            </div>
          </div>
        )}

        {/* ── Shortcuts ── */}
        {activeTab === "shortcuts" && (
          <div className="space-y-4">
            {SHORTCUTS.map(({ category, items }) => (
              <div
                key={category}
                className="bg-panel border border-edge rounded-xl overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-edge">
                  <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    {category}
                  </h3>
                </div>
                <div className="divide-y divide-edge">
                  {items.map(({ key, action }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <span className="text-sm text-ink">{action}</span>
                      <kbd className="px-2 py-0.5 bg-raised border border-edge rounded text-xs text-ink-secondary font-mono">
                        {key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Language ── */}
        {activeTab === "language" && (
          <div className="bg-panel border border-edge rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-edge">
              <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                Display Language
              </h3>
            </div>

            {/* English — active */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-edge">
              <div className="flex items-center gap-3">
                <span className="text-xl select-none">🇺🇸</span>
                <div>
                  <p className="text-sm font-medium text-ink">English</p>
                  <p className="text-xs text-ink-muted">Active language</p>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-ok shrink-0" />
            </div>

            {/* Portuguese — coming soon */}
            <div className="flex items-center justify-between px-4 py-4 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <span className="text-xl select-none">🇧🇷</span>
                <div>
                  <p className="text-sm font-medium text-ink">
                    Português (Brasil)
                  </p>
                  <p className="text-xs text-ink-muted">Coming soon</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-edge text-ink-muted text-xs shrink-0">
                Soon
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Settings;
