import React from 'react';
import { Tooltip } from '@mui/material';
import { getBuildingFinder } from '../../buildingFinder';
import { CityBlock } from '../../CityBlock';
import { BlockOpacity, GridSize } from '../../gridConstants';
import { clearHoveredBlockId, setHoveredBlockId, useHoveredBlockStore } from '../../hoveredBlockStore';
import { getBlockDecoration } from '../blockDecoration';
import { BlockLabelContent } from '../BlockLabelContent';
import { BuildingTooltip } from '../BuildingTooltip';
import { SCREENSHOT_OMIT } from '../captureCityScreenshot';
import { TechSprite } from '../ChapterIcon';
import { TOP_CROSSHATCH_ID } from '../CrosshatchPattern';
import { expiryProgress } from '../expiry';
import { ExpiryBar } from '../ExpiryBar';
import { LABEL_UNITS_PER_TILE } from '../labelLayout';
import { MAX_LEVEL_BADGE_PX, MaxLevelBadge, MIN_BADGE_SIDE_PX } from '../MaxLevelBadge';
import { WarningBadge } from '../WarningBadge';

export interface BlockRectProps {
  /** The record key, or 'dragged' for the copy drawn on top while dragging. */
  blockKey: string | number;
  block: CityBlock;
  zoom: number;
  chapter: number;
  allTypes: string[];
  isHighlighted: boolean;
  /** Clock reading the grid mounted with; expiry bars are measured against it. */
  now: number;
  sprite?: TechSprite;
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
  now,
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
  const cursor = dragging ? 'grabbing' : 'grab';

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

  const expiry = expiryProgress(block.expiration ?? building?.expiration, block.expirationEnd, now);

  // Screen-pixel footprint of the block; every layer below shares it.
  const px = {
    x: block.x * sGridSize,
    y: block.y * sGridSize,
    width: block.width * sGridSize,
    height: block.length * sGridSize,
  };

  const shape = (
    <rect
      opacity={BlockOpacity}
      {...px}
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
      {/* The rect is always drawn and interactive; the tooltip needs a catalog entry to describe. */}
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
          <rect {...px} fill={`url(#${TOP_CROSSHATCH_ID})`} pointerEvents='none' />
          <rect {...px} fill='none' stroke='#ff0000' strokeWidth={3} pointerEvents='none' />
        </>
      )}
      {expiry && (
        <ExpiryBar block={block} progress={expiry} project={(x, y) => ({ x: x * sGridSize, y: y * sGridSize })} />
      )}
      {/* The wash sits here, under this block's own label; the outline is drawn once the
          whole grid is down, by HoverOutline. */}
      {isHovered && <rect {...px} fill='#fff' fillOpacity={0.2} pointerEvents='none' {...SCREENSHOT_OMIT} />}
      {dragging && (
        <rect
          {...SCREENSHOT_OMIT}
          x={px.x - 2}
          y={px.y - 2}
          width={px.width + 4}
          height={px.height + 4}
          fill='none'
          stroke='orange'
          strokeWidth={2}
          pointerEvents='none'
        />
      )}
      {/* The warning and label are laid out in tiles, centred on the block; this
          transform is the only place zoom touches them. */}
      <g
        transform={`translate(${px.x + px.width / 2}, ${px.y + px.height / 2}) scale(${
          sGridSize / LABEL_UNITS_PER_TILE
        })`}
        pointerEvents='none'
      >
        {isChapterExcessive && <WarningBadge widthTiles={block.width} lengthTiles={block.length} />}
        <BlockLabelContent block={block} now={now} textColor={textColor} sprite={sprite} />
      </g>
      {/* Screen-fixed chrome, tucked into the block's top-right corner. */}
      {isMaxLevelForChapter && Math.min(px.width, px.height) > MIN_BADGE_SIDE_PX && (
        <g transform={`translate(${px.x + px.width - MAX_LEVEL_BADGE_PX - 2}, ${px.y + 2})`}>
          <MaxLevelBadge />
        </g>
      )}
    </g>
  );
});
