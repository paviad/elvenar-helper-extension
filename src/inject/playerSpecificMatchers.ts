import { PlayerSpecificMessage } from './playerSpecificMessages';

export const playerSpecificMatchers = [
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
] satisfies {
  id: string;
  messageType: PlayerSpecificMessage['type'];
  regex: RegExp;
}[];
