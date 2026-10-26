import { matchBuildings, TargetBuilding } from './matchBuildings';
import { SimBuilding } from './rulesSimulator';

const building = (id: number, kind: string, x: number, y: number, level = 1): SimBuilding => ({
  id,
  kind,
  level,
  x,
  y,
  width: 2,
  length: 2,
  connection: 'none',
  reportedConnected: false,
  busy: false,
});

const spot = (kind: string, x: number, y: number, level = 1): TargetBuilding => {
  const { id: _id, busy: _busy, ...rest } = building(0, kind, x, y, level);
  return rest;
};

const pairs = (matching: ReturnType<typeof matchBuildings>) =>
  matching.pairings.map(({ current, target }) => [current.id, target.x, target.y]);

describe('matchBuildings', () => {
  it('leaves a building on a spot of its kind where it is, even when the planner moved its twin there', () => {
    // The planner swapped two identical residences: nothing needs to move.
    const matching = matchBuildings(
      [building(1, 'R', 0, 0), building(2, 'R', 4, 0)],
      [spot('R', 4, 0), spot('R', 0, 0)],
    );

    expect(pairs(matching).sort()).toEqual([
      [1, 0, 0],
      [2, 4, 0],
    ]);
  });

  it('sends the rest to the nearest free spot of their kind', () => {
    const matching = matchBuildings(
      [building(1, 'R', 0, 0), building(2, 'R', 20, 0)],
      [spot('R', 18, 0), spot('R', 2, 0)],
    );

    expect(pairs(matching).sort()).toEqual([
      [1, 2, 0],
      [2, 18, 0],
    ]);
  });

  it('never pairs buildings of different kinds', () => {
    const matching = matchBuildings([building(1, 'R', 0, 0)], [spot('W', 0, 0)]);

    expect(matching.sells.map((b) => b.id)).toEqual([1]);
    expect(matching.places.map((t) => t.kind)).toEqual(['W']);
  });

  it('sells what the target does without, and places what the city lacks', () => {
    const matching = matchBuildings(
      [building(1, 'R', 0, 0), building(2, 'R', 4, 0)],
      [spot('R', 0, 0), spot('C', 8, 8)],
    );

    expect(matching.sells.map((b) => b.id)).toEqual([2]);
    expect(matching.places.map((t) => t.kind)).toEqual(['C']);
  });

  it('pairs a building with a higher level of itself: an upgrade, not a sale', () => {
    const matching = matchBuildings([building(1, 'R', 0, 0, 3)], [spot('R', 0, 0, 5)]);

    expect(pairs(matching)).toEqual([[1, 0, 0]]);
    expect(matching.sells).toEqual([]);
  });

  it('says so when the target wants a lower level, rather than selling and placing', () => {
    const matching = matchBuildings([building(1, 'R', 0, 0, 5)], [spot('R', 0, 0, 3)]);

    expect(matching.lowerLevel.map(({ current }) => current.id)).toEqual([1]);
    expect(matching.sells).toEqual([]);
    expect(matching.places).toEqual([]);
  });
});
