import { stampCooldownEnds } from '../elvenar/processWorldNeighbors';
import { WorldNeighbor } from '../model/worldNeighbors';

/**
 * Whether a neighbor can be helped right now: off cooldown, and not already sent help that the
 * server has yet to confirm.
 */
export const isAvailableForHelp = (neighbor: WorldNeighbor) => !neighbor.cool_down && neighbor.helpSentAt === undefined;

/**
 * Records that help went out to a neighbor, ahead of the server saying so.
 *
 * The record lives in the neighbor list itself rather than beside it, so whatever reads the list
 * afterwards - the panel re-sorting, a later help run, the panel reopened - sees the neighbor as
 * helped. It lasts until the server's own word on that province replaces it.
 */
export const markHelpSent = (neighbors: WorldNeighbor[], playerId: number, at: number): WorldNeighbor[] =>
  neighbors.map((neighbor) => (neighbor.player_id === playerId ? { ...neighbor, helpSentAt: at } : neighbor));

/**
 * Folds the `WorldMapService/updateProvince` push the server sends after a help into the list.
 *
 * The push carries the province's new `cool_down`, so the neighbor moves onto the timeline with
 * its real end time and the provisional `helpSentAt` mark goes. A province that is not one of the
 * listed neighbors - the push covers other provinces too - leaves the list alone.
 */
export const applyProvinceUpdate = (
  neighbors: WorldNeighbor[],
  province: WorldNeighbor,
  at: number,
): WorldNeighbor[] => {
  if (!neighbors.some((neighbor) => neighbor.player_id === province.player_id)) {
    return neighbors;
  }
  return neighbors.map((neighbor) => {
    if (neighbor.player_id !== province.player_id) {
      return neighbor;
    }
    const { helpSentAt: _sent, cooldownEndsAt: _ends, ...rest } = { ...neighbor, ...province };
    return stampCooldownEnds([rest], at)[0];
  });
};
