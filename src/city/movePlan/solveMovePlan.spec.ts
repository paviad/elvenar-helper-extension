import { TargetBuilding } from './matchBuildings';
import { applyAction, SimAction, SimBuilding, SimCity, tileKey } from './rulesSimulator';
import { SizeAt, solveMovePlan, TargetCity } from './solveMovePlan';

const MAIN_HALL = 1;
const TRAIL = 'S_Humans_Trail';

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

const mainHall = () => building(MAIN_HALL, 'MH', 0, 0, 3, 3);

const city = (buildings: SimBuilding[], streets: [number, number][] = [], size = 20, builders = 2): SimCity => ({
  buildings: new Map([mainHall(), ...buildings].map((b) => [b.id, b])),
  streets: new Map(streets.map(([x, y]) => [tileKey(x, y), TRAIL])),
  unlocked: [{ x: 0, y: 0, width: size, length: size }],
  mainHallId: MAIN_HALL,
  builders,
});

const spotOf = ({ id: _id, busy: _busy, ...rest }: SimBuilding): TargetBuilding => rest;

const target = (buildings: SimBuilding[], streets: [number, number][] = []): TargetCity => ({
  buildings: [mainHall(), ...buildings].map(spotOf),
  streets: new Map(streets.map(([x, y]) => [tileKey(x, y), TRAIL])),
});

/** Every kind keeps its size at every level, unless a test says otherwise. */
const sameSize: SizeAt = () => ({ width: 2, length: 2 });

/** Plays the steps from the start, as the player would, and fails on the first the rules refuse. */
const replay = (start: SimCity, steps: SimAction[]) => {
  let at = start;
  for (const step of steps) {
    const result = applyAction(at, step);
    if (!result.ok) {
      throw new Error(`step ${JSON.stringify(step)} refused: ${result.refusal}`);
    }
    at = result.city;
  }
  return at;
};

/** What a city looks like, ignoring ids: which kind stands where, at which level. */
const layout = (buildings: Iterable<{ kind: string; x: number; y: number; level: number }>) =>
  [...buildings].map((b) => `${b.kind}@${b.x},${b.y}:${b.level}`).sort();

const expectReached = (start: SimCity, goal: TargetCity, sizeAt: SizeAt = sameSize) => {
  const plan = solveMovePlan(start, goal, sizeAt);
  expect(plan.unresolved).toEqual([]);
  const end = replay(start, plan.steps);
  expect(layout(end.buildings.values())).toEqual(layout(goal.buildings));
  expect([...end.streets].sort()).toEqual([...goal.streets].sort());
  return plan;
};

const chains = (steps: SimAction[]) => steps.filter((s) => s.type === 'chain');

