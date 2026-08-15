# City engine, city map, buildings and production

## Scope

The city view of the Elvenar client: the isometric engine (`de.innogames.onyx.city.engine.*` —
`IsoEngine`, snake layers, grid, decorations, camera, engine events), the interaction modes
(`de.innogames.onyx.city.modes.*`), the entity proxy / state / behaviour machinery
(`de.innogames.onyx.city.entities.*`), the city-map models (`de.innogames.onyx.city.model.*`,
the `de.innogames.strategycity.main.model.*` VOs that back them), the two city services
(`de.innogames.onyx.city.services.CityMapService`, `DiplomacyCancelService`) plus
`de.innogames.strategycity.main.service.CityProductionService`, the city commands that build,
collect, move, sell and upgrade (`de.innogames.onyx.city.commands.*`,
`de.innogames.onyx.city.modes.commands.*`, `de.innogames.strategycity.main.controller.*`),
treasures (`de.innogames.onyx.city.treasure.*`, `de.innogames.onyx.networking.services.TreasureService`),
building render configs (`de.innogames.onyx.buildings.*`) and — at list level only — the city UI
windows (`de.innogames.onyx.city.ui.*`).

Not covered here (other files): main events / ancient wonders / trade / inventory / academy
(`11-events-economy-misc.md`, `10-social-neighbours-aw-spells.md`), `ApplicationModel` and the
DI/command plumbing (`03-bootstrap-di-commands-events.md`), the request builder and wire format
(`04-networking-layer.md`), the full VO/startup catalogue (`12-models-and-startup-data.md`),
the spire entrance decoration's target (`08-spire.md`).

Sources: `tmp/elvenar-release-full-reveng.js` (Feb 12 2026 snapshot), `rev-eng/index/classes.tsv`,
`src/inject/injectMutate.ts`, `src/inject/aviad.ts`, `src/inject/local/localCollectEventTreasure.ts`.

Where the extension already touches something it is marked **[ext]** with the file.

---

## 1. Package overview (what is in scope, where it starts)

`de.innogames.onyx.city.*` has 3366 classes; the parts this file covers:

| Package | # classes | Role | Anchor classes |
|---|---|---|---|
| `city.engine.*` | 130 | Iso engine, layers, grid, camera, decorations, fx | `snake.IsoEngine` (L15944), `camera.CityCameraController` (L398381), `events.IsoDecorationEvent` (L48347) |
| `city.modes.*` | 57 | Interaction modes (default/build/move/sell/upgrade/help/spell...) and their commands | `controller.OwnCityInteractionModeController` (L455141), `BuildBuildingSectorMode` (L453281) |
| `city.entities.*` | 199 | Entity proxy, per-entity state machine, click/over/enter behaviours, pickers | `proxy.CityEntityProxy` (L408109), `data.CityMapEntity` (L406405), `pickers.ProductionResourcePicker` (L407749) |
| `city.model.*` | 13 | City map models | `CityEntitiesModel` (L451695), `CityEntityConfigsModel` (L452081), `OwnCityEntityProxyModel` (L452765) |
| `city.services.*` | 4 | `CityMapService` (L458840), `DiplomacyCancelService` (L50004), `BattleRetreatService` (L458820) | |
| `city.commands.*` | 91 | City-level commands (enter/leave city, production, help, unlock, console & communicator) | `PickupProductionCommand` (L387168), `StartProductionsCommand` (L387614) |
| `city.controller.*` | 123 | Bootstrap sequence + a few commands | `bootstrap.ConfigureControllerCommand` (L390347) = the master event→command map |
| `city.treasure.*` | 28 | Chests lying in the city | `model.TreasureViewModel` (L80872), `commands.OpenTreasureCommand` (L469120) |
| `city.queuedproduction.*` | 8 | Barracks/academy queue commands | `commands.CancelQueueProductionCommand` (L458330) |
| `city.upgrade.*` | 25 | Upgrade requirements/tabs | `providers.UpgradeRequirementsProvider` (L79223) |
| `city.streets.*` | 11 | Street placement map / path calc | `StreetPlacementMap` (L18161) |
| `city.decorations.*`, `city.inhabitants.*` | 8 / 12 | Ground decorations & walking inhabitants (cosmetic) | |
| `city.ui.*` | 813 | HUD, windows, tooltips | see §6 |
| `strategycity.main.model.vo.*` | ~120 | `EntityConfig`, entity states, products, expansions | `EntityConfig` (L663907), `entityStates.impl.*` (L664745..) |
| `strategycity.main.service.CityProductionService` | | production RPCs | L13124 |
| `strategycity.main.controller.*` | 47 | `StartBuildEntityCommand` (L659849), events (`ProductionEvent` L17550, `ConstructBuildingEvent` L79499, ...) | |
| `onyx.buildings.*` | 5 | `BuildingRenderConfig` (L365817) — sprite sheets / tile size per asset | |

---

## 2. The iso engine

### 2.1 `de.innogames.onyx.city.engine.snake.IsoEngine` (L15944)

An `openfl.events.EventDispatcher` wrapping a third-party `snake_Snake` engine (Starling based).
Created once by `ConfigureSnakeIsoEngineCommand._createIsoEngine` (L392092) as a **sealed singleton
provider** in the city injector: `injector.map(IsoEngine).toProvider(FunctionProvider(..., {singleton:true})).seal()`.
Constructor: `IsoEngine(parentContainer, mapWidth, mapLength, renderEngine, entityFactory)`.

How to obtain it from outside:

- `window.aviad_silm.isoEngine` — the injected field of `SnakeInteractiveLayerMediator` **[ext]** (`injectMutate.ts`
  patches the mediator ctor as `aviad_silm`; declared in `src/inject/aviad.ts`).
- `window.aviad_am.injector.getInstance(window.aviad['de.innogames.onyx.city.engine.snake.IsoEngine'])` — same object.

Constants (statics at L780319-L780323): `CELL_ISO_SIZE = 37`, `CELL_SCREEN_SIZE = 74`,
`GRID_OFFSET_X = -90`, `GRID_OFFSET_Y = 300`, `WORLD_RECT = Rectangle(0,0,8704,4608)`.
Tile coordinates are `(tileX, tileY)` = column/row of the placement grid; screen/global coordinates
are pixels inside `WORLD_RECT`.

Key API (all on the prototype, L15947-L16625):

| Method | Line | Notes |
|---|---|---|
| `getEntities()` | 15966 | array of `IsoEntity` (visual sprites), **not** model entities |
| `getEntityById(id)` | 16194 | `IsoEntity.id` == `CityMapEntityVO.id` (set in `AbstractInteractionModeController.createEntity`, L455000) |
| `getEntityByPosition(tileX,tileY)` | 16204 | via `proxy.collideWith` (outside-map entities) then `placementMap.getTileId` |
| `createEntity(assetName, stateId)` / `addEntity` / `placeEntity(entity,x,y)` / `moveEntity(entity,fx,fy,tx,ty)` / `removeEntity` | 16226-16304 | visual only, no server call |
| `isValidPlacementAtPosition(x,y,w,l)` | 16304 | uses `placementMap` (`de.innogames.common.map2D.PlacementMap`) |
| `unlockArea(x,y,w,l)` | 16217 | frees `TileState.LOCKED (-1)` tiles |
| `addDecoration(type, deco)` / `removeDecoration(type,id)` / `getDecoration(type,id)` / `hasDecoration(type,id)` / `resetDecorations(type)` / `getDecorationLayer(type)` | 16388-16533 | `type` is a `DecorationType` (§2.3) |
| `moveCameraTo(x,y)` / `moveCameraBy(dx,dy)` / `getCameraPosition()` | 16160-16464 | camera pan in global px (centre of viewport) |
| `get_cameraZoom()` / `set_cameraZoom(v)` | 16074 | |
| `isoToGlobal(tx,ty)`, `isoToScreen`, `screenToIso(sx,sy)`, `screenToGlobal`, `globalToScreen`, `tileToGlobal` | 16429-16483 | coordinate conversions |
| `set_gridVisible`, `set_gridSnappingSize`, `set_gridValidPlacement`, `setPlacementRectangleSize`, `addPlacementRectangle`, `setHighlightPath` | 15992-16191 | build-mode grid overlay |
| `get_draggingEnabled()`/`set_draggingEnabled`, `get_renderingPaused()`/`set_renderingPaused` | 15972-15998 | |
| `get_state()` / `set_state(s)` | 16011 | snapshot `{entities, unlockedAreas, entitiesMap, cameraPosition, cameraZoom, updateQueue}` — used to park the own city while visiting (`IsoEngineModel.storeLastState`, L36415) |
| `enableLayer(name, visible)` | 16533 | `"all"` or a layer name |
| `activate` | ctor | a `tink_state_State<Bool>` observable (`tink_state_Observable.get_value(engine.activate)`) |
| `get_isoFx()` | 16093 | `IsoFxController` (L399454) — sparkles, flying icons, portraits |
| `dispatchEvent(ev)` | (openfl) | **this is where `IsoDecorationEvent` / `IsoTileEvent` travel** |

