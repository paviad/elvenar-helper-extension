import { InjectMessage } from './injectMessages';
import { processAwBuildings } from './processAwBuildings';
import { processBuildings } from './processBuildings';
import { processEffects } from './processEffects';
import { processItems } from './processItems';
import { processMaxLevels } from './processMaxLevels';
import { processTomes } from './processTomes';

export const matchers = [
  {
    id: 'featureBuildings',
    messageType: 'BUILDINGS_PROCESSED',
    regex:
      /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/static\/feature_flags\/ch(\d+)\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.city\.Buildings_[a-f0-9]{32}\.json$/,
    processor: (responseText: string) => processBuildings(responseText, false),
  },
  {
    id: 'allBuildings',
    messageType: 'BUILDINGS_PROCESSED',
    regex:
      /^https:\/\/ox.*?\.innogamescdn.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.city\.Buildings_[a-f0-9]+\.json$/,
    processor: (responseText: string) => processBuildings(responseText, true),
  },
  {
    id: 'maxLevels',
    messageType: 'MAX_LEVELS_PROCESSED',
    regex: /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/assets\/renderconfigdata-[a-f0-9]{32}\.json$/,
    processor: (responseText: string) => processMaxLevels(responseText),
  },
  {
    id: 'items',
    messageType: 'ITEMS_PROCESSED',
    regex:
      /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.city\.Items_[a-f0-9]{32}\.json$/,
    processor: (responseText: string) => processItems(responseText),
  },
  {
    id: 'effects',
    messageType: 'EFFECTS_PROCESSED',
    regex:
      /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.effects\.EffectConfigs_[a-f0-9]{32}\.json$/,
    processor: (responseText: string) => processEffects(responseText),
  },
  {
    id: 'tomes',
    messageType: 'TOMES_PROCESSED',
    regex:
      /^https:\/\/[a-z]+\.innogamescdn\.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.rewards\.reward_selection_kit\.RewardSelectionKit_[a-f0-9]{32}\.json$/,
    processor: (responseText: string) => processTomes(responseText),
  },
  {
    id: 'awBuildings',
    messageType: 'AWBUILDINGS_PROCESSED',
    regex:
      /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.Goods_[a-f0-9]{32}\.json$/,
    processor: (responseText: string) => processAwBuildings(responseText),
  },
] satisfies {
  id: string;
  messageType: InjectMessage['type'];
  regex: RegExp;
  processor: (responseText: string) => InjectMessage['payload'];
}[];
