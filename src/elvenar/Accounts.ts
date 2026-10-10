import { ArmyDetails } from '../model/armyDetails';
import { Badges, Relics } from '../model/badges';
import { CityEntity } from '../model/cityEntity';
import { EnsorcelledEndowment } from '../model/ensorcelledEndowment';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { FAStoreData } from '../model/faStageProgress';
import { MessagesData } from '../model/gameMessage';
import { InventoryItem } from '../model/inventoryItem';
import { KpGiven } from '../model/kpGiven';
import { SeasonalEvent } from '../model/seasonalEvent';
import { Trade } from '../model/trade';
import { Transcendence } from '../model/transcendence';
import { UnlockedArea } from '../model/unlockedArea';
import { ElvenarUserData } from '../model/userData';
import { WonderKp } from '../model/wonderKp';

export interface CauldronQuery {
  /** This week's premium ingredients as the Cauldron Optimizer's indexes (0-11). */
  premiumIngredients: number[];
  /**
   * The game session they were read in. The game sends no ingredients during the cooldown, so
   * what is stored may be from an earlier week; only those read in the current session are sent.
   */
  sessionId: string;
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

/** Where an account is stored, and the stamp each save writes beside it. */
export const accountKey = (accountId: string) => `accounts_${accountId}`;
export const accountStampKey = (accountId: string) => `accounts_last_saved_${accountId}`;

/** An account's save stamp as read from storage; one saved before stamps were kept reads as 0. */
export const parseStamp = (raw: string | undefined | null) => (raw ? parseInt(raw, 10) : 0);
