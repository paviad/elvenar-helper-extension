import { saveToStorage } from '../chrome/storage';
import { StageProvision } from '../model/stageProvision';

interface StageProvisionRaw {
  __class__: StageProvisionRawClass;
  baseName: string;
  costs: Costs;
  stages: StageRaw[];
}

enum StageProvisionRawClass {
  StageConfigurationVO = 'StageConfigurationVO',
}

interface Costs {
  __class__: CostsClass;
  resources: Resources;
}

enum CostsClass {
  CityResourceVO = 'CityResourceVO',
}

interface Resources {
  __class__: ResourcesClass;
  INS_EVO_AUTUMN_XIX?: number;
  INS_EVO_SEPTEMBER_XXII?: number;
  INS_EVO_CARNIVAL_XX?: number;
  INS_EVO_DECEMBER_XXII?: number;
  INS_EVO_DECEMBER_XXI?: number;
  INS_EVO_DECEMBER_XX?: number;
  INS_EVO_EASTER_XIX?: number;
  INS_EVO_EASTER_XXIII?: number;
  INS_EVO_EASTER_XXII?: number;
  INS_EVO_EASTER_XX?: number;
  INS_EVO_FEBRUARY_XXII?: number;
  INS_EVO_FEBRUARY_XXI?: number;
  INS_EVO_JANUARY_XXIII?: number;
  INS_EVO_JULY_XXII?: number;
  INS_EVO_JULY_XXI?: number;
  INS_EVO_JULY_XX?: number;
  INS_EVO_MM_XIX?: number;
  INS_EVO_MARCH_XXI?: number;
  INS_EVO_MAY_XXIII?: number;
  INS_EVO_MAY_XXII?: number;
  INS_EVO_MAY_XXI?: number;
  INS_EVO_MAY_XX?: number;
  INS_EVO_MERGE_DWARVENGAME_XXIII?: number;
  INS_EVO_MERGE_DWARVENGAME_XXIV?: number;
  INS_EVO_MERGE_DWARVENGAME_XXV?: number;
  INS_EVO_MERGE_KITCHEN_XXV?: number;
  INS_EVO_OCTOBER_XXII?: number;
  INS_EVO_OCTOBER_XXI?: number;
  INS_EVO_OCTOBER_XX?: number;
  INS_EVO_SCROLL_AQUATIC_XXIV?: number;
  INS_EVO_SCROLL_AQUATIC_XXV?: number;
  INS_EVO_SCROLL_SORCERERS_XXIV?: number;
  INS_EVO_SCROLL_SORCERERS_XXVI?: number;
  INS_EVO_SCROLL_SORCERERS_XXV?: number;
  INS_EVO_SEPTEMBER_XXI?: number;
  INS_EVO_SEPTEMBER_XX?: number;
  INS_EVO_SHUFFLE_POSTAL_XXIV?: number;
  INS_EVO_TILE_MISTYFOREST_XXIII?: number;
  INS_EVO_SHUFFLE_GARDEN_XXIII?: number;
  INS_EVO_SHUFFLE_POSTAL_XXIII?: number;
  INS_EVO_SHUFFLE_POSTAL_XXV?: number;
  INS_EVO_SUMMER_XIX?: number;
  INS_EVO_THEATER_EASTER_XXIV?: number;
  INS_EVO_THEATER_EASTER_XXV?: number;
  INS_EVO_THEATER_ZODIAC_XXIII?: number;
  INS_EVO_THEATER_ZODIAC_XXIV?: number;
  INS_EVO_THEATER_ZODIAC_XXV?: number;
  INS_EVO_TILE_AMUNI_XXIV?: number;
  INS_EVO_TILE_AMUNI_XXV?: number;
  INS_EVO_TILE_MISTYFOREST_XXIV?: number;
  INS_EVO_WINTER_XIX?: number;
  INS_GROW_GUARDIAN_XXV_NATURION_THE_AWAKENED?: number;
  INS_EVO_FOOBAR_MMMM?: number;
}

enum ResourcesClass {
  Dictionary = 'Dictionary',
}

interface StageRaw {
  __class__: StageClass;
  id: number;
  provisions?: Provision[];
  products?: Product[];
  transcendence?: Transcendence;
}

enum StageClass {
  StageVO = 'StageVO',
}

interface Product {
  __class__: ProductClass;
  factor?: number;
  index?: number;
  goodId?: string;
  value?: number;
}

enum ProductClass {
  StageProductVO = 'StageProductVO',
}

interface Provision {
  __class__: ProvisionClass;
  name: Name;
  value: number;
}

enum ProvisionClass {
  StageProvisionVO = 'StageProvisionVO',
}

enum Name {
  Culture = 'culture',
  Population = 'population',
}

interface Transcendence {
  __class__: string;
  effectsIds: number[];
  initialDuration: number;
}

export const processEvolvingBuildings = async (responseText: string) => {
  const evolvingBuildingsRaw = JSON.parse(responseText) as StageProvisionRaw[];

  const evolvingBuildings = evolvingBuildingsRaw.map(
    (z) =>
      ({
        baseName: z.baseName,
        stages: z.stages.map((s) => ({
          id: s.id,
          culture: s.provisions?.find((p) => p.name === Name.Culture)?.value,
          population: s.provisions?.find((p) => p.name === Name.Population)?.value,
        })),
      }) satisfies StageProvision,
  );

  await setEvolvingBuildings(evolvingBuildings);
};

async function setEvolvingBuildings(stageProvisions: StageProvision[]) {
  const plain = JSON.stringify(stageProvisions);
  await saveToStorage('evolvingBuildings', plain);
}
