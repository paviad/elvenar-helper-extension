import { NonSpecificMessage } from './nonSpecificMessages';

export const nonSpecificMatchers = [
  {
    id: 'featureBuildings',
    messageType: 'BUILDINGS_FEATURE',
    regex:
      /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/static\/feature_flags\/ch(\d+)\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.city\.Buildings_[a-f0-9]{32}\.json$/,
  },
  {
    id: 'allBuildings',
    messageType: 'BUILDINGS_ALL',
    regex:
      /^https:\/\/ox.*?\.innogamescdn.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.city\.Buildings_[a-f0-9]+\.json$/,
  },
  {
    id: 'items',
    messageType: 'ITEMS',
    regex:
      /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.city\.Items_[a-f0-9]{32}\.json$/,
  },
  {
    id: 'effects',
    messageType: 'EFFECTS',
    regex:
      /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.effects\.EffectConfigs_[a-f0-9]{32}\.json$/,
  },
  {
    id: 'tomes',
    messageType: 'TOMES',
    regex:
      /^https:\/\/[a-z]+\.innogamescdn\.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.rewards\.reward_selection_kit\.RewardSelectionKit_[a-f0-9]{32}\.json$/,
  },
  {
    id: 'premiumBuildingHints',
    messageType: 'PREMIUM_BUILDING_HINTS',
    regex:
      /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.city\.PremiumBuildingHintsHumans_[a-f0-9]{32}\.json$/,
  },
  {
    id: 'goodsNames',
    messageType: 'GOODS_NAMES',
    regex:
      /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.Goods_[a-f0-9]{32}\.json$/,
  },
  {
    id: 'evolvingBuildings',
    messageType: 'EVOLVING_BUILDINGS',
    regex:
      /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.city\.EvolvingBuildings_[a-f0-9]{32}\.json$/,
  },
] satisfies {
  id: string;
  messageType: NonSpecificMessage['type'];
  regex: RegExp;
}[];
