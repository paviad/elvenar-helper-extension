import { CityEntity } from '../model/cityEntity';
import { CityBlock } from './CityBlock';

export function generateCityBlocks(cityEntities: CityEntity[]) {
  const blocks: CityBlock[] = cityEntities.map((entity, index) => ({
    id: index,
    originalX: entity.x || 0,
    originalY: entity.y || 0,
    x: entity.x || 0,
    y: entity.y || 0,
    type: entity.type,
    width: entity.width || 1,
    length: entity.length || 1,
    moved: false,
    name: entity.name || entity.cityentity_id,
  }));

  return blocks;
}
