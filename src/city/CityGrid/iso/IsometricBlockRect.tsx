import React from 'react';
import { Tooltip } from '@mui/material';
import { useHelper } from '../../../helper/HelperContext';
import { CityBlock } from '../../CityBlock';
import { useCity } from '../../CityContext';
import { BuildingTooltip } from '../BuildingTooltip';
import { useBlockDecoration } from '../useBlockDecoration';
import { handleIsoMouseDownWithZoom } from './handleIsoMouseDown'; // Updated import
import { IsoBlockLabel } from './IsoBlockLabel';
import { createIsoProjection } from './isoProjection';

export const IsometricBlockRect = (key: string | number, block: CityBlock, zoom: number) => {
  const city = useCity();
  const helper = useHelper();
  const { GridSize, GridMax, opacity, PaddingTiles } = city;

  const { toIso } = createIsoProjection({ GridSize, GridMax, PaddingTiles, zoom });

  const setMenu = city.setMenu;
  const blocks = city.blocks;
  const setDragOffset = city.setDragOffset;
  const dragIndex = city.dragIndex;

  const { building, fillColor, textColor, isChapterExcessive, isMaxLevelForChapter, isHighlighted } =
    useBlockDecoration(block);

  const dragging = typeof key === 'string';
  const handler =
    !dragging && dragIndex === null
      ? (e: React.MouseEvent<SVGElement, MouseEvent>) => handleIsoMouseDownWithZoom(city, helper, e, key, zoom)
      : () => {
          /* no-op for dragging */
        };
  const cursor = dragging ? 'grab' : 'grabbing';

  const handleContextMenu = (e: React.MouseEvent<SVGElement, MouseEvent>) => {
    e.preventDefault();
    if (dragging) return;
    const svg = city.svgRef.current;
    let x = e.clientX;
    let y = e.clientY;
    if (svg && typeof key === 'number') {
      const rect = svg.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const blockScreenPos = toIso(blocks[key].x, blocks[key].y);

      // Note: Context menu drag offset calculation might need ISO adjustment if we want precise menu drag,
      // but standard behavior usually snaps center, so we leave as is or update if needed.
      setDragOffset({
        x: mouseX - blockScreenPos.x,
        y: mouseY - blockScreenPos.y,
      });
    }
    setMenu({ x, y, key });
  };

  // --- Render Calculation ---
  const p1 = toIso(block.x, block.y);
  const p2 = toIso(block.x + block.width, block.y);
  const p3 = toIso(block.x + block.width, block.y + block.length);
  const p4 = toIso(block.x, block.y + block.length);

  const pathData = `M${p1.x},${p1.y} L${p2.x},${p2.y} L${p3.x},${p3.y} L${p4.x},${p4.y} Z`;

  const isoCenter = toIso(block.x + block.width / 2, block.y + block.length / 2);

  const labelTransform = `translate(${isoCenter.x}, ${isoCenter.y})`;

  const patternId = `iso-block-crosshatch-${key}`;

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

      {building ? (
        <Tooltip
          title={
            <BuildingTooltip
              building={building}
              isMaxLevel={isMaxLevelForChapter}
              expirationEnd={block.expirationEnd}
            />
          }
          disableHoverListener={dragging}
          arrow
          followCursor
          enterDelay={700}
          enterNextDelay={700}
        >
          <path
            d={pathData}
            opacity={opacity}
            fill={fillColor}
            stroke={block.moved ? 'black' : '#000'}
            strokeWidth={block.moved ? 2 : 1}
            style={{ cursor }}
            onClick={handler}
            onContextMenu={handleContextMenu}
          />
        </Tooltip>
      ) : (
        <path
          d={pathData}
          opacity={opacity}
          fill={fillColor}
          stroke={block.moved ? 'black' : '#000'}
          strokeWidth={block.moved ? 2 : 1}
          style={{ cursor }}
          onClick={handler}
          onContextMenu={handleContextMenu}
        />
      )}

      {isHighlighted && (
        <>
          <path d={pathData} fill={`url(#${patternId})`} pointerEvents='none' />
          <path d={pathData} fill='none' stroke='#ff0000' strokeWidth={3} pointerEvents='none' />
        </>
      )}

      {dragging && <path d={pathData} fill='none' stroke='orange' strokeWidth={2} pointerEvents='none' />}

      <g transform={`${labelTransform} scale(${zoom})`}>
        <IsoBlockLabel
          block={block}
          GridSize={GridSize}
          textColor={textColor}
          sprite={city.techSprite}
          showWarning={isChapterExcessive}
          showMaxLevel={isMaxLevelForChapter}
        />
      </g>
    </g>
  );
};
