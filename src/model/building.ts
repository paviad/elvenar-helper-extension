export interface Building {
  id: string;
  name: string;
  description: string;
  race: string;
  type: string;
  width: number;
  length: number;
  construction_time: number;
  resaleable: boolean;
  resale_resources: Resources;
  base_name: string;
  level: number;
  rarity: number;
  category: string;
  premium_cost_factor: number;
  feature: string;
  components: Components;
  productionTimeReduction: number;
  upgradeRequirements: Requirements;
  requirements: Requirements;
  provisions: Provisions;
  spellFragments: number;
}

export interface Components {
  is_event_building: Is;
  is_chapter_based: Is;
  is_set_building: Is;
}

export interface Is {
  __class__: string;
  id: string;
}

export interface Provisions {
  __class__: string;
  resources: Resources;
}

export interface Requirements {
  __class__: string;
  resources: Resources;
  chapter: number;
  connectionStrategyId: string;
}

export interface Resources {
  __class__: string;
  resources: Record<string, number>;
}
