import { InterceptedRequestMessageBase } from './playerSpecificMessages';

interface NonSpecificMessageBase extends InterceptedRequestMessageBase {
  specific: false;
}

export interface BuildingsMessage extends NonSpecificMessageBase {
  type: 'BUILDINGS_FEATURE' | 'BUILDINGS_ALL';
}

export interface ItemsMessage extends NonSpecificMessageBase {
  type: 'ITEMS';
}

export interface EffectsMessage extends NonSpecificMessageBase {
  type: 'EFFECTS';
}

export interface TomesMessage extends NonSpecificMessageBase {
  type: 'TOMES';
}

export interface PremiumBuildingHintsMessage extends NonSpecificMessageBase {
  type: 'PREMIUM_BUILDING_HINTS';
}

export interface GoodsNamesMessage extends NonSpecificMessageBase {
  type: 'GOODS_NAMES';
}

export interface EvolvingBuildingsMessage extends NonSpecificMessageBase {
  type: 'EVOLVING_BUILDINGS';
}

export type NonSpecificMessage =
  | BuildingsMessage
  | ItemsMessage
  | EffectsMessage
  | TomesMessage
  | PremiumBuildingHintsMessage
  | GoodsNamesMessage
  | EvolvingBuildingsMessage;
