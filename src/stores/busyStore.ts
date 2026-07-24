import { create } from 'zustand';

// ============================================================================
// BUSY STORE - Global "working" indicator for long-running operations
// ============================================================================

/**
 * Semantic label for the busy overlay. The overlay component maps this to a
 * translated string, so no translation is needed in store/util code.
 */
export type BusyLabelKey = 'generic' | 'fill' | 'undo' | 'redo';

interface BusyState {
  busy: boolean;
  labelKey: BusyLabelKey;

  // Actions
  setBusy: (busy: boolean, labelKey?: BusyLabelKey) => void;
}

export const useBusyStore = create<BusyState>((set) => ({
  busy: false,
  labelKey: 'generic',

  setBusy: (busy, labelKey) =>
    set(() => (labelKey ? { busy, labelKey } : { busy })),
}));