Layers registered by `_createLayers` (L16565), in z order (name → class):

| Layer name (`_layers.h[name]`) | Class | Content |
|---|---|---|
| `"BACKGROUND"` | `SnakeIsoBackground` (L404321) | static background |
| `"ENHANCEMENT"` | `SnakeEnhancementLayer` (L404145) | AW/culture "enhancement" props |
| `"grid"` | `grid.CityGrid` (L403104) | the placement grid; **source of `IsoTileEvent`s** |
| `"GROUND_DECORATION"` | `SnakeDecorationsLayer` (L404024) | flowers/rocks (`CityGroundDecorator`, L398018) |
| `"EXPANSIONS"` | `SnakeExpansionsLayer` (L404215) | purchasable expansion overlays |
| `"streets"` | `SnakeIsoStreetsLayer` (L404402) | |
| `"FlatModeColorsLayer"`, `"FlatModeBorderLayer"`, `"FlatModeIconsLayer"`, `"flatModeVisibleEntities"` | L403787/L403651/L403924/L404002 | the 2-D "flat" city planner mode |
| `"entities"` | `IsoEntitiesLayer` (L404011) | building sprites |
| `"effects"` | `SnakeIsoFxLayer` (L404379) | per-entity fx sprites |
| `"worldFx"` | `SnakeWorldFxLayer` (L404414) | |
| `"INTERACTIVE"` | `SnakeInteractiveLayer` (L54805) | **treasures + spire entrance** (clickable decorations) |

### 2.2 Engine events — every `IsoXxxEvent` type string

All extend `openfl.events.Event`; they are dispatched **on the IsoEngine instance** (not on the
Robotlegs context dispatcher) except `IsoEngineEvent::ready`.

| Class (line) | Type string | Constructor / payload | Dispatched by | Listened by |
|---|---|---|---|---|
| `city.engine.events.IsoDecorationEvent` (L48347) | `IsoDecorationEvent::click` (`.CLICK`, L780794) | `new IsoDecorationEvent(type, decorationId:String)`; `get_decorationId()` | `SnakeInteractiveLayerMediator._onDetectDecorationClick` (L404291) on a real click; `communicator.OpenSpireCommand` (L388427) with id `"spire"`; **[ext]** `localCollectEventTreasure.ts` | `AbstractInteractionModeController._onDecorationClick` (L454981/L455033) → re-dispatches on the context → command map: `OpenTreasureCommand` [guard `CanGetReward`], `OpenVideoAdTreasureCommand` [guard `CanWatchVideoAd`] (L469403), `spire.commands.EnterSpireCommand` [guard `CanEnterSpire`] (L617037) |
| `city.engine.events.IsoTileEvent` (L399399) | `IsoTileEvent::tileClicked`, `::tileDown`, `::tileUp`, `::tileOver`, `::tileOut`, `::mouseOut` (L782353-L782358) | pooled: `IsoTileEvent.getEvent(type, tileX, tileY, isIntoTheCity)`; fields `tileX`, `tileY`, `isIntoTheCity` | `CityGrid._onClick/_onMouseDown/_onMouseUp/_onMouseMove/_onMouseOutside` (L403289-L403340; `_onClick` L403296), tileX = `gridCell.get_rowIndex()`, tileY = `columnIndex` | `AbstractInteractionModeController.postConstruct` (L454974) → `_onIsoEngineAction` (L455046) → current mode's `handleTileClicked/Down/Up/Over/Out(entityProxy, tileX, tileY)`; also `tutorial.triggers.CityGridClickTrigger` (L470278) |
| `city.engine.events.IsoEngineEvent` (L399384) | `IsoEngineEvent::draggingStart`, `::draggingStop`, `::ready` (L782350-L782352) | `new IsoEngineEvent(type)` | `ready`: `ConfigureIsoEngineCommand._onEngineConfigured` (L390515) on the **context** dispatcher; dragging: engine | `ready` → `CityAnimationSettingsUpdatedCommand`, `CityInitViewCommand` (L390531); `draggingStart` → `CityCameraController._onDraggingStart`, modes' `_onDraggingStart` |
| `strategycity.main.controller.event.IsoEngineStateEvent` (L80407) | `IsoEngineStateEvent::activateEngine` / `::deactivateEngine` | | `EnterOwnCityCommand` (L387028), `EnterOtherCityCommand` (L386985) | `commands.engine.ActivateIsoEngineCommand` (L389808) / `DeactivateIsoEngineCommand` (L389824) |

Related city-level (context) events with their strings: `CityEvent::CREATE_OTHER_CITY / ENTER_OTHER_CITY /
LEAVE_OTHER_CITY / ENTER_OWN_CITY / LEAVE_OWN_CITY / SHOW_CITY` (L782458-L782463),
`CityCameraEvent::moveTo / moveFinished` (L782456), `CityTileCameraEvent::moveToTile / moveFinished`
(L782466), `CityInhabitantEvent::startInhabitants / stopInhabitants`, `CityEntityEvent::constructionFinished`
(L780810), `EntityProductionEvent` `"startProduction"` / `"lockedProductionClicked"` (L782468),
`HighlightEvent::confirmGet`, `ExceededResourceLimitEvent::resourceLimitExceeded`.

### 2.3 Decorations, the interactive layer and what a "click on a decoration" is

`DecorationType` (L399288, an `EnumWrapper`) has `GROUND_DECORATION`, `ENHANCEMENT`, `INTERACTIVE`,
`EXPANSIONS`, `BACKGROUND`, `SPIRE` (L782344-L782349; `SPIRE` is defined but never used as a layer key —
the spire entrance is an INTERACTIVE decoration with id `"spire"`, see `HasSpireEntranceCommand` L388298).

`IIsoDecoration` (L399148): `get_id/get_type/get_x/get_y/get_width/get_height/get_scale/get_assetData`.
`IInteractiveDecoration` (L399219) adds `get_loaded`, `get_hitArea` (Rectangle in global px), `get_view`,
`addOnLoadedCallback`. Concrete interactive decorations: `city.treasure.view.TreasureDecoration` (L469571,
`get_treasureType()`), the spire entrance (spire package).

`SnakeInteractiveLayer` (L54805) holds them (`addDecoration` refuses non-interactive ones).
`SnakeInteractiveLayerMediator` (L404275) — injected `isoEngine`, `view` (the layer), `windowsManager`,
`applicationModel`, `layers`, `stage` — is the **only place a mouse click becomes an
`IsoDecorationEvent`**:

```js
// L404291 _onDetectDecorationClick (listener on layers.get_gameContainer() "click")
if (|mouseDown - mouseUp| > 8px) return;                       // it was a drag
if (currentModule not OWN_CITY/OTHER_CITY || !isoEngine.get_draggingEnabled()
    || isoEngine.get_renderingPaused() || windowsManager.hasOpenWindows()) return;
var point = isoEngine.screenToGlobal(stage.mouseX, stage.mouseY);
for (decoration of view.get_decorations())
  if (decoration.get_hitArea().containsPoint(point))
    isoEngine.dispatchEvent(new IsoDecorationEvent("IsoDecorationEvent::click", decoration.get_id()));
```

Dispatching the event yourself (**[ext]** `localCollectEventTreasure.ts`) skips those UI guards; the
command guards (`CanOpenTreasure` L469276: decoration must exist in the INTERACTIVE layer and be a
`TreasureDecoration`) still apply.

### 2.4 Interaction modes and how a tile click reaches a building

`AbstractInteractionModeController` (L454960) listens on the engine for the six `IsoTileEvent`s and
`IsoDecorationEvent::click`; `_onIsoEngineAction` (L455046) does the **entity picking**:

```js
var isoEntity   = this.isoEngine.getEntityByPosition(tileX, tileY);
var entityProxy = this.get_entityProxyModel().getProxyForIsoEntity(isoEntity);   // may be null (empty tile)
switch (event.type) { case "IsoTileEvent::tileClicked": this._currentMode.handleTileClicked(entityProxy,tileX,tileY); ... }
```

Only when `get_isActive()` — `OwnCityInteractionModeController` (L455141): `applicationModel.currentModule == OWN_CITY`;
`OtherCityInteractionModeController` (L455091): `== OTHER_CITY`. The mode is switched by
`ApplicationModelEvent/MODE_CHANGED` → `switchMode(applicationModel.get_interactionMode())` (L454987);
so **`applicationModel.set_interactionMode(id)` is the way to change mode** (`ApplicationModel` = `window.aviad_am`).

