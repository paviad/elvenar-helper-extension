/**
 * How far one of your ancient wonders is through its current research phase.
 *
 * The game's own `AncientWonderPhase` carries the full contribution ledger, banners and
 * rewards; none of that is wanted here and all of it would be written to local storage on
 * every city load, so it is thinned to the two numbers on the way in. Only research phases
 * are represented at all — a wonder collecting runes takes no knowledge points, so it has
 * no entry rather than an entry of zero.
 */
export interface WonderKp {
  /** Matches `Building.base_name`, so it joins straight onto the wonder catalog. */
  baseName: string;
  invested: number;
  required: number;
}

/** Knowledge points the wonder can still take before the phase completes. */
export function wonderKpRemaining(progress: WonderKp): number {
  return Math.max(0, progress.required - progress.invested);
}
