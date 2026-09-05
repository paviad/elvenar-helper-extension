import { clearStorage, later, saveElsewhere, storageModule, storedAccount } from '../testing/fakeStorage';
import { getAccountById, loadAccount } from './accountStore';
import { clearKpHuntOpportunities } from './clearKpHuntOpportunities';

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

const opportunities = { x: { playerId: 1 }, y: { playerId: 2 } };
const storedOpportunities = (accountId: string) =>
  storedAccount<{ kpHuntOpportunities?: Record<string, unknown> }>(accountId)?.kpHuntOpportunities;

describe('clearKpHuntOpportunities', () => {
  it('drops the one opportunity named and saves the account', async () => {
    saveElsewhere('one', { kpHuntOpportunities: opportunities });

    const left = await clearKpHuntOpportunities('one', 'x');

    expect(left).toEqual({ y: { playerId: 2 } });
    expect(storedOpportunities('one')).toEqual({ y: { playerId: 2 } });
  });

  it('drops them all when none is named', async () => {
    saveElsewhere('all', { kpHuntOpportunities: opportunities });

    const left = await clearKpHuntOpportunities('all');

    expect(left).toEqual({});
    expect(storedOpportunities('all')).toEqual({});
  });

  it('keeps what was saved since this context last read the account', async () => {
    saveElsewhere('newer', { kpHuntOpportunities: opportunities });
    await loadAccount('newer');
    saveElsewhere('newer', { kpHuntOpportunities: { ...opportunities, z: { playerId: 3 } }, posts: 5 });

    await clearKpHuntOpportunities('newer', 'x');

    expect(storedAccount('newer')).toEqual({
      kpHuntOpportunities: { y: { playerId: 2 }, z: { playerId: 3 } },
      posts: 5,
    });
  });

  it('lands in the copy a save already under way writes from', async () => {
    saveElsewhere('busy', { kpHuntOpportunities: opportunities });
    await loadAccount('busy');
    // A game response is being processed: the worker holds the account and will save it.
    const account = getAccountById('busy') as unknown as { posts?: number };
    const cleared = clearKpHuntOpportunities('busy', 'y');
    account.posts = 1;
    await later(undefined, 5);

    await cleared;

    expect(storedAccount('busy')).toEqual({ kpHuntOpportunities: { x: { playerId: 1 } }, posts: 1 });
  });

  it('answers undefined for an account it does not know', async () => {
    expect(await clearKpHuntOpportunities('nobody', 'x')).toBeUndefined();
  });
});
