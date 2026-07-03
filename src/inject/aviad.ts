type DecorationEvent = unknown;

declare const tagOtherPlayerEvent: unique symbol;
type AviadOtherPlayerEvent = { readonly [tagOtherPlayerEvent]: 'AviadOtherPlayerEvent' }

declare const tagLoadType: unique symbol;
type AviadLoadType = { readonly [tagLoadType]: 'AviadLoadType' }

declare const tagAncientWondersDataEvent: unique symbol;
type AviadAncientWondersDataEvent = { readonly [tagAncientWondersDataEvent]: 'AviadAncientWondersDataEvent' }

type AviadCommand = {
  execute(): unknown;
};

export interface AviadVisitOtherPlayerCommand extends AviadCommand {
  event: AviadOtherPlayerEvent;
};

export interface AviadDisplayAncientWonderCommand extends AviadCommand {
  event: AviadAncientWondersDataEvent;
}

type AviadPagination = {
  _onSelectNextPage: () => void;
  parent: object;
};

declare global {
  interface Window {
    gameVars: {
      market: string;
      version: string;
      build_number: string;
    };
    aviadVisit: (playerId: number) => void;
    aviadOpenAw: (playerId: number, buildingId: string, baseName: string) => void;
    WebSocketUnchanged: typeof WebSocket;
    aviad_am: {
      get_isLoading(): boolean;
      injector: {
        getOrCreateNewInstance: <T>(ctor: new () => T, ...args: unknown[]) => T;
      };
    },
    aviad_wm: {
      _onInvest: ({ resource }: { resource: { id: string; _value: bigint } }) => void;
    };
    aviad_se: {
      diplomacyCosts: {
        get_resources: () => { id: string; _value: bigint }[];
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
      'de.innogames.onyx.worldmap.service.WorldMapService': new () => {
        getDiscoveredPlayerProvinces: (callback: (response: unknown) => void) => void;
        startup: (callback: (response: unknown) => void) => void;
        request: (action: string) => {
          withData: (...data: unknown[]) => {
            withCallback: (callback: (response: unknown) => void) => {
              immediate: () => {
                call: () => void;
              };
            };
          };
        };
      };
      'de.innogames.onyx.city.service.OtherPlayerService': new () => {
        getNeighbourlyHelpBuildings: (playerId: number, callback: (response: unknown) => void) => void;
      };
      'de.innogames.onyx.city.service.NeighborlyHelpService': new () => {
        helpPlayer(playerId: number, arg1: (response: unknown) => void): unknown;
        performAction: (
          action: 'unlimited_help' | 'limited_help' | 'time_limited_help',
          entityId: number,
          playerId: number,
          callback: (response: unknown) => void,
        ) => void;
      };
      'de.innogames.onyx.worldmap.service.WorldMapBattleService': new () => {
        request: (action: string) => {
          withData: (...data: unknown[]) => {
            withCallback: (callback: (response: unknown) => void) => {
              immediate: () => {
                call: () => void;
              };
            };
          };
        };
      };
      'de.innogames.onyx.tournaments.services.TournamentService': new () => {
        getTournamentProgress: (callback: (response: unknown) => void) => void;
      };
      'de.innogames.onyx.tournaments.services.WorldMapTournamentService': new () => {
        getProvincesOverview: (callback: (response: unknown) => void) => void;
      };
      'de.innogames.onyx.worldmap.service.UnlockEncounterService': new () => {
        unlockEncounter: (q: number, r: number, encounterIndex: number, callback: (response: unknown) => void) => void;
      };
      'de.innogames.onyx.city.engine.events.IsoDecorationEvent': new (type: string, id: string) => DecorationEvent;
      'de.innogames.onyx.city.commands.VisitOtherPlayerCommand': new () => AviadVisitOtherPlayerCommand;
      'de.innogames.onyx.city.ancientwonders.commands.DisplayAncientWonderCommand': new () => AviadDisplayAncientWonderCommand;
      'de.innogames.strategycity.main.controller.event.OtherPlayerEvent': new (eventName: 'OtherPlayerEvent::visitPlayer', playerId: number) => AviadOtherPlayerEvent;
      'de.innogames.onyx.shared.events.AncientWondersDataEvent': new (eventName: 'displayAncientWonder', playerId: number, loadType: AviadLoadType, windowId: string) => AviadAncientWondersDataEvent;
    };
    aviad_tv: {
      getTreasures: (type: string) => { id: string }[];
    };
    aviad_silm: {
      isoEngine: {
        dispatchEvent: (event: DecorationEvent) => void;
      };
    };
  }
}
