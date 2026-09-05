import {
  beside,
  columnAlong,
  countFits,
  defaultDirection,
  isFillable,
  isProducing,
  MAX_COLUMN,
  nextTile,
  sellObstacle,
} from './columnPlan';

const workshop = { x: 5, y: 5, width: 2, length: 2 };

describe('nextTile', () => {
  it('steps straight down one footprint at a time', () => {
    expect(nextTile(workshop, 'down', 0)).toEqual({ x: 5, y: 7 });
    expect(nextTile(workshop, 'down', 2)).toEqual({ x: 5, y: 11 });
    expect(nextTile({ x: 3, y: 4, width: 1, length: 3 }, 'down', 1)).toEqual({ x: 3, y: 10 });
  });

  it('steps straight across one footprint at a time', () => {
    expect(nextTile(workshop, 'across', 0)).toEqual({ x: 7, y: 5 });
    expect(nextTile(workshop, 'across', 2)).toEqual({ x: 11, y: 5 });
    expect(nextTile({ x: 3, y: 4, width: 3, length: 1 }, 'across', 1)).toEqual({ x: 9, y: 4 });
  });
});

describe('columnAlong', () => {
  it('collects what it finds in line until the first miss', () => {
    const names: Record<string, string> = { '5,7': 'a', '5,9': 'b', '5,13': 'd', '7,5': 'e' };
    expect(columnAlong(workshop, 'down', (x, y) => names[`${x},${y}`])).toEqual(['a', 'b']);
    expect(columnAlong(workshop, 'across', (x, y) => names[`${x},${y}`])).toEqual(['e']);
  });

  it('is empty when the next tile holds nothing', () => {
    expect(columnAlong(workshop, 'down', () => undefined)).toEqual([]);
  });

  it('never looks further than the ceiling', () => {
    expect(columnAlong(workshop, 'across', () => true)).toHaveLength(MAX_COLUMN);
  });
});

describe('countFits', () => {
  it('counts the copies that fit, up to the edge, either way', () => {
    // A 20 by 20 map: 7, 9, 11, 13, 15, 17 fit, 19 would hang over.
    expect(countFits(workshop, 'down', (_x, y, _w, l) => y + l <= 20)).toBe(6);
    expect(countFits(workshop, 'across', (x, _y, w) => x + w <= 20)).toBe(6);
  });

  it('stops at the first tile that is taken rather than skipping over it', () => {
    expect(countFits(workshop, 'down', (x, y) => !(x === 5 && y === 11))).toBe(2);
    expect(countFits(workshop, 'across', (x, y) => !(x === 11 && y === 5))).toBe(2);
  });

  it('asks about the footprint, not just the tile', () => {
    const asked: number[] = [];
    countFits(workshop, 'down', (_x, _y, width, length) => {
      asked.push(width, length);
      return false;
    });
    expect(asked).toEqual([2, 2]);
  });
});

describe('defaultDirection', () => {
  it('goes down for a human city and across for an elven one', () => {
    expect(defaultDirection('humans')).toBe('down');
    expect(defaultDirection('elves')).toBe('across');
    expect(defaultDirection('Elves')).toBe('across');
  });

  it('goes down when the race is not known', () => {
    expect(defaultDirection(undefined)).toBe('down');
    expect(defaultDirection('')).toBe('down');
  });
});

describe('beside', () => {
  it('reads as a place after "more fit"', () => {
    expect(`3 more fit ${beside('down')} it`).toBe('3 more fit below it');
    expect(`3 more fit ${beside('across')} it`).toBe('3 more fit to the right of it');
  });
});

describe('isFillable', () => {
  it('fills workshops and manufactories and nothing else', () => {
    expect(isFillable('production')).toBe(true);
    expect(isFillable('goods')).toBe(true);
    expect(isFillable('residential')).toBe(false);
    expect(isFillable('culture')).toBe(false);
  });
});

describe('sellObstacle', () => {
  it('never sells through a construction or an upgrade', () => {
    expect(sellObstacle('construction', true)).toBe('is under construction');
    expect(sellObstacle('upgrading', true)).toBe('is under construction');
    expect(sellObstacle('pre_construction', false)).toBe('is under construction');
  });

  it('leaves a producing building alone unless told otherwise', () => {
    expect(sellObstacle('production', false)).toBe('is producing');
    expect(sellObstacle('finished', false)).toBe('is producing');
    expect(sellObstacle('production', true)).toBeUndefined();
  });

  it('has nothing against an idle or unconnected building', () => {
    expect(sellObstacle('idle', false)).toBeUndefined();
    expect(sellObstacle('unconnected', false)).toBeUndefined();
  });
});

describe('isProducing', () => {
  it('counts a running, finished or queued production', () => {
    expect(isProducing('production')).toBe(true);
    expect(isProducing('finished')).toBe(true);
    expect(isProducing('waiting')).toBe(true);
    expect(isProducing('idle')).toBe(false);
  });
});
