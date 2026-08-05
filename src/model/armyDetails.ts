export interface ArmyDetails {
  __class__: 'ArmyDetailsVO';
  availableUnitTypeIds: FriendlyUnitType[];
  unitSquads: UnitSquad[];
  maxHitpointsReference: number;
  maxBaseDamageReference: number;
  maxUnitWeightReference: number;
  baseClusterSize: number;
  battleClusterSize: number;
  trainingClusterSize: number;
  premiumTrainingCosts: number;
}

/** `hb`/`eb` are the human and elf barracks and are mutually exclusive per player. */
export type TrainingBuilding = 'hb' | 'eb' | 'mc' | 'tg';
export type TroopType = 'hm' | 'hr' | 'lm' | 'lr' | 'ma';

export type FriendlyUnitBaseName = `${TrainingBuilding}_${TroopType}`;
export type EnemyUnitBaseName = `mob_${TrainingBuilding}${TroopType}`;
export type UnitBaseName = FriendlyUnitBaseName | EnemyUnitBaseName;

/** The trailing number is the unit's upgrade level. */
export type FriendlyUnitType = `${TrainingBuilding}_${TroopType}_${number}`;
export type EnemyUnitType = `mob_${TrainingBuilding}${TroopType}_${number}`;

export type UnitType = FriendlyUnitType | EnemyUnitType;

export interface UnitSquad {
  __class__: 'UnitSquadVO';
  unitTypeId: FriendlyUnitType;
  size: number;
}
