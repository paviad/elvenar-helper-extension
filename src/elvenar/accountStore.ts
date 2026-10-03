import {
  getAllKeysFromStorage,
  getFromStorage,
  getManyFromStorage,
  removeFromStorage,
  saveManyToStorage,
  saveToStorage,
} from '../chrome/storage';
import { AccountData, accountKey, accountStampKey, parseStamp } from './Accounts';
import { dbVersion, migrate } from './migrations';

/**
 * The accounts this context holds. Every extension context - the service worker, the overlay in
 * each game tab, each extension tab - has its own copy, read from storage. The service worker
 * saves the accounts being played and the city editor saves its own cities, so each account has
 * one writer and the others only read it.
 */
const accounts: Record<string, AccountData> = {};

/**
 * The stamp each account held here was stored under when it was read or last saved. Every save
 * writes a new stamp beside the account, so a different one in storage means somebody else has
 * saved it since. An account held with no stamp was built here, as a whole, and not saved yet.
 */
const heldStamps: Record<string, number | undefined> = {};

/**
 * What this context last wrote for each account, kept only until the account is read or put
 * again. The service worker saves after every response the game sends, most of which change
 * nothing; a save that would write this again is skipped, and with it every other context's
 * re-read of a record that runs to megabytes. Only a context that saves holds these.
 */
const lastWritten: Record<string, string | undefined> = {};

/**
 * A count per account of the changes to it seen here: replaced by a read or a put, deleted, or
 * saved, which may follow a change made to it in place. A view compares counts rather than
 * objects, since a change made in place leaves the object the same.
 */
const versions: Record<string, number> = {};
/** The same count across all accounts, for views that list them. */
let listVersion = 0;
const listeners = new Set<(accountId: string) => void>();

function changed(accountId: string) {
  versions[accountId] = (versions[accountId] ?? 0) + 1;
  listVersion++;
  for (const listener of listeners) {
    listener(accountId);
  }
}

