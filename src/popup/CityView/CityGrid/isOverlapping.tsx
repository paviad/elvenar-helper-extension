import { CityBlock } from '../../CityBlock';

// Helper to check overlap
export function isOverlapping(
  moving: CityBlock,
  movingIndex: number,
  newX: number,
  newY: number,
  allBlocks: CityBlock[]): boolean {
  const mx1 = newX;
  const my1 = newY;
  const mx2 = newX + moving.width - 1;
  const my2 = newY + moving.length - 1;
  for (let i = 0; i < allBlocks.length; i++) {
    if (i === movingIndex) continue;
    const b = allBlocks[i];
    const bx1 = b.x;
    const by1 = b.y;
    const bx2 = b.x + b.width - 1;
    const by2 = b.y + b.length - 1;
    // Check for overlap
    if (mx1 <= bx2 && mx2 >= bx1 && my1 <= by2 && my2 >= by1) {
      return true;
    }
  }
  return false;
}
