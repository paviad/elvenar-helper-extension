let storeTimestamp = 0;
let spirePicks: string[] = [];
let pendingWaiter: ((picks: string[]) => void) | undefined;

export const storePicksForLaterUse = (picks: string[]) => {
  spirePicks = picks;
  storeTimestamp = Date.now();
  console.log('Spire picks stored for later use:', spirePicks, storeTimestamp);

  const waiter = pendingWaiter;
  pendingWaiter = undefined;
  waiter?.(takeStoredPicks());
};

const getStoredPicks = () => {
  const currentTime = Date.now();
  if (currentTime - storeTimestamp > 10000) {
    // If more than 10 seconds has passed since storing
    console.log('stale picks cleared', spirePicks, storeTimestamp, currentTime, currentTime - storeTimestamp);
    spirePicks = [];
  }
  return spirePicks;
};

// Consume-once. The getData and submit handlers both run this flow, so leaving picks in
// place would let the second one invest the same recommendation a second time.
const takeStoredPicks = () => {
  const picks = getStoredPicks();
  spirePicks = [];
  return picks;
};

/**
 * Resolves as soon as picks are available, or with an empty array once timeoutMs elapses.
 * Replaces the old fixed sleep so a slow (or throttled) Spire Wizard tab is waited for
 * instead of missed.
 */
export const waitForPicks = async (timeoutMs: number): Promise<string[]> => {
  const available = takeStoredPicks();
  if (available.length > 0) {
    return available;
  }

  // Newest waiter wins: release any earlier one empty-handed rather than let it consume
  // picks that belong to a later exchange.
  const superseded = pendingWaiter;
  pendingWaiter = undefined;
  superseded?.([]);

  return new Promise<string[]>((resolve) => {
    // waiter is referenced here only from inside the callback, which cannot run before
    // the declaration below has been evaluated.
    const timer = setTimeout(() => {
      if (pendingWaiter === waiter) {
        pendingWaiter = undefined;
      }
      console.warn(`ElvenAssist: no spire picks arrived within ${timeoutMs}ms`);
      resolve([]);
    }, timeoutMs);

    const waiter = (picks: string[]) => {
      clearTimeout(timer);
      resolve(picks);
    };

    pendingWaiter = waiter;
  });
};
