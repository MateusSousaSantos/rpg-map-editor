import { useState, useEffect, useRef } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import { useMapStore } from '../../stores/mapStore';
import { useUISelectionStore } from '../../stores/uiSelectionStore';
import { exportMap } from '../../utils/exportMap';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Format = 'png' | 'jpeg';
const SCALE_PRESETS = [1, 2, 4] as const;

export const ExportModal = ({ isOpen, onClose }: ExportModalProps) => {
  const { map } = useMapStore();
  const { showGrid } = useUISelectionStore();

  const [format, setFormat] = useState<Format>('png');
  const [scale, setScale] = useState<number>(2);
  const [scaleInput, setScaleInput] = useState<string>('2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep text input in sync when scale changes via presets
  useEffect(() => {
    setScaleInput(String(scale));
  }, [scale]);

  // Reset state each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setFormat('png');
      setScale(2);
      setScaleInput('2');
      setLoading(false);
      setError(null);
    }
  }, [isOpen]);

  // Close on Escape
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !map) return null;

  const clampScale = (v: number) => Math.min(16, Math.max(1, v));

  const handleScaleInput = (raw: string) => {
    setScaleInput(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      setScale(clampScale(parsed));
    }
  };

  const handleScaleBlur = () => {
    const clamped = clampScale(scale);
    setScale(clamped);
    setScaleInput(String(clamped));
  };

  const outputWidth = Math.round(map.width * map.tileSize * scale);
  const outputHeight = Math.round(map.height * map.tileSize * scale);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      await exportMap(format, scale, showGrid);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Card */}
      <div
        ref={modalRef}
        className="relative w-96 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Export Map"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiDownload className="text-emerald-400" size={18} />
            <h2 className="text-base font-semibold text-slate-100">Export Map</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Format */}
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
            Format
          </p>
          <div className="flex gap-2">
            {(['png', 'jpeg'] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  format === f
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
            Scale
          </p>
          <div className="flex items-center gap-2">
            {/* Preset buttons */}
            {SCALE_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setScale(p)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  scale === p
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
                }`}
              >
                {p}×
              </button>
            ))}

            {/* Divider */}
            <div className="h-5 w-px bg-slate-700" />

            {/* Free input */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={16}
                step={0.5}
                value={scaleInput}
                onChange={(e) => handleScaleInput(e.target.value)}
                onBlur={handleScaleBlur}
                className="w-16 rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-center text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-400">×</span>
            </div>
          </div>
        </div>

        {/* Output size preview */}
        <div className="mb-5 rounded-lg border border-slate-800 bg-slate-800/50 px-4 py-3">
          <p className="text-xs text-slate-500">Output size</p>
          <p className="mt-0.5 font-mono text-sm text-slate-200">
            {outputWidth} × {outputHeight} px
          </p>
          {showGrid && (
            <p className="mt-1 text-xs text-slate-500">
              Grid lines will be included
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="mb-4 rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16 8 8 0 01-8-8z"
                  />
                </svg>
                Exporting…
              </>
            ) : (
              <>
                <FiDownload size={14} />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
