import React from 'react';
import { LABEL_UNITS_PER_TILE } from './labelLayout';

interface WarningBadgeProps {
  widthTiles: number;
  lengthTiles: number;
}

/**
 * The translucent "not for this chapter" disc, filling the block's smaller dimension.
 * Drawn about (0,0) in label units, inside the same scaled group as the label, so it
 * grows and shrinks with the block in both views.
 */
export const WarningBadge: React.FC<WarningBadgeProps> = ({ widthTiles, lengthTiles }) => {
  const size = Math.min(widthTiles, lengthTiles) * LABEL_UNITS_PER_TILE;
  return (
    <svg
      x={-size / 2}
      y={-size / 2}
      width={size}
      height={size}
      viewBox='0 0 24 24'
      style={{ overflow: 'visible', opacity: 0.6 }}
    >
      <circle cx='12' cy='12' r='10' fill='#d32f2f' stroke='white' strokeWidth='2' />
      <rect x='5' y='10' width='14' height='4' fill='white' rx='1' />
    </svg>
  );
};
