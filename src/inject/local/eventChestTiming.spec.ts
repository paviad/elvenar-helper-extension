import { archiveIntervals, averageInterval, createEventChestClock, formatInterval } from './eventChestTiming';

describe('createEventChestClock', () => {
  it('starts the clock on the first chest and measures from there', () => {
    const clock = createEventChestClock();
    expect(clock(1000, false)).toEqual({ at: 1000, outcome: 'start' });
    expect(clock(61000, false)).toEqual({ at: 61000, outcome: 'interval', ms: 60000 });
    expect(clock(91000, false)).toEqual({ at: 91000, outcome: 'interval', ms: 30000 });
  });

  it('counts a chest that was there at load for nothing, so the next one only starts the clock', () => {
    const clock = createEventChestClock();
    expect(clock(1000, true)).toEqual({ at: 1000, outcome: 'atLoad' });
    expect(clock(61000, false)).toEqual({ at: 61000, outcome: 'start' });
    expect(clock(121000, false)).toEqual({ at: 121000, outcome: 'interval', ms: 60000 });
  });
});

describe('archiveIntervals', () => {
  it('sums up what was kept', () => {
    const intervals = [
      { at: 5000, ms: 1000 },
      { at: 2000, ms: 3000 },
    ];
    expect(archiveIntervals(intervals, 9000)).toEqual({
      archivedAt: 9000,
      from: 2000,
      to: 5000,
      count: 2,
      averageMs: 2000,
    });
  });

  it('has nothing to archive from nothing', () => {
    expect(archiveIntervals([], 9000)).toBeUndefined();
    expect(averageInterval([])).toBeUndefined();
  });
});

describe('formatInterval', () => {
  it('keeps the seconds', () => {
    expect(formatInterval(45_000)).toBe('45s');
    expect(formatInterval(750_000)).toBe('12m 30s');
    expect(formatInterval(3_849_000)).toBe('1h 04m 09s');
  });
});
