/** Fraction of lifetime remaining at or below which the bar turns orange. */
export const EXPIRY_WARN_FRACTION = 0.5;

/** Fraction of lifetime remaining below which the bar turns red. */
export const EXPIRY_CRITICAL_FRACTION = 0.25;

export const EXPIRY_COLORS = {
  fresh: '#4caf50',
  warn: '#ff9800',
  critical: '#f44336',
} as const;

/** Thickness of the bar along the block's bottom edge, in tiles. */
export const EXPIRY_BAR_TILES = 0.25;

/** The unfilled remainder of the bar, so the consumed share reads as consumed. */
export const EXPIRY_TRACK_COLOR = 'rgba(0, 0, 0, 0.35)';

/** Milliseconds in a day. */
const DAY_MS = 86_400_000;

/** The "Nd" days-left text for a block, or undefined when it has no expiry end. */
export function daysLeftLabel(endMs: number | undefined, nowMs: number): string | undefined {
  if (!endMs) return undefined;
  return `${Math.max(0, Math.round((endMs - nowMs) / DAY_MS))}d`;
}

export interface ExpiryProgress {
  /** Share of the lifetime still to run, 0..1. */
  remaining: number;
  color: string;
}

/**
 * How far through its life an expiring building is: green while more than half
 * remains, orange down to a quarter, red below that. Null when either the lifetime
 * or the end is unknown, which is a block with nothing to draw.
 */
export function expiryProgress(
  lifetimeSeconds: number | undefined,
  endMs: number | undefined,
  nowMs: number,
): ExpiryProgress | null {
  if (!lifetimeSeconds || !endMs) return null;

  const remaining = Math.min(1, Math.max(0, (endMs - nowMs) / (lifetimeSeconds * 1000)));
  const color =
    remaining < EXPIRY_CRITICAL_FRACTION
      ? EXPIRY_COLORS.critical
      : remaining <= EXPIRY_WARN_FRACTION
        ? EXPIRY_COLORS.warn
        : EXPIRY_COLORS.fresh;

  return { remaining, color };
}
