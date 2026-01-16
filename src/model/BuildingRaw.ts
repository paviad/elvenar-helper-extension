export interface BuildingRaw {
  __class__:                    BuildingClass;
  id:                           string;
  name:                         string;
  description:                  string;
  race:                         Race;
  type:                         Type;
  width:                        number;
  length:                       number;
  construction_time?:           number;
  resaleable?:                  boolean;
  resale_resources:             ResaleResources;
  base_name:                    string;
  level:                        number;
  rarity:                       number;
  category:                     Category;
  premium_cost_factor?:         number;
  use_neighbourly_help_charge?: boolean;
  production?:                  Production;
  displayOrder?:                number;
  productionTimeReduction:      number;
  upgradeRequirements?:         UpgradeRequirements;
  requirements:                 Requirements;
  provisions?:                  Provisions;
  spellFragments:               number;
  components?:                  Components;
  expected_production_boost?:   number;
  phase?:                       Phase;
  capacity?:                    Capacity;
  unlockedSlots?:               number;
  rankingPoints?:               number;
  coins_bonus?:                 number;
  coins_reward?:                number;
  is_premium_entity?:           boolean;
}

export enum BuildingClass {
  CityEntityVO = "CityEntityVO",
}

export interface Capacity {
  __class__: CapacityClass;
  resources: CapacityResources;
}

export enum CapacityClass {
  CityResourceVO = "CityResourceVO",
}

export interface CapacityResources {
  __class__:                             PurpleClass;
  ch17_elvenarinzero?:                   number;
  ch18_humans?:                          number;
  ch18_elves?:                           number;
  ch18_elvenar?:                         number;
  ch19_magic1?:                          number;
  ch19_magic2?:                          number;
  ch20_bars?:                            number;
  ch21_prey?:                            number;
  ch22_shrimps?:                         number;
  ch23_unicornblossoms?:                 number;
  dwarfs_granite?:                       number;
  dwarfs_copper?:                        number;
  fairies_ambrosia?:                     number;
  fairies_soma?:                         number;
  gr10_humancollections?:                number;
  gr10_humanracemanifest?:               number;
  gr10_elvencollections?:                number;
  gr10_elvenracemanifest?:               number;
  gr11_statutes?:                        number;
  gr4_woodghosts?:                       number;
  gr4_windchimes?:                       number;
  gr4_treantsprouts?:                    number;
  gr5_necroalchemists?:                  number;
  gr5_arcanealchemists?:                 number;
  gr5_arcanenecromancers?:               number;
  gr6_bread?:                            number;
  gr6_soup?:                             number;
  gr6_jam?:                              number;
  gr7_essence?:                          number;
  gr8_gravegoods?:                       number;
  gr8_traps?:                            number;
  gr9_humanium?:                         number;
  gr9_elvarium?:                         number;
  orcs_shroomofwisdom?:                  number;
  orcs_loot?:                            number;
  money?:                                number;
  supplies?:                             number;
  broken_shards?:                        number;
  special_package_reveal_charge?:        number;
  special_package_double_reward_charge?: number;
  episodic_reward_reroll_charge?:        number;
  tile_event_reveal_charge?:             number;
  shattered_orbs?:                       number;
}

export enum PurpleClass {
  Dictionary = "Dictionary",
}

export enum Category {
  AncientWonders = "ancient_wonders",
  Basics = "basics",
  Manufactories = "manufactories",
  Military = "military",
  NonPurchasable = "non_purchasable",
  Races = "races",
  Void = "void",
  Wealth = "wealth",
}

export interface Components {
  is_event_building?:      BlockPremiumExchange;
  is_chapter_based?:       BlockPremiumExchange;
  is_set_building?:        BlockPremiumExchange;
  block_premium_exchange?: BlockPremiumExchange;
  is_evolving_building?:   BlockPremiumExchange;
  is_transcending?:        BlockPremiumExchange;
  transcendence_stage?:    TranscendenceStage;
  has_fixed_position?:     BlockPremiumExchange;
  is_spire_aw?:            BlockPremiumExchange;
}

export interface BlockPremiumExchange {
  __class__: BlockPremiumExchangeClass;
  id:        BlockPremiumExchangeID;
}

export enum BlockPremiumExchangeClass {
  EntityBooleanComponentVO = "EntityBooleanComponentVO",
}

export enum BlockPremiumExchangeID {
  BlockPremiumExchange = "block_premium_exchange",
  HasFixedPosition = "has_fixed_position",
  IsChapterBased = "is_chapter_based",
  IsEventBuilding = "is_event_building",
  IsEvolvingBuilding = "is_evolving_building",
  IsSetBuilding = "is_set_building",
  IsSpireAw = "is_spire_aw",
  IsTranscending = "is_transcending",
}

