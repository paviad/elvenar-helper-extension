import { CityBlock } from '../city/CityBlock';
import { Building } from '../model/building';
import { CityEntityEx } from '../model/cityEntity';

// Shared fixture factories for the specs. Each returns a minimal-but-valid object
// so a test only has to spell out the fields it actually cares about.

export function makeBuilding(overrides: Partial<Building> = {}): Building {
  const id = overrides.id ?? 'G_Steel_1';
  return {
    id,
    name: 'Steel Manufactory',
    description: 'Produces steel.',
    race: 'humans',
    type: 'goods',
    width: 3,
    length: 4,
    base_name: id.replace(/_\d+$/, ''),
    level: 1,
    resale_resources: { resources: {} },
    spellFragments: 0,
    requirements: { resources: {}, connectionStrategyId: 'street' },
    ...overrides,
  };
}

/** A base_name's worth of buildings, one per level, sized `width x length`. */
export function makeBuildingLevels(baseName: string, levels: number, overrides: Partial<Building> = {}): Building[] {
  return Array.from({ length: levels }, (_, i) =>
    makeBuilding({
      id: `${baseName}_${i + 1}`,
      base_name: baseName,
      level: i + 1,
      width: 2 + i,
      length: 2 + i,
      ...overrides,
    }),
  );
}

export function makeCityEntityEx(overrides: Partial<CityEntityEx> = {}): CityEntityEx {
  return {
    cityentity_id: 'G_Steel_1',
    id: 1,
    level: 1,
    player_id: 0,
    type: 'goods',
    x: 5,
    y: 7,
    connected: true,
    connectionStrategy: 'street',
    name: 'Steel Manufactory',
    description: 'Produces steel.',
    width: 3,
    length: 4,
    ...overrides,
  };
}

// The entity override is narrowed to CityEntityEx so the block can take its
// footprint and name from it; CityBlock itself only promises a CityEntity.
type CityBlockOverrides = Partial<Omit<CityBlock, 'entity'>> & { entity?: CityEntityEx };

export function makeCityBlock(overrides: CityBlockOverrides = {}): CityBlock {
  const entity = overrides.entity ?? makeCityEntityEx();
  return {
    gameId: entity.cityentity_id,
    id: 1,
    originalX: entity.x,
    originalY: entity.y,
    x: entity.x,
    y: entity.y,
    type: entity.type,
    width: entity.width,
    length: entity.length,
    name: entity.name,
    moved: false,
    entity,
    level: entity.level,
    ...overrides,
  };
}