/** Calls `listener` after every change to an account held here. Returns the unsubscribe. */
export function subscribeToAccounts(listener: (accountId: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const accountVersion = (accountId: string) => versions[accountId] ?? 0;
export const accountListVersion = () => listVersion;

export function generateAccountId(playerId: number, worldId: string): string {
  return `${playerId}@${worldId}`;
}

export function getAccountById(accountId: string): AccountData | undefined {
  return accounts[accountId];
}

export function getAccountIdBySessionId(sessionId: string): string | undefined {
  return Object.entries(accounts).find(([, r]) => r.cityQuery?.sessionId === sessionId)?.[0];
}

export function getAccountBySessionId(sessionId: string): AccountData | undefined {
  return Object.values(accounts).find((r) => r.cityQuery?.sessionId === sessionId);
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

/** The accounts held here, leaving out the editor's autosaves unless asked for. */
export const listAccounts = (includeAutosave = false): [string, AccountData][] => {
  if (includeAutosave) {
    return Object.entries(accounts);
  }
  return Object.entries(accounts).filter(([accountId]) => !accountId.endsWith(' (autosave)'));
};

/**
 * Puts an account in place. Handing back the object already held keeps it tied to the stored copy
 * it was read from; a different object is an account built here as a whole, and its next save
 * replaces whatever is stored.
 */
export function putAccount(accountId: string, accountData: AccountData) {
  if (accounts[accountId] !== accountData) {
    heldStamps[accountId] = undefined;
    lastWritten[accountId] = undefined;
  }
  accounts[accountId] = accountData;
  changed(accountId);
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
    if (accountId in accounts) {
      delete accounts[accountId];
      delete heldStamps[accountId];
      delete lastWritten[accountId];
      changed(accountId);
    }
    return;
  }
  let account: AccountData;
  try {
    account = JSON.parse(accountRaw) as AccountData;
  } catch (err) {
    // Storage writes a value whole or not at all, so a record that does not parse will never
    // parse, and keeping it only fails every read after this one.
    console.warn(`ElvenAssist: Account ${accountId} in storage is corrupt, deleting it. Error:`, err);
    delete accounts[accountId];
    delete heldStamps[accountId];
    delete lastWritten[accountId];
    changed(accountId);
    await removeFromStorage([accountKey(accountId), accountStampKey(accountId)]);
    return;
  }
  accounts[accountId] = account;
  heldStamps[accountId] = parseStamp(stored[accountStampKey(accountId)]);
  lastWritten[accountId] = undefined;
  changed(accountId);
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
export const loadAccount = async (accountId: string): Promise<void> => {
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

/** Brings every account up to what storage holds, and lets go of any deleted elsewhere. */
export const loadAllAccounts = async () => {
  await migrate(dbVersion);

  const keys = await getAllKeysFromStorage();

  const accountKeys = keys.filter((k) => k.startsWith('accounts_') && !k.startsWith('accounts_last_saved_'));

  const storedAccountIds = new Set(accountKeys.map((k) => k.replace('accounts_', '')));
  for (const accountId of Object.keys(accounts)) {
    // Deleted elsewhere - unless it was built here and is about to be saved.
    if (!storedAccountIds.has(accountId) && heldStamps[accountId] !== undefined) {
      delete accounts[accountId];
      delete heldStamps[accountId];
      delete lastWritten[accountId];
      changed(accountId);
    }
  }

  for (const accountId of storedAccountIds) {
    try {
      await loadAccount(accountId);
    } catch (err) {
      // Storage itself failed. The account may be perfectly sound, so it is kept for the next try.
      console.warn(`ElvenAssist: Failed to load account ${accountId} from storage, skipping. Error:`, err);
    }
  }
};

/**
 * Saves an account held here, unless somebody else saved it since we read it.
 *
 * The account is written from the copy this context holds, whole. Writing over a newer save would
 * throw away whatever that save added, so the save is refused instead: what is lost then is the
 * change made here, and the next read brings this context back to what is stored. An account that
 * was built here as a whole, rather than changed from a stored copy, replaces what is stored.
 *
 * Returns whether the account was written.
 */
export async function saveAccount(accountId: string): Promise<boolean> {
  const account = accounts[accountId];
  if (!account) {
    console.warn(`ElvenAssist: Account ${accountId} is not held here, nothing to save`);
    return false;
  }

  const storedStamp = parseStamp(await getFromStorage(accountStampKey(accountId)));
  const heldStamp = heldStamps[accountId];
  if (heldStamp !== undefined && storedStamp !== heldStamp) {
    console.error(`ElvenAssist: Account ${accountId} was saved elsewhere since it was read here; not
       saving over it. If this happens repeatedly, please report this issue to the developers at
       either of these links:
       github: https://github.com/paviad/elvenar-helper-extension/issues/5
       discord: https://discord.com/channels/1492111560884228276/1492119022639124520`);
    return false;
  }

  const json = JSON.stringify(account);
  if (heldStamp !== undefined && json === lastWritten[accountId]) {
    // Stored already, under the stamp checked above.
    return true;
  }

  const numAccounts = +((await getFromStorage('num_accounts')) || 0);
  // Accounts played, that is: a visited city, a saved layout or an autosave is no second account.
  const currentNumAccounts = Object.values(accounts).filter((r) => !r.isDetached).length;
  if (numAccounts <= 1 && currentNumAccounts > 1) {
    await saveToStorage('notifyMultipleAccounts', 'true');
  }
  if (numAccounts !== currentNumAccounts) {
    await saveToStorage('num_accounts', currentNumAccounts.toString());
  }

  // Two saves in the same millisecond must still tell apart.
  const stamp = Math.max(Date.now(), storedStamp + 1);
  await saveManyToStorage({
    [accountKey(accountId)]: json,
    [accountStampKey(accountId)]: stamp.toString(),
  });
  heldStamps[accountId] = stamp;
  lastWritten[accountId] = json;
  changed(accountId);
  return true;
}

/** Deletes an account here and in storage, with the research kept beside it. */
export async function removeAccount(accountId: string) {
  delete accounts[accountId];
  delete heldStamps[accountId];
  delete lastWritten[accountId];
  changed(accountId);
  await removeFromStorage([accountKey(accountId), accountStampKey(accountId), `research_${accountId}`]);
}
