import { useState, useEffect, useRef } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import { useMapStore } from '../../stores/mapStore';
import { useUISelectionStore } from '../../stores/uiSelectionStore';
import { useTranslation } from '../../hooks/useTranslation';
import { exportMap, composeMapCanvas } from '../../utils/exportMap';

/** Longest edge (px) the in-modal preview renders at — big enough to look crisp
 *  in the enlarged preview pane, still small enough that the lighting bake is cheap. */
const PREVIEW_MAX_EDGE = 512;

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Format = 'png' | 'jpeg';
const SCALE_PRESETS = [1, 2, 4] as const;

export const ExportModal = ({ isOpen, onClose }: ExportModalProps) => {
  const { map } = useMapStore();
  const { showGrid } = useUISelectionStore();
  const { t } = useTranslation();

  const [format, setFormat] = useState<Format>('png');
  const [scale, setScale] = useState<number>(2);
  const [scaleInput, setScaleInput] = useState<string>('2');
  const [bakeLighting, setBakeLighting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const previewRef = useRef<HTMLCanvasElement>(null);
  const lightingEnabled = !!map?.lighting?.enabled;

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
      setBakeLighting(true);
      setLoading(false);
      setError(null);
    }
  }, [isOpen]);

  // Render the preview through the SAME compositor the file export uses, so the
  // preview is exactly what gets saved (format bg, grid, baked lighting). Scale
  // doesn't change appearance, only resolution, so the preview renders at a small
  // fixed size and is not keyed on `scale`. Latest render wins (drop stale ones).
  useEffect(() => {
    if (!isOpen || !map) return;
    let cancelled = false;
    const mapPxW = map.width * map.tileSize;
    const mapPxH = map.height * map.tileSize;
    const previewScale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(mapPxW, mapPxH));

    setPreviewLoading(true);
    (async () => {
      try {
        const composed = await composeMapCanvas(
          map,
          format,
          previewScale,
          showGrid,
          lightingEnabled && bakeLighting,
        );
        if (cancelled) return;
        const dest = previewRef.current;
        if (!dest) return;
        dest.width = composed.width;
        dest.height = composed.height;
        dest.getContext('2d')?.drawImage(composed, 0, 0);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, map, format, showGrid, bakeLighting, lightingEnabled]);

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
      await exportMap(format, scale, showGrid, lightingEnabled && bakeLighting);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('export.failed'));
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
        className="relative w-[760px] max-w-[calc(100vw-2rem)] rounded-2xl border border-edge bg-panel p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={t('export.title')}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiDownload className="text-ok" size={18} />
            <h2 className="text-base font-semibold text-ink">{t('export.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-ink-secondary transition-colors hover:bg-raised hover:text-ink"
            aria-label={t('common.close')}
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Two-column body: options on the left, large preview on the right. */}
        <div className="flex gap-6">
        {/* ── Left column: options ─────────────────────────────────────────── */}
        <div className="flex w-[280px] shrink-0 flex-col">

        {/* Format */}
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-ink-muted">
            {t('export.format')}
          </p>
          <div className="flex gap-2">
            {(['png', 'jpeg'] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  format === f
                    ? 'bg-ok text-white'
                    : 'bg-raised text-ink-secondary hover:bg-overlay hover:text-ink'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-ink-muted">
            {t('export.scale')}
          </p>
          <div className="flex items-center gap-2">
            {/* Preset buttons */}
            {SCALE_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setScale(p)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  scale === p
                    ? 'bg-overlay text-ink'
                    : 'bg-raised text-ink-secondary hover:bg-overlay hover:text-ink'
                }`}
              >
                {p}×
              </button>
            ))}

            {/* Divider */}
            <div className="h-5 w-px bg-edge" />

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
                className="w-16 rounded-lg border border-edge bg-raised px-2 py-2 text-center text-sm text-ink focus:border-accent-light focus:outline-none"
              />
              <span className="text-sm text-ink-secondary">×</span>
            </div>
          </div>
        </div>

        {/* Bake lighting (only when the map has dynamic lighting enabled) */}
        {lightingEnabled && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setBakeLighting((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-edge bg-raised/50 px-4 py-3 text-left transition-colors hover:bg-raised"
            >
              <span>
                <span className="block text-sm font-medium text-ink">
                  {t('export.bakeLighting')}
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  {t('export.bakeLightingHint')}
                </span>
              </span>
              <span
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  bakeLighting ? 'bg-ok' : 'bg-overlay'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    bakeLighting ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </button>
          </div>
        )}

        {/* Output size preview */}
        <div className="mb-5 rounded-lg border border-edge bg-raised/50 px-4 py-3">
          <p className="text-xs text-ink-muted">{t('export.outputSize')}</p>
          <p className="mt-0.5 font-mono text-sm text-ink">
            {outputWidth} × {outputHeight} px
          </p>
          {showGrid && (
            <p className="mt-1 text-xs text-ink-muted">
              {t('export.gridIncluded')}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-raised hover:text-ink disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ok px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ok/80 disabled:cursor-not-allowed disabled:opacity-60"
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
                {t('export.exporting')}
              </>
            ) : (
              <>
                <FiDownload size={14} />
                {t('export.export')}
              </>
            )}
          </button>
        </div>

        </div>
        {/* ── Right column: large preview ──────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-ink-muted">
            {t('export.preview')}
          </p>
          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-edge"
            style={{
              // Checkerboard so PNG transparency reads clearly behind the preview.
              backgroundImage:
                'linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              backgroundColor: '#1e1e1e',
            }}
          >
            <canvas
              ref={previewRef}
              className="max-h-full max-w-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
            {previewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16 8 8 0 01-8-8z" />
                </svg>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
