// How often event currency chests turn up, shared by the page that sees them arrive and the
// overlay that keeps and shows the figures: the rule for which arrivals count, the message the one
// sends the other, and the arithmetic over what was kept.
//
// Nothing here touches the game or the DOM - that is `localTimeEventChests.ts` - so it can be
// exercised as plain functions from either bundle.

/**
 * What one arrival meant for the timing.
 *
 * - `atLoad` - the chest was already lying there when the page loaded, so when it spawned is
 *   unknown. It counts for nothing, not even as a start: the next one only starts the clock.
 * - `start` - the first chest seen to spawn since the page loaded. Nothing to measure from yet.
 * - `interval` - a chest following another one seen to spawn in the same page.
 */
export type EventChestOutcome = 'atLoad' | 'start' | 'interval';

export interface EventChestArrival {
  at: number;
  outcome: EventChestOutcome;
  /** `interval` only: the time since the previous chest. */
  ms?: number;
}

export interface EventChestMessage {
  type: 'eventChest';
  payload: EventChestArrival;
}

/**
 * The clock for one page, from its load to its reload.
 *
 * Only ever measures between two chests both seen to spawn while the page was open. The first
 * after a load is the start, because the time back to the previous one belongs to a page that is
 * gone - and might have been stretched by whatever error or expired session took it down. One
 * already there at load is the same thing worse: it could have spawned at any time before.
 */
export const createEventChestClock = () => {
  let startedAt: number | undefined;

  return (at: number, atLoad: boolean): EventChestArrival => {
    if (atLoad) {
      startedAt = undefined;
      return { at, outcome: 'atLoad' };
    }
    if (startedAt === undefined) {
      startedAt = at;
      return { at, outcome: 'start' };
    }
    const ms = at - startedAt;
    startedAt = at;
    return { at, outcome: 'interval', ms };
  };
};

/** One measured gap, kept by the overlay. `at` is when the chest that closed it arrived. */
export interface EventChestInterval {
  at: number;
  ms: number;
}

/** A finished event's figures, put aside so the next event starts from nothing. */
export interface EventChestArchiveEntry {
  archivedAt: number;
  /** When the first and last kept intervals closed. */
  from: number;
  to: number;
  count: number;
  averageMs: number;
}

export const averageInterval = (intervals: EventChestInterval[]) =>
  intervals.length ? intervals.reduce((sum, interval) => sum + interval.ms, 0) / intervals.length : undefined;

/** Nothing to archive from an empty list. */
export const archiveIntervals = (
  intervals: EventChestInterval[],
  now = Date.now(),
): EventChestArchiveEntry | undefined => {
  const averageMs = averageInterval(intervals);
  if (averageMs === undefined) {
    return undefined;
  }
  const times = intervals.map((interval) => interval.at);
  return {
    archivedAt: now,
    from: Math.min(...times),
    to: Math.max(...times),
    count: intervals.length,
    averageMs,
  };
};

/** `1h 04m 09s`, `12m 30s`, `45s` - seconds kept, since gaps can be minutes long. */
export const formatInterval = (ms: number) => {
  const total = Math.round(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${pad(seconds)}s`;
  }
  return `${seconds}s`;
};
