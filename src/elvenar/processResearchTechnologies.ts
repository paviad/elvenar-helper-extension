import { saveToStorage } from '../chrome/storage';
import { ResearchResources, ResearchTechnology, ResearchTechnologyResponse } from '../model/researchTechnology';
import { smartCompress } from '../util/compression';

/**
 * The research tree: every technology, what it costs and what it unlocks. Narrowed to the fields
 * that describe the tree itself, since the descriptions alone are a third of the file.
 */
export const processResearchTechnologies = async (decodedResponse: string): Promise<void> => {
  const researchTechnologiesRaw = JSON.parse(decodedResponse) as ResearchTechnologyResponse[];

  const researchTechnologies = researchTechnologiesRaw.map(
    (z) =>
      ({
        id: z.id,
        name: z.name,
        level: z.level,
        section: z.section,
        category: z.category,
        maxSP: z.maxSP === undefined ? undefined : +z.maxSP,
        parentIds: z.parentIds,
        childrenIds: z.childrenIds,
        rewards: z.rewards?.map((r) => ({ type: r.type, value: r.value, buildingId: r.buildingId })),
        costs: flattenResources(z.requirements?.resources),
        score: z.score,
        premiumMax: z.premiumMax,
        iconId: z.iconId,
        featureFlag: z.featureFlag,
        requiredProvinces: z.gate === undefined ? undefined : +z.gate.completedProvinces,
        gateRewards: flattenResources(z.gate?.rewards?.resources),
      }) satisfies ResearchTechnology,
  );

  await setResearchTechnologies(researchTechnologies);
};

/** Drops the `__class__` marker the game puts in every dictionary, leaving good id → amount. */
const flattenResources = (resources: ResearchResources | undefined) => {
  if (!resources) {
    return undefined;
  }
  const amounts = Object.entries(resources).filter(([, v]) => typeof v === 'number') as [string, number][];
  return Object.fromEntries(amounts);
};

const setResearchTechnologies = async (researchTechnologies: ResearchTechnology[]) => {
  const plain = JSON.stringify(researchTechnologies);
  const compressed = await smartCompress(plain);
  await saveToStorage('researchTechnologies', compressed);
};