Own-city modes registered in `OwnCityInteractionModeController.postConstruct` (L455153):

| Mode id (`applicationModel.get_interactionMode()`) | Class (line) | Entered by | Click behaviour |
|---|---|---|---|
| `ModeTypes/defaultMode` | `DefaultSectorMode` (L453184) | default | `AbstractSectorMode.handleTileClicked` (L452827): `entityProxy.get_currentState().handleClick(modeId)` → behaviours (§2.5). `handleTileDown` on a collectable building switches to autoCollectMode |
| `ModeTypes/autoCollectMode` | `AutoCollectMode` (L453228) | mouse-down on a collectable building | hovering (`tileOver`) buildings collects them (`AutoCollectBehavior` L411254) |
| `ModeTypes/buildMode` | `BuildBuildingSectorMode` (L453281) | `ConstructBuildingEvent::newBuilding` (context) | ghost follows `tileOver`; `tileClicked` → validate → `buildAt` → `CitySectorModeEvent("placeEntity")` |
| `ModeTypes/buildInventoryBuildingMode` | `BuildInventoryBuildingSectorMode` (L453307) | `InventoryBuildingEvent::NEW_INVENTORY_BUILDING` | → `PlaceInventoryItemEvent::PLACE_BUILDING` |
| `ModeTypes/buildStreetsMode` | `BuildStreetsSectorMode` (L453425) | `ConstructBuildingEvent::newStreet` | drag path → `placeStreet` |
| `ModeTypes/buildSpireAW` | `BuildSpireAWSectorMode` (L453395) | `ConstructBuildingEvent::spireAW` | as buildMode + camera moveToTile |
| `ModeTypes/moveMode` | `MoveSectorMode` (L453647) | bottom menu | pick up on click, drop on click → `CitySectorModeEvent("moveEntity", entity, false, originalPoint)` (L453778) |
| `ModeTypes/sellMode` | `SellSectorMode` (L453980) | bottom menu | `SellBuildingBehavior` → `SellBuildingWindow` → `"removeEntity"` |
| `ModeTypes/upgrade` | `UpgradeSectorMode` (L454084) | `CityMapModelEvent/upgradeEntity` etc. | replaces the entity with next-level config, dispatches `"upgradeEntity"` |
| `ModeTypes/upgradeViewMode` | `UpgradeViewSectorMode` (L454310) | | highlights upgradable buildings |
| `ModeTypes/unlockMode` | `UnlockSectorMode` (L454036) | expansions | `PlaceCityAreaEvent::unlockArea` |
| `ModeTypes/spell` | `SpellSectorMode` (L454021) | `SelectSpellEvent/SPELL_SELECTED` | cast on clicked entity (see 10) |
| `ModeTypes/flat/*` (`buildInventoryBuildingMode`, `move`, `sell`, `upgradeView`) | `BuildInventoryFlatMode`, `MoveFlatMode`, `SellFlatMode`, `UpgradeViewFlatMode` | flat planner | |

Other-city modes: `ModeTypes/defaultMode` → `FriendSectorMode` (L453622), `ModeTypes/helpMode` →
`HelpSectorMode` (L453634); the click behaviours for visiting come from `VisitingBehaviorConfiguration`
(L405901): `PerformActionBehavior` (L410620) → `NeighborlyHelpEvent::executeAction` →
`PerformHelpNeighborCommand` (L387146) → `NeighborlyHelpService.performAction` (**[ext]** calls the
service directly, see `10-social-neighbours-aw-spells.md`).

Caveats for simulated tile events: `AbstractSectorMode._interactionEnabled` is set true on
`enterMode` and flipped by `"layerRollOver"` (`_onLayerRollOver` L452871: `event.get_layerId() == "game"`; the event comes from `GameTouchProcessor`, L399071), so a click dispatched while
the mouse last hovered a UI layer is ignored; `handleTileClicked` in build modes uses the ghost's
`tilePosition` (moved by `AbstractDragSectorMode.handleTileOver`, L452930) unless the tile is an unlockable expansion (L453137), so
dispatch `tileOver` first, then `tileClicked`.

### 2.5 Entity proxies, the client-side state machine and click behaviours

`CityEntityProxy` (L408109) binds a `CityMapEntity` (model, §3.2) to an `IsoEntity` (sprite):
`get_entity()`, `get_isoEntity()`, `get_currentState()`, `setIcon(iconId)`/`clearIcon()`, `highlight(b)`,
`setAlpha`, `update()`, `reset()`, `destroy()`. Proxies live in `OwnCityEntityProxyModel` /
`OtherCityEntityProxyModel` (`AbstractCityEntityProxyModel` L451608: `createProxy(entity, isoEntity, isUpgrade)`,
`getProxyForEntity(entity)`, `getProxyForIsoEntity(isoEntity)`, `updateProxy`, `removeProxy`, `reset`).
Obtain: `injector.getInstance(aviad['de.innogames.onyx.city.model.IOwnCityEntityProxyModel'])`
(or `ISelectiveEntityProxyModel` for the currently displayed city, mapped in `EnterOtherCityCommand._updateModelsMapping` L387019).

Per-proxy states (`city.entities.states.*`, `BaseCityEntityState` L409294) mirror the server state ids:

| Client state class | `get_stateId()` | Server `CityEntityStates` constant (L786267-L786276) |
|---|---|---|
| `ConstructionState` (L409433) | `"construction"` | `CONSTRUCTION` |
| `IdleEntityState` (L409457) | `"idle"` | `IDLE` |
| `ProducingEntityState` (L409630) | `"production"` | `PRODUCING` |
| `FinishedEntityState` (L409445) | `"finished"` | `PRODUCTION_FINISHED` |
| `UpgradingState` (L409652) | `"upgrading"` | `UPGRADING` |
| `WaitingEntityState` (L409664) | `"waiting"` | `WAITING` (queued production, waiting for slot) |
| `PreConstructionState` (L409498) / `PreUpgradingState` (L409564) | `"pre_construction"` / `"pre_upgrading"` | client-only (ghost while placing) |
| — | `"unconnected"` (`UNCONNECTED`, wraps a `paused_state`) | not a proxy state; handled by `connectionBehavior` |
| — | `"ancient_wonder_help"` | AW help state |

Transitions are wired by `city.entities.states.factories.*` (L411792-L412001); e.g.
`ManualAndAutoProductionStatesFactory` (L411942): construction→idle, idle→production (default) / upgrading,
production→finished (default) / idle / upgrading, finished→idle (default) / upgrading, upgrading→idle.
`QueuedProductionStatesFactory` (L411971) additionally finished→production; `DefaultStatesFactory` (L411908)
construction→idle→upgrading→idle; `BarrackStatesFactory`, `AncientWonderStatesFactory`, `GuardianStatesFactory`.

Each state change / click / hover fires the `BehaviorController` (L408485): `onEnter`, `onSelect`, `onOver`,
`onOut`, `onPause`, `onResume`. Behaviours are chosen by rules in `MainBehaviorConfiguration` (L405695),
keyed by entity type sets (`EntityTypeSets`, L786363: `PRODUCTION_ENTITIES = ["production","trader",
"premium_production","residential","premium_residential","armory","goods","culture","culture_residential","expiring"]`,
`QUEUED_PRODUCTION_ENTITIES = ["academy","military"]`, `NOT_REQUIRE_STREET_ENTITIES = ["street","worker_hut","main_building"]`,
`UNIQUE_ENTITIES = [...]`). The production click rules (`ProductionClickRules` L406208, only in `ModeTypes/defaultMode`):

| Entity state | Click behaviour | Effect |
|---|---|---|
| `idle` | `SelectAndOpenWindowBehavior` (L411473) | `WindowEvent::addWindow` with `WindowsFactory.createWindow(entity)` |
| `finished` | `SelectFinishedProductionBehavior` (L411511) | `dispatch(new ProductionEvent("ProductionEvent::pickupProduction", entity))` |
| `production` + `IsAutoProductionGuard` | `SelectAutoProductionBehavior` (L411495) | early collect / window |
| `production` (manual) | `SelectManualProductionBehavior` (L411624) | opens window (boost/cancel) |

Townhall: `TownhallClickRules` (L406265) → `PickUpTownHallRewardBehavior` when the `unlimited_help` effect is
present, else open window. Queued producers (`academy`, `military`): `OpenQueuedProductionWindowBehavior`
(L411579). Hover in `ModeTypes/autoCollectMode`: `AutoCollectBehavior` (L411254) dispatches the same
`ProductionEvent::pickupProduction` for every collectable building the pointer passes over.

