import React from 'react';
import { useCity } from '../../CityContext';
import { blockRect } from './blockRect';
import { handleMouseMove } from './handleMouseMove';
import { handleMouseUp } from './handleMouseUp';

export function CityGrid() {
  const city = useCity();
  const { GridSize, GridMax, dragIndex, blocks } = city;

  return (
    <svg
      ref={city.svgRef}
      width={GridSize * GridMax}
      height={GridSize * GridMax}
      style={{
        border: '1px solid black',
        cursor: dragIndex !== null ? 'grabbing' : 'default',
        userSelect: 'none',
      }}
      onMouseMove={(e) => handleMouseMove(city, e)}
      onClick={() => handleMouseUp(city)}
    >
      <rect x={0} y={0} width={GridSize * GridMax} height={GridSize * GridMax} fill='#145214' />

      {city.unlockedAreas.map((area, idx) => (
        <rect
          key={`unlocked-${idx}`}
          x={area.x * GridSize}
          y={area.y * GridSize}
          width={area.width * GridSize}
          height={area.length * GridSize}
          fill='rgba(255, 255, 255, 0.3)'
          stroke='green'
          strokeWidth={1}
          pointerEvents='none' />
      ))}

      {Array.from({ length: GridMax }).map((_, i) => (
        <g key={'grid-' + i} style={{ pointerEvents: 'none' }}>
          <line
            x1='0'
            y1={i * GridSize}
            x2={GridSize * GridMax}
            y2={i * GridSize}
            stroke='#ffffff80'
            strokeWidth={i % 5 === 0 ? 2 : 1} />
          <line
            x1={i * GridSize}
            y1='0'
            x2={i * GridSize}
            y2={GridSize * GridMax}
            stroke='#ffffff80'
            strokeWidth={i % 5 === 0 ? 2 : 1} />
        </g>
      ))}

      {(() => {
        // If dragging, render dragged block last (on top)
        const withIndex = Object.entries(blocks);
        const blocksBelowUnmoved = withIndex.filter(([i, b]) => Number(i) !== dragIndex && !b.moved && !b.highlighted);
        const blocksBelow = withIndex.filter(([i, b]) => Number(i) !== dragIndex && b.moved && !b.highlighted);
        const blocksHighlighted = withIndex.filter(([i, b]) => Number(i) !== dragIndex && b.highlighted);
        const sortedBlocks = [
          ...blocksBelowUnmoved.map(([index, block]) => blockRect(Number(index), block)),
          ...blocksBelow.map(([index, block]) => blockRect(Number(index), block)),
          ...blocksHighlighted.map(([index, block]) => blockRect(Number(index), block)),
        ];
        if (dragIndex !== null) {
          const draggedBlock = blocks[dragIndex];
          sortedBlocks.push(blockRect('dragged', draggedBlock));
        }
        return sortedBlocks;
      })()}
    </svg>
  );
}