describe('solveMovePlan', () => {
  it('has nothing to do for a city already in place', () => {
    const start = city([building(2, 'A', 5, 5)]);

    expect(solveMovePlan(start, target([building(2, 'A', 5, 5)]), sameSize).steps).toEqual([]);
  });

  it('swaps two buildings in one drag, with no free ground needed', () => {
    const plan = expectReached(
      city([building(2, 'A', 5, 5), building(3, 'B', 7, 5)], [], 9),
      target([building(2, 'A', 7, 5), building(3, 'B', 5, 5)]),
    );

    expect(plan.steps).toHaveLength(1);
  });

  it('turns a loop of three into one drag', () => {
    const plan = expectReached(
      city([building(2, 'A', 3, 5), building(3, 'B', 5, 5), building(4, 'C', 7, 5)], [], 9),
      target([building(2, 'A', 5, 5), building(3, 'B', 7, 5), building(4, 'C', 3, 5)]),
    );

    expect(chains(plan.steps)).toHaveLength(1);
  });

  it('sets a building aside when every move is blocked by two or more buildings', () => {
    // A bar over three single tiles, the target swapping the rows: whatever goes first lands on two.
    const start = city([
      building(2, 'Bar', 5, 5, 3, 1),
      building(3, 'One', 5, 6, 1, 1),
      building(4, 'One', 6, 6, 1, 1),
      building(5, 'One', 7, 6, 1, 1),
    ]);
    const goal = target([
      building(2, 'Bar', 5, 6, 3, 1),
      building(3, 'One', 5, 5, 1, 1),
      building(4, 'One', 6, 5, 1, 1),
      building(5, 'One', 7, 5, 1, 1),
    ]);

    // Identical single tiles go straight up into the spots above them; only the bar is in the way.
    const plan = expectReached(start, goal);
    expect(chains(plan.steps).length).toBeGreaterThan(1);
  });

  it('sells the street tiles under a spot just before the move that needs them', () => {
    const start = city([building(2, 'A', 5, 5)], [[10, 10]]);
    const plan = expectReached(start, target([building(2, 'A', 10, 10)]));

    expect(plan.steps.map((s) => s.type)).toEqual(['sellStreets', 'chain']);
  });

  it('sells the streets the target does without and lays its new ones in straight runs', () => {
    const start = city([], [[10, 10]]);
    const goal = target(
      [],
      [5, 6, 7, 8].map((x) => [x, 12] as [number, number]),
    );

    const plan = expectReached(start, goal);
    expect(plan.steps.map((s) => s.type)).toEqual(['sellStreets', 'layRun']);
  });

  it('upgrades a building that needs a street only after the street that connects it is laid', () => {
    // The street runs from the Main Hall's right edge along row 0 to the building at (6, 0).
    const needsStreet = { connection: 'mainHall' as const };
    const start = city([building(2, 'R', 6, 0, 2, 2, needsStreet)]);
    const goal = target(
      [building(2, 'R', 6, 0, 2, 2, { ...needsStreet, level: 2 })],
      [3, 4, 5].map((x) => [x, 0] as [number, number]),
    );

    const plan = expectReached(start, goal);
    const types = plan.steps.map((s) => s.type);
    expect(types.indexOf('layRun')).toBeLessThan(types.indexOf('upgrade'));
  });

  it('grows a building through each level it has to climb, one upgrade at a time', () => {
    const grows: SizeAt = (_kind, level) => ({ width: 2, length: level });
    const start = city([building(2, 'R', 10, 10, 2, 1)]);
    const goal = target([building(2, 'R', 10, 10, 2, 3, { level: 3 })]);

    const plan = expectReached(start, goal, grows);
    expect(plan.steps.map((s) => s.type)).toEqual(['upgrade', 'finish', 'upgrade', 'finish']);
  });

  describe('a building whose upgrade changes its shape beyond its final one', () => {
    // 2 x 4 now, 3 x 3 at level 2: put at its final spot as it is, it would stick out a row.
    const reshaped: SizeAt = (_kind, level) => (level === 1 ? { width: 2, length: 4 } : { width: 3, length: 3 });

    it('is upgraded where it stands when the new shape fits there, then moved', () => {
      const start = city([building(2, 'R', 10, 10, 2, 4)]);
      const goal = target([building(2, 'R', 14, 4, 3, 3, { level: 2 })]);

      const plan = expectReached(start, goal, reshaped);
      expect(plan.steps.map((s) => s.type)).toEqual(['upgrade', 'chain']);
    });

    it('is put down straight on its spot when the game hands it over and the spot is free', () => {
      // A neighbour against its right side, so the 3 x 3 cannot grow in place.
      const start = city([building(2, 'R', 10, 10, 2, 4), building(3, 'N', 12, 10)]);
      const goal = target([building(2, 'R', 14, 4, 3, 3, { level: 2 }), building(3, 'N', 12, 10)]);

      const plan = expectReached(start, goal, reshaped);
      expect(plan.steps.map((s) => s.type)).toEqual(['upgradeAndMove']);
    });

    it('is said to need a street when it cannot be upgraded where it stands', () => {
      const start = city([building(2, 'R', 10, 10, 2, 4, { connection: 'mainHall' })]);
      const goal = target([building(2, 'R', 14, 4, 3, 3, { connection: 'mainHall', level: 2 })]);

      expect(solveMovePlan(start, goal, reshaped).unresolved.map((u) => u.reason)).toEqual(['not-connected']);
    });
  });

  it('keeps to the builders there are', () => {
    const start = city([building(2, 'R', 5, 5), building(3, 'R', 10, 10)], [], 20, 1);
    const goal = target([building(2, 'R', 5, 5, 2, 2, { level: 2 }), building(3, 'R', 10, 10, 2, 2, { level: 2 })]);

    const plan = expectReached(start, goal);
    expect(plan.steps.map((s) => s.type)).toEqual(['upgrade', 'finish', 'upgrade', 'finish']);
  });

  it('places from the inventory what the city does not have', () => {
    const plan = expectReached(city([]), target([building(9, 'Totem', 12, 12)]));

    expect(plan.steps.map((s) => s.type)).toEqual(['place', 'finish']);
  });

  it('says what it cannot do instead of planning around it', () => {
    const start = city([building(2, 'R', 5, 5, 2, 2, { level: 3 })]);
    const plan = solveMovePlan(
      start,
      target([building(2, 'R', 5, 5, 2, 2, { level: 2 }), building(3, 'C', 25, 25)]),
      sameSize,
    );

    expect(plan.unresolved.map((u) => u.reason).sort()).toEqual(['locked', 'lower-level']);
  });

  it('says so when there is no ground left to set a building aside on', () => {
    // The bar-and-tiles swap again, on ground with no spare tile at all.
    const start: SimCity = {
      ...city([
        building(2, 'Bar', 5, 5, 3, 1),
        building(3, 'One', 5, 6, 1, 1),
        building(4, 'Two', 6, 6, 1, 1),
        building(5, 'Three', 7, 6, 1, 1),
      ]),
      unlocked: [
        { x: 0, y: 0, width: 3, length: 3 },
        { x: 5, y: 5, width: 3, length: 2 },
      ],
    };
    const goal = target([
      building(2, 'Bar', 5, 6, 3, 1),
      building(3, 'One', 5, 5, 1, 1),
      building(4, 'Two', 6, 5, 1, 1),
      building(5, 'Three', 7, 5, 1, 1),
    ]);

    expect(solveMovePlan(start, goal, sameSize).unresolved.map((u) => u.reason)).toEqual(['no-room']);
  });
});

