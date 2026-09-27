import { AncientWonderPhase, AncientWonderPhaseClass } from '../model/ancientWonderPhase';
import { KpGift, KpGiven, KpStanding } from '../model/kpGiven';

const DAY = 24 * 60 * 60;

/**
 * A standing is only wanted between opening a wonder and giving to it, but every wonder window
 * you open adds one, so the oldest are let go.
 */
const STANDING_CAPACITY = 200;
const STANDING_TTL = 7 * DAY;

/** Comfortably longer than a swap round stays on the list. */
const GIFT_TTL = 30 * DAY;
const GIFT_CAPACITY = 500;

const standingKey = (ownerId: number, baseName: string) => `${ownerId}:${baseName}`;

/**
 * What a phase says you have given since the mark for the same wonder, and where the mark
 * stands afterwards.
 *
 * The first sight of a wonder only sets the mark: a total with nothing to compare it against
 * could be this contribution or a dozen earlier ones in the same level, and counting all of it
 * would fill a swap you have not paid. Opening the wonder's window reports the phase before you
 * give, which is what makes the gift itself measurable.
 *
 * Reports do not arrive in the order they were sent. Each gift is answered over HTTP and echoed
 * down the socket, and clicking quickly puts late echoes behind newer answers. So the mark only
 * ever rises: a report showing less than it is old news, and counting from it would count the
 * same knowledge again on the next report.
 *
 * Levels are told apart by their requirement, which grows from one level to the next. A larger
 * one is a level that has started since the mark, so all of your total in it is new; a smaller
 * one is a late report from the level before, and is ignored.
 */
function giftFrom(previous: KpStanding | undefined, next: KpStanding): { amount: number; standing: KpStanding } {
  if (!previous || next.required > previous.required) {
    return { amount: previous ? next.mine : 0, standing: next };
  }
  if (next.required < previous.required) {
    return { amount: 0, standing: previous };
  }
  return {
    amount: Math.max(0, next.mine - previous.mine),
    standing: { ...next, mine: Math.max(previous.mine, next.mine) },
  };
}

/**
 * Folds the phases of other players' wonders into what you have given. `now` is in seconds.
 * Returns the state unchanged in content when nothing in the phases concerns you.
 */
export function recordKpGiven(
  given: KpGiven | undefined,
  phases: AncientWonderPhase[],
  myPlayerId: number | undefined,
  now: number,
): KpGiven {
  const standing: Record<string, KpStanding> = { ...given?.standing };
  let gifts: KpGift[] = [...(given?.gifts ?? [])];

  if (myPlayerId) {
    for (const phase of phases) {
      if (
        phase?.__class__ !== AncientWonderPhaseClass.ResearchPhaseVO ||
        !phase.entityBaseName ||
        phase.playerId === myPlayerId ||
        phase.requiredKnowledgePoints === undefined
      ) {
        continue;
      }

      const key = standingKey(phase.playerId, phase.entityBaseName);
      const next: KpStanding = {
        mine: phase.contributions?.find((c) => c.player?.player_id === myPlayerId)?.knowledgePoints ?? 0,
        required: phase.requiredKnowledgePoints,
        seenAt: now,
      };

      const { amount, standing: mark } = giftFrom(standing[key], next);
      if (amount > 0) {
        gifts.push({ ownerId: phase.playerId, baseName: phase.entityBaseName, amount, at: now });
      }
      standing[key] = mark;
    }
  }

  const kept = Object.entries(standing)
    .filter(([, s]) => now - s.seenAt <= STANDING_TTL)
    .sort(([, a], [, b]) => b.seenAt - a.seenAt)
    .slice(0, STANDING_CAPACITY);

  gifts = gifts.filter((g) => now - g.at <= GIFT_TTL).slice(-GIFT_CAPACITY);

  return { standing: Object.fromEntries(kept), gifts };
}
