import { Layer, Rect, Line } from 'react-konva';

interface GridLayerProps {
  width: number;
  height: number;
  tileSize: number;
  showGrid?: boolean;
}

/**
 * GridLayer - Renders the grid overlay on top of all other layers
 * Shows grid lines to help with tile placement
 */
export const GridLayer = ({ 
  width, 
  height, 
  tileSize,
  showGrid = true 
}: GridLayerProps) => {
  const pixelWidth = width * tileSize;
  const pixelHeight = height * tileSize;

  // Don't render if grid is hidden
  if (!showGrid) return null;

  // Generate grid lines
  const gridLines = [];
  
  // Vertical lines
  for (let x = 0; x <= width; x++) {
    gridLines.push(
      <Line
        key={`v-${x}`}
        points={[x * tileSize, 0, x * tileSize, pixelHeight]}
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth={1}
        listening={false}
        hitStrokeWidth={0}
      />
    );
  }
  
  // Horizontal lines
  for (let y = 0; y <= height; y++) {
    gridLines.push(
      <Line
        key={`h-${y}`}
        points={[0, y * tileSize, pixelWidth, y * tileSize]}
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth={1}
        listening={false}
        hitStrokeWidth={0}
      />
    );
  }

  return (
    <Layer listening={false}>
      {/* Grid lines */}
      {gridLines}
      
      {/* Border */}
      <Rect
        x={0}
        y={0}
        width={pixelWidth}
        height={pixelHeight}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={2}
        listening={false}
        hitStrokeWidth={0}
      />
    </Layer>
  );
};