export interface TranscendenceStage {
  __class__: TranscendenceStageClass;
  id:        TranscendenceStageID;
  value:     number;
}

export enum TranscendenceStageClass {
  EntityIntComponentVO = "EntityIntComponentVO",
}

export enum TranscendenceStageID {
  TranscendenceStage = "transcendence_stage",
}

export enum Phase {
  Research = "research",
  Rune = "rune",
}

export interface Production {
  __class__:        ProductionClass;
  products:         Product[];
  earlyPickupTime?: number;
  queueId?:         QueueID;
  queueTitle?:      QueueTitle;
  productionTitle?: ProductionTitle;
}

export enum ProductionClass {
  AutomaticProductionVO = "AutomaticProductionVO",
  ManualProductionVO = "ManualProductionVO",
  QueuedProductionVO = "QueuedProductionVO",
  SwitchableProductionVO = "SwitchableProductionVO",
}

export enum ProductionTitle {
  AvailableTours = "Available Tours",
  BorkenbartsRequests = "Borkenbarts Requests",
  Kits = "Kits",
  Library = "Library",
  MusicSelection = "Music Selection",
  Oblations = "Oblations",
  PeregrimSLab = "Peregrim's Lab",
  Topics = "Topics",
  TradingOptions = "Trading Options",
  Trials = "Trials",
  Units = "Units",
}

export interface Product {
  __class__:               ProductClass;
  production_time?:        number;
  production_option:       number;
  productionAmount:        number;
  revenue:                 Revenue;
  requiredResources:       RequiredResources;
  originalProductionTime?: number;
  originalRevenue:         Revenue;
  name?:                   string;
  asset_name?:             string;
  premiumCostFactor?:      number;
  teasedAtLevel?:          number;
}

export enum ProductClass {
  CityEntityProductVO = "CityEntityProductVO",
}

export interface Revenue {
  __class__: CapacityClass;
  resources: OriginalRevenueResources;
}

