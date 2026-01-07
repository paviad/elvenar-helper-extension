import React from 'react';
import { CityBlock } from '../CityBlock';
import { getTypeColor } from '../Legend/getTypeColor';
import { CityViewState } from '../CityViewState';
import { handleMouseDown } from './handleMouseDown';
import { BlockLabel } from './BlockLabel';

export const blockRect = (s: CityViewState, key: string | number, block: CityBlock) => {
  const { GridSize, opacity } = s;

  // Context menu state
  const [_1, setMenu] = s.rMenu;
  const [blocks, _3] = s.rBlocks;
  const [_2, setDragOffset] = s.rDragOffset;
  const [dragIndex, _4] = s.rDragIndex;

  const dragging = typeof key === 'string';
  const handler = !dragging && dragIndex === null
    ? (e: React.MouseEvent<SVGRectElement, MouseEvent>) => handleMouseDown(s, e, key)
    : () => {
        /* no-op for dragging */
      };
  const cursor = dragging ? 'grab' : 'grabbing';

  // Context menu handler
  const handleContextMenu = (e: React.MouseEvent<SVGRectElement, MouseEvent>) => {
    e.preventDefault();
    // Position relative to SVG container
    const svg = s.svgRef.current;
    let x = e.clientX;
    let y = e.clientY;
    if (svg && typeof key === 'number') {
      const rect = svg.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setDragOffset({
        x: mouseX - blocks[key].x * GridSize,
        y: mouseY - blocks[key].y * GridSize,
      });
    }
    setMenu({ x, y, key });
  };

  // SVG pattern for crosshatch
  const patternId = `block-crosshatch-${key}`;
  const isHighlighted = !!block.highlighted;

  // Utility to determine contrast color
  function getContrastColor(hex: string) {
    // Remove # if present
    hex = hex.replace('#', '');
    // Parse r, g, b
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // Return white for dark backgrounds, black for light
    return luminance < 0.35 ? '#ffffff' : '#000000';
  }

  const fillColor = getTypeColor(block.type, s.allTypes, block.moved);
  const textColor = getContrastColor(fillColor);

  return (
    <g key={key}>
      {isHighlighted && (
        <defs>
          <pattern id={patternId} patternUnits='userSpaceOnUse' width='8' height='8' patternTransform='rotate(45)'>
            <line x1='0' y1='0' x2='0' y2='8' stroke='#000' strokeWidth='1' strokeOpacity='1' />
            <line x1='4' y1='0' x2='4' y2='8' stroke='#000' strokeWidth='1' strokeOpacity='1' />
          </pattern>
        </defs>
      )}
      <rect
        opacity={opacity}
        x={block.x * GridSize}
        y={block.y * GridSize}
        width={block.width * GridSize}
        height={block.length * GridSize}
        fill={fillColor}
        stroke={block.moved ? 'black' : '#000'}
        strokeWidth={block.moved ? 2 : 1}
        style={{ cursor }}
        onClick={handler}
        onContextMenu={handleContextMenu}
      >
        <title>{block.name}</title>
      </rect>
      {isHighlighted && (
        <>
          <rect
            x={block.x * GridSize}
            y={block.y * GridSize}
            width={block.width * GridSize}
            height={block.length * GridSize}
            fill={`url(#${patternId})`}
            pointerEvents='none'
          />
          <rect
            x={block.x * GridSize}
            y={block.y * GridSize}
            width={block.width * GridSize}
            height={block.length * GridSize}
            fill='none'
            stroke='#ff0000'
            strokeWidth={3}
            pointerEvents='none'
          />
        </>
      )}
      {dragging && (
        <rect
          x={block.x * GridSize - 2}
          y={block.y * GridSize - 2}
          width={block.width * GridSize + 4}
          height={block.length * GridSize + 4}
          fill='none'
          stroke='orange'
          strokeWidth={2}
          pointerEvents='none'
        />
      )}
      <BlockLabel block={block} GridSize={GridSize} textColor={textColor} sprite={s.techSprite} />
    </g>
  );
};
