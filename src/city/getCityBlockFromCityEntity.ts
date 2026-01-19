import { CityEntity, CityEntityEx } from '../model/cityEntity';
import { CityBlock } from './CityBlock';

function getType(entity: CityEntity): string {
  return getTypeFromEntity(entity.connectionStrategy, entity.cityentity_id, entity.type);
}

export function getTypeFromEntity(connectionStrategy: string | undefined, cityentity_id: string, type: string): string {
  if (connectionStrategy === 'standalone') {
    return type + '_y';
  }

  if (/^[a-zA-Z]_Ch\d+_/.test(cityentity_id)) {
    return type + '_x';
  }

  return type;
}

function getChapter(entity: CityEntityEx): number | undefined {
  return getChapterFromEntity(entity.chapter, entity.cityentity_id, entity.type, entity.level);
}

export function getChapterFromEntity(
  chapter: number | undefined,
  cityentity_id: string,
  type: string,
  level: number,
): number | undefined {
  if (chapter) {
    return chapter;
  }

  if (type === 'culture' || type === 'culture_residential') {
    const m1 = /^[a-zA-Z]_Ch(\d+)_/.exec(cityentity_id);
    if (m1) {
      return Number(m1[1]);
    }

    const m2 = /_(\d+)$/.exec(cityentity_id);
    if (m2) {
      return Number(m2[1]);
    }
  }

  if (/^[PR]_/.test(cityentity_id) && type.includes('premium')) {
    return level;
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

  if (/^[GPRHMOYDBZ]_/.test(entity.cityentity_id)) {
    return `${entity.level}`;
  }

  return undefined;
}

export function getCityBlockFromCityEntity(entity: CityEntityEx): CityBlock {
  return {
    gameId: entity.cityentity_id,
    id: -1,
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
    level: entity.level,
    stage: entity.stage,
    chapter: getChapter(entity),
    highlighted: false,
  } satisfies CityBlock;
}