export interface OriginalRevenueResources {
  __class__:                          PurpleClass;
  mana?:                              number;
  unurium?:                           number;
  seeds?:                             number;
  supplies?:                          number;
  boosted_plus_1_quality_3?:          number;
  boosted_plus_0_quality_1?:          number;
  boosted_plus_0_quality_2?:          number;
  boosted_plus_0_quality_3?:          number;
  orcs?:                              number;
  tg_hm?:                             number;
  mc_hm?:                             number;
  tg_hr?:                             number;
  planks?:                            number;
  ins_kp_aw_3?:                       number;
  ins_rf_spl_5?:                      number;
  marble?:                            number;
  crystal?:                           number;
  elixir?:                            number;
  steel?:                             number;
  money?:                             number;
  boosted_plus_2_quality_1?:          number;
  boosted_plus_1_quality_1?:          number;
  boosted_plus_1_quality_2?:          number;
  boosted_sentient_plus_0_quality_1?: number;
  random?:                            number;
  boosted_sentient_plus_1_quality_1?: number;
  unit_3?:                            number;
  mc_hr?:                             number;
  ins_rf_grr_5?:                      number;
  ins_rf_cn_10?:                      number;
  knowledge_points?:                  number;
  boosted_sentient_plus_0_quality_2?: number;
  boosted_sentient_plus_1_quality_2?: number;
  boosted_plus_2_quality_2?:          number;
  boosted_ascended_plus_1_quality_1?: number;
  boosted_plus_2_quality_3?:          number;
  boosted_sentient_plus_2_quality_1?: number;
  boosted_sentient_plus_2_quality_3?: number;
  ins_tr_amt_30?:                     number;
  combiningcatalyst?:                 number;
  boosted_sentient_plus_0_quality_3?: number;
  unit_5?:                            number;
  ins_kp_aw_7?:                       number;
  broken_shards?:                     number;
  ins_rev_sqd_5?:                     number;
  spell_good_production_boost_1?:     number;
  boosted_ascended_plus_0_quality_1?: number;
  boosted_ascended_plus_0_quality_2?: number;
  boosted_ascended_plus_0_quality_3?: number;
  tg_lm?:                             number;
  tg_ma?:                             number;
  scrolls?:                           number;
  sentientscrolls?:                   number;
  magic_dust?:                        number;
  sentientcrystal?:                   number;
  silk?:                              number;
  sentientsilk?:                      number;
  gems?:                              number;
  boosted_sentient_plus_1_quality_3?: number;
  boosted_sentient_plus_2_quality_2?: number;
  unit_1?:                            number;
  craft_spell_fragments?:             number;
  boosted_ascended_plus_1_quality_2?: number;
  boosted_ascended_plus_2_quality_1?: number;
  boosted_ascended_plus_2_quality_2?: number;
  boosted_ascended_plus_2_quality_3?: number;
  mc_lr?:                             number;
  unit_4?:                            number;
  unit_2?:                            number;
  royalrestoration?:                  number;
  ins_rf_grr_10?:                     number;
  ins_rf_cn_20?:                      number;
  mc_lm?:                             number;
  spell_neighborly_help_boost_1?:     number;
  crafting_slots_refresh?:            number;
  ins_rf_spl_10?:                     number;
  ins_unit_tg_lm_5?:                  number;
  ins_unit_tg_lr_5?:                  number;
  ins_unit_tg_ma_5?:                  number;
  ins_rev_sqd_100?:                   number;
  spell_pet_food_1?:                  number;
  tg_lr?:                             number;
  spire_diplomacy_joker?:             number;
  sentientsteel?:                     number;
  sentientmarble?:                    number;
  sentientplanks?:                    number;
  ascendedsilk?:                      number;
  ascendedcrystal?:                   number;
  ascendedscrolls?:                   number;
  mc_ma?:                             number;
  ins_kp_aw_10?:                      number;
  ins_tr_amt_45?:                     number;
  ins_rf_cn_15?:                      number;
  b_gr4_aw1_shards?:                  number;
  b_gr4_aw2_shards?:                  number;
  b_gr5_aw1_shards?:                  number;
  b_gr5_aw2_shards?:                  number;
  b_gr6_aw1_shards?:                  number;
  b_gr6_aw2_shards?:                  number;
  b_gr7_aw1_shards?:                  number;
  b_gr7_aw2_shards?:                  number;
  b_gr8_aw1_shards?:                  number;
  b_gr8_aw2_shards?:                  number;
  b_gr9_aw1_shards?:                  number;
  b_gr9_aw2_shards?:                  number;
  b_gr10_aw1_shards?:                 number;
  b_gr10_aw2_shards?:                 number;
  b_gr11_aw1_shards?:                 number;
  b_gr11_aw2_shards?:                 number;
  b_ch17_aw1_shards?:                 number;
  b_ch17_aw2_shards?:                 number;
  b_ch18_aw1_shards?:                 number;
  b_ch18_aw2_shards?:                 number;
  b_all_aw1_shards?:                  number;
  b_all_aw2_shards?:                  number;
  b_ch19_aw1_shards?:                 number;
  b_ch19_aw2_shards?:                 number;
  b_ch20_aw1_shards?:                 number;
  b_ch20_aw2_shards?:                 number;
  b_ch21_aw1_shards?:                 number;
  b_ch21_aw2_shards?:                 number;
  b_ch22_aw1_shards?:                 number;
  b_ch22_aw2_shards?:                 number;
  b_all_aw3_shards?:                  number;
  b_all_aw4_shards?:                  number;
  aw1_shards?:                        number;
  aw2_shards?:                        number;
  b_all_aw5_shards?:                  number;
  b_all_aw6_shards?:                  number;
  b_dwarfs_aw1_shards?:               number;
  b_dwarfs_aw2_shards?:               number;
  b_fairies_aw1_shards?:              number;
  b_fairies_aw2_shards?:              number;
  b_orcs_aw1_shards?:                 number;
  b_orcs_aw2_shards?:                 number;
  blueprint?:                         number;
  ins_tr_amt_840?:                    number;
  ch17_elvenarinzero?:                number;
  ch17_luxuries?:                     number;
  ch17_delicacies?:                   number;
  ch17_artifacts?:                    number;
  ch18_badge?:                        number;
  ch18_elvenar?:                      number;
  ch18_elves?:                        number;
  ch18_humans?:                       number;
  ch18_water?:                        number;
  ch18_medal1?:                       number;
  ch18_medal2?:                       number;
  ch18_medal3?:                       number;
  ch18_fire?:                         number;
  ch18_medal4?:                       number;
  ch18_medal5?:                       number;
  ch18_wind?:                         number;
  ch18_medal6?:                       number;
  ch18_earth?:                        number;
  ch19_magic1?:                       number;
  ch19_creatures1?:                   number;
  ch19_creatures2?:                   number;
  ch20_bars?:                         number;
  ch20_strings?:                      number;
  ch20_flutes?:                       number;
  ch20_drums?:                        number;
  ch21_prey?:                         number;
  ch21_scales?:                       number;
  ch21_shells?:                       number;
  ch21_dragon?:                       number;
  ch21_bones?:                        number;
  ch21_furniture?:                    number;
  ch21_glass?:                        number;
  ch21_art?:                          number;
  ch22_seafood?:                      number;
  ch22_shrimps?:                      number;
  ch22_fish?:                         number;
  ch22_fruits?:                       number;
  ch22_salt?:                         number;
  ch23_unicornblossoms?:              number;
  ch23_dwarvenspirits?:               number;
  ch23_queenhoney?:                   number;
  ch23_dragonteeth?:                  number;
  ch23_flowerwreaths?:                number;
  ch23_fairyspirits?:                 number;
  ch23_mithril?:                      number;
  ch23_orcspirits?:                   number;
  ch23_halflingspirits?:              number;
  dwarfs_copper?:                     number;
  dwarfs_granite?:                    number;
  gr10_elvenracemanifest?:            number;
  gr10_elvencollections?:             number;
  fairies_sunflower?:                 number;
  fairies_velvet?:                    number;
  fairies_cocoons?:                   number;
  fairies_ambrosia?:                  number;
  fairies_nightshade?:                number;
  fairies_fireflies?:                 number;
  fairies_dreamsheep?:                number;
  fairies_soma?:                      number;
  gr10_ideas?:                        number;
  gr10_workforce?:                    number;
  gr10_livingpaintings?:              number;
  gr10_sculptures?:                   number;
  gr10_crystalballs?:                 number;
  gr10_plants?:                       number;
  gr10_designs?:                      number;
  gr10_constructs?:                   number;
  gr11_draftlaws?:                    number;
  gr11_dwarvenamendments?:            number;
  gr11_fairyamendments?:              number;
  gr11_statutes?:                     number;
  gr11_dwarvenpropositions?:          number;
  gr11_fairypropositions?:            number;
  gr11_strawberrybeer?:               number;
  gr11_purpletea?:                    number;
  gr11_inspirations?:                 number;
  gr4_manatears?:                     number;
  gr4_woodghosts?:                    number;
  gr4_windchimes?:                    number;
  gr4_treantsprouts?:                 number;
  gr4_refinedmarble?:                 number;
  gr4_refinedsteel?:                  number;
  gr4_refinedplanks?:                 number;
  gr5_soulcatchers?:                  number;
  gr5_necromancers?:                  number;
  gr5_arcanenecromancers?:            number;
  gr5_necroalchemists?:               number;
  gr5_crystalflasks?:                 number;
  gr5_alchemists?:                    number;
  gr5_arcanealchemists?:              number;
  gr5_arcanescrolls?:                 number;
  gr5_arcanologists?:                 number;
  gr5_apprentices?:                   number;
  gr6_fertilizer?:                    number;
  gr6_bread?:                         number;
  gr6_soup?:                          number;
  gr6_jam?:                           number;
  gr6_grain?:                         number;
  gr7_toll?:                          number;
  gr7_airartefacts?:                  number;
  gr7_essence?:                       number;
  gr7_fireartefacts?:                 number;
  gr7_earthartefacts?:                number;
  gr7_waterartefacts?:                number;
  gr8_gravegoods?:                    number;
  gr8_traps?:                         number;
  gr9_constructzero?:                 number;
  gr9_constructa?:                    number;
  gr9_constructb?:                    number;
  gr9_constructc?:                    number;
  gr9_constructd?:                    number;
  gr9_elvenarin?:                     number;
  gr9_nutric?:                        number;
  gr9_nutrib?:                        number;
  gr9_humanium?:                      number;
  gr9_nutrid?:                        number;
  gr9_elvarium?:                      number;
  gr9_nutria?:                        number;
  gr10_humanracemanifest?:            number;
  gr10_humancollections?:             number;
  orcs_hardshroom?:                   number;
  orcs_psychoshroom?:                 number;
  orcs_powershroom?:                  number;
  orcs_shroomofwisdom?:               number;
  orcs_armament?:                     number;
  orcs_dung?:                         number;
  orcs_debris?:                       number;
  orcs_loot?:                         number;
  spell_supply_production_boost_1?:   number;
  spell_knowledge_boost_1?:           number;
  eb_lm?:                             number;
  eb_lr?:                             number;
  eb_ma?:                             number;
  eb_hm?:                             number;
  eb_hr?:                             number;
  hb_lm?:                             number;
  hb_lr?:                             number;
  hb_ma?:                             number;
  hb_hm?:                             number;
  hb_hr?:                             number;
  ch19_creatures3?:                   number;
  ch19_magic2?:                       number;
  ch20_songs?:                        number;
  ch21_oblations1?:                   number;
  ch21_oblations2?:                   number;
  ch21_oblations3?:                   number;
  ch22_snails?:                       number;
  ch22_weed?:                         number;
  ch22_eels?:                         number;
  ch22_sponges?:                      number;
  gr6_carrots?:                       number;
  ch21_oblations4?:                   number;
  gr6_pumpkins?:                      number;
  gr6_apples?:                        number;
  work?:                              number;
  canned_goods?:                      number;
  sentientelixir?:                    number;
  sentientgems?:                      number;
  sentientmagic_dust?:                number;
  ascendedsteel?:                     number;
  ascendedmarble?:                    number;
  ascendedplanks?:                    number;
  ascendedelixir?:                    number;
  ascendedgems?:                      number;
  ascendedmagic_dust?:                number;
}

