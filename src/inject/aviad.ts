import { GameVars } from './gameVars';

declare const tagDecorationEvent: unique symbol;
type DecorationEvent = { readonly [tagDecorationEvent]: 'DecorationEvent' };

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
  get_resources(): { id: string; _value: bigint }[];
};

// de.innogames.onyx.constants.ApplicationModuleName - a Haxe enum value. The seven plain
// constructors carry a `_hx_name`; `BATTLE` takes a parameter, so its values carry only the index.
export type AviadModuleName = { _hx_name?: string; _hx_index?: number };

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

// de.innogames.strategycity.main.model.vo.configs.EntityConfig (rev-eng/12 §2)
export type AviadEntityConfig = {
  get_id(): string; // e.g. `P_Humans_Workshop_1`
  get_name(): string;
  get_level(): number;
  get_type(): string; // `production`, `goods`, `residential`, ...
  get_race(): string; // `humans` or `elves`
  get_width(): number;
  get_length(): number;
  get_requirements(): {
    get_resources(): AviadResourceCollection;
    get_numWorkersRequired(): number;
  };
  // de.innogames.strategycity.main.model.vo.configs.production.impl.EntityProductsOwner
  get_production(): {
    get_products(): AviadEntityProduct[]; // all options, locked ones included
    getProductById(optionId: number): AviadEntityProduct | undefined;
  };
};

// de.innogames.onyx.city.entities.data.CityMapEntity
export type AviadCityMapEntity = {
  get_id(): number;
  get_x(): number;
  get_y(): number;
  canCollect(): boolean;
  isPremium(): boolean;
  get_state(): { get_stateId(): string };
  get_entityConfig(): AviadEntityConfig;
  /** What selling it refunds. */
  get_saleResources(): AviadResourceCollection;
};

declare const tagConstructBuildingEvent: unique symbol;
type AviadConstructBuildingEvent = { readonly [tagConstructBuildingEvent]: 'AviadConstructBuildingEvent' };

declare const tagCitySectorModeEvent: unique symbol;
type AviadCitySectorModeEvent = { readonly [tagCitySectorModeEvent]: 'AviadCitySectorModeEvent' };

declare const tagIsoTileEvent: unique symbol;
type AviadIsoTileEvent = { readonly [tagIsoTileEvent]: 'AviadIsoTileEvent' };

// What reaches a listener on the context dispatcher: whichever of these the event carries.
export type AviadDispatchedEvent = {
  /** `ErrorEvent` - the text the game puts in its own error window. */
  text?: string;
  /** `CityEntityEvent` and `CityMapModelEvent`. */
  get_entity?: () => AviadCityMapEntity | null;
  /** `ServiceExceptionEvent`. */
  exception?: { code?: number; message?: string };
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
      /**
       * Which module is on screen, as `de.innogames.onyx.constants.ApplicationModuleName`.
       * `ChangeModuleCommand` is its only writer, so it is the game's own answer rather than
       * one of several. `getValue()` rather than `tink_state_Observable.get_value()`: that one
       * subscribes whatever computation happens to be in flight to it.
       */
      currentModule?: { getValue(): AviadModuleName | undefined };
      /**
       * Set once the forty-minute session watchdog has put the "Session Timed Out" window up.
       * One-way - `ApplicationModel.onTick` unschedules itself on the way past.
       */
      _reloadWindowShown?: boolean;
      /** `ModeTypes/defaultMode` unless the player is mid-build, move, sell... (rev-eng/09 §2.4). */
      get_interactionMode(): string;
      set_interactionMode(mode: string): void;
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
      // Patched rather than constructed: `onTick` is the 40-minute session watchdog and nothing
      // else, and `GameClock` is how it takes itself back off the clock. See `preventSessionTimeout`.
      'de.innogames.onyx.city.model.ApplicationModel': { prototype: { onTick: (timeStep: number) => void } };
      'de.innogames.shared.util.clock.GameClock': { unschedule: (tickObject: unknown) => void };
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
      'de.innogames.strategycity.main.controller.event.ConstructBuildingEvent': new (
        eventName: 'ConstructBuildingEvent::buildingSelected',
        entityConfig: AviadEntityConfig,
      ) => AviadConstructBuildingEvent;
      // What the sell window's yes button dispatches (rev-eng/09 §3.5); the command map maps it
      // to `RemoveCityEntityCommand`.
      'de.innogames.onyx.city.modes.events.CitySectorModeEvent': new (
        type: 'removeEntity',
        entity: AviadCityMapEntity,
      ) => AviadCitySectorModeEvent;
      // Pooled: `getEvent` rather than `new`.
      'de.innogames.onyx.city.engine.events.IsoTileEvent': {
        getEvent: (
          eventName: 'IsoTileEvent::tileOver' | 'IsoTileEvent::tileClicked',
          tileX: number,
          tileY: number,
          isIntoTheCity: boolean,
        ) => AviadIsoTileEvent;
      };
      // injector keys (interfaces, or classes we only ever resolve through the injector)
      'de.innogames.strategycity.main.model.ICityEntitiesModel': AviadInjectorKey<{
        getEntityById: (id: number) => AviadCityMapEntity | null;
        /** The one building of a type a city has exactly one of, by that type (e.g. the main hall). */
        getUniqueBuilding: (buildingType: string) => AviadCityMapEntity | undefined;
        /** Builders not on a job - a `tink.state.State`. */
        freeWorkers: { getValue(): number };
      }>;
      'de.innogames.onyx.resources.models.ResourcesModel': AviadInjectorKey<{
        hasEnoughResourcesFor: (collection: AviadResourceCollection) => boolean;
        /** What `required` overdraws, by how much - empty when it is affordable. */
        getMissingResourcesFor: (required: AviadResourceCollection) => AviadResourceCollection;
        /** Whether all of `amount` fits under the storage caps. */
        hasEnoughStorageFor: (amount: AviadResourceCollection) => boolean;
      }>;
      // Whose `isEntityEffectExpired` is how the game knows a timed building has run out:
      // false for anything but an `expiring` one, true once its effect is gone or down to nothing.
      'de.innogames.onyx.shared.effects.model.ISelectiveEffectsModel': AviadInjectorKey<{
        isEntityEffectExpired: (entity: AviadCityMapEntity) => boolean;
      }>;
      'openfl.events.IEventDispatcher': AviadInjectorKey<{
        dispatchEvent: (
          event:
            AviadProductionEvent | AviadStartProductionEvent | AviadConstructBuildingEvent | AviadCitySectorModeEvent,
        ) => boolean;
        addEventListener: (type: string, listener: (event: AviadDispatchedEvent) => void) => void;
        removeEventListener: (type: string, listener: (event: AviadDispatchedEvent) => void) => void;
      }>;
    };
    aviad_tv: {
      getTreasures: (type: string) => { id: string }[];
    };
    aviad_silm: {
      // de.innogames.onyx.city.engine.snake.IsoEngine (rev-eng/09 §2.1)
      isoEngine: {
        dispatchEvent: (event: DecorationEvent | AviadIsoTileEvent) => void;
        isValidPlacementAtPosition: (tileX: number, tileY: number, width: number, length: number) => boolean;
        placementMap: { get_mapWidth(): number; get_mapLength(): number };
        /** The sprite whose footprint covers the tile; its `id` is the map entity's. */
        getEntityByPosition: (tileX: number, tileY: number) => { id: number } | null;
      };
    };
  }
}
