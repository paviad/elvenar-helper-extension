import { nextZoom } from './usePanZoom';

// The two views' ladders.
const TOP = [0.5, 0.75, 1, 1.25, 1.5, 2];
const ISO = [0.5, 0.75, 1, 1.5, 2, 2.5, 3];

const WHEEL_UP = -100;
const WHEEL_DOWN = 100;

describe('nextZoom', () => {
  it('steps in when the wheel scrolls up', () => {
    expect(nextZoom(TOP, 1, WHEEL_UP)).toBe(1.25);
    expect(nextZoom(ISO, 1, WHEEL_UP)).toBe(1.5);
  });

  it('steps out when the wheel scrolls down', () => {
    expect(nextZoom(TOP, 1, WHEEL_DOWN)).toBe(0.75);
    expect(nextZoom(ISO, 1.5, WHEEL_DOWN)).toBe(1);
  });

  it('clamps at the top of the ladder', () => {
    expect(nextZoom(TOP, 2, WHEEL_UP)).toBe(2);
    expect(nextZoom(ISO, 3, WHEEL_UP)).toBe(3);
  });

  it('clamps at the bottom of the ladder', () => {
    expect(nextZoom(TOP, 0.5, WHEEL_DOWN)).toBe(0.5);
  });

  it('does not move for a zero delta', () => {
    expect(nextZoom(TOP, 1, 0)).toBe(1);
  });

  it('tolerates floating point drift on the current zoom', () => {
    expect(nextZoom(TOP, 1.0000001, WHEEL_UP)).toBe(1.25);
  });

  it('snaps to the nearest step when the zoom is off the ladder', () => {
    // 1.1 is nearest 1, so stepping in lands on 1.25
    expect(nextZoom(TOP, 1.1, WHEEL_UP)).toBe(1.25);
    // 1.9 is nearest 2, the last step, so stepping in stays put
    expect(nextZoom(TOP, 1.9, WHEEL_UP)).toBe(2);
  });

  it('walks the whole ladder in each direction', () => {
    let zoom = TOP[0];
    for (const expected of TOP.slice(1)) {
      zoom = nextZoom(TOP, zoom, WHEEL_UP);
      expect(zoom).toBe(expected);
    }

    for (const expected of [...TOP].reverse().slice(1)) {
      zoom = nextZoom(TOP, zoom, WHEEL_DOWN);
      expect(zoom).toBe(expected);
    }
  });
});
