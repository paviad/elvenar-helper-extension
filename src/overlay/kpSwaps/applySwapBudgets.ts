import { SwapBudget, SwapEntry } from '../../model/kpSwap';

/**
 * Deducts the requests you have posted since each budget was last counted.
 *
 * Each request is consumed exactly once, by moving `countedThrough` past it — a request that
 * has been counted stays counted even after the tally that reported it is cleared away.
 * Returns the same array when nothing has changed, so a caller can use it to decide whether
 * to write anything back.
 */
export function applySwapBudgets(budgets: SwapBudget[], entries: SwapEntry[]): SwapBudget[] {
  if (budgets.length === 0) {
    return budgets;
  }

  let changed = false;
  const next = budgets.map((budget) => {
    const fresh = entries.filter(
      (e) => e.requestedWonder === budget.wonderName && e.myPostedAt > budget.countedThrough,
    );
    if (fresh.length === 0) {
      return budget;
    }
    changed = true;
    return {
      ...budget,
      remaining: Math.max(0, budget.remaining - fresh.reduce((sum, e) => sum + e.amount, 0)),
      countedThrough: fresh.reduce((newest, e) => Math.max(newest, e.myPostedAt), budget.countedThrough),
    };
  });

  return changed ? next : budgets;
}

/**
 * Starts, or restarts, the count for a wonder.
 *
 * Copying a request again re-reads the game's figure, but never forgets what has already
 * been counted: knowledge that has landed since shows up as a smaller figure and wins, while
 * knowledge still owed to you does not, so the lower of the two is the honest number. The
 * counting mark stays where it was for the same reason — the requests behind it are still
 * outstanding and must not be deducted twice.
 */
export function seedSwapBudget(
  budgets: SwapBudget[],
  seed: { baseName: string; wonderName: string; remaining: number; countedThrough: number },
): SwapBudget[] {
  const existing = budgets.find((b) => b.baseName === seed.baseName);
  const budget: SwapBudget = {
    baseName: seed.baseName,
    wonderName: seed.wonderName,
    remaining: existing ? Math.min(existing.remaining, seed.remaining) : seed.remaining,
    countedThrough: existing ? existing.countedThrough : seed.countedThrough,
  };

  return [...budgets.filter((b) => b.baseName !== seed.baseName), budget];
}
