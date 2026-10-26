import { planStreetRuns } from './planStreetRuns';
import { tileKey } from './rulesSimulator';

const TRAIL = 'S_Humans_Trail';

const streets = (...tiles: [number, number][]) => new Map(tiles.map(([x, y]) => [tileKey(x, y), TRAIL]));

const line = (fromX: number, toX: number, y: number): [number, number][] =>
  Array.from({ length: toX - fromX + 1 }, (_, i) => [fromX + i, y]);

const ends = (runs: ReturnType<typeof planStreetRuns>) =>
  runs.map(({ from, to }) => [from.x, from.y, to.x, to.y]).sort();

describe('planStreetRuns', () => {
  it('lays a straight street as one run', () => {
    const tiles = streets(...line(2, 8, 5));

    expect(ends(planStreetRuns(tiles, tiles))).toEqual([[2, 5, 8, 5]]);
  });

  it('lays an L as two runs', () => {
    const tiles = streets(...line(2, 6, 5), [6, 6], [6, 7]);

    expect(planStreetRuns(tiles, tiles)).toHaveLength(2);
  });

  it('crosses tiles already laid with the same street, keeping a broken street to one run', () => {
    const target = streets(...line(2, 8, 5));
    const toLay = streets([2, 5], [3, 5], [7, 5], [8, 5]);

    expect(ends(planStreetRuns(toLay, target))).toEqual([[2, 5, 8, 5]]);
  });

  it('does not stretch a run past the last tile still to lay', () => {
    const target = streets(...line(0, 10, 5));
    const toLay = streets([4, 5], [5, 5]);

    expect(ends(planStreetRuns(toLay, target))).toEqual([[4, 5, 5, 5]]);
  });

  it('keeps runs to one street type', () => {
    const target = new Map([...streets([2, 5], [3, 5]), [tileKey(4, 5), 'S_Humans_Dwarven']]);

    expect(planStreetRuns(target, target)).toHaveLength(2);
  });
});
