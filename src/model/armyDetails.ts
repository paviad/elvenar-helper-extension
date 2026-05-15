export interface ArmyDetails {
  __class__: "ArmyDetailsVO";
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

type TrainingBuilding = "hb" | "eb" | "mc" | "tg";
type TroopType = "hm" | "hr" | "lm" | "lr" | "ma";

export type FriendlyUnitType = `${TrainingBuilding}_${TroopType}_${number}`;
export type EnemyUnitType = `mob_${TrainingBuilding}${TroopType}_${number}`;

export type UnitType = FriendlyUnitType | EnemyUnitType;

export interface UnitSquad {
  __class__: "UnitSquadVO";
  unitTypeId: FriendlyUnitType;
  size: number;
}
