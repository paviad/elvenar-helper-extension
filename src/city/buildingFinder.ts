import { getBuildings } from '../elvenar/getBuildings';
import { getEvolvingBuildings } from '../elvenar/getEvolvingBuildings';
import { getExpirations } from '../elvenar/getExpirations';
import { getPremiumBuildingHints } from '../elvenar/getPremiumBuildingHints';
import { Building } from '../model/building';
import { BuildingEx } from '../model/buildingEx';
import { CityEntityExData } from '../model/cityEntity';
import { StageProvision } from '../model/stageProvision';
import { BuildingCategory, BuildingDefinition, BuildingField, CATEGORIES } from './CATEGORIES';
import { getTypeFromEntity } from './getCityBlockFromCityEntity';

interface bAndC {
  baseName: string;
  chapter?: number;
}

/** One ancient wonder, collapsed across its levels — the catalog lists one entry per level. */
export interface AncientWonder {
  baseName: string;
  /** The game's own display name, in the player's language. */
  name: string;
}

let sharedFinder: BuildingFinder | null = null;

/**
 * The shared finder for the whole app. The building catalog is immutable for the
 * lifetime of the page - getBuildings() caches it in memory and never invalidates -
 * so there is nothing to gain from per-call-site instances, and each one repeats
 * the same storage reads and index building.
 *
 * Callers must still await ensureInitialized() before using it.
 */
export function getBuildingFinder(): BuildingFinder {
  sharedFinder ??= new BuildingFinder();
  return sharedFinder;
}

export class BuildingFinder {
  // Defaulted rather than definitely-assigned: the finder is shared and its
  // lookups can be reached from a render before initialisation has resolved.
  private buildingsDictionary: Record<string, Building[]> = {};

  /** base name -> level -> building, so a lookup does not rescan the level list. */
  private buildingsByLevel: Record<string, Map<number, Building>> = {};
  private buildingsByLevelLowerCase: Record<string, Map<number, Building>> = {};
  /** Exact id -> building, for getBuildingExact. */
  private buildingsById: Map<string, Building> = new Map();

  /** Ancient wonders only, one per base name, sorted by display name. */
  private ancientWonders: AncientWonder[] = [];

  private hintsDictionary: Record<string, string> = {};
  private hintsDictionaryLowerCase: Record<string, string> = {};
  private evolvingBuildingsDictionary: Record<string, StageProvision> = {};
  private expirations: Record<string, number> = {};

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
    if (this.initialized) return;

