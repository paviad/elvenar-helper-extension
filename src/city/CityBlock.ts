import { CityEntity } from '../model/cityEntity';

export interface CityBlock {
  gameId: string;
  id: number;
  originalX: number;
  originalY: number;
  type: string;
  x: number;
  y: number;
  width: number;
  length: number;
  name: string;
  moved: boolean;
  entity: CityEntity;
  label?: string;
  highlighted: boolean;
}