export interface RequiredResources {
  __class__: CapacityClass;
  resources: RequiredResourcesResources;
}

export interface RequiredResourcesResources {
  __class__:                          PurpleClass;
  mana?:                              number;
  ch17_elvenarinzero?:                number;
  ch17_delicacies?:                   number;
  ch17_artifacts?:                    number;
  ch17_luxuries?:                     number;
  ch18_medal1?:                       number;
  ch18_medal2?:                       number;
  ch18_medal3?:                       number;
  ch18_medal4?:                       number;
  ch18_medal5?:                       number;
  ch18_medal6?:                       number;
  boosted_ascended_plus_0_quality_1?: number;
  boosted_ascended_plus_1_quality_1?: number;
  ch18_fire?:                         number;
  ch18_humans?:                       number;
  ch18_wind?:                         number;
  ch18_elves?:                        number;
  ch18_earth?:                        number;
  ch18_elvenar?:                      number;
  boosted_ascended_plus_2_quality_1?: number;
  ch18_water?:                        number;
  ch19_magic1?:                       number;
  ch19_magic2?:                       number;
  seeds?:                             number;
  unurium?:                           number;
  ch20_bars?:                         number;
  boosted_sentient_plus_1_quality_2?: number;
  boosted_sentient_plus_2_quality_2?: number;
  boosted_sentient_plus_0_quality_2?: number;
  boosted_sentient_plus_1_quality_3?: number;
  boosted_sentient_plus_2_quality_3?: number;
  boosted_sentient_plus_0_quality_3?: number;
  boosted_sentient_plus_1_quality_1?: number;
  boosted_sentient_plus_2_quality_1?: number;
  boosted_sentient_plus_0_quality_1?: number;
  money?:                             number;
  work?:                              number;
  ch21_bones?:                        number;
  boosted_ascended_plus_1_quality_2?: number;
  ch21_furniture?:                    number;
  boosted_ascended_plus_1_quality_3?: number;
  ch21_glass?:                        number;
  orcs?:                              number;
  ch21_prey?:                         number;
  ch21_scales?:                       number;
  ch21_shells?:                       number;
  ch21_dragon?:                       number;
  ch22_snails?:                       number;
  ch22_weed?:                         number;
  ch22_eels?:                         number;
  ch22_sponges?:                      number;
  supplies?:                          number;
  ch23_unicornblossoms?:              number;
  canned_goods?:                      number;
  ch23_fairyspirits?:                 number;
  ch23_orcspirits?:                   number;
  ch23_halflingspirits?:              number;
  boosted_plus_2_quality_2?:          number;
  ch23_dwarvenspirits?:               number;
  boosted_ascended_plus_0_quality_3?: number;
  boosted_plus_1_quality_3?:          number;
  boosted_plus_0_quality_1?:          number;
  boosted_plus_1_quality_1?:          number;
  boosted_plus_2_quality_1?:          number;
  gr10_designs?:                      number;
  gr10_livingpaintings?:              number;
  gr10_crystalballs?:                 number;
  gr10_sculptures?:                   number;
  gr10_constructs?:                   number;
  gr10_plants?:                       number;
  silk?:                              number;
  fairies_fireflies?:                 number;
  crystal?:                           number;
  scrolls?:                           number;
  fairies_cocoons?:                   number;
  fairies_dreamsheep?:                number;
  sentientsilk?:                      number;
  gr10_ideas?:                        number;
  sentientmarble?:                    number;
  gr10_workforce?:                    number;
  sentientcrystal?:                   number;
  sentientplanks?:                    number;
  sentientscrolls?:                   number;
  sentientsteel?:                     number;
  gr11_dwarvenpropositions?:          number;
  gr11_strawberrybeer?:               number;
  gr11_fairypropositions?:            number;
  gr11_purpletea?:                    number;
  gr11_dwarvenamendments?:            number;
  gr11_fairyamendments?:              number;
  gr11_inspirations?:                 number;
  gr11_draftlaws?:                    number;
  gr4_refinedmarble?:                 number;
  gr4_refinedsteel?:                  number;
  gr4_refinedplanks?:                 number;
  marble?:                            number;
  steel?:                             number;
  planks?:                            number;
  gr5_apprentices?:                   number;
  gr5_arcanologists?:                 number;
  gr5_alchemists?:                    number;
  gr5_necromancers?:                  number;
  magic_dust?:                        number;
  gr6_grain?:                         number;
  gr6_carrots?:                       number;
  elixir?:                            number;
  gr6_pumpkins?:                      number;
  gems?:                              number;
  gr6_apples?:                        number;
  gr7_fireartefacts?:                 number;
  gr7_earthartefacts?:                number;
  gr7_waterartefacts?:                number;
  gr7_airartefacts?:                  number;
  gr8_traps?:                         number;
  gr8_gravegoods?:                    number;
  gr9_constructzero?:                 number;
  gr9_constructa?:                    number;
  gr9_elvenarin?:                     number;
  gr9_constructc?:                    number;
  gr9_constructb?:                    number;
  gr9_nutria?:                        number;
  gr9_constructd?:                    number;
  gr9_nutrib?:                        number;
  gr9_nutric?:                        number;
  gr9_nutrid?:                        number;
  orcs_dung?:                         number;
  orcs_psychoshroom?:                 number;
  orcs_powershroom?:                  number;
  orcs_armament?:                     number;
  boosted_relic_plus_1_quality_1?:    number;
  boosted_relic_plus_1_quality_2?:    number;
  boosted_relic_plus_1_quality_3?:    number;
  boosted_relic_plus_2_quality_1?:    number;
  boosted_relic_plus_2_quality_2?:    number;
  boosted_relic_plus_2_quality_3?:    number;
  ch19_creatures1?:                   number;
  ch19_creatures2?:                   number;
  ch20_strings?:                      number;
  ch20_flutes?:                       number;
  ch20_drums?:                        number;
  ch22_salt?:                         number;
  ch22_shrimps?:                      number;
  ch22_seafood?:                      number;
  ch22_fish?:                         number;
  ch22_fruits?:                       number;
  gr10_elvenracemanifest?:            number;
  gr10_elvencollections?:             number;
  gr10_humanracemanifest?:            number;
  gr10_humancollections?:             number;
  sentientelixir?:                    number;
  sentientmagic_dust?:                number;
  sentientgems?:                      number;
  ch21_art?:                          number;
}

