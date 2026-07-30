import { CityBlock } from './CityBlock';
import { GridMax } from './gridConstants';

/** This one sits outside the city grid by design, so it is never counted as misplaced. */
const ALWAYS_IN_GRID = 'Vestige of Eternity';

/**
 * Whether any part of a block falls outside the playable grid. Blocks can be parked
 * in the padding around the grid, where they still render but no longer contribute
 * to the city's resources.
 *
 * Derived on read rather than stored: position and footprint both change from
 * several places (drag, drop, duplicate, undo, level change), and a stored copy
 * went stale unless every one of them remembered to update it.
 */
export function isOutOfGrid(block: Pick<CityBlock, 'name' | 'x' | 'y' | 'width' | 'length'>): boolean {
  if (block.name === ALWAYS_IN_GRID) return false;

  return block.x < 0 || block.y < 0 || block.x + block.width > GridMax || block.y + block.length > GridMax;
}