Icons above buildings: `SetCollectionIconBehavior` (L410870) picks
`BuildingIconProvider.getBuildingIconId(type, resourceId, isCapped)`; constants `BuildingIcons`
(L786256): `suppliesFull, coinsFull, supplies, coins, help, idle, spells, military, upgrade, upgrade_disabled, evolve`.
The neighbourly-help visual bits that live in the engine: `SetNeighborlyHelpIconBehavior` (L411010),
`SetNeighborlyHelpPortraitBehavior` (L411041), fx `engine.fx.custom.helpicon.*` (L400236) and
`helpedportrait.*` (L400143), charge behaviours `ChargeCultureBehavior/ChargeTownHallBehavior/ChargeWorkerHutBehavior`
(L410560-L410584); the services are in 10.

### 2.6 Camera — `CityCameraController` and friends (`window.aviad2`)

`ConfigureIsoEngineCommand._createCameraController` (L390539) — the function `injectMutate.ts` regex-patches to
capture its return value as `window.aviad2` **[ext]** — returns a
`de.innogames.onyx.city.engine.camera.CityCameraController` (L398381), also mapped as
`ICityCameraController` (L390522) so `injector.getInstance(aviad['de.innogames.onyx.city.engine.camera.ICityCameraController'])`
is the same object (`03-bootstrap-di-commands-events.md` §1.6). `aviad2` is captured but currently unused
and not declared in `aviad.ts`.

What it offers:

| Member | Line | Does |
|---|---|---|
| `set_active(bool)` | 398396 | add/remove context listeners for `CityTileCameraEvent::moveToTile`, `CityCameraZoomEvent::zoom`, `CityCameraEvent::moveTo`, `IsoEngineEvent::draggingStart` (L398452) |
| `setStrategy("default")` | 398414 | `CityCameraDragStrategyFactory` (L398468) → `DefaultCityCameraDragStrategy` (L398637: toggles `isoEngine.set_draggingEnabled`) or `DisabledCityCameraDragStrategy` (L398652) |
| `enableDragging()` / `disableDragging()` | 398417 | via strategy |
| `_navigator: CityNavigator` (L398558) | | `moveToTile(tileX,tileY)` (L398569: `isoEngine.isoToGlobal` − half stage → TweenLite 1.5 s → `isoEngine.moveCameraTo`; fires `CityTileCameraEvent::moveFinished`), `moveTo(x,y)` (global px; fires `CityCameraEvent::moveFinished`), `stop()` |
| `_zoomer: CityZoomer` (L398601) | | `zoomTo(factor)` (0.5 s tween on `isoEngine.set_cameraZoom`, persists to `settingsModel.set_zoomFactor`) |
| `_dragging: CityCameraDragging` (L398491) | | mouse drag → `isoEngine.moveCameraBy` |

Events (context dispatcher): `new CityTileCameraEvent("CityTileCameraEvent::moveToTile", tileX, tileY)`
(L412080) — used by `EnterOtherCityCommand` (town hall, L387012), `BuildSpireAWSectorMode` (L453410),
notifications/quests (L372662, L508751), the console command `moveCamera` (`console.MoveCityCameraTo` L389215),
tutorial `NavigateToCityGridTileTrigger` (L470322); `new CityCameraEvent("CityCameraEvent::moveTo", x, y)`
(L412030); `new CityCameraZoomEvent("CityCameraZoomEvent::zoom", factor)` (L660155). Mouse wheel:
`MouseWheelHandler.handle(delta)` (L398666) → `CityZoomInEvent` (`"CityZoomInEvent::zoomIn"`) / `CityZoomOutEvent`.

### 2.7 Iso entities and render configs

`IsoEntity` (L400970): `id`, `tilePosition` (Point), `snakeSprite`, `snakeFxSprite`, `_config`
(`RenderConfigProxy` L401408 → `BuildingRenderConfig`), `get_tileWidth()/get_tileLength()`,
`setTilePosition`, `setSpriteSheet(name,index)`, `set_iconId`, `set_alpha/set_visible`, `setHighlight(color,blur)`,
`showAndPlayAnimation`, `hasStaticPosition()/getStaticPosition()`, `get_layerName()`.
Created by `IsoEntityFactory` (L18040) from an asset name (`EntityConfig.get_assetName()`) and a state id.
`de.innogames.onyx.buildings.data.BuildingRenderConfig` (L365817): `id, type, tileWidth, tileLength,
displayFirstFrame, iconOffsetX/Y, spriteSheets, animations, x, y, hasStaticPosition, layerOverride`;
loaded by `LoadRenderConfigsCommand` (L392368) / `LoadBuildingAnimationsCommand` (L393172).
Textures: `ATFSnakeTextureManager` (L404463), `BuildingAtlasLoader` (L404730), `TextureAtlasProvider` (L404842).

### 2.8 Debug hooks that already exist in the client (feature-gated)

If the feature `show_console` is enabled, `ConfigureCommunicatorCommand` (L391778) exposes through
`AS3Communicator.exposeMethod(name, fn, desc)` the `city.commands.communicator.*` commands:
`isClientLoaded`, `clickOnCityGridTile(tileX,tileY)` (L387884 — `isoEngine.isoToScreen` + synthetic click),
`dragMouse`, `getBuildableCityTiles`, `getCityEntities` (L388113 — `[id, configId, x, y]` list),
`getCityEntitiesByConfigId`, `getCityEntityAtGridPosition`, `getCityTileAt`, `getClickableObjectAt(sx,sy)` (L388201),
`getPerformanceLog`, `hasSpireEntrance`, `isObjectVisible`, `openSpire` (L388406), `openCashShop`, `openRatingPopup`,
`toggleDisplayNames`, `requestSeasonalEvents`, `disableMainEventTutorial`, fps/time recording.
Console commands (`city.commands.console.*`, `ConsoleCommandsController` L391944): `moveCamera x,y`,
`showResource`, `showBoost`, `snake`, `listBehavior`, `logLevel`, `gameVersion`, ... They are not reachable
without the feature flag; the underlying calls are what §7 uses directly.

---

## 3. City map model

### 3.1 Wire VOs

`de.innogames.onyx.networking.vos.CityMapVO` (L527945): `unlocked_areas: CityMapUnlockedAreaVO[]` (`x, y, width, length`),
`entities: CityMapEntityVO[]` — this is `startup.city_map` (parsed by `CityEntitiesParser.parse` L392479 →
`CityEntitiesModel.initializePlayerMapConfiguration`, L451774) and the payload of the
`CityMapService.reset` push (**[ext]** `src/elvenar/processCityMapServiceUpdate.ts` consumes `R:CityMapService/reset`).

`CityMapEntityVO` (L527828):

| Field | Type | Meaning |
|---|---|---|
| `id` | int | map-entity id (unique per placed building; == `IsoEntity.id`) |
| `cityentity_id` | String | config id, e.g. `"G_Humans_FactoryStone_1"` (→ `EntityConfig`) |
| `level`, `stage` | int | level (also encoded in the config id) / evolving-building stage |
| `player_id` | int | 0 for own city |
| `type` | String | `"residential"`, `"production"`, `"goods"`, `"culture"`, `"main_building"`, `"military"`, `"academy"`, `"street"`, `"ancient_wonder"`, `"guardian"`, ... |
| `x`, `y` | int | tile position (top-left) |
| `connected` | Bool | street-connected |
| `connectedSets` | `ConnectedSetVO[]` | set-building links |
| `state` | polymorphic (`__class__`) | see below |

State VOs (`HaxeJSONParser.parseClass(json.state)`; base `AbstractStateVO` L524386: `next_state_transition_in`):
`IdleVO` (L531527), `ConstructionVO` (L528328), `UpgradingVO` (L541035), `WaitingVO` (L541949),
`UnconnectedVO` (L540791: + `paused_state`), `ProducingVO` (L534930) and `ProductionFinishedVO` (L534966)
which extend `AbstractProductionVO` (L524407: `current_product`, `resources`). `EntityStateWrapperFactory` (L664735)
maps them onto `strategycity.main.model.vo.entityStates.impl.*` (`ProducingEntityState`, `ProductionFinishedEntityState`
`get_stateId()=="finished"`, `IdleEntityState`, `ConstructionEntityState`, `UpgradingEntityState`, `UnconnectedEntityState`,
`WaitingEntityState`); `ProductionEntityState` (L664811) exposes `get_product()` (`EntityProduct`), `get_resources()`, `get_bundles()`.
Client-only virtual states: `VirtualFinishedEntityState` (L664994), `VirtualUnconnectedEntityState` (L665032).

### 3.2 `de.innogames.onyx.city.entities.data.CityMapEntity` (L406405) — the model entity

Wraps a `CityMapEntityVO` (`_vo`, a `tink_state_State`) and an `EntityConfig` (`_config`).

