import { getFromStorage, saveToStorage } from '../chrome/storage';
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
const sessions: Record<string, string> = {};

export function getAccountId(playerId: number, worldId: string): string {
  return `${playerId}@${worldId}`;
}

export async function setAccountData(accountId: string, accountData: AccountData) {
  accounts[accountId] = accountData;
  sessions[accountData.sharedInfo.sessionId] = accountId;
}

export async function saveAllAccounts() {
  await saveToStorage('accounts', JSON.stringify(accounts));
}

export function getAccountBySessionId(sessionId: string): AccountData | undefined {
  const accountId = sessions[sessionId];
  if (accountId) {
    return accounts[accountId];
  }
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
    // Rebuild sessions map
    for (const [accountId, accountData] of Object.entries(accounts)) {
      sessions[accountData.sharedInfo.sessionId] = accountId;
    }
  }
  initialized = true;
  loadReadyPromise = undefined;
  loadReadyResolve();
};

export const getAllStoredAccounts = (): [string, AccountData][] => {
  return Object.entries(accounts);
};
