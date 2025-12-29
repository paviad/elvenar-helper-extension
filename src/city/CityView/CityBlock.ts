import { CityEntity } from '../../model/cityEntity';

export interface CityBlock {
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
