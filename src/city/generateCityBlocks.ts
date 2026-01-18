import { CityEntityEx } from '../model/cityEntity';
import { CityBlock } from './CityBlock';
import { getCityBlockFromCityEntity } from './getCityBlockFromCityEntity';

export async function generateCityBlocks(cityEntities: CityEntityEx[]) {
  const blocks: CityBlock[] = cityEntities.map(
    (entity, index) =>
      ({
        ...getCityBlockFromCityEntity(entity),
        id: index,
      }) satisfies CityBlock,
  );

  return blocks;
}
