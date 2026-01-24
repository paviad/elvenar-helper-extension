import { getBuildings } from '../elvenar/getBuildings';
import { getPremiumBuildingHints } from '../elvenar/getPremiumBuildingHints';
import { Building } from '../model/building';
import { BuildingEx } from '../model/buildingEx';
import { CityEntityExData } from '../model/cityEntity';
import { BuildingCategory, BuildingDefinition, BuildingField, CATEGORIES } from './CATEGORIES';
import { getTypeFromEntity } from './getCityBlockFromCityEntity';

interface bAndC {
  baseName: string;
  chapter?: number;
}

export class BuildingFinder {
  private buildingsDictionary!: Record<string, Building[]>;

  private hintsDictionary!: Record<string, string>;

  private getBaseName(goodsId: string): bAndC {
    const baseNameRex = /(.*?)(_\d+)?$/;
    const match = goodsId.match(baseNameRex);
    if (match) {
      const baseName = match[1];
      const chapter = match[2] ? parseInt(match[2].substring(1)) : undefined;
      return { baseName, chapter };
    } else {
      return { baseName: goodsId };
    }
  }

  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initInternal();
  }

  public async ensureInitialized() {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
  }

  private async initInternal() {
    const buildings = await getBuildings();
    const premiumHints = await getPremiumBuildingHints();

    this.hintsDictionary = Object.fromEntries(premiumHints.map((h) => [h.id.replace(/_\d+$/, ''), h.section]));

    this.buildingsDictionary = buildings.reduce(
      (acc, building) => {
        const normalizedBaseName = building.base_name;
        acc[normalizedBaseName] = acc[normalizedBaseName] || [];
        acc[normalizedBaseName].push(building);
        return acc;
      },
      {} as Record<string, Building[]>,
    );
  }

  public getBuilding(id: string, level = 1): BuildingEx | undefined {
    const { baseName: baseName1 } = this.getBaseName(id);
    const baseName = baseName1;

    const building = this.buildingsDictionary[baseName]?.find((b) => b.level === level);

    const hint = (!/^[GPRHMOYDBZ]_/.test(baseName) && this.hintsDictionary[baseName]) || undefined;

    if (building) {
      const bldg = building;

      return {
        id: bldg.id,
        name: bldg.name,
        description: bldg.description,
        type: bldg.type,
        length: bldg.length,
        width: bldg.width,
        connectionStrategy: bldg.requirements.connectionStrategyId,
        resale_resources: bldg.resale_resources,
        spellFragments: bldg.spellFragments,
        chapter: (hint && parseInt(hint)) || undefined,
        sourceBuilding: bldg,
      } satisfies BuildingEx;
    }
  }

  public getCityEntityExtraData(id: string, level = 1): CityEntityExData {
    const building = this.getBuilding(id, level);

    if (!building) {
      console.warn(`Building not found for id: ${id}`);
    }

    const length = building?.length || 1;
    const width = building?.width || 1;
    const description = building?.description || '';
    const name = building?.name || id;
    const connectionStrategy = building?.connectionStrategy || 'unknown';
    const chapter = building?.chapter;

    return { length, width, description, name, connectionStrategy, chapter } satisfies CityEntityExData;
  }

  getAllBuildingsByCategory(race: string): BuildingDefinition[] {
    const categories = CATEGORIES;

    const getCategory = (building: Building): BuildingCategory => {
      const baseName = building.base_name;
      if (building.type === 'ancient_wonder') {
        return 'Wonders';
      }
      if (/^A_Evt_/.test(baseName)) {
        return 'Other';
      }
      if (/^[MO]_/.test(baseName)) {
        return 'Military';
      }
      if (/^[G]_/.test(baseName)) {
        return 'Goods';
      }
      if (/^[B]_/.test(baseName)) {
        return 'Settlements';
      }
      if (/^[A]_/.test(baseName)) {
        if (building.requirements.worker || /_(Ch|Gr)(\d+)(_|$)/.test(building.id)) {
          return 'Culture';
        }
        return 'Other';
      }
      if (/^[PRHYDZS]_/.test(baseName)) {
        if (!['townhall', 'standalone'].includes(building.requirements.connectionStrategyId)) {
          return 'Settlements';
        }
        return 'Basics';
      }
      return 'Other';
    };

    const getSupportedFields = (buildings: Building[]): BuildingField[] => {
      const baseName = buildings[0].base_name;
      if (/^[GPRHMOYDBZ]_/.test(baseName)) {
        return ['Level'];
      }
      if (/_Evt_Evo/.test(baseName)) {
        return ['Stage', 'Chapter'];
      }
      if (buildings[0].requirements.worker) {
        return [];
      }
      return ['Chapter'];
    };

    const getGetSizeAtLevelFunction = (
      buildings: Building[],
    ): ((level: number) => { width: number; length: number }) | undefined => {
      const baseName = buildings[0].base_name;
      if (buildings[0].type === 'ancient_wonder') return;
      if (/^[GPRHMOBY]_/.test(baseName)) {
        return (level: number) => {
          const buildingAtLevel = buildings.find((b) => b.level === level);
          if (buildingAtLevel) {
            return { width: buildingAtLevel.width, length: buildingAtLevel.length };
          }
          return { width: buildings[0].width, length: buildings[0].length };
        };
      }
      return undefined;
    };

    const getMaxLevelsLocal = (buildings: Building[]): number | undefined => {
      const rc = buildings[buildings.length - 1].level;
      return rc;
    };

    const getChapter = (building: Building): number | undefined => {
      if (/^([GPRHMODY]_|A_Evt_)/.test(building.base_name) || building.type === 'expiring') {
        return;
      }
      if (building.requirements.chapter) {
        return building.requirements.chapter;
      }
    };

    const otherRace = race === 'humans' ? 'elves' : 'humans';

    const result = Object.values(this.buildingsDictionary)
      .filter((buildings) => buildings[0].race !== otherRace)
      .map((r) => {
        const chapter = getChapter(r[0]);
        return {
          id: r[0].base_name,
          name: chapter ? `Ch ${chapter} - ${r[0].name}` : r[0].name,
          chapter,
          category: getCategory(r[0]),
          width: r[0].width,
          length: r[0].length,
          supportedFields: getSupportedFields(r),
          getSizeAtLevel: getGetSizeAtLevelFunction(r),
          maxLevel: getMaxLevelsLocal(r),
          type: getTypeFromEntity(r[0].requirements.connectionStrategyId, r[0].id, r[0].type),
        } satisfies BuildingDefinition;
      });
    return result.sort((a, b) => {
      if (a.chapter && b.chapter) return a.chapter - b.chapter;
      else if (a.chapter) return 1;
      else if (b.chapter) return -1;
      return a.name.localeCompare(b.name);
    });
  }
}
