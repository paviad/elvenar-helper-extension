import { KpGift } from '../../model/kpGiven';
import { SwapEntry, swapPaidKey } from '../../model/kpSwap';

/**
 * How far before a request a gift may be dated and still count toward it. The gift is stamped
 * by this machine's clock and the request by the game's, which need not agree to the second.
 */
const CLOCK_SLACK = 5 * 60;

/**
 * Shares out what you have given across the swaps you owe, keyed by `swapPaidKey`.
 *
 * A gift counts toward a swap when it went to that swap's payee after they asked, so that
 * knowledge you gave them in an earlier round is not taken for this one. Swaps naming a wonder
 * are served first from gifts to that very wonder, oldest request first; a swap whose post
 * could not be read as a wonder then takes whatever of theirs is left, into any wonder. No
 * swap is credited with more than it asked for, and no gift is spent twice.
 */
export function allocateKpGiven(
  entries: SwapEntry[],
  gifts: KpGift[],
  baseNameOf: (wonderName: string) => string | undefined,
): Map<string, number> {
  const allocated = new Map<string, number>();
  const left = gifts.map((gift) => ({ ...gift }));

  const oldestFirst = [...entries].sort((a, b) => a.recipientPostedAt - b.recipientPostedAt);
  const wonderOf = (entry: SwapEntry) => (entry.recipientWonder ? baseNameOf(entry.recipientWonder) : undefined);

  const serve = (entry: SwapEntry, baseName: string | undefined) => {
    let owed = entry.amount - (allocated.get(swapPaidKey(entry)) ?? 0);
    for (const gift of left) {
      if (owed <= 0) {
        break;
      }
      if (
        gift.amount <= 0 ||
        gift.ownerId !== entry.recipientPlayerId ||
        gift.at < entry.recipientPostedAt - CLOCK_SLACK ||
        (baseName !== undefined && gift.baseName !== baseName)
      ) {
        continue;
      }
      const taken = Math.min(owed, gift.amount);
      gift.amount -= taken;
      owed -= taken;
      allocated.set(swapPaidKey(entry), (allocated.get(swapPaidKey(entry)) ?? 0) + taken);
    }
  };

  for (const entry of oldestFirst) {
    const baseName = wonderOf(entry);
    if (baseName !== undefined) {
      serve(entry, baseName);
    }
  }
  for (const entry of oldestFirst) {
    if (wonderOf(entry) === undefined) {
      serve(entry, undefined);
    }
  }

  return allocated;
}
