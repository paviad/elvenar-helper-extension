import { Pixels, score, searchAll, searchNear } from './match';

/** A picture filled pixel by pixel; alpha 255 unless the paint says otherwise. */
const picture = (
  width: number,
  height: number,
  paint: (x: number, y: number) => [number, number, number, number?],
): Pixels => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a = 255] = paint(x, y);
      data.set([r, g, b, a], (y * width + x) * 4);
    }
  }
  return { width, height, data };
};

/** Something like a city: a busy pattern, so that only one placement lines it up. */
const cityAt = (x: number, y: number): [number, number, number] => [
  (x * 37 + y * 11) % 256,
  (x * x + y * 7) % 256,
  (x * 13 + y * y) % 256,
];

/** The city as the game shows it from (left, top), on plain ground, with a bar across the top. */
const frameFrom = (left: number, top: number) =>
  picture(40, 30, (x, y) => (y < 3 ? [0, 0, 0] : x % 5 === 0 ? [40, 120, 40] : cityAt(left + x, top + y)));

/** Our own drawing of it: the buildings only, every fifth column being ground it leaves out. */
const render = picture(120, 90, (x, y) => (x % 5 === 0 ? [0, 0, 0, 0] : [...cityAt(x, y), 255]));

const ignore = { top: 3, bottom: 0 };

describe('matching the game’s picture against our own', () => {
  it('agrees fully where the render lines up, though the ground and the bar differ', () => {
    expect(score(frameFrom(50, 40), render, 50, 40, ignore)).toBeCloseTo(1, 5);
    expect(score(frameFrom(50, 40), render, 51, 40, ignore)).toBeLessThan(0.5);
  });

  it('finds the placement anywhere in the city, with nothing to go on', () => {
    expect(searchAll(frameFrom(63, 22), render, 1, ignore, 1)[0]).toMatchObject({ tx: 63, ty: 22 });
  });

  it('finds the placement near a guess', () => {
    expect(searchNear(frameFrom(30, 31), render, 27, 34, 4, ignore)).toMatchObject({ tx: 30, ty: 31 });
  });

  it('does not count a placement with too little of the city in view', () => {
    expect(score(frameFrom(50, 40), render, -38, 40, ignore)).toBe(-1);
  });
});
