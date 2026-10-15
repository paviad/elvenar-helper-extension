import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountBySessionId } from './accountStore';

/**
 * The wonder that cuts cauldron ingredient costs shows up among the active effects as
 * `cauldron_ingredients_costs_reduction`, at the wonder's level. EffectsService/update lists every
 * active effect each time, so a list without it means the wonder is not built.
 */
export const processCauldronWonder = async (
  responses: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  // eslint-disable-next-line @typescript-eslint/require-await
) => {
  const entry = responses.find((r) => r.requestClass === 'EffectsService' && r.requestMethod === 'update');
  const effects = entry?.responseData as { actionId: string; level: number }[] | undefined;
  if (!effects) {
    return;
  }

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (accountData) {
    accountData.cauldronWonderLevel =
      effects.find((effect) => effect.actionId === 'cauldron_ingredients_costs_reduction')?.level ?? 0;
  }
};