/** A small seeded generator, so a failing case can be found again from its seed. */
const random = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * A random city and a random rearrangement of it: the same buildings shuffled to new spots, some
 * sold, some new ones placed, new streets. The plan has to reach the target with every step one
 * the rules accept - or say why not, which with this much free ground it never should.
 */
const randomCase = (seed: number) => {
  const next = random(seed);
  const int = (n: number) => Math.floor(next() * n);
  const size = 18;
  const kinds = ['1x1', '2x1', '1x2', '2x2', '3x2', '2x3'].map((k) => {
    const [w, l] = k.split('x').map(Number);
    return { kind: `K${k}`, w, l };
  });

  const scatter = (count: number, avoid: Set<string>) => {
    const placed: { kind: string; x: number; y: number; w: number; l: number }[] = [];
    for (let tries = 0; placed.length < count && tries < 500; tries++) {
      const k = kinds[int(kinds.length)];
      const x = int(size - k.w + 1);
      const y = int(size - k.l + 1);
      const tiles: string[] = [];
      for (let dx = 0; dx < k.w; dx++) for (let dy = 0; dy < k.l; dy++) tiles.push(tileKey(x + dx, y + dy));
      if (tiles.some((t) => avoid.has(t))) continue;
      tiles.forEach((t) => avoid.add(t));
      placed.push({ ...k, x, y });
    }
    return placed;
  };
  const hall = new Set<string>();
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) hall.add(tileKey(x, y));

  const taken = new Set(hall);
  const before = scatter(4 + int(10), taken);
  const streetsBefore = Array.from({ length: int(12) }, () => [int(size), int(size)] as [number, number]).filter(
    ([x, y]) => !taken.has(tileKey(x, y)),
  );

  // The target keeps most kinds and shuffles where they stand.
  const targetTaken = new Set(hall);
  const kept = before.filter(() => next() > 0.2);
  const after: typeof before = [];
  for (const b of kept) {
    const [moved] = scatterOne(b, targetTaken);
    if (moved) after.push(moved);
  }
  after.push(...scatter(int(3), targetTaken));
  const streetsAfter: [number, number][] = [];
  for (let i = 0; i < 3; i++) {
    const x = int(size - 4);
    const y = int(size);
    const run = [0, 1, 2, 3].map((d) => [x + d, y] as [number, number]);
    if (run.every(([rx, ry]) => !targetTaken.has(tileKey(rx, ry)))) {
      run.forEach(([rx, ry]) => targetTaken.add(tileKey(rx, ry)));
      streetsAfter.push(...run);
    }
  }

  function scatterOne(b: (typeof before)[number], avoid: Set<string>) {
    for (let tries = 0; tries < 200; tries++) {
      const x = int(size - b.w + 1);
      const y = int(size - b.l + 1);
      const tiles: string[] = [];
      for (let dx = 0; dx < b.w; dx++) for (let dy = 0; dy < b.l; dy++) tiles.push(tileKey(x + dx, y + dy));
      if (tiles.some((t) => avoid.has(t))) continue;
      tiles.forEach((t) => avoid.add(t));
      return [{ ...b, x, y }];
    }
    return [];
  }

  const start = city(
    before.map((b, i) => building(i + 2, b.kind, b.x, b.y, b.w, b.l)),
    streetsBefore,
    size,
  );
  const goal = target(
    after.map((b, i) => building(100 + i, b.kind, b.x, b.y, b.w, b.l)),
    streetsAfter,
  );
  const sizeAt: SizeAt = (kind) => {
    const k = kinds.find((c) => c.kind === kind)!;
    return { width: k.w, length: k.l };
  };
  return { start, goal, sizeAt };
};

