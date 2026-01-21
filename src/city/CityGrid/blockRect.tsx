import React from 'react';
import { Tooltip } from '@mui/material';
import { CityBlock } from '../CityBlock';
import { getTypeColor } from '../Legend/getTypeColor';
import { handleMouseDown } from './handleMouseDown';
import { BlockLabel } from './BlockLabel';
import { useCity } from '../CityContext';
import { useHelper } from '../../helper/HelperContext';
import { getContrastColor } from '../../util/getContrastColor';
import { BuildingTooltip } from './BuildingTooltip';

export const blockRect = (key: string | number, block: CityBlock) => {
  const city = useCity();
  const helper = useHelper();
  const { GridSize, opacity } = city;

  // Context menu state
  const setMenu = city.setMenu;
  const blocks = city.blocks;
  const setDragOffset = city.setDragOffset;
  const dragIndex = city.dragIndex;
  const buildingFinder = city.buildingFinder;

  const building = buildingFinder.getBuilding(block.gameId, block.level);

  const dragging = typeof key === 'string';
  const handler =
    !dragging && dragIndex === null
      ? (e: React.MouseEvent<SVGRectElement, MouseEvent>) => handleMouseDown(city, helper, e, key)
      : () => {
          /* no-op for dragging */
        };
  const cursor = dragging ? 'grab' : 'grabbing';

  // Context menu handler
  const handleContextMenu = (e: React.MouseEvent<SVGRectElement, MouseEvent>) => {
    e.preventDefault();
    if (dragging) return;
    // Position relative to SVG container
    const svg = city.svgRef.current;
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

  const fillColor = getTypeColor(block.type, city.allTypes, block.moved);
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
      {building && (
        <Tooltip
          title={<BuildingTooltip building={building} />}
          disableHoverListener={dragging}
          arrow
          followCursor
          enterDelay={700}
          enterNextDelay={700}
        >
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
          />
        </Tooltip>
      )}
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
      <BlockLabel block={block} GridSize={GridSize} textColor={textColor} sprite={city.techSprite} />
    </g>
  );
};
