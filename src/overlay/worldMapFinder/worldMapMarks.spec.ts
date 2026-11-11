import { hexOnScreen } from './worldMapMarks';

const HOME = { r: 62, q: 6 };
const NO_PAN = { x: 0, y: 0 };

describe('hexOnScreen', () => {
  it('puts the city in the middle of a map just opened', () => {
    expect(hexOnScreen(HOME, HOME, NO_PAN, 1920, 1032, 115)).toEqual({ x: 960, y: 516 });
  });

  it('places the hexes round it as the game draws them', () => {
    // The city two columns to the right, in the same row
    expect(hexOnScreen({ r: 64, q: 6 }, HOME, NO_PAN, 1920, 1032, 115)).toEqual({ x: 1305, y: 516 });
    // The province straight above
    const above = hexOnScreen({ r: 62, q: 5 }, HOME, NO_PAN, 1920, 1032, 115);
    expect(above.x).toBe(960);
    expect(above.y).toBeCloseTo(516 - Math.sqrt(3) * 115);
    // An odd column sits half a hex lower
    const right = hexOnScreen({ r: 63, q: 6 }, HOME, NO_PAN, 1920, 1032, 115);
    expect(right.x).toBe(960 + 172.5);
    expect(right.y).toBeCloseTo(516 + (Math.sqrt(3) * 115) / 2);
  });

  it('moves with the map', () => {
    expect(hexOnScreen(HOME, HOME, { x: -200, y: 60 }, 1920, 1032, 115)).toEqual({ x: 760, y: 576 });
  });
});
