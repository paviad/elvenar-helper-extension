import { getManyFromStorage } from '../chrome/storage';
import {
  deleteCityById,
  loadSingleAccountFromStorage,
  saveCityInPlace,
  saveCurrentCityAs,
  setAccountData,
} from './AccountManager';
import { AccountData, accounts, saveSingleAccount } from './Accounts';

jest.mock('../chrome/storage', () => ({
  getFromStorage: jest.fn(),
  getManyFromStorage: jest.fn(),
  saveToStorage: jest.fn(),
  saveManyToStorage: jest.fn(),
  removeFromStorage: jest.fn(),
  getAllKeysFromStorage: jest.fn(),
}));

const storage = jest.requireMock<Record<string, jest.Mock>>('../chrome/storage');

/**
 * Storage as the contexts see it: a read takes its copy when it is made and answers a moment later,
 * a long moment for an account and a short one for anything else, the save stamps among them.
 * Writes land at once.
 */
let stored: Record<string, string | undefined> = {};
const delayFor = (key: string) => (/^accounts_(?!last_saved_)/.test(key) ? 50 : 1);
const later = <T>(value: T, delay: number) => new Promise<T>((resolve) => setTimeout(() => resolve(value), delay));

beforeEach(() => {
  stored = {};
  storage.getFromStorage.mockImplementation((key: string) => later(stored[key], delayFor(key)));
  storage.getManyFromStorage.mockImplementation((keys: string[]) =>
    later(Object.fromEntries(keys.map((k) => [k, stored[k]])), Math.max(...keys.map(delayFor))),
  );
  storage.saveToStorage.mockImplementation((key: string, value: string) => {
    stored[key] = value;
    return Promise.resolve();
  });
  storage.saveManyToStorage.mockImplementation((items: Record<string, string>) => {
    Object.assign(stored, items);
    return Promise.resolve();
  });
  storage.removeFromStorage.mockImplementation((keys: string[]) => {
    for (const key of keys) delete stored[key];
    return Promise.resolve();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

let stampsGiven = 0;

/** A save made by another context: the account and a new stamp beside it. */
const saveElsewhere = (accountId: string, account: object) => {
  stored[`accounts_${accountId}`] = JSON.stringify(account);
  stored[`accounts_last_saved_${accountId}`] = (1000 + ++stampsGiven).toString();
};

const posts = (accountId: string) => (accounts[accountId] as unknown as { posts: number } | undefined)?.posts;
const storedPosts = (accountId: string) => (JSON.parse(stored[`accounts_${accountId}`]!) as { posts: number }).posts;

const accountReads = (accountId: string) =>
  (getManyFromStorage as jest.Mock).mock.calls.filter(([keys]) => (keys as string[])[0] === `accounts_${accountId}`)
    .length;

const city = (isDetached: boolean): AccountData =>
  ({ isDetached, sharedInfo: {}, cityQuery: { cityEntities: [], chapter: 1 } }) as unknown as AccountData;

describe('loadSingleAccountFromStorage', () => {
  it('answers a call made during a read with what was saved before the call', async () => {
    saveElsewhere('a', { posts: 1 });
    const first = loadSingleAccountFromStorage('a');
    // Let the first read take its copy, then save and ask again while it is still out.
    await later(undefined, 20);
    saveElsewhere('a', { posts: 2 });
    const second = loadSingleAccountFromStorage('a');

    await first;
    await second;

    expect(posts('a')).toBe(2);
  });

  it('shares one further read between calls made during a read', async () => {
    saveElsewhere('b', { posts: 1 });
    const first = loadSingleAccountFromStorage('b');
    await later(undefined, 20);
    saveElsewhere('b', { posts: 2 });
    (getManyFromStorage as jest.Mock).mockClear();

    await Promise.all([first, loadSingleAccountFromStorage('b'), loadSingleAccountFromStorage('b')]);

    expect(accountReads('b')).toBe(1);
    expect(posts('b')).toBe(2);
  });

  it('does not read the account again while its stamp is unchanged', async () => {
    saveElsewhere('c', { posts: 1 });
    await loadSingleAccountFromStorage('c');
    (getManyFromStorage as jest.Mock).mockClear();

    await loadSingleAccountFromStorage('c');

    expect(accountReads('c')).toBe(0);
  });

  it('reads the account again once a save elsewhere has changed its stamp', async () => {
    saveElsewhere('d', { posts: 1 });
    await loadSingleAccountFromStorage('d');
    saveElsewhere('d', { posts: 2 });

    await loadSingleAccountFromStorage('d');

    expect(posts('d')).toBe(2);
  });

  it('keeps reads of two accounts apart', async () => {
    saveElsewhere('e1', { posts: 1 });
    saveElsewhere('e2', { posts: 2 });

    await Promise.all([loadSingleAccountFromStorage('e1'), loadSingleAccountFromStorage('e2')]);

    expect(posts('e1')).toBe(1);
    expect(posts('e2')).toBe(2);
  });

  it('lets go of an account deleted elsewhere', async () => {
    saveElsewhere('f', { posts: 1 });
    await loadSingleAccountFromStorage('f');
    delete stored['accounts_f'];
    delete stored['accounts_last_saved_f'];

    await loadSingleAccountFromStorage('f');

    expect(accounts['f']).toBeUndefined();
  });

  it('keeps an account built here and not saved yet', async () => {
    setAccountData('g', { posts: 3 } as unknown as AccountData);

    await loadSingleAccountFromStorage('g');

    expect(posts('g')).toBe(3);
  });
});

describe('saveSingleAccount', () => {
  it('saves a change made to the copy read here', async () => {
    saveElsewhere('h', { posts: 1 });
    await loadSingleAccountFromStorage('h');
    (accounts['h'] as unknown as { posts: number }).posts = 2;

    expect(await saveSingleAccount('h')).toBe(true);
    expect(storedPosts('h')).toBe(2);
  });

  it('refuses to save over a save made elsewhere since the read', async () => {
    saveElsewhere('i', { posts: 1 });
    await loadSingleAccountFromStorage('i');
    saveElsewhere('i', { posts: 5 });
    (accounts['i'] as unknown as { posts: number }).posts = 2;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(await saveSingleAccount('i')).toBe(false);
    expect(storedPosts('i')).toBe(5);

    // The next read brings this context back to what is stored.
    await loadSingleAccountFromStorage('i');
    expect(posts('i')).toBe(5);
  });

  it('saves twice in a row from the same context', async () => {
    saveElsewhere('j', { posts: 1 });
    await loadSingleAccountFromStorage('j');

    expect(await saveSingleAccount('j')).toBe(true);
    expect(await saveSingleAccount('j')).toBe(true);
  });

  it('replaces what is stored with an account built here as a whole', async () => {
    saveElsewhere('k', { posts: 1 });
    await loadSingleAccountFromStorage('k');
    saveElsewhere('k', { posts: 5 });
    setAccountData('k', { posts: 9 } as unknown as AccountData);

    expect(await saveSingleAccount('k')).toBe(true);
    expect(storedPosts('k')).toBe(9);
  });

  it('does not bring back an account deleted elsewhere', async () => {
    saveElsewhere('l', { posts: 1 });
    await loadSingleAccountFromStorage('l');
    delete stored['accounts_l'];
    delete stored['accounts_last_saved_l'];
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(await saveSingleAccount('l')).toBe(false);
    expect(stored['accounts_l']).toBeUndefined();
  });
});

describe('the city editor', () => {
  it('saves only the city it changed', async () => {
    saveElsewhere('live', { ...city(false), posts: 1 });
    saveElsewhere('saved', city(true));
    await loadSingleAccountFromStorage('live');
    await loadSingleAccountFromStorage('saved');
    // The service worker records more play meanwhile.
    saveElsewhere('live', { ...city(false), posts: 2 });

    await saveCityInPlace('saved', [], 2);

    expect(storedPosts('live')).toBe(2);
  });

  it('copies a city from what is stored now', async () => {
    saveElsewhere('live2', { ...city(false), posts: 1 });
    await loadSingleAccountFromStorage('live2');
    saveElsewhere('live2', { ...city(false), posts: 2 });

    await saveCurrentCityAs('live2', 'live2 (autosave)', [], 1);

    expect(storedPosts('live2 (autosave)')).toBe(2);
  });

  it('does not save a city over an account being played', async () => {
    saveElsewhere('live3', city(false));
    saveElsewhere('saved3', city(true));
    await loadSingleAccountFromStorage('live3');

    await expect(saveCurrentCityAs('saved3', 'live3', [], 1)).rejects.toThrow('being played');
  });

  it('deletes a saved city for good', async () => {
    saveElsewhere('gone', city(true));
    await loadSingleAccountFromStorage('gone');

    await deleteCityById('gone');
    await loadSingleAccountFromStorage('gone');

    expect(accounts['gone']).toBeUndefined();
    expect(stored['accounts_gone']).toBeUndefined();
  });
});
