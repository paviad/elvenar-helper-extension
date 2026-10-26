import { matchBuildings, TargetBuilding } from './matchBuildings';
import { planStreetRuns } from './planStreetRuns';
import {
  applyAction,
  Drop,
  isConnected,
  SimAction,
  SimBuilding,
  SimCity,
  SimRefusal,
  Tile,
  tileKey,
} from './rulesSimulator';

export interface TargetCity {
  buildings: TargetBuilding[];
  /** Street tiles by `tileKey`, each with its street type. */
  streets: ReadonlyMap<string, string>;
}

/** The size a kind of building has at a level, from the catalogue. */
export type SizeAt = (kind: string, level: number) => { width: number; length: number } | undefined;

/** What the plan could not do, for the player to sort out in the planner or in the game. */
export type Unresolved =
  /** The target has it at a lower level than the city, and there is no downgrading. */
  | { reason: 'lower-level'; id: number; kind: string }
  | { reason: 'unknown-size'; id: number; kind: string }
  /** The target spot is on ground not unlocked yet. */
  | { reason: 'locked'; kind: string; x: number; y: number }
  /** Every remaining move is blocked and there is no free ground to set a building down on. */
  | { reason: 'no-room'; ids: number[] }
  | { reason: 'not-connected'; id: number; kind: string }
  /** A step the rules refused. The plan never means to make one, so this is a bug. */
  | { reason: 'refused'; action: SimAction; refusal: SimRefusal };

export interface MovePlan {
  steps: SimAction[];
  unresolved: Unresolved[];
  /** The city once every step is done. */
  city: SimCity;
}

const rect = (x: number, y: number, width: number, length: number): Tile[] => {
  const tiles: Tile[] = [];
  for (let dx = 0; dx < width; dx++) {
    for (let dy = 0; dy < length; dy++) {
      tiles.push({ x: x + dx, y: y + dy });
    }
  }
  return tiles;
};

const isUnlocked = (city: SimCity, { x, y }: Tile) =>
  city.unlocked.some((area) => x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.length);

const occupancy = (city: SimCity) => {
  const byTile = new Map<string, number>();
  for (const b of city.buildings.values()) {
    for (const t of rect(b.x, b.y, b.width, b.length)) {
      byTile.set(tileKey(t.x, t.y), b.id);
    }
  }
  return byTile;
};

const freeBuilders = (city: SimCity) => city.builders - [...city.buildings.values()].filter((b) => b.busy).length;

/**
 * The steps that turn the city into the target, every one checked against the game's rules as it
 * is chosen, so a plan never holds a step the game would refuse.
 *
 * In order: buildings with no place in the target are sold, since that frees ground for nothing;
 * buildings whose upgrades change their shape in ways that do not fit inside their final one are
 * upgraded where they stand, or wherever the game hands them over to be put down; the rest are
 * moved to their spots at the size they have now; the street tiles the target does
 * without are sold and its new streets laid; and last come placements from the inventory and
 * upgrades, which take builders and time. Upgrades go last because a building can only be
 * upgraded while connected, and the streets that connect it are laid just before.
 *
 * Moving is where the work is. A move whose spot is free is made first, as each one frees ground
 * for the others. Failing that, a chain: a building dropped on the one building in its way, that
 * one carried to its own spot, and so on until a drop lands on free ground - a loop closes into
 * the spot the first building left. When every spot is blocked by two or more buildings, the
 * building in the way of the most moves is set down on ground no target needs, and the search
 * goes on. Each building is set aside at most once, so this ends.
 */
