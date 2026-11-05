import { addBrew, addGobletResult, confirmGoblet, GobletResult } from '../cauldron/cauldronBrew';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountBySessionId } from './accountStore';

/**
 * The player brewed: `brew [ingredientIds, spellFragments, premiumBoost]`, the ingredients in the
 * order they were added. The effects are taken as the game listed them when the cauldron opened,
 * since spending Witch Points afterwards moves them on.
 */
export const processCauldronBrew = async (
  _responses: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  request: ElvenarRequestResponseEntry,
  // eslint-disable-next-line @typescript-eslint/require-await
) => {
  const [ingredients, spellFragments, premiumBoost] = (request.requestData as unknown[] | undefined) ?? [];
  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (!accountData || !Array.isArray(ingredients)) {
    return;
  }

  const at = Date.now();
  accountData.cauldronBrews = addBrew(accountData.cauldronBrews, {
    id: `${sharedInfo.worldId}-${at}`,
    at,
    worldId: sharedInfo.worldId,
    ingredients: ingredients as string[],
    spellFragments: typeof spellFragments === 'number' ? spellFragments : 0,
    premiumBoost: typeof premiumBoost === 'number' ? premiumBoost : 0,
    effects: accountData.cauldronEffects ?? [],
    disabledEffects: accountData.cauldronDisabledEffects ?? [],
    goblets: [],
  });
};

/**
 * A goblet's result, which the server pushes in whatever answer comes next; it reaches here after
 * the request it came with, so the brew it belongs to is already recorded.
 */
export const processGobletResult = async (
  responses: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  // eslint-disable-next-line @typescript-eslint/require-await
) => {
  const entry = responses.find(
    (r) => r.requestClass === 'CauldronService' && r.requestMethod === 'getLastUsedGobletResult',
  );
  const result = entry?.responseData as Partial<GobletResult> | undefined;
  const brew = getAccountBySessionId(sharedInfo.sessionId)?.cauldronBrews?.at(-1);
  // Once the last goblet is confirmed the server sends a result with nothing in it
  if (!brew || !result || !(result.success || result.failure || result.conflict)) {
    return;
  }

  // The server leaves out a count of 0, the last goblet's
  const { gobletsLeft = 0, success, failure, conflict } = result;
  addGobletResult(brew, { gobletsLeft, success, failure, conflict });
};

/** `confirmGobletEffect [id]`: the goblet effect the player kept from the latest result. */
export const processGobletConfirmed = async (
  _responses: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  request: ElvenarRequestResponseEntry,
  // eslint-disable-next-line @typescript-eslint/require-await
) => {
  const [id] = (request.requestData as unknown[] | undefined) ?? [];
  const brew = getAccountBySessionId(sharedInfo.sessionId)?.cauldronBrews?.at(-1);
  if (brew && typeof id === 'number') {
    confirmGoblet(brew, id);
  }
};