/**
 * A patch of city packed tight - a 6 x 6 block with hardly a tile spare - rearranged into another
 * packing of the same pieces. Here a drop nearly always lands on something, so this is where the
 * chains and the setting aside get exercised. There is free ground around the block to set a
 * building down on.
 */
const denseCase = (seed: number) => {
  const next = random(seed);
  const int = (n: number) => Math.floor(next() * n);
  const shapes = [
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2],
  ];
  const at = 6;
  const side = 6;

  /** Packs the pieces into the block at random, or gives up. */
  const pack = (pieces: number[][]) => {
    for (let attempt = 0; attempt < 300; attempt++) {
      const taken = new Set<string>();
      const spots: { x: number; y: number }[] = [];
      for (const [w, l] of pieces) {
        let spot: { x: number; y: number } | undefined;
        for (let tries = 0; tries < 60 && !spot; tries++) {
          const x = at + int(side - w + 1);
          const y = at + int(side - l + 1);
          const tiles: string[] = [];
          for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < l; dy++) tiles.push(tileKey(x + dx, y + dy));
          if (tiles.every((t) => !taken.has(t))) {
            tiles.forEach((t) => taken.add(t));
            spot = { x, y };
          }
        }
        if (!spot) break;
        spots.push(spot);
      }
      if (spots.length === pieces.length) return spots;
    }
  };

  let pieces: number[][] = [];
  let first: { x: number; y: number }[] | undefined;
  for (let area = 0; area < 28;) {
    const shape = shapes[int(shapes.length)];
    const tryPieces = [...pieces, shape];
    const packed = pack(tryPieces);
    if (!packed) break;
    pieces = tryPieces;
    first = packed;
    area += shape[0] * shape[1];
  }
  const second = pack(pieces)!;

  // A few kinds per shape, so some pieces are interchangeable and some are not.
  const kindOf = (i: number) => `K${pieces[i][0]}x${pieces[i][1]}#${i % 3}`;
  const start = city(pieces.map(([w, l], i) => building(i + 2, kindOf(i), first![i].x, first![i].y, w, l)));
  const goal = target(pieces.map(([w, l], i) => building(i + 2, kindOf(i), second[i].x, second[i].y, w, l)));
  const sizeAt: SizeAt = (kind) => {
    const [w, l] = kind.slice(1).split('#')[0].split('x').map(Number);
    return { width: w, length: l };
  };
  return { start, goal, sizeAt };
};

/**
 * Buildings that grow or shrink in either direction from one level to the next, as build-menu
 * buildings do, each going up between none and two levels on the way to a new spot.
 */