export const solveMovePlan = (start: SimCity, target: TargetCity, sizeAt: SizeAt): MovePlan => {
  const steps: SimAction[] = [];
  const unresolved: Unresolved[] = [];
  let city = start;

  const play = (action: SimAction) => {
    const result = applyAction(city, action);
    if (!result.ok) {
      unresolved.push({ reason: 'refused', action, refusal: result.refusal });
      return result.refusal;
    }
    city = result.city;
    steps.push(action);
  };

  const matching = matchBuildings([...start.buildings.values()], target.buildings);
  for (const { current } of matching.lowerLevel) {
    unresolved.push({ reason: 'lower-level', id: current.id, kind: current.kind });
  }

  /** Ground the target puts something on, which a building set aside must keep off. */
  const reserved = new Set(target.streets.keys());
  for (const t of target.buildings) {
    for (const tile of rect(t.x, t.y, t.width, t.length)) {
      reserved.add(tileKey(tile.x, tile.y));
    }
  }
  const onUnlocked = (t: TargetBuilding) => rect(t.x, t.y, t.width, t.length).every((tile) => isUnlocked(city, tile));

  for (const building of matching.sells) {
    if (building.id !== start.mainHallId) {
      play({ type: 'sell', id: building.id });
    }
  }

  /** Each building to move, with its spot, and the sizes its upgrades take it through. */
  const pending = new Map<number, Tile>();
  const upgrades = new Map<number, { width: number; length: number }[]>();
  const upgradeFirst: { id: number; sizes: { width: number; length: number }[]; spot: Tile }[] = [];
  for (const { current, target: spot } of matching.pairings) {
    // Some buildings stand outside the grid by design - the Spire's wonder, the Guardian Grove.
    // Left where they are, they are no concern of the plan's; only going somewhere needs ground.
    const staysPut = current.x === spot.x && current.y === spot.y && current.level === spot.level;
    if (staysPut) {
      continue;
    }
    if (!onUnlocked(spot)) {
      unresolved.push({ reason: 'locked', kind: spot.kind, x: spot.x, y: spot.y });
      continue;
    }
    const sizes: { width: number; length: number }[] = [];
    for (let level = current.level + 1; level <= spot.level; level++) {
      const size = sizeAt(spot.kind, level);
      if (!size) {
        unresolved.push({ reason: 'unknown-size', id: current.id, kind: current.kind });
        break;
      }
      sizes.push(size);
    }
    if (sizes.length !== spot.level - current.level) {
      continue;
    }
    // Moved at the size it has and grown where it ends up - but only when every shape it takes on
    // the way fits inside the last one. Otherwise it would stick out over a neighbour's spot, so
    // it is grown first, where it fits, and moved at its final size.
    const nested = [current, ...sizes].every((size) => size.width <= spot.width && size.length <= spot.length);
    if (!nested) {
      upgradeFirst.push({ id: current.id, sizes, spot });
      continue;
    }
    if (current.x !== spot.x || current.y !== spot.y) {
      pending.set(current.id, { x: spot.x, y: spot.y });
    }
    if (sizes.length) {
      upgrades.set(current.id, sizes);
    }
  }

  /** The street tiles under a spot that the target does without, and so can be sold to clear it. */
  const streetsUnder = (tiles: Tile[]) =>
    tiles.filter(({ x, y }) => city.streets.has(tileKey(x, y)) && !target.streets.has(tileKey(x, y)));

  const sellStreets = (tiles: Tile[]) => {
    const unique = [...new Map(tiles.map((t) => [tileKey(t.x, t.y), t])).values()];
    if (unique.length) {
      play({ type: 'sellStreets', tiles: unique });
    }
  };

  const moveToFreeSpot = () => {
    const byTile = occupancy(city);
    for (const [id, spot] of pending) {
      const building = city.buildings.get(id)!;
      const tiles = rect(spot.x, spot.y, building.width, building.length);
      if (tiles.every(({ x, y }) => [undefined, id].includes(byTile.get(tileKey(x, y))))) {
        sellStreets(streetsUnder(tiles));
        pending.delete(id);
        return !play({ type: 'chain', drops: [{ id, ...spot }] });
      }
    }
    return false;
  };

  /** The drops of a chain starting with this building, if it closes. Worked out without playing it. */
  const chainFrom = (first: number) => {
    const byTile = occupancy(city);
    const lift = (b: SimBuilding) =>
      rect(b.x, b.y, b.width, b.length).forEach(({ x, y }) => byTile.delete(tileKey(x, y)));
    lift(city.buildings.get(first)!);

    const drops: Drop[] = [];
    const cleared: Tile[] = [];
    for (let carried: number | undefined = first; carried !== undefined;) {
      const spot = pending.get(carried);
      if (!spot || drops.some((d) => d.id === carried)) {
        return undefined;
      }
      const building: SimBuilding = city.buildings.get(carried)!;
      const tiles = rect(spot.x, spot.y, building.width, building.length);
      const covered = [...new Set(tiles.map(({ x, y }) => byTile.get(tileKey(x, y))))].filter((c) => c !== undefined);
      if (covered.length > 1) {
        return undefined;
      }
      cleared.push(...streetsUnder(tiles));
      tiles.forEach(({ x, y }) => byTile.set(tileKey(x, y), building.id));
      drops.push({ id: building.id, ...spot });
      carried = covered[0];
      if (carried !== undefined) {
        lift(city.buildings.get(carried)!);
      }
    }
    return { drops, cleared };
  };

  const moveByChain = () => {
    for (const id of pending.keys()) {
      const chain = chainFrom(id);
      if (chain) {
        sellStreets(chain.cleared);
        chain.drops.forEach((drop) => pending.delete(drop.id));
        return !play({ type: 'chain', drops: chain.drops });
      }
    }
    return false;
  };

  /**
   * Ground for a building to be put down on that no target needs: unlocked, empty but for the
   * building itself, and off the streets. When it has an upgrade still to start there, the ground
   * has to keep it connected too.
   */
  const freeGround = (b: SimBuilding, mustConnect: boolean): Tile | undefined => {
    const byTile = occupancy(city);
    const xs = city.unlocked.flatMap((a) => [a.x, a.x + a.width]);
    const ys = city.unlocked.flatMap((a) => [a.y, a.y + a.length]);
    for (let y = Math.min(...ys); y < Math.max(...ys); y++) {
      for (let x = Math.min(...xs); x < Math.max(...xs); x++) {
        const free = rect(x, y, b.width, b.length).every(
          (t) =>
            isUnlocked(city, t) &&
            [undefined, b.id].includes(byTile.get(tileKey(t.x, t.y))) &&
            !city.streets.has(tileKey(t.x, t.y)) &&
            !reserved.has(tileKey(t.x, t.y)),
        );
        if (!free) continue;
        const there = { ...b, x, y };
        if (!mustConnect || isConnected({ ...city, buildings: new Map(city.buildings).set(b.id, there) }, there)) {
          return { x, y };
        }
      }
    }
  };

  /**
   * Upgrades a building level by level where each new shape fits: in place when it fits from the
   * building's corner, or else put down where the game hands it over - on its own spot for the last
   * upgrade if that is free, otherwise on spare ground that keeps it connected for the next one.
   */
  const upgradeWhereItFits = (id: number, sizes: { width: number; length: number }[], spot: Tile) => {
    for (const [index, size] of sizes.entries()) {
      if (city.buildings.get(id)!.busy) {
        play({ type: 'finish', id });
      }
      while (freeBuilders(city) < 1) {
        const holding = [...city.buildings.values()].find((b) => b.busy);
        if (!holding) return false;
        play({ type: 'finish', id: holding.id });
      }

      const inPlace = applyAction(city, { type: 'upgrade', id, ...size });
      if (inPlace.ok) {
        play({ type: 'upgrade', id, ...size });
        continue;
      }
      const building = city.buildings.get(id)!;
      if (inPlace.refusal === 'not-connected') {
        unresolved.push({ reason: 'not-connected', id, kind: building.kind });
        return false;
      }

      const grown = { ...building, ...size };
      const last = index === sizes.length - 1;
      const ownSpot = rect(spot.x, spot.y, size.width, size.length);
      const byTile = occupancy(city);
      const ownSpotFree = ownSpot.every(({ x, y }) => [undefined, id].includes(byTile.get(tileKey(x, y))));
      let ground: Tile | undefined;
      if (last && ownSpotFree) {
        sellStreets(streetsUnder(ownSpot));
        ground = spot;
      } else {
        ground = freeGround(grown, !last);
      }
      if (!ground) {
        unresolved.push({ reason: 'no-room', ids: [id] });
        return false;
      }
      if (play({ type: 'upgradeAndMove', id, ...size, drops: [{ id, ...ground }] })) {
        return false;
      }
    }
    return true;
  };

  const setAside = () => {
    // Most in the way first: the building standing on the most spots other moves are waiting for.
    const inTheWay = [...pending.keys()]
      .map((id) => {
        const b = city.buildings.get(id)!;
        const own = new Set(rect(b.x, b.y, b.width, b.length).map(({ x, y }) => tileKey(x, y)));
        const blocks = [...pending].filter(([other, spot]) => {
          if (other === id) return false;
          const o = city.buildings.get(other)!;
          return rect(spot.x, spot.y, o.width, o.length).some(({ x, y }) => own.has(tileKey(x, y)));
        }).length;
        return { b, blocks };
      })
      .filter(({ blocks }) => blocks > 0)
      .sort((a, b) => b.blocks - a.blocks);

    for (const { b } of inTheWay) {
      const ground = freeGround(b, false);
      if (ground) {
        return !play({ type: 'chain', drops: [{ id: b.id, ...ground }] });
      }
    }
    return false;
  };

  for (const { id, sizes, spot } of upgradeFirst) {
    if (upgradeWhereItFits(id, sizes, spot)) {
      const b = city.buildings.get(id)!;
      if (b.x !== spot.x || b.y !== spot.y) {
        pending.set(id, spot);
      }
    }
  }

  while (pending.size) {
    if (moveToFreeSpot() || moveByChain() || setAside()) {
      continue;
    }
    unresolved.push({ reason: 'no-room', ids: [...pending.keys()] });
    break;
  }

  sellStreets([...city.streets.keys()].filter((key) => !target.streets.has(key)).map(parseTile));

  const toLay = new Map([...target.streets].filter(([key, street]) => city.streets.get(key) !== street));
  for (const run of planStreetRuns(toLay, target.streets)) {
    play({ type: 'layRun', ...run });
  }

  const places = matching.places.filter((spot) => {
    if (onUnlocked(spot)) return true;
    unresolved.push({ reason: 'locked', kind: spot.kind, x: spot.x, y: spot.y });
    return false;
  });
  scheduleBuilds(places, upgrades);

  return { steps, unresolved, city };

  function parseTile(key: string): Tile {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  }

  /**
   * Placements and upgrades, as many at once as there are builders. Each is started, then waited
   * for: an upgrade cannot be queued behind another on the same building, and a builder is only
   * free again once its work is done.
   */
  function scheduleBuilds(spots: TargetBuilding[], upgradesOf: Map<number, { width: number; length: number }[]>) {
    type Work = { id: number; next: SimAction[] };
    const work: Work[] = spots.map((spot, index) => {
      const id = -(index + 1);
      return { id, next: [{ type: 'place', building: { ...spot, id, busy: false } }] };
    });
    for (const [id, sizes] of upgradesOf) {
      work.push({ id, next: sizes.map(({ width, length }) => ({ type: 'upgrade', id, width, length })) });
    }
    const drop = (w: Work) => work.splice(work.indexOf(w), 1);

    while (work.length) {
      // One already being upgraded when the plan starts cannot take its next upgrade until then.
      const waiting = work.filter((w) => city.buildings.get(w.id)?.busy);
      waiting.forEach((w) => play({ type: 'finish', id: w.id }));

      if (freeBuilders(city) < 1) {
        // Every builder is on work the plan did not start; wait for one of them.
        const holding = [...city.buildings.values()].find((b) => b.busy);
        if (!holding) break;
        play({ type: 'finish', id: holding.id });
        continue;
      }

      const started: Work[] = [];
      for (const w of [...work]) {
        if (freeBuilders(city) < 1) break;
        const refusal = play(w.next[0]);
        if (refusal) {
          if (refusal === 'not-connected') {
            unresolved.pop();
            unresolved.push({ reason: 'not-connected', id: w.id, kind: city.buildings.get(w.id)!.kind });
          }
          drop(w);
          continue;
        }
        w.next.shift();
        started.push(w);
      }
      for (const w of started) {
        play({ type: 'finish', id: w.id });
        if (!w.next.length) drop(w);
      }
      if (!started.length && !waiting.length) break;
    }
  }
};
