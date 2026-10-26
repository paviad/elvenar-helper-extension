import { SimBuilding } from './rulesSimulator';

/** Where the plan wants a building: its kind, its level and its spot at that level's size. */
export type TargetBuilding = Omit<SimBuilding, 'id' | 'busy'>;

export interface Pairing {
  current: SimBuilding;
  target: TargetBuilding;
}

export interface Matching {
  /** Buildings that stay, are moved or are upgraded, each with the spot it ends on. */
  pairings: Pairing[];
  /** Buildings in the city with no place in the target. */
  sells: SimBuilding[];
  /** Spots in the target no building in the city can fill: placed from the inventory. */
  places: TargetBuilding[];
  /** Spots that want a building at a lower level than the city's - there is no downgrading. */
  lowerLevel: Pairing[];
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * Which building in the city goes to which spot in the target. Buildings of one kind are
 * interchangeable, so they are paired by kind rather than by game id: with thirty identical
 * residences, whichever one already stands on a spot fills it, and the rest go to the nearest
 * free spots. That is what keeps a plan from moving a building merely because the planner moved
 * its twin.
 */
export const matchBuildings = (current: SimBuilding[], targets: TargetBuilding[]): Matching => {
  const matching: Matching = { pairings: [], sells: [], places: [], lowerLevel: [] };

  const kinds = new Set([...current.map((b) => b.kind), ...targets.map((t) => t.kind)]);
  for (const kind of kinds) {
    const buildings = current.filter((b) => b.kind === kind);
    const spots = targets.filter((t) => t.kind === kind);
    const take = (building: SimBuilding, spot: TargetBuilding) => {
      matching.pairings.push({ current: building, target: spot });
      buildings.splice(buildings.indexOf(building), 1);
      spots.splice(spots.indexOf(spot), 1);
    };

    for (const spot of [...spots]) {
      const standing = buildings.find((b) => b.x === spot.x && b.y === spot.y && b.level <= spot.level);
      if (standing) {
        take(standing, spot);
      }
    }

    const candidates = buildings
      .flatMap((building) => spots.filter((spot) => building.level <= spot.level).map((spot) => ({ building, spot })))
      .sort(
        (a, b) =>
          distance(a.building, a.spot) - distance(b.building, b.spot) ||
          a.spot.level - a.building.level - (b.spot.level - b.building.level),
      );
    for (const { building, spot } of candidates) {
      if (buildings.includes(building) && spots.includes(spot)) {
        take(building, spot);
      }
    }

    // What is left can only pair downwards. Said so, rather than selling the building and
    // placing another, which would quietly throw away what the city has.
    while (buildings.length && spots.length) {
      matching.lowerLevel.push({ current: buildings.shift()!, target: spots.shift()! });
    }
    matching.sells.push(...buildings);
    matching.places.push(...spots);
  }

  return matching;
};
