import { Building } from '../../model/building';
import { BuildingSet } from '../../model/buildingSet';
import { CityEntity } from '../../model/cityEntity';
import { CityBlock } from '../CityBlock';
import { catalogueOf, currentCity, sizeAtFrom, spriteIdOf, targetFromBlocks } from './fromGame';

const catalogued = (
  id: string,
  base_name: string,
  level: number,
  width: number,
  length: number,
  strategy = 'townhall',
) => ({ id, base_name, level, width, length, requirements: { connectionStrategyId: strategy } }) as Building;

/** As the game names them on en3 (2026-10-26). */
const catalogue = catalogueOf([
  catalogued('H_Humans_Townhall_55', 'H_Humans_Townhall', 55, 6, 6),
  catalogued('Z_Humans_WorkerHut_5', 'Z_Humans_WorkerHut', 5, 2, 2),
  catalogued('R_Humans_Residential_15', 'R_Humans_Residential', 15, 4, 3),
  catalogued('R_Humans_Residential_16', 'R_Humans_Residential', 16, 5, 2),
  catalogued('A_Evt_Winter_3Tree_24', 'A_Evt_Winter_3Tree', 24, 2, 2, 'standalone'),
  catalogued(
    'A_Evt_Set_Seasons_XXV_The_Quiet_Shade_24',
    'A_Evt_Set_Seasons_XXV_The_Quiet_Shade',
    24,
    3,
    3,
    'set_buildings',
  ),
]);

const sets: BuildingSet[] = [
  {
    id: 'seasons_xxv',
    name: 'Canopy of Seasons',
    pieces: [{ baseName: 'A_Evt_Set_Seasons_XXV_The_Quiet_Shade', bonuses: [] }],
  },
];

const entity = (
  id: number,
  cityentity_id: string,
  type: string,
  level: number,
  x?: number,
  y?: number,
  extra: Partial<CityEntity> = {},
) =>
  ({
    id,
    cityentity_id,
    type,
    level,
    x,
    y,
    connected: true,
    state: { __class__: 'IdleVO' },
    ...extra,
  }) as unknown as CityEntity;

const entities = [
  entity(1, 'H_Humans_Townhall_55', 'main_building', 55, 5),
  entity(2, 'Z_Humans_WorkerHut_5', 'worker_hut', 5, 3, 15),
  entity(3, 'R_Humans_Residential_15', 'residential', 15, 20, 20, {
    state: { __class__: 'UpgradingVO' },
  }),
  entity(4, 'A_Evt_Winter_3Tree_24', 'culture', 24, 29, 62),
  entity(5, 'A_Evt_Set_Seasons_XXV_The_Quiet_Shade_24', 'culture', 24, 8, 55),
  entity(6, 'S_Humans_Trail', 'street', 1, 40, 42),
  entity(7, 'S_Humans_Dwarven', 'street', 1, 41),
];

describe('currentCity', () => {
  const { value: city, unknown } = currentCity(entities, [{ x: 0, y: 0, width: 80, length: 80 }], catalogue, sets);

  it('takes a coordinate the game left out as 0', () => {
    expect(city.buildings.get(1)).toMatchObject({ x: 5, y: 0 });
  });

  it('keeps streets apart from buildings, with their street type', () => {
    expect(city.buildings.has(6)).toBe(false);
    expect([...city.streets]).toEqual([
      ['40,42', 'S_Humans_Trail'],
      ['41,0', 'S_Humans_Dwarven'],
    ]);
  });

  it('finds the Main Hall and gives as many builders as the Builder’s Hut has levels', () => {
    expect(city.mainHallId).toBe(1);
    expect(city.builders).toBe(5);
  });

  it('keeps an evolving building’s stage, which its picture follows', () => {
    const evolving = currentCity([{ ...entities[3], stage: 7 }], [], catalogue, sets).value;

    expect(evolving.buildings.get(4)?.stage).toBe(7);
  });

  it('describes each building by kind, level and catalogue size', () => {
    expect(city.buildings.get(3)).toMatchObject({ kind: 'R_Humans_Residential', level: 15, width: 4, length: 3 });
  });

  it('counts a building being upgraded as holding a builder', () => {
    expect(city.buildings.get(3)?.busy).toBe(true);
    expect(city.buildings.get(4)?.busy).toBe(false);
  });

  it('reads how each building connects from its catalogue strategy, and puts set pieces in their set', () => {
    expect(city.buildings.get(3)?.connection).toBe('mainHall');
    expect(city.buildings.get(4)?.connection).toBe('none');
    expect(city.buildings.get(5)).toMatchObject({ connection: 'set', setKey: 'seasons_xxv' });
  });

  it('names what the catalogue does not know', () => {
    expect(unknown).toEqual([]);
    expect(currentCity([entity(9, 'A_Unheard_Of_1', 'culture', 1)], [], catalogue, sets).unknown).toEqual([
      'A_Unheard_Of_1',
    ]);
  });
});

describe('targetFromBlocks', () => {
  const block = (gameId: string, type: string, x: number, y: number, width = 1, length = 1) =>
    ({ gameId, type, x, y, width, length, entity: { connected: false } }) as unknown as CityBlock;

  it('takes kind, level and size from the block’s game id, which follows its level', () => {
    const { value } = targetFromBlocks(
      [block('R_Humans_Residential_16', 'residential', 30, 30, 5, 2)],
      catalogue,
      sets,
    );

    expect(value.buildings).toMatchObject([
      { kind: 'R_Humans_Residential', level: 16, x: 30, y: 30, width: 5, length: 2 },
    ]);
  });

  it('turns street blocks into target streets', () => {
    const { value } = targetFromBlocks([block('S_Humans_Trail', 'street', 4, 7)], catalogue, sets);

    expect(value.buildings).toEqual([]);
    expect([...value.streets]).toEqual([['4,7', 'S_Humans_Trail']]);
  });
});

describe('sizeAtFrom', () => {
  it('gives each level its own size', () => {
    const sizeAt = sizeAtFrom(catalogue);

    expect(sizeAt('R_Humans_Residential', 15)).toEqual({ width: 4, length: 3 });
    expect(sizeAt('R_Humans_Residential', 16)).toEqual({ width: 5, length: 2 });
    expect(sizeAt('R_Humans_Residential', 17)).toBeUndefined();
  });
});

describe('spriteIdOf', () => {
  const spriteId = spriteIdOf(catalogue);

  it('draws an evolving building by its stage, not its chapter', () => {
    // Twilight Phoenix at chapter 15, stage 10: the game draws it from Twilight_Phoenix10_1.
    expect(spriteId('A_Evt_Evo_Easter_XXII_Twilight_Phoenix', 15, 10)).toBe(
      'A_Evt_Evo_Easter_XXII_Twilight_Phoenix10_1',
    );
  });

  it('draws everything else under its catalogue id at its level', () => {
    expect(spriteId('R_Humans_Residential', 16)).toBe('R_Humans_Residential_16');
    expect(spriteId('A_Evt_Winter_3Tree', 24, 3)).toBe('A_Evt_Winter_3Tree_24');
  });
});
