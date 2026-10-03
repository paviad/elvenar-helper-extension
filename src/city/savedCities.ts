import { AccountData } from '../elvenar/Accounts';
import { getAccountById, loadAccount, putAccount, removeAccount, saveAccount } from '../elvenar/accountStore';
import { CityEntity } from '../model/cityEntity';
import { UnlockedArea } from '../model/unlockedArea';
import { useTabStore } from '../util/tabStore';

// The cities the editor keeps: saved under a name, imported, or autosaved while you edit.

/**
 * Puts a city saved from the editor in place of whatever is held under its name. The editor owns
 * saved cities and the service worker owns the accounts being played, and each saves only what it
 * owns, so a name that belongs to an account being played is refused.
 */
function replaceDetachedCity(accountId: string, accountData: AccountData) {
  const existing = getAccountById(accountId);
  if (existing && !existing.isDetached) {
    throw new Error(`ElvenAssist: ${accountId} is an account being played, a city cannot be saved over it`);
  }
  putAccount(accountId, accountData);
}

export const saveNewCityAs = async (
  accountId: string,
  cityEntities: CityEntity[],
  race: string,
  unlockedAreas: UnlockedArea[],
  squadSize: number,
  rankingPoints: number,
) => {
  const accountData: AccountData = {
    isDetached: true,
    sharedInfo: {
      reqUrl: '',
      reqReferrer: '',
      worldId: '',
      sessionId: '',
      tabId: 0,
      reqBody: '',
    },
    cityQuery: {
      accountId,
      accountName: `City ${accountId}`,
      cityName: `City ${accountId}`,
      boostedGoods: [],
      cityEntities,
      unlockedAreas,
      maxChapter: 0,
      chapter: 0,
      userData: {
        player_id: 0,
        city_name: '',
        user_name: '',
        race,
        portrait_id: '',
        playerType: { value: '' },
        guild_info: {
          id: 0,
          name: '',
          banner: {
            shapeId: '',
            shapeColor: 0,
            symbolId: '',
            symbolColor: 0,
          },
        },
        technologySection: {
          guestRace: '',
          index: 0,
          description: '',
          fontColor: 0,
        },
      },
      url: '',
      tabId: 0,
      sessionId: '',
      badges: {
        badge_brewery: 0,
        badge_carpenters: 0,
        badge_farmers: 0,
        badge_blacksmith: 0,
        golden_bracelet: 0,
        diamond_necklace: 0,
        elegant_statue: 0,
        witch_hat: 0,
        druid_staff: 0,
        badge_wonderhelper: 0,
        badge_unit: 0,
        money_sack: 0,
        arcane_residue: 0,
        recycled_potion: 0,
        enchanted_tiara: 0,
        ghost_in_a_bottle: 0,
      },
      relics: {
        relic_crystal: 0,
        relic_elixir: 0,
        relic_gems: 0,
        relic_magic_dust: 0,
        relic_marble: 0,
        relic_planks: 0,
        relic_scrolls: 0,
        relic_silk: 0,
        relic_steel: 0,
      },
      timestamp: Date.now(),
      faRequirements: {},
      relicBoosts: {
        relic_crystal: 0,
        relic_elixir: 0,
        relic_gems: 0,
        relic_magic_dust: 0,
        relic_marble: 0,
        relic_planks: 0,
        relic_scrolls: 0,
        relic_silk: 0,
        relic_steel: 0,
      },
      squadSize,
      rankingPoints,
      expirationsEnd: {},
    },
  };
  replaceDetachedCity(accountId, accountData);
  await saveAccount(accountId);
};

export const saveCurrentCityAs = async (
  currentAccountId: string,
  newAccountId: string,
  cityEntities: CityEntity[],
  chapter: number,
  name?: string,
  unlockedAreas?: UnlockedArea[],
) => {
  // The copy is taken whole, so take it from what is stored now.
  await loadAccount(currentAccountId);
  const currentAccount = getAccountById(currentAccountId);
  if (!currentAccount) {
    throw new Error('ElvenAssist: Current account not found');
  }

  // clone current account data
  const newAccountData: AccountData = JSON.parse(JSON.stringify(currentAccount));

  if (!newAccountData.cityQuery) {
    throw new Error('ElvenAssist: Current account has no city data');
  }

  newAccountData.cityQuery.accountId = newAccountId;
  newAccountData.cityQuery.accountName = name || `City ${newAccountId}`;
  newAccountData.cityQuery.sessionId = '';
  newAccountData.cityQuery.tabId = 0;
  newAccountData.cityQuery.url = '';
  newAccountData.sharedInfo = {
    reqUrl: '',
    reqReferrer: '',
    worldId: '',
    sessionId: '',
    tabId: 0,
    reqBody: '',
  };
  newAccountData.isDetached = true;
  newAccountData.cityQuery.cityEntities = cityEntities;
  newAccountData.cityQuery.chapter = chapter;
  if (unlockedAreas) {
    newAccountData.cityQuery.unlockedAreas = unlockedAreas;
  }
  replaceDetachedCity(newAccountId, newAccountData);
  await saveAccount(newAccountId);
};

export const saveCityInPlace = async (
  accountId: string,
  cityEntities: CityEntity[],
  chapter: number,
  unlockedAreas?: UnlockedArea[],
) => {
  const accountData = getAccountById(accountId);
  if (!accountData) {
    throw new Error('ElvenAssist: Account not found');
  }
  if (!accountData.cityQuery) {
    throw new Error('ElvenAssist: Account has no city data');
  }
  if (!accountData.isDetached) {
    throw new Error('ElvenAssist: Cannot save city in place for non-detached account');
  }
  accountData.cityQuery.cityEntities = cityEntities;
  accountData.cityQuery.chapter = chapter;
  if (unlockedAreas) {
    accountData.cityQuery.unlockedAreas = unlockedAreas;
  }
  if (!(await saveAccount(accountId))) {
    // Another tab saved this city since this one read it. Its change is kept and this one is
    // not, and the tab has to say so: the move is still on screen here.
    useTabStore
      .getState()
      .setGlobalError('This city was changed in another tab, so your last change was not saved. Reload this tab.');
  }
};

export const deleteCityById = async (accountId: string) => {
  await removeAccount(accountId);
};
