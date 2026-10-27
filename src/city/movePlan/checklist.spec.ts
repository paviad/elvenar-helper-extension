import { isDone, stepStatuses, toChecklist, updateChecklist } from './checklist';
import { TargetBuilding } from './matchBuildings';
import { applyAction, SimAction, SimBuilding, SimCity, tileKey } from './rulesSimulator';
import { PlanRules, TargetCity } from './solveMovePlan';

const building = (
  id: number,
  kind: string,
  x: number,
  y: number,
  width = 2,
  length = 2,
  extra: Partial<SimBuilding> = {},
): SimBuilding => ({
  id,
  kind,
  level: 1,
  x,
  y,
  width,
  length,
  connection: 'none',
  reportedConnected: false,
  busy: false,
  ...extra,
});

const mainHall = () => building(1, 'MH', 0, 0, 3, 3);

const city = (buildings: SimBuilding[], builders = 2): SimCity => ({
  buildings: new Map([mainHall(), ...buildings].map((b) => [b.id, b])),
  streets: new Map(),
  unlocked: [{ x: 0, y: 0, width: 20, length: 20 }],
  mainHallId: 1,
  builders,
});

const target = (buildings: SimBuilding[], streets: [number, number][] = []): TargetCity => ({
  buildings: [mainHall(), ...buildings].map(({ id: _id, busy: _busy, ...rest }): TargetBuilding => rest),
  streets: new Map(streets.map(([x, y]) => [tileKey(x, y), 'S_Humans_Trail'])),
});

/** Every kind keeps its size, and the Footpath is the free street. */
const rules: PlanRules = {
  sizeAt: () => ({ width: 2, length: 2 }),
  isFreeStreet: (street) => street === 'S_Humans_Trail',
};

/** The player doing a step in the game: the city the game would report afterwards. */
const doInGame = (at: SimCity, action: SimAction) => {
  const result = applyAction(at, action);
  if (!result.ok) throw new Error(result.refusal);
  return result.city;
};

describe('the checklist', () => {
  const start = city([building(2, 'Factory', 5, 5), building(3, 'Armory', 7, 5)]);
  const goal = target([building(2, 'Factory', 7, 5), building(3, 'Armory', 5, 5)]);

  it('has one line for a swap, done once both buildings stand where the drag put them', () => {
    const checklist = toChecklist(start, goal, rules, 1);

    expect(checklist.steps).toHaveLength(1);
    expect(isDone(checklist.steps[0].expect, start)).toBe(false);
    expect(isDone(checklist.steps[0].expect, doInGame(start, checklist.steps[0].action))).toBe(true);
  });

  it('ticks a step as soon as the city shows it done', () => {
    const checklist = toChecklist(start, goal, rules, 1);
    const after = doInGame(start, checklist.steps[0].action);

    expect(updateChecklist(checklist, after, goal, rules).steps[0].done).toBe(true);
  });

  it('marks the step to do next', () => {
    expect(stepStatuses(toChecklist(start, goal, rules, 1), start)).toEqual(['next']);
  });
});

describe('a step that sets a building aside', () => {
  // The bar over three tiles, rows swapped: the bar has to be set aside first.
  const start = city([
    building(2, 'Bar', 5, 5, 3, 1),
    building(3, 'One', 5, 6, 1, 1),
    building(4, 'Two', 6, 6, 1, 1),
    building(5, 'Three', 7, 6, 1, 1),
  ]);
  const goal = target([
    building(2, 'Bar', 5, 6, 3, 1),
    building(3, 'One', 5, 5, 1, 1),
    building(4, 'Two', 6, 5, 1, 1),
    building(5, 'Three', 7, 5, 1, 1),
  ]);

  it('says so', () => {
    const checklist = toChecklist(start, goal, rules, 1);

    expect(checklist.steps[0].aside).toEqual([2]);
  });

  it('stays ticked once the building moves on to its own spot', () => {
    let checklist = toChecklist(start, goal, rules, 1);
    let at = start;
    for (const step of checklist.steps) {
      at = doInGame(at, step.action);
      checklist = updateChecklist(checklist, at, goal, rules);
    }

    expect(checklist.steps.map((s) => s.done)).toEqual(checklist.steps.map(() => true));
  });
});

describe('a set-aside step the helper never saw happen', () => {
  it('counts as done once the building has gone on to its own spot', () => {
    const start = city([
      building(2, 'Bar', 5, 5, 3, 1),
      building(3, 'One', 5, 6, 1, 1),
      building(4, 'Two', 6, 6, 1, 1),
      building(5, 'Three', 7, 6, 1, 1),
    ]);
    const goal = target([
      building(2, 'Bar', 5, 6, 3, 1),
      building(3, 'One', 5, 5, 1, 1),
      building(4, 'Two', 6, 5, 1, 1),
      building(5, 'Three', 7, 5, 1, 1),
    ]);
    let checklist = toChecklist(start, goal, rules, 1);
    // Every step taken with the panel closed, then the panel opened once at the end.
    let at = start;
    for (const step of checklist.steps) at = doInGame(at, step.action);
    checklist = updateChecklist(checklist, at, goal, rules);

    expect(checklist.steps.every((s) => s.done)).toBe(true);
  });
});

