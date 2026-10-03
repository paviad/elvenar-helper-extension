import { getAllKeysFromStorage, getFromStorage, getManyFromStorage, removeFromStorage } from '../chrome/storage';
import { CityEntity } from '../model/cityEntity';
import { UnlockedArea } from '../model/unlockedArea';
import {
  AccountData,
  accountKey,
  accounts,
  accountStampKey,
  heldStamps,
  parseStamp,
  saveSingleAccount,
} from './Accounts';
import { dbVersion, migrate } from './migrations';

let saveHook: (() => void) | null = null;

export function setSaveHook(hook: () => void) {
  saveHook = hook;
}

/** Paired with setSaveHook so the layout can drop its hook when it unmounts. */
export function clearSaveHook() {
  saveHook = null;
}

export function generateAccountId(playerId: number, worldId: string): string {
  return `${playerId}@${worldId}`;
}

/**
 * Puts an account in place. Handing back the object already held keeps it tied to the stored copy
 * it was read from; a different object is an account built here as a whole, and its next save
 * replaces whatever is stored.
 */
export function setAccountData(accountId: string, accountData: AccountData) {
  if (accounts[accountId] !== accountData) {
    heldStamps[accountId] = undefined;
  }
  accounts[accountId] = accountData;
}

/** Saves one account, and lets the account list know when it was written. */
export async function saveAccount(accountId: string) {
  const saved = await saveSingleAccount(accountId);
  if (saved && saveHook) {
    saveHook();
  }
  return saved;
}

export function getAccountIdBySessionId(sessionId: string): string | undefined {
  const account = Object.entries(accounts).find(([k, r]) => r.cityQuery?.sessionId === sessionId);
  return account ? account[0] : undefined;
}

export function getAccountBySessionId(sessionId: string): AccountData | undefined {
  const account = Object.entries(accounts).find(([k, r]) => r.cityQuery?.sessionId === sessionId);
  return account ? account[1] : undefined;
}

/**
 * The account being played in a tab. `cityQuery.tabId` is stored with the account and Chrome hands
 * the same tab ids out again in later sessions, so several stored accounts can carry the id we are
 * asked about - all but one of them left over from a previous run. Taking the first match returned
 * whichever account happened to load first, which is the top of the account list. The live account
 * is the freshest one: its city data was written when the game loaded in that tab.
 */
export function getAccountByTabId(tabId: number): string | undefined {
  const matches = Object.entries(accounts).filter(([, r]) => r.cityQuery?.tabId === tabId);
  if (matches.length === 0) {
    return undefined;
  }
  return matches.reduce((freshest, candidate) =>
    (candidate[1].cityQuery?.timestamp ?? 0) > (freshest[1].cityQuery?.timestamp ?? 0) ? candidate : freshest,
  )[0];
}

export function getAccountById(accountId: string): AccountData | undefined {
  return accounts[accountId];
}

/** Reads are numbered as they start, so a caller can tell one that started after it asked. */
let readsStarted = 0;
/** The read of each account under way, if any. */
const reading: Record<string, { number: number; done: Promise<void> } | undefined> = {};

/** Whether the copy held here is what storage holds under `storedStamp`. */
function isHeldCopyCurrent(accountId: string, storedStamp: number) {
  if (!(accountId in accounts)) {
    return false;
  }
  // Built here and not saved yet: nothing in storage is newer than it.
  const heldStamp = heldStamps[accountId];
  return heldStamp === undefined || heldStamp === storedStamp;
}

async function readAccount(accountId: string) {
  // The account and its stamp in one read, so the stamp is the one this copy was saved under.
  const stored = await getManyFromStorage([accountKey(accountId), accountStampKey(accountId)]);
  const accountRaw = stored[accountKey(accountId)];
  if (!accountRaw) {
    // Deleted elsewhere.
    delete accounts[accountId];
    delete heldStamps[accountId];
    return;
  }
  accounts[accountId] = JSON.parse(accountRaw) as AccountData;
  heldStamps[accountId] = parseStamp(stored[accountStampKey(accountId)]);
}

/**
 * Brings the copy of an account held here up to what storage held when this was called.
 *
 * The small stamp beside the account tells whether the large account itself needs reading. A
 * read that was already under way when this was called may have taken its copy before a save
 * the caller is reacting to, so it is waited out and the stamp looked at again; a read that
 * started after the call is good enough to join. However many callers arrive while one read is
 * out, at most one further read follows it.
 */
export const loadSingleAccountFromStorage = async (accountId: string): Promise<void> => {
  const askedAfter = readsStarted;
  for (;;) {
    const underWay = reading[accountId];
    if (underWay) {
      if (underWay.number > askedAfter) {
        return underWay.done;
      }
      await underWay.done.catch(() => undefined);
      continue;
    }

    const storedStamp = parseStamp(await getFromStorage(accountStampKey(accountId)));
    if (reading[accountId]) {
      // Another caller started a read while we were looking at the stamp.
      continue;
    }
    if (isHeldCopyCurrent(accountId, storedStamp)) {
      return;
    }

    const number = ++readsStarted;
    const done = readAccount(accountId).finally(() => {
      if (reading[accountId]?.number === number) {
        reading[accountId] = undefined;
      }
    });
    reading[accountId] = { number, done };
    return done;
  }
};

export const loadAccountManagerFromStorage = async () => {
  await migrate(dbVersion);

  const keys = await getAllKeysFromStorage();

  const accountKeys = keys.filter((k) => k.startsWith('accounts_') && !k.startsWith('accounts_last_saved_'));

  const storedAccountIds = new Set(accountKeys.map((k) => k.replace('accounts_', '')));
  for (const accountId of Object.keys(accounts)) {
    // Deleted elsewhere - unless it was built here and is about to be saved.
    if (!storedAccountIds.has(accountId) && heldStamps[accountId] !== undefined) {
      delete accounts[accountId];
      delete heldStamps[accountId];
    }
  }

  for (const accountId of storedAccountIds) {
    try {
      await loadSingleAccountFromStorage(accountId);
    } catch (err) {
      console.warn(`ElvenAssist: Failed to load account ${accountId} from storage, skipping. Error:`, err);
      await removeFromStorage([`accounts_${accountId}`, `accounts_last_saved_${accountId}`]);
    }
  }
};

export const getAllStoredAccounts = (includeAutosave = false): [string, AccountData][] => {
  if (includeAutosave) {
    return Object.entries(accounts);
  }
  return Object.entries(accounts).filter(([accountId]) => !accountId.endsWith(' (autosave)'));
};

/**
 * Puts a city saved from the editor in place of whatever is held under its name. The editor owns
 * saved cities and the service worker owns the accounts being played, and each saves only what it
 * owns, so a name that belongs to an account being played is refused.
 */
function replaceDetachedCity(accountId: string, accountData: AccountData) {
  const existing = accounts[accountId];
  if (existing && !existing.isDetached) {
    throw new Error(`ElvenAssist: ${accountId} is an account being played, a city cannot be saved over it`);
  }
  setAccountData(accountId, accountData);
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
  await loadSingleAccountFromStorage(currentAccountId);
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
  await saveAccount(accountId);
};

export const deleteCityById = async (accountId: string) => {
  delete accounts[accountId];
  delete heldStamps[accountId];
  await removeFromStorage([`accounts_${accountId}`, `accounts_last_saved_${accountId}`, `research_${accountId}`]);
};
