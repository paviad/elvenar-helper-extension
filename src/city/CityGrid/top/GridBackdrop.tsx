import React from 'react';
import { UnlockedArea } from '../../../model/unlockedArea';
import { GridMax } from '../../gridConstants';

interface GridBackdropProps {
  /** Pixels per tile at the zoom being drawn. */
  gridSizePx: number;
  unlockedAreas: UnlockedArea[];
}

/**
 * The ground the top-down view is drawn on: the playable grid, the unlocked areas
 * lightened over it, and the tile lines, with every fifth - an expansion's edge -
 * drawn heavier. Shared by the live grid and the screenshot, so both stand on the
 * same ground.
 */
export const GridBackdrop: React.FC<GridBackdropProps> = ({ gridSizePx, unlockedAreas }) => {
  const gridDimension = gridSizePx * GridMax;
  return (
    <>
      <rect x={0} y={0} width={gridDimension} height={gridDimension} fill='#145214' />

      {unlockedAreas.map((area, idx) => (
        <rect
          key={`unlocked-${idx}`}
          x={area.x * gridSizePx}
          y={area.y * gridSizePx}
          width={area.width * gridSizePx}
          height={area.length * gridSizePx}
          fill='rgba(255, 255, 255, 0.3)'
          stroke='green'
          strokeWidth={1}
          pointerEvents='none'
        />
      ))}

      {Array.from({ length: GridMax + 1 }).map((_, i) => (
        <g key={'grid-' + i} style={{ pointerEvents: 'none', opacity: 0.2 }}>
          <line
            x1='0'
            y1={i * gridSizePx}
            x2={gridDimension}
            y2={i * gridSizePx}
            stroke='white'
            strokeWidth={i % 5 === 0 ? 2 : 1}
          />
          <line
            x1={i * gridSizePx}
            y1='0'
            x2={i * gridSizePx}
            y2={gridDimension}
            stroke='white'
            strokeWidth={i % 5 === 0 ? 2 : 1}
          />
        </g>
      ))}
    </>
  );
};
