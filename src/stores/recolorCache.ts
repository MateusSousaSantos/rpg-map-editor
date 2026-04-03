// ============================================================================
// RECOLOR CACHE — Module-level canvas cache keyed by (path + config)
//
// Plain Map — not Zustand. useNativeCanvasTiles drives its own redraw trigger;
// no reactive store is needed here.
// ============================================================================

const cache = new Map<string, HTMLCanvasElement>();

/**
 * Build a stable string key from a path and a serialisable config object.
 */
export function getCacheKey(path: string, config: object): string {
  return `${path}::${JSON.stringify(config)}`;
}

export function getRecoloredCanvas(key: string): HTMLCanvasElement | undefined {
  return cache.get(key);
}

/**
 * Store a recolored canvas. Evicts the oldest 100 entries once the cache
 * exceeds 500 entries to cap memory usage.
 */
export function setRecoloredCanvas(key: string, canvas: HTMLCanvasElement): void {
  if (cache.size >= 500) {
    const keys = [...cache.keys()].slice(0, 100);
    keys.forEach((k) => cache.delete(k));
  }
  cache.set(key, canvas);
}

export function clearRecolorCache(): void {
  cache.clear();
}
