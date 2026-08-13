import { saveToStorage } from '../chrome/storage';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { AvailableTechnology, ResearchStatus, TechnologyProgressResponse } from '../model/researchStatus';
import { ResearchTechnology } from '../model/researchTechnology';
import { smartCompress } from '../util/compression';
import { getAccountBySessionId } from './AccountManager';
import { extractElvenarResponse } from './extractElvenarResponse';
import { getResearchTechnologies } from './getResearchTechnologies';

/**
 * Where the city stands in the research tree. The game sends only the technologies it has opened,
 * so the two other states are worked out against the tree from the balancing file: a technology
 * whose predecessors are all researched can be paid into now, anything else is still shut.
 *
 * The scouting gates are not consulted — a gated technology counts as available once its
 * predecessors are done, whether or not the provinces behind it have been finished.
 */
export async function processResearchStatus(
  untypedResponseArray: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
): Promise<void> {
  const technologies = extractElvenarResponse<TechnologyProgressResponse[]>(
    untypedResponseArray,
    'ResearchService',
    'startup',
  ).flatMap((entries) => entries);

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  const cityQuery = accountData?.cityQuery;
  if (!cityQuery) {
    console.warn('ElvenAssist: No account for session, dropping research status:', sharedInfo.sessionId);
    return;
  }

  const tree = await getResearchTechnologies();
  const researched = new Set(technologies.filter((tech) => tech.progress.is_paid).map((tech) => tech.id));

  if (researched.size > 0 && !tree.some((tech) => researched.has(tech.id))) {
    // Either the tree has not been captured yet or the one in storage belongs to the other race,
    // and guessing at the states from a tree this city is not on would only store fiction.
    console.warn('ElvenAssist: Research tree missing or from another race, dropping research status');
    return;
  }

  const status = classifyResearchStatus(tree, technologies, researched, cityQuery.chapter);

  const compressed = await smartCompress(JSON.stringify(status));
  await saveToStorage(`research_${cityQuery.accountId}`, compressed);
}

export function classifyResearchStatus(
  tree: ResearchTechnology[],
  technologies: TechnologyProgressResponse[],
  researched: Set<string>,
  cityChapter: number,
): ResearchStatus {
  const byId = new Map(tree.map((tech) => [tech.id, tech]));
  const invested = new Map(technologies.map((tech) => [tech.id, tech.progress.currentSP ?? 0]));

  // The root of the tree carries no cost and is never paid for, so a child of it is not held back
  // by it. Anything else that isn't in the tree is treated the same way rather than locking its
  // children on a predecessor nothing knows about.
  const isDone = (id: string) => researched.has(id) || byId.get(id)?.maxSP === undefined;

  const chapter = cityChapter || Math.max(...tree.filter((tech) => researched.has(tech.id)).map((t) => t.section), 1);

  const status: ResearchStatus = { chapter, researched: [], available: [], locked: [] };

  for (const tech of tree) {
    if (tech.maxSP === undefined || tech.section > chapter) {
      continue;
    }

    if (researched.has(tech.id)) {
      status.researched.push(tech.id);
    } else if ((tech.parentIds ?? []).every(isDone)) {
      status.available.push({
        id: tech.id,
        missingKp: Math.max(0, tech.maxSP - (invested.get(tech.id) ?? 0)),
      } satisfies AvailableTechnology);
    } else {
      status.locked.push(tech.id);
    }
  }

  return status;
}
