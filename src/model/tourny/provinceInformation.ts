import { EnemyUnitType, FriendlyUnitType } from '../armyDetails';

export interface ProvinceInformationResponse {
  requestClass: string;
  requestMethod: string;
  requestId: number;
  responseData: TournyProvinceInformationRaw;
}

/** The raw response plus the hex coordinates, which only the request carries. */
export interface TournyProvinceInformation extends TournyProvinceInformationRaw {
  r: number;
  q: number;
}

export interface TournyProvinceInformationRaw {
  good_id: string;
  encounters: Encounter[];
  encounterRewards: Reward[];
  unitPremiumCosts: UnitPremiumCost[];
  playerSquadSize: number;
  provinceRewards: Reward[];
  baseTournamentPointsAmount: number;
}

export interface Reward {
  id: string;
  type: string;
  amount: number;
  subType?: string;
}

export interface Encounter {
  /** Tournament encounters are always a single wave — multiple waves are a Spire thing. */
  enemyWaves: EnemyWave[];
  /** What catering this encounter costs. */
  costs: Costs;
}

export interface Costs {
  resources: Resources;
}

/**
 * Keyed by good id, since which goods a province charges depends on the tournament and on the
 * player's boosted goods. Observed: `elixir`, `magic_dust`, `money`, `premium`.
 */
export interface Resources {
  __class__: 'Dictionary';
  [goodId: string]: number | string;
}

export interface EnemyWave {
  army: Army[];
  /** The enemy's per-squad size, which is not the player's — that is `playerSquadSize`. */
  squadSize: number;
  waveIndex: number;
}

export interface Army {
  unitTypeId: EnemyUnitType;
  size: number;
}

export interface UnitPremiumCost {
  cost: number;
  unitId: FriendlyUnitType;
}
