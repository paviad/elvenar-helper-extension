import { sendBuildingsQuery, getBuildings } from '../elvenar/sendBuildingsQuery';
import { sendRenderConfigQuery, getGoodsBuildings } from '../elvenar/sendRenderConfigQuery';
import { Building } from '../model/building';
import { BuildingEx } from '../model/buildingEx';
import { CityEntityExData } from '../model/cityEntity';
import { ElvenarchitectEntry } from '../model/elvenarchitectEntry';
import { GoodsBuilding } from '../model/goodsBuilding';
import { InventoryItem } from '../model/inventoryItem';
import { normalizeString } from '../util/normalizeString';

interface bAndC {
  baseName: string;
  chapter?: number;
}

export class BuildingFinder {
  private buildingsDictionary!: Record<string, Building[]>;
  private buildingsDictionaryApprox!: Record<string, Building[]>;
  private buildingsDictionaryNoLevel!: Record<string, GoodsBuilding[]>;
  private chapterRegex = /_Ch\d+/;
  private goodsDictionary!: Record<string, GoodsBuilding[]>;

  elvenarchitectDataUrl = chrome.runtime.getURL('elvenarchitect_data.json');
  private elvenarchitectData!: ElvenarchitectEntry[];
  private elvenarchitectDictionary!: Record<string, string>;

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
  private initialized = false;

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
    await this.initElvenarchitectData();
    await sendBuildingsQuery();
    await sendRenderConfigQuery();

    const buildings = getBuildings();
    const goodsBuildings = getGoodsBuildings();

    this.buildingsDictionary = buildings.reduce((acc, building) => {
      acc[building.base_name] = acc[building.base_name] || [];
      acc[building.base_name].push(building);
      return acc;
    }, {} as Record<string, Building[]>);

    this.goodsDictionary = goodsBuildings.reduce((acc, goods) => {
      const building_base_name = this.getBaseName(goods.id).baseName;
      acc[building_base_name] = acc[building_base_name] || [];
      acc[building_base_name].push(goods);
      return acc;
    }, {} as Record<string, GoodsBuilding[]>);

    const chapterRegex = /_Ch\d+/;

    this.buildingsDictionaryApprox = buildings.reduce((acc, building) => {
      const baseName = building.base_name.replace(chapterRegex, '_Ch');
      acc[baseName] = acc[baseName] || [];
      acc[baseName].push(building);
      return acc;
    }, {} as Record<string, Building[]>);

    this.buildingsDictionaryNoLevel = goodsBuildings.reduce((acc, building) => {
      const baseName = building.id.replace(/(\d+)_(\d+)$/, '');
      acc[baseName] = acc[baseName] || [];
      acc[baseName].push(building);
      return acc;
    }, {} as Record<string, GoodsBuilding[]>);

    this.initialized = true;
  }

  public getBuilding(id: string, level = 1): BuildingEx | undefined {
    const { baseName } = this.getBaseName(id);

    const buildings = this.buildingsDictionary[baseName]?.[0];
    const approx = this.buildingsDictionaryNoLevel[baseName]?.[0];
    const goodsBuilding = this.goodsDictionary[baseName]?.find((r) => r.id.endsWith(`_${level}`)) || approx;

    const length = goodsBuilding?.tile_length || buildings?.length || 1;
    const width = goodsBuilding?.tile_width || buildings?.width || 1;

    if (buildings) {
      const bldg = buildings;
      return {
        id,
        name: bldg.name,
        description: bldg.description,
        length,
        width,
        connectionStrategy: bldg.requirements.connectionStrategyId,
        resale_resources: bldg.resale_resources,
        spellFragments: bldg.spellFragments,
      } satisfies BuildingEx;
    }

    if (goodsBuilding) {
      const bldg = goodsBuilding;
      return {
        id,
        name: this.findInElvenarchitect(bldg.id) || bldg.id,
        description: '',
        length,
        width,
        connectionStrategy: 'unknown',
        resale_resources: { resources: {} },
        spellFragments: 0,
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
    const name = building?.name || this.findInElvenarchitect(id) || id;
    const connectionStrategy = building?.connectionStrategy || 'unknown';
    return { length, width, description, name, connectionStrategy } satisfies CityEntityExData;

    // const { baseName, chapter } = this.getBaseName(id);
    // const goodsBuilding = this.goodsDictionary[baseName]?.find((r) => r.id.endsWith(`_${level}`));
    // const stdBuilding = this.buildingsDictionary[baseName]?.find((r) => true);
    // const approxBaseName = baseName.replace(this.chapterRegex, '_Ch');
    // const approxBuilding = this.buildingsDictionaryApprox[approxBaseName];
    // const length = goodsBuilding?.tile_length || stdBuilding?.length || 1;
    // const width = goodsBuilding?.tile_width || stdBuilding?.width || 1;
    // const description = stdBuilding?.description || '';
    // const name = stdBuilding?.name || this.findInElvenarchitect(id) || id;
    // const connectionStrategy = stdBuilding?.requirements.connectionStrategyId || 'unknown';

    // return { length, width, description, name, connectionStrategy } satisfies CityEntityExData;
  }

  private async initElvenarchitectData() {
    if (this.elvenarchitectData) {
      return;
    }
    this.elvenarchitectData = await (await fetch(this.elvenarchitectDataUrl, { method: 'GET' })).json();
    this.elvenarchitectDictionary = this.elvenarchitectData.reduce((acc, entry) => {
      acc[normalizeString(entry.link)] = entry.name;
      return acc;
    }, {} as Record<string, string>);
  }

  private findInElvenarchitect(cityentity_id1: string): string | undefined {
    const cityentity_id = normalizeString(cityentity_id1);
    const stripLevel = cityentity_id.replace(/_\d+$/i, '');

    if (this.elvenarchitectDictionary[cityentity_id]) {
      return this.elvenarchitectDictionary[cityentity_id];
    }

    if (this.elvenarchitectDictionary[stripLevel]) {
      return this.elvenarchitectDictionary[stripLevel];
    }

    return undefined;
  }
}
