/**
 * Comparing two pictures of the game, to tell whether it still shows what it showed. A picture is
 * the game's canvas shrunk and turned to grey levels, one byte a pixel, row by row.
 */
export interface GreyFrame {
  width: number;
  height: number;
  data: Uint8Array;
}

/** Rows at the top and bottom to leave out: the game's own bars, which stay put whatever the map does. */
export interface Rows {
  top: number;
  bottom: number;
}

/** The side of the squares the pictures are compared by, in their own pixels. */
const BLOCK = 8;

/**
 * The share of the picture that is the same in both, 0 to 1, when `now` is `before` moved by
 * (dx, dy) of their pixels. The pictures are compared square by square, and a square is the same
 * when its pixels differ by less than `tolerance` grey levels on average; so a window opened over
 * part of the map takes away only the squares it covers. Squares the move brings in from outside
 * the picture are not counted. 0 when the pictures have nothing to compare.
 */
export const sameShare = (
  before: GreyFrame,
  now: GreyFrame,
  dx: number,
  dy: number,
  tolerance: number,
  rows: Rows,
): number => {
  if (before.width !== now.width || before.height !== now.height) {
    return 0;
  }
  const { width, height } = now;
  const bottom = height - rows.bottom;
  let same = 0;
  let counted = 0;
  for (let by = rows.top; by + BLOCK <= bottom; by += BLOCK) {
    // The square as it was in the earlier picture, before the move.
    if (by - dy < rows.top || by - dy + BLOCK > bottom) {
      continue;
    }
    for (let bx = 0; bx + BLOCK <= width; bx += BLOCK) {
      if (bx - dx < 0 || bx - dx + BLOCK > width) {
        continue;
      }
      let difference = 0;
      for (let j = by; j < by + BLOCK; j++) {
        const from = (j - dy) * width - dx;
        const to = j * width;
        for (let i = bx; i < bx + BLOCK; i++) {
          difference += Math.abs(now.data[to + i] - before.data[from + i]);
        }
      }
      counted++;
      if (difference < tolerance * BLOCK * BLOCK) {
        same++;
      }
    }
  }
  return counted ? same / counted : 0;
};
