import { disabledEffectIndexes, effectIndex } from '../cauldron/cauldronSync';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { PotionEffect } from '../model/potionEffect';
import { getAccountBySessionId } from './accountStore';
import { sendCauldronSync } from './sendCauldronSync';

/**
 * The game lists the potion effects at startup and when the cauldron opens outside the cooldown;
 * each carries `enabled`, the player's choice of which effects a brew may give.
 */
export const processPotionEffects = async (
  responses: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  // eslint-disable-next-line @typescript-eslint/require-await
) => {
  const entry = responses.find((r) => r.requestClass === 'CauldronService' && r.requestMethod === 'getPotionEffects');
  const effects = entry?.responseData as PotionEffect[] | undefined;
  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (accountData && Array.isArray(effects)) {
    accountData.cauldronDisabledEffects = disabledEffectIndexes(effects);
  }
};

/**
 * The player switched an effect on or off on the cauldron's upgrade screen. Read from the request
 * itself, `[potionEffectId, enabled]`, and passed on to the optimizer straight away, since the
 * player is at the cauldron right then. Should the game refuse the change, the next effect list
 * sets it right.
 */
export const processPotionEffectToggled = async (
  _responses: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  request: ElvenarRequestResponseEntry,
) => {
  const [id, enabled] = (request.requestData as unknown[] | undefined) ?? [];
  const index = typeof id === 'string' ? effectIndex(id) : undefined;
  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (!accountData || index === undefined || typeof enabled !== 'boolean') {
    return;
  }

  const disabled = new Set(accountData.cauldronDisabledEffects ?? []);
  if (enabled) {
    disabled.delete(index);
  } else {
    disabled.add(index);
  }
  accountData.cauldronDisabledEffects = [...disabled].sort((a, b) => a - b);
  await sendCauldronSync(accountData, sharedInfo);
};
