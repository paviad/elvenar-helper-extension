import { UnlockedArea } from '../../model/unlockedArea';

/**
 * A model of what the game allows when a city is rearranged, for checking a move plan step by
 * step before it is shown to the player. Every rule here was taken from the game as observed
 * (2026-10-26); none is a guess at what would be convenient. A plan the simulator accepts is one
 * the game will accept, provided the rules are right, which is what the tests pin down.
 *
 * Moves and sales cost nothing and take no time. Upgrades and placements take a builder until
 * they finish, which the plan cannot hurry, so finishing is an action of its own.
 */

/**
 * How a building counts as connected. The Main Hall's street network is modelled, and a set
 * shares it along a chain of touching pieces: a street touching one connects every piece it
 * reaches piece to piece. The rest - settlement
 * and guest-race buildings needing their own streets or their portal - take the game's own word,
 * which holds until the building or the streets around it change.
 */
export type ConnectionKind = 'mainHall' | 'set' | 'none' | 'asReported';

/** The kind of connection a building needs, from its catalogue connection strategy. */
export const connectionKindFor = (connectionStrategyId: string | undefined): ConnectionKind => {
  switch (connectionStrategyId) {
    case 'townhall':
      return 'mainHall';
    case 'standalone':
      return 'none';
    case 'set_buildings':
      return 'set';
    default:
      return 'asReported';
  }
};

/** A building as the simulation sees it. */
export interface SimBuilding {
  id: number;
  /** What it is, for matching and reporting. The rules never read it. */
  kind: string;
  x: number;
  y: number;
  width: number;
  length: number;
  /** How it has to be connected before an upgrade can be started on it. */
  connection: ConnectionKind;
  /** Whether the game last said it was connected, for the kinds the simulation cannot work out. */
  reportedConnected: boolean;
  /** Which set it belongs to, for a set building: the buildings sharing a key share a connection. */
  setKey?: string;
  /** Holding a builder: under construction or being upgraded. */
  busy: boolean;
}

export interface SimCity {
  buildings: ReadonlyMap<number, SimBuilding>;
  /** Street tiles by `tileKey`, each holding its street type. */
  streets: ReadonlyMap<string, string>;
  unlocked: readonly UnlockedArea[];
  mainHallId: number;
  /** As many as the Builder's Hut has levels. */
  builders: number;
}

export interface Tile {
  x: number;
  y: number;
}

/** One building put down. The first of a chain is the one picked up to start it. */
export interface Drop extends Tile {
  id: number;
}

export type SimAction =
  /** A building picked up and put down, and every building it lifted in turn: one drag. */
  | { type: 'chain'; drops: Drop[] }
  /** An upgrade started where the building stands, because its new shape fits there. */
  | { type: 'upgrade'; id: number; width: number; length: number }
  /** An upgrade whose new shape does not fit, so the game hands the building over to be put down. */
  | { type: 'upgradeAndMove'; id: number; width: number; length: number; drops: Drop[] }
  | { type: 'place'; building: SimBuilding }
  /** Time passing until a construction or upgrade is done, freeing its builder. */
  | { type: 'finish'; id: number }
  | { type: 'sell'; id: number }
  | { type: 'sellStreets'; tiles: Tile[] }
  /** Streets laid between two tiles, clicked one after the other. */
  | { type: 'layRun'; street: string; from: Tile; to: Tile };

export type SimRefusal =
  | 'unknown-building'
  | 'outside-unlocked'
  | 'on-street'
  | 'touches-several'
  | 'out-of-order'
  | 'still-carrying'
  | 'no-builder'
  | 'busy'
  | 'not-connected'
  | 'does-not-fit'
  | 'fits-in-place'
  | 'main-hall'
  | 'not-a-street'
  | 'not-straight'
  | 'run-blocked';

export type SimResult = { ok: true; city: SimCity } | { ok: false; refusal: SimRefusal };

export const tileKey = (x: number, y: number) => `${x},${y}`;

