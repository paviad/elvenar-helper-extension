import { KpGift } from '../../model/kpGiven';
import { SwapEntry, swapPaidKey } from '../../model/kpSwap';
import { givenToPayee, remainingOwed } from './givenToPayee';

const T = 1_790_000_000;
const PAYEE = 7;

const entry = (threadId: string, amount: number, postedAt = T): SwapEntry => ({
  threadId,
  subject: `${amount} KP swap`,
  amount,
  recipientName: 'Them',
  recipientPlayerId: PAYEE,
  recipientPost: 'any please',
  recipientPostedAt: postedAt,
  requestedWonder: 'Crystal Lighthouse',
  myPostedAt: postedAt + 60,
});

const gift = (amount: number, baseName = 'B_All_AW2', at = T + 120, ownerId = PAYEE): KpGift => ({
  ownerId,
  baseName,
  amount,
  at,
});

describe('givenToPayee', () => {
  it('adds up what went into each of their wonders, largest first', () => {
    const given = givenToPayee(
      PAYEE,
      [entry('a', 60), entry('b', 20)],
      [gift(5, 'B_Gr5_AW1'), gift(20, 'B_All_AW2'), gift(5, 'B_All_AW2'), gift(20, 'B_Gr5_AW1')],
    );

    expect(given).toEqual({
      total: 50,
      byWonder: [
        { baseName: 'B_All_AW2', amount: 25 },
        { baseName: 'B_Gr5_AW1', amount: 25 },
      ],
    });
  });

  it('counts from the oldest request owed, not the newest', () => {
    const entries = [entry('old', 10, T), entry('new', 10, T + 3600)];

    expect(givenToPayee(PAYEE, entries, [gift(10, 'B_All_AW2', T + 60)]).total).toBe(10);
  });

  it('leaves out a gift for another debt made after they asked but before you posted', () => {
    // They asked at T; you paid them for a different thread at T + 120 and only answered
    // this one an hour later.
    const late = { ...entry('a', 60), myPostedAt: T + 3600 };

    expect(givenToPayee(PAYEE, [late], [gift(20, 'B_All_AW2', T + 120)])).toEqual({ total: 0, byWonder: [] });
  });

  it('leaves out gifts to someone else and from before they asked', () => {
    const gifts = [gift(5, 'B_All_AW2', T + 120, 8), gift(5, 'B_All_AW2', T - 3600)];

    expect(givenToPayee(PAYEE, [entry('a', 60)], gifts)).toEqual({ total: 0, byWonder: [] });
  });

  it('leaves out a gift made seconds before your post', () => {
    // Paying off the thread before, then posting in this one straight away. Your post is at T + 60.
    expect(givenToPayee(PAYEE, [entry('a', 60)], [gift(20, 'B_All_AW2', T + 47)]).total).toBe(0);
  });

  it('counts a gift made in the same second as your post', () => {
    expect(givenToPayee(PAYEE, [entry('a', 60)], [gift(5, 'B_All_AW2', T + 60)]).total).toBe(5);
  });
});

describe('remainingOwed', () => {
  const entries = [entry('a', 60), entry('b', 20)];

  it('takes what the game saw off the total', () => {
    expect(remainingOwed(entries, new Set(), 45)).toBe(35);
  });

  it('never goes below nothing', () => {
    expect(remainingOwed(entries, new Set(), 100)).toBe(0);
  });

  it('does not count a ticked swap and the gift that paid it twice', () => {
    expect(remainingOwed(entries, new Set([swapPaidKey(entries[0])]), 60)).toBe(20);
  });

  it('counts a tick for a gift the game never saw', () => {
    expect(remainingOwed(entries, new Set([swapPaidKey(entries[1])]), 0)).toBe(60);
  });
});