describe('going off plan', () => {
  const start = city([building(2, 'Factory', 5, 5), building(3, 'Armory', 7, 5), building(4, 'Shed', 12, 12)]);
  const goal = target([building(2, 'Factory', 7, 5), building(3, 'Armory', 5, 5), building(4, 'Shed', 14, 14)]);

  it('works out only the steps left again, keeping the ones done', () => {
    let checklist = toChecklist(start, goal, rules, 1);
    const shedStep = checklist.steps.findIndex((s) => s.action.type === 'chain' && s.action.drops[0].id === 4);
    let at = doInGame(start, checklist.steps[shedStep].action);
    checklist = updateChecklist(checklist, at, goal, rules);
    // Then the Factory put down somewhere the plan never asked for, on the Armory's spot-to-be.
    at = doInGame(at, { type: 'chain', drops: [{ id: 2, x: 5, y: 10 }] });
    checklist = updateChecklist(checklist, at, goal, rules);

    expect(checklist.steps.filter((s) => s.done)).toHaveLength(1);
    let end = at;
    for (const step of checklist.steps.filter((s) => !s.done)) end = doInGame(end, step.action);
    expect([2, 3, 4].map((id) => [end.buildings.get(id)!.x, end.buildings.get(id)!.y])).toEqual([
      [7, 5],
      [5, 5],
      [14, 14],
    ]);
  });
});

describe('a step held up by an upgrade', () => {
  it('is waiting, and a move that needs no builder is next instead', () => {
    const start = city([building(2, 'R', 5, 5), building(3, 'Shed', 12, 12)], 1);
    const goal = target([building(2, 'R', 5, 5, 2, 2, { level: 3 }), building(3, 'Shed', 14, 14)]);
    const checklist = toChecklist(start, goal, rules, 1);
    // The first upgrade is under way, so the second has to wait for it.
    const upgrading = doInGame(start, checklist.steps.find((s) => s.action.type === 'upgrade')!.action);
    const updated = updateChecklist(checklist, upgrading, goal, rules);
    const statuses = stepStatuses(updated, upgrading);

    const second = updated.steps.findIndex((s, i) => s.action.type === 'upgrade' && !s.done && i > 0);
    const move = updated.steps.findIndex((s) => s.action.type === 'chain');
    expect(statuses[second]).toBe('waiting');
    expect(statuses[move]).toBe('next');
  });
});

describe('a sale', () => {
  it('is done once the building is gone, even when its id comes back on something else', () => {
    const start = city([building(2, 'Totem', 5, 5)]);
    const checklist = toChecklist(start, target([]), rules, 1);
    const sold = doInGame(start, checklist.steps[0].action);
    const reused: SimCity = { ...sold, buildings: new Map(sold.buildings).set(2, building(2, 'S_Humans_Trail', 9, 9)) };

    expect(isDone(checklist.steps[0].expect, reused)).toBe(true);
  });
});

describe('street tiles in a building’s way', () => {
  const DWARVEN = 'S_Humans_Dwarven';
  const start = { ...city([building(2, 'Factory', 5, 5)]), streets: new Map([[tileKey(10, 10), DWARVEN]]) };
  const goal = target([building(2, 'Factory', 10, 10)]);
  const tileAt = (x: number, y: number) => ({ ...start, streets: new Map([[tileKey(x, y), DWARVEN]]) });

  it('are a line before the move, done however they are vacated', () => {
    const { steps } = toChecklist(start, goal, rules, 1);

    expect(steps.map((s) => s.action.type)).toEqual(['sellStreets', 'chain']);
    expect(isDone(steps[0].expect, tileAt(17, 17))).toBe(true);
  });

  it('come back as a line of their own when moved onto ground the building still needs', () => {
    const checklist = toChecklist(start, goal, rules, 1);
    const updated = updateChecklist(checklist, tileAt(11, 11), goal, rules);

    expect(updated.steps.map((s) => [s.action.type, s.done])).toEqual([
      ['sellStreets', true],
      ['sellStreets', false],
      ['chain', false],
    ]);
    expect(updated.steps[1].action).toMatchObject({ tiles: [{ x: 11, y: 11 }] });
  });
});

describe('an upgrade of a building with no street connection', () => {
  it('is planned all the same, and waits for the player to lay one', () => {
    const needsStreet = { connection: 'mainHall' as const };
    const start = city([building(2, 'Residence', 10, 10, 2, 2, needsStreet)]);
    const checklist = toChecklist(start, target([building(2, 'Residence', 10, 10, 2, 2, { level: 2 })]), rules, 1);

    expect(checklist.steps.map((s) => s.action.type)).toEqual(['upgrade']);
    expect(stepStatuses(checklist, start)).toEqual(['waiting']);
  });
});