| Accessor | Returns |
|---|---|
| `get_id()`, `get_cityEntityId()`, `get_x()`, `get_y()`, `get_playerId()`, `get_stage()` | VO fields |
| `get_type()` | `entityConfig.get_type()` (`"virtual"` if no config) |
| `get_state()` / `set_state(s)` | wrapped state (`get_stateId()`, `get_nextTransitionIn()`) |
| `get_entityConfig()` | `EntityConfig` (L663907): `get_id/get_baseName/get_name/get_type/get_level/get_width/get_length/get_assetName/get_requirements/get_upgradeRequirements/get_production/get_constructionTime/get_saleResources/get_category/get_race/...` |
| `get_connected()`, `get_requireConnection()`, `connect()`, `disconnect()` | street connection |
| `get_activeLevel()` | level − 1 while constructing/upgrading |
| `get_revenueResource()`, `get_revenueResourceIds()` | what the current/reference product yields |
| `getRemainingTime()` (L406478), `getProducingTime()`, `getProgressStatus()` | timers |
| `isProductionRunning()`, `isInConstruction()`, `isConstructing()`, `isEntityBeingBuilt()`, `isEntityBeingUpgraded()`, `isPremium()` | |
| `canCollect()` | `entityConfig.get_production().canCollect(this)` — manual: state `"finished"` (L663784); automatic: finished OR elapsed ≥ `minAutoCollectTime` (L663664) |
| `hasProductionPolicy(ProductionPolicy.X)` | X ∈ `QUEUED("queued")`, `AUTOMATIC("automatic")`, `MANUAL("manual")`, `NONE("none")` (L786427-L786430) |
| `updateCoordinates(x,y)`, `update(entity)`, `needsWorker()` | |

### 3.3 The models (own city)

| Model (injector key → impl) | Line | Notable API |
|---|---|---|
| `strategycity.main.model.ICityEntitiesModel` → `city.model.CityEntitiesModel` (L390708) | 451695 | `get_entities()` (openfl `Vector<CityMapEntity>`: `.get_length()`, `.get(i)`, `.toArray()`), `getEntityById(id)`, `getEntitiesByType(type)`, `getEntitiesForBasename(bn)`, `getUniqueBuilding("main_building")`, `get_unlockedAreas()`, `freeWorkers` (observable), `get_totalWorkers()`, `getEntitiesUnderConstruction()`, `createMapEntity(id,x,y,config,isUpgrade,stateOverride)`, `resetEntities(vos)`, `updateConnections(vos)`, `updateEntityData(entity, vo)`, `removeEntity(entity, onlyFrontend)`, `get_update()` (tink Signal fired per changed entity), `whenMapLoaded()`; dispatches `CityMapModelEvent/map_loaded`, `/updateEntities`, `/resetEntities` |
| `ISelectiveCityEntitiesModel` | 390710 | the currently displayed city (own or visited) |
| `IFriendCityEntitiesModel` → `FriendCityEntitiesModel` | 452570 | visited city |
| `ICityEntityConfigsModel` → `CityEntityConfigsModel` | 452081 | `getConfigById(cityentityId)`, `get_configs()`, `getNextLevel(config)`, `hasMultipleLevels(config)`, `getStageAppliedConfigsById(id)`, `hasConfig(id)`, `setUnlockedItems` |
| `IOwnCityEntityProxyModel` / `IOtherCityEntityProxyModel` / `ISelectiveEntityProxyModel` | 452765 / 452747 | §2.5 |
| `IEntityCategoriesModel` → `EntityCategoriesModel` | 660444 | build-menu categories, `get_expansionCategory()` |
| `IExpansionModel` → `ExpansionModel` | 660529 | expansions |
| `IInventoryCityBuildingsModel` → `InventoryCityBuildingsModel` | 452728 | buildings placeable from inventory |
| `city.engine.model.IsoEngineModel` | 36415 | parked engine state while visiting |
| `culture.models.CultureModel` (L10752), `population.models.PopulationModel` (L13791) | | culture / population totals |
| `shared.production.ProductionQueueModel` | 568414 | queues (`ProductionQueueIds.SPELLS="spells_production"`, `MILITARY="military_production"`, L784772): `getQueue(id)`, `getQueueSlot(queueId,slotId)`, `getProvidingEntityForQueue(id)`, `getQueueSlotProduct(slot)`, `removeSlot` |
| `PremiumBuildingHints` (L41281), `configs.CityConfiguration` (L389892) etc. | | misc |

Read the entity list (recipe R1 in §7).

### 3.4 `de.innogames.onyx.city.services.CityMapService` (L458840) — serviceName `"CityMapService"`

Mapped as `ICityMapService` (L390714). Methods and wire payloads:

| Method | Request / `withData` | Notes |
|---|---|---|
| `placeEntity(entity, isPremium, cb)` (L458848) | `placeBuilding [cityentity_id, x, y]` (non-immediate) or `placeBuildingForPremium [...]` (immediate) | response `data[0]` = `CityMapEntityVO`, `data[1]` = updated connections (`_onEntityPlaced` L454530) |
| `replaceEntities(entities, cb)` | `replaceBuildings [ConstructionRequestVO[]]` | streets: `{cityMapEntityId, cityEntityId, x, y}` (`onExecution` L454579) |
| `removeEntity(entity, cb)` | `removeBuilding [id]` | response: entities whose connection changed |
| `moveEntity(entity, cb)` | `moveBuilding [id, x, y]` (immediate) | entity coordinates must already be updated |
| `upgradeEntity(entity, isPremium, cb)` | `upgradeBuilding [id, x, y]` / `upgradeBuildingForPremium [id, x, y]` (immediate) | |
| `cancelUpgrade(entity, cb)` | `cancelUpgrade [id, x, y]` | |
| `unlockArea(tileX, tileY, expansionConfig, cb)` | `unlockArea [tileX, tileY, unlockedThrough, buyForPremium]` | |
| `reduceConstructionTime(mapEntityId, price, cb)` | `reduceConstructionTime [id, price]` | premium instant-finish (L390184) |
| `update()` | `update` | after `CityEntityEvent::constructionFinished` (`UpdateCityMapServiceCommand` L659872) |
| push `reset` → `_onResetEntities` | | `entitiesModel.resetEntities(vos)`; also `AddGuardianEntityEvent::add` if a `"guardian"` is present |
| push `updateEntity` → `_onUpdateEntity` | | `entitiesModel.updateConnections(vos)` |
| push `replaceBuilding` → `_onReplaceEntity` | | `ReplaceEntityEvent::replace` → `ReplaceEntityCommand` (L387272) |
| push `updateExpansions` → `_onUpdateExpansions` | | rebuild expansion category, `ExpansionEvent::expansionsUpdated` |

`DiplomacyCancelService` (L50004): serviceName `"SpireDiplomacyService"`, `cancelDiplomacy(pointId)` →
`cancel [pointId]` (immediate) — used by `CancelDiplomacyCommand` (`RunningActivityEvent::cancel_diplomacy`), see 08.
`BattleRetreatService` (L458820): serviceName `"BattleService"`, `retreatBattle(battleId)` → `retreat [battleId]`.

### 3.5 Building lifecycle — event → command → service chains

All mappings are in `ConfigureControllerCommand` (L390347): `_mapCommands` (L390383), `_mapSectorModeCommands` (L390475).

