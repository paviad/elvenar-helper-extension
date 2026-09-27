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
 * What a phase says you have given since the last one for the same wonder.
 *
 * The first sight of a wonder only sets the mark: a total with nothing to compare it against
 * could be this contribution or a dozen earlier ones in the same level, and counting all of it
 * would fill a swap you have not paid. Opening the wonder's window reports the phase before you
 * give, which is what makes the gift itself measurable.
 *
 * A level that has moved on since the mark started from nothing, so all of your total in it is
 * new. An identical phase arriving twice — the game repeats itself — rises by nothing and
 * records nothing.
 */
function giftFrom(previous: KpStanding | undefined, next: KpStanding): number {
  if (!previous) {
    return 0;
  }
  const sameLevel = previous.required === next.required && next.invested >= previous.invested;
  return sameLevel ? next.mine - previous.mine : next.mine;
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
        invested: phase.investedKnowledgePoints ?? 0,
        seenAt: now,
      };

      const amount = giftFrom(standing[key], next);
      if (amount > 0) {
        gifts.push({ ownerId: phase.playerId, baseName: phase.entityBaseName, amount, at: now });
      }
      standing[key] = next;
    }
  }

  const kept = Object.entries(standing)
    .filter(([, s]) => now - s.seenAt <= STANDING_TTL)
    .sort(([, a], [, b]) => b.seenAt - a.seenAt)
    .slice(0, STANDING_CAPACITY);

  gifts = gifts.filter((g) => now - g.at <= GIFT_TTL).slice(-GIFT_CAPACITY);

  return { standing: Object.fromEntries(kept), gifts };
}
