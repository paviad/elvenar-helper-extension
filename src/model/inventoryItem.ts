export interface InventoryItem {
  __class__: string;
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
}

export type Property = Chapter | Stage;

export interface Chapter {
  __class__: 'ChapterBasedInventoryItemPropertyVO';
  chapter: number;
}

export interface Stage {
  __class__: 'InventoryItemEvoBuildingPropertyVO';
  stage: number;
}
