/**
 * The world map's grid, which is the same on every world: flat-topped hexes in columns, `r` the
 * column and `q` the row, with every odd column sitting half a hex lower than its even neighbours.
 * What a hex holds follows from where it is, so a province's good never has to be read from the
 * game. Checked against 652 provinces on en3 and 148 on en1, cities far apart, without one miss.
 */

export interface Hex {
  r: number;
  q: number;
}

export const GOODS_BY_TIER = [
  ['marble', 'steel', 'planks'],
  ['crystal', 'scrolls', 'silk'],
  ['elixir', 'magic_dust', 'gems'],
] as const;

export type ProvinceGood = (typeof GOODS_BY_TIER)[number][number];

export const PROVINCE_GOODS: ProvinceGood[] = GOODS_BY_TIER.flat();

/**
 * Which of its tier's three goods a hex holds, by `r mod 9` then `q mod 9`. The tier itself is
 * `r mod 3`. The pattern repeats every nine hexes both ways.
 */
const CHAIN_AT = [
  '221002110',
  '002110221',
  '110221002',
  '002110221',
  '110221002',
  '221002110',
  '110221002',
  '221002110',
  '002110221',
];

const mod = (a: number, n: number) => ((a % n) + n) % n;

export const hexKey = (r: number, q: number) => `${r},${q}`;

export const parseHexKey = (key: string): Hex => {
  const [r, q] = key.split(',').map(Number);
  return { r, q };
};

/** A third of the hexes are city sites; the rest are provinces. */
export const isCityAt = (r: number, q: number) =>
  (mod(q, 3) === 0 && mod(r, 2) === 0) || (mod(q, 3) === 1 && mod(r, 2) === 1);

/** The tier of a province's good, 1 to 3. */
export const tierAt = (r: number) => mod(r, 3) + 1;

export const goodAt = (r: number, q: number): ProvinceGood =>
  GOODS_BY_TIER[mod(r, 3)][Number(CHAIN_AT[mod(r, 9)][mod(q, 9)])];

/** The six hexes touching this one. */
export const neighbours = (r: number, q: number): Hex[] => {
  // An odd column sits lower, so its diagonal neighbours are a row further down.
  const diagonal = mod(r, 2) === 0 ? q - 1 : q + 1;
  return [
    { r, q: q - 1 },
    { r, q: q + 1 },
    { r: r - 1, q },
    { r: r + 1, q },
    { r: r - 1, q: diagonal },
    { r: r + 1, q: diagonal },
  ];
};

/** How many steps apart two hexes are. */
export const hexDistance = (a: Hex, b: Hex) => {
  const toCube = ({ r, q }: Hex) => {
    const z = q - (r - mod(r, 2)) / 2;
    return [r, -r - z, z];
  };
  const [ax, ay, az] = toCube(a);
  const [bx, by, bz] = toCube(b);
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
};

/** The distance the game shows for a province: rings out from the city, the nearest ring being 0. */
export const provinceDistance = (home: Hex, province: Hex) => hexDistance(home, province) - 1;

/** Where a hex's centre is drawn, for hexes `size` from centre to corner. */
export const hexCentre = ({ r, q }: Hex, size: number) => ({
  x: 1.5 * size * r,
  y: Math.sqrt(3) * size * (q + mod(r, 2) / 2),
});

/**
 * Which way a hex lies from another as the map is drawn, in degrees clockwise from straight up,
 * to the nearest of the eight compass points.
 */
export const compassBearing = (from: Hex, to: Hex) => {
  const a = hexCentre(from, 1);
  const b = hexCentre(to, 1);
  const degrees = (Math.atan2(b.x - a.x, a.y - b.y) * 180) / Math.PI;
  return (Math.round(degrees / 45) * 45 + 360) % 360;
};

/** The corners of a hex drawn around the origin, as an SVG `points` value. */
export const hexPoints = (size: number) =>
  [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const angle = (Math.PI / 3) * i;
      return `${(size * Math.cos(angle)).toFixed(2)},${(size * Math.sin(angle)).toFixed(2)}`;
    })
    .join(' ');
