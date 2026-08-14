import { AncientWonderPhase } from '../model/ancientWonderPhase';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { WonderKp } from '../model/wonderKp';
import { getAccountBySessionId } from './AccountManager';
import { extractElvenarResponse } from './extractElvenarResponse';
import { extractWonderKp } from './extractWonderKp';

/** What the game sends back when a wonder's own window is opened. */
interface OtherPlayerAncientWonders {
  ancientWonderPhases?: AncientWonderPhase[];
}

/**
 * The wonder phases carried by either of the two things that report one.
 *
 * `phaseUpdated` is a bare list of phases; the wonder window's answer buries the same list
 * inside the rest of what it took to draw the window.
 */
export function collectAncientWonderPhases(json: ElvenarRequestResponseEntry[]): AncientWonderPhase[] {
  return [
    ...extractElvenarResponse<AncientWonderPhase[]>(json, 'AncientWonderService', 'phaseUpdated').flat(),
    ...extractElvenarResponse<OtherPlayerAncientWonders>(
      json,
      'AncientWonderService',
      'getOtherPlayerAncientWonders',
    ).flatMap((response) => response?.ancientWonderPhases ?? []),
  ];
}

/**
 * Keeps the stored knowledge point standing current as contributions land, so the swap
 * tab does not have to wait for the next city load to notice a wonder filling up.
 *
 * Two things can say so. `phaseUpdated` is pushed as each contribution lands — but only
 * while the game is listening, and a tab left in the background long enough stops being
 * told. Opening a wonder's own window asks outright, and the answer that comes back is the
 * server's current figure however much was missed in the meantime, which makes it the way
 * out of a standing that has drifted.
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

  const updated = collectAncientWonderPhases(json);

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
