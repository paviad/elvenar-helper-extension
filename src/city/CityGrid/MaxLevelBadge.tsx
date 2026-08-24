import React from 'react';

/** Screen-pixel footprint of the badge; callers use it to place the corner. */
export const MAX_LEVEL_BADGE_PX = 14;

/** Blocks with a side at or under this many screen pixels skip the badge - it would dominate them. */
export const MIN_BADGE_SIDE_PX = 20;

/**
 * The green "maxed for the chapter" tick. Drawn in a MAX_LEVEL_BADGE_PX box from
 * (0,0) in screen pixels - the badge is UI chrome and keeps its size across zoom, so
 * it lives outside the scaled label group and the caller translates it into place.
 */
export const MaxLevelBadge: React.FC = () => (
  <g pointerEvents='none'>
    <circle cx='7' cy='7' r='6' fill='#4caf50' stroke='#fff' strokeWidth='1' />
    <path d='M4 7 l2 2 4 -4' stroke='#fff' strokeWidth='1.5' fill='none' strokeLinecap='round' strokeLinejoin='round' />
  </g>
);