const footprint = (x: number, y: number, width: number, length: number): Tile[] => {
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

/** The tiles just outside a building's edges, not its corners: streets connect side on. */
const borderTiles = (building: SimBuilding): Tile[] => {
  const { x, y, width, length } = building;
  const tiles: Tile[] = [];
  for (let dx = 0; dx < width; dx++) {
    tiles.push({ x: x + dx, y: y - 1 }, { x: x + dx, y: y + length });
  }
  for (let dy = 0; dy < length; dy++) {
    tiles.push({ x: x - 1, y: y + dy }, { x: x + width, y: y + dy });
  }
  return tiles;
};

/**
 * Connected when a street touching the building leads, street by street, to one touching the
 * Main Hall. Streets join side on, never across a corner, and touching the Main Hall itself is not
 * enough.
 */
export const connectedToMainHall = (city: SimCity, building: SimBuilding) => {
  const mainHall = city.buildings.get(city.mainHallId);
  if (!mainHall || building.id === mainHall.id) {
    return true;
  }

  const reached = new Set<string>();
  const queue = borderTiles(mainHall).filter(({ x, y }) => city.streets.has(tileKey(x, y)));
  for (const { x, y } of queue) {
    reached.add(tileKey(x, y));
  }
  while (queue.length) {
    const { x, y } = queue.pop()!;
    for (const next of [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ]) {
      const key = tileKey(next.x, next.y);
      if (city.streets.has(key) && !reached.has(key)) {
        reached.add(key);
        queue.push(next);
      }
    }
  }

  return borderTiles(building).some(({ x, y }) => reached.has(tileKey(x, y)));
};

export const isConnected = (city: SimCity, building: SimBuilding) => {
  switch (building.connection) {
    case 'none':
      return true;
    case 'asReported':
      return building.reportedConnected;
    case 'mainHall':
      return connectedToMainHall(city, building);
    case 'set':
      return setChain(city, building).some((member) => connectedToMainHall(city, member));
  }
};

/** Whether two buildings share a stretch of edge. Meeting at a corner is not enough. */
const touchSideOn = (a: SimBuilding, b: SimBuilding) => {
  const overlapX = a.x < b.x + b.width && b.x < a.x + a.width;
  const overlapY = a.y < b.y + b.length && b.y < a.y + a.length;
  const besideX = a.x + a.width === b.x || b.x + b.width === a.x;
  const besideY = a.y + a.length === b.y || b.y + b.length === a.y;
  return (besideX && overlapY) || (besideY && overlapX);
};

/**
 * A set building and the pieces of its set it reaches by touching, piece to piece: they share
 * one connection. A piece standing apart from the rest is on its own. Without a key there is no
 * telling which buildings are its set, so it stands alone too.
 */
const setChain = (city: SimCity, building: SimBuilding) => {
  const chain = [building];
  if (!building.setKey) {
    return chain;
  }
  const others = [...city.buildings.values()].filter(
    (other) => other.setKey === building.setKey && other.id !== building.id,
  );
  for (let index = 0; index < chain.length; index++) {
    for (let at = others.length - 1; at >= 0; at--) {
      if (touchSideOn(chain[index], others[at])) {
        chain.push(...others.splice(at, 1));
      }
    }
  }
  return chain;
};

/** Which building stands on each tile. */
const occupancy = (buildings: Iterable<SimBuilding>) => {
  const byTile = new Map<string, number>();
  for (const building of buildings) {
    for (const { x, y } of footprint(building.x, building.y, building.width, building.length)) {
      byTile.set(tileKey(x, y), building.id);
    }
  }
  return byTile;
};

const freeBuilders = (city: SimCity) => {
  let busy = 0;
  for (const building of city.buildings.values()) {
    if (building.busy) {
      busy++;
    }
  }
  return city.builders - busy;
};

/**
 * What is wrong with putting a building of this size at (x, y), ignoring the buildings on the
 * tiles: that is for the caller, since lifting one is allowed and covering one is not.
 */
const groundRefusal = (city: SimCity, tiles: Tile[]): SimRefusal | undefined => {
  if (!tiles.every((tile) => isUnlocked(city, tile))) {
    return 'outside-unlocked';
  }
  if (tiles.some(({ x, y }) => city.streets.has(tileKey(x, y)))) {
    return 'on-street';
  }
};

const fitsAt = (city: SimCity, building: SimBuilding, width: number, length: number) => {
  const tiles = footprint(building.x, building.y, width, length);
  const others = [...city.buildings.values()].filter((other) => other.id !== building.id);
  const byTile = occupancy(others);
  return !groundRefusal(city, tiles) && !tiles.some(({ x, y }) => byTile.has(tileKey(x, y)));
};

/**
 * One drag. The building on the cursor goes down where it is dropped; if that covers exactly one
 * building, that one comes up in its place and the drag goes on, and a drop covering two or more
 * is refused. The game sends nothing until the cursor is empty, so a drag left unfinished
 * changes nothing - a chain is all of it or none of it.
 */
const runChain = (city: SimCity, carried: SimBuilding, drops: Drop[]): SimResult => {
  const buildings = new Map(city.buildings);
  buildings.delete(carried.id);
  const byTile = occupancy(buildings.values());

  let onCursor: SimBuilding | undefined = carried;
  for (const drop of drops) {
    if (!onCursor || drop.id !== onCursor.id) {
      return { ok: false, refusal: 'out-of-order' };
    }
    const tiles = footprint(drop.x, drop.y, onCursor.width, onCursor.length);
    const refusal = groundRefusal(city, tiles);
    if (refusal) {
      return { ok: false, refusal };
    }

    const covered = new Set(tiles.map(({ x, y }) => byTile.get(tileKey(x, y))).filter((id) => id !== undefined));
    if (covered.size > 1) {
      return { ok: false, refusal: 'touches-several' };
    }

    let lifted: SimBuilding | undefined;
    if (covered.size === 1) {
      lifted = buildings.get([...covered][0])!;
      buildings.delete(lifted.id);
      for (const { x, y } of footprint(lifted.x, lifted.y, lifted.width, lifted.length)) {
        byTile.delete(tileKey(x, y));
      }
    }

    const placed = { ...onCursor, x: drop.x, y: drop.y };
    buildings.set(placed.id, placed);
    for (const { x, y } of tiles) {
      byTile.set(tileKey(x, y), placed.id);
    }
    onCursor = lifted;
  }

  if (onCursor) {
    return { ok: false, refusal: 'still-carrying' };
  }
  return { ok: true, city: { ...city, buildings } };
};

/** What stops an upgrade being started on this building at all, wherever it would end up. */
const upgradeRefusal = (city: SimCity, building: SimBuilding): SimRefusal | undefined => {
  if (building.busy) {
    return 'busy';
  }
  if (freeBuilders(city) < 1) {
    return 'no-builder';
  }
  if (!isConnected(city, building)) {
    return 'not-connected';
  }
};

const withBuilding = (city: SimCity, building: SimBuilding): SimCity => ({
  ...city,
  buildings: new Map(city.buildings).set(building.id, building),
});

/** Plays one action against the city, returning the city after it or why the game would refuse it. */
export const applyAction = (city: SimCity, action: SimAction): SimResult => {
  switch (action.type) {
    case 'chain': {
      const first = action.drops[0] && city.buildings.get(action.drops[0].id);
      if (!first) {
        return { ok: false, refusal: 'unknown-building' };
      }
      return runChain(city, first, action.drops);
    }

    case 'upgrade':
    case 'upgradeAndMove': {
      const building = city.buildings.get(action.id);
      if (!building) {
        return { ok: false, refusal: 'unknown-building' };
      }
      const refusal = upgradeRefusal(city, building);
      if (refusal) {
        return { ok: false, refusal };
      }

      // The game decides which of the two it is, by whether the new shape fits where the
      // building stands, growing from its top-left corner. The player has no say.
      const fits = fitsAt(city, building, action.width, action.length);
      const upgraded = { ...building, width: action.width, length: action.length, busy: true };
      if (action.type === 'upgrade') {
        return fits ? { ok: true, city: withBuilding(city, upgraded) } : { ok: false, refusal: 'does-not-fit' };
      }
      return fits ? { ok: false, refusal: 'fits-in-place' } : runChain(city, upgraded, action.drops);
    }

    case 'place': {
      if (freeBuilders(city) < 1) {
        return { ok: false, refusal: 'no-builder' };
      }
      const building = { ...action.building, busy: true };
      if (!fitsAt(city, building, building.width, building.length)) {
        const refusal = groundRefusal(city, footprint(building.x, building.y, building.width, building.length));
        return { ok: false, refusal: refusal ?? 'does-not-fit' };
      }
      return { ok: true, city: withBuilding(city, building) };
    }

    case 'finish': {
      const building = city.buildings.get(action.id);
      if (!building) {
        return { ok: false, refusal: 'unknown-building' };
      }
      return { ok: true, city: withBuilding(city, { ...building, busy: false }) };
    }

    case 'sell': {
      if (action.id === city.mainHallId) {
        return { ok: false, refusal: 'main-hall' };
      }
      if (!city.buildings.has(action.id)) {
        return { ok: false, refusal: 'unknown-building' };
      }
      const buildings = new Map(city.buildings);
      buildings.delete(action.id);
      return { ok: true, city: { ...city, buildings } };
    }

    case 'sellStreets': {
      const streets = new Map(city.streets);
      for (const { x, y } of action.tiles) {
        if (!streets.delete(tileKey(x, y))) {
          return { ok: false, refusal: 'not-a-street' };
        }
      }
      return { ok: true, city: { ...city, streets } };
    }

    case 'layRun': {
      const { from, to } = action;
      if (from.x !== to.x && from.y !== to.y) {
        // The game picks the turn itself, so a plan never asks for one.
        return { ok: false, refusal: 'not-straight' };
      }
      const tiles = footprint(
        Math.min(from.x, to.x),
        Math.min(from.y, to.y),
        Math.abs(to.x - from.x) + 1,
        Math.abs(to.y - from.y) + 1,
      );
      if (!tiles.every((tile) => isUnlocked(city, tile))) {
        return { ok: false, refusal: 'outside-unlocked' };
      }
      // With a building in the way the game lays the street around it, which is a different run
      // from the one asked for, so for a plan that is a refusal.
      const byTile = occupancy(city.buildings.values());
      if (tiles.some(({ x, y }) => byTile.has(tileKey(x, y)))) {
        return { ok: false, refusal: 'run-blocked' };
      }
      // Tiles already holding this street are left as they are; any other street is replaced.
      const streets = new Map(city.streets);
      for (const { x, y } of tiles) {
        streets.set(tileKey(x, y), action.street);
      }
      return { ok: true, city: { ...city, streets } };
    }
  }
};
