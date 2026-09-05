import { WorldNeighbor } from '../model/worldNeighbors';

/** The width of a bin: the panel groups upcoming help by the hour. */
export const COOLDOWN_BIN_MS = 60 * 60 * 1000;

export interface CooldownBin {
  /** Whole hours from now that this bin starts at, so bin 0 is everyone due within the hour. */
  hour: number;
  /** The bin's span, absolute, so a caller can label it without redoing the arithmetic. */
  start: number;
  end: number;
  /** Who comes off cooldown inside it, soonest first. */
  neighbors: WorldNeighbor[];
  /** How many will have come back by the end of this bin, this one and every earlier bin. */
  cumulative: number;
}

/**
 * Groups the neighbors still on cooldown into one-hour bins measured from `now`.
 *
 * Every hour up to the last one with somebody in it gets a bin, the empty ones included, so the
 * result reads as a timeline: a three-hour lull is three empty bins rather than a jump in the
 * labels that the eye has to catch on its own. A neighbor whose stamped end time has already
 * passed - the list has been sitting around for a while - belongs in the first bin, which is
 * where "due within the hour" puts them.
 *
 * Only `cooldownEndsAt` is consulted: a neighbor without one is off cooldown, which is what the
 * absent stamp means.
 */
export const binNeighborCooldowns = (neighbors: WorldNeighbor[], now: number): CooldownBin[] => {
  const upcoming = neighbors
    .filter((neighbor) => neighbor.cooldownEndsAt !== undefined)
    .sort((a, b) => a.cooldownEndsAt! - b.cooldownEndsAt!);

  if (upcoming.length === 0) {
    return [];
  }

  const hourOf = (neighbor: WorldNeighbor) =>
    Math.max(0, Math.floor((neighbor.cooldownEndsAt! - now) / COOLDOWN_BIN_MS));

  const lastHour = hourOf(upcoming[upcoming.length - 1]);
  const bins: CooldownBin[] = [];
  let cumulative = 0;
  let next = 0;

  for (let hour = 0; hour <= lastHour; hour++) {
    const members: WorldNeighbor[] = [];
    // The list is sorted, so everyone belonging to this hour is sitting at the front of what is
    // left of it.
    while (next < upcoming.length && hourOf(upcoming[next]) === hour) {
      members.push(upcoming[next]);
      next++;
    }
    cumulative += members.length;
    bins.push({
      hour,
      start: now + hour * COOLDOWN_BIN_MS,
      end: now + (hour + 1) * COOLDOWN_BIN_MS,
      neighbors: members,
      cumulative,
    });
  }

  return bins;
};
