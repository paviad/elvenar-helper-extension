import { CauldronSync, cauldronWorldName } from '../cauldron/cauldronSync';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountBySessionId } from './accountStore';

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
  const cityQuery = accountData?.cityQuery;
  if (!cityQuery) {
    return;
  }

  const cauldron = accountData.cauldron;
  const sync: CauldronSync = {
    worldName: cauldronWorldName(cityQuery.userData.user_name, sharedInfo.worldId),
    diplomas: cityQuery.cityResources?.researchtree_diplomas,
    premiumIngredients: cauldron?.sessionId === sharedInfo.sessionId ? cauldron.premiumIngredients : undefined,
    wonderLevel: accountData.cauldronWonderLevel,
    witchPoints: cityQuery.cityResources?.cauldron_witchpoints,
  };

  // Like the Spire Wizard: the content script on the site's tabs takes it, every other tab has no
  // listener and refuses.
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'cauldronSync', payload: sync }).catch(() => {
        /* no listener */
      });
    }
  }
};
