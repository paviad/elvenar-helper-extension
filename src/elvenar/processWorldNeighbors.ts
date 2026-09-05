import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { WorldNeighbor, WorldNeighborsResponse } from '../model/worldNeighbors';

/**
 * Turns each neighbor's `cool_down` - the seconds left when the response arrived - into the
 * absolute moment it runs out.
 *
 * Nothing decrements `cool_down` after this, so on its own it is only true for the instant the
 * answer landed: a list fetched an hour ago would still claim every cooldown has its full hour to
 * go. The stamp is what lets the panel say when help actually comes back.
 */
export const stampCooldownEnds = (neighbors: WorldNeighbor[], at: number): WorldNeighbor[] =>
  neighbors.map((neighbor) =>
    neighbor.cool_down ? { ...neighbor, cooldownEndsAt: at + neighbor.cool_down * 1000 } : { ...neighbor },
  );

export const processWorldNeighbors = async (
  untypedJson: unknown,
  sharedInfo: ExtensionSharedInfo,
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<WorldNeighbor[]> => {
  const response = untypedJson as ElvenarRequestResponseEntry[];

  const worldNeighborsResponse = response.find(
    (entry) => entry.requestClass === 'WorldMapService' && entry.requestMethod === 'getDiscoveredPlayerProvinces',
  ) as WorldNeighborsResponse | undefined;

  const rc = stampCooldownEnds(worldNeighborsResponse?.responseData || [], Date.now());

  return rc;
};
