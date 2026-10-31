import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountBySessionId } from './accountStore';
import { sendCauldronSync } from './sendCauldronSync';

/**
 * Opening the Cauldron tab of the Magic Academy clears its `cauldron_brewing` indicator, and the
 * game sends that every time the tab opens, cooldown or not. It is the one sign we get that the
 * player is looking at the cauldron, so it is what sends their numbers to the Cauldron Optimizer.
 */
export const processCauldronOpened = async (
  _responses: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  request: ElvenarRequestResponseEntry,
) => {
  const [, indicator] = (request.requestData as unknown[] | undefined) ?? [];
  if (indicator !== 'cauldron_brewing') {
    return;
  }

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (accountData) {
    accountData.cauldronOpenedAt = Date.now();
    await sendCauldronSync(accountData, sharedInfo);
  }
};
