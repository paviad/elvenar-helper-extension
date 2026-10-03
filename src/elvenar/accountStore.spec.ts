import {
  accountReads,
  clearStorage,
  deleteElsewhere,
  later,
  saveElsewhere,
  storageModule,
  stored,
  storedAccount,
} from '../testing/fakeStorage';
import { AccountData } from './Accounts';
import {
  clearSaveHook,
  getAccountById,
  loadAccount,
  loadAllAccounts,
  putAccount,
  removeAccount,
  saveAccount,
  setSaveHook,
} from './accountStore';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('../chrome/storage', () => require('../testing/fakeStorage').storageModule);
// Nothing here is stored in the version 1 layout.
jest.mock('./migrations', () => ({ dbVersion: 2, migrate: () => Promise.resolve() }));

beforeEach(() => {
  clearStorage();
  storageModule.getManyFromStorage.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// The store keeps its accounts for the life of the module, so each test uses accounts of its own.

const posts = (accountId: string) => (getAccountById(accountId) as unknown as { posts: number } | undefined)?.posts;
const setPosts = (accountId: string, value: number) => {
  (getAccountById(accountId) as unknown as { posts: number }).posts = value;
};
const storedPosts = (accountId: string) => storedAccount<{ posts: number }>(accountId)?.posts;
const quietErrors = () => jest.spyOn(console, 'error').mockImplementation(() => undefined);

describe('loadAccount', () => {
  it('answers a call made during a read with what was saved before the call', async () => {
    saveElsewhere('a', { posts: 1 });
    const first = loadAccount('a');
    // Let the first read take its copy, then save and ask again while it is still out.
    await later(undefined, 20);
    saveElsewhere('a', { posts: 2 });
    const second = loadAccount('a');

    await first;
    await second;

    expect(posts('a')).toBe(2);
  });

  it('shares one further read between calls made during a read', async () => {
    saveElsewhere('b', { posts: 1 });
    const first = loadAccount('b');
    await later(undefined, 20);
    saveElsewhere('b', { posts: 2 });
    storageModule.getManyFromStorage.mockClear();

    await Promise.all([first, loadAccount('b'), loadAccount('b')]);

    expect(accountReads('b')).toBe(1);
    expect(posts('b')).toBe(2);
  });

  it('does not read the account again while its stamp is unchanged', async () => {
    saveElsewhere('c', { posts: 1 });
    await loadAccount('c');
    storageModule.getManyFromStorage.mockClear();

    await loadAccount('c');

    expect(accountReads('c')).toBe(0);
  });

  it('reads the account again once a save elsewhere has changed its stamp', async () => {
    saveElsewhere('d', { posts: 1 });
    await loadAccount('d');
    saveElsewhere('d', { posts: 2 });

    await loadAccount('d');

    expect(posts('d')).toBe(2);
  });

  it('keeps reads of two accounts apart', async () => {
    saveElsewhere('e1', { posts: 1 });
    saveElsewhere('e2', { posts: 2 });

    await Promise.all([loadAccount('e1'), loadAccount('e2')]);

    expect(posts('e1')).toBe(1);
    expect(posts('e2')).toBe(2);
  });

  it('lets go of an account deleted elsewhere', async () => {
    saveElsewhere('f', { posts: 1 });
    await loadAccount('f');
    deleteElsewhere('f');

    await loadAccount('f');

    expect(getAccountById('f')).toBeUndefined();
  });

  it('keeps an account built here and not saved yet', async () => {
    putAccount('g', { posts: 3 } as unknown as AccountData);

    await loadAccount('g');

    expect(posts('g')).toBe(3);
  });
});

describe('loadAllAccounts', () => {
  it('reads every stored account and lets go of those deleted elsewhere', async () => {
    saveElsewhere('all1', { posts: 1 });
    saveElsewhere('all2', { posts: 2 });
    await loadAllAccounts();
    deleteElsewhere('all1');

    await loadAllAccounts();

    expect(getAccountById('all1')).toBeUndefined();
    expect(posts('all2')).toBe(2);
  });

  it('keeps an account built here and not saved yet', async () => {
    putAccount('all3', { posts: 3 } as unknown as AccountData);

    await loadAllAccounts();

    expect(posts('all3')).toBe(3);
  });
});

describe('saveAccount', () => {
  it('saves a change made to the copy read here', async () => {
    saveElsewhere('h', { posts: 1 });
    await loadAccount('h');
    setPosts('h', 2);

    expect(await saveAccount('h')).toBe(true);
    expect(storedPosts('h')).toBe(2);
  });

  it('refuses to save over a save made elsewhere since the read', async () => {
    saveElsewhere('i', { posts: 1 });
    await loadAccount('i');
    saveElsewhere('i', { posts: 5 });
    setPosts('i', 2);
    quietErrors();

    expect(await saveAccount('i')).toBe(false);
    expect(storedPosts('i')).toBe(5);

    // The next read brings this context back to what is stored.
    await loadAccount('i');
    expect(posts('i')).toBe(5);
  });

  it('saves twice in a row from the same context', async () => {
    saveElsewhere('j', { posts: 1 });
    await loadAccount('j');

    expect(await saveAccount('j')).toBe(true);
    expect(await saveAccount('j')).toBe(true);
  });

  it('replaces what is stored with an account built here as a whole', async () => {
    saveElsewhere('k', { posts: 1 });
    await loadAccount('k');
    saveElsewhere('k', { posts: 5 });
    putAccount('k', { posts: 9 } as unknown as AccountData);

    expect(await saveAccount('k')).toBe(true);
    expect(storedPosts('k')).toBe(9);
  });

  it('does not bring back an account deleted elsewhere', async () => {
    saveElsewhere('l', { posts: 1 });
    await loadAccount('l');
    deleteElsewhere('l');
    quietErrors();

    expect(await saveAccount('l')).toBe(false);
    expect(storedPosts('l')).toBeUndefined();
  });

  it('tells the save hook about a save, and not about a refused one', async () => {
    const hook = jest.fn();
    setSaveHook(hook);
    saveElsewhere('m', { posts: 1 });
    await loadAccount('m');

    await saveAccount('m');
    saveElsewhere('m', { posts: 2 });
    quietErrors();
    await saveAccount('m');
    clearSaveHook();

    expect(hook).toHaveBeenCalledTimes(1);
  });
});

describe('removeAccount', () => {
  it('deletes the account here and in storage, with its research', async () => {
    saveElsewhere('n', { posts: 1 });
    stored['research_n'] = '{}';
    await loadAccount('n');

    await removeAccount('n');
    await loadAccount('n');

    expect(getAccountById('n')).toBeUndefined();
    expect(Object.keys(stored).filter((k) => k.endsWith('_n'))).toEqual([]);
  });
});
