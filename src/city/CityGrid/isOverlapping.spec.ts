import { makeCityBlock } from '../../testing/fixtures';
import { CityBlock } from '../CityBlock';
import { isOverlapping } from './isOverlapping';

const at = (key: number, x: number, y: number, width = 2, length = 2): [number, CityBlock] => [
  key,
  makeCityBlock({ id: key, x, y, width, length }),
];

const record = (...entries: [number, CityBlock][]): Record<number, CityBlock> => Object.fromEntries(entries);

describe('isOverlapping', () => {
  it('returns false when there is nothing else on the grid', () => {
    const [, moving] = at(0, 0, 0);
    expect(isOverlapping(moving, 0, 0, 0, {})).toBe(false);
  });

  it('ignores the block being moved', () => {
    const entry = at(0, 10, 10);
    expect(isOverlapping(entry[1], 0, 10, 10, record(entry))).toBe(false);
  });

  it('detects a single-tile corner overlap', () => {
    const [, moving] = at(0, 0, 0);
    const others = record(at(1, 1, 1));
    expect(isOverlapping(moving, 0, 0, 0, others)).toBe(true);
  });

  it('treats edge-adjacent blocks as not overlapping', () => {
    const [, moving] = at(0, 0, 0, 2, 2);
    // occupies x 2..3, so it touches but does not cover x 0..1
    const others = record(at(1, 2, 0, 2, 2));
    expect(isOverlapping(moving, 0, 0, 0, others)).toBe(false);
  });

  it('tests the candidate position, not the block current position', () => {
    const [, moving] = at(0, 0, 0, 2, 2);
    const others = record(at(1, 20, 20, 2, 2));

    expect(isOverlapping(moving, 0, 0, 0, others)).toBe(false);
    expect(isOverlapping(moving, 0, 20, 20, others)).toBe(true);
  });

  it('takes the footprint from the moving block, not from the candidate coordinates', () => {
    const [, small] = at(0, 0, 0, 1, 1);
    const [, large] = at(0, 0, 0, 5, 5);
    const others = record(at(1, 3, 3, 1, 1));

    expect(isOverlapping(small, 0, 0, 0, others)).toBe(false);
    expect(isOverlapping(large, 0, 0, 0, others)).toBe(true);
  });

  it('skips by record key rather than by block id', () => {
    // The moving block lives under key 7 but carries id 99. Passing the id instead of
    // the key makes a block compare against itself and always report an overlap.
    const moving = makeCityBlock({ id: 99, x: 0, y: 0, width: 2, length: 2 });
    const blocks = record([7, moving]);

    expect(isOverlapping(moving, 7, 0, 0, blocks)).toBe(false);
    expect(isOverlapping(moving, 99, 0, 0, blocks)).toBe(true);
  });
});
