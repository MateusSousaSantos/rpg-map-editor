import { useMemo, useEffect, useRef, memo } from 'react';
import { Layer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';

interface GridLayerProps {
  width: number;
  height: number;
  tileSize: number;
  showGrid?: boolean;
}

/**
 * GridLayer - Renders the grid overlay using a single off-screen canvas
 * instead of O(W+H) individual Konva Line nodes.
 */
export const GridLayer = memo(({ 
  width, 
  height, 
  tileSize,
  showGrid = true 
}: GridLayerProps) => {
  const imageRef = useRef<Konva.Image>(null);
  const pixelWidth = width * tileSize;
  const pixelHeight = height * tileSize;

  // Create a stable canvas that is redrawn when dimensions change
  const canvas = useMemo(() => {
    if (!showGrid) return null;

    const c = document.createElement('canvas');
    c.width = pixelWidth;
    c.height = pixelHeight;

    const ctx = c.getContext('2d');
    if (!ctx) return c;

    // Draw all grid lines in a single path
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x++) {
      const px = x * tileSize;
      ctx.moveTo(px + 0.5, 0);
      ctx.lineTo(px + 0.5, pixelHeight);
    }

    for (let y = 0; y <= height; y++) {
      const py = y * tileSize;
      ctx.moveTo(0, py + 0.5);
      ctx.lineTo(pixelWidth, py + 0.5);
    }

    ctx.stroke();

    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, pixelWidth, pixelHeight);

    return c;
  }, [width, height, tileSize, showGrid, pixelWidth, pixelHeight]);

  // Force Konva to paint after the canvas is created or changes
  useEffect(() => {
    if (canvas && imageRef.current) {
      imageRef.current.image(canvas);
      imageRef.current.getLayer()?.batchDraw();
    }
  }, [canvas]);

  if (!showGrid || !canvas) return null;

  return (
    <Layer listening={false}>
      <KonvaImage
        ref={imageRef}
        image={canvas}
        x={0}
        y={0}
        listening={false}
        perfectDrawEnabled={false}
      />
    </Layer>
  );
});
