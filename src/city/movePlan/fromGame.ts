import { Building } from '../../model/building';
import { BuildingSet } from '../../model/buildingSet';
import { CityEntity } from '../../model/cityEntity';
import { UnlockedArea } from '../../model/unlockedArea';
import { CityBlock } from '../CityBlock';
import { TargetBuilding } from './matchBuildings';
import { connectionKindFor, SimBuilding, SimCity, tileKey } from './rulesSimulator';
import { SizeAt, TargetCity } from './solveMovePlan';

/** The game's building catalogue, looked up by type and by kind at a level. */
export interface Catalogue {
  byId: ReadonlyMap<string, Building>;
  byKindAtLevel: ReadonlyMap<string, Building>;
}

export const catalogueOf = (buildings: Building[]): Catalogue => ({
  byId: new Map(buildings.map((b) => [b.id, b])),
  byKindAtLevel: new Map(buildings.map((b) => [`${b.base_name}|${b.level}`, b])),
});

/**
 * A kind's size at a level, straight from the catalogue. Build-menu buildings change shape as
 * they go up, in either direction - a residence is 4 x 3 at level 15, 5 x 2 at 16 and 4 x 3
 * again at 20 - so no level's size can stand in for another's.
 */
export const sizeAtFrom =
  (catalogue: Catalogue): SizeAt =>
  (kind, level) => {
    const building = catalogue.byKindAtLevel.get(`${kind}|${level}`);
    return building && { width: building.width, length: building.length };
  };

/**
 * The set each piece belongs to, for the pieces that connect through their set. Those are all
 * event set pieces, each in a single set; the chapter pieces that count toward several sets at
 * once connect by street like anything else, so whichever set is named for them goes unused.
 */
const setKeys = (sets: BuildingSet[]) => {
  const keys = new Map<string, string>();
  for (const set of sets) {
    for (const piece of set.pieces) {
      if (!keys.has(piece.baseName)) {
        keys.set(piece.baseName, set.id);
      }
    }
  }
  return keys;
};

const BUSY_STATES = new Set(['ConstructionVO', 'UpgradingVO']);

/** What the conversion could not place, which a plan built without would be wrong about. */
export interface Converted<T> {
  value: T;
  /** Types the catalogue does not know, so their size is unknown. */
  unknown: string[];
}

/**
 * The city as the game reported it, for the simulator: buildings by kind, level and size, the
 * streets on their own, the Main Hall, and as many builders as the Builder's Hut has levels.
 */
export const currentCity = (
  entities: CityEntity[],
  unlocked: UnlockedArea[],
  catalogue: Catalogue,
  sets: BuildingSet[],
): Converted<SimCity> => {
  const keys = setKeys(sets);
  const buildings = new Map<number, SimBuilding>();
  const streets = new Map<string, string>();
  const unknown: string[] = [];
  let mainHallId = -1;
  let builders = 0;

  for (const entity of entities) {
    // The game leaves a coordinate out when it is 0.
    const x = entity.x ?? 0;
    const y = entity.y ?? 0;
    if (entity.type === 'street') {
      streets.set(tileKey(x, y), entity.cityentity_id);
      continue;
    }
    if (entity.type === 'main_building') {
      mainHallId = entity.id;
    }
    if (entity.type === 'worker_hut') {
      builders = entity.level;
    }

    const building = catalogue.byId.get(entity.cityentity_id);
    if (!building) {
      unknown.push(entity.cityentity_id);
      continue;
    }
    buildings.set(entity.id, {
      id: entity.id,
      kind: building.base_name,
      level: entity.level,
      x,
      y,
      width: building.width,
      length: building.length,
      connection: connectionKindFor(building.requirements.connectionStrategyId),
      reportedConnected: entity.connected ?? false,
      setKey: keys.get(building.base_name),
      busy: BUSY_STATES.has(entity.state?.__class__ ?? ''),
    });
  }

  return {
    value: {
      buildings,
      streets,
      unlocked: unlocked.map((a) => ({ ...a, x: a.x || 0, y: a.y || 0 })),
      mainHallId,
      builders,
    },
    unknown,
  };
};

/**
 * A planner layout as the plan's target. A block's game id already names its level - the +/-
 * keys move it along with the level - so the catalogue gives its kind and level from that.
 */
export const targetFromBlocks = (
  blocks: CityBlock[],
  catalogue: Catalogue,
  sets: BuildingSet[],
): Converted<TargetCity> => {
  const keys = setKeys(sets);
  const buildings: TargetBuilding[] = [];
  const streets = new Map<string, string>();
  const unknown: string[] = [];

  for (const block of blocks) {
    if (block.type === 'street') {
      streets.set(tileKey(block.x, block.y), block.gameId);
      continue;
    }
    const building = catalogue.byId.get(block.gameId);
    if (!building) {
      unknown.push(block.gameId);
      continue;
    }
    buildings.push({
      kind: building.base_name,
      level: building.level,
      x: block.x,
      y: block.y,
      width: building.width,
      length: building.length,
      connection: connectionKindFor(building.requirements.connectionStrategyId),
      reportedConnected: block.entity.connected ?? false,
      setKey: keys.get(building.base_name),
    });
  }

  return { value: { buildings, streets }, unknown };
};
