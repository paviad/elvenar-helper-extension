import { KpGift } from '../../model/kpGiven';
import { SwapEntry, swapPaidKey } from '../../model/kpSwap';
import { allocateKpGiven } from './allocateKpGiven';

const WONDERS: Record<string, string> = { 'Golden Abyss': 'B_All_AW2', 'Needles of Frost': 'B_Gr5_AW1' };
const baseNameOf = (name: string) => WONDERS[name];

const T = 1_790_000_000;

const entry = (threadId: string, amount: number, recipientWonder?: string, postedAt = T, payee = 7): SwapEntry => ({
  threadId,
  subject: `${amount} KP swap`,
  amount,
  recipientName: 'Them',
  recipientPlayerId: payee,
  recipientPost: recipientWonder ? `${recipientWonder} please` : 'thank you!',
  recipientWonder,
  recipientPostedAt: postedAt,
  requestedWonder: 'Crystal Lighthouse',
  myPostedAt: postedAt + 60,
});

const gift = (amount: number, baseName = 'B_All_AW2', at = T + 120, ownerId = 7): KpGift => ({
  ownerId,
  baseName,
  amount,
  at,
});

const given = (entries: SwapEntry[], gifts: KpGift[]) => {
  const allocated = allocateKpGiven(entries, gifts, baseNameOf);
  return entries.map((e) => allocated.get(swapPaidKey(e)) ?? 0);
};

describe('allocateKpGiven', () => {
  it('fills a swap from gifts to the wonder it asked for', () => {
    expect(given([entry('a', 60, 'Golden Abyss')], [gift(20), gift(15)])).toEqual([35]);
  });

  it('credits no swap with more than it asked for', () => {
    expect(given([entry('a', 10, 'Golden Abyss')], [gift(25)])).toEqual([10]);
  });

  it('leaves out gifts to another wonder, another player, or from before they asked', () => {
    const gifts = [gift(5, 'B_Gr5_AW1'), gift(5, 'B_All_AW2', T + 120, 8), gift(5, 'B_All_AW2', T - 3600)];

    expect(given([entry('a', 60, 'Golden Abyss')], gifts)).toEqual([0]);
  });

  it('spends each gift once across the swaps it could serve, oldest request first', () => {
    const entries = [entry('new', 10, 'Golden Abyss', T + 30), entry('old', 10, 'Golden Abyss', T)];

    expect(given(entries, [gift(15, 'B_All_AW2', T + 120)])).toEqual([5, 10]);
  });

  it('gives a post it could not read whatever is left, into any wonder', () => {
    const entries = [entry('named', 10, 'Golden Abyss'), entry('unread', 10)];

    expect(given(entries, [gift(15, 'B_All_AW2'), gift(4, 'B_Gr5_AW1')])).toEqual([10, 9]);
  });
});
