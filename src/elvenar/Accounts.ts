import { getFromStorage, saveManyToStorage, saveToStorage } from '../chrome/storage';
import { ArmyDetails } from '../model/armyDetails';
import { Badges, Relics } from '../model/badges';
import { CityEntity } from '../model/cityEntity';
import { EnsorcelledEndowment } from '../model/ensorcelledEndowment';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { FAStoreData } from '../model/faStageProgress';
import { MessagesData } from '../model/gameMessage';
import { Ingredient } from '../model/ingredient';
import { InventoryItem } from '../model/inventoryItem';
import { KpGiven } from '../model/kpGiven';
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
  /** When the enchantment on a building runs out, keyed by the game's entity id. */
  enchantmentsEnd?: Record<string, number>;
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

  /** Knowledge you have put into other players' wonders, for the swap list to count off. */
  kpGiven?: KpGiven;

  /**
   * Seconds to add to this machine's clock to read the game's, measured each time you post.
   * Gifts are stamped with it so they can be set against post times to the second.
   */
  serverClockOffset?: number;
}

export const accounts: Record<string, AccountData> = {};

export const accountKey = (accountId: string) => `accounts_${accountId}`;
export const accountStampKey = (accountId: string) => `accounts_last_saved_${accountId}`;

/** An account's save stamp as read from storage; one saved before stamps were kept reads as 0. */
export const parseStamp = (raw: string | undefined | null) => (raw ? parseInt(raw, 10) : 0);

/**
 * The stamp each account held here was stored under when it was read or last saved. Every save
 * writes a new stamp beside the account, so a different one in storage means somebody else has
 * saved it since. An account held with no stamp was built here, as a whole, and not saved yet.
 */
export const heldStamps: Record<string, number | undefined> = {};

/**
 * Saves an account held here, unless somebody else saved it since we read it.
 *
 * The account is written from the copy this context holds, whole. Writing over a newer save would
 * throw away whatever that save added, so the save is refused instead: what is lost then is the
 * change made here, and the next read brings this context back to what is stored. An account that
 * was built here as a whole, rather than changed from a stored copy, replaces what is stored.
 *
 * Returns whether the account was written.
 */
export async function saveSingleAccount(accountId: string): Promise<boolean> {
  const account = accounts[accountId];
  if (!account) {
    console.warn(`ElvenAssist: Account ${accountId} is not held here, nothing to save`);
    return false;
  }

  const storedStamp = parseStamp(await getFromStorage(accountStampKey(accountId)));
  const heldStamp = heldStamps[accountId];
  if (heldStamp !== undefined && storedStamp !== heldStamp) {
    console.error(`ElvenAssist: Account ${accountId} was saved elsewhere since it was read here; not
       saving over it. If this happens repeatedly, please report this issue to the developers at
       either of these links:
       github: https://github.com/paviad/elvenar-helper-extension/issues/5
       discord: https://discord.com/channels/1492111560884228276/1492119022639124520`);
    return false;
  }

  const numAccounts = +((await getFromStorage('num_accounts')) || 0);
  const currentNumAccounts = Object.keys(accounts).length;
  if (numAccounts <= 1 && currentNumAccounts > 1) {
    await saveToStorage('notifyMultipleAccounts', 'true');
  }
  await saveToStorage('num_accounts', currentNumAccounts.toString());

  // Two saves in the same millisecond must still tell apart.
  const stamp = Math.max(Date.now(), storedStamp + 1);
  await saveManyToStorage({
    [accountKey(accountId)]: JSON.stringify(account),
    [accountStampKey(accountId)]: stamp.toString(),
  });
  heldStamps[accountId] = stamp;
  return true;
}
