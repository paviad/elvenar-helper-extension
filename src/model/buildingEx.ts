import { Building, ResaleResources } from './building';

export interface BuildingEx {
  id: string;
  name: string;
  type: string;
  description?: string;
  length: number;
  width: number;
  connectionStrategy: string;
  resale_resources: { resources: ResaleResources };
  spellFragments: number;
  chapter?: number;

  provisions?: Record<string, number>;
  production?: Record<string, number>;

  sourceBuilding: Building;

  maxStage?: number;

  expiration?: number;
}
