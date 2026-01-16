import { Building } from '../model/building';
import { Effect } from '../model/effect';
import { ItemDefinition } from '../model/itemDefinition';
import { Tome } from '../model/tome';

export interface MessageFromInjectedScript {
  type: 'MY_EXTENSION_MESSAGE';
  payload: {
    value: string;
  };
}

export interface MessageToInjectedScript {
  type: 'MY_OUTGOING_MESSAGE';
  payload: {
    type: 'MARK_AS_READ';
    playerId: number;
    guildId: number;
  };
}

export interface MaxLevelsProcessedMessage {
  type: 'MAX_LEVELS_PROCESSED';
  payload: {
    maxLevels: Record<string, number>;
  };
}

export interface BuildingsProcessedMessage {
  type: 'BUILDINGS_PROCESSED';
  payload: {
    buildings: Building[];
    matcherAll: boolean;
    matcherFeature: boolean;
  };
}

export interface ItemsProcessedMessage {
  type: 'ITEMS_PROCESSED';
  payload: {
    items: ItemDefinition[];
  };
}

export interface EffectsProcessedMessage {
  type: 'EFFECTS_PROCESSED';
  payload: {
    effects: Effect[];
  };
}

export interface TomesProcessedMessage {
  type: 'TOMES_PROCESSED';
  payload: {
    tomes: Tome[];
  };
}

export interface AwBuildingsProcessedMessage {
  type: 'AWBUILDINGS_PROCESSED';
  payload: {
    awBuildings: { id: string; name: string }[];
  };
}

export type InjectMessage =
  | MaxLevelsProcessedMessage
  | BuildingsProcessedMessage
  | ItemsProcessedMessage
  | EffectsProcessedMessage
  | TomesProcessedMessage
  | AwBuildingsProcessedMessage;
