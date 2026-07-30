import { StageProvision } from '../model/stageProvision';
import { BuildingFinder } from './buildingFinder';
import { CityBlock } from './CityBlock';
import { isOutOfGrid } from './isOutOfGrid';

export interface CityTotals {
  popProvided: number;
  popRequired: number;
  cultureProvided: number;
  cultureRequired: number;
  prosperityProvided: number;
  prosperityRequired: number;
  /** Population from residences only, which the residential bonus scales. */
  residentialPop: number;
  /** Combined level of every ancient wonder, which some effects scale by. */
  awLevels: number;
  /** Ranking points awarded by the main hall. */
  mhRankingPoints: number;
}

const EMPTY_TOTALS: CityTotals = {
  popProvided: 0,
  popRequired: 0,
  cultureProvided: 0,
  cultureRequired: 0,
  prosperityProvided: 0,
  prosperityRequired: 0,
  residentialPop: 0,
  awLevels: 0,
  mhRankingPoints: 0,
};

const RESIDENTIAL_TYPES = ['residential', 'premium_residential'];

/**
 * Raw provision and requirement totals for a city, before ancient wonder bonuses.
 * Blocks parked outside the playable grid contribute nothing.
 */
export function calculateCityTotals(
  blocks: CityBlock[],
  buildingFinder: BuildingFinder,
  evolvingBuildings: StageProvision[],
): CityTotals {
  const totals = { ...EMPTY_TOTALS };

  for (const block of blocks) {
    const building = buildingFinder.getBuilding(block.gameId, block.level);
    if (!building) continue;
    if (isOutOfGrid(block)) continue;

    const source = building.sourceBuilding;

    const stage = evolvingBuildings
      .find((eb) => eb.baseName === source.base_name)
      ?.stages.find((s) => s.id === block.stage);
    const cultureFactor = stage?.culture || 1;
    const populationFactor = stage?.population || 1;

    if (source.type === 'ancient_wonder') {
      totals.awLevels += block.level;
    }

    if (source.type === 'main_building') {
      totals.mhRankingPoints = source.rankingPoints || 0;
    }

    const provisions = source.provisions?.resources?.resources;
    if (provisions) {
      const populationHere = Math.floor((provisions.population || 0) * populationFactor);
      totals.popProvided += populationHere;

      if (RESIDENTIAL_TYPES.includes(block.entity.type)) {
        totals.residentialPop += populationHere;
      }

      totals.cultureProvided += Math.floor((provisions.culture || 0) * cultureFactor);
      totals.prosperityProvided += provisions.prosperity || 0;
    }

    const requirements = source.requirements?.resources;
    if (requirements) {
      totals.popRequired += requirements.population || 0;
      totals.cultureRequired += requirements.culture || 0;
      totals.prosperityRequired += requirements.prosperity || 0;
    }
  }

  return totals;
}

export const emptyCityTotals = (): CityTotals => ({ ...EMPTY_TOTALS });
