import { getFromStorage, saveToStorage } from '../chrome/storage';
import { ArmyDetails } from '../model/armyDetails';
import { Badges, Relics } from '../model/badges';
import { CityEntity } from '../model/cityEntity';
import { EnsorcelledEndowment } from '../model/ensorcelledEndowment';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { FAStoreData } from '../model/faStageProgress';
import { MessagesData } from '../model/gameMessage';
import { Ingredient } from '../model/ingredient';
import { InventoryItem } from '../model/inventoryItem';
import { PotionEffect } from '../model/potionEffect';
import { SeasonalEvent } from '../model/seasonalEvent';
import { Trade } from '../model/trade';
import { Transcendence } from '../model/transcendence';
import { UnlockedArea } from '../model/unlockedArea';
import { ElvenarUserData } from '../model/userData';
import { WonderKp } from '../model/wonderKp';

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
  armyDetails?: ArmyDetails;
  tournaments?: SeasonalEvent[];
  expirationsEnd: Record<string, number>;
  /** Your wonders currently taking knowledge points, kept current by AncientWonderService. */
  wonderKp?: WonderKp[];
}

export interface AccountData {
  isDetached: boolean;

  sharedInfo: ExtensionSharedInfo;

  cityQuery?: CityQuery;

  inventoryItems?: InventoryItem[];

  trades?: Trade[];

  cauldron?: CauldronQuery;

  faEndTime?: number;

  transcendenceData?: Transcendence[];

  ensorcelledEndowmentData?: {
    eeEffects: EnsorcelledEndowment[];
    neighborlyHelpEffects: EnsorcelledEndowment[];
  };

  faDataStore?: FAStoreData;

  messagesData?: MessagesData;
}

export const accounts_last_saved_single: Record<string, number> = {};
export const accounts: Record<string, AccountData> = {};

export async function saveSingleAccount(accountId: string) {
  const accountsLastSavedRaw = await getFromStorage(`accounts_last_saved_${accountId}`);
  if (accountsLastSavedRaw) {
    const accountsLastSaved = parseInt(accountsLastSavedRaw, 10);
    if (accounts_last_saved_single[accountId] && accountsLastSaved > accounts_last_saved_single[accountId]) {
      console.warn(`ElvenAssist: Detected newer account data for account ${accountId} in storage,
         continuing with save but be aware that you might lose some data. If this happens repeatedly,
         please report this issue to the developers at either of these links:
         github: https://github.com/paviad/elvenar-helper-extension/issues/5
         discord: https://discord.com/channels/1492111560884228276/1492119022639124520`);
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
