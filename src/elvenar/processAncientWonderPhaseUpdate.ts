import { AncientWonderPhase } from '../model/ancientWonderPhase';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { WonderKp } from '../model/wonderKp';
import { getAccountBySessionId } from './AccountManager';
import { extractElvenarResponse } from './extractElvenarResponse';
import { extractWonderKp } from './extractWonderKp';

/**
 * Keeps the stored knowledge point standing current as contributions land, so the swap
 * tab does not have to wait for the next city load to notice a wonder filling up.
 *
 * A wonder that finishes its research phase reports back as a runes phase, which
 * `extractWonderKp` drops — so the update has to be able to remove an entry as well as
 * replace one. Wonders the update does not mention are left exactly as they were.
 */
export const processAncientWonderPhaseUpdate = async (
  json: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<void> => {
  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  const cityQuery = accountData?.cityQuery;
  if (!cityQuery) {
    return;
  }

  const updated = extractElvenarResponse<AncientWonderPhase[]>(json, 'AncientWonderService', 'phaseUpdated').flat();

  const playerId = cityQuery.userData?.player_id;
  const mine = updated.filter((phase) => phase?.entityBaseName && phase.playerId === playerId);
  if (mine.length === 0) {
    return;
  }

  const byBaseName = new Map<string, WonderKp>((cityQuery.wonderKp ?? []).map((kp) => [kp.baseName, kp]));
  for (const phase of mine) {
    byBaseName.delete(phase.entityBaseName);
  }
  for (const kp of extractWonderKp(mine, playerId)) {
    byBaseName.set(kp.baseName, kp);
  }

  cityQuery.wonderKp = [...byBaseName.values()];
};
