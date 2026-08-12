import React from 'react';
import { Tooltip } from '@mui/material';
import { getBuildingFinder } from '../../buildingFinder';
import { CityBlock } from '../../CityBlock';
import { BlockOpacity, GridMax, GridSize, PaddingTiles } from '../../gridConstants';
import { clearHoveredBlockId, setHoveredBlockId, useHoveredBlockStore } from '../../hoveredBlockStore';
import { getBlockDecoration } from '../blockDecoration';
import { BuildingTooltip } from '../BuildingTooltip';
import { IsoBlockLabel } from './IsoBlockLabel';
import { createIsoProjection } from './isoProjection';

export interface IsometricBlockRectProps {
  /** The record key, or 'dragged' for the copy drawn on top while dragging. */
  blockKey: string | number;
  block: CityBlock;
  zoom: number;
  chapter: number;
  allTypes: string[];
  isHighlighted: boolean;
  sprite?: { url: string; width: number; height: number };
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
  chapter,
  allTypes,
  isHighlighted,
  sprite,
  onPickUp,
  onOpenMenu,
}) {
  const { toIso } = createIsoProjection({ GridSize, GridMax, PaddingTiles, zoom });

  const { building, fillColor, textColor, isChapterExcessive, isMaxLevelForChapter } = getBlockDecoration({
    block,
    finder: getBuildingFinder(),
    chapter,
    allTypes,
    isHighlighted,
  });

  const dragging = typeof blockKey === 'string';
  const cursor = dragging ? 'grab' : 'grabbing';

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
  const labelTransform = `translate(${isoCenter.x}, ${isoCenter.y})`;

  const patternId = `iso-block-crosshatch-${blockKey}`;

  const shape = (
    <path
      d={pathData}
      opacity={BlockOpacity}
      fill={fillColor}
      stroke={block.moved ? 'black' : '#000'}
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
          {shape}
        </Tooltip>
      ) : (
        shape
      )}

      {isHighlighted && (
        <>
          <path d={pathData} fill={`url(#${patternId})`} pointerEvents='none' />
          <path d={pathData} fill='none' stroke='#ff0000' strokeWidth={3} pointerEvents='none' />
        </>
      )}

      {/* The wash sits here, under this block's own label; the outline is drawn once the
          whole grid is down, by IsoHoverOutline. */}
      {isHovered && <path d={pathData} fill='#fff' fillOpacity={0.2} pointerEvents='none' />}

      {dragging && <path d={pathData} fill='none' stroke='orange' strokeWidth={2} pointerEvents='none' />}

      <g transform={`${labelTransform} scale(${zoom})`}>
        <IsoBlockLabel
          block={block}
          GridSize={GridSize}
          textColor={textColor}
          sprite={sprite}
          showWarning={isChapterExcessive}
          showMaxLevel={isMaxLevelForChapter}
        />
      </g>
    </g>
  );
});
