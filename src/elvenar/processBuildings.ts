import { saveToStorage } from '../chrome/storage';
import { Building } from '../model/building';
import { BuildingRaw } from '../model/BuildingRaw';
import { smartCompress } from '../util/compression';

const processInterceptedBuildings = (uncompressed: BuildingRaw[]): Building[] => {
  const filtered = uncompressed.map(
    (r) =>
      ({
        id: r.id,
        name: r.name,
        race: r.race,
        type: r.type,
        width: r.width,
        length: r.length,
        level: r.level,
        // category: r.category,
        base_name: r.base_name,
        requirements: r.requirements && {
          resources:
            r.requirements.resources?.resources &&
            ((z) => {
              const { prosperity, work, population, culture, __class__, ...rest } = z;
              return { prosperity, work, population, culture };
            })(r.requirements.resources.resources),
          chapter: r.requirements.chapter,
          worker: r.requirements.worker,
          connectionStrategyId: r.requirements.connectionStrategyId,
        },
        resale_resources: r.resale_resources && {
          resources: r.resale_resources.resources && {
            money: r.resale_resources.resources.money,
            supplies: r.resale_resources.resources.supplies,
            population: r.resale_resources.resources.population,
            royalrestoration: r.resale_resources.resources.royalrestoration,
            craft_spell_fragments: r.resale_resources.resources.craft_spell_fragments,
            combiningcatalyst: r.resale_resources.resources.combiningcatalyst,
            mana: r.resale_resources.resources.mana,
            seeds: r.resale_resources.resources.seeds,
            orcs: r.resale_resources.resources.orcs,
            work: r.resale_resources.resources.work,
          },
        },
        production: r.production && {
          products: r.production.products && [
            ...r.production.products.map((p) => ({
              production_time: p.production_time,
              revenue: p.revenue && {
                resources: ((z) => {
                  const { __class__, ...rest } = z;
                  return rest;
                })(p.revenue.resources),
              },
            })),
          ],
        },
        provisions: r.provisions && {
          resources: r.provisions.resources && {
            resources: r.provisions.resources.resources && {
              culture: r.provisions.resources.resources.culture,
              population: r.provisions.resources.resources.population,
              prestige: r.provisions.resources.resources.prestige,
              prosperity: r.provisions.resources.resources.prosperity,
            },
          },
        },
        description: r.description,
        spellFragments: r.spellFragments,
      }) satisfies Building,
  );

  const filtered2 = JSON.parse(JSON.stringify(filtered)) as typeof filtered; // remove undefined fields

  return filtered2;
};

export async function processBuildings(decodedResponse: string, all: boolean) {
  const buildingsRaw = JSON.parse(decodedResponse) as BuildingRaw[];
  const processedBuildings = processInterceptedBuildings(buildingsRaw);

  if (all) {
    await setBuildingsAll(processedBuildings);
  } else {
    await setBuildingsFeature(processedBuildings);
  }
}

async function setBuildingsAll(buildings: Building[]) {
  const plain = JSON.stringify(buildings);
  const compressed = await smartCompress(plain);
  await saveToStorage('buildings', compressed);
}

async function setBuildingsFeature(buildings: Building[]) {
  const plain = JSON.stringify(buildings);
  const compressed = await smartCompress(plain);
  await saveToStorage('buildingsFeature', compressed);
}
