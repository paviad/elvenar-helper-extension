import React from 'react';
import { CityBlock } from '../../CityBlock';
import { getTypeColor } from '../Legend/getTypeColor';
import { CityViewState } from '../CityViewState';
import { handleMouseDown } from './handleMouseDown';

export const blockRect = (
  s: CityViewState,
  key: string | number,
  block: CityBlock
) => {
  const { GridSize, opacity } = s;

  const dragging = typeof key === 'number';
  const handler = dragging
    ? (e: React.MouseEvent<SVGRectElement, MouseEvent>) => handleMouseDown(s, e, key)
    : // eslint-disable-next-line @typescript-eslint/no-empty-function
    () => { };
  const cursor = dragging ? 'grabbing' : 'grab';
  return (
    <g key={key}>
      <rect
        opacity={opacity}
        x={block.x * GridSize}
        y={block.y * GridSize}
        width={block.width * GridSize}
        height={block.length * GridSize}
        fill={getTypeColor(block.type, s.allTypes, block.moved)}
        stroke={block.moved ? 'black' : '#000'}
        strokeWidth={block.moved ? 2 : 1}
        style={{ cursor }}
        onMouseDown={handler}
      >
        <title>{block.name}</title>
      </rect>
      {block.label && (
        <text
          x={(block.x + block.width / 2) * GridSize}
          y={(block.y + block.length / 2) * GridSize}
          textAnchor='middle'
          alignmentBaseline='middle'
          fontSize={Math.max(GridSize * 0.6, 10)}
          fill='#222'
          pointerEvents='none'
          transform={block.length > 1 && block.width > 1
            ? `scale(2,2) translate(${-(block.x + block.width / 2) * GridSize * 0.5},${-(block.y + block.length / 2) * GridSize * 0.5})`
            : undefined}
        >
          {block.label}
        </text>
      )}
    </g>
  );
};
