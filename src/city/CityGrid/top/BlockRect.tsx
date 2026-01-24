import { Tooltip } from '@mui/material';
import React from 'react';
import { useHelper } from '../../../helper/HelperContext';
import { getContrastColor } from '../../../util/getContrastColor';
import { CityBlock } from '../../CityBlock';
import { useCity } from '../../CityContext';
import { getTypeColor } from '../../Legend/getTypeColor';
import { BuildingTooltip } from '../BuildingTooltip';
import { BlockLabel } from './BlockLabel';
import { handleMouseDown } from './handleMouseDown';

export const BlockRect = (key: string | number, block: CityBlock, zoom: number) => {
  const city = useCity();
  const helper = useHelper();
  const { GridSize, opacity, chapter } = city;

  // Calculate scaled grid size based on zoom
  const sGridSize = GridSize * zoom;

  // Context menu state
  const setMenu = city.setMenu;
  const blocks = city.blocks;
  const setDragOffset = city.setDragOffset;
  const dragIndex = city.dragIndex;
  const buildingFinder = city.buildingFinder;

  const building = buildingFinder.getBuilding(block.gameId, block.level);
  const nextLevelBuilding = buildingFinder.getBuilding(block.gameId, block.level + 1);

  const dragging = key === 'dragged';
  const handler =
    !dragging && dragIndex === null
      ? (e: React.MouseEvent<SVGRectElement, MouseEvent>) => handleMouseDown(city, helper, e, Number(key), zoom)
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
        x: mouseX - blocks[key].x * sGridSize, // Use scaled grid size for offset
        y: mouseY - blocks[key].y * sGridSize,
      });
    }
    setMenu({ x, y, key });
  };

  // SVG pattern for crosshatch
  const patternId = `block-crosshatch-${key}`;
  const isHighlighted = !!block.highlighted;

  const fillColor = getTypeColor(block.type, city.allTypes, block.moved);
  const textColor = getContrastColor(fillColor);

  // Check if building requires a higher chapter than the city's current chapter
  const levelingBuilding = /^[GPRHMOY]_/.test(block.gameId);
  const chapterRequirement = building?.sourceBuilding.upgradeRequirements?.chapter;
  const nextLevelBuildingChapterRequirement = nextLevelBuilding?.sourceBuilding.upgradeRequirements?.chapter || 0;
  const isChapterExcessive = chapterRequirement !== undefined && chapterRequirement > chapter;

  const isMaxLevelForChapter =
    levelingBuilding && !isChapterExcessive && (!nextLevelBuilding || nextLevelBuildingChapterRequirement > chapter);

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
          title={<BuildingTooltip building={building} stage={block.stage} isMaxLevel={isMaxLevelForChapter} />}
          disableHoverListener={dragging}
          arrow
          followCursor
          enterDelay={700}
          enterNextDelay={700}
        >
          <rect
            opacity={opacity}
            x={block.x * sGridSize}
            y={block.y * sGridSize}
            width={block.width * sGridSize}
            height={block.length * sGridSize}
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
            x={block.x * sGridSize}
            y={block.y * sGridSize}
            width={block.width * sGridSize}
            height={block.length * sGridSize}
            fill={`url(#${patternId})`}
            pointerEvents='none'
          />
          <rect
            x={block.x * sGridSize}
            y={block.y * sGridSize}
            width={block.width * sGridSize}
            height={block.length * sGridSize}
            fill='none'
            stroke='#ff0000'
            strokeWidth={3}
            pointerEvents='none'
          />
        </>
      )}
      {dragging && (
        <rect
          x={block.x * sGridSize - 2}
          y={block.y * sGridSize - 2}
          width={block.width * sGridSize + 4}
          height={block.length * sGridSize + 4}
          fill='none'
          stroke='orange'
          strokeWidth={2}
          pointerEvents='none'
        />
      )}
      <BlockLabel
        block={block}
        GridSize={sGridSize}
        textColor={textColor}
        sprite={city.techSprite}
        showWarning={isChapterExcessive}
        showMaxLevel={isMaxLevelForChapter}
      />
    </g>
  );
};
