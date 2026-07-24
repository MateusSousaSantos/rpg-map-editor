import { useEffect, useRef, useState } from "react";
import { FiEdit2 } from "react-icons/fi";
import { useMapStore } from "../stores/mapStore";
import { useTranslation } from "../hooks/useTranslation";

/**
 * The current map's name in the editor sub-bar. Hovering reveals a pencil
 * affordance (with a "Rename map" tooltip); clicking turns the name into an
 * inline text field. Enter/blur commits, Escape cancels. Mirrors the layer
 * rename interaction in LayersSection.
 */
export const MapNameEditor = () => {
  const map = useMapStore((s) => s.map);
  const updateMapMetadata = useMapStore((s) => s.updateMapMetadata);
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select the text when entering edit mode
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  if (!map) return null;

  const startEditing = () => {
    setDraft(map.name);
    setIsEditing(true);
  };

  const commit = () => {
    const next = draft.trim();
    if (next && next !== map.name) {
      updateMapMetadata({ name: next });
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") setIsEditing(false);
        }}
        className="w-40 min-w-0 rounded border border-accent-light bg-canvas px-1.5 py-0.5 text-xs font-semibold text-ink focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={startEditing}
      title={t("editor.renameMap")}
      className="group -mx-1 flex items-center rounded px-1 py-0.5 transition-colors hover:bg-raised"
    >
      <span className="text-xs font-semibold text-ink">{map.name}</span>
      <FiEdit2
        size={11}
        className="w-0 shrink-0 overflow-hidden text-ink-muted opacity-0 transition-all group-hover:ml-1.5 group-hover:w-[11px] group-hover:opacity-100"
      />
    </button>
  );
};
