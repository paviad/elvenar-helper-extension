import { ResearchStatus } from '../model/researchStatus';
import { ResearchTechnology } from '../model/researchTechnology';

export type TechnologyState = 'researched' | 'available' | 'locked';

/** One technology of the chapter: what it costs, where it sits, and how far the city is into it. */
export interface ExportedTechnology {
  id: string;
  name?: string;
  state: TechnologyState;
  /** Knowledge points the technology costs in full. */
  kp_cost?: number;
  /** Knowledge points still to put in: none once researched, all of it while it is shut. */
  kp_missing?: number;
  /** Goods, coins and supplies the technology asks for, by game id. */
  costs?: Record<string, number>;
  /** Ids of the technologies it opens from; those of an earlier chapter are named but not listed. */
  parents?: string[];
  children?: string[];
}

/**
 * The chapter as a graph: every technology in it, joined by the parent and child ids the game
 * draws the tree with, and each one saying whether it is researched, open to research now, or
 * still shut. Nodes are in the tree's own order, so a consumer that ignores the edges still
 * reads the chapter from its start.
 */
export function buildChapterResearchGraph(tree: ResearchTechnology[], status: ResearchStatus): ExportedTechnology[] {
  const researched = new Set(status.researched);
  const missingKp = new Map(status.available.map((tech) => [tech.id, tech.missingKp]));

  return tree
    .filter((tech) => tech.section === status.chapter && tech.maxSP !== undefined)
    .map((tech) => {
      const state: TechnologyState = researched.has(tech.id)
        ? 'researched'
        : missingKp.has(tech.id)
          ? 'available'
          : 'locked';

      return {
        id: tech.id,
        name: tech.name,
        state,
        kp_cost: tech.maxSP,
        // A shut technology cannot have been paid into, so the whole cost is still to come.
        kp_missing: state === 'researched' ? 0 : (missingKp.get(tech.id) ?? tech.maxSP),
        costs: tech.costs,
        parents: tech.parentIds,
        children: tech.childrenIds,
      } satisfies ExportedTechnology;
    });
}
