import { CityEntity } from '../model/cityEntity';
import { CityBlock } from './CityBlock';

interface ElvenarchitectEntry {
  link: string;
  name: string;
}


export async function generateCityBlocks(cityEntities: CityEntity[]) {
  const elvenarchitectDataUrl = chrome.runtime.getURL('elvenarchitect_data.json');
  const elvenarchitectData: ElvenarchitectEntry[] = await (await fetch(elvenarchitectDataUrl, { method: 'GET' })).json();

  function findInElvenarchitect(cityentity_id: string): string | undefined {
    for (const entry of elvenarchitectData) {
      if (entry.link.localeCompare(cityentity_id, undefined, { sensitivity: 'base' }) === 0) {
        return entry.name;
      }
      const stripLevel = cityentity_id.replace(/_\d+$/i, '');
      if (entry.link.localeCompare(stripLevel, undefined, { sensitivity: 'base' }) === 0) {
        return entry.name;
      }
    }
    return undefined;
  }

  function getType(entity: CityEntity): string {
    if (entity.connectionStrategy === 'standalone') {
      return entity.type + '_y';
    }

    if (/^[a-zA-Z]_Ch\d+_/.test(entity.cityentity_id)) {
      return entity.type + '_x';
    }

    return entity.type;
  }

  function getLabel(entity: CityEntity): string | undefined {
    if (entity.type === 'culture' || entity.type === 'culture_residential') {
      const m1 = /^[a-zA-Z]_Ch(\d+)_/.exec(entity.cityentity_id)
      if (m1) {
        return `${m1[1]}`;
      }

      const m2 = /_(\d+)$/.exec(entity.cityentity_id)
      if (m2) {
        return `${m2[1]}`;
      }
    }
    return undefined;
  }


  const blocks: CityBlock[] = cityEntities.map((entity, index) => ({
    id: index,
    originalX: entity.x || 0,
    originalY: entity.y || 0,
    x: entity.x || 0,
    y: entity.y || 0,
    type: getType(entity),
    width: entity.width || 1,
    length: entity.length || 1,
    moved: false,
    name: entity.name || findInElvenarchitect(entity.cityentity_id) || entity.cityentity_id,
    entity,
    label: getLabel(entity),
  } satisfies CityBlock));

  return blocks;
}
