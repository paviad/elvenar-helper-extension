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
  level: number;
  stage?: number;
  chapter?: number;
  expiration?: number;
  expirationEnd?: number;
}

/**
 * Whether a block type is a street. A planner type can carry a suffix: a street named for its
 * chapter, as a settlement's trail, is a 'street_x', and the game still calls it a street.
 */
export const isStreetType = (type: string): boolean => type.replace(/_[xy]$/, '') === 'street';
