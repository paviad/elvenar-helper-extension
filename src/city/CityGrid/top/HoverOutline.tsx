import React from 'react';
import { useCity } from '../../CityContext';
import { GridSize } from '../../gridConstants';
import { useHoveredBlockStore } from '../../hoveredBlockStore';

/**
 * The outline around the building under the cursor, drawn after every block rather
 * than inside the hovered block's own group: blocks later in the list paint over the
 * edges of the ones before them, which left the outline half covered by its neighbours.
 */
export const HoverOutline: React.FC<{ zoom: number }> = ({ zoom }) => {
  const hoveredId = useHoveredBlockStore((state) => state.hoveredId);
  const { blocks } = useCity();

  if (hoveredId === null) return null;

  const block = blocks[hoveredId];
  if (!block) return null;

  const sGridSize = GridSize * zoom;

  return (
    <rect
      x={block.x * sGridSize}
      y={block.y * sGridSize}
      width={block.width * sGridSize}
      height={block.length * sGridSize}
      fill='none'
      stroke='#fff'
      strokeWidth={2.5}
      pointerEvents='none'
    />
  );
};
