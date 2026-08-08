import { SwapBudget, SwapEntry } from '../../model/kpSwap';
import { applySwapBudgets, seedSwapBudget } from './applySwapBudgets';

const budget = (overrides: Partial<SwapBudget> = {}): SwapBudget => ({
  baseName: 'A_Abyss',
  wonderName: 'Golden Abyss',
  remaining: 145,
  countedThrough: 1000,
  ...overrides,
});

const entry = (overrides: Partial<SwapEntry> = {}): SwapEntry => ({
  threadId: 't1',
  subject: '60 KP Thread',
  amount: 60,
  recipientName: 'Aria',
  recipientPlayerId: 2,
  recipientPost: 'Needles of the Sun please',
  recipientPostedAt: 1100,
  requestedWonder: 'Golden Abyss',
  myPostedAt: 1200,
  ...overrides,
});

describe('applySwapBudgets', () => {
  it('deducts a request posted after the count started', () => {
    expect(applySwapBudgets([budget()], [entry()])[0]).toEqual(budget({ remaining: 85, countedThrough: 1200 }));
  });

  it('deducts every fresh request at once and marks the newest', () => {
    const entries = [entry(), entry({ threadId: 't2', amount: 40, myPostedAt: 1300 })];

    expect(applySwapBudgets([budget()], entries)[0]).toEqual(budget({ remaining: 45, countedThrough: 1300 }));
  });

  it('counts a request only once, however often it is applied', () => {
    const entries = [entry()];
    const once = applySwapBudgets([budget()], entries);

    expect(applySwapBudgets(once, entries)).toBe(once);
  });

  it('ignores requests for other wonders', () => {
    const budgets = [budget()];

    expect(applySwapBudgets(budgets, [entry({ requestedWonder: 'Needles of the Sun' })])).toBe(budgets);
  });

  it('ignores requests from before the count started', () => {
    const budgets = [budget()];

    expect(applySwapBudgets(budgets, [entry({ myPostedAt: 900 })])).toBe(budgets);
  });

  it('stops at nothing left rather than going negative', () => {
    expect(applySwapBudgets([budget({ remaining: 20 })], [entry()])[0].remaining).toBe(0);
  });

  it('returns the same array when there is nothing to count', () => {
    const budgets = [budget()];

    expect(applySwapBudgets(budgets, [])).toBe(budgets);
    expect(applySwapBudgets([], [entry()])).toEqual([]);
  });
});

describe('seedSwapBudget', () => {
  const seed = { baseName: 'A_Abyss', wonderName: 'Golden Abyss', remaining: 145, countedThrough: 1000 };

  it('starts a count for a wonder that has none', () => {
    expect(seedSwapBudget([], seed)).toEqual([budget()]);
  });

  it('keeps the lower figure, so pledged knowledge is not offered twice', () => {
    const existing = budget({ remaining: 85, countedThrough: 1200 });

    expect(seedSwapBudget([existing], seed)).toEqual([budget({ remaining: 85, countedThrough: 1200 })]);
  });

  it('takes the game figure once it has fallen below the count', () => {
    const existing = budget({ remaining: 85, countedThrough: 1200 });

    expect(seedSwapBudget([existing], { ...seed, remaining: 40 })[0].remaining).toBe(40);
  });

  it('leaves other wonders alone', () => {
    const other = budget({ baseName: 'A_Needles', wonderName: 'Needles of the Sun' });

    expect(seedSwapBudget([other], seed).map((b) => b.baseName)).toEqual(['A_Needles', 'A_Abyss']);
  });
});
