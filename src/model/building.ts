export interface Building {
  id: string;
  name: string;
  description: string;
  race: string;
  type: string;
  width: number;
  length: number;
  // construction_time: number;
  // resaleable: boolean;
  resale_resources: { resources: ResaleResources };
  base_name: string;
  level: number;
  // rarity: number;
  // category: string;
  // premium_cost_factor: number;
  // feature: string;
  // components: Components;
  // productionTimeReduction: number;
  // upgradeRequirements: Requirements;
  requirements: Requirements;
  provisions?: { resources: { resources: ProvisionResources } };
  spellFragments: number;
}

export interface ProvisionResources {
  culture?: number;
  population?: number;
  prestige?: number;
  prosperity?: number;
}

export interface ResaleResources {
  money?: number;
  supplies?: number;
  population?: number;
  royalrestoration?: number;
  craft_spell_fragments?: number;
  combiningcatalyst?: number;
  mana?: number;
  seeds?: number;
  orcs?: number;
  work?: number;
}

export interface Provisions {
  resources: Resources;
}

export interface Requirements {
  // resources: Resources;
  chapter?: number;
  worker?: number;
  connectionStrategyId: string;
}

export interface Resources {
  resources: Record<string, number>;
}
