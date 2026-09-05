type Encounter = typeof window.aviad_se | undefined;

let spirePicks: string[] = [];
let picksEncounter: Encounter;
let pendingWaiter: ((picks: string[]) => void) | undefined;
let waiterEncounter: Encounter;

/**
 * The encounter the game has loaded right now. Identity, not pointId: reopening the same point
 * builds a fresh wrapper, and that is exactly the boundary we care about — a new wrapper means
 * a new diplomacy window is coming, and the old one is never coming back.
 */
const currentEncounter = (): Encounter => window.aviad_se;

export const storePicksForLaterUse = (picks: string[]) => {
  const encounter = currentEncounter();

  // A waiter whose encounter the game has since replaced belongs to a diplomacy window that is
  // gone. Resolving it with these picks spends them on the dead window — and worse, `_onInvest`
  // is looked up per pick, so a loop that is still running when the new window opens puts its
  // remaining picks into that one, shifted into the wrong frames.
  if (pendingWaiter && waiterEncounter !== encounter) {
    console.log('Abandoning spire picks waiter from a previous encounter');
    const abandoned = pendingWaiter;
    pendingWaiter = undefined;
    abandoned([]);
  }

  spirePicks = picks;
  picksEncounter = encounter;
  console.log('Spire picks stored for later use:', spirePicks);

  const waiter = pendingWaiter;
  pendingWaiter = undefined;
  waiter?.(takeStoredPicks());
};

/**
 * Picks stay good for as long as the encounter they were computed for is the one loaded. The
 * player is free to take their time over "Negotiate".
 *
 * This used to be a ten second wall clock, which mistook deliberation for staleness and threw
 * away picks that were still perfectly valid — leaving a handler waiting for picks that had
 * already arrived, which is where every downstream symptom came from.
 */
const getStoredPicks = () => {
  if (picksEncounter !== currentEncounter()) {
    console.log('Spire picks belong to another encounter, discarding', spirePicks);
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
    console.log('Returning already available picks', available);
    return available;
  }

  // Newest waiter wins: release any earlier one empty-handed rather than let it consume
  // picks that belong to a later exchange.
  const superseded = pendingWaiter;
  pendingWaiter = undefined;
  console.log('Clearing superseded waiter', superseded);
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
      console.log('Waiter resolved with picks', picks);
      clearTimeout(timer);
      resolve(picks);
    };

    pendingWaiter = waiter;
    waiterEncounter = currentEncounter();
  });
};
