import { KpGift } from '../../model/kpGiven';
import { SwapEntry, swapPaidKey } from '../../model/kpSwap';

export interface GivenToPayee {
  total: number;
  /** Largest first. */
  byWonder: { baseName: string; amount: number }[];
}

/**
 * What you have put into one player's wonders since the oldest of your posts that left you
 * owing them.
 *
 * Counted per player rather than per thread, because the threads say which wonder was wanted
 * only in whatever words the player chose — "any", "fav", a nickname — and the game only says
 * which wonder was given to. The two are shown side by side instead of being matched up.
 *
 * Counted from your post rather than theirs: their request can be hours old, and in that time
 * you may well have given them knowledge for a different thread entirely. A swap only lands on
 * this list once you have posted in it, so what you give toward it comes after.
 */
export function givenToPayee(playerId: number, entries: SwapEntry[], gifts: KpGift[]): GivenToPayee {
  if (entries.length === 0) {
    return { total: 0, byWonder: [] };
  }
  // No allowance either side: gifts are stamped in the game's time, like the posts, and paying
  // one player seconds before posting in the next thread is the ordinary rhythm of a round.
  const since = Math.min(...entries.map((e) => e.myPostedAt));

  const byWonder = new Map<string, number>();
  for (const gift of gifts) {
    if (gift.ownerId === playerId && gift.at >= since && gift.amount > 0) {
      byWonder.set(gift.baseName, (byWonder.get(gift.baseName) ?? 0) + gift.amount);
    }
  }

  return {
    total: [...byWonder.values()].reduce((sum, amount) => sum + amount, 0),
    byWonder: [...byWonder.entries()]
      .map(([baseName, amount]) => ({ baseName, amount }))
      .sort((a, b) => b.amount - a.amount || a.baseName.localeCompare(b.baseName)),
  };
}

/**
 * What is still to give a player, given what the game has seen and what you ticked off.
 *
 * The two are taken as evidence of the same payments rather than added: a tick can be for a
 * gift the game also reported, and adding them would call a player repaid who is not. So the
 * larger stands in for both. A tick for a gift the game never saw still counts in full.
 */
export function remainingOwed(entries: SwapEntry[], paid: Set<string>, given: number): number {
  const owed = entries.reduce((sum, e) => sum + e.amount, 0);
  const ticked = entries.filter((e) => paid.has(swapPaidKey(e))).reduce((sum, e) => sum + e.amount, 0);
  return Math.max(0, owed - Math.max(given, ticked));
}
