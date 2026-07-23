import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiX, FiUpload } from 'react-icons/fi';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../hooks/useTranslation';

interface AddPropModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_FORM = {
  name: '',
  group: '',
  groupColor: '#ffffff',
  width: 32,
  height: 32,
};

export const AddPropModal = ({ isOpen, onClose }: AddPropModalProps) => {
  const { t } = useTranslation();
  const map = useMapStore((state) => state.map);
  const addPropDefinition = useMapStore((state) => state.addPropDefinition);

  const [name, setName] = useState(EMPTY_FORM.name);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [group, setGroup] = useState(EMPTY_FORM.group);
  const [groupColor, setGroupColor] = useState(EMPTY_FORM.groupColor);
  const [width, setWidth] = useState(EMPTY_FORM.width);
  const [height, setHeight] = useState(EMPTY_FORM.height);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingTags = Array.from(
    new Set(map?.propDefinitions.flatMap((d) => d.tags) ?? [])
  ).sort();
  const existingGroups = Array.from(
    new Set(map?.propDefinitions.filter((d) => d.group).map((d) => d.group as string) ?? [])
  ).sort();
  const getGroupColor = (groupName: string) =>
    map?.propDefinitions.find((d) => d.group === groupName)?.groupColor ?? '#ffffff';

  // Reset state each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setName(EMPTY_FORM.name);
      setSelectedTags([]);
      setTagInput('');
      setGroup(EMPTY_FORM.group);
      setGroupColor(EMPTY_FORM.groupColor);
      setWidth(EMPTY_FORM.width);
      setHeight(EMPTY_FORM.height);
      setPreviewUrl(null);
      setError(null);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t('addProp.errInvalidImage'));
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // Auto-detect dimensions
      const img = new Image();
      img.onload = () => {
        setWidth(img.naturalWidth);
        setHeight(img.naturalHeight);
      };
      img.src = dataUrl;
      setPreviewUrl(dataUrl);
      // Auto-fill name from filename if empty
      if (!name) {
        const withoutExt = file.name.replace(/\.[^/.]+$/, '');
        setName(withoutExt.replace(/[-_]/g, ' '));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!previewUrl) {
      setError(t('addProp.errImage'));
      return;
    }
    if (!name.trim()) {
      setError(t('addProp.errName'));
      return;
    }
    if (width <= 0 || height <= 0) {
      setError(t('addProp.errSize'));
      return;
    }

    // Include any tag still typed in the input but not yet confirmed
    const pendingTag = tagInput.trim();
    const finalTags = pendingTag && !selectedTags.includes(pendingTag)
      ? [...selectedTags, pendingTag]
      : selectedTags;
    const tagsToSave = finalTags.length > 0 ? finalTags : ['custom'];

    addPropDefinition({
      id: crypto.randomUUID(),
      name: name.trim(),
      category: tagsToSave[0],
      textureUrl: previewUrl,
      width,
      height,
      tags: tagsToSave,
      group: group.trim() || undefined,
      groupColor: group.trim() ? groupColor : undefined,
    });

    onClose();
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
        className="relative w-104 rounded-2xl border border-edge bg-panel p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={t('addProp.title')}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiPlus className="text-prop" size={18} />
            <h2 className="text-base font-semibold text-ink">{t('addProp.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-ink-secondary transition-colors hover:bg-raised hover:text-ink"
            aria-label={t('common.close')}
          >
            <FiX size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-ink-muted">
              {t('addProp.image')}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex items-center gap-3">
              {/* Preview box */}
              <div
                className="h-16 w-16 shrink-0 rounded-lg border-2 border-dashed border-edge bg-canvas flex items-center justify-center overflow-hidden cursor-pointer hover:border-prop transition-colors"
                onClick={() => fileInputRef.current?.click()}
                title={t('addProp.clickToUpload')}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="h-full w-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <FiUpload size={20} className="text-ink-muted" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 rounded-lg border border-edge bg-raised px-3 py-2 text-sm text-ink-secondary hover:bg-overlay hover:text-ink transition-colors text-left"
              >
                {previewUrl ? t('addProp.changeImage') : t('addProp.chooseImage')}
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
              {t('addProp.name')} <span className="text-err normal-case">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('addProp.namePlaceholder')}
              className="w-full rounded-lg border border-edge bg-raised px-3 py-2 text-sm text-ink placeholder-ink-muted focus:border-prop focus:outline-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
              {t('addProp.tags')}
            </label>
            {/* Selected tag chips */}
            {selectedTags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-prop/30 bg-prop/10 px-2 py-0.5 text-xs text-prop"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setSelectedTags((prev) => prev.filter((t) => t !== tag))}
                      className="text-prop/60 hover:text-prop transition-colors"
                      aria-label={t('addProp.removeTag', { tag })}
                    >
                      <FiX size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Custom tag input */}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                  e.preventDefault();
                  const newTag = tagInput.trim().replace(/,$/, '');
                  if (newTag && !selectedTags.includes(newTag)) {
                    setSelectedTags((prev) => [...prev, newTag]);
                  }
                  setTagInput('');
                }
              }}
              placeholder={t('addProp.tagPlaceholder')}
              className="w-full rounded-lg border border-edge bg-raised px-3 py-2 text-sm text-ink placeholder-ink-muted focus:border-prop focus:outline-none"
            />
            {/* Existing tag suggestions */}
            {existingTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {existingTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (!selectedTags.includes(tag)) {
                        setSelectedTags((prev) => [...prev, tag]);
                      }
                    }}
                    className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                      selectedTags.includes(tag)
                        ? 'border-prop/40 bg-prop/10 text-prop cursor-default'
                        : 'border-edge bg-raised text-ink-muted hover:border-prop/40 hover:text-ink cursor-pointer'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Width & Height */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                {t('addProp.widthPx')}
              </label>
              <input
                type="number"
                min={1}
                value={width}
                onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-edge bg-raised px-3 py-2 text-sm text-ink focus:border-prop focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                {t('addProp.heightPx')}
              </label>
              <input
                type="number"
                min={1}
                value={height}
                onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-edge bg-raised px-3 py-2 text-sm text-ink focus:border-prop focus:outline-none"
              />
            </div>
          </div>

          {/* Group */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
              {t('addProp.group')}
              <span className="ml-1 font-normal normal-case tracking-normal text-ink-muted">
                {t('addProp.optional')}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder={t('addProp.groupPlaceholder')}
                className="flex-1 rounded-lg border border-edge bg-raised px-3 py-2 text-sm text-ink placeholder-ink-muted focus:border-prop focus:outline-none"
              />
              {group.trim() && (
                <div className="relative h-9 w-9 shrink-0">
                  <input
                    type="color"
                    value={groupColor}
                    onChange={(e) => setGroupColor(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer rounded-lg border border-edge opacity-0"
                    title={t('addProp.groupColor')}
                  />
                  <div
                    className="h-full w-full rounded-lg border border-edge cursor-pointer"
                    style={{ background: groupColor }}
                    title={t('addProp.groupColor')}
                  />
                </div>
              )}
            </div>
            {/* Existing group suggestions */}
            {existingGroups.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {existingGroups.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setGroup(g);
                      setGroupColor(getGroupColor(g));
                    }}
                    className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                      group === g
                        ? 'border-prop/50 bg-prop/10 text-prop'
                        : 'border-edge bg-raised text-ink-muted hover:border-edge-strong hover:text-ink'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-err/10 border border-err/30 px-3 py-2 text-xs text-err">
              {error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-raised hover:text-ink transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 rounded-lg bg-prop px-4 py-2 text-sm font-medium text-white hover:bg-prop/80 transition-colors disabled:opacity-50"
            disabled={!previewUrl || !name.trim()}
          >
            <FiPlus size={14} />
            {t('addProp.title')}
          </button>
        </div>
      </div>
    </div>
  );
};
