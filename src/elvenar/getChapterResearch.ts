import { buildChapterResearchGraph, ExportedTechnology } from './buildChapterResearchGraph';
import { getResearchStatus } from './getResearchStatus';
import { getResearchTechnologies } from './getResearchTechnologies';

export interface ChapterResearch {
  chapter: number;
  /** Every technology of the chapter, with its state and its edges to the rest. */
  technologies: ExportedTechnology[];
}

/**
 * The chapter the city is in, as the tree draws it and as the city stands in it. Undefined until
 * the game has sent both the research tree and the city's progress through it, which it does on
 * every load.
 */
export async function getChapterResearch(accountId: string): Promise<ChapterResearch | undefined> {
  const status = await getResearchStatus(accountId);
  if (!status) {
    return undefined;
  }

  const tree = await getResearchTechnologies();
  if (tree.length === 0) {
    return undefined;
  }

  return { chapter: status.chapter, technologies: buildChapterResearchGraph(tree, status) };
}
