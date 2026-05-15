import { EnemyUnitType, FriendlyUnitType } from '../armyDetails';

export interface ProvinceInformationResponse {
  requestClass: string;
  requestMethod: string;
  requestId: number;
  responseData: TournyProvinceInformationRaw;
}

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
  enemyWaves: EnemyWave[];
  costs: Costs;
}

export interface Costs {
  resources: Resources;
}

export interface Resources {
  gems: number;
  scrolls: number;
  silk: number;
  premium: number;
}

export interface EnemyWave {
  army: Army[];
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

export enum Class {
  UnitPremiumCostVO = 'UnitPremiumCostVO',
}
