import { GreyFrame, sameShare } from './frameCompare';

const NO_BARS = { top: 0, bottom: 0 };

/** A picture whose every pixel is told by a function of where it is. */
const frame = (width: number, height: number, at: (x: number, y: number) => number): GreyFrame => {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[y * width + x] = at(x, y);
    }
  }
  return { width, height, data };
};

/** A busy pattern no two shifts of which look alike. */
const map = (x: number, y: number) => (x * 37 + y * 91 + ((x * y) % 13) * 17) % 256;

describe('sameShare', () => {
  it('finds a picture the same as itself', () => {
    const a = frame(64, 48, map);
    expect(sameShare(a, a, 0, 0, 6, NO_BARS)).toBe(1);
  });

  it('finds nothing the same in another picture', () => {
    const a = frame(64, 48, map);
    const b = frame(64, 48, (x, y) => map(x + 20, y + 11));
    expect(sameShare(a, b, 0, 0, 6, NO_BARS)).toBe(0);
  });

  it('follows the picture when it moved', () => {
    const a = frame(64, 48, map);
    // The map dragged 16 right and 8 down: what was at (x, y) is now at (x + 16, y + 8)
    const b = frame(64, 48, (x, y) => map(x - 16, y - 8));
    expect(sameShare(a, b, 16, 8, 6, NO_BARS)).toBe(1);
    expect(sameShare(a, b, 0, 0, 6, NO_BARS)).toBe(0);
  });

  it('counts only what a window leaves uncovered', () => {
    const a = frame(64, 64, map);
    // A window over the left half
    const b = frame(64, 64, (x, y) => (x < 32 ? 255 : map(x, y)));
    expect(sameShare(a, b, 0, 0, 6, NO_BARS)).toBe(0.5);
  });

  it('leaves the bars out', () => {
    const a = frame(64, 64, map);
    const b = frame(64, 64, (x, y) => (y < 16 || y >= 56 ? 0 : map(x, y)));
    expect(sameShare(a, b, 0, 0, 6, { top: 16, bottom: 8 })).toBe(1);
    expect(sameShare(a, b, 0, 0, 6, NO_BARS)).toBeLessThan(1);
  });

  it('has nothing to say of pictures of different sizes', () => {
    expect(sameShare(frame(64, 48, map), frame(32, 48, map), 0, 0, 6, NO_BARS)).toBe(0);
  });
});
