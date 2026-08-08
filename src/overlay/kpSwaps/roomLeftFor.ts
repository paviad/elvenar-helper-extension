import { PendingRequest } from '../../model/kpSwap';
import { WonderKp, wonderKpRemaining } from '../../model/wonderKp';

/**
 * What the wonder can still be asked for, once the requests awaiting payment are allowed for.
 *
 * The game reports a wonder as needing everything it has not been given, so a request nobody
 * has answered yet sits in that figure twice over: once as knowledge the wonder lacks, once as
 * knowledge already on its way to you. Asking for it again is what makes a wonder overflow and
 * wastes the giver's points.
 *
 * Deriving this rather than counting down from a stored figure is what keeps it honest across
 * the moment of payment: the payer's post retires the pending request and lifts the wonder's
 * invested total by the same amount, so the answer does not move. Undefined when the game has
 * said nothing about the wonder, which is not the same as it having no room.
 */
export function roomLeftFor(
  progress: WonderKp | undefined,
  pendingRequests: PendingRequest[],
  wonderName: string,
): number | undefined {
  if (!progress) {
    return undefined;
  }
  const pending = pendingRequests.filter((r) => r.requestedWonder === wonderName).reduce((sum, r) => sum + r.amount, 0);

  return Math.max(0, wonderKpRemaining(progress) - pending);
}
