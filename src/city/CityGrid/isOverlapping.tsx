import { CityBlock } from '../CityBlock';

// Helper to check overlap
export function isOverlapping(
  moving: CityBlock,
  movingIndex: number,
  newX: number,
  newY: number,
  allBlocks: Record<number, CityBlock>,
): boolean {
  const mx1 = newX;
  const my1 = newY;
  const mx2 = newX + moving.width - 1;
  const my2 = newY + moving.length - 1;
  for (const [k, v] of Object.entries(allBlocks)) {
    if (Number(k) === movingIndex) continue;
    const b = v;
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
