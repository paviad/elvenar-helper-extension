import React from 'react';
import { Tooltip } from '@mui/material';
import { getBuildingFinder } from '../../buildingFinder';
import { CityBlock } from '../../CityBlock';
import { BlockOpacity, GridSize } from '../../gridConstants';
import { clearHoveredBlockId, setHoveredBlockId, useHoveredBlockStore } from '../../hoveredBlockStore';
import { getBlockDecoration } from '../blockDecoration';
import { BuildingTooltip } from '../BuildingTooltip';
import { BlockLabel } from './BlockLabel';

export interface BlockRectProps {
  /** The record key, or 'dragged' for the copy drawn on top while dragging. */
  blockKey: string | number;
  block: CityBlock;
  zoom: number;
  chapter: number;
  allTypes: string[];
  isHighlighted: boolean;
  sprite?: { url: string; width: number; height: number };
  onPickUp: (e: React.MouseEvent<SVGRectElement, MouseEvent>, blockKey: number) => void;
  onOpenMenu: (e: React.MouseEvent<SVGRectElement, MouseEvent>, blockKey: number) => void;
}

/**
 * One block in the top-down view.
 *
 * Memoised and deliberately free of context: a drag rewrites only the dragged
 * block's object, so every other block's props are unchanged and it can skip the
 * re-render. Reading anything from CityContext here would defeat that, because a
 * context change re-renders a memoised consumer regardless of its props.
 */
export const BlockRect: React.FC<BlockRectProps> = React.memo(function BlockRect({
  blockKey,
  block,
  zoom,
  chapter,
  allTypes,
  isHighlighted,
  sprite,
  onPickUp,
  onOpenMenu,
}) {
  const sGridSize = GridSize * zoom;

  const { building, fillColor, textColor, isChapterExcessive, isMaxLevelForChapter } = getBlockDecoration({
    block,
    finder: getBuildingFinder(),
    chapter,
    allTypes,
    isHighlighted,
  });

  const dragging = blockKey === 'dragged';
  const cursor = dragging ? 'grab' : 'grabbing';

  // Read through a selector rather than a prop, so a hover only re-renders the two
  // blocks whose own state flips instead of the whole grid.
  const isHovered = useHoveredBlockStore((state) => state.hoveredId === blockKey);

  const handleClick = (e: React.MouseEvent<SVGRectElement, MouseEvent>) => {
    if (!dragging) onPickUp(e, Number(blockKey));
  };

  // The copy carried under the cursor during a drag never takes the hover: the keys that
  // act on a hovered building are the same ones that act on the one being held.
  const handleMouseEnter = () => {
    if (!dragging) setHoveredBlockId(Number(blockKey));
  };

  const handleMouseLeave = () => {
    if (!dragging) clearHoveredBlockId(Number(blockKey));
  };

  const handleContextMenu = (e: React.MouseEvent<SVGRectElement, MouseEvent>) => {
    e.preventDefault();
    if (dragging) return;
    onOpenMenu(e, Number(blockKey));
  };

  // SVG pattern for crosshatch
  const patternId = `block-crosshatch-${blockKey}`;

  return (
    <g>
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
          title={
            <BuildingTooltip
              building={building}
              stage={block.stage}
              expirationEnd={block.expirationEnd}
              isMaxLevel={isMaxLevelForChapter}
            />
          }
          disableHoverListener={dragging}
          arrow
          followCursor
          enterDelay={700}
          enterNextDelay={700}
        >
          <rect
            opacity={BlockOpacity}
            x={block.x * sGridSize}
            y={block.y * sGridSize}
            width={block.width * sGridSize}
            height={block.length * sGridSize}
            fill={fillColor}
            stroke={block.moved ? 'black' : '#000'}
            strokeWidth={block.moved ? 2 : 1}
            style={{ cursor }}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
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
      {isHovered && (
        <rect
          x={block.x * sGridSize}
          y={block.y * sGridSize}
          width={block.width * sGridSize}
          height={block.length * sGridSize}
          fill='#fff'
          fillOpacity={0.2}
          stroke='#fff'
          strokeWidth={2.5}
          pointerEvents='none'
        />
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
        sprite={sprite}
        showWarning={isChapterExcessive}
        showMaxLevel={isMaxLevelForChapter}
      />
    </g>
  );
});
