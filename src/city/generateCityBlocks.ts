import { CityEntity, CityEntityEx } from '../model/cityEntity';
import { CityBlock } from './CityBlock';

export async function generateCityBlocks(cityEntities: CityEntityEx[]) {
  function getType(entity: CityEntity): string {
    if (entity.connectionStrategy === 'standalone') {
      return entity.type + '_y';
    }

    if (/^[a-zA-Z]_Ch\d+_/.test(entity.cityentity_id)) {
      return entity.type + '_x';
    }

    return entity.type;
  }

  function getChapter(entity: CityEntityEx): number | undefined {
    if (entity.chapter) {
      console.log(`entity id ${entity.cityentity_id}, chapter ${entity.chapter}`);
      return entity.chapter;
    }

    if (entity.type === 'culture' || entity.type === 'culture_residential') {
      const m1 = /^[a-zA-Z]_Ch(\d+)_/.exec(entity.cityentity_id);
      if (m1) {
        return Number(m1[1]);
      }

      const m2 = /_(\d+)$/.exec(entity.cityentity_id);
      if (m2) {
        return Number(m2[1]);
      }
    }

    if (/^[PR]_/.test(entity.cityentity_id) && entity.type.includes('premium')) {
      return entity.level;
    }
  }

  function getLabel(entity: CityEntity): string | undefined {
    if (entity.type === 'culture' || entity.type === 'culture_residential') {
      const m1 = /^[a-zA-Z]_Ch(\d+)_/.exec(entity.cityentity_id);
      if (m1) {
        return `${m1[1]}`;
      }

      const m2 = /_(\d+)$/.exec(entity.cityentity_id);
      if (m2) {
        return `${m2[1]}`;
      }
    }

    if (/^[GPRHMO]_/.test(entity.cityentity_id)) {
      return `${entity.level}`;
    }

    return undefined;
  }

  const blocks: CityBlock[] = cityEntities.map(
    (entity, index) =>
      ({
        gameId: entity.cityentity_id,
        id: index,
        originalX: entity.x || 0,
        originalY: entity.y || 0,
        x: entity.x || 0,
        y: entity.y || 0,
        type: getType(entity),
        width: entity.width || 1,
        length: entity.length || 1,
        moved: false,
        name: entity.name,
        entity,
        label: getLabel(entity),
        chapter: getChapter(entity),
        highlighted: false,
      } satisfies CityBlock),
  );

  return blocks;
}
