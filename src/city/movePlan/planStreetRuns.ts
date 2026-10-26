import { Tile, tileKey } from './rulesSimulator';

/** Streets laid by clicking one end and then the other. */
export interface StreetRun {
  street: string;
  from: Tile;
  to: Tile;
}

const parse = (key: string): Tile => {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
};

/**
 * The straight runs that lay the given tiles, as few as it can find. A run may cross tiles the
 * target already gives the same street, since the game skips those for free, so a street broken
 * by stretches that are already laid is still one run. Each pass takes the run covering the most
 * tiles still to lay - not always the fewest runs in theory, but close on the long straight lines
 * real streets are made of.
 *
 * `toLay` holds the tiles to lay and the street each takes; `target` every street tile of the
 * target layout. Nothing but street stands on a target street tile, so a run is never blocked.
 */
export const planStreetRuns = (
  toLay: ReadonlyMap<string, string>,
  target: ReadonlyMap<string, string>,
): StreetRun[] => {
  const uncovered = new Set(toLay.keys());
  const runs: StreetRun[] = [];

  /** The run along one line through `start`: as far as the street goes, trimmed to tiles still to lay. */
  const runThrough = (start: Tile, street: string, dx: number, dy: number) => {
    const sameStreet = (t: Tile) => target.get(tileKey(t.x, t.y)) === street;
    let from = start;
    while (sameStreet({ x: from.x - dx, y: from.y - dy })) {
      from = { x: from.x - dx, y: from.y - dy };
    }
    let to = start;
    while (sameStreet({ x: to.x + dx, y: to.y + dy })) {
      to = { x: to.x + dx, y: to.y + dy };
    }

    const along: Tile[] = [];
    for (let t = from; ; t = { x: t.x + dx, y: t.y + dy }) {
      if (uncovered.has(tileKey(t.x, t.y)) && toLay.get(tileKey(t.x, t.y)) === street) {
        along.push(t);
      }
      if (t.x === to.x && t.y === to.y) {
        break;
      }
    }
    return { from: along[0], to: along[along.length - 1], covers: along };
  };

  while (uncovered.size) {
    let best: { street: string; from: Tile; to: Tile; covers: Tile[] } | undefined;
    for (const key of uncovered) {
      const street = toLay.get(key)!;
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ]) {
        const run = runThrough(parse(key), street, dx, dy);
        if (!best || run.covers.length > best.covers.length) {
          best = { street, ...run };
        }
      }
    }
    for (const t of best!.covers) {
      uncovered.delete(tileKey(t.x, t.y));
    }
    runs.push({ street: best!.street, from: best!.from, to: best!.to });
  }

  return runs;
};
