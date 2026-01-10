export interface BuildingEx {
  id: string;
  name: string;
  type: string;
  description?: string;
  length: number;
  width: number;
  connectionStrategy: string;
  resale_resources: { resources: Record<string, number> };
  spellFragments: number;
}
