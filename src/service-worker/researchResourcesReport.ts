import { getAllStoredAccounts, loadAccountManagerFromStorage } from '../elvenar/AccountManager';
import { buildChapterResearchGraph, ExportedTechnology } from '../elvenar/buildChapterResearchGraph';
import { getGoodsNames } from '../elvenar/getGoodsNames';
import { getResearchStatus } from '../elvenar/getResearchStatus';
import { getResearchTechnologies } from '../elvenar/getResearchTechnologies';
import {
  ResearchResourceRow,
  ResearchResourcesSummary,
  summariseResearchResources,
} from '../elvenar/summariseResearchResources';

export interface ResearchResourcesReport {
  accountId: string;
  chapter: number;
  counts: ResearchResourcesSummary['technologies'];
  /** The chapter's technologies in full, the same graph the city export carries. */
  technologies: ExportedTechnology[];
  chapterGoods: ResearchResourceRow[];
  carriedOver: ResearchResourceRow[];
}

/**
 * The chapter the city is in: its technologies one by one, then what its goods have gone on and
 * what they still owe.
 *
 * Meant to be called by hand from the service worker's console — chrome://extensions, then
 * "Inspect views: service worker" under ElvenAssist:
 *
 *   await ElvenAssist.researchResources()            // the only city, or a list to choose from
 *   await ElvenAssist.researchResources('accountId') // a particular one
 */
export async function researchResourcesReport(accountId?: string): Promise<ResearchResourcesReport | undefined> {
  await loadAccountManagerFromStorage();
  const stored = getAllStoredAccounts().map(([id]) => id);

  const id = accountId ?? (stored.length === 1 ? stored[0] : undefined);
  if (!id) {
    console.warn('ElvenAssist: Name the city to report on, one of:', stored);
    return undefined;
  }

  const status = await getResearchStatus(id);
  if (!status) {
    console.warn('ElvenAssist: No research progress stored for', id, '- open the city in the game once.');
    return undefined;
  }

  const tree = await getResearchTechnologies();
  const goodsNames = await getGoodsNames();
  const summary = summariseResearchResources(tree, status, goodsNames);

  const report: ResearchResourcesReport = {
    accountId: id,
    chapter: summary.chapter,
    counts: summary.technologies,
    technologies: buildChapterResearchGraph(tree, status),
    chapterGoods: summary.chapterGoods,
    carriedOver: summary.carriedOver,
  };

  console.log(
    `ElvenAssist: Chapter ${report.chapter} research in ${id} - ${report.counts.researched} technologies ` +
      `researched, ${report.counts.remaining} to go, ${report.counts.unlocked} of them open now`,
  );
  console.log('ElvenAssist: The chapter technology by technology');
  console.table(report.technologies.map(toTableRow));
  // The table flattens the costs and the edges to fit; this is the graph as it stands, to open up.
  console.log('ElvenAssist: The same technologies unflattened', report.technologies);
  console.log('ElvenAssist: Goods this chapter brought in');
  console.table(report.chapterGoods);
  console.log('ElvenAssist: Goods carried over from earlier chapters');
  console.table(report.carriedOver);

  return report;
}

/** console.table gives an object-valued cell no more than "Object", so the nesting is spelled out. */
function toTableRow(tech: ExportedTechnology) {
  return {
    id: tech.id,
    name: tech.name,
    state: tech.state,
    kp: tech.kp_cost,
    kp_left: tech.kp_missing,
    costs: formatAmounts(tech.costs),
    parents: tech.parents?.join(' + '),
    children: tech.children?.join(' + '),
  };
}

function formatAmounts(amounts: Record<string, number> | undefined): string {
  return Object.entries(amounts ?? {})
    .map(([good, amount]) => `${good} ${amount.toLocaleString()}`)
    .join(', ');
}
