import { ChecklistStep } from '../../city/movePlan/checklist';
import { SimBuilding, SimCity, tileKey } from '../../city/movePlan/rulesSimulator';
import { stepMap } from './stepMapModel';

const building = (id: number, x: number, y: number, width = 2, length = 2): SimBuilding => ({
  id,
  kind: `K${id}`,
  level: 1,
  x,
  y,
  width,
  length,
  connection: 'none',
  reportedConnected: false,
  busy: false,
});

const city = (buildings: SimBuilding[], streets: [number, number][] = []): SimCity => ({
  buildings: new Map(buildings.map((b) => [b.id, b])),
  streets: new Map(streets.map(([x, y]) => [tileKey(x, y), 'S_Humans_Trail'])),
  unlocked: [{ x: 0, y: 0, width: 80, length: 80 }],
  mainHallId: 1,
  builders: 2,
});

const swap: ChecklistStep = {
  action: {
    type: 'chain',
    drops: [
      { id: 2, x: 46, y: 48 },
      { id: 3, x: 43, y: 48 },
    ],
  },
  expect: { type: 'at', buildings: [] },
  done: false,
};

describe('stepMap', () => {
  const at = city([building(2, 43, 48, 3, 3), building(3, 47, 48, 3, 3), building(9, 10, 10)], [[42, 50]]);

  it('marks where to pick up, and numbers where each building of a drag goes down', () => {
    const model = stepMap(swap, at)!;

    expect(model.marks).toEqual([
      { type: 'from', rect: expect.objectContaining({ x: 43, y: 48 }) },
      { type: 'to', rect: { x: 46, y: 48, width: 3, length: 3, kind: 'K2', level: 1 }, number: 1 },
      { type: 'to', rect: { x: 43, y: 48, width: 3, length: 3, kind: 'K3', level: 1 }, number: 2 },
    ]);
  });

  it('tells the buildings the step moves from the ones it leaves alone', () => {
    // A neighbour standing right beside the swap, which the step leaves where it is.
    const withNeighbour = city([building(2, 43, 48, 3, 3), building(3, 47, 48, 3, 3), building(4, 43, 52, 2, 2)]);
    const model = stepMap(swap, withNeighbour)!;

    expect(model.buildings.map((b) => [b.kind, b.involved]).sort()).toEqual([
      ['K2', true],
      ['K3', true],
      ['K4', false],
    ]);
  });

  it('shows the city around the step, and nothing far off', () => {
    const model = stepMap(swap, at)!;

    expect(model.buildings).toHaveLength(2);
    expect(model.streets).toEqual([{ x: 42, y: 50 }]);
  });

  it('shows at least a patch big enough to find, even for one tile', () => {
    const step: ChecklistStep = {
      action: { type: 'sellStreets', tiles: [{ x: 42, y: 50 }] },
      expect: { type: 'noStreets', tiles: [] },
      done: false,
    };

    const { view } = stepMap(step, at)!;
    expect(view.width).toBeGreaterThanOrEqual(10);
    expect(view.length).toBeGreaterThanOrEqual(10);
  });

  it('shows street tiles to vacate on the outline of the spot the building they make way for goes to', () => {
    const coming = { kind: 'O_Humans_Armory', level: 3, x: 20, y: 5, width: 2, length: 2 };
    const step: ChecklistStep = {
      action: { type: 'sellStreets', tiles: [{ x: 21, y: 6 }], for: [coming] },
      expect: { type: 'noStreets', tiles: [] },
      done: false,
    };

    expect(stepMap(step, city([], [[21, 6]]))!.marks).toEqual([
      { type: 'spot', rect: { x: 20, y: 5, width: 2, length: 2 } },
      { type: 'sellTile', tile: { x: 21, y: 6 } },
    ]);
  });

  it('marks only the street tiles still to vacate, once some are gone', () => {
    const step: ChecklistStep = {
      action: {
        type: 'sellStreets',
        tiles: [
          { x: 31, y: 57 },
          { x: 32, y: 57 },
        ],
      },
      expect: { type: 'noStreets', tiles: [] },
      done: false,
    };

    expect(stepMap(step, city([], [[32, 57]]))!.marks).toEqual([{ type: 'sellTile', tile: { x: 32, y: 57 } }]);
  });
});
