import { Race } from './quest';

/** One node of the research tree, as it stands in the balancing file. */
export interface ResearchTechnologyResponse {
  __class__: 'ResearchTechnologyConfigVO';
  id: string;
  name?: string;
  description?: string;
  race: Race;
  /** Knowledge points the technology costs — a string in the game's own data. */
  maxSP?: string;
  rewards?: ResearchRewardResponse[];
  childrenIds?: string[];
  parentIds?: string[];
  requirements?: ResearchRequirements;
  gate?: ResearchGate;
  level?: number;
  category?: ResearchCategory;
  /** The chapter the technology belongs to, counting from 1. */
  section: number;
  score?: number;
  premiumMax?: number;
  expectedProductionBoost?: number;
  iconId?: string;
  focusMarker?: string;
  /** Set while the technology is still behind a flag, e.g. `ch26`. */
  featureFlag?: string;
}

export interface ResearchRewardResponse {
  __class__: 'ResearchRewardVO';
  type: ResearchRewardType;
  value: string;
  buildingId?: string;
}

export type ResearchRewardType =
  'building' | 'unit_type_id' | 'expansion' | 'clustersize' | 'spells' | 'resource' | 'portal_production' | 'avatar';

export type ResearchCategory =
  | 'building'
  | 'expansion'
  | 'clustersize'
  | 'unit'
  | 'bonusgood'
  | 'unlock_feature'
  | 'scouting'
  | 'unit_upgrade'
  | 'spells'
  | 'avatar';

export interface ResearchRequirements {
  __class__: 'CityResourceVO';
  resources: ResearchResources;
}

/** Good id → amount, next to the game's own `__class__` marker. */
export type ResearchResources = Record<string, number | string>;

/** A scouting technology is held shut until enough provinces are finished. */
export interface ResearchGate {
  __class__: 'ResearchGateVO';
  completedProvinces: string;
  rewards?: ResearchRequirements;
}

/** The subset kept in storage — the tree is large and its flavour text is a third of it. */
export interface ResearchTechnology {
  id: string;
  name?: string;
  level?: number;
  section: number;
  category?: ResearchCategory;
  /** Knowledge points the technology costs. */
  maxSP?: number;
  parentIds?: string[];
  childrenIds?: string[];
  rewards?: ResearchReward[];
  /** `requirements.resources`, flattened to good id → amount. */
  costs?: Record<string, number>;
  score?: number;
  premiumMax?: number;
  iconId?: string;
  featureFlag?: string;
  /** `gate.completedProvinces` — provinces to finish before the technology opens. */
  requiredProvinces?: number;
  /** What passing the gate hands over, flattened the same way as `costs`. */
  gateRewards?: Record<string, number>;
}

export type ResearchReward = Pick<ResearchRewardResponse, 'type' | 'value' | 'buildingId'>;
