// ============================================================================
// useRecoloredImage — React hook for palette-swapped prop images
// ============================================================================

import { useEffect, useState } from 'react';
import { useTextureCache } from '../stores/textureCache';
import { paletteSwapCanvas } from '../utils/recolor';
import { getCacheKey, getRecoloredCanvas, setRecoloredCanvas } from '../stores/recolorCache';
import type { PropColorSlot } from '../types/map';

/**
 * Returns a palette-swapped HTMLCanvasElement for a prop, or null when:
 * - colorSlots is empty / undefined (no slots defined)
 * - slotHues is empty / undefined (user hasn't picked any hue yet)
 * - the source texture hasn't loaded yet
 *
 * Falls back to null so callers can render the plain HTMLImageElement instead.
 */
export function usePaletteSwappedImage(
  textureUrl: string,
  colorSlots: PropColorSlot[] | undefined,
  slotHues: Record<string, number> | undefined,
): HTMLCanvasElement | null {
  const { getTexture, loadTexture } = useTextureCache();
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // No-op when recoloring is not applicable
    if (!colorSlots || colorSlots.length === 0 || !slotHues || Object.keys(slotHues).length === 0) {
      setCanvas(null);
      return;
    }

    const cacheKey = getCacheKey(textureUrl, slotHues);
    const cached = getRecoloredCanvas(cacheKey);
    if (cached) {
      setCanvas(cached);
      return;
    }

    const existing = getTexture(textureUrl);
    if (existing) {
      const result = paletteSwapCanvas(existing, { slots: colorSlots, hues: slotHues });
      setRecoloredCanvas(cacheKey, result);
      setCanvas(result);
      return;
    }

    loadTexture(textureUrl)
      .then((img) => {
        const result = paletteSwapCanvas(img, { slots: colorSlots, hues: slotHues });
        setRecoloredCanvas(cacheKey, result);
        setCanvas(result);
      })
      .catch(() => {
        setCanvas(null);
      });
  }, [textureUrl, colorSlots, slotHues, getTexture, loadTexture]);

  return canvas;
}