| Action | Trigger event (context dispatcher) | Command | Result |
|---|---|---|---|
| Choose a building in the build menu | `ConstructBuildingEvent("ConstructBuildingEvent::buildingSelected", entityConfig)` (L79499) | `strategycity.main.controller.StartBuildEntityCommand` (L659849) | needs free worker else `OpenEntityWindowEvent/WORKER`; re-dispatches `ConstructBuildingEvent::newBuilding` / `::newStreet` / `::spireAW` (context listeners in the modes) → mode switch |
| Place (click in buildMode) | `CitySectorModeEvent("placeEntity", entity, showBlimps=true)` (L69068; extends `CityEntityEvent(type, entity)`) | `modes.commands.PlaceCityEntityCommand` (L454489) | `service.placeEntity(entity, premium?, cb)`; on `ServiceExceptionEvent::exception` code 2000 removes the ghost |
| Place from inventory | `PlaceInventoryItemEvent::PLACE_BUILDING` (L49330) | `PlaceInventoryBuildingCommand` (L454750) | `InventoryService.placeBuilding(inventoryItemId, x, y, cb)` → `placeBuilding [itemId, x, y]` (L417014; see 11) |
| Place streets | `"placeStreet"` | `PlaceCityStreetCommand` (L454553) | `service.replaceEntities(ConstructionRequestVO[])` |
| Move | `CitySectorModeEvent("moveEntity", entity, false, originalPoint)` | `MoveCityEntityCommand` (L454440) | `service.moveEntity(entity)`; if main_building, disconnects everything first; on error 3000 moves the sprite back |
| Sell | `CitySectorModeEvent("removeEntity", entity)` (from `SellBuildingBehavior` L411721 / `CancelConstructionCommand` L390059) | `RemoveCityEntityCommand` (L454790) | `service.removeEntity`; refunds `get_saleResources()` locally |
| Upgrade | `CityBuildingEvent("CityBuildingEvent/CONFIRM_BUILDING_UPGRADE", entity)` (L56977) → `ConfirmUpgradeCommand` (L386890) → `CityBuildingEvent/UPGRADE_BUILDING` → `UpgradeBuildingCommand` (L390244) → `UpgradeEntityEvent("CityMapModelEvent/upgradeEntity", entity)` → `UpgradeSectorMode._onStartUpgrade` (L454189) → `CitySectorModeEvent("upgradeEntity", nextLevelEntity)` | `StartUpgradeEntityCommand` (L454835) | `service.upgradeEntity(entity, premium?)` |
| Cancel upgrade | `"cancelEntity"` | `CancelUpgradeEntityCommand` (L454404) | `service.cancelUpgrade` |
| Instant finish construction/upgrade | `InstantFinishConstructionEvent/INSTANT_FINISH_CONSTRUCTION` (L61945; `get_entity()`, `get_price()`) | `controller.InstantFinishConstructionCommand` (L390167) | `service.reduceConstructionTime(id, price)` then `CityEntityEvent::constructionFinished` |
| Unlock expansion | `PlaceCityAreaEvent::unlockArea` (L11319) | `UnlockCityAreaCommand` (L454902) | `service.unlockArea(tileX,tileY,expansionConfig)`; `CityUnlockModeEvent::unlockAreas` → `UnlockCityAreasCommand` (L387737) → `isoEngine.unlockArea` |
| Chapter advance of a chapter-based building | `BuildingChapterAdvanceEvent::CHAPTER_ADVANCE` | `BuildingChapterAdvanceCommand` (L386749) | |

Enter/leave city: `CityEvent::ENTER_OWN_CITY` → `EnterOwnCityCommand` (L387028: restores `IsoEngineModel` state,
`IsoEngineStateEvent::activateEngine`); `CityEvent::ENTER_OTHER_CITY` → `EnterOtherCityCommand` (L386985: maps
`ISelectiveCityEntitiesModel`/`ISelectiveEntityProxyModel` to the friend models, `activateLoading`, moves the camera to the
visited town hall); `CityEvent::SHOW_CITY` → `commands.engine.ShowCityCommand` (L389841).

---

## 4. Production

### 4.1 `de.innogames.strategycity.main.service.CityProductionService` (L13124) — serviceName `"CityProductionService"`

Singleton (L390699): `injector.getInstance(aviad['de.innogames.strategycity.main.service.CityProductionService'])`.

| Method | Wire | Notes |
|---|---|---|
| `startProduction(entityId, productionOptionId, amount)` | `startProduction [entityId, optionId, amount]` + `handleOnlyLastPushResponses(["CityResourcesService.getResources"])` | |
| `startProductions(buildingIds[], optionId, amount)` | `startProductions [ids, optionId, amount]` | what the UI actually uses (also for a single building) |
| `instantStart(entityId, optionId, amount=1)` | `instantStart [...]` (immediate) | premium start |
| `pickupProduction(entityId, cb)` | **batched**: ids are pushed to `_pickupEntities`, a 1 s `TweenLite.delayedCall` then sends ONE `pickupProduction [[id, id, ...]]` (immediate) (`_pickupProduction` L13193) | the callback of the last call wins |
| `pickupProductionDetails(entityIds, cb)` | same batching, `pickupProductionDetails [[ids]]` | |
| `instantFinish(entityId)` | `instantFinish [entityId]` (immediate) | premium finish |
| `cancelProduction(entityId, slotId=0)` | `cancelProduction [entityId, slotId]` | |
| `discardProduction(entityId, forceCleanStorage=false)` | `discardProduction [entityId, force]` | |
| `updateQueue(queueId)` | `getProductionQueue [queueId]` (immediate) | push `getProductionQueue` → `queueModel.updateQueue(vo)` |

### 4.2 Production events and commands (context dispatcher, mapped at L390396-L390403)

| Event (ctor) | Command | Effect |
|---|---|---|
| `ProductionEvent("ProductionEvent::pickupProduction", entity)` (L17543: `(type, entity, productId?, amount?)`) | `commands.PickupProductionCommand` (L387168) | picks a `IPicker` by entity: `main_building` → `TownHallRewardPicker`; `production.get_random()` → `RandomProductionResourcePicker`; QUEUED → `MilitaryProductionResourcePicker` / `PortalProductionPicker` / `QueueProductionResourcePicker`; orcs/community-work → `RandomSentientGoodRewardPicker` / `RandomAscendedGoodRewardPicker`; else `ProductionResourcePicker`. `picker.canPickup(entity)` (resource not capped, not `"random"`, `entity.canCollect()`) → `picker.pickup(entity)` (`BasePicker.pickup` L407627: clear icon, `callService(proxy)` = `service.pickupProduction(entity.get_id(), onSuccess)`, blimps, sound, pause state); otherwise opens the building window |
| `StartProductionEvent("StartProductionEvent::startProduction", buildings[], productId, amount=1)` (L13205) | `StartProductionsCommand` (L387614) | subtracts inputs locally, `service.startProductions(ids, productId, amount)` |
| `MultipleProductionEvent("MultipleProductionEvent::startAllProductions", entities[], productId, product)` (L23150) | `StartAllProductionsCommand` (L387511) | filters `"idle"` entities → `StartProductionEvent` |
| `ProductionEvent("ProductionEvent::startPremiumProduction", entity, productId)` | `StartPremiumProductionCommand` (L387546) | `service.instantStart(id, optionId)` |
| `ProductionEvent("ProductionEvent::cancelProduction", entity)` | `CancelManualProductionCommand` (L386813) | storage check then `service.cancelProduction(id)` |
| `ProductionEvent("ProductionEvent::finishProduction", entity)` | `FinishManualProductionCommand` (L387069) | `service.instantFinish(id)` |
| `ProductionEvent("ProductionEvent::discardProduction", entity)` | `DiscardProductionCommand` (L386972) | `service.discardProduction(id)` |
| `MultipleProductionEvent::cancelAllProductions` | `CancelAllProductionsCommand` (L386770) | |
| queue: `CancelQueueProductionCommand` (L458330), `FinishQueueProductionCommand` (L458360), `QueuedProductionSlotFinishedCommand` (L458382), `UpgradeQueueProductionCommand` (L458396) | | queue slots: `slot.get_producingEntityId()`, `get_order()`, `get_remainingTime()`, `get_amount()`; `ProductionQueueSlotVO` (L534982: `order, producingEntityId, productId, amount, remainingTime, timestamp`), `ProductionQueueVO` (L535027: `id, providingEntityBaseName, maxSlots, unlockedSlots, slots`) |

### 4.3 What a click on a finished building actually does (and how to do it without the click)

Mouse → Starling → `CityGrid._onClick` (L403296) → `IsoTileEvent::tileClicked` on the engine →
`AbstractInteractionModeController._onIsoEngineAction` (L455046): pick proxy at tile → `DefaultSectorMode`
(`AbstractSectorMode.handleTileClicked`, L452824) → `proxy.get_currentState().handleClick("ModeTypes/defaultMode")`
(`BaseCityEntityState.handleClick` L409382 → `_listener.onSelect`) → `BehaviorController.onSelect` (L408525) →
`SelectFinishedProductionBehavior.execute` (L411515) → **`ProductionEvent::pickupProduction`** →
`PickupProductionCommand` → picker → `CityProductionService.pickupProduction(id)` (batched) → wire
`CityProductionService.pickupProduction [[ids]]`.

You can enter this chain at any point (see §7 R2): dispatch the `IsoTileEvent` on the engine (needs own city,
defaultMode, no paused state), dispatch the `ProductionEvent` on the context dispatcher (still runs
`canPickup`: cap check + `canCollect()`), or call the service directly (server-side validation only; the client
model then catches up from the push responses `CityResourcesService.getResources` / `CityMapService.updateEntity`).

### 4.4 Production configuration (`EntityConfig.get_production()`)