export enum QueueID {
  Ch17Production = "ch17_production",
  Ch18Production = "ch18_production",
  Ch19Production = "ch19_production",
  Ch20Production = "ch20_production",
  Ch21Production = "ch21_production",
  Ch22Production = "ch22_production",
  Ch23Production = "ch23_production",
  ConstructsProduction = "constructs_production",
  EmbassiesProduction = "embassies_production",
  MercenaryCampProduction = "mercenary_camp_production",
  MilitaryProduction = "military_production",
  SpellsProduction = "spells_production",
  TrainingGroundsProduction = "training_grounds_production",
}

export enum QueueTitle {
  Composing = "Composing",
  Construction = "Construction",
  Creation = "Creation",
  CurrentTours = "Current Tours",
  Delivering = "Delivering",
  Harvest = "Harvest",
  Negotiations = "Negotiations",
  Proceedings = "Proceedings",
  RunningExperiments = "Running Experiments",
  RunningTrials = "Running Trials",
  Training = "Training",
}

export interface Provisions {
  __class__: ProvisionsClass;
  resources: ProvisionsResources;
}

export enum ProvisionsClass {
  CityEntityProvisionsVO = "CityEntityProvisionsVO",
}

export interface ProvisionsResources {
  __class__: CapacityClass;
  resources: PurpleResources;
}

