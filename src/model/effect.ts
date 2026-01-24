export interface Effect {
  __class__: EffectClass;
  effectId: number;
  action: string;
  targets?: string[];
  modifier: Modifier;
  values?: Record<string, number>;
  triggerChance: number;
  type: Type;
  duration?: number;
  origins?: string[];
  source?: string;
  metadata?: Metadata;
  valuesStages?: Record<string, number>;
  relatedEffectId?: number;
  proxyBuildingId?: string;
  allowedSpells?: string[];
}

export enum EffectClass {
  EffectConfigVO = 'EffectConfigVO',
}

export interface Metadata {
  __class__: MetadataClass;
  iconId?: string;
  name?: string;
  format?: Format;
  calculator: Calculator;
  boosted?: boolean;
  components?: Component[];
  shortName?: string;
}

export enum MetadataClass {
  EffectConfigMetadataVO = 'EffectConfigMetadataVO',
}

export enum Calculator {
  AwCombinedLevels = 'aw_combined_levels',
  CombinedLevelsRanking = 'combined_levels_ranking',
  Default = 'default',
  DefaultOriginal = 'default_original',
  Frog = 'frog',
  OriginalExtraPercentage = 'original_extra_percentage',
  OriginalTotalPercentage = 'original_total_percentage',
  ResultValue = 'result_value',
  SpireBenefits = 'spire_benefits',
  SumValue = 'sum_value',
  SumValues = 'sum_values',
  TournamentProvinceUnlockTimeReduced = 'tournament_province_unlock_time_reduced',
  TriggerChance = 'trigger_chance',
}

export interface Component {
  __class__: string;
  resourceId?: string;
  frogId?: string;
}

export enum Format {
  Default = 'default',
  Percentage = 'percentage',
  Production = 'production',
  SignPercentage = 'sign_percentage',
  SignTime = 'sign_time',
  SignValue = 'sign_value',
  Time = 'time',
  TriggerChance = 'trigger_chance',
}

export enum Modifier {
  Factor = 'factor',
  Value = 'value',
}

export enum Type {
  BigCultureBuilding = 'big_culture_building',
  BuildersBonus = 'builders_bonus',
  Entities = 'entities',
  Global = 'global',
  Items = 'items',
  NonUniqueBuildings = 'non_unique_buildings',
  PortalRequirementFactor = 'portal_requirement_factor',
  PotionEffect = 'potion_effect',
  Proxy = 'proxy',
  Resource = 'resource',
  Resources = 'resources',
  Spell = 'spell',
  Spire = 'spire',
}
