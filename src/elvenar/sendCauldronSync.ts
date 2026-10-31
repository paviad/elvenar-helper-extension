import { CauldronSync, cauldronWorldName, selectedEffectIndexes } from '../cauldron/cauldronSync';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { AccountData } from './Accounts';
import { listAccounts } from './accountStore';

/** What the Cauldron Optimizer needs about this city, as of the game session in `sharedInfo`. */
export const buildCauldronSync = (accountData: AccountData, sharedInfo: ExtensionSharedInfo) => {
  const cityQuery = accountData.cityQuery;
  if (!cityQuery) {
    return undefined;
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
  return sync;
};

/**
 * For the site's "Fill from the game" button: the city whose cauldron the player opened last, as
 * of its latest game session. Undefined until a cauldron has been opened.
 */
export const latestCauldronSync = () => {
  // Cities saved from the planner are copies, and carry the time of the account they were saved from
  const [accountData] = listAccounts()
    .map(([, a]) => a)
    .filter((a) => a.cauldronOpenedAt !== undefined && !a.isDetached && !a.savedFrom)
    .sort((a, b) => (b.cauldronOpenedAt ?? 0) - (a.cauldronOpenedAt ?? 0));
  return accountData && buildCauldronSync(accountData, accountData.sharedInfo);
};

/** Sends what the Cauldron Optimizer needs about this city to every tab that has it open. */
export const sendCauldronSync = async (accountData: AccountData, sharedInfo: ExtensionSharedInfo) => {
  const sync = buildCauldronSync(accountData, sharedInfo);
  if (!sync) {
    return;
  }

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
