/**
 * devStats.ts — dev-only counters/timers for the lighting pipeline.
 *
 * Lets a before/after comparison (see lightingStressTest.ts) be read back from
 * the browser console instead of eyeballing the Performance tab: how many full
 * bakes vs cheap relights ran, and how long each stage took. Every call is a
 * no-op in production — `import.meta.env.DEV` is inlined by Vite, so this
 * whole module (and the `window.__lightingStats` wiring) is dead-code-eliminated
 * from the prod bundle.
 */

interface StageStats {
  count: number;
  totalMs: number;
  lastMs: number;
  maxMs: number;
}

const emptyStage = (): StageStats => ({ count: 0, totalMs: 0, lastMs: 0, maxMs: 0 });

const stats = {
  bake: emptyStage(), // full buildLightingBuffers + relight
  buildBuffers: emptyStage(), // buildLightingBuffers alone (the full-map repaint)
  relight: emptyStage(), // renderLighting alone (upload + shader, or shader-only)
};

function record(stage: StageStats, ms: number): void {
  stage.count += 1;
  stage.totalMs += ms;
  stage.lastMs = ms;
  stage.maxMs = Math.max(stage.maxMs, ms);
}

/** Time a stage and record it. No-op wrapper (just runs `fn`) outside DEV. */
export function timeStage<T>(name: keyof typeof stats, fn: () => T): T {
  if (!import.meta.env.DEV) return fn();
  const start = performance.now();
  const result = fn();
  record(stats[name], performance.now() - start);
  return result;
}

function summarize() {
  const row = (s: StageStats) => ({
    count: s.count,
    avgMs: s.count ? Number((s.totalMs / s.count).toFixed(2)) : 0,
    lastMs: Number(s.lastMs.toFixed(2)),
    maxMs: Number(s.maxMs.toFixed(2)),
  });
  return {
    bake: row(stats.bake),
    buildBuffers: row(stats.buildBuffers),
    relight: row(stats.relight),
  };
}

function reset(): void {
  stats.bake = emptyStage();
  stats.buildBuffers = emptyStage();
  stats.relight = emptyStage();
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __lightingStats: () => void }).__lightingStats = () => {
    console.table(summarize());
  };
  (window as unknown as { __lightingStatsReset: () => void }).__lightingStatsReset = () => {
    reset();
    console.log('[lighting] stats reset');
  };
}
