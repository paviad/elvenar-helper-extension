import React from 'react';
import { useCity } from '../../CityContext';
import { GridMax, GridSize, PaddingTiles } from '../../gridConstants';
import { useHoveredBlockStore } from '../../hoveredBlockStore';
import { createIsoProjection } from './isoProjection';

/** The isometric counterpart of HoverOutline, drawn after every block for the same reason. */
export const IsoHoverOutline: React.FC<{ zoom: number }> = ({ zoom }) => {
  const hoveredId = useHoveredBlockStore((state) => state.hoveredId);
  const { blocks, dragIndex } = useCity();

  // See HoverOutline: nothing wears a hover ring while it is being carried.
  if (hoveredId === null || dragIndex !== null) return null;

  const block = blocks[hoveredId];
  if (!block) return null;

  const { toIso } = createIsoProjection({ GridSize, GridMax, PaddingTiles, zoom });
  const p1 = toIso(block.x, block.y);
  const p2 = toIso(block.x + block.width, block.y);
  const p3 = toIso(block.x + block.width, block.y + block.length);
  const p4 = toIso(block.x, block.y + block.length);

  return (
    <path
      d={`M${p1.x},${p1.y} L${p2.x},${p2.y} L${p3.x},${p3.y} L${p4.x},${p4.y} Z`}
      fill='none'
      stroke='#fff'
      strokeWidth={2.5}
      pointerEvents='none'
    />
  );
};
