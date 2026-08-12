import { GridMax } from '../gridConstants';
import { findCityOrigin } from './findCityOrigin';

const blocks = (...list: { x: number; y: number; width?: number; length?: number }[]) =>
  Object.fromEntries(list.map((b, i) => [i, { width: 2, length: 2, ...b }]));

describe('findCityOrigin', () => {
  it('has no origin for a city with no blocks', () => {
    expect(findCityOrigin({})).toBeNull();
  });

  it('takes the corner of a single building', () => {
    expect(findCityOrigin(blocks({ x: 30, y: 20 }))).toEqual({ x: 30, y: 20 });
  });

  it('takes the smallest x and the smallest y, even from different buildings', () => {
    expect(findCityOrigin(blocks({ x: 30, y: 20 }, { x: 12, y: 44 }, { x: 25, y: 18 }))).toEqual({ x: 12, y: 18 });
  });

  it('ignores blocks parked left of or above the grid', () => {
    expect(findCityOrigin(blocks({ x: -8, y: -8 }, { x: 30, y: 20 }))).toEqual({ x: 30, y: 20 });
  });

  it('ignores blocks parked past the far edges of the grid', () => {
    expect(findCityOrigin(blocks({ x: GridMax + 3, y: 5 }, { x: 5, y: GridMax + 3 }, { x: 30, y: 20 }))).toEqual({
      x: 30,
      y: 20,
    });
  });

  it('ignores a block that only overhangs the edge', () => {
    expect(findCityOrigin(blocks({ x: GridMax - 1, y: 20, width: 3 }, { x: 30, y: 20 }))).toEqual({ x: 30, y: 20 });
  });

  it('has no origin when every block is outside the grid', () => {
    expect(findCityOrigin(blocks({ x: -30, y: -30, width: 4, length: 4 }))).toBeNull();
  });
});
