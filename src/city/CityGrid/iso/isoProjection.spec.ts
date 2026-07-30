import { createIsoProjection, IsoProjectionInput } from './isoProjection';

// The live grid constants, so the golden values below match what the app renders.
const GRID: IsoProjectionInput = { GridSize: 15, GridMax: 80, PaddingTiles: 20, zoom: 1 };

describe('createIsoProjection', () => {
  it('derives the tile size and origin from the grid constants', () => {
    const p = createIsoProjection(GRID);

    // 15 * 1.8, 15 * 0.9
    expect(p.tileWidth).toBe(27);
    expect(p.tileHeight).toBe(13.5);
    // (80 + 40) * 27 / 2, and 50 + 20 * 13.5
    expect(p.originX).toBe(1620);
    expect(p.originY).toBe(320);
  });

  it('scales tile size and origin with zoom', () => {
    const p = createIsoProjection({ ...GRID, zoom: 2 });

    expect(p.tileWidth).toBe(54);
    expect(p.tileHeight).toBe(27);
    expect(p.originX).toBe(3240);
    expect(p.originY).toBe(50 + 20 * 27);
  });

  describe('toIso', () => {
    it('puts the grid origin at the top corner of the diamond', () => {
      const p = createIsoProjection(GRID);

      expect(p.toIso(0, 0)).toEqual({ x: 1620, y: 320 });
    });

    it('moves right and down along +x', () => {
      const p = createIsoProjection(GRID);

      expect(p.toIso(1, 0)).toEqual({ x: 1620 + 13.5, y: 320 + 6.75 });
    });

    it('moves left and down along +y', () => {
      const p = createIsoProjection(GRID);

      expect(p.toIso(0, 1)).toEqual({ x: 1620 - 13.5, y: 320 + 6.75 });
    });

    it('keeps the diagonal on the vertical centre line', () => {
      const p = createIsoProjection(GRID);

      expect(p.toIso(2, 2)).toEqual({ x: 1620, y: 320 + 4 * 6.75 });
      expect(p.toIso(7, 7).x).toBe(1620);
    });

    it('accepts fractional tiles, as block centres need', () => {
      const p = createIsoProjection(GRID);

      expect(p.toIso(0.5, 0.5)).toEqual({ x: 1620, y: 320 + 6.75 });
    });
  });

  describe('fromIso', () => {
    it('maps the origin back to grid zero', () => {
      const p = createIsoProjection(GRID);

      expect(p.fromIso(1620, 320)).toEqual({ x: 0, y: 0 });
    });

    it.each([
      [0, 0],
      [1, 0],
      [0, 1],
      [3, 7],
      [79, 79],
      [-20, -20],
      [12.5, 4.25],
    ])('round-trips grid (%s, %s) through toIso', (x, y) => {
      const p = createIsoProjection(GRID);
      const screen = p.toIso(x, y);
      const back = p.fromIso(screen.x, screen.y);

      expect(back.x).toBeCloseTo(x, 10);
      expect(back.y).toBeCloseTo(y, 10);
    });

    it.each([0.5, 0.75, 1, 1.5, 2, 2.5, 3])('round-trips at zoom %s', (zoom) => {
      const p = createIsoProjection({ ...GRID, zoom });
      const screen = p.toIso(31, 17);
      const back = p.fromIso(screen.x, screen.y);

      expect(back.x).toBeCloseTo(31, 10);
      expect(back.y).toBeCloseTo(17, 10);
    });

    it('returns fractional tiles rather than rounding', () => {
      const p = createIsoProjection(GRID);
      const screen = p.toIso(4.5, 2.25);

      expect(p.fromIso(screen.x, screen.y).x).toBeCloseTo(4.5, 10);
    });
  });

  it('is independent per instance, so a zoom change cannot leak', () => {
    const atOne = createIsoProjection(GRID);
    const atTwo = createIsoProjection({ ...GRID, zoom: 2 });

    expect(atOne.toIso(5, 5)).not.toEqual(atTwo.toIso(5, 5));
    expect(atOne.tileWidth).toBe(27);
  });
});
