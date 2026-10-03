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
import { AccountData, accountStampKey } from './Accounts';
import {
  accountListVersion,
  accountVersion,
  getAccountById,
  loadAccount,
  loadAllAccounts,
  putAccount,
  removeAccount,
  saveAccount,
  subscribeToAccounts,
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

  it('deletes an account whose stored record is corrupt', async () => {
    saveElsewhere('corrupt', { posts: 1 });
    stored['accounts_corrupt'] = '{"posts": 1';
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await loadAllAccounts();

    expect(getAccountById('corrupt')).toBeUndefined();
    expect(stored['accounts_corrupt']).toBeUndefined();
  });

  it('keeps an account in storage when reading it fails', async () => {
    saveElsewhere('unreadable', { posts: 4 });
    storageModule.getManyFromStorage.mockImplementationOnce(() => Promise.reject(new Error('storage failed')));
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await loadAllAccounts();
    expect(storedPosts('unreadable')).toBe(4);

    await loadAllAccounts();
    expect(posts('unreadable')).toBe(4);
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

  it('skips a save that would write again what it wrote last', async () => {
    saveElsewhere('j2', { posts: 1 });
    await loadAccount('j2');
    setPosts('j2', 2);
    await saveAccount('j2');
    const stamp = stored[accountStampKey('j2')];
    const before = accountVersion('j2');
    storageModule.saveManyToStorage.mockClear();

    expect(await saveAccount('j2')).toBe(true);
    expect(storageModule.saveManyToStorage).not.toHaveBeenCalled();
    expect(stored[accountStampKey('j2')]).toBe(stamp);
    expect(accountVersion('j2')).toBe(before);
  });

  it('writes again after a change made in place since its last save', async () => {
    saveElsewhere('j3', { posts: 1 });
    await loadAccount('j3');
    await saveAccount('j3');
    setPosts('j3', 2);

    expect(await saveAccount('j3')).toBe(true);
    expect(storedPosts('j3')).toBe(2);
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
});

describe('subscribeToAccounts', () => {
  const watch = () => {
    const seen: string[] = [];
    const unsubscribe = subscribeToAccounts((accountId) => seen.push(accountId));
    return { seen, unsubscribe };
  };

  it('reports a read that brought a new copy, and only that', async () => {
    saveElsewhere('s1', { posts: 1 });
    const { seen, unsubscribe } = watch();

    await loadAccount('s1');
    await loadAccount('s1');
    saveElsewhere('s1', { posts: 2 });
    await loadAccount('s1');
    unsubscribe();

    expect(seen).toEqual(['s1', 's1']);
  });

  it('reports a put, a save, a deletion elsewhere and a removal', async () => {
    saveElsewhere('s2', { posts: 1 });
    saveElsewhere('s3', { posts: 1 });
    await loadAccount('s2');
    await loadAccount('s3');
    const { seen, unsubscribe } = watch();

    putAccount('s4', { posts: 1 } as unknown as AccountData);
    await saveAccount('s2');
    deleteElsewhere('s3');
    await loadAccount('s3');
    await removeAccount('s2');
    unsubscribe();

    expect(seen).toEqual(['s4', 's2', 's3', 's2']);
  });

  it('counts a save, which may follow a change made in place', async () => {
    saveElsewhere('s5', { posts: 1 });
    await loadAccount('s5');
    const before = accountVersion('s5');
    const listBefore = accountListVersion();

    setPosts('s5', 2);
    await saveAccount('s5');

    expect(accountVersion('s5')).toBe(before + 1);
    expect(accountListVersion()).toBe(listBefore + 1);
  });

  it('does not report a refused save', async () => {
    saveElsewhere('s6', { posts: 1 });
    await loadAccount('s6');
    saveElsewhere('s6', { posts: 2 });
    quietErrors();
    const { seen, unsubscribe } = watch();

    await saveAccount('s6');
    unsubscribe();

    expect(seen).toEqual([]);
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
