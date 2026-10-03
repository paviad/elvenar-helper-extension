import { accountKey, accountStampKey } from '../elvenar/Accounts';

// chrome.storage as the extension's contexts see it, standing in for src/chrome/storage:
//
//   jest.mock('../chrome/storage', () => require('../testing/fakeStorage').storageModule);
//
// A read takes its copy when it is made and answers a moment later - a long moment for an account,
// which runs to megabytes, and a short one for anything else, its save stamp among them. That gap
// is what lets a test start a read, save while it is out, and see what the read brings back.
// Writes land at once.

export const stored: Record<string, string | undefined> = {};

const delayFor = (key: string) => (/^accounts_(?!last_saved_)/.test(key) ? 50 : 1);

export const later = <T>(value: T, delay: number) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), delay));

export const storageModule = {
  getFromStorage: jest.fn((key: string) => later(stored[key], delayFor(key))),
  getManyFromStorage: jest.fn((keys: string[]) =>
    later(Object.fromEntries(keys.map((k) => [k, stored[k]])), Math.max(...keys.map(delayFor))),
  ),
  getAllKeysFromStorage: jest.fn(() => later(Object.keys(stored), 1)),
  saveToStorage: jest.fn((key: string, value: string) => {
    stored[key] = value;
    return Promise.resolve();
  }),
  saveManyToStorage: jest.fn((items: Record<string, string>) => {
    Object.assign(stored, items);
    return Promise.resolve();
  }),
  removeFromStorage: jest.fn((keys: string | string[]) => {
    for (const key of [keys].flat()) delete stored[key];
    return Promise.resolve();
  }),
};

export function clearStorage() {
  for (const key of Object.keys(stored)) delete stored[key];
}

let stampsGiven = 0;

/** A save made by another context: the account, and a new stamp beside it. */
export function saveElsewhere(accountId: string, account: object) {
  stored[accountKey(accountId)] = JSON.stringify(account);
  stored[accountStampKey(accountId)] = (1000 + ++stampsGiven).toString();
}

/** An account deleted by another context. */
export function deleteElsewhere(accountId: string) {
  delete stored[accountKey(accountId)];
  delete stored[accountStampKey(accountId)];
}

export function storedAccount<T>(accountId: string): T | undefined {
  const raw = stored[accountKey(accountId)];
  return raw === undefined ? undefined : (JSON.parse(raw) as T);
}

/** How many times the account itself, not just its stamp, has been read. */
export const accountReads = (accountId: string) =>
  storageModule.getManyFromStorage.mock.calls.filter(([keys]) => keys[0] === accountKey(accountId)).length;
