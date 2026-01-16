import { Building } from '../model/building';
import { BuildingRaw } from '../model/BuildingRaw';

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
        base_name: r.base_name,
        requirements: r.requirements && {
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
      } satisfies Building),
  );

  const filtered2 = JSON.parse(JSON.stringify(filtered)) as typeof filtered; // remove undefined fields

  return filtered2;
};

export function processBuildings(decodedResponse: string, all: boolean) {
  const buildingsRaw = JSON.parse(decodedResponse) as BuildingRaw[];
  const processedBuildings = processInterceptedBuildings(buildingsRaw);

  return {
    buildings: processedBuildings,
    matcherAll: all,
    matcherFeature: !all,
  };
}
