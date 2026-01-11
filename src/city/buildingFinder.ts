import { getBuildings } from '../elvenar/sendBuildingsQuery';
import { getAwBuildings } from '../elvenar/sendGoodsQuery';
import { getPremiumBuildingHints } from '../elvenar/sendPremiumBuildingHintsQuery';
import { getGoodsBuildings } from '../elvenar/sendRenderConfigQuery';
import { Building } from '../model/building';
import { BuildingEx } from '../model/buildingEx';
import { CityEntityExData } from '../model/cityEntity';
import { ElvenarchitectEntry } from '../model/elvenarchitectEntry';
import { GoodsBuilding } from '../model/goodsBuilding';
import { normalizeString } from '../util/normalizeString';

interface bAndC {
  baseName: string;
  chapter?: number;
}

export class BuildingFinder {
  private buildingsDictionary!: Record<string, Building[]>;
  private buildingsDictionaryNoLevel!: Record<string, GoodsBuilding[]>;
  private goodsDictionary!: Record<string, GoodsBuilding[]>;

  private elvenarchitectDataUrl = chrome.runtime.getURL('elvenarchitect_data.json');
  private elvenarchitectData!: ElvenarchitectEntry[];
  private elvenarchitectDictionary!: Record<string, string>;
  private awDictionary!: Record<string, string>;
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
    await this.initElvenarchitectData();

    const buildings = await getBuildings();
    const goodsBuildings = await getGoodsBuildings();
    const awBuildings = await getAwBuildings();
    const premiumHints = await getPremiumBuildingHints();

    this.awDictionary = Object.fromEntries(awBuildings.map((b) => [b.id.replace(/_shards$/, ''), b.name]));

    this.hintsDictionary = Object.fromEntries(
      premiumHints.map((h) => [normalizeString(h.id.replace(/_\d+$/, '')), h.section]),
    );

    this.buildingsDictionary = buildings.reduce((acc, building) => {
      const normalizedBaseName = normalizeString(building.base_name);
      acc[normalizedBaseName] = acc[normalizedBaseName] || [];
      acc[normalizedBaseName].push(building);
      return acc;
    }, {} as Record<string, Building[]>);

    this.goodsDictionary = goodsBuildings.reduce((acc, goods) => {
      const building_base_name = normalizeString(this.getBaseName(goods.id).baseName);
      acc[building_base_name] = acc[building_base_name] || [];
      acc[building_base_name].push(goods);
      return acc;
    }, {} as Record<string, GoodsBuilding[]>);

    this.buildingsDictionaryNoLevel = goodsBuildings.reduce((acc, building) => {
      const baseName = normalizeString(building.id.replace(/(\d+)_(\d+)$/, ''));
      acc[baseName] = acc[baseName] || [];
      acc[baseName].push(building);
      return acc;
    }, {} as Record<string, GoodsBuilding[]>);
  }

  public getBuilding(id: string, level = 1): BuildingEx | undefined {
    const { baseName: baseName1 } = this.getBaseName(id);
    const baseName = normalizeString(baseName1);

    const building = this.buildingsDictionary[baseName]?.[0];
    const approx = this.buildingsDictionaryNoLevel[baseName]?.[0];
    const goodsBuilding = this.goodsDictionary[baseName]?.find((r) => r.id.endsWith(`_${level}`)) || approx;
    const aw = this.awDictionary[baseName];
    const hint = this.hintsDictionary[baseName];

    if (hint) {
      console.log(`building id ${id}, hint ${hint}`);
    }

    const length = goodsBuilding?.l || building?.length || 1;
    const width = goodsBuilding?.w || building?.width || 1;

    if (building) {
      const bldg = building;
      return {
        id: goodsBuilding?.id || bldg.id,
        name: bldg.name,
        description: bldg.description,
        type: bldg.type,
        length,
        width,
        connectionStrategy: bldg.requirements.connectionStrategyId,
        resale_resources: bldg.resale_resources,
        spellFragments: bldg.spellFragments,
        chapter: (hint && parseInt(hint)) || undefined,
      } satisfies BuildingEx;
    }

    if (goodsBuilding) {
      const bldg = goodsBuilding;
      return {
        id: bldg.id,
        name: aw || this.findInElvenarchitect(bldg.id) || bldg.id,
        description: '',
        type: 'unknown',
        length,
        width,
        connectionStrategy: 'unknown',
        resale_resources: { resources: {} },
        spellFragments: 0,
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
    const name = building?.name || this.findInElvenarchitect(id) || id;
    const connectionStrategy = building?.connectionStrategy || 'unknown';
    const chapter = building?.chapter;

    if (chapter) {
      console.log(`building id ${id}, chapter ${chapter}`);
    }

    return { length, width, description, name, connectionStrategy, chapter } satisfies CityEntityExData;

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