export interface PurpleResources {
  __class__:           PurpleClass;
  culture?:            number;
  population?:         number;
  ch20_melody?:        number;
  ch20_accompaniment?: number;
  ch20_rhythm?:        number;
  prestige?:           number;
  prosperity?:         number;
}

export enum Race {
  All = "all",
  Ch17 = "ch17",
  Ch18 = "ch18",
  Ch19 = "ch19",
  Ch20 = "ch20",
  Ch21 = "ch21",
  Ch22 = "ch22",
  Ch23 = "ch23",
  Dwarfs = "dwarfs",
  Elves = "elves",
  Fairies = "fairies",
  Gr10 = "gr10",
  Gr11 = "gr11",
  Gr4 = "gr4",
  Gr5 = "gr5",
  Gr6 = "gr6",
  Gr7 = "gr7",
  Gr8 = "gr8",
  Gr9 = "gr9",
  Humans = "humans",
  Orcs = "orcs",
}

export interface Requirements {
  __class__:            RequirementsClass;
  resources:            RequirementsResources;
  worker?:              number;
  chapter?:             number;
  connectionStrategyId: ConnectionStrategyID;
  requiredResources?:   RequiredResource[];
}

export enum RequirementsClass {
  CityEntityRequirementsVO = "CityEntityRequirementsVO",
}

