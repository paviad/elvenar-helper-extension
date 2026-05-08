export interface ActiveEffectsResponse {
  __class__: string;
  requestClass: string;
  requestMethod: string;
  requestId: number;
  responseData: ResponseDatum[];
}

export interface ResponseDatum {
  __class__: 'EffectVO';
  confId: number;
  actionId: Action;
  level: number;
  ownerId?: string;
  owner: Owner;
  remainingTime?: number;
  type: Type;
  permanent?: boolean;
  stage?: number;
}

export type Owner = "city_entity" | "spire";

export type Type =
  | "academy"
  | "ancient_wonder"
  | "armory"
  | "culture_residential"
  | "expiring"
  | "main_building"
  | "neighborly_help"
  | "spell"
  | "spire"
  | "trader";

export type Action =
  // This is the important one for EE, but we can capture more if needed in the future
  | 'neighbourly_help_boost_spell'

  | 'academy_production_time_reduction'
  | 'armory_training_slot_increase'
  | 'available_culture_bonus'
  | 'available_population_bonus'
  | 'aw_increase_neighbourly_help_chests'
  | 'aw_ranking_points'
  | 'aw_reduce_scout_time'
  | 'bonus_reward_chance_on_self_pickup'
  | 'bonus_reward_on_self_pickup'
  | 'building_production_boost'
  | 'cauldron_ingredients_costs_reduction'
  | 'ch17_aw2_effect1_SeGoPerCrafting'
  | 'craft_spell_fragments_bonus'
  | 'crafting_payback_bonus'
  | 'culture_by_ranking_points'
  | 'extra_spell_power_production_boost'
  | 'higher_culture_boost'
  | 'increase_barracks_training_size'
  | 'increase_spell_duration_boost'
  | 'increase_spell_power_boost'
  | 'increase_troops_health'
  | 'limited_help'
  | 'longer_culture_boost'
  | 'mana_per_spell_usage'
  | 'manufactories_production_boost'
  | 'nh_treasure_random_boosted_good'
  | 'per_pickup_bonus'
  | 'portal_production_boost_increase'
  | 'residential_population_boost'
  | 'resource_decay_reduction'
  | 'resource_per_treasure'
  | 'resources_from_season_daily_chest'
  | 'resources_per_spire_chest'
  | 'resources_per_tournament_point'
  | 'reward_per_x_stage_upgrade'
  | 'sentient_goods_production_boost'
  | 'spire_stage_effect_increase'
  | 'storage_cap_boost'
  | 'strength_increase'
  | 'supply_production_boost_spell'
  | 'time_limited_help'
  | 'tournament_cooldown_reduction'
  | 'trading_fee_reduction'
  | 'training_speed_bonus'
  | 'unit_production_pickup_boost'
  | 'unlimited_help'
  | 'unurium_per_ec_pickup'
  | 'wholesaler_offer_improvement'
  | 'wishing_well';
