import { Stack, Button } from '@mui/material';
import React from 'react';
import { blockRect } from './blockRect';
import { CityViewState } from '../CityViewState';
import { handleMouseMove } from './handleMouseMove';
import { handleMouseUp } from './handleMouseUp';
import { sellStreets } from './sellStreets';

export const renderCityGrid = (s: CityViewState) => {
  const { GridSize, GridMax, svgRef } = s;
  const [blocks, _1] = s.rBlocks;
  const [dragIndex, _2] = s.rDragIndex;
  const [mouseGrid, _3] = s.rMouseGrid;

  return (
    <Stack>
      <Stack direction='row'>
        <Button onClick={() => sellStreets(s)}>Sell Streets</Button>
      </Stack>
      <div>
        <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
          {mouseGrid
            ? `Grid: (${mouseGrid.x}, ${mouseGrid.y})`
            : 'Grid: (-, -)'}
        </div>
        <svg
          ref={svgRef}
          width={GridSize * GridMax}
          height={GridSize * GridMax}
          style={{
            border: '1px solid black',
            cursor: dragIndex !== null ? 'grabbing' : 'default',
          }}
          onMouseMove={(e) => handleMouseMove(s, e)}
          onMouseUp={() => handleMouseUp(s)}
          onMouseLeave={() => handleMouseUp(s)}
        >
          <rect
            x={0}
            y={0}
            width={GridSize * GridMax}
            height={GridSize * GridMax}
            fill='#145214'
          />

          {s.props.unlockedAreas.map((area, idx) => (
            <rect
              key={`unlocked-${idx}`}
              x={area.x * GridSize}
              y={area.y * GridSize}
              width={area.width * GridSize}
              height={area.length * GridSize}
              fill='rgba(255, 255, 255, 0.3)'
              stroke='green'
              strokeWidth={1}
              pointerEvents='none'
            />
          ))}

          {Array.from({ length: GridMax }).map((_, i) => (
            <g key={'grid-' + i} style={{ pointerEvents: 'none' }}>
              <line
                x1='0'
                y1={i * GridSize}
                x2={GridSize * GridMax}
                y2={i * GridSize}
                stroke='#ffffff80'
                strokeWidth={i % 5 === 0 ? 2 : 1}
              />
              <line
                x1={i * GridSize}
                y1='0'
                x2={i * GridSize}
                y2={GridSize * GridMax}
                stroke='#ffffff80'
                strokeWidth={i % 5 === 0 ? 2 : 1}
              />
            </g>
          ))}

          {(() => {
            // If dragging, render dragged block last (on top)
            if (dragIndex !== null) {
              const blocksBelowUnmoved = blocks.filter(
                (b, i) => i !== dragIndex && !b.moved
              );
              const blocksBelow = blocks.filter(
                (b, i) => i !== dragIndex && b.moved
              );
              const draggedBlock = blocks[dragIndex];
              return [
                ...blocksBelowUnmoved.map((block, index) =>
                  blockRect(s, index, block)
                ),
                ...blocksBelow.map((block, index) =>
                  blockRect(s, index, block)
                ),
                blockRect(s, 'dragged', draggedBlock),
              ];
            } else {
              const blocksBelowUnmoved = blocks
                .map((b, i) => [b, i] as const)
                .filter(([b, i]) => !b.moved);
              const blocksBelow = blocks
                .map((b, i) => [b, i] as const)
                .filter(([b, i]) => b.moved);
              return [
                ...blocksBelowUnmoved.map(([block, index]) =>
                  blockRect(s, index, block)
                ),
                ...blocksBelow.map(([block, index]) =>
                  blockRect(s, index, block)
                ),
              ];
            }
          })()}
        </svg>
      </div>
    </Stack>
  );
};
