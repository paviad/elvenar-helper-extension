export interface EncounterData {
  __class__: string;
  pointId: number;
  battle: Battle;
  diplomacy: Diplomacy;
  basicCosts: number;
  mysteryChestDropChance: number;
  orbs: number;
}

export interface Battle {
  __class__: string;
  squadSize: number;
  enemyWaves: EnemyWave[];
  unitCosts: UnitCost[];
  streakRewards: StreakReward[];
}

export interface EnemyWave {
  __class__: string;
  army: Army[];
  squadSize: number;
  waveIndex: number;
}

export interface Army {
  __class__: Class;
  unitTypeId: string;
  size: number;
}

export enum Class {
  UnitSquadVO = 'UnitSquadVO',
}

export interface StreakReward {
  __class__: string;
  type: string;
  subType: string;
  amount: number;
}

export interface UnitCost {
  __class__: string;
  cost: number;
  unitId: string;
}

export interface Diplomacy {
  __class__: string;
  costOptions: CostOptions;
  slotsNumber: number;
  numStreaks: number;
  bonus: Bonus;
  streakRewards: StreakReward[];
}

export interface Bonus {
  __class__: string;
  basicReward: number;
  streakBonus: number;
  totalReward: number;
}

export interface CostOptions {
  __class__: string;
  resources: Resources;
}

export interface Resources {
  __class__: string;
  money: number;
  supplies: number;
  marble: number;
  gems: number;
  scrolls: number;
}

export interface DiplomacySubmitData {
  __class__: string;
  pointId: number;
  turn: number;
  totalTurns: number;
  slots: Slot[];
  state: string;
  costsExtraTurn: number;
}

export interface Slot {
  __class__: string;
  history: History[];
  slot?: number;
}

export interface History {
  __class__: string;
  result: string;
  goodId: string;
  turn: number;
}
