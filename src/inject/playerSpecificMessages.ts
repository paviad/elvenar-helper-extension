import { ExtensionSharedInfo } from '../model/extensionSharedInfo';

export interface InterceptedRequestMessageBase {
  specific: boolean;
  payload: {
    decodedResponse: string;
    sharedInfo: ExtensionSharedInfo;
  };
}

interface PlayerSpecificMessageBase extends InterceptedRequestMessageBase {
  specific: true;
}

export interface CityDataProcessedMessage extends PlayerSpecificMessageBase {
  type: 'CITY_DATA_PROCESSED';
}

export interface InventoryDataProcessedMessage extends PlayerSpecificMessageBase {
  type: 'INVENTORY_DATA_PROCESSED';
}
export interface TradeDataProcessedMessage extends PlayerSpecificMessageBase {
  type: 'TRADE_DATA_PROCESSED';
}

export interface CauldronDataProcessedMessage extends PlayerSpecificMessageBase {
  type: 'CAULDRON_DATA_PROCESSED';
}

export interface OtherPlayerDataProcessedMessage extends PlayerSpecificMessageBase {
  type: 'OTHER_PLAYER_DATA_PROCESSED';
}

export interface NotificationsMessage extends PlayerSpecificMessageBase {
  type: 'NOTIFICATIONS';
}

export type PlayerSpecificMessage =
  | CityDataProcessedMessage
  | InventoryDataProcessedMessage
  | TradeDataProcessedMessage
  | CauldronDataProcessedMessage
  | OtherPlayerDataProcessedMessage
  | NotificationsMessage;
