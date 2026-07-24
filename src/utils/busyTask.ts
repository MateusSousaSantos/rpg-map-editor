import { useBusyStore, type BusyLabelKey } from '../stores/busyStore';

export type { BusyLabelKey } from '../stores/busyStore';

/**
 * Number of affected tiles at or above which an operation is treated as "heavy"
 * and routed through {@link runHeavyTask} so the busy overlay is shown. Below
 * this, operations run inline (no spinner flash for small edits).
 */
export const BUSY_TILE_THRESHOLD = 200;

/**
 * Run a synchronous, main-thread-blocking task while showing the busy overlay.
 *
 * The overlay must actually paint *before* the blocking `work` runs, otherwise
 * the browser never renders it. We flip `busy` on, yield two animation frames
 * (one to commit the React update, one to let the browser paint), then run the
 * work and clear `busy` in a `finally` so it always resets.
 *
 * If a heavy task is already in progress this is a no-op, which also prevents a
 * second undo/fill firing on top of an in-flight one.
 */
export function runHeavyTask(labelKey: BusyLabelKey, work: () => void): void {
  const store = useBusyStore.getState();
  if (store.busy) return;

  store.setBusy(true, labelKey);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        work();
      } finally {
        useBusyStore.getState().setBusy(false);
      }
    });
  });
}

/**
 * Run a tile commit, routing it through the busy overlay only when the number
 * of affected tiles is large enough to visibly block the main thread. Small
 * commits run inline so quick edits stay instant.
 */
export function runTileCommit(
  labelKey: BusyLabelKey,
  affectedTiles: number,
  commit: () => void,
): void {
  if (affectedTiles >= BUSY_TILE_THRESHOLD) runHeavyTask(labelKey, commit);
  else commit();
}
