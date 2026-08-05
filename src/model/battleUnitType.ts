import { UnitBaseName, UnitType } from './armyDetails';

export interface BattleUnitTypesResponse {
  __class__: 'BattleUnitTypeVO';
  unitTypeId: UnitType;
  unitAssetName: string;
  unitClass: UnitClass;
  unitClassName: UnitClassName;
  name: string;
  hitpoints: number;
  range: number;
  initiative: number;
  movementPoints: number;
  baseDamage: number;
  attackBonus: AttackDefenseBonus;
  defenseBonus?: AttackDefenseBonus;
  unitWeight: number;
  damageRange: number;
  description: string;
  requirements?: Requirements;
  trainingTime?: number;
  race: Race;
  origin?: Origin;
  retaliation?: number;
  order: number;
  baseName: UnitBaseName;
  strengths: AttackDefenseBonus;
  specialAbilities?: string[];
  upgradedFromTypeId?: string;
}

/** The subset kept in storage — the almanac is large and the rest is unused. */
export type BattleUnitType = Pick<
  BattleUnitTypesResponse,
  'unitTypeId' | 'name' | 'strengths' | 'attackBonus' | 'unitWeight' | 'defenseBonus'
>;

/**
 * Used for three different things: `strengths` holds the 1-3 "swords" of the counter wheel,
 * while `attackBonus` and `defenseBonus` hold percentages.
 */
export interface AttackDefenseBonus {
  light_ranged?: number;
  mage?: number;
  heavy_melee?: number;
  heavy_ranged?: number;
  light_melee?: number;
}

export type Origin = 'M_Elves_Barracks' | 'M_Fairies_Barracks' | 'M_Humans_Barracks' | 'M_Orcs_Barracks';

export enum Race {
  All = 'all',
  Elves = 'elves',
  Humans = 'humans',
  Neutral = 'neutral',
}

interface Requirements {
  __class__: 'CityResourceVO';
  resources: Resources;
}

interface Resources {
  __class__: 'Dictionary';
  supplies?: number;
  orcs?: number;
}

export enum UnitClass {
  HeavyMelee = 'heavy_melee',
  HeavyRanged = 'heavy_ranged',
  LightMelee = 'light_melee',
  LightRanged = 'light_ranged',
  Mage = 'mage',
}

export enum UnitClassName {
  HeavyMeleeUnit = 'Heavy Melee Unit',
  HeavyRangedUnit = 'Heavy Ranged Unit',
  LightMeleeUnit = 'Light Melee Unit',
  LightRangedUnit = 'Light Ranged Unit',
  MageUnit = 'Mage Unit',
}
