import { CauldronSync, cauldronWorldName, selectedEffectIndexes } from '../cauldron/cauldronSync';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { AccountData } from './Accounts';

/** Sends what the Cauldron Optimizer needs about this city to every tab that has it open. */
export const sendCauldronSync = async (accountData: AccountData, sharedInfo: ExtensionSharedInfo) => {
  const cityQuery = accountData.cityQuery;
  if (!cityQuery) {
    return;
  }

  const cauldron = accountData.cauldron;
  const diplomas = cityQuery.cityResources?.researchtree_diplomas;
  const disabled = accountData.cauldronDisabledEffects;
  const sync: CauldronSync = {
    worldName: cauldronWorldName(cityQuery.userData.user_name, sharedInfo.worldId),
    diplomas,
    premiumIngredients: cauldron?.sessionId === sharedInfo.sessionId ? cauldron.premiumIngredients : undefined,
    selectedEffects: diplomas !== undefined && disabled ? selectedEffectIndexes(diplomas, disabled) : undefined,
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
