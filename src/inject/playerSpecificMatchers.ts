import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { PlayerSpecificMessage } from './playerSpecificMessages';

export interface PlayerSpecificMatcherSpecification {
  id: string;
  messageType: PlayerSpecificMessage['type'];
  regex?: RegExp;
  requestSelector?: {
    requestClass: string;
    requestMethod: string;
  };
  responseSelector?: {
    requestClass: string;
    requestMethod: string;
  };
  local?: (responseText: string, sharedInfo: ExtensionSharedInfo) => Promise<unknown>; // local handling, don't propagate to overlay / service worker
}

export const playerSpecificMatchers: PlayerSpecificMatcherSpecification[] = [
  {
    id: 'notifications',
    requestSelector: {
      requestClass: 'NotificationService',
      requestMethod: 'getAllNotifications',
    },
    messageType: 'NOTIFICATIONS',
  },
  {
    id: 'notifications',
    requestSelector: {
      requestClass: 'NotificationService',
      requestMethod: 'getPreviewNotifications',
    },
    messageType: 'NOTIFICATIONS',
  },
  {
    id: 'cityData',
    regex:
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\["LoadFeatureManifestsCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"StartupService","requestMethod":"getData","requestId":\d+}]/,
    messageType: 'CITY_DATA_PROCESSED',
  },
  {
    id: 'inventoryData',
    regex:
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"InventoryService","requestMethod":"getItems","requestId":\d+}]/,
    messageType: 'INVENTORY_DATA_PROCESSED',
  },
  {
    id: 'tradeData',
    regex:
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"TradeService","requestMethod":"getOtherPlayersTrades","requestId":\d+}]/,
    messageType: 'TRADE_DATA_PROCESSED',
  },
  {
    id: 'cauldronData',
    regex:
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"CauldronService","requestMethod":"getIngredients","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"CauldronService","requestMethod":"getPotionEffects","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\["ConfigureStartupDataCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\["FlushUncaughtErrorBuffer"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\["ConfigureWindowCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\["ConfigureTooltipCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\["ConfigureViewBehaviorsCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"TreasureService","requestMethod":"refresh","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\["ConfigureIsoEngineCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+}]/,
    messageType: 'CAULDRON_DATA_PROCESSED',
  },
  {
    id: 'otherPlayerData',
    regex:
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\[\d+\],"requestClass":"OtherPlayerService","requestMethod":"visitPlayer","requestId":\d+}]/,
    messageType: 'OTHER_PLAYER_DATA_PROCESSED',
  },
  {
    id: 'cityResourcesUpdate',
    responseSelector: {
      requestClass: 'CityResourcesService',
      requestMethod: 'getResources',
    },
    messageType: 'CITY_RESOURCES_UPDATE',
  },
  {
    id: 'inventoryUpdate',
    responseSelector: {
      requestClass: 'InventoryService',
      requestMethod: 'updateItems',
    },
    messageType: 'INVENTORY_DATA_PROCESSED',
  },
  {
    id: 'spireEncounterStart',
    regex:
      //    2cab212bab[{"__class__":"ServerRequestVO","requestData":[14]  ,"requestClass":"SpireService","requestMethod":"getEncounter","requestId":44}]
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\[\d+],"requestClass":"SpireService","requestMethod":"getEncounter","requestId":\d+}]/,
    messageType: 'SPIRE_ENCOUNTER_START',
  },
  {
    id: 'spireDiplomacySubmit',
    requestSelector: {
      requestClass: 'SpireDiplomacyService',
      requestMethod: 'submit',
    },
    messageType: 'SPIRE_DIPLOMACY_SUBMIT',
  },
];
