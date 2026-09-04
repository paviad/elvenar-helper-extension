import { BuildingEx } from './buildingEx';

export interface InventoryItem {
  id: number;
  amount: number;
  type: string;
  subtype: string;
  changedAt: number;
  properties: Property[];

  name?: string;
  resaleResources?: Record<string, number>;
  chapter?: number;
  spellFragments?: number;
  size?: string;
  stage?: number;
  building?: BuildingEx;
  transcendence?: TranscendenceProperty;
  /**
   * Set on a building a tome can be opened for, rather than one in the inventory itself: the
   * tome's name. Such a row keeps the tome's id, the tome being what would have to be opened.
   */
  fromTome?: string;
}

export type Property = Chapter | Stage | TranscendenceProperty;

export interface Chapter {
  __class__: 'ChapterBasedInventoryItemPropertyVO';
  chapter: number;
}

export interface Stage {
  __class__: 'InventoryItemEvoBuildingPropertyVO';
  stage: number;
}

export interface TranscendenceProperty {
  __class__: 'InventoryItemTranscendedBuildingPropertyVO';
  stage: number;
  costs?: Costs;
  counter?: number;
}

export interface Costs {
  resources: Resources;
}

export interface Resources {
  volatile_sigils: number;
}