export enum ConnectionStrategyID {
  Ch17 = "ch17",
  Ch171 = "ch17_1",
  Ch172 = "ch17_2",
  Ch173 = "ch17_3",
  Ch18 = "ch18",
  Ch191 = "ch19_1",
  Ch192 = "ch19_2",
  Ch20 = "ch20",
  Ch20Basic = "ch20_basic",
  Ch20Precious = "ch20_precious",
  Ch20Refined = "ch20_refined",
  Ch21 = "ch21",
  Ch22 = "ch22",
  Dwarfs = "dwarfs",
  Dwarfs2 = "dwarfs_2",
  Fairies = "fairies",
  Fairies2 = "fairies_2",
  Gr10Academy = "gr10_academy",
  Gr10AgricultureFactoryAtelier = "gr10_agriculture_factory_atelier",
  Gr10Portal = "gr10_portal",
  Gr11Portal = "gr11_portal",
  Gr11PortalWave = "gr11_portal_wave",
  Gr11Production1 = "gr11_production_1",
  Gr11Production2 = "gr11_production_2",
  Gr4 = "gr4",
  Gr5 = "gr5",
  Gr5Special = "gr5_special",
  Gr6 = "gr6",
  Gr62 = "gr6_2",
  Gr6Special = "gr6_special",
  Gr7 = "gr7",
  Gr8 = "gr8",
  Gr8Residence = "gr8_residence",
  Gr8Workshop = "gr8_workshop",
  Gr9 = "gr9",
  Orcs = "orcs",
  Orcs2 = "orcs_2",
  SetBuildings = "set_buildings",
  Standalone = "standalone",
  Townhall = "townhall",
}

export interface RequiredResource {
  __class__:  RequiredResourceClass;
  resourceId: ResourceID;
}

export enum RequiredResourceClass {
  ProvidedRequirementVO = "ProvidedRequirementVO",
}

export enum ResourceID {
  Ch20Accompaniment = "ch20_accompaniment",
  Ch20Melody = "ch20_melody",
  Ch20Rhythm = "ch20_rhythm",
  Prosperity = "prosperity",
}

export interface RequirementsResources {
  __class__:        CapacityClass;
  resources:        FluffyResources;
  strategy_points?: StrategyPoints;
}

