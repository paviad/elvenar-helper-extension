import { GameVars } from './gameVars';

type DecorationEvent = unknown;

declare const tagOtherPlayerEvent: unique symbol;
type AviadOtherPlayerEvent = { readonly [tagOtherPlayerEvent]: 'AviadOtherPlayerEvent' };

declare const tagLoadType: unique symbol;
type AviadLoadType = { readonly [tagLoadType]: 'AviadLoadType' };

declare const tagAncientWondersDataEvent: unique symbol;
type AviadAncientWondersDataEvent = { readonly [tagAncientWondersDataEvent]: 'AviadAncientWondersDataEvent' };

declare const tagProductionEvent: unique symbol;
type AviadProductionEvent = { readonly [tagProductionEvent]: 'AviadProductionEvent' };

declare const tagStartProductionEvent: unique symbol;
type AviadStartProductionEvent = { readonly [tagStartProductionEvent]: 'AviadStartProductionEvent' };

// de.innogames.collections.resources.ResourceCollection (values are BigInt; see rev-eng/12 §6)
declare const tagResourceCollection: unique symbol;
export type AviadResourceCollection = {
  readonly [tagResourceCollection]: 'AviadResourceCollection';
  add(collection: AviadResourceCollection): void;
  clone(): AviadResourceCollection;
};

// Haxe interfaces are injector keys, not constructors: `injector.getInstance(window.aviad['<fq interface>'])`.
declare const tagInjectorKey: unique symbol;
export type AviadInjectorKey<T> = { readonly [tagInjectorKey]: T };

// de.innogames.strategycity.main.model.vo.products.impl.EntityProduct - one production option
export type AviadEntityProduct = {
  get_optionId(): number; // the VO's production_option (1-based); what goes on the wire
  get_isLocked(): boolean;
  get_name(): string;
  get_productionTime(): number;
  get_requiredInput(): AviadResourceCollection;
};

// de.innogames.onyx.city.entities.data.CityMapEntity
export type AviadCityMapEntity = {
  get_id(): number;
  canCollect(): boolean;
  get_state(): { get_stateId(): string };
  get_entityConfig(): {
    // de.innogames.strategycity.main.model.vo.configs.production.impl.EntityProductsOwner
    get_production(): {
      get_products(): AviadEntityProduct[]; // all options, locked ones included
      getProductById(optionId: number): AviadEntityProduct | undefined;
    };
  };
};

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
        getInstance: <T>(key: AviadInjectorKey<T>) => T;
      };
    };
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
      'de.innogames.strategycity.main.controller.event.ProductionEvent': new (
        eventName: 'ProductionEvent::pickupProduction',
        entity: AviadCityMapEntity,
      ) => AviadProductionEvent;
      'de.innogames.strategycity.main.controller.event.StartProductionEvent': new (
        eventName: 'StartProductionEvent::startProduction',
        buildings: AviadCityMapEntity[],
        productId: number,
        amount?: number,
      ) => AviadStartProductionEvent;
      'de.innogames.collections.resources.ResourceCollection': new () => AviadResourceCollection;
      // injector keys (interfaces, or classes we only ever resolve through the injector)
      'de.innogames.strategycity.main.model.ICityEntitiesModel': AviadInjectorKey<{
        getEntityById: (id: number) => AviadCityMapEntity | null;
      }>;
      'de.innogames.onyx.resources.models.ResourcesModel': AviadInjectorKey<{
        hasEnoughResourcesFor: (collection: AviadResourceCollection) => boolean;
      }>;
      'openfl.events.IEventDispatcher': AviadInjectorKey<{
        dispatchEvent: (event: AviadProductionEvent | AviadStartProductionEvent) => boolean;
      }>;
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
