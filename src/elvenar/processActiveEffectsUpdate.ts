import { ActiveEffectsResponse } from '../model/active-effect';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountBySessionId } from './AccountManager';

// eslint-disable-next-line @typescript-eslint/require-await
export const processActiveEffectsUpdate = async (untypedJson: unknown, sharedInfo: ExtensionSharedInfo): Promise<void> => {
  const response = untypedJson as ElvenarRequestResponseEntry[];

  const activeEffectsResponse = response.find(
    (entry) => entry.requestClass === 'EffectsService' && entry.requestMethod === 'update',
  ) as ActiveEffectsResponse | undefined;

  const activeEffectsData = activeEffectsResponse?.responseData.map((raw) => ({
    ...raw,
    endTime: Date.now() + ((raw.remainingTime || 0) * 1000), // assuming remainingTime is in seconds
  }));

  const neighbourlyHelpEffects = activeEffectsData
    ?.filter((effect) => effect.actionId === 'neighbourly_help_boost_spell')
    .map((effect) => ({
      id: Number(effect.ownerId),
      remainingTime: effect.remainingTime,
      endTime: effect.endTime,
    }));

  const accountData = getAccountBySessionId(sharedInfo.sessionId);

  if (accountData) {
    accountData.ensorcelledEndowmentData = neighbourlyHelpEffects;
  }
};