`strategycity.main.model.vo.configs.production.impl.EntityProductsOwner` (L663315) and its policy subclasses
`EntityAutoProduction` (L663708), `EntitySwitchableAutoProduction`, `EntityQueuedProduction` (L663739),
`EntityManualProduction` (L663780), `EntityNoneProduction`: `hasPolicy(ProductionPolicy)`, `canCollect(entity)`,
`get_products()`, `getProductById(optionId)`, `getReferenceProduct()`, `getRevenueResourceIds()`, `get_random()`,
`get_switchable()`, `get_queueId()`, `get_minAutoCollectTime()`, `get_hasEarlyCollect()`, `applyStage(stage)`.
`EntityProduct` (L665197 / `EntityAbstractProduct` L665095): `get_optionId()` (**this is the `productionOptionId`
sent to the server**), `get_name()`, `get_productionTime()`, `get_requiredInput()` (ResourceCollection),
`get_revenueResource()`, `get_revenue()`, `get_premiumCostFactor()`, `get_isLocked()`, `get_unlockAtLevel()`,
`getRevenueByTime(t)`.

---

## 5. Treasures (chests lying in the city)

Types seen in code: `"currency_event"` (event currency chests), `"video_ad"`, `"neighbourly_help"` (server-side
only; the client opens it immediately, L469093). Positions are client-side: `PositionHelper` (L469495) shuffles a
fixed pool of 17 global-pixel points; `Treasure` (L469427) = `{x, y, treasureType, id = StringKey.generate([type,x,y])}`.

Data flow:

1. Server push `TreasureService.spawnTreasure` (`TreasureServiceConstants_SpawnTreasure = "spawnTreasure"`, L784167)
   with `TreasureVO[]` (L540508: `type`, `isFirstTime`) → `TreasureViewModel.spawnTreasure` (L80927): keeps the
   difference between pushed count and on-map count per type, adds/removes `Treasure`s in `internalState`,
   records the type in `blimpState` (hint blimp).
2. `city.treasure.CityMapController` (ctor L468962) observes `TreasureViewModel.state` while
   `isoEngine.activate && isInOwnCity` and calls `IsoTreasureHelper_spawnCurrencyTreasure` (L643414) /
   `spawnVideoAdTreasure` (L643411) → `isoEngine.addDecoration(DecorationType.INTERACTIVE, new TreasureDecoration(treasure, x, y, kind))`.
   The decoration id is the `Treasure.id`.
3. Click → `IsoDecorationEvent::click` (§2.3) → `OpenTreasureCommand` (L469120): removes the treasure from the
   view model and the layer, `TreasureService.openTreasure(treasureType)` (`openTreasure [type]`, returns a Future
   of reward VOs) → `TreasureRewardsEvent::showRewards` (context `TreasureRewardContext.NORMAL_HELP`) →
   `ShowCurrencyEventTreasureBlimpCommand` (guards `OnlyInOwnCity`, `OnlyDuringCurrencyEvent`) or the NH reward
   windows; also `TreasureEvent::openTreasure`. Video-ad chests go to `OpenVideoAdTreasureCommand` (L469145).

Classes: `TreasureService` (L80840, serviceName `"TreasureService"`: `getCurrencyEventTreasures()` → Future,
`openTreasure(type)` → Future, `refresh()`) — **[ext]** captured as `window.aviad_ts` (unused so far);
`TreasureViewModel` (L80872: `getTreasures(type)`, `hasTreasure(type)`, `removeTreasure(id)`, `state`/`blimpState`
observables) — **[ext]** captured as `window.aviad_tv` and used by `localCollectEventTreasure.ts`; `TreasureModelConfig`
(L469409) maps all three as singletons; `TreasureControllerConfig` (L469394) maps the commands.

---

## 6. City UI — package structure and window classes (names only)

`de.innogames.onyx.city.ui.*` (813 classes): `windows` (564), `tooltips` (105: `EntityTooltipManager` L58915,
`composite.compositions.*` e.g. `BuildingProductionTooltip`, `BarrackBuildingTooltip`), `behaviors` (77: building-info
component behaviours), `hud` (40), `provider` (20: `EntitySellCostsProvider`, `GoodsProvider`, `ProvisionsProvider`,
`requirements.*`), `events`.

HUD (`city.ui.hud.*`): `OwnCityGameHud` (L474734), `OtherCityGameHud` (L474786), `menu.OwnCityBottomMenu` (L18514) /
`OtherCityBottomMenu` (L67040) with mediators, `menu.buttons.OwnCityButtonGroup` / `OtherCityButtonGroup`, button
handlers (`CityButtonHandlerAncientWonder`, `CityButtonHandlerNeighborlyHelp`, `CityButtonHandlerTrader`,
`CraftingButtonHandler`, `SpireButtonHandler`, `AncientWonderListButtonHandler`), tooltips.

Windows are created by `city.ui.windows.factory.WindowsFactory` (L498484, `IWindowsFactory`):
`createWindow(entity, tabIndex)` → `EntityTabWindow` with tabs from `TabsFactory` (L480156; creators
`AutoCollectionTabCreator`, `WishingWellTabCreator`, `TownHallTabsCreator`, `WorkerHutTabsCreator`,
`ActiveProducingTabsCreator`, `FinishedProductionTabsCreator`, `AcademyTabsCreator`, `WorkshopTabsCreator("production"/"premium_production")`,
`ManufactureTabsCreator`, `BarracksTabsCreator`, `ArmoryTabsCreator`, ...); plus `createConstructionWindow`,
`createExpansionsWindow(tileX,tileY)`, `createHighlightWindow`, `createSellWindow`, `createBoostConstructionWindow(entity)`,
`createQuestWindow`, `createUnitInfoWindow`, `createKnowledgePointsWindow(ownerId,data)`, `createSetOverviewWindow`,
`createStageOverviewWindow`, `createQuickNeighbourlyHelpWindow`, `createInGameShopWindow`, `createCauldronWindow`, ...
Windows open via `WindowEvent::addWindow` (see 03).

`city.ui.windows.*` sub-packages and their window/body classes:

| Package | Classes (purpose) |
|---|---|
| (root) | `EntityWindow` (L77804), `upgrade.EntityTabWindow` (L508110, the tabbed building window), `TabWindowMediator`, `TabsFactory`, `IEntityTabWindow`, `ISetBuildingWindow`, `IBoostConstructionWindow` |
| `construction` (69) | `ConstructionWindow` (L42020, build menu), `ExpansionsWindow` (L72410), `HighlightWindow` (L66367, "get required" highlight), `ConstructionBuildingBody`, `UpgradeBuildingBody`, `confirmation.UnboostedManufactoryConfirmationWindow`, renderers |
| `academy` (185) | magic academy / crafting / cauldron — see 11 |
| `queuedproduction` (40) | queue + selection views shared by barracks/portal (`AbstractQueuedProductionBody`, `queue.*`, `selection.*`) |
| `portal` (39) | settlement portal: `PortalProductionBody`, `PortalOverviewBody`, `DiscardProductionWindow` (L500527) |
| `barrack` (37) | `training.MilitaryTrainingBody`, `camp.ArmyDetailsBody`, `BarracksTabsCreator` |
| `stages` (31) | evolving buildings: `EvolveInfoWindow` (L59560), `StageOverviewWindow` (L505396) |
| `components` (31) | `BuildingWindowBody`, `BaseBuildingBody`, `ProductionComponentMediator` |
| `workerhut` (15) | `WorkerHutWindowBody` (builders), `BuildingSlotMediator`, `WorkerHutHobbyRoomMediator` |
| `production` (14), `producing` (11) | `ProducingWindowBody` (running production tab), `DiscardFinishedProductionFooterMediator` |
| `workshop` (7), `manufacture` (7) | `SelectProductionOptionsBody` / `SelectWorkshopOptionsBody` / `SelectManufactureOptionsBody` (choose product + amount → `StartProductionEvent`) |
| `unitinfo` (12) | `feathers.UnitInfoWindow` (L507978) |
| `newsletter` (11) | `NewsletterWindow` (L85685) |
| `knowledgepoints` (9) | `KnowledgePointsWindow` (L42628, KP invest into AW/tech) |
| `upgrade` (5) | `EntityTabWindow`, `SetBuildingWindowMediator` |
| `townhall` (5) | `overview.TownHallOverviewBody` |
| `premium` (5) | `BoostConstructionWindow` (L502321, pay diamonds to finish) |
| `armory` (5), `culture` (3), `expiring` (3), `wishingwell` (3), `sell` (2: `SellBuildingWindow` L504886), `factory` (2), `management` (3), `residential` (1: `AutoCollectionTabCreator`), `setbuildings` (1) | overview bodies per building type |

Related: `city.upgrade.windows.UpgradeWorkerHutBody` (L510116), `city.neighborlyhelp.views.QuickNeighborlyHelpWindow`
(L48433), `city.view.*` (64: `CityView` L38903, `loading.LoadingScreenView` L12452, footers for build/upgrade buttons,
`settings.OptionMenu` L68507).

---

## 7. Recipes (MAIN world, after `window.aviad`, `aviad_am`, `aviad_silm` exist)

Common helpers used below:

```js
const A   = window.aviad;                                   // $hxClasses
const inj = window.aviad_am.injector;                       // city context injector (03)
const eng = window.aviad_silm.isoEngine;                    // IsoEngine  (or inj.getInstance(A['de.innogames.onyx.city.engine.snake.IsoEngine']))
const bus = inj.getInstance(A['openfl.events.IEventDispatcher']);   // Robotlegs context dispatcher
const entitiesModel = inj.getInstance(A['de.innogames.strategycity.main.model.ICityEntitiesModel']);
const vec2arr = v => { const r=[]; for (let i=0;i<v.get_length();i++) r.push(v.get(i)); return r; };
```

**R1 — read the city map entity list from the model** (`CityEntitiesModel.get_entities`, L451719):

```js
const ents = vec2arr(entitiesModel.get_entities());
ents.map(e => ({ id: e.get_id(), cfg: e.get_cityEntityId(), type: e.get_type(),
  x: e.get_x(), y: e.get_y(), state: e.get_state().get_stateId(),
  remaining: e.getRemainingTime(), collectable: e.canCollect(),
  connected: e.get_connected(), level: e.get_entityConfig().get_level(),
  base: e.get_entityConfig().get_baseName() }));
// single: entitiesModel.getEntityById(id); by type: vec2arr(entitiesModel.getEntitiesByType('goods'))
```

**R2 — collect a building's finished production programmatically** (three entry points, §4.3):

```js
const e = entitiesModel.getEntityById(id);
// (a) simulate the click on its tile — full client behaviour (icons, blimps, sounds, batching):
const TE = A['de.innogames.onyx.city.engine.events.IsoTileEvent'];
eng.dispatchEvent(TE.getEvent('IsoTileEvent::tileClicked', e.get_x(), e.get_y(), true));
//     preconditions: own city shown, aviad_am.get_interactionMode()==='ModeTypes/defaultMode',
//     state 'finished' (or auto-production with canCollect()), the mode's _interactionEnabled true.
// (b) skip the engine, keep the game logic (PickupProductionCommand + picker.canPickup):
const PE = A['de.innogames.strategycity.main.controller.event.ProductionEvent'];
bus.dispatchEvent(new PE('ProductionEvent::pickupProduction', e));
// (c) raw service call (server validates; client model catches up from push responses):
inj.getInstance(A['de.innogames.strategycity.main.service.CityProductionService'])
   .pickupProduction(e.get_id(), resp => console.log(resp));   // batched 1 s, one request for many ids
```

**R3 — start a (manual) production**:

```js
const e = entitiesModel.getEntityById(id);
const products = e.get_entityConfig().get_production().get_products();   // Array<EntityProduct>
const optionId = products[0].get_optionId();                              // e.g. 3-hour supplies
const SPE = A['de.innogames.strategycity.main.controller.event.StartProductionEvent'];
bus.dispatchEvent(new SPE('StartProductionEvent::startProduction', [e], optionId, 1));  // → startProductions [[id], optionId, 1]
// or many idle buildings of a kind: new MultipleProductionEvent('MultipleProductionEvent::startAllProductions', entities, optionId, product)
```

**R4 — place a building**:

```js
// (a) raw request — the extension's mass-placement experiment (commented in src/inject/injectMutate.ts):
const cms = inj.getInstance(A['de.innogames.strategycity.main.service.ICityMapService']);   // CityMapService
cms.request('placeBuilding').withData(['G_Humans_FactoryStone_1', x, y]).withCallback(r => console.log(r)).call();
//     (injectMutate.ts instead did `new AbstractConnectionService()` + get_serviceName override — same wire call, see 04)
//     Response: [CityMapEntityVO, updatedConnections]. CAVEAT: the client model is NOT updated for a brand-new
//     entity — CityEntitiesModel._resetEntity (L452042) only updates entities it already knows and logs
//     "does NOT exist" otherwise; the building shows up after the next reload (the extension's note placed
//     5 per minute and reloaded). Use (b) if the building must appear immediately.
// (b) through the build mode (validators, worker check, blimps):
const cfg = inj.getInstance(A['de.innogames.strategycity.main.model.ICityEntityConfigsModel']).getConfigById('G_Humans_FactoryStone_1');
const CBE = A['de.innogames.strategycity.main.controller.event.ConstructBuildingEvent'];
bus.dispatchEvent(new CBE('ConstructBuildingEvent::buildingSelected', cfg));   // StartBuildEntityCommand → newBuilding → buildMode
const TE = A['de.innogames.onyx.city.engine.events.IsoTileEvent'];
eng.dispatchEvent(TE.getEvent('IsoTileEvent::tileOver', x, y, true));          // move the ghost
eng.dispatchEvent(TE.getEvent('IsoTileEvent::tileClicked', x, y, true));       // buildAt → placeEntity → CityMapService.placeBuilding
```

**R5 — move a building** (`MoveCityEntityCommand` path):

```js
const e = entitiesModel.getEntityById(id); const from = {x:e.get_x(), y:e.get_y()};
const iso = eng.getEntityById(id);
if (eng.isValidPlacementAtPosition(nx, ny, iso.get_tileWidth(), iso.get_tileLength())) {
  eng.moveEntity(iso, from.x, from.y, nx, ny);                                  // sprite + placement map
  e.updateCoordinates(nx, ny);                                                  // model
  const CSME = A['de.innogames.onyx.city.modes.events.CitySectorModeEvent'];
  const P = A['openfl.geom.Point'];
  bus.dispatchEvent(new CSME('moveEntity', e, false, new P(from.x, from.y)));  // → moveBuilding [id, nx, ny]
}
```

**R6 — click a treasure** (**[ext]** `src/inject/local/localCollectEventTreasure.ts`):

```js
for (const t of window.aviad_tv.getTreasures('currency_event'))                // TreasureViewModel
  eng.dispatchEvent(new A['de.innogames.onyx.city.engine.events.IsoDecorationEvent']('IsoDecorationEvent::click', t.id));
// guard: eng.hasDecoration(A['de.innogames.onyx.city.engine.decorations.DecorationType'].INTERACTIVE, t.id)
// spire entrance: same event with id 'spire' (EnterSpireCommand, 08)
```

**R7 — centre the camera on an entity / zoom**:

```js
const e = entitiesModel.getEntityById(id);
const CTCE = A['de.innogames.onyx.city.events.CityTileCameraEvent'];
bus.dispatchEvent(new CTCE('CityTileCameraEvent::moveToTile', e.get_x(), e.get_y()));   // 1.5 s tween, then ::moveFinished
// or directly: window.aviad2._navigator.moveToTile(e.get_x(), e.get_y());   window.aviad2._zoomer.zoomTo(0.75);
// instant: eng.moveCameraTo(gx, gy) with {x:gx,y:gy} = eng.isoToGlobal(tx,ty) minus half the stage size
// zoom event: new A['de.innogames.strategycity.main.controller.settings.events.CityCameraZoomEvent']('CityCameraZoomEvent::zoom', 1.0)
```

**R8 — change the interaction mode**: `window.aviad_am.set_interactionMode('ModeTypes/sellMode')` (ids in §2.4);
`get_interactionMode()` to read. Which entity is under a tile: `eng.getEntityByPosition(tx,ty)` → `IsoEntity.id`.

---

## 8. Open questions / not verified

- Raw `placeBuilding` (R4a): confirmed that `CityEntitiesModel._resetEntity` (L452042) ignores unknown ids, so the
  new building is server-side only until reload; not verified whether the server's `updateEntity` push for the
  neighbours' connections causes any client error in that state.
- `AbstractSectorMode._interactionEnabled` after synthetic events: not tested whether the last real hover leaves it
  `false` (the `layerRollOver` source was not traced).
- `IsoTileEvent.isIntoTheCity` semantics (`gridCell.coordsCollide(_visualBounds)`) — treated as "true when the tile
  is inside the visible city bounds"; not confirmed what `false` does in the modes.
- The `snake_*` engine internals (`snake_Snake`, camera `panTo/panBy`, projector) were not read beyond what `IsoEngine`
  calls.
- Flat mode (`ModeTypes/flat/*`, `FlatMode*Layer`) only listed, not traced.
- `city.upgrade.*` requirement providers, `city.streets.StreetPathCalculator` (street drag path), inhabitants and
  ground decorations are cosmetic/derived and were only listed.
- Response shapes of `pickupProduction`, `startProductions`, `moveBuilding` were inferred from the callbacks
  (`_onEntityPlaced(data)`: `data[0]` VO, `data[1]` connections; `_onEntityMoved(entities)`; `_onEntityRemoved(entities)`)
  and not from captured traffic.
- `getClickableObjectAt` etc. require the `show_console` feature; not checked whether that flag can be forced.
