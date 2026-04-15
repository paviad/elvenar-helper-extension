import { getAllKeysFromStorage, getFromStorage, removeFromStorage } from '../chrome/storage';
import { CityEntity } from '../model/cityEntity';
import { UnlockedArea } from '../model/unlockedArea';
import { AccountData, accounts, accounts_last_saved_single, saveSingleAccount } from './Accounts';
import { dbVersion, migrate } from './migrations';

let saveHook: (() => void) | null = null;

export function setSaveHook(hook: () => void) {
  saveHook = hook;
}

export function generateAccountId(playerId: number, worldId: string): string {
  return `${playerId}@${worldId}`;
}

export async function setAccountData(accountId: string, accountData: AccountData) {
  accounts[accountId] = accountData;
}

export async function saveAllAccounts() {
  const allKeys = Object.keys(accounts);
  for (const accountId of allKeys) {
    await saveSingleAccount(accountId);
  }

  if (saveHook) {
    saveHook();
  }
}

export function getAccountIdBySessionId(sessionId: string): string | undefined {
  const account = Object.entries(accounts).find(([k, r]) => r.cityQuery?.sessionId === sessionId);
  return account ? account[0] : undefined;
}

export function getAccountBySessionId(sessionId: string): AccountData | undefined {
  const account = Object.entries(accounts).find(([k, r]) => r.cityQuery?.sessionId === sessionId);
  return account ? account[1] : undefined;
}

export function getAccountByTabId(tabId: number): string | undefined {
  const account = Object.entries(accounts).find(([k, r]) => r.cityQuery?.tabId === tabId);
  return account ? account[0] : undefined;
}

export function getAccountById(accountId: string): AccountData | undefined {
  return accounts[accountId];
}

let loadReadyResolve: () => void;
const loadReadyPromise: Record<string, Promise<void> | undefined> = {};
const initialized: Record<string, boolean> = {};

export const loadSingleAccountFromStorage = async (accountId: string, refresh = false) => {
  const accountsLastSavedRaw = await getFromStorage(`accounts_last_saved_${accountId}`);
  if (accountsLastSavedRaw) {
    const accountsLastSaved = parseInt(accountsLastSavedRaw, 10);
    if (accounts_last_saved_single[accountId] && accountsLastSaved > accounts_last_saved_single[accountId]) {
      refresh = true;
    }
  }

  if (initialized[accountId] && !refresh) {
    return;
  }
  initialized[accountId] = false;
  if (loadReadyPromise[accountId]) {
    await loadReadyPromise[accountId];
    return;
  }
  loadReadyPromise[accountId] = new Promise<void>((resolve) => {
    loadReadyResolve = resolve;
  });
  const accountsRaw = await getFromStorage(`accounts_${accountId}`);
  if (accountsRaw) {
    const parsedAccounts = JSON.parse(accountsRaw) as AccountData;
    accounts[accountId] = { ...parsedAccounts };
  }
  initialized[accountId] = true;
  loadReadyPromise[accountId] = undefined;
  accounts_last_saved_single[accountId] = new Date().getTime();
  loadReadyResolve();
};

export const loadAccountManagerFromStorage = async (refresh = false) => {
  await migrate(dbVersion);

  const keys = await getAllKeysFromStorage();

  const accountKeys = keys.filter((k) => k.startsWith('accounts_') && !k.startsWith('accounts_last_saved_'));

  for (const key of accountKeys) {
    const accountId = key.replace('accounts_', '');
    try {
      await loadSingleAccountFromStorage(accountId, refresh);
    } catch (err) {
      console.warn(`ElvenAssist: Failed to load account ${accountId} from storage, skipping. Error:`, err);
      await removeFromStorage([`accounts_${accountId}`, `accounts_last_saved_${accountId}`]);
    }
  }
};

export const getAllStoredAccounts = (): [string, AccountData][] => {
  return Object.entries(accounts);
};

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
    },
  };
  accounts[accountId] = accountData;
  await saveAllAccounts();
};

export const saveCurrentCityAs = async (currentAccountId: string, newAccountId: string, cityEntities: CityEntity[]) => {
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
  newAccountData.cityQuery.accountName = `City ${newAccountId}`;
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
  accounts[newAccountId] = newAccountData;
  await saveAllAccounts();
};

export const saveCityInPlace = async (accountId: string, cityEntities: CityEntity[]) => {
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
  await saveAllAccounts();
};

export const deleteCityById = async (accountId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete accounts[accountId];
  await removeFromStorage([`accounts_${accountId}`, `accounts_last_saved_${accountId}`]);
};
