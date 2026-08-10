import { GridMax } from './gridConstants';
import { isOutOfGrid } from './isOutOfGrid';

const block = (x: number, y: number, width = 2, length = 2, gameId = 'G_Steel_1') => ({
  gameId,
  x,
  y,
  width,
  length,
});

describe('isOutOfGrid', () => {
  it('accepts a block well inside the grid', () => {
    expect(isOutOfGrid(block(10, 10))).toBe(false);
  });

  it('accepts a block flush against the top-left corner', () => {
    expect(isOutOfGrid(block(0, 0))).toBe(false);
  });

  it('accepts a block flush against the bottom-right corner', () => {
    expect(isOutOfGrid(block(GridMax - 2, GridMax - 2))).toBe(false);
  });

  it.each([
    ['negative x', block(-1, 10)],
    ['negative y', block(10, -1)],
    ['overhanging the right edge', block(GridMax - 1, 10)],
    ['overhanging the bottom edge', block(10, GridMax - 1)],
  ])('rejects a block %s', (_case, b) => {
    expect(isOutOfGrid(b)).toBe(true);
  });

  it('accounts for the footprint, not just the origin', () => {
    expect(isOutOfGrid(block(GridMax - 5, 0, 5, 1))).toBe(false);
    expect(isOutOfGrid(block(GridMax - 5, 0, 6, 1))).toBe(true);
  });

  // By id rather than by display name, which is whatever the player's language calls it.
  it('never rejects the Vestige of Eternity, which lives outside the grid', () => {
    expect(isOutOfGrid(block(-30, -30, 4, 4, 'B_All_Spire_AW_9'))).toBe(false);
  });
});
