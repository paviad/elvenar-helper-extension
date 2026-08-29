import { CityBlock } from '../CityBlock';

/** Whether the footprint at (x1,y1)-(x2,y2), in tiles, shares a tile with `b`. */
function coversBlock(x1: number, y1: number, x2: number, y2: number, b: CityBlock): boolean {
  return x1 <= b.x + b.width - 1 && x2 >= b.x && y1 <= b.y + b.length - 1 && y2 >= b.y;
}

// Helper to check overlap
export function isOverlapping(
  moving: CityBlock,
  movingIndex: number,
  newX: number,
  newY: number,
  allBlocks: Record<number, CityBlock>,
): boolean {
  const mx2 = newX + moving.width - 1;
  const my2 = newY + moving.length - 1;
  for (const [k, v] of Object.entries(allBlocks)) {
    if (Number(k) === movingIndex) continue;
    if (coversBlock(newX, newY, mx2, my2, v)) {
      return true;
    }
  }
  return false;
}

/**
 * The record keys of every block the moving one would land on. Same reading as
 * isOverlapping, but it names what is in the way rather than only that something is:
 * a drop onto exactly one building can be settled by swapping the two.
 */
export function findOverlapping(
  moving: CityBlock,
  movingIndex: number,
  newX: number,
  newY: number,
  allBlocks: Record<number, CityBlock>,
): number[] {
  const mx2 = newX + moving.width - 1;
  const my2 = newY + moving.length - 1;
  const keys: number[] = [];
  for (const [k, v] of Object.entries(allBlocks)) {
    if (Number(k) === movingIndex) continue;
    if (coversBlock(newX, newY, mx2, my2, v)) {
      keys.push(Number(k));
    }
  }
  return keys;
}
