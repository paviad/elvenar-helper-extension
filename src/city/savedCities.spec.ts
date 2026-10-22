import { AccountData } from '../elvenar/Accounts';
import { loadAccount } from '../elvenar/accountStore';
import { clearStorage, saveElsewhere, stored, storedAccount } from '../testing/fakeStorage';
import { deleteCityById, saveCityInPlace, saveCultureModifiers, saveCurrentCityAs } from './savedCities';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('../chrome/storage', () => require('../testing/fakeStorage').storageModule);

const mockSetGlobalError = jest.fn();
jest.mock('../util/tabStore', () => ({
  useTabStore: { getState: () => ({ setGlobalError: mockSetGlobalError }) },
}));

beforeEach(() => {
  clearStorage();
  mockSetGlobalError.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const city = (isDetached: boolean, posts = 0) =>
  ({ isDetached, posts, sharedInfo: {}, cityQuery: { cityEntities: [], chapter: 1 } }) as unknown as AccountData;
const storedPosts = (accountId: string) => storedAccount<{ posts: number }>(accountId)?.posts;
const storedChapter = (accountId: string) =>
  storedAccount<{ cityQuery: { chapter: number } }>(accountId)?.cityQuery.chapter;
const modifiers = { help: 0.8, enchant: 0.9 };
const withModifiers = (data: AccountData) => ({
  ...data,
  cityQuery: { ...data.cityQuery!, cultureModifiers: modifiers },
});
const storedModifiers = (accountId: string) =>
  storedAccount<{ cityQuery: { cultureModifiers?: unknown } }>(accountId)?.cityQuery.cultureModifiers;

describe('the city editor', () => {
  it('saves only the city it changed', async () => {
    saveElsewhere('live', city(false, 1));
    saveElsewhere('saved', city(true));
    await loadAccount('live');
    await loadAccount('saved');
    // The service worker records more play meanwhile.
    saveElsewhere('live', city(false, 2));

    await saveCityInPlace('saved', [], 2);

    expect(storedChapter('saved')).toBe(2);
    expect(storedPosts('live')).toBe(2);
  });

  it('copies a city from what is stored now', async () => {
    saveElsewhere('live2', city(false, 1));
    await loadAccount('live2');
    saveElsewhere('live2', city(false, 2));

    await saveCurrentCityAs('live2', 'live2 (autosave)', [], 1);

    expect(storedPosts('live2 (autosave)')).toBe(2);
  });

  it('does not save a city over an account being played', async () => {
    saveElsewhere('live3', city(false));
    saveElsewhere('saved3', city(true));
    await loadAccount('live3');

    await expect(saveCurrentCityAs('saved3', 'live3', [], 1)).rejects.toThrow('being played');
  });

  it('says so when another tab saved the city first', async () => {
    saveElsewhere('shared', city(true));
    await loadAccount('shared');
    // Another editor tab moves a building.
    saveElsewhere('shared', city(true, 7));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await saveCityInPlace('shared', [], 3);

    expect(storedPosts('shared')).toBe(7);
    expect(mockSetGlobalError).toHaveBeenCalledWith(expect.stringContaining('changed in another tab'));
  });

  it('keeps the help and enchantments of the account a city is saved from', async () => {
    saveElsewhere('live4', withModifiers(city(false)));
    await loadAccount('live4');

    await saveCurrentCityAs('live4', 'plan4', [], 1);

    expect(storedModifiers('plan4')).toEqual(modifiers);
  });

  it('sets the help and enchantments of a saved city', async () => {
    saveElsewhere('plan5', withModifiers(city(true)));
    await loadAccount('plan5');

    await saveCultureModifiers('plan5', { help: 0.25, enchant: 0 });

    expect(storedModifiers('plan5')).toEqual({ help: 0.25, enchant: 0 });
  });

  it('leaves the help and enchantments of an account being played to the game', async () => {
    saveElsewhere('live6', withModifiers(city(false)));
    await loadAccount('live6');

    await expect(saveCultureModifiers('live6', { help: 0, enchant: 0 })).rejects.toThrow('come from the game');
    expect(storedModifiers('live6')).toEqual(modifiers);
  });

  it('deletes a saved city for good', async () => {
    saveElsewhere('gone', city(true));
    await loadAccount('gone');

    await deleteCityById('gone');
    await loadAccount('gone');

    expect(stored['accounts_gone']).toBeUndefined();
  });
});
