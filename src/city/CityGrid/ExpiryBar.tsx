import React from 'react';
import { CityBlock } from '../CityBlock';
import { EXPIRY_BAR_TILES, EXPIRY_TRACK_COLOR, ExpiryProgress } from './expiry';

interface ExpiryBarProps {
  block: Pick<CityBlock, 'x' | 'y' | 'width' | 'length'>;
  progress: ExpiryProgress;
  /** Tile corner -> point in the enclosing group's coordinates: each view's own projection. */
  project: (x: number, y: number) => { x: number; y: number };
}

/**
 * The remaining-life bar along a block's bottom edge. Laid out in tiles and pushed
 * through the view's projection, so the top-down view gets a rectangle and the iso
 * view a strip along the same edge of the diamond, from one description.
 */
export const ExpiryBar: React.FC<ExpiryBarProps> = ({ block, progress, project }) => {
  const top = block.y + block.length - EXPIRY_BAR_TILES;
  const bottom = block.y + block.length;

  const strip = (toX: number) => {
    const corners = [project(block.x, top), project(toX, top), project(toX, bottom), project(block.x, bottom)];
    return `M${corners.map((p) => `${p.x},${p.y}`).join(' L')} Z`;
  };

  return (
    <g pointerEvents='none'>
      <path d={strip(block.x + block.width)} fill={EXPIRY_TRACK_COLOR} />
      {progress.remaining > 0 && <path d={strip(block.x + block.width * progress.remaining)} fill={progress.color} />}
    </g>
  );
};
