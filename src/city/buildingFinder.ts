import { getBuildings } from '../elvenar/getBuildings';
import { getPremiumBuildingHints } from '../elvenar/getPremiumBuildingHints';
import { Building } from '../model/building';
import { BuildingEx } from '../model/buildingEx';
import { CityEntityExData } from '../model/cityEntity';
import { normalizeString } from '../util/normalizeString';

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
      return { baseName: normalizeString(baseName), chapter };
    } else {
      return { baseName: normalizeString(goodsId) };
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

    this.hintsDictionary = Object.fromEntries(
      premiumHints.map((h) => [normalizeString(h.id.replace(/_\d+$/, '')), h.section]),
    );

    this.buildingsDictionary = buildings.reduce((acc, building) => {
      const normalizedBaseName = normalizeString(building.base_name);
      acc[normalizedBaseName] = acc[normalizedBaseName] || [];
      acc[normalizedBaseName].push(building);
      return acc;
    }, {} as Record<string, Building[]>);
  }

  public getBuilding(id: string, level = 1): BuildingEx | undefined {
    const { baseName: baseName1 } = this.getBaseName(id);
    const baseName = normalizeString(baseName1);

    const building = this.buildingsDictionary[baseName]?.find((b) => b.level === level);

    const hint = (!/^[gprhmoydbz]_/.test(baseName) && this.hintsDictionary[baseName]) || undefined;

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
}
