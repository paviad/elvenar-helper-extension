import { ExtensionSharedInfo } from '../model/extensionSharedInfo';

export interface InterceptedRequestMessageBase {
  specific: boolean;
  payload: {
    decodedResponse: string;
    sharedInfo: ExtensionSharedInfo;
  };
}

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

export interface BattleUnitTypesMessage extends NonSpecificMessageBase {
  type: 'BATTLE_UNIT_TYPES';
}

export interface ResearchTechnologiesMessage extends NonSpecificMessageBase {
  type: 'RESEARCH_TECHNOLOGIES';
}

export type NonSpecificMessage =
  | BuildingsMessage
  | ItemsMessage
  | EffectsMessage
  | TomesMessage
  | PremiumBuildingHintsMessage
  | GoodsNamesMessage
  | EvolvingBuildingsMessage
  | BattleUnitTypesMessage
  | ResearchTechnologiesMessage;
