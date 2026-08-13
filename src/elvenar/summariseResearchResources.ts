import { ResearchStatus } from '../model/researchStatus';
import { ResearchTechnology } from '../model/researchTechnology';

export interface ResearchResourceRow {
  good: string;
  id: string;
  /** Spent on the technologies of this chapter that are already researched. */
  used: number;
  /** Owed on the technologies that can be researched right now. */
  unlocked: number;
  /** Owed on everything of this chapter that is not researched, the unlocked ones included. */
  needed: number;
  total: number;
}

export interface ResearchResourcesSummary {
  chapter: number;
  technologies: { researched: number; unlocked: number; remaining: number };
  /** Goods this chapter is the first in the tree to ask for. */
  chapterGoods: ResearchResourceRow[];
  /** Everything else the chapter's research costs, carried over from earlier chapters. */
  carriedOver: ResearchResourceRow[];
}

interface Totals {
  used: number;
  unlocked: number;
  needed: number;
}

/**
 * Adds up what the chapter's technologies cost, split by whether they are researched already,
 * open to research now, or still shut, and again by whether the good is one this chapter is the
 * first in the tree to ask for.
 */
export function summariseResearchResources(
  tree: ResearchTechnology[],
  status: ResearchStatus,
  goodsNames: Record<string, string> = {},
): ResearchResourcesSummary {
  const chapter = status.chapter;
  const researched = new Set(status.researched);
  const unlocked = new Set(status.available.map((tech) => tech.id));

  const thisChapter = tree.filter((tech) => tech.section === chapter);
  const totals = new Map<string, Totals>();

  for (const tech of thisChapter) {
    const paid = researched.has(tech.id);
    for (const [good, amount] of Object.entries(tech.costs ?? {})) {
      const row = totals.get(good) ?? { used: 0, unlocked: 0, needed: 0 };
      if (paid) {
        row.used += amount;
      } else {
        row.needed += amount;
        if (unlocked.has(tech.id)) {
          row.unlocked += amount;
        }
      }
      totals.set(good, row);
    }
  }

  const askedForEarlier = new Set(
    tree.filter((tech) => tech.section < chapter).flatMap((tech) => Object.keys(tech.costs ?? {})),
  );

  const rows = [...totals.entries()]
    .map(([good, row]): ResearchResourceRow => ({
      good: goodsNames[good] ?? good,
      id: good,
      used: row.used,
      unlocked: row.unlocked,
      needed: row.needed,
      total: row.used + row.needed,
    }))
    .sort((a, b) => b.needed - a.needed || b.used - a.used);

  const inChapter = (id: string) => thisChapter.some((tech) => tech.id === id);

  return {
    chapter,
    technologies: {
      researched: thisChapter.filter((tech) => researched.has(tech.id)).length,
      unlocked: status.available.filter((tech) => inChapter(tech.id)).length,
      // The tree's root anchor carries no cost and is never researched, so it is not one to go.
      remaining: thisChapter.filter((tech) => tech.maxSP !== undefined && !researched.has(tech.id)).length,
    },
    chapterGoods: rows.filter((row) => !askedForEarlier.has(row.id)),
    carriedOver: rows.filter((row) => askedForEarlier.has(row.id)),
  };
}
