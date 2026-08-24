import React from 'react';
import { Tooltip } from '@mui/material';
import { getBuildingFinder } from '../../buildingFinder';
import { CityBlock } from '../../CityBlock';
import { BlockOpacity, GridSize } from '../../gridConstants';
import { clearHoveredBlockId, setHoveredBlockId, useHoveredBlockStore } from '../../hoveredBlockStore';
import { getBlockDecoration } from '../blockDecoration';
import { BlockLabelContent } from '../BlockLabelContent';
import { BuildingTooltip } from '../BuildingTooltip';
import { TechSprite } from '../ChapterIcon';
import { ISO_CROSSHATCH_ID } from '../CrosshatchPattern';
import { LABEL_UNITS_PER_TILE } from '../labelLayout';
import { MaxLevelBadge, MIN_BADGE_SIDE_PX } from '../MaxLevelBadge';
import { WarningBadge } from '../WarningBadge';
import { IsoProjection } from './isoProjection';

export interface IsometricBlockRectProps {
  /** The record key, or 'dragged' for the copy drawn on top while dragging. */
  blockKey: string | number;
  block: CityBlock;
  zoom: number;
  /** The grid's projection at the current zoom, owned by the grid so every layer shares one. */
  projection: IsoProjection;
  chapter: number;
  allTypes: string[];
  isHighlighted: boolean;
  sprite?: TechSprite;
  onPickUp: (e: React.MouseEvent<SVGElement, MouseEvent>, blockKey: number) => void;
  onOpenMenu: (e: React.MouseEvent<SVGElement, MouseEvent>, blockKey: number) => void;
}

/**
 * One block in the isometric view. Memoised and free of context for the same
 * reason as its top-down counterpart: see the note in BlockRect.
 */
export const IsometricBlockRect: React.FC<IsometricBlockRectProps> = React.memo(function IsometricBlockRect({
  blockKey,
  block,
  zoom,
  projection,
  chapter,
  allTypes,
  isHighlighted,
  sprite,
  onPickUp,
  onOpenMenu,
}) {
  const { toIso } = projection;

  const { building, fillColor, textColor, isChapterExcessive, isMaxLevelForChapter } = getBlockDecoration({
    block,
    finder: getBuildingFinder(),
    chapter,
    allTypes,
    isHighlighted,
  });

  const dragging = blockKey === 'dragged';
  const cursor = dragging ? 'grabbing' : 'grab';

  // Read through a selector for the same reason as its top-down counterpart, and the
  // copy being carried is never a hover target either. See the notes in BlockRect.
  const isHovered = useHoveredBlockStore((state) => state.hoveredId === blockKey);

  const handleClick = (e: React.MouseEvent<SVGElement, MouseEvent>) => {
    if (!dragging) onPickUp(e, Number(blockKey));
  };

  const handleMouseEnter = () => {
    if (!dragging) setHoveredBlockId(Number(blockKey));
  };

  const handleMouseLeave = () => {
    if (!dragging) clearHoveredBlockId(Number(blockKey));
  };

  const handleContextMenu = (e: React.MouseEvent<SVGElement, MouseEvent>) => {
    e.preventDefault();
    if (dragging) return;
    onOpenMenu(e, Number(blockKey));
  };

  // --- Render Calculation ---
  const p1 = toIso(block.x, block.y);
  const p2 = toIso(block.x + block.width, block.y);
  const p3 = toIso(block.x + block.width, block.y + block.length);
  const p4 = toIso(block.x, block.y + block.length);

  const pathData = `M${p1.x},${p1.y} L${p2.x},${p2.y} L${p3.x},${p3.y} L${p4.x},${p4.y} Z`;

  const isoCenter = toIso(block.x + block.width / 2, block.y + block.length / 2);

  const shape = (
    <path
      d={pathData}
      opacity={BlockOpacity}
      fill={fillColor}
      stroke='#000'
      strokeWidth={block.moved ? 2 : 1}
      style={{ cursor }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );

  return (
    <g>
      {building ? (
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
          {shape}
        </Tooltip>
      ) : (
        shape
      )}

      {isHighlighted && (
        <>
          <path d={pathData} fill={`url(#${ISO_CROSSHATCH_ID})`} pointerEvents='none' />
          <path d={pathData} fill='none' stroke='#ff0000' strokeWidth={3} pointerEvents='none' />
        </>
      )}

      {/* The wash sits here, under this block's own label; the outline is drawn once the
          whole grid is down, by IsoHoverOutline. */}
      {isHovered && <path d={pathData} fill='#fff' fillOpacity={0.2} pointerEvents='none' />}

      {dragging && <path d={pathData} fill='none' stroke='orange' strokeWidth={2} pointerEvents='none' />}

      {/* The warning and label are laid out in tiles, centred on the block; this
          transform is the only place zoom touches them. */}
      <g
        transform={`translate(${isoCenter.x}, ${isoCenter.y}) scale(${(GridSize * zoom) / LABEL_UNITS_PER_TILE})`}
        pointerEvents='none'
      >
        {isChapterExcessive && <WarningBadge widthTiles={block.width} lengthTiles={block.length} />}
        <BlockLabelContent block={block} textColor={textColor} sprite={sprite} shadow />
      </g>
      {/* Screen-fixed chrome, just above and right of the block's centre. */}
      {isMaxLevelForChapter && Math.min(block.width, block.length) * GridSize * zoom > MIN_BADGE_SIDE_PX && (
        <g transform={`translate(${isoCenter.x + 12}, ${isoCenter.y - 12})`}>
          <MaxLevelBadge />
        </g>
      )}
    </g>
  );
});
