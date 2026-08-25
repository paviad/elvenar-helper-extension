import { UnlockedArea } from '../../model/unlockedArea';
import { CityBlock } from '../CityBlock';
import { ExpansionSize, GridMax } from '../gridConstants';

/** A rectangle of tiles on the grid. */
export interface TileRect {
  x: number;
  y: number;
  width: number;
  length: number;
}

/**
 * The part of the grid a screenshot shows.
 *
 * For all but the largest cities most of the grid is locked ground, so the frame is
 * fitted to the city rather than the grid: everything unlocked and every building
 * standing on the grid, squared out to whole expansions, with one band of expansions
 * around that for context. It is clamped to the grid, so a city that has grown to an
 * edge is shot to that edge and the biggest cities come out grid and all.
 *
 * Blocks parked in the scratch space around the grid are not part of the city and are
 * left out - the Vestige of Eternity stands out there permanently. One overhanging
 * the edge counts for the part that is on the grid. A city with nothing to fit to
 * frames the whole grid.
 */
export function screenshotFrame(
  unlockedAreas: readonly UnlockedArea[],
  blocks: readonly Pick<CityBlock, 'x' | 'y' | 'width' | 'length'>[],
): TileRect {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  const include = (r: TileRect) => {
    left = Math.min(left, r.x);
    top = Math.min(top, r.y);
    right = Math.max(right, r.x + r.width);
    bottom = Math.max(bottom, r.y + r.length);
  };

  unlockedAreas.forEach(include);
  blocks.filter((b) => b.x < GridMax && b.x + b.width > 0 && b.y < GridMax && b.y + b.length > 0).forEach(include);

  if (left === Infinity) return { x: 0, y: 0, width: GridMax, length: GridMax };

  const clamp = (tiles: number) => Math.max(0, Math.min(GridMax, tiles));
  const x = clamp((Math.floor(left / ExpansionSize) - 1) * ExpansionSize);
  const y = clamp((Math.floor(top / ExpansionSize) - 1) * ExpansionSize);
  const x2 = clamp((Math.ceil(right / ExpansionSize) + 1) * ExpansionSize);
  const y2 = clamp((Math.ceil(bottom / ExpansionSize) + 1) * ExpansionSize);
  return { x, y, width: x2 - x, length: y2 - y };
}