    this.initPromise ??= this.initInternal();
    try {
      await this.initPromise;
      this.initialized = true;
    } catch (e) {
      // Drop the failed attempt so a later caller can retry. A shared finder would
      // otherwise stay poisoned for the rest of the page.
      this.initPromise = null;
      throw e;
    }
  }

  private async initInternal() {
    const buildings = await getBuildings();
    const premiumHints = await getPremiumBuildingHints();
    const evolvingBuildings = await getEvolvingBuildings();

    this.expirations = await getExpirations();

    this.hintsDictionary = Object.fromEntries(premiumHints.map((h) => [h.id.replace(/_\d+$/, ''), h.section]));
    this.hintsDictionaryLowerCase = Object.fromEntries(
      premiumHints.map((h) => [h.id.replace(/_\d+$/, '').toLowerCase(), h.section]),
    );

    this.buildingsDictionary = buildings.reduce(
      (acc, building) => {
        const normalizedBaseName = building.base_name;
        acc[normalizedBaseName] = acc[normalizedBaseName] || [];
        acc[normalizedBaseName].push(building);
        return acc;
      },
      {} as Record<string, Building[]>,
    );

    this.evolvingBuildingsDictionary = evolvingBuildings.reduce(
      (acc, eb) => {
        acc[eb.baseName] = eb;
        return acc;
      },
      {} as Record<string, StageProvision>,
    );

    // Index by id and by level. First entry wins, matching the .find() calls these
    // replace, so duplicate ids or levels resolve exactly as they did before.
    this.buildingsById = new Map();
    this.buildingsByLevel = {};
    this.buildingsByLevelLowerCase = {};

    for (const building of buildings) {
      if (!this.buildingsById.has(building.id)) {
        this.buildingsById.set(building.id, building);
      }

      const byLevel = (this.buildingsByLevel[building.base_name] ??= new Map());
      if (!byLevel.has(building.level)) {
        byLevel.set(building.level, building);
      }

      const byLevelLower = (this.buildingsByLevelLowerCase[building.base_name.toLowerCase()] ??= new Map());
      if (!byLevelLower.has(building.level)) {
        byLevelLower.set(building.level, building);
      }
    }

    // A wonder appears once per level, all sharing a display name, so collapse to base names.
    // The `A_` prefix is no help here — it also covers culture and event buildings — so the
    // discriminator is the type, as everywhere else in the app.
    const wondersByBaseName = new Map<string, AncientWonder>();
    for (const building of buildings) {
      if (building.type !== 'ancient_wonder' || wondersByBaseName.has(building.base_name)) {
        continue;
      }
      wondersByBaseName.set(building.base_name, { baseName: building.base_name, name: building.name });
    }
    this.ancientWonders = [...wondersByBaseName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Every ancient wonder the game has told us about, one entry per wonder. Empty until a
   * city load has populated the building catalog, so callers must handle the empty case.
   */
  public getAncientWonders(): AncientWonder[] {
    return this.ancientWonders;
  }

  public getBuildingExact(id: string): BuildingEx | undefined {
    const { baseName: baseName1 } = this.getBaseName(id);
    const baseName = baseName1;

    // The base name guard keeps this identical to the previous bucket-scoped scan:
    // an id is only a match if it also belongs to the base name derived from it.
    const candidate = this.buildingsById.get(id);
    const building = candidate?.base_name === baseName ? candidate : undefined;

    const hint = (!/^[GPRHMOYDBZ]_/.test(baseName) && this.hintsDictionary[baseName]) || undefined;

    if (building) {
      const bldg = building;

      return this.getBuildingEx(bldg, hint);
    }
  }

  public getBuilding(id: string, level = 1): BuildingEx | undefined {
    const { baseName: baseName1 } = this.getBaseName(id);
    const baseName = baseName1;

    const building = this.buildingsByLevel[baseName]?.get(level);

    const hint = (!/^[GPRHMOYDBZ]_/.test(baseName) && this.hintsDictionary[baseName]) || undefined;

    if (building) {
      // Report the id at the requested level without writing back to the catalog:
      // getBuildings() hands out a shared cached array, so mutating bldg.id here would
      // corrupt the entry for every other caller (getBuildingExact matches on id).
      const idAtLevel = building.id.replace(/_\d+$/, `_${level}`);

      return this.getBuildingEx(building, hint, idAtLevel);
    }
  }

  public getBuildingLowerCase(id: string, level = 1): BuildingEx | undefined {
    const { baseName: baseName1 } = this.getBaseName(id);
    const baseName = baseName1.toLowerCase();

    const building = this.buildingsByLevelLowerCase[baseName]?.get(level);

    const hint = (!/^[GPRHMOYDBZ]_/.test(baseName) && this.hintsDictionaryLowerCase[baseName]) || undefined;

    if (building) {
      const bldg = building;

      return this.getBuildingEx(bldg, hint);
    }
  }

  private getBuildingEx(bldg: Building, hint: string | undefined, id = bldg.id): BuildingEx | undefined {
    return {
      id,
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
      maxStage: this.getMaxStage([bldg]),
      expiration: bldg.type === 'expiring' ? this.expirations[bldg.base_name] : undefined,
    } satisfies BuildingEx;
  }

  public getCityEntityExtraData(id: string, level = 1): CityEntityExData {
    const building = this.getBuilding(id, level);

    if (!building) {
      console.warn(`ElvenAssist: Building not found for id: ${id}`);
    }

    const length = building?.length || 1;
    const width = building?.width || 1;
    const description = building?.description || '';
    const name = building?.name || id;
    const connectionStrategy = building?.connectionStrategy || 'unknown';
    const chapter = building?.chapter;
    const expiration = building?.expiration;

    return {
      length,
      width,
      description,
      name,
      connectionStrategy,
      chapter,
      expiration,
      expirationEnd: 0,
    } satisfies CityEntityExData;
  }

  getMaxStage(buildings: Building[]): number | undefined {
    const baseName = buildings[0].base_name;
    const evolvingBuilding = this.evolvingBuildingsDictionary[baseName];
    if (evolvingBuilding) {
      return evolvingBuilding.stages.reduce((max, stage) => (stage.id > max ? stage.id : max), 0);
    }
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
          maxStage: this.getMaxStage(r),
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
