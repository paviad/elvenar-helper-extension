import { getFromStorage, saveToStorage } from '../chrome/storage';
import { Badges, Relics } from '../model/badges';
import { CityEntity } from '../model/cityEntity';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { Ingredient } from '../model/ingredient';
import { InventoryItem } from '../model/inventoryItem';
import { PotionEffect } from '../model/potionEffect';
import { Trade } from '../model/trade';
import { UnlockedArea } from '../model/unlockedArea';
import { ElvenarUserData } from '../model/userData';

export interface CauldronQuery {
  potionEffects: PotionEffect[];
  ingredients: Ingredient[];
}
export interface FaQuest {
  id: number;
  badge: string;
  maxProgress: number;
  currentProgress: number;
}

export interface CityQuery {
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
  relics: Relics;
  timestamp: number;
  faRequirements: Record<string, FaQuest>;
  relicBoosts: Record<keyof Relics, number>;
  squadSize: number;
  rankingPoints: number;
  cityResources?: Record<string, number>;
}

export interface AccountData {
  isDetached: boolean;

  sharedInfo: ExtensionSharedInfo;

  cityQuery?: CityQuery;

  inventoryItems?: InventoryItem[];

  trades?: Trade[];

  cauldron?: CauldronQuery;

  faEndTime?: number;
}

export const accounts_last_saved_single: Record<string, number> = {};
export const accounts: Record<string, AccountData> = {};

export async function saveSingleAccount(accountId: string) {
  const accountsLastSavedRaw = await getFromStorage(`accounts_last_saved_${accountId}`);
  if (accountsLastSavedRaw) {
    const accountsLastSaved = parseInt(accountsLastSavedRaw, 10);
    if (accounts_last_saved_single[accountId] && accountsLastSaved > accounts_last_saved_single[accountId]) {
      throw new Error('ElvenAssist: Detected newer accounts in storage, aborting save');
    }
  }
  const numAccounts = +((await getFromStorage('num_accounts')) || 0);
  const currentNumAccounts = Object.keys(accounts).length;
  if (numAccounts <= 1 && currentNumAccounts > 1) {
    await saveToStorage('notifyMultipleAccounts', 'true');
  }
  await saveToStorage('num_accounts', currentNumAccounts.toString());

  await saveToStorage(`accounts_${accountId}`, JSON.stringify(accounts[accountId]));
  accounts_last_saved_single[accountId] = Date.now();
  await saveToStorage(`accounts_last_saved_${accountId}`, accounts_last_saved_single[accountId].toString());
}
