export interface SeasonalEvent {
  __class__: string;
  eventId: number;
  type: string;
  subType: string;
  name: string;
  state: 'last' | 'coming' | 'new' | 'running';
  properties?: Property[];
  remainingTime?: number;
}

export interface Property {
  __class__: string;
  episodeNumber?: number;
  nextIn?: number;
  reRollPremiumCosts?: number;
  currentGrandPrizeIndex?: number;
  nextReachableRewardIndex?: number;
  totalPayback?: number;
  nextDailyQuestsIn?: number;
  nextWeeklyQuestsIn?: number;
  availableWeeklyQuestRerolls?: number;
  weeklyQuestsTotal?: number;
  weeklyQuestsCompleted?: number;
  claimedLevels?: { [key: string]: number };
  premiumNextLevel?: number;
  hasClaimedDailyChest?: boolean;
  seasonPassOfferId?: string;
  petalsOfferId?: string;
}
