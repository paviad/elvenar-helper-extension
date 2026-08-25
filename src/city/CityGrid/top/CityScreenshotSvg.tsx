import React from 'react';
import { UnlockedArea } from '../../../model/unlockedArea';
import { CityBlock } from '../../CityBlock';
import { GridSize } from '../../gridConstants';
import { TechSprite } from '../ChapterIcon';
import { CrosshatchPattern, TOP_CROSSHATCH_ID } from '../CrosshatchPattern';
import { TileRect } from '../screenshotFrame';
import { BlockRect } from './BlockRect';
import { GridBackdrop } from './GridBackdrop';
import { paintOrder } from './paintOrder';

/** What the top-down view draws, read off the city at the moment of the shot. */
export interface CityScene {
  blocks: Record<number, CityBlock>;
  unlockedAreas: UnlockedArea[];
  highlightedIds: Set<number>;
  chapter: number;
  allTypes: string[];
  techSprite?: TechSprite;
  /** Clock reading the expiry bars and days-left labels are measured against. */
  now: number;
}

interface CityScreenshotSvgProps {
  scene: CityScene;
  /** The tiles the picture covers; it is exactly this many tiles at GridSize pixels each. */
  frame: TileRect;
  /** The font the live grid inherits from the page; a standalone SVG inherits nothing. */
  fontFamily: string;
}

const noop = () => {};

/**
 * The top-down view of a city at zoom 1, as a standalone SVG the size of the frame:
 * the same ground and the same blocks as the live grid, painted in the same order,
 * with none of its chrome - no hover outline, no carried block, no unlock-mode
 * shading. Drawn this way rather than copied off the screen, so the picture is at 1:1
 * whatever zoom the screen is at, and can be taken from any view.
 */
export const CityScreenshotSvg: React.FC<CityScreenshotSvgProps> = ({ scene, frame, fontFamily }) => {
  const px = (tiles: number) => tiles * GridSize;
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={px(frame.width)}
      height={px(frame.length)}
      viewBox={`${px(frame.x)} ${px(frame.y)} ${px(frame.width)} ${px(frame.length)}`}
      style={{ fontFamily }}
    >
      <CrosshatchPattern id={TOP_CROSSHATCH_ID} />
      <GridBackdrop gridSizePx={GridSize} unlockedAreas={scene.unlockedAreas} />
      {paintOrder(scene.blocks, scene.highlightedIds, null).map(([index, block]) => (
        <BlockRect
          key={index}
          blockKey={Number(index)}
          block={block}
          zoom={1}
          chapter={scene.chapter}
          allTypes={scene.allTypes}
          isHighlighted={scene.highlightedIds.has(block.id)}
          now={scene.now}
          sprite={scene.techSprite}
          onPickUp={noop}
          onOpenMenu={noop}
        />
      ))}
    </svg>
  );
};
