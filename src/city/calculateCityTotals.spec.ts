import { Building } from '../model/building';
import { StageProvision } from '../model/stageProvision';
import { makeBuilding, makeCityBlock, makeCityEntityEx } from '../testing/fixtures';
import { BuildingFinder } from './buildingFinder';
import { calculateCityTotals } from './calculateCityTotals';
import { CityBlock } from './CityBlock';
import { GridMax } from './gridConstants';

/** A finder stub that answers from a fixed catalog, keyed by game id. */
function finderFor(catalog: Record<string, Building>): BuildingFinder {
  return {
    getBuilding: (id: string) => {
      const sourceBuilding = catalog[id];
      return sourceBuilding ? { sourceBuilding } : undefined;
    },
  } as unknown as BuildingFinder;
}

const residence = makeBuilding({
  id: 'P_Residence_1',
  base_name: 'P_Residence',
  type: 'residential',
  provisions: { resources: { resources: { population: 100 } } },
  requirements: { resources: { culture: 20 }, connectionStrategyId: 'street' },
});

const workshop = makeBuilding({
  id: 'R_Workshop_1',
  base_name: 'R_Workshop',
  type: 'production',
  provisions: { resources: { resources: { culture: 50, prosperity: 7 } } },
  requirements: { resources: { population: 30, prosperity: 3 }, connectionStrategyId: 'street' },
});

const wonder = makeBuilding({
  id: 'Z_Wonder_1',
  base_name: 'Z_Wonder',
  type: 'ancient_wonder',
});

const mainHall = makeBuilding({
  id: 'Y_MainHall_1',
  base_name: 'Y_MainHall',
  type: 'main_building',
  rankingPoints: 4200,
});

const catalog = finderFor({
  P_Residence_1: residence,
  R_Workshop_1: workshop,
  Z_Wonder_1: wonder,
  Y_MainHall_1: mainHall,
});

const blockOf = (gameId: string, type: string, overrides: Partial<CityBlock> = {}): CityBlock =>
  makeCityBlock({
    gameId,
    entity: makeCityEntityEx({ cityentity_id: gameId, type }),
    x: 10,
    y: 10,
    ...overrides,
  });

describe('calculateCityTotals', () => {
  it('returns zeroes for an empty city', () => {
    expect(calculateCityTotals([], catalog, [])).toMatchObject({
      popProvided: 0,
      popRequired: 0,
      cultureProvided: 0,
      awLevels: 0,
    });
  });

  it('sums provisions and requirements across blocks', () => {
    const blocks = [blockOf('P_Residence_1', 'residential'), blockOf('R_Workshop_1', 'production', { x: 20 })];

    expect(calculateCityTotals(blocks, catalog, [])).toMatchObject({
      popProvided: 100,
      cultureProvided: 50,
      prosperityProvided: 7,
      popRequired: 30,
      cultureRequired: 20,
      prosperityRequired: 3,
    });
  });

  it('counts residence population separately', () => {
    const blocks = [blockOf('P_Residence_1', 'residential'), blockOf('R_Workshop_1', 'production', { x: 20 })];

    expect(calculateCityTotals(blocks, catalog, []).residentialPop).toBe(100);
  });

  it('does not count non-residential population as residential', () => {
    const blocks = [blockOf('R_Workshop_1', 'production')];

    expect(calculateCityTotals(blocks, catalog, []).residentialPop).toBe(0);
  });

  it('combines the levels of every ancient wonder', () => {
    const blocks = [
      blockOf('Z_Wonder_1', 'ancient_wonder', { level: 6 }),
      blockOf('Z_Wonder_1', 'ancient_wonder', { level: 11, x: 20 }),
    ];

    expect(calculateCityTotals(blocks, catalog, []).awLevels).toBe(17);
  });

  it('reads ranking points from the main hall', () => {
    expect(calculateCityTotals([blockOf('Y_MainHall_1', 'main_building')], catalog, []).mhRankingPoints).toBe(4200);
  });

  it('ignores blocks parked outside the grid', () => {
    const inside = blockOf('P_Residence_1', 'residential');
    const outside = blockOf('P_Residence_1', 'residential', { x: -5, y: -5 });

    expect(calculateCityTotals([inside, outside], catalog, []).popProvided).toBe(100);
  });

  it('ignores blocks overhanging the grid edge', () => {
    const overhanging = blockOf('P_Residence_1', 'residential', { x: GridMax - 1, width: 2 });

    expect(calculateCityTotals([overhanging], catalog, []).popProvided).toBe(0);
  });

  it('skips blocks with no catalog entry', () => {
    const unknown = blockOf('G_Missing_1', 'goods');

    expect(calculateCityTotals([unknown], catalog, []).popProvided).toBe(0);
  });

  describe('evolution stages', () => {
    const evolving: StageProvision[] = [{ baseName: 'P_Residence', stages: [{ id: 3, population: 2, culture: 1.5 }] }];

    it('scales provisions by the block stage', () => {
      const staged = blockOf('P_Residence_1', 'residential', { stage: 3 });

      expect(calculateCityTotals([staged], catalog, evolving).popProvided).toBe(200);
    });

    it('leaves provisions alone for a stage with no entry', () => {
      const staged = blockOf('P_Residence_1', 'residential', { stage: 9 });

      expect(calculateCityTotals([staged], catalog, evolving).popProvided).toBe(100);
    });

    it('leaves provisions alone when the block has no stage', () => {
      expect(calculateCityTotals([blockOf('P_Residence_1', 'residential')], catalog, evolving).popProvided).toBe(100);
    });

    it('scales residential population too', () => {
      const staged = blockOf('P_Residence_1', 'residential', { stage: 3 });

      expect(calculateCityTotals([staged], catalog, evolving).residentialPop).toBe(200);
    });
  });
});
