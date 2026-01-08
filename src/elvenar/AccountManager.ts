import { getFromStorage, saveToStorage } from '../chrome/storage';
import { Badges } from '../model/badges';
import { CityEntity } from '../model/cityEntity';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { Ingredient } from '../model/ingredient';
import { InventoryItem } from '../model/inventoryItem';
import { PotionEffect } from '../model/potionEffect';
import { Trade } from '../model/trade';
import { UnlockedArea } from '../model/unlockedArea';
import { ElvenarUserData } from '../model/userData';

interface CityQuery {
  boostedGoods: string[];
  cityEntities: CityEntity[];
  unlockedAreas: UnlockedArea[];
  accountId: string;
  accountName: string;
  cityName: string;
  maxChapter: number;
  chapter: number;
  userData: ElvenarUserData;
  url: string;
  tabId: number;
  sessionId: string;
  badges: Badges;
}

interface CauldronQuery {
  potionEffects: PotionEffect[];
  ingredients: Ingredient[];
}

export interface AccountData {
  sharedInfo: ExtensionSharedInfo;

  cityQuery?: CityQuery;

  inventoryItems?: InventoryItem[];

  trades?: Trade[];

  cauldron?: CauldronQuery;
}

const accounts: Record<string, AccountData> = {};

export function getAccountId(playerId: number, worldId: string): string {
  return `${playerId}@${worldId}`;
}

export async function setAccountData(accountId: string, accountData: AccountData) {
  accounts[accountId] = accountData;
}

export async function saveAllAccounts() {
  await saveToStorage('accounts', JSON.stringify(accounts));
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
let loadReadyPromise: Promise<void> | undefined;
let initialized = false;

export const loadAccountManagerFromStorage = async (refresh = false) => {
  if (initialized && !refresh) {
    return;
  }
  initialized = false;
  if (loadReadyPromise) {
    await loadReadyPromise;
    return;
  }
  loadReadyPromise = new Promise<void>((resolve) => {
    loadReadyResolve = resolve;
  });
  const accountsRaw = await getFromStorage('accounts');
  if (accountsRaw) {
    const parsedAccounts = JSON.parse(accountsRaw) as Record<string, AccountData>;
    Object.assign(accounts, parsedAccounts);
  }
  initialized = true;
  loadReadyPromise = undefined;
  loadReadyResolve();
};

export const getAllStoredAccounts = (): [string, AccountData][] => {
  return Object.entries(accounts);
};