export interface FluffyResources {
  __class__:                          PurpleClass;
  money?:                             number;
  supplies?:                          number;
  seeds?:                             number;
  eldian_sapphire?:                   number;
  royalrestoration?:                  number;
  sentientmarble?:                    number;
  sentientplanks?:                    number;
  craft_spell_fragments?:             number;
  combiningcatalyst?:                 number;
  orcs?:                              number;
  unurium?:                           number;
  gems?:                              number;
  elixir?:                            number;
  magic_dust?:                        number;
  silk?:                              number;
  ch17_elvenarinzero?:                number;
  crystal?:                           number;
  scrolls?:                           number;
  marble?:                            number;
  steel?:                             number;
  planks?:                            number;
  boosted_sentient_plus_0_quality_1?: number;
  boosted_sentient_plus_0_quality_2?: number;
  boosted_sentient_plus_0_quality_3?: number;
  boosted_sentient_plus_1_quality_1?: number;
  boosted_sentient_plus_1_quality_2?: number;
  boosted_sentient_plus_1_quality_3?: number;
  boosted_sentient_plus_2_quality_1?: number;
  boosted_ascended_plus_2_quality_1?: number;
  ch18_elvenar?:                      number;
  boosted_ascended_plus_1_quality_1?: number;
  mana?:                              number;
  boosted_ascended_plus_2_quality_2?: number;
  ch19_magic1?:                       number;
  ch19_magic2?:                       number;
  boosted_ascended_plus_1_quality_2?: number;
  ch20_strings?:                      number;
  boosted_ascended_plus_1_quality_3?: number;
  ch20_flutes?:                       number;
  ch20_drums?:                        number;
  prosperity?:                        number;
  work?:                              number;
  boosted_sentient_plus_2_quality_2?: number;
  dwarfs_copper?:                     number;
  fairies_ambrosia?:                  number;
  orcs_loot?:                         number;
  gr6_fertilizer?:                    number;
  ch23_unicornblossoms?:              number;
  dwarfs_granite?:                    number;
  fairies_soma?:                      number;
  fairies_velvet?:                    number;
  fairies_fireflies?:                 number;
  orcs_shroomofwisdom?:               number;
  orcs_hardshroom?:                   number;
  gr6_soup?:                          number;
  sentientsteel?:                     number;
  sentientgems?:                      number;
  sentientsilk?:                      number;
  sentientcrystal?:                   number;
  sentientscrolls?:                   number;
  gr4_manatears?:                     number;
  gr7_toll?:                          number;
  gr8_gravegoods?:                    number;
  gr8_traps?:                         number;
  prestige?:                          number;
  boosted_sentient_plus_2_quality_3?: number;
  population?:                        number;
  culture?:                           number;
  premium?:                           number;
  boosted_ascended_plus_2_quality_3?: number;
  sentientelixir?:                    number;
  sentientmagic_dust?:                number;
  ascendedmarble?:                    number;
  ascendedsteel?:                     number;
  ascendedplanks?:                    number;
  ascendedcrystal?:                   number;
  ascendedscrolls?:                   number;
  ascendedsilk?:                      number;
  ascendedelixir?:                    number;
  ascendedmagic_dust?:                number;
  ascendedgems?:                      number;
  ch17_luxuries?:                     number;
  ch18_humans?:                       number;
  ch18_elves?:                        number;
  ch18_water?:                        number;
  ch18_fire?:                         number;
  ch18_wind?:                         number;
  ch18_earth?:                        number;
  ch19_matter2?:                      number;
  ch19_matter1?:                      number;
  ch20_melody?:                       number;
  ch20_accompaniment?:                number;
  ch20_rhythm?:                       number;
  ch21_art?:                          number;
  fairies_sunflower?:                 number;
  fairies_nightshade?:                number;
  gr4_woodghosts?:                    number;
  gr4_windchimes?:                    number;
  gr4_treantsprouts?:                 number;
  gr4_refinedmarble?:                 number;
  gr4_refinedsteel?:                  number;
  gr4_refinedplanks?:                 number;
  gr5_crystalflasks?:                 number;
  gr5_arcanescrolls?:                 number;
  gr5_soulcatchers?:                  number;
  gr6_grain?:                         number;
  gr6_carrots?:                       number;
  gr6_bread?:                         number;
  gr7_airartefacts?:                  number;
  gr7_fireartefacts?:                 number;
  gr7_earthartefacts?:                number;
  gr7_waterartefacts?:                number;
  gr9_elvenarin?:                     number;
  gr9_constructa?:                    number;
  gr9_constructb?:                    number;
  gr9_constructc?:                    number;
  gr9_constructd?:                    number;
  gr9_nutria?:                        number;
  gr9_nutrib?:                        number;
  gr9_nutric?:                        number;
  gr9_nutrid?:                        number;
  orcs_debris?:                       number;
  ch17_delicacies?:                   number;
  ch20_songs?:                        number;
  gr6_jam?:                           number;
  gr6_pumpkins?:                      number;
  gr6_apples?:                        number;
  gr7_essence?:                       number;
  ch17_artifacts?:                    number;
  ch19_creatures3?:                   number;
  canned_goods?:                      number;
  boosted_plus_0_quality_3?:          number;
  boosted_plus_1_quality_3?:          number;
  boosted_plus_2_quality_3?:          number;
  boosted_plus_1_quality_1?:          number;
  boosted_plus_2_quality_2?:          number;
  boosted_plus_0_quality_1?:          number;
  boosted_plus_2_quality_1?:          number;
  boosted_plus_1_quality_2?:          number;
  boosted_plus_0_quality_2?:          number;
  boosted_ascended_plus_0_quality_1?: number;
  boosted_ascended_plus_0_quality_2?: number;
  boosted_ascended_plus_0_quality_3?: number;
  blueprint?:                         number;
}

export interface StrategyPoints {
  __class__: StrategyPointsClass;
  currentSP: number;
}

export enum StrategyPointsClass {
  StrategyPointsVO = "StrategyPointsVO",
}

export interface ResaleResources {
  __class__: CapacityClass;
  resources: ResaleResourcesResources;
}

export interface ResaleResourcesResources {
  __class__:              PurpleClass;
  money?:                 number;
  supplies?:              number;
  population?:            number;
  royalrestoration?:      number;
  craft_spell_fragments?: number;
  combiningcatalyst?:     number;
  ch19_matter1?:          number;
  mana?:                  number;
  seeds?:                 number;
  orcs?:                  number;
  work?:                  number;
  ch19_matter2?:          number;
  ch19_matter3?:          number;
}

export enum Type {
  Academy = "academy",
  AncientWonder = "ancient_wonder",
  Armory = "armory",
  Culture = "culture",
  CultureResidential = "culture_residential",
  Expiring = "expiring",
  Goods = "goods",
  Guardian = "guardian",
  MainBuilding = "main_building",
  Military = "military",
  Portal = "portal",
  PremiumProduction = "premium_production",
  PremiumResidential = "premium_residential",
  Production = "production",
  Residential = "residential",
  Street = "street",
  Trader = "trader",
  WorkerHut = "worker_hut",
}

export interface UpgradeRequirements {
  __class__:             RequirementsClass;
  resources:             RequirementsResources;
  chapter?:              number;
  connectionStrategyId?: ConnectionStrategyID;
  requiredResources?:    RequiredResource[];
}
