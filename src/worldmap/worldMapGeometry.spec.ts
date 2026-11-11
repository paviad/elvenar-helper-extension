import {
  compassBearing,
  goodAt,
  hexDistance,
  isCityAt,
  neighbours,
  provinceDistance,
  tierAt,
} from './worldMapGeometry';

describe('goodAt', () => {
  // Provinces as the game named them, on two worlds whose cities are a hundred hexes apart.
  it.each([
    [-46, -40, 'elixir'],
    [-63, -51, 'marble'],
    [-38, -58, 'silk'],
    [-52, -55, 'gems'],
    [-45, -60, 'marble'],
    [-32, -28, 'silk'],
    [-49, -25, 'magic_dust'],
    [-66, -31, 'steel'],
    [-26, -53, 'crystal'],
    [-66, -46, 'planks'],
    [-32, -43, 'crystal'],
    [54, 1, 'planks'],
    [62, 14, 'elixir'],
  ])('reads the good at %i,%i as %s', (r, q, good) => {
    expect(goodAt(r, q)).toBe(good);
  });

  it('takes the tier from the column', () => {
    expect([tierAt(-63), tierAt(-26), tierAt(-46), tierAt(54)]).toEqual([1, 2, 3, 1]);
  });
});

describe('isCityAt', () => {
  it('tells city sites from provinces', () => {
    // Two cities and the neighbours of the first, as the game placed them
    expect(isCityAt(-46, -42)).toBe(true);
    expect(isCityAt(62, 6)).toBe(true);
    expect(isCityAt(-47, -41)).toBe(true);
    expect(isCityAt(-48, -42)).toBe(true);
    expect(isCityAt(-47, -42)).toBe(false);
    expect(isCityAt(-46, -40)).toBe(false);
  });
});

describe('neighbours', () => {
  const keys = (r: number, q: number) =>
    neighbours(r, q)
      .map((n) => `${n.r},${n.q}`)
      .sort();

  it('reaches up from an even column and down from an odd one', () => {
    expect(keys(0, 0)).toEqual(['-1,-1', '-1,0', '0,-1', '0,1', '1,-1', '1,0']);
    expect(keys(1, 0)).toEqual(['0,0', '0,1', '1,-1', '1,1', '2,0', '2,1']);
  });

  it('is mutual', () => {
    for (const n of neighbours(-7, 3)) {
      expect(keys(n.r, n.q)).toContain('-7,3');
    }
  });
});

describe('hexDistance', () => {
  it('counts steps', () => {
    expect(hexDistance({ r: 0, q: 0 }, { r: 0, q: 0 })).toBe(0);
    expect(neighbours(5, -3).map((n) => hexDistance({ r: 5, q: -3 }, n))).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('gives the distance the game shows', () => {
    const home = { r: -46, q: -42 };
    expect(provinceDistance(home, { r: -46, q: -40 })).toBe(1);
    expect(provinceDistance(home, { r: -55, q: -49 })).toBe(10);
    expect(provinceDistance(home, { r: -66, q: -46 })).toBe(19);
    expect(provinceDistance({ r: 62, q: 6 }, { r: 54, q: 1 })).toBe(8);
  });
});

describe('compassBearing', () => {
  const home = { r: 0, q: 0 };

  it('points along the columns and the rows', () => {
    expect(compassBearing(home, { r: 0, q: -5 })).toBe(0);
    expect(compassBearing(home, { r: 6, q: 0 })).toBe(90);
    expect(compassBearing(home, { r: 0, q: 5 })).toBe(180);
    expect(compassBearing(home, { r: -6, q: 0 })).toBe(270);
  });

  it('snaps to the nearest of eight directions', () => {
    expect(compassBearing(home, { r: 6, q: -5 })).toBe(45);
    expect(compassBearing(home, { r: 6, q: 5 })).toBe(135);
    expect(compassBearing(home, { r: -6, q: 5 })).toBe(225);
    expect(compassBearing(home, { r: -6, q: -5 })).toBe(315);
    expect(compassBearing(home, { r: 1, q: -8 })).toBe(0);
  });
});
