import {
  applyAction,
  connectedToMainHall,
  connectionKindFor,
  isConnected,
  SimAction,
  SimBuilding,
  SimCity,
  SimResult,
  tileKey,
} from './rulesSimulator';

/**
 * Each case is a rule of the game as observed on 2026-10-26, either captured from the game's own
 * requests or stated by a player. The simulator is only as good as these.
 */

const MAIN_HALL = 1;

const building = (
  id: number,
  x: number,
  y: number,
  width = 2,
  length = 2,
  extra: Partial<SimBuilding> = {},
): SimBuilding => ({
  id,
  kind: `B${id}`,
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

/** A 20 x 20 unlocked city with the Main Hall in the top-left corner, as a 4 x 4. */
const city = (buildings: SimBuilding[], streets: [number, number][] = [], builders = 2): SimCity => ({
  buildings: new Map([building(MAIN_HALL, 0, 0, 4, 4), ...buildings].map((b) => [b.id, b])),
  streets: new Map(streets.map(([x, y]) => [tileKey(x, y), 'S_Humans_Trail'])),
  unlocked: [{ x: 0, y: 0, width: 20, length: 20 }],
  mainHallId: MAIN_HALL,
  builders,
});

const play = (start: SimCity, ...actions: SimAction[]): SimResult => {
  let result: SimResult = { ok: true, city: start };
  for (const action of actions) {
    if (!result.ok) {
      return result;
    }
    result = applyAction(result.city, action);
  }
  return result;
};

const cityAfter = (result: SimResult) => {
  if (!result.ok) {
    throw new Error(`refused: ${result.refusal}`);
  }
  return result.city;
};

const at = (result: SimResult, id: number) => {
  const b = cityAfter(result).buildings.get(id);
  return b && { x: b.x, y: b.y, width: b.width, length: b.length };
};

const refusal = (result: SimResult) => (result.ok ? undefined : result.refusal);

describe('moving a building', () => {
  it('puts it down on empty ground', () => {
    const result = play(city([building(2, 10, 10)]), { type: 'chain', drops: [{ id: 2, x: 14, y: 14 }] });

    expect(at(result, 2)).toEqual({ x: 14, y: 14, width: 2, length: 2 });
  });

  it('refuses ground that is not unlocked', () => {
    const result = play(city([building(2, 10, 10)]), { type: 'chain', drops: [{ id: 2, x: 19, y: 10 }] });

    expect(refusal(result)).toBe('outside-unlocked');
  });

  it('refuses a drop on a street, which is never picked up', () => {
    const result = play(city([building(2, 10, 10)], [[15, 15]]), { type: 'chain', drops: [{ id: 2, x: 14, y: 14 }] });

    expect(refusal(result)).toBe('on-street');
  });

  it('may be dropped over its own old spot', () => {
    const result = play(city([building(2, 10, 10)]), { type: 'chain', drops: [{ id: 2, x: 11, y: 10 }] });

    expect(at(result, 2)).toMatchObject({ x: 11, y: 10 });
  });

  it('needs no builder', () => {
    const result = play(city([building(2, 10, 10)], [], 0), { type: 'chain', drops: [{ id: 2, x: 14, y: 14 }] });

    expect(result.ok).toBe(true);
  });

  it('can be done while the building is being upgraded', () => {
    const result = play(city([building(2, 10, 10, 2, 2, { busy: true })]), {
      type: 'chain',
      drops: [{ id: 2, x: 14, y: 14 }],
    });

    expect(at(result, 2)).toMatchObject({ x: 14, y: 14 });
  });
});

describe('a drop on another building', () => {
  it('lifts that building when it covers only that one, and the drag goes on', () => {
    const result = play(city([building(2, 10, 10), building(3, 14, 10)]), {
      type: 'chain',
      drops: [
        { id: 2, x: 14, y: 10 },
        { id: 3, x: 10, y: 15 },
      ],
    });

    expect(at(result, 2)).toMatchObject({ x: 14, y: 10 });
    expect(at(result, 3)).toMatchObject({ x: 10, y: 15 });
  });

  it('counts as covering one when it also covers empty ground', () => {
    const result = play(city([building(2, 10, 10), building(3, 14, 10)]), {
      type: 'chain',
      drops: [
        { id: 2, x: 15, y: 11 },
        { id: 3, x: 10, y: 15 },
      ],
    });

    expect(result.ok).toBe(true);
  });

  it('is refused when it covers two buildings', () => {
    const result = play(city([building(2, 10, 10, 4, 2), building(3, 14, 10), building(4, 16, 10)]), {
      type: 'chain',
      drops: [{ id: 2, x: 14, y: 10 }],
    });

    expect(refusal(result)).toBe('touches-several');
  });

  it('closes a loop with no free ground: the last building drops into the first one’s spot', () => {
    const result = play(city([building(2, 10, 10), building(3, 12, 10), building(4, 14, 10)]), {
      type: 'chain',
      drops: [
        { id: 2, x: 12, y: 10 },
        { id: 3, x: 14, y: 10 },
        { id: 4, x: 10, y: 10 },
      ],
    });

    expect([at(result, 2), at(result, 3), at(result, 4)].map((b) => b?.x)).toEqual([12, 14, 10]);
  });

  it('treats the Main Hall like any other building, lifting it too', () => {
    const result = play(city([building(2, 10, 10, 4, 4)]), {
      type: 'chain',
      drops: [
        { id: 2, x: 0, y: 0 },
        { id: MAIN_HALL, x: 10, y: 10 },
      ],
    });

    expect(at(result, MAIN_HALL)).toMatchObject({ x: 10, y: 10 });
    expect(at(result, 2)).toMatchObject({ x: 0, y: 0 });
  });

  it('is all or nothing: a drag that ends with a building on the cursor changes nothing', () => {
    const result = play(city([building(2, 10, 10), building(3, 14, 10)]), {
      type: 'chain',
      drops: [{ id: 2, x: 14, y: 10 }],
    });

    expect(refusal(result)).toBe('still-carrying');
  });

  it('has to put down the building that was lifted, not another', () => {
    const result = play(city([building(2, 10, 10), building(3, 14, 10), building(4, 6, 14)]), {
      type: 'chain',
      drops: [
        { id: 2, x: 14, y: 10 },
        { id: 4, x: 10, y: 15 },
      ],
    });

    expect(refusal(result)).toBe('out-of-order');
  });

  it('cannot go on once the cursor is empty', () => {
    const result = play(city([building(2, 10, 10), building(3, 14, 14)]), {
      type: 'chain',
      drops: [
        { id: 2, x: 10, y: 14 },
        { id: 3, x: 6, y: 14 },
      ],
    });

    expect(refusal(result)).toBe('out-of-order');
  });
});

describe('upgrading a building', () => {
  it('grows it in place from its top-left corner when the new shape fits', () => {
    const result = play(city([building(2, 10, 10)]), { type: 'upgrade', id: 2, width: 3, length: 3 });

    expect(at(result, 2)).toEqual({ x: 10, y: 10, width: 3, length: 3 });
    expect(cityAfter(result).buildings.get(2)?.busy).toBe(true);
  });

  it('cannot stay in place when the new shape does not fit', () => {
    const result = play(city([building(2, 10, 10), building(3, 12, 10)]), {
      type: 'upgrade',
      id: 2,
      width: 3,
      length: 3,
    });

    expect(refusal(result)).toBe('does-not-fit');
  });

  it('is handed over to be put down elsewhere when the new shape does not fit', () => {
    const result = play(city([building(2, 10, 10), building(3, 12, 10)]), {
      type: 'upgradeAndMove',
      id: 2,
      width: 3,
      length: 3,
      drops: [{ id: 2, x: 14, y: 14 }],
    });

    expect(at(result, 2)).toEqual({ x: 14, y: 14, width: 3, length: 3 });
  });

  it('cannot be handed over when the new shape fits where it stands', () => {
    const result = play(city([building(2, 10, 10)]), {
      type: 'upgradeAndMove',
      id: 2,
      width: 3,
      length: 3,
      drops: [{ id: 2, x: 14, y: 14 }],
    });

    expect(refusal(result)).toBe('fits-in-place');
  });

  it('starts a chain when the handed-over building is dropped on another', () => {
    const result = play(city([building(2, 10, 10), building(3, 12, 10), building(4, 15, 15)]), {
      type: 'upgradeAndMove',
      id: 2,
      width: 3,
      length: 3,
      drops: [
        { id: 2, x: 15, y: 15 },
        { id: 4, x: 10, y: 14 },
      ],
    });

    expect(at(result, 2)).toMatchObject({ x: 15, y: 15, width: 3 });
    expect(at(result, 4)).toMatchObject({ x: 10, y: 14 });
  });

  it('cannot be queued: the next upgrade waits for this one to finish', () => {
    const start = city([building(2, 10, 10)]);
    const second = { type: 'upgrade', id: 2, width: 3, length: 4 } as const;

    expect(refusal(play(start, { type: 'upgrade', id: 2, width: 3, length: 3 }, second))).toBe('busy');
    expect(play(start, { type: 'upgrade', id: 2, width: 3, length: 3 }, { type: 'finish', id: 2 }, second).ok).toBe(
      true,
    );
  });

  it('takes a free builder', () => {
    const start = city([building(2, 10, 10, 2, 2, { busy: true }), building(3, 14, 14)], [], 1);

    expect(refusal(play(start, { type: 'upgrade', id: 3, width: 2, length: 3 }))).toBe('no-builder');
  });

  it('cannot be started on a disconnected building that needs a street', () => {
    const start = city([building(2, 10, 10, 2, 2, { connection: 'mainHall' })]);

    expect(refusal(play(start, { type: 'upgrade', id: 2, width: 3, length: 3 }))).toBe('not-connected');
  });

  it('can be started once a street leads from it to the Main Hall', () => {
    // Down the column beside the Main Hall's right edge, then along row 10 to the building.
    const down: [number, number][] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((y) => [4, y]);
    const along: [number, number][] = [5, 6, 7, 8, 9].map((x) => [x, 10]);
    const start = city([building(2, 10, 10, 2, 2, { connection: 'mainHall' })], [...down, ...along]);

    expect(play(start, { type: 'upgrade', id: 2, width: 3, length: 3 }).ok).toBe(true);
  });
});

describe('connection to the Main Hall', () => {
  it('runs through streets side on, never across a corner', () => {
    // Touching the Main Hall at (4, 0), then a corner step to (5, 1) that does not join.
    const start = city(
      [building(2, 6, 1, 2, 2, { connection: 'mainHall' })],
      [
        [4, 0],
        [5, 1],
      ],
    );

    expect(connectedToMainHall(start, start.buildings.get(2)!)).toBe(false);
  });

  it('holds for a building touching a street that touches the Main Hall', () => {
    const start = city(
      [building(2, 6, 0, 2, 2, { connection: 'mainHall' })],
      [
        [4, 0],
        [5, 0],
      ],
    );

    expect(connectedToMainHall(start, start.buildings.get(2)!)).toBe(true);
  });

  it('does not hold for a building only touching the Main Hall', () => {
    const start = city([building(2, 4, 0, 2, 2, { connection: 'mainHall' })]);

    expect(connectedToMainHall(start, start.buildings.get(2)!)).toBe(false);
  });
});

describe('connection, by kind', () => {
  it('is never needed by a standalone building', () => {
    const start = city([building(2, 10, 10, 2, 2, { connection: 'none' })]);

    expect(isConnected(start, start.buildings.get(2)!)).toBe(true);
  });

  it('takes the game’s word for the kinds it cannot work out', () => {
    // Settlement and guest-race buildings connect by their own streets or to their portal.
    const start = city([
      building(2, 10, 10, 2, 2, { connection: 'asReported', reportedConnected: true }),
      building(3, 14, 14, 2, 2, { connection: 'asReported', reportedConnected: false }),
    ]);

    expect(isConnected(start, start.buildings.get(2)!)).toBe(true);
    expect(isConnected(start, start.buildings.get(3)!)).toBe(false);
  });

  describe('for a set', () => {
    // A street from the Main Hall's right edge to (5, 0), touching the set piece at (6, 0).
    const street: [number, number][] = [
      [4, 0],
      [5, 0],
    ];
    const piece = (id: number, x: number, y: number, setKey = 'Boughsong_Terraces') =>
      building(id, x, y, 2, 2, { connection: 'set', setKey });
    const connected = (start: SimCity, id: number) => isConnected(start, start.buildings.get(id)!);

    it('passes along a chain of touching pieces', () => {
      const start = city([piece(2, 6, 0), piece(3, 8, 0), piece(4, 10, 1)], street);

      expect([connected(start, 2), connected(start, 3), connected(start, 4)]).toEqual([true, true, true]);
    });

    it('does not reach a piece standing apart, even one row away', () => {
      // As the second Harping Hollow stood: a row of ground between it and the rest of its set.
      const start = city([piece(2, 6, 0), piece(3, 6, 3)], street);

      expect(connected(start, 3)).toBe(false);
    });

    it('does not pass across a corner', () => {
      const start = city([piece(2, 6, 0), piece(3, 8, 2)], street);

      expect(connected(start, 3)).toBe(false);
    });

    it('is not lent by a touching building of another set', () => {
      const start = city([piece(2, 6, 0, 'Floating_Garden'), piece(3, 8, 0)], street);

      expect(connected(start, 3)).toBe(false);
    });

    it('is the building’s own when its set is not known', () => {
      const keyless = (id: number, x: number) => building(id, x, 0, 2, 2, { connection: 'set' });
      const start = city([keyless(2, 6), keyless(3, 8)], street);

      expect([connected(start, 2), connected(start, 3)]).toEqual([true, false]);
    });
  });

  it('is read from the catalogue’s connection strategy', () => {
    expect(connectionKindFor('townhall')).toBe('mainHall');
    expect(connectionKindFor('standalone')).toBe('none');
    expect(connectionKindFor('set_buildings')).toBe('set');
    expect(connectionKindFor('dwarfs_2')).toBe('asReported');
    expect(connectionKindFor(undefined)).toBe('asReported');
  });
});

describe('placing from the inventory', () => {
  const totem = building(9, 14, 14, 2, 2);

  it('takes a free builder and empty ground', () => {
    const result = play(city([]), { type: 'place', building: totem });

    expect(at(result, 9)).toMatchObject({ x: 14, y: 14 });
    expect(cityAfter(result).buildings.get(9)?.busy).toBe(true);
  });

  it('waits for a builder', () => {
    expect(refusal(play(city([], [], 0), { type: 'place', building: totem }))).toBe('no-builder');
  });

  it('cannot go on a building or a street', () => {
    expect(refusal(play(city([building(2, 15, 15)]), { type: 'place', building: totem }))).toBe('does-not-fit');
    expect(refusal(play(city([], [[14, 14]]), { type: 'place', building: totem }))).toBe('on-street');
  });
});

describe('selling', () => {
  it('takes the building away', () => {
    const result = play(city([building(2, 10, 10)]), { type: 'sell', id: 2 });

    expect(cityAfter(result).buildings.has(2)).toBe(false);
  });

  it('never takes the Main Hall', () => {
    expect(refusal(play(city([]), { type: 'sell', id: MAIN_HALL }))).toBe('main-hall');
  });

  it('takes the street tiles named, and only street tiles', () => {
    const start = city(
      [],
      [
        [10, 10],
        [11, 10],
      ],
    );

    expect(cityAfter(play(start, { type: 'sellStreets', tiles: [{ x: 10, y: 10 }] })).streets.size).toBe(1);
    expect(refusal(play(start, { type: 'sellStreets', tiles: [{ x: 12, y: 10 }] }))).toBe('not-a-street');
  });
});

describe('laying streets', () => {
  const run = (from: [number, number], to: [number, number], street = 'S_Humans_Trail'): SimAction => ({
    type: 'layRun',
    street,
    from: { x: from[0], y: from[1] },
    to: { x: to[0], y: to[1] },
  });

  it('lays every tile of a straight run, either way round', () => {
    const result = play(city([]), run([12, 10], [10, 10]));

    expect([...cityAfter(result).streets.keys()].sort()).toEqual(['10,10', '11,10', '12,10']);
  });

  it('crosses existing street, replacing another kind', () => {
    const result = play(city([], [[11, 10]]), run([10, 10], [12, 10], 'S_Humans_Dwarven'));

    expect(cityAfter(result).streets.get('11,10')).toBe('S_Humans_Dwarven');
  });

  it('is never planned with a turn, since the game picks the turn itself', () => {
    expect(refusal(play(city([]), run([10, 10], [12, 12])))).toBe('not-straight');
  });

  it('counts as blocked with a building in the way, which the game would lay the street around', () => {
    expect(refusal(play(city([building(2, 11, 9)]), run([10, 10], [14, 10])))).toBe('run-blocked');
  });
});