const reshapeCase = (seed: number) => {
  const next = random(seed);
  const int = (n: number) => Math.floor(next() * n);
  const size = 18;
  const shapes = [
    [1, 1],
    [1, 2],
    [2, 1],
    [2, 2],
    [3, 2],
    [2, 3],
    [3, 1],
    [1, 3],
  ];
  const kinds = [0, 1, 2, 3, 4].map((k) => ({
    kind: `K${k}`,
    levels: [0, 1, 2].map(() => shapes[int(shapes.length)]),
  }));
  const sizeAt: SizeAt = (kind, level) => {
    const [width, length] = kinds.find((k) => k.kind === kind)!.levels[level - 1];
    return { width, length };
  };

  const taken = new Set<string>();
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) taken.add(tileKey(x, y));
  const targetTaken = new Set(taken);
  const put = (avoid: Set<string>, w: number, l: number) => {
    for (let tries = 0; tries < 300; tries++) {
      const x = int(size - w + 1);
      const y = int(size - l + 1);
      const tiles: string[] = [];
      for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < l; dy++) tiles.push(tileKey(x + dx, y + dy));
      if (tiles.some((t) => avoid.has(t))) continue;
      tiles.forEach((t) => avoid.add(t));
      return { x, y };
    }
  };

  const before: SimBuilding[] = [];
  const after: SimBuilding[] = [];
  for (let i = 0; i < 4 + int(8); i++) {
    const k = kinds[int(kinds.length)];
    const now = sizeAt(k.kind, 1)!;
    const level = 1 + int(3);
    const then = sizeAt(k.kind, level)!;
    const here = put(taken, now.width, now.length);
    const there = here && put(targetTaken, then.width, then.length);
    if (!here || !there) continue;
    before.push(building(i + 2, k.kind, here.x, here.y, now.width, now.length));
    after.push(building(i + 2, k.kind, there.x, there.y, then.width, then.length, { level }));
  }
  return { start: city(before, [], size), goal: target(after), sizeAt };
};

describe('solveMovePlan on random rearrangements', () => {
  it('always reaches the target with steps the rules accept', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { start, goal, sizeAt } = randomCase(seed);
      const plan = solveMovePlan(start, goal, sizeAt);

      expect({ seed, unresolved: plan.unresolved }).toEqual({ seed, unresolved: [] });
      const end = replay(start, plan.steps);
      expect({ seed, layout: layout(end.buildings.values()) }).toEqual({ seed, layout: layout(goal.buildings) });
      expect({ seed, streets: [...end.streets.keys()].sort() }).toEqual({
        seed,
        streets: [...goal.streets.keys()].sort(),
      });
    }
  });

  it('reaches the target in a packed block, where nearly every drop lands on something', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { start, goal, sizeAt } = denseCase(seed);
      const plan = solveMovePlan(start, goal, sizeAt);

      expect({ seed, unresolved: plan.unresolved }).toEqual({ seed, unresolved: [] });
      const end = replay(start, plan.steps);
      expect({ seed, layout: layout(end.buildings.values()) }).toEqual({ seed, layout: layout(goal.buildings) });
    }
  });

  it('reaches the target when upgrades change shapes every which way', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { start, goal, sizeAt } = reshapeCase(seed);
      const plan = solveMovePlan(start, goal, sizeAt);

      expect({ seed, unresolved: plan.unresolved }).toEqual({ seed, unresolved: [] });
      const end = replay(start, plan.steps);
      expect({ seed, layout: layout(end.buildings.values()) }).toEqual({ seed, layout: layout(goal.buildings) });
      const sizes = (bs: Iterable<{ kind: string; width: number; length: number }>) =>
        [...bs].map((b) => `${b.kind}:${b.width}x${b.length}`).sort();
      expect({ seed, sizes: sizes(end.buildings.values()) }).toEqual({ seed, sizes: sizes(goal.buildings) });
    }
  });

  it('moves each building at most twice', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { start, goal, sizeAt } = (seed % 2 ? randomCase : denseCase)(seed);
      const plan = solveMovePlan(start, goal, sizeAt);
      const drops = new Map<number, number>();
      for (const step of chains(plan.steps)) {
        if (step.type === 'chain') step.drops.forEach((d) => drops.set(d.id, (drops.get(d.id) ?? 0) + 1));
      }

      expect({ seed, most: Math.max(0, ...drops.values()) <= 2 }).toEqual({ seed, most: true });
    }
  });
});
