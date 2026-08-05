import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';

export interface PlayerSpecificMatcherSpecification {
  requestSelector?: {
    requestClass: string;
    requestMethod: string;
  };
  responseSelector?: {
    requestClass: string;
    requestMethod: string;
  };
  local?: (response: ElvenarRequestResponseEntry[]) => Promise<unknown>; // local handling, don't propagate to overlay / service worker
}

export const playerSpecificMatchers: PlayerSpecificMatcherSpecification[] = [
  {
    requestSelector: {
      requestClass: 'NotificationService',
      requestMethod: 'getAllNotifications',
    },
  },
  {
    requestSelector: {
      requestClass: 'NotificationService',
      requestMethod: 'getPreviewNotifications',
    },
  },
  {
    requestSelector: {
      requestClass: 'StartupService',
      requestMethod: 'getData',
    },
  },
  {
    requestSelector: {
      requestClass: 'InventoryService',
      requestMethod: 'getItems',
    },
  },
  {
    requestSelector: {
      requestClass: 'TradeService',
      requestMethod: 'getOtherPlayersTrades',
    },
  },
  {
    requestSelector: {
      requestClass: 'CauldronService',
      requestMethod: 'getIngredients',
    },
  },
  {
    requestSelector: {
      requestClass: 'CauldronService',
      requestMethod: 'getPotionEffects',
    },
  },
  {
    requestSelector: {
      requestClass: 'OtherPlayerService',
      requestMethod: 'visitPlayer',
    },
  },
  {
    responseSelector: {
      requestClass: 'CityResourcesService',
      requestMethod: 'getResources',
    },
  },
  {
    responseSelector: {
      requestClass: 'InventoryService',
      requestMethod: 'updateItems',
    },
  },
  {
    requestSelector: {
      requestClass: 'SpireService',
      requestMethod: 'getEncounter',
    },
  },
  {
    requestSelector: {
      requestClass: 'SpireDiplomacyService',
      requestMethod: 'submit',
    },
  },
  {
    responseSelector: {
      requestClass: 'SeasonalEventsService',
      requestMethod: 'getEvents',
    },
  },
  {
    responseSelector: {
      requestClass: 'CityMapService',
      requestMethod: 'reset',
    },
  },
  {
    responseSelector: {
      requestClass: 'TranscendenceService',
      requestMethod: 'allBuildingsStates',
    },
  },
  {
    responseSelector: {
      requestClass: 'EffectsService',
      requestMethod: 'update',
    },
  },
  {
    responseSelector: {
      requestClass: 'QuestService',
      requestMethod: 'getUpdates',
    },
  },
  {
    responseSelector: {
      requestClass: 'QuestMilestoneService',
      requestMethod: 'updateQuestMilestone',
    },
  },
  {
    responseSelector: {
      requestClass: 'MultiplayerEventService',
      requestMethod: 'updateWaypoints',
    },
  },
  {
    responseSelector: {
      requestClass: 'ChestsService',
      requestMethod: 'updateChestPayInProgress',
    },
  },
  {
    responseSelector: {
      requestClass: 'MultiplayerEventService',
      requestMethod: 'updateOverview',
    },
  },
  {
    responseSelector: {
      requestClass: 'MessageService',
      requestMethod: 'getMessageOverview',
    },
  },
  {
    responseSelector: {
      requestClass: 'MessageService',
      requestMethod: 'fetchMessages',
    },
  },
  {
    responseSelector: {
      requestClass: 'MessageService',
      requestMethod: 'markMessageAsRead',
    },
  },
  {
    responseSelector: {
      requestClass: 'MessageService',
      requestMethod: 'replyMessage',
    },
  },
  {
    responseSelector: {
      requestClass: 'TournamentService',
      requestMethod: 'getProvincesOverview',
    },
  },
  {
    responseSelector: {
      requestClass: 'WorldMapService',
      requestMethod: 'getProvinceInformation',
    },
  },
  {
    responseSelector: {
      requestClass: 'WorldMapService',
      requestMethod: 'updateTournamentTime',
    },
  },
  {
    responseSelector: {
      requestClass: 'ArmyService',
      requestMethod: 'addUnit',
    },
  },
];
