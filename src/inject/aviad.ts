import { GameVars } from './gameVars';

type DecorationEvent = unknown;

declare const tagOtherPlayerEvent: unique symbol;
type AviadOtherPlayerEvent = { readonly [tagOtherPlayerEvent]: 'AviadOtherPlayerEvent' };

declare const tagLoadType: unique symbol;
type AviadLoadType = { readonly [tagLoadType]: 'AviadLoadType' };

declare const tagAncientWondersDataEvent: unique symbol;
type AviadAncientWondersDataEvent = { readonly [tagAncientWondersDataEvent]: 'AviadAncientWondersDataEvent' };

type AviadCommand = {
  execute(): unknown;
};

export interface AviadVisitOtherPlayerCommand extends AviadCommand {
  event: AviadOtherPlayerEvent;
}

export interface AviadDisplayAncientWonderCommand extends AviadCommand {
  event: AviadAncientWondersDataEvent;
}

type AviadPagination = {
  _onSelectNextPage: () => void;
  parent: object;
};

declare global {
  interface Window {
    gameVars: GameVars;
    compVer: (v2: string) => number;
    aviadVisit: (playerId: number) => void;
    aviadOpenAw: (playerId: number, buildingId: string, baseName: string) => void;
    WebSocketUnchanged: typeof WebSocket;
    aviad_am: {
      get_isLoading(): boolean;
      injector: {
        getOrCreateNewInstance: <T>(ctor: new () => T, ...args: unknown[]) => T;
      };
    };
    aviad_pagination: AviadPagination;
    aviad_pagination_a: AviadPagination[];
    aviad_enum: {
      'de.innogames.onyx.shared.events.LoadType': {
        LOAD_ONLY: (baseName: string, type: string) => AviadLoadType;
      };
    };
    aviad: {
      'de.innogames.onyx.city.ancientwonders.services.AncientWonderService': new () => {
        getOtherPlayerAncientWonders: (playerId: number, callback: (response: unknown) => void) => void;
      };
      'de.innogames.onyx.shared.spells.services.SpellService': new () => {
        castSpellOnBuilding: (spellName: string, buildingId: number, callback: (response: unknown) => void) => void;
      };
      'de.innogames.onyx.city.engine.events.IsoDecorationEvent': new (type: string, id: string) => DecorationEvent;
      'de.innogames.onyx.city.commands.VisitOtherPlayerCommand': new () => AviadVisitOtherPlayerCommand;
      'de.innogames.onyx.city.ancientwonders.commands.DisplayAncientWonderCommand': new () => AviadDisplayAncientWonderCommand;
      'de.innogames.strategycity.main.controller.event.OtherPlayerEvent': new (
        eventName: 'OtherPlayerEvent::visitPlayer',
        playerId: number,
      ) => AviadOtherPlayerEvent;
      'de.innogames.onyx.shared.events.AncientWondersDataEvent': new (
        eventName: 'displayAncientWonder',
        playerId: number,
        loadType: AviadLoadType,
        windowId: string,
      ) => AviadAncientWondersDataEvent;
    };
    aviad_silm: {
      isoEngine: {
        dispatchEvent: (event: DecorationEvent) => void;
      };
    };
  }
}
