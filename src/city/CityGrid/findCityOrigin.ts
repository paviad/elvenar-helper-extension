import { CityBlock } from '../CityBlock';
import { GridMax } from '../gridConstants';

/** Tiles left between the corner of the viewport and the city, when a city is first opened. */
export const InitialFramingTiles = 5;

/**
 * The corner the city starts at: the smallest x and the smallest y over the blocks
 * standing on the grid. The two need not come from the same building.
 *
 * Only what is on the grid counts. Blocks parked in the padding are scratch work, and
 * the Vestige of Eternity sits out there permanently - framing the view on either would
 * open it on empty ground. That is also why the coordinates are tested here rather than
 * through isOutOfGrid, which deliberately lets the Vestige pass.
 *
 * Null when nothing is on the grid, which includes a city that has not loaded yet.
 */
export function findCityOrigin(
  blocks: Record<number, Pick<CityBlock, 'x' | 'y' | 'width' | 'length'>>,
): { x: number; y: number } | null {
  let x = Infinity;
  let y = Infinity;

  for (const block of Object.values(blocks)) {
    if (block.x < 0 || block.y < 0 || block.x + block.width > GridMax || block.y + block.length > GridMax) continue;
    x = Math.min(x, block.x);
    y = Math.min(y, block.y);
  }

  return x === Infinity ? null : { x, y };
}
