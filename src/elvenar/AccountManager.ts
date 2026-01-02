import { getFromStorage, saveToStorage } from '../chrome/storage';
import { CityEntity } from '../model/cityEntity';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { InventoryItem } from '../model/inventoryItem';
import { Trade } from '../model/trade';
import { UnlockedArea } from '../model/unlockedArea';
import { ElvenarUserData } from '../model/userData';

interface CityQuery {
  boostedGoods: string[];
  cityEntities: CityEntity[];
  unlockedAreas: UnlockedArea[];
  accountId: string;
  accountName: string;
  maxChapter: number;
  chapter: number;
  userData: ElvenarUserData;
  url: string;
}

export interface AccountData {
  sharedInfo: ExtensionSharedInfo;

  cityQuery?: CityQuery;

  inventoryItems?: InventoryItem[];

  trades?: Trade[];
}

const accounts: Record<string, AccountData> = {};
const sessions: Record<string, string> = {};

export function getAccountId(playerId: number, worldId: string): string {
  return `${playerId}@${worldId}`;
}

export async function setAccountData(accountId: string, accountData: AccountData) {
  accounts[accountId] = accountData;
  sessions[accountData.sharedInfo.sessionId] = accountId;
  console.log(`Account data saved for accountId: ${accountId}`, accounts, sessions);
}

export async function saveAllAccounts() {
  console.log('Saving all accounts to storage:', accounts);
  await saveToStorage('accounts', JSON.stringify(accounts));
}

export function getAccountBySessionId(sessionId: string): AccountData | undefined {
  const accountId = sessions[sessionId];
  console.log('Getting account by sessionId:', sessionId, accountId);
  if (accountId) {
    return accounts[accountId];
  }
}

export function getAccountById(accountId: string): AccountData | undefined {
  return accounts[accountId];
}

export const loadAccountManagerFromStorage = async () => {
  const accountsRaw = await getFromStorage('accounts');
  if (accountsRaw) {
    const parsedAccounts = JSON.parse(accountsRaw) as Record<string, AccountData>;
    Object.assign(accounts, parsedAccounts);
    console.log('AccountManager loaded accounts from storage:', accounts);
    // Rebuild sessions map
    for (const [accountId, accountData] of Object.entries(accounts)) {
      sessions[accountData.sharedInfo.sessionId] = accountId;
    }
    console.log('AccountManager rebuilt sessions map:', sessions);
  }
};

export const getAllStoredAccounts = (): [string, AccountData][] => {
  return Object.entries(accounts);
};
