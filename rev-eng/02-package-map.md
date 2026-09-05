# 02 — Package map of the compiled Elvenar client

## Scope

A package-by-package map of the 12,313 registered classes in `tmp/elvenar-release-full-reveng.js`,
built from `rev-eng/index/classes.tsv` (FQ name → line → JS identifier), `rev-eng/index/enums.tsv`
and `rev-eng/index/services-raw.md`, with the constructors/prototypes of the important classes
skimmed by line range. Every `de.innogames.*` package is listed at depth 4
(`de.innogames.onyx.city`, `de.innogames.strategycity.main`, …); the two giant ones
(`de.innogames.onyx.city.*`, `de.innogames.onyx.shared.*`) are split one level deeper. Third-party
layers (openfl, lime, starling, feathers, away3d, robotlegs, swiftsuspenders, tink, haxe std, …)
get one line each. It ends with a "where to look for X" table. Line numbers are the
`$hxClasses["…"] = X;` line of each class in the snapshot (constructor just above, prototype just
below) — jump with `sed -n 'L,L+80p'`. For *how* the code is shaped see `01-haxe-runtime-shape.md`;
for the DI/command/event machinery see `03-bootstrap-di-commands-events.md`; for the network layer
`04-networking-layer.md` and the services catalogue `05-services-catalog.md`.

Conventions in this file: class names inside a package section are given relative to the section's
package (e.g. `model.ApplicationModel` under `de.innogames.onyx.city`), always with the line number.
`services-raw.md` is the authority for service action names; only a few are repeated here.

---

## 0. The big picture

| Layer | Packages | Classes | What |
|---|---|---|---|
| Game code (InnoGames) | `de.innogames.*` | 10,842 | everything Elvenar-specific |
| ├ legacy core | `de.innogames.strategycity.*` (309), `de.innogames.shared.*` (~80), `de.innogames.networking.*` (17), `de.innogames.common.*` (14), `de.innogames.logging/diagnostics/trackers/collections/utils/math` | ~450 | session/user models, RPC base classes, clock, MVCS bases — the oldest layer (Forge-of-Empires-era naming) |
| ├ "onyx" (Elvenar) | `de.innogames.onyx.*` | ~10,400 | the game proper: `city` (3,364), `shared` (2,259), `assets` (2,008, generated), `networking` (538, mostly VOs), `worldmap` (394), `spire` (392), `battle` (265), `techtree` (233), `tournaments` (176), `multiplayer` (140), and ~35 smaller feature packages |
| MVCS framework | `robotlegs.bender.*` (140), `org.swiftsuspenders.*` (27) | 167 | Robotlegs 2 DI/command/mediator framework + its injector |
| Display / engine | `openfl.*` (216), `lime.*` (39), `starling.*` (64), `feathers.*` (116), `away3d.*` (362), `abstract3d.*` (67), `grid3d.*` (25), `snake.*` (30), `spine.*` (65), `innogui.*` (54), `de.flintfabrik.*` (5), `motion.*` (28) | ~1,070 | Flash-API emulation (openfl/lime), GPU 2D (starling + feathers UI), GPU 3D (away3d, unused-looking), the InnoGames iso engine (`snake`, `grid3d`, `abstract3d`), skeletal animation (spine), the InnoGames UI toolkit (`innogui`), tweening (`motion` = Actuate) |
| Async / reactive | `tink.core.*` (29), `tink.state.*` (22), `org.haxecommons.*` (13) | 64 | Futures/Promises/Signals, observables, async operations |
| Haxe std | `haxe.*` (37), root `Std`/`Type`/`Reflect`/`EReg`/`StringTools`/`Xml`/`Lambda`/… (~20), `js.*` (5) | ~60 | |
| Tooling / misc | `tutorial.*` (52, generic tutorial engine), `com.innogames.as3communicator.*` (26, debug automation API), `com.junkbyte.console.*` (3), `com.probertson.utils.*` (3, gzip), `com.sociodox.utils.Base64`, `gnu.as3.gettext.*` (3), `com.greensock.*` (4, GSAP plugin shims), `as3hx.*` (3), `avmplus.*` (1), `AS3Communicator`, `FLGlobal`, `ASAny/ASObject` shims | ~110 | AS3→Haxe port leftovers |
| Root entry | `AppMain` (L4100), `MainModule` (L8085), `ApplicationMediator` (L4158), `WorldMapModule` (L86253), `SpireModule` (L8457), `BattleModule` (L6834), `TechTreeModule` (L8701), `MultiplayerModule` (L8157), `IMain` (L7830), `MainModuleHelper` (L8143), `UncaughtErrorBuffer` (L86023), `Str` (L8474), `Delegate` (L6851), `SimplePrintf` (L8289), `TypeDescriptionAwareInit` (L85996) | 31 | see `01-haxe-runtime-shape.md` §8 |

Recurring MVCS layout inside almost every feature package (Robotlegs conventions):

| Sub-package | Holds | Base class / how to spot |
|---|---|---|
| `models/` or `model/` | state; readable at runtime | extend `de.innogames.onyx.mvcs.BaseActor` (L8798) / `Actor` (L14236); injected as singletons; often hold `tink_state` observables |
| `services/` or `service/` | RPC façades | extend `de.innogames.shared.networking.AbstractConnectionService` (L13105); `get_serviceName()`; `this.request("action").withData([...])…` |
| `commands/` or `controller/` | one-shot actions triggered by events | extend `robotlegs.bender.bundles.mvcs.Command` (L360152) or `de.innogames.shared.commands.AsyncCommand` (L358150); `execute()`, `event` field |
| `events/` | typed openfl events with string `type` constants | extend `openfl.events.Event`; the type strings are static consts (tail block, see 01 §1) |
| `views/`, `view/`, `windows/`, `hud/`, `tooltips/` | display objects + `*Mediator` | mediators extend `robotlegs.bender.bundles.mvcs.Mediator` (L4121) / `de.innogames.onyx.mvcs.Mediator` (L140117); `initialize()`, `view`/`viewComponent` |
| `configs/` or `config/` | DI wiring | `*Configuration` / `*Config` classes with `configure()` calling `injector.map(...)`, `commandMap.map("Event::type").toCommand(...)`, `mediatorMap.map(View).toMediator(...)` |
| `vos/`, `data/`, `wrappers/` | value objects (wire DTOs, `*VO`) and typed wrappers around them | plain field bags |
| `providers/`, `factories/`, `creators/`, `handlers/`, `behaviors/`, `guards/`, `states/` | strategy-pattern helpers | |

---

## 1. Framework-level InnoGames packages (the "legacy core")

### de.innogames.networking.services (17 classes)

The generic RPC framework beneath `shared.networking` — provider-agnostic request building,
buffering and registries. Full detail in `04-networking-layer.md`.

| Class | Line | Role |
| --- | --- | --- |
| `NetConnectionService` | 12784 | Generic service base (request dispatch, callbacks) |
| `ServerRequestBuilder` | 139541 | Fluent `withData/withCallback/immediate/call/callWithFuture` builder |
| `providers.AbstractConnectionProvider` | 17310 | Transport base class |
| `providers.ServerRequestBuffer` | 139883 | Batches pending requests per frame |
| `registries.ServiceRegistry` | 139951 | serviceName → service lookup |
| `registries.ProviderRegistry` | 139939 | Transport registry |
| `registries.HandlersRegistry` | 139923 | Error/status handler registry |
| `data.ServerRequest` | 139725 | Request DTO |
| `data.HttpError` | 139650 | HTTP error DTO |
| `events.NetConnectionProviderEvent` | 139834 | Transport events |

### de.innogames.shared.networking (17 classes)

The transport layer above `networking.services`: the base class every game service extends,
socket plugins, HTTP/JS connection providers and request salting.

| Class | Line | Role |
| --- | --- | --- |
| `AbstractConnectionService` | 13105 | Base for all 83 game services; `request()` builder, push listeners (`addSafePushResponse`, `handleOnlyLastPushResponses`) |
| `providers.HttpConnectionProvider` | 658028 | HTTP transport |
| `providers.JsConnectionProvider` | 17439 | JS/WebSocket transport (registers `notify`/`error`/`disconnect` page callbacks, see 01 §8.4) |
| `plugins.ISocketPlugin` | 657972 | Socket plugin contract |
| `plugins.InstantUpdatePlugin` | 657981 | Server push / instant update channel |
| `plugins.SocketChatPlugin` | 657994 | Chat over the socket |
| `plugins.SocketPluginProvider` | 82883 | Plugin registry |
| `protection.SaltGenerator` | 658010 | Request signing salt |
| `exceptions.HttpStatusHandler` | 657951 | HTTP error mapping |
| `data.ServerResponse` | 657910 | Parsed response envelope |
| `events.SocketConnectionEvent` | 657939 | Connection state events |
| `views.SocketConnectionIndicatorMediator` | 658338 | Connection-status HUD indicator |

### de.innogames.shared.mvcs (12), de.innogames.shared.commands (8), de.innogames.shared.mediator (4), de.innogames.onyx.mvcs (8)

MVCS base types shared by all modules.

| Class | Line | Role |
| --- | --- | --- |
| `shared.mvcs.AbstractModule` | 6794 | Base loadable module (context, config, lifecycle) — `WorldMapModule`, `SpireModule`, … extend it |
| `shared.mvcs.controller.Command` | 359469 | Base command |
| `shared.mvcs.view.ViewBase` | 10374 | Base view component |
| `shared.mvcs.view.Disposer` | 657784 | Tracked disposal of listeners/objects |
| `shared.mvcs.view.TabActivityHelper` | 657844 | Browser tab focus/blur handling |
| `shared.mvcs.event.ComponentPhaseEvent` | 657764 | Add/remove lifecycle events |
| `shared.mvcs.event.ConnectionServiceErrorEvent` | 60984 | Service error propagation |
| `shared.commands.AsyncCommand` | 358150 | Command that completes asynchronously (`dispatchCompleteEvent()`) |
| `shared.commands.AsyncSequenceCommand` | 359762 | Runs children in order (bootstrap sequences) |
| `shared.commands.AsyncParallelCommand` | 390779 | Runs children concurrently |
| `shared.commands.ResettableCompositeCommand` | 358427 | Re-runnable composite |
| `shared.commands.DynamicCommandSequence` | 657720 | Sequence built at runtime |
| `shared.mediator.TickableMediator` / `TabMediator` / `TickableTabMediator` | 366546 / 380087 / 464578 | Mediator variants with enterFrame tick / tab awareness |
| `onyx.mvcs.BaseActor` | 8798 | Base for models/services (event dispatch via `eventDispatcher`) |
| `onyx.mvcs.Actor` | 14236 | Actor with injected context |
| `onyx.mvcs.Mediator` | 140117 | Base view mediator |
| `onyx.mvcs.MainModuleCommunicationConfig` / `SubModuleCommunicationConfig` / `ModuleChannelIds` | 523730 / 523750 / 523747 | Inter-module channel wiring |
| `onyx.mvcs.events.ModuleEvent` / `ModuleChangeEvent` | 523769 / 45135 | Module lifecycle events |

### de.innogames.shared.util (31 classes)

Framework-level utilities used everywhere: game clock, JSON parsing, keyboard shortcut manager
with validators, MD5, number/display helpers, and the JS bridge.

| Class | Line | Role |
| --- | --- | --- |
| `clock.GameClock` | 658890 | Server-synced time source (`schedule(tickObject, ms)` / `unschedule`) |
| `clock.RefreshScheduler` | 659012 | Periodic refresh scheduling |
| `clock.TimeObject` | 659064 | Countdown/timestamp value |
| `shortcuts.ShortcutManager` | 659293 | Keyboard shortcut dispatch |
| `shortcuts.validators.HasBlockingWindowsValidator` | 659437 | Suppresses shortcuts behind modals |
| `parsers.HaxeJSONParser` | 66025 | Fast JSON parse into Haxe values (used on manifests) |
| `parsers.HaxeJSONExporter` | 659203 | JSON serialization |
| `Logger` | 658632 | Legacy logging entry point (no-op bodies in release) |
| `MD5` | 658661 | Hashing (request salting) |
| `NumberUtil` | 658670 | Number formatting/abbreviation |
| `ExternalUtil` | 658601 | JS interop (`evaluate`, `addCallback`) — see 01 §8.4 |
| `display.DisplayNamePicker` | 659086 | Player/entity display-name resolution |
| `ezcommand.EzCommand` | 366110 | Lightweight command helper |

### de.innogames.shared (3), de.innogames.shared.ui (3)

| Class | Line | Role |
| --- | --- | --- |
| `shared.IStage` / `shared.StageAdaptor` | 24066 / 657328 | Stage abstraction over the OpenFL stage (`StageAdaptor.get_instance()`) |
| `shared.UnitsPremiumCosts` | 657413 | Diamond costs for unit recruitment |
| `shared.ui.OnStageHandler` / `BaseOnStageHandler` | 658567 / 658489 | Runs callbacks on added/removed-from-stage |
| `shared.ui._HoverZone.TooltipHoverZone` | 658371 | Invisible hit area that triggers tooltips |

### de.innogames.strategycity.main (296 classes)

The application core shared by every screen: session/user state, city entity configs, settings,
module loading and the top-level command set. `.model` 187 (of which `.vo` 88, `.data` 41, 36
direct models, `.events` 13), `.controller` 46, `.view` 39, `.service` 15, `.utils`/`.constants` 9.
`service.CityProductionService` (L13130) is representative of the service style: subscribes to the
`getProductionQueue` push, batches `pickupProduction` by splicing accumulated entity ids, and uses
`handleOnlyLastPushResponses(["CityResourcesService.getResources"])`.

| Class | Line | Role |
| --- | --- | --- |
| `model.UserModel` | 661530 | Logged-in player state (id, name, race, guild, …) |
| `model.SettingsModel` | 661167 | Client settings |
| `model.ArmyModel` | 9290 | Owned units / squads |
| `model.ArmyDeploymentModel` | 660204 | Squad slots for an upcoming battle |
| `model.BattleDetailsModel` | 660394 | Pending/last battle descriptor |
| `model.KnowledgePointsModel` | 660699 | KP pool and regeneration |
| `model.NotificationModel` | 660783 | In-game notification queue |
| `model.ExpansionModel` | 660529 | City expansion inventory |
| `model.RunningActivitiesModel` | 15329 | Timers for in-progress activities |
| `model.ITickObject` | 10628 | `onTick(timeStep)` contract used with `GameClock` |
| `service.CityProductionService` | 13130 | Production queue RPC with push batching |
| `service.ModuleLoaderService` | 63029 | Loads/unloads feature modules |
| `service.PostStartupService` | 44713 | Deferred post-login data fetch |
| `service.PlayerProfileService` | 61111 | Profile read/write |
| `service.SettingsService` | 665431 | Settings persistence RPC |
| `controller.EnterPlayerCityCommand` | 659641 | Switches the client into a player city |
| `controller.event.OtherPlayerEvent` | 14528 | `'OtherPlayerEvent::visitPlayer'` — used by the extension's `localVisitPlayer.ts` |
| `utils.ApplicationParams` | 665537 | `get_instance().domElement` — the canvas container id |
| `utils.GameUrls` | 665676 | `get_instance()` URL table |

### de.innogames.strategycity.util (5), .shared (5), .constants (2), Version (1)

| Class | Line | Role |
| --- | --- | --- |
| `util.TextStyle` / `ITextStyle` | 26947 / 26911 | Font/colour/format style object |
| `util.TimeUtil` / `TimeConstants` / `FontSizeConverter` | 591620 / 666537 / 666531 | Time formatting, constants |
| `shared.service.ArmyService` / `IArmyService` | 666491 / 79678 | Unit recruit/revive/heal RPC |
| `shared.service.events.AddUnitEvent` / `RevivedUnitEvent` / `QuestDataServiceEvent` | 49754 / 666520 / 37247 | Push events |
| `constants.ColorConstants` / `Dimensions` | 659560 / 659563 | Palette, layout constants |
| `de.innogames.strategycity.Version` | 659548 | Client version constants (`getVersionString()`) |

### de.innogames.common.* (14), collections.resources (5), logging (6), diagnostics (10), trackers (8), utils (2), math (1)

| Class | Line | Role |
| --- | --- | --- |
| `common.map2D.Pathfinding` / `PathfindingNode` | 137842 / 138095 | Grid pathfinding |
| `common.map2D.PlacementMap` / `OutsidePlacementMap` / `ValueMap` / `ValueMapEntity` | 138350 / 137799 / 138120 / 138525 | Occupancy / value grids for building placement |
| `common.utils.ILocalInjector` | 8811 | Scoped DI injector contract (`inject(cls)`, `getOrCreateNewInstance`) |
| `common.utils.FunctionProvider` / `FlashPlayerUtil` | 138617 / 138574 | Function binding; legacy capability checks (`isDebug()`) |
| `common.utils.helper.MathHelper` / `StringHelper` / `CollectionHelper` | 138874 / 139006 / 138735 | helpers |
| `common.manifest.JsonManifestModel` | 137771 | reads `window.elvenloader.manifest` |
| `collections.resources.ResourceCollection` / `ObservableResourceCollection` / `Resource` | 137418 / 137522 / 137582 | id → amount collections with arithmetic |
| `collections.resources.filter.ResourceFilter` / `FilterResult` | 137666 / 137623 | |
| `logging.Logger` / `LogLevel` / `LogMetadata` / `LogMetadataBuilder` | 66200 / 66179 / 66334 / 66273 | Structured logging (`Logger.info(reporter, msg)`) |
| `logging.appender.ILogAppender` / `TraceLogAppender` | 139348 / 139357 | |
| `diagnostics.DiagnosticTool` + `collectors.*` (8) + `util.WebGL` | 139142 / 139163-139274 / 139288 | WebGL/environment probes |
| `trackers.IMetricsTracker` / `BaseMetricsTracker` / `MetricsTrackerType` + `fps.FrameRateTracker`, `time.FrameTimeTracker`, `memory.MemoryTracker`, `vram.VideoRAMTracker`, `events.MetricsTrackerEvent` | 41138 / 41157 / 666541 / 41203 / 666595 / 666580 / 666613 / 666553 | Runtime performance metrics |
| `utils.Collection` / `CallbackCollection` | 666635 / 142159 | |
| `math.InnoMath` | 139425 | interpolation, clamping, rounding |

---

## 2. `de.innogames.onyx.city.*` (3,364 classes, 52 sub-packages)

The city screen and everything that lives in it. Class names below are relative to
`de.innogames.onyx.city.`.

### city.ui (813)

The entire city-screen user interface: modal windows, the bottom/top HUD, entity tooltips, and the
"update behavior" system that refreshes widget contents from model state.

| ui.<sub> | Classes |
|---|---|
| windows | 564 |
| tooltips | 105 |
| behaviors | 77 |
| hud | 40 |
| provider | 20 |
| (direct) | 6 |
| events | 1 |

`ui.windows` splits further: `academy` (185 — crafting, cauldron/potions, spell brewing),
`construction` (69 — build menu, expansions, upgrades), `queuedproduction` (40), `portal` (39 —
guest race), `barrack` (37), `stages`/`components` (31 each), `workerhut` (15), `production` (14),
`unitinfo` (12), `producing` (11), `newsletter` (11), `knowledgepoints` (9), then small ones
(workshop, manufacture, upgrade, townhall, premium, armory, wishingwell, management, expiring,
culture, sell, factory, setbuildings, residential). `ui.behaviors` classes
(`UpdateBuildingInfoComponentBehaviour`, `UpdateConstructionTimeTextFieldBehaviour`, …) are small
strategy objects a mediator applies to refresh one visual element; `ui.provider.requirements`
turns a building config into requirement rows (culture, provisions, workers, size, time).

| Class | Line | Role |
|---|---|---|
| `ui.tooltips.EntityTooltipManager` | 58915 | Owns and swaps the tooltip for the hovered city entity |
| `ui.windows.academy.crafting.models.CraftingModel` | 25769 | Crafting recipes, ingredient stock, catalyst state |
| `ui.windows.academy.crafting.services.CraftService` | 36711 | Server calls for crafting recipes/craft actions |
| `ui.windows.academy.cauldron.models.CauldronModel` | 480945 | Cauldron brewing state |
| `ui.windows.academy.cauldron.models.PotionEffectsModel` | 67287 | Active potion effects and durations |
| `ui.windows.construction.ConstructionWindowMediator` | 496102 | Drives the build-menu window |
| `ui.windows.construction.ConstructionWindowDataProvider` | 496064 | Buildable-entity lists/categories |
| `ui.windows.construction.behaviors.ExpansionBehaviorFactory` | 496904 | Per-expansion-type purchase behaviours |
| `ui.behaviors.core.IUpdateBehaviorFactory` | 24581 | Factory contract for view-update behaviours |
| `ui.provider.requirements.PlaceRequirementsProvider` | 69007 | "Can I place this?" requirement set |
| `ui.provider.EntitySellCostsProvider` | 475914 | Sell/refund value of a city entity |
| `ui.provider.GoodsProvider` | 476106 | Goods amounts/icons for UI rows |
| `ui.hud.menu.OwnCityBottomMenuMediator` | 474860 | Own-city bottom menu bar |
| `ui.hud.menu.OtherCityBottomMenuMediator` | 474826 | Visiting-city bottom menu bar |
| `ui.tooltips.composite.base.CityCompositeTooltipMediator` | 477011 | Assembles multi-section tooltips |

### city.mainevents (657)

All limited-time "main event" mini-games and their pass systems: `shared` (374 — common event
chrome and the tile/merge/shuffle engines; inside it `components` 272, `models` 29, `commands` 29,
`events` 20, `configs` 11, `windows` 6, `services` 5), `seasonpass` (76), `royalpass` (37),
`eventleague` (29), `scroll` (28), `tile` (24), `theater` (24), `shuffle` (24), `merge` (23),
`tutorial` (15), `configs` (3).

| Class | Line | Role |
|---|---|---|
| `mainevents.shared.models.TileEventModel` | 14286 | Board state, tools and rewards for tile-grid events |
| `mainevents.shared.services.TileEventService` | 444353 | Tile-event moves/rewards RPC |
| `mainevents.shared.models.MergeEventModel` | 20333 | Merge-event orders and mergeable inventory |
| `mainevents.shared.services.MergeEventService` | 23184 | Merge/discard/generate RPC |
| `mainevents.shared.models.ShuffleEventModel` | 25051 | Shuffle-event packages and draw state |
| `mainevents.shared.services.ShuffleEventService` | 444324 | Shuffle draws RPC |
| `mainevents.shared.components.tileTools.TileToolManager` | 28703 | Tool selection, cursor, `TileEventToolEvent` dispatch |
| `mainevents.seasonpass.models.SeasonPassModel` | 21390 | Season pass tiers, progress, premium track |
| `mainevents.seasonpass.services.SeasonPassService` | 80080 | Season pass RPC |
| `mainevents.royalpass.models.RoyalPassModel` | 11395 | Royal pass progress/rewards |
| `mainevents.royalpass.services.RoyalPassService` | 427267 | Royal pass RPC |
| `mainevents.eventleague.models.EventLeagueModel` | 35920 | Event leaderboard/league standings |
| `mainevents.eventleague.services.EventLeagueService` | 423617 | League ranking fetches |
| `mainevents.tutorial.EventTutorialManager` | 34941 | Per-event onboarding sequencing |
| `mainevents.shared.events.TileEventToolEvent` | 56965 | Tool selected/unselected/used |

### city.ancientwonders (206)

Ancient Wonders: KP investment, rune shards/forging, contribution rankings, level bonuses, gallery
and detail windows. `views` 106, `tooltips` 23, `providers` 23, `models` 21, `commands` 21,
`events` 6, `configs` 4. `AncientWonderService` (L21115) is a thin RPC façade
(`getContributions`, `investKnowledgePoints`, `insertRuneShard`, `useBrokenShards`,
`getOtherPlayerAncientWonders` — the last one is what the extension calls from
`src/inject/local/localOpenAw.ts` / `fetchWorldNeighbors.ts`). The extension also instantiates
`commands.DisplayAncientWonderCommand` via the injector (`localOpenAw.ts`).

| Class | Line | Role |
|---|---|---|
| `ancientwonders.services.AncientWonderService` | 21115 | RPC façade: contributions, KP/rune investment, forging |
| `ancientwonders.models.IAncientWondersModel` | 20311 | Own-city AW phases/levels |
| `ancientwonders.models.OtherPlayerAncientWonderModel` | 21217 | AW data of a visited player |
| `ancientwonders.models.SpireAncientWonderModel` | 26058 | AW state used in Spire context |
| `ancientwonders.providers.AncientWondersBonusProvider` | 32803 | Per-level AW bonus values |
| `ancientwonders.providers.AncientWonderLevelsProvider` | 75787 | Level thresholds/next-level data |
| `ancientwonders.providers.requirements.AncientWondersRequirementsProvider` | 69029 | Placement requirements |
| `ancientwonders.commands.InvestKnowledgePointsCommand` | 373143 | Invest own KP into a wonder |
| `ancientwonders.commands.InvestFriendKnowledgePointsCommand` | 373130 | Invest KP into another player's wonder |
| `ancientwonders.commands.ForgeRuneShardsCommand` | 373069 | Forge broken shards |
| `ancientwonders.commands.InsertRuneShardsCommand` | 373087 | Insert rune shard |
| `ancientwonders.commands.AWContributionsController` | 372569 | Contribution list/ranking flow |
| `ancientwonders.commands.AWGalleryController` | 372632 | AW gallery browsing |
| `ancientwonders.commands.DisplayAncientWonderCommand` | 373000 | Opens another player's AW window (extension) |
| `ancientwonders.commands.OpenDetailWindowCommand` | 373168 | Opens the AW detail window |

### city.entities (199)

The behavioural model of a placed city entity: a state machine (`states` 101) whose states pick
`behaviors` (26) selected by `rules` (11) and gated by `guards` (24), plus `proxy` (14) wrappers,
`pickers` (10), `effects` (10). `BehaviorController` (L408485) is the hub: on each state change it
asks the rule configuration for click/over/enter behaviour infos, refreshes three behaviour caches
and executes the enter behaviours against the entity proxy.

| Class | Line | Role |
|---|---|---|
| `entities.proxy.controller.BehaviorController` | 408485 | Resolves/executes click/hover/enter behaviours per entity state |
| `entities.proxy.controller.IBehaviorCache` | 50481 | Cached behaviour set for one interaction kind |
| `entities.proxy.factories.CityProxyFactory` | 408687 | Builds entity proxies for the own city |
| `entities.proxy.factories.FriendProxyFactory` | 408738 | Builds proxies for a visited city |
| `entities.states.factories.EntityStatesFactory` | 411792 | Chooses the states factory per entity type |
| `entities.states.factories.ManualAndAutoProductionStatesFactory` | 411942 | State set for production buildings |
| `entities.states.factories.QueuedProductionStatesFactory` | 411971 | State set for queue-based producers |
| `entities.states.factories.AncientWonderStatesFactory` | 411819 | State set for wonders |
| `entities.states.factories.BarrackStatesFactory` | 411878 | State set for military buildings |
| `entities.states.BaseCityEntityState` | 409294 | Base state (enter/exit, listener plumbing) |
| `entities.rules.BehaviorRuleConfiguration` | 405628 | Declarative rule table state × mode → behaviours |
| `entities.states.behaviors.help.HelpBehaviorsFactory` | 410594 | Neighbourly-help interaction behaviours |
| `entities.effects.configs.EffectConfigHelper` | 406889 | Resolves building effect configs/values |
| `entities.BaseWrapperFactory` | 370365 | Wraps raw entity VOs for views |

### city.inventoryitems (175)

Player inventory: item configs, categories, use/disenchant flows and the inventory window.
`windows` 86, `tooltips` 31, `data` 21, `commands` 11, `events` 7, `providers` 5, `configs` 5,
`service` 3, `model` 3. `UseItemCommand` (L413598) branches per `InventoryItemCategory` to compute
granted resources before calling the service.

| Class | Line | Role |
|---|---|---|
| `inventoryitems.model.InventoryModel` | 26328 | Item stock, lookup by id, category grouping |
| `inventoryitems.model.InventoryItemConfigModel` | 416764 | Static item configs |
| `inventoryitems.service.IInventoryService` | 35567 | Inventory RPC contract |
| `inventoryitems.service.DisenchantService` | 49662 | Disenchant/spell-fragment RPCs |
| `inventoryitems.commands.UseItemCommand` | 413598 | Applies an item's effect |
| `inventoryitems.commands.UseItemOnCommand` | 414528 | Applies an item to a chosen target entity |
| `inventoryitems.commands.DisenchantBuildingCommand` | 413359 | Disenchant a building |
| `inventoryitems.commands.DisenchantSpellCommand` | 413505 | Disenchant a spell |
| `inventoryitems.commands.ProcessInventoryItemsCommand` | 413523 | Ingests server inventory payload |
| `inventoryitems.commands.UpdateInventoryModelCommand` | 413565 | Incremental inventory updates |
| `inventoryitems.providers.InventoryItemEffectValueProvider` | 416789 | Numeric effect value for an item level |
| `inventoryitems.windows.data.targets.factories.ItemTargetFactory` | 34632 | Valid targets for "use on" items |
| `inventoryitems.windows.factories.IInventoryWindowFactory` | 49883 | Inventory window/tab construction |
| `inventoryitems.events.InventoryModelEvent` | 26491 | Inventory changed |

### city.trade (174)

The trader: player-to-player trades, wholesaler, merchants, filtering/sorting/rating. `views` 91,
`commands` 15, `vos` 12, `models` 10, `events` 8, `tooltips` 7, `sorting` 6, `filtering` 6,
`rating` 5, `configs` 5, `validators` 4, `services` 4. `TradesModel` (L462082) keeps per-category
containers with the trade list, trade fee and fee reduction.

| Class | Line | Role |
|---|---|---|
| `trade.models.TradesModel` | 462082 | Per-category trade lists, fee and fee reduction |
| `trade.models.MerchantModel` | 461892 | Hired merchants and cooldowns |
| `trade.services.ITradeService` | 41689 | Trade RPC contract (create/accept/cancel) |
| `trade.services.IMerchantService` | 20232 | Merchant hire/refresh RPCs |
| `trade.commands.CreateTradeCommand` | 461256 | Post a new trade |
| `trade.commands.AcceptPlayerTradeCommand` | 461177 | Accept another player's offer |
| `trade.commands.AcceptWholesalerTradeCommand` | 461203 | Buy from the wholesaler |
| `trade.commands.CancelTradeCommand` | 461222 | Withdraw own offer |
| `trade.commands.GetOtherPlayersTradesCommand` | 461310 | Fetch the market list |
| `trade.commands.GetWholesalerTradesCommand` | 461340 | Fetch wholesaler rates |
| `trade.commands.HireMerchantCommand` | 461356 | Hire a merchant |
| `trade.commands.UpdateTradesModelCommand` | 461504 | Applies trade deltas |
| `trade.rating.TradeRatingFactory` | 462195 | Fair/good/bad trade rating |
| `trade.sorting.ITradeRatingProvider` | 42915 | Rating source used by sorters |

### city.engine (130)

The isometric rendering engine wrapper around the "snake" renderer: `snake` (43 — engine, entity
factory, layers, texture managers), `fx` (38), `camera` (14), `decorations` (10),
`viewporteffects` (9), `animations` (4). `IsoEngine` (L15944) extends `EventDispatcher` and owns
the placement map, render engine, entity factory, texture manager, layers, unlocked areas, camera
zoom and drag toggles, exposing `renderingPaused`. The extension captures
`snake.components.layers.SnakeInteractiveLayerMediator` (`window.aviad_silm`) to reach
`isoEngine.dispatchEvent(new IsoDecorationEvent(...))`, and `CityCameraController` via the
`_createCameraController` patch (`window.aviad2`).

| Class | Line | Role |
|---|---|---|
| `engine.snake.IsoEngine` | 15944 | Central iso engine: entities, layers, textures, grid, render loop |
| `engine.snake.IsoEntityFactory` | 18040 | Creates iso sprites for city entities |
| `engine.snake.components.layers.SnakeInteractiveLayerMediator` | 404275 | Interactive layer mediator (extension `aviad_silm`) |
| `engine.events.IsoDecorationEvent` | 48347 | `new IsoDecorationEvent(type, id)` (extension) |
| `engine.model.IsoEngineModel` | 36415 | Background decorations + last-render-state cache |
| `engine.camera.CityCameraController` | 398381 | Pan/zoom/navigate the city viewport |
| `engine.camera.CityCameraDragStrategyFactory` | 398468 | Default/disabled drag behaviour |
| `engine.camera.CityZoomer` | 398601 | Zoom level stepping |
| `engine.camera.CityNavigator` | 398558 | Centering/navigating to a tile or entity |
| `engine.controller.OwnCityTouchProcessor` | 399132 | Own-city pointer/touch dispatch |
| `engine.controller.OtherCityTouchProcessor` | 399114 | Visiting-city pointer dispatch |
| `engine.controller.CityConfigFactory` | 398700 | Engine/grid configuration |
| `engine.fx.IsoFxController` | 399454 | Spawns/pools in-world effects |
| `engine.snake.components.textures.ATFSnakeTextureManager` | 404463 | ATF texture atlas management |
| `engine.viewporteffects.commands.CreateHazeViewportEffectCommand` | 405534 | Full-screen haze effect |

### city.controller (123)

Application bootstrap and top-level city commands. `bootstrap` is the ordered sequence of
`Configure*Command` steps run at startup (`ConfigurationSequence`, then `post.PostConfigurationSequence`;
`console/*` holds the debug console + AS3Communicator setup — see 01 §8.4); the rest are
cross-cutting building operations. Detail in `03-bootstrap-di-commands-events.md`.

| Class | Line | Role |
|---|---|---|
| `controller.FeaturesController` | 390108 | Applies server feature flags/unlocks |
| `controller.bootstrap.ConfigurationSequence` | 390294 | Root startup sequence run by `MainModule` |
| `controller.bootstrap.ConfigureModelCommand` | 390605 | Registers model singletons in the injector |
| `controller.bootstrap.ConfigureServicesCommand` | 390808 | Registers network services |
| `controller.bootstrap.ConfigureControllerCommand` | 390347 | Maps events to commands |
| `controller.bootstrap.ConfigureIsoEngineCommand` | 390492 | Instantiates and wires the iso engine (`_createCameraController`) |
| `controller.bootstrap.ConfigureStartupDataCommand` | 390930 | Loads the initial player/city payload |
| `controller.bootstrap.ConfigureStaticBuildingDataCommand` | 391008 | Loads building static configs |
| `controller.bootstrap.ConfigureRaceCommand` | 390765 | Selects elf/human asset set |
| `controller.bootstrap.ConfigureShortcutsCommand` | 390850 | Registers keyboard shortcuts |
| `controller.bootstrap.ConfigureTutorialCommand` | 391080 | Installs tutorial instructions/triggers |
| `controller.bootstrap.console.ConsoleCommandsController` | 391944 | `sendConsoleCommandToClient` dispatcher (feature `show_console`) |
| `controller.UpgradeBuildingCommand` | 390244 | Starts a building upgrade |
| `controller.CancelConstructionCommand` | 390059 | Cancels an in-progress construction |
| `controller.InstantFinishConstructionCommand` | 390167 | Premium instant-finish |
| `controller.ChangeModuleCommand` | 390084 | Switches the active game module |

### city.commands (91)

Flat set of city-level commands: city entry/exit, production lifecycle, neighbourly help,
diplomacy and city creation. The extension instantiates `VisitOtherPlayerCommand` with an
`OtherPlayerEvent('OtherPlayerEvent::visitPlayer', playerId)` (`src/inject/local/localVisitPlayer.ts`).

| Class | Line | Role |
|---|---|---|
| `commands.EnterOwnCityCommand` | 387028 | Loads and shows the own city |
| `commands.EnterOtherCityCommand` | 386985 | Loads a visited player's city |
| `commands.VisitOtherPlayerCommand` | 387820 | Visit flow entry (extension) |
| `commands.LeaveOwnCityCommand` | 387128 | Tears down own-city view/state |
| `commands.LeaveOtherCityCommand` | 387100 | Leaves a visited city |
| `commands.AbstractCreateCityCommand` | 386675 | Shared city construction from server data |
| `commands.CreateOtherCityCommand` | 386962 | Builds the visited-city scene |
| `commands.PickupProductionCommand` | 387168 | Collect a finished production |
| `commands.FinishManualProductionCommand` | 387069 | Instant-finish a manual production |
| `commands.CancelAllProductionsCommand` | 386770 | Cancel every running production |
| `commands.DiscardProductionCommand` | 386972 | Discard a queued/finished production |
| `commands.PerformHelpNeighborCommand` | 387146 | Execute neighbourly help on a building |
| `commands.GetNeighbourlyHelpBuildingsCommand` | 387082 | Fetch helpable buildings in a city |
| `commands.BuildingChapterAdvanceCommand` | 386749 | Chapter-advance building changes |
| `commands.RefreshOtherPlayerCityCommand` | 387251 | Re-fetch a visited city |

### city.currencyevents (66)

Event-currency features (grand prize tracks, event panels/windows); mostly `views` (58).

| Class | Line | Role |
|---|---|---|
| `currencyevents.commands.UpdateEventCurrenciesCommand` | 395419 | Applies event currency balances |
| `currencyevents.commands.OpenEventCurrencyWindowCommand` | 395406 | Opens the event window |
| `currencyevents.commands.CurrencyEventEndedCommand` | 395388 | Cleanup when the event ends |
| `currencyevents.views.factories.EventWindowFactory` | 395526 | Builds the event window per event type |
| `currencyevents.views.panel.factories.EventPanelFactory` | 395959 | Builds the HUD event panel |
| `currencyevents.views.panel.EventPanelMediator` | 395687 | HUD event panel |
| `currencyevents.views.panel.MultiplayerEventPanelMediator` | 395774 | Panel variant for multiplayer events |
| `currencyevents.events.GrandPrizeEvent` | 395514 | Grand prize reached |
| `currencyevents.configs.CurrencyEventsConfiguration` | 395448 | Module wiring |

### city.crm3 (66)

CRM/marketing: interstitial popups pushed by the CRM backend, display points that trigger them,
and `ctas` (24) call-to-action handlers.

| Class | Line | Role |
|---|---|---|
| `crm3.models.CRMModel` | 28411 | Queued interstitials, seen state, display points |
| `crm3.services.CRMService` | 36925 | CRM backend RPCs |
| `crm3.ctas.CallToActionHandlerFactory` | 28390 | Maps a CTA id to its handler |
| `crm3.commands.ShowInterstitialCommand` | 394264 | Displays an interstitial |
| `crm3.commands.AcceptInterstitialCommand` | 394109 | User accepted → run CTA |
| `crm3.commands.RejectInterstitialCommand` | 394235 | User dismissed |
| `crm3.commands.DisplayPointReachedCommand` | 394149 | A tracked display point fired |
| `crm3.commands.ExecuteCallToActionCommand` | 394181 | Executes the resolved CTA |
| `crm3.commands.MarkInterstitialSeenCommand` | 394203 | Reports impression |
| `crm3.events.CRMCallToActionEvent` | 28548 | CTA request |

### city.view (64)

The city screen's own view layer: city view mediator, contextual footers shown when
placing/upgrading, loading screen, settings menu.

| Class | Line | Role |
|---|---|---|
| `view.CityViewMediator` | 510619 | Root mediator of the city screen |
| `view.footers.factories.FooterFactory` | 511252 | Chooses the footer for the current interaction |
| `view.footers.construction.normal.NormalPlaceFooterMediator` | 510707 | Place-building footer |
| `view.footers.construction.normal.NormalUpgradeFooterMediator` | 510746 | Upgrade footer |
| `view.footers.construction.premium.PremiumPlaceFooterMediator` | 510835 | Premium place footer |
| `view.footers.research.TechLockedFooterMediator` | 511313 | Footer for tech-locked buildings |
| `view.footers.workers.AddWorkerFooterMediator` | 511355 | Add-worker footer |
| `view.loading.LoadingScreenViewMediator` | 511373 | Loading screen |
| `view.loading.RandomLoadingScreenProvider` | 415825 | Picks loading art/tips |
| `view.settings.OptionMenuMediator` | 511435 | Settings menu |
| `view.settings.handlers.LogoutButtonHandler` | 511555 | Logout action |

### city.modes (57)

Interaction modes of the city grid (default / move / place / sell / expansion / tile tool) and the
commands that mutate the map inside a mode. `BuildBuildingSectorMode.placeBuilding` is the method
the extension's `injectMutate.ts` comment shows being patched.

| Class | Line | Role |
|---|---|---|
| `modes.controller.OwnCityInteractionModeController` | 455141 | Mode state machine for the own city |
| `modes.controller.OtherCityInteractionModeController` | 455091 | Restricted mode set when visiting |
| `modes.controller.AbstractInteractionModeController` | 454960 | Shared enter/exit plumbing |
| `modes.BuildBuildingSectorMode` | 453281 | Placement mode (`placeBuilding(e)`) |
| `modes.commands.PlaceCityEntityCommand` | 454489 | Commit a building placement |
| `modes.commands.MoveCityEntityCommand` | 454440 | Move an existing building |
| `modes.commands.RemoveCityEntityCommand` | 454790 | Sell/remove a building |
| `modes.commands.PlaceCityStreetCommand` | 454553 | Place a street path |
| `modes.commands.PlaceInventoryBuildingCommand` | 454750 | Place a building from inventory |
| `modes.commands.StartUpgradeEntityCommand` | 454835 | Begin an upgrade in-place |
| `modes.commands.UnlockCityAreaCommand` | 454902 | Buy/unlock an expansion area |
| `modes.handlers.ExpansionsModeHandler` | 455321 | Expansion-selection overlay |
| `modes.util.ExpansionsAreaProvider` | 455496 | Purchasable expansion areas |

### city.chat (51)

In-game chat: rooms, history, send/receive, unread state, `processors` (9) for message formatting.

| Class | Line | Role |
|---|---|---|
| `chat.model.IChatModel` | 36803 | Rooms, messages, unread counters |
| `chat.commands.SendChatMessageCommand` | 385279 | Sends a message |
| `chat.commands.GetChatHistoryCommand` | 385232 | Loads room history |
| `chat.commands.NewChatMessageCommand` | 385246 | Handles an incoming push message |
| `chat.commands.ReadChatRoomCommand` | 385263 | Marks a room read |
| `chat.events.ChatMessagePushedEvent` | 385354 | Server push |
| `chat.events.ChatRoomCreatedEvent` | 385372 | New room |
| `chat.configs.ChatConfiguration` | 385298 | Module wiring |

### city.challengeevents (46)

Timed "challenge" side-events. Almost all UI (`views` 35).

| Class | Line | Role |
|---|---|---|
| `challengeevents.services.ChallengeEventService` | 383969 | Challenge RPCs (progress, claim) |
| `challengeevents.commands.UpdateChallengeEventCommand` | 383894 | Applies progress updates |
| `challengeevents.commands.ShowChallengeEventRewardCommand` | 383875 | Shows the earned reward |
| `challengeevents.commands.ChallengeEventEndedCommand` | 383857 | End-of-event teardown |
| `challengeevents.events.ChallengeEventRewardEvent` | 79481 | Reward granted |
| `challengeevents.configs.ChallengeEventsConfiguration` | 383910 | Module wiring |

### city.buildingsets (39)

Building sets (adjacency-bonus groups): definitions, per-set connection state, overview window,
move warnings.

| Class | Line | Role |
|---|---|---|
| `buildingsets.models.BuildingSetsModel` | 382973 | Set membership and connection state |
| `buildingsets.models.SetOverviewsModel` | 383132 | Set overview/progress data |
| `buildingsets.staticdata.LoadBuildingSetsCommand` | 383207 | Loads set static configs |
| `buildingsets.staticdata.LoadSetOverviewsCommand` | 383223 | Loads set overview configs |
| `buildingsets.commands.ShowSetOverviewWindowCommand` | 382586 | Opens the set overview |
| `buildingsets.commands.ShowMoveWarningAlertWindowCommand` | 382562 | Warns before breaking a set |
| `buildingsets.configs.BuildingSetsConfiguration` | 382598 | Module wiring |

### city.spells (34)

Enchantment casting in the city: guards (can I cast?), behaviours (targeting), animations, spell
sub-menu. The RPC lives in `onyx.shared.spells.services.SpellService` (`castSpellOnBuilding`,
used by the extension's `castEe.ts`).

| Class | Line | Role |
|---|---|---|
| `spells.commands.EnchantBuildingCommand` | 460018 | Applies a spell to a building |
| `spells.commands.StartSpellActivationCommand` | 460069 | Enters spell-casting mode |
| `spells.factories.CastSpellBehaviorsFactory` | 63958 | Cast behaviour per spell type |
| `spells.factories.CanCastSpellGuardsFactory` | 66955 | Guard per spell type |
| `spells.behaviours.CastSpellOnBuildingBehavior` | 459949 | Target-a-building cast flow |
| `spells.behaviours.CastTeleportSpellBehavior` | 459976 | Teleport spell flow |
| `spells.guards.CanCastSpellOnBuildingGuard` | 460198 | Validates building target |
| `spells.animations.CastSpellOnBuildingAnimation` | 459870 | Cast VFX |
| `spells.menu.SpellsSubMenuMediator` | 460299 | Spell selection sub-menu |
| `spells.events.CastSpellEvent` | 80634 | Cast request |

### city.notifications (33)

The notification centre: fetch/preview/read state, per-type "extensions" adding a contextual
action (visit player, open wonder, accept trade, fellowship invite), tooltips.

| Class | Line | Role |
|---|---|---|
| `notifications.commands.GetNotificationsCommand` | 456275 | Loads the notification list |
| `notifications.commands.GetNotificationPreviewsCommand` | 456256 | Loads HUD previews |
| `notifications.commands.SetPlayerNotificationStateCommand` | 456293 | Marks visited/helped state |
| `notifications.view.NotificationWindowMediator` | 456824 | Notification window |
| `notifications.view.extensions.NotificationExtensionFactory` | 457015 | Per-type action extension |
| `notifications.view.extensions.player.VisitPlayerExtension` | 457228 | Visit/help-back action |
| `notifications.view.extensions.player.VisitPlayerStateFactory` | 457273 | State config for the visit button |
| `notifications.view.factories.NotificationWindowsFactory` | 457363 | Builds notification windows |
| `notifications.events.NotificationUpdateEvent` | 456375 | Notification changed |

### city.offers (30)

Premium/starter offers: model + service, HUD offer panel, starter offer window.

| Class | Line | Role |
|---|---|---|
| `offers.models.OfferModel` | 457541 | Active offers, expiry, purchase state |
| `offers.services.OfferService` | 457723 | Offer fetch/purchase RPCs |
| `offers.commands.UpdateOffersCommand` | 457411 | Applies offer list updates |
| `offers.commands.OffersUpdatedCommand` | 457380 | Post-update view refresh |
| `offers.commands.RemoveOfferCommand` | 457399 | Drops an expired/consumed offer |
| `offers.views.panels.OfferPanelMediator` | 457910 | HUD offer panel |
| `offers.views.windows.StarterOfferWindowMediator` | 458153 | Starter offer window |
| `offers.constants.OfferIconProvider` | 457460 | Race-correct offer icons |

### city.treasure (28)

Chests/treasures spawned in the city (incl. video-ad and neighbourly-help treasures): placement,
open flow, guards. The extension captures `model.TreasureViewModel` (`window.aviad_tv`,
`getTreasures(type)`) and `onyx.networking.services.TreasureService` (`window.aviad_ts`) for
`localCollectEventTreasure.ts`.

| Class | Line | Role |
|---|---|---|
| `treasure.commands.OpenTreasureCommand` | 469120 | Opens a treasure and grants reward |
| `treasure.commands.OpenVideoAdTreasureCommand` | 469145 | Rewarded-video treasure flow |
| `treasure.CityMapController` | 469077 | Places/updates treasures on the map |
| `treasure.model.TreasureViewModel` | 80872 | Treasure list/positions for the view (extension `aviad_tv`) |
| `treasure.model.PositionHelper` | 469495 | Finds free tiles for spawning |
| `treasure.commands.guards.CanOpenTreasure` | 469276 | Open eligibility guard |
| `treasure.commands.guards.OnlyInOwnCity` | 469349 | Context guard |
| `treasure.view.TreasureBlimp` | 469539 | In-world treasure marker |
| `treasure.events.TreasureRewardsEvent` | 45105 | Reward payload |

### city.shortcuts (26)

Keyboard shortcut commands — one class per bound action.

| Class | Line | Role |
|---|---|---|
| `shortcuts.ShortcutEvent` | 41678 | Shortcut-pressed |
| `shortcuts.OpenConstructionMenuCommand` | 459080 | Opens the build menu |
| `shortcuts.OpenInventoryCommand` | 459127 | Opens inventory |
| `shortcuts.OpenTechTreeCommand` | 459261 | Opens research |
| `shortcuts.OpenTraderCommand` | 459281 | Opens the trader |
| `shortcuts.OpenWorldMapCommand` | 459307 | Switches to the world map |
| `shortcuts.ActivateNeighborlyHelpCommand` | 458924 | Toggles NH mode |
| `shortcuts.ChangeTabCommand` | 458990 | Cycles window tabs |
| `shortcuts.SetDefaultModeCommand` | 459398 | Escapes back to default mode |
| `shortcuts.LogoutCommand` | 459042 | Logout |

### city.upgrade (25)

Building-upgrade support: requirement creators, upgrade/overview tab creators, upgrade window bodies.

| Class | Line | Role |
|---|---|---|
| `upgrade.providers.UpgradeRequirementsProvider` | 79223 | Aggregates all upgrade requirements |
| `upgrade.providers.UpgradeStatusProvider` | 52427 | Whether an upgrade is possible/blocked |
| `upgrade.providers.UpgradeChapterRequirementCreator` | 509955 | Chapter requirement row |
| `upgrade.providers.UpgradeWorkerRequirementCreator` | 510076 | Worker requirement row |
| `upgrade.creators.UpgradeTabsFactory` | 509750 | Upgrade tabs per building type |
| `upgrade.creators.OverviewTabsFactory` | 509693 | Overview tabs |
| `upgrade.behaviors.UpdateBehaviorFactory` | 509574 | View-refresh behaviours |
| `upgrade.data.UpgradeRequirements` | 509799 | Requirement value object |

### city.sounds (21)

City audio: race-specific background/effect providers, sound theme, play commands.

| Class | Line | Role |
|---|---|---|
| `sounds.CitySoundTheme` | 459479 | Active city sound theme |
| `sounds.commands.PlayEntitySoundCommand` | 459597 | Plays a building's sound |
| `sounds.commands.PlayCollectResourceSoundCommand` | 459586 | Collect SFX |
| `sounds.commands.PlayStartProductionSoundCommand` | 459654 | Production start SFX |
| `sounds.commands.PlayOpenWindowSoundCommand` | 459617 | Window open SFX |
| `sounds.background.ElvesCityBackgroundSoundsProvider` / `HumansCityBackgroundSoundsProvider` | 459553 / 459579 | Ambience |
| `sounds.effects.CitySoundIds` | 459718 | Sound id constants |

### city.tutorial (15)

City-specific tutorial primitives: grid highlight/spotlight/arrow actions, camera lock/zoom
actions, grid-click/navigate triggers.

| Class | Line | Role |
|---|---|---|
| `tutorial.AbstractCityInstruction` | 469687 | Base class for city tutorial steps |
| `tutorial.actions.HighlightCityGridAction` | 469895 | Highlights grid tiles |
| `tutorial.actions.SpotlightCityGridAction` | 470133 | Spotlight overlay on tiles |
| `tutorial.actions.LockCityCameraAction` | 469921 | Freezes the camera |
| `tutorial.actions.LockCityGridAction` | 469935 | Blocks grid interaction |
| `tutorial.triggers.CityGridClickTrigger` | 470261 | Advances on tile click |
| `tutorial.triggers.NavigateToCityGridTileTrigger` | 470304 | Advances when a tile is reached |
| `tutorial.config.CityGridAreaConfig` | 470227 | Tile/area definitions for steps |

### city.transcendence (14), city.events (14), city.modules (13), city.model (13)

| Class | Line | Role |
|---|---|---|
| `transcendence.control.TranscendenceController` | 15628 | Transcendence (building-evolution) state/actions |
| `transcendence.view.TranscendenceFooter` / `TranscendenceFx` / `tooltip.TranscendenceTooltip` | 468131 / 468645 / 468777 | Footer, VFX, tooltip |
| `transcendence.config.TranscendenceConfiguration` | 468013 | Module wiring |
| `events.CityEvent` | 412059 | Generic city lifecycle event (`CityEvent::ENTER_OWN_CITY`, `::ENTER_OTHER_CITY`) |
| `events.CityEntityEvent` | 49311 | Entity added/changed/removed |
| `events.CityCameraEvent` | 412038 | Camera moved/zoomed |
| `events.EntityProductionEvent` | 412113 | Production started/finished/collected |
| `events.OpenEntityWindowEvent` | 69054 | Request to open a building's window |
| `events.ExceededResourceLimitEvent` | 412130 | Storage cap hit |
| `events.HighlightEvent` (+ `HighlightType` L412160) | 412143 | Highlight request |
| `events.ReplaceEntityEvent` | 58819 | Entity swap (e.g. chapter advance) |
| `modules.core.ModuleStateMachine` | 455669 | Transitions between top-level modules (own city / other city / world map / tech tree / spire / battle) |
| `modules.core.IModuleState` | 455653 | Module state contract |
| `modules.states.AbstractLoadingModuleState` | 455740 | Shared load-then-enter behaviour |
| `modules.states.OwnCityModuleState` / `OtherCityModuleState` / `WorldMapModuleState` / `SpireModuleState` / `TechTreeModuleState` | 455799 / 455779 / 455875 / 455831 / 455842 | Module states |
| `model.ApplicationModel` | 10650 | Global app/session state incl. current interaction mode, `injector`, `gameLoaded` observable (extension `aviad_am`) |
| `model.CityEntitiesModel` | 451695 | All placed entities of the current city |
| `model.CityEntityConfigsModel` | 452081 | Static entity/building configs |
| `model.OwnCityEntityProxyModel` / `OtherCityEntityProxyModel` / `AbstractCityEntityProxyModel` | 452765 / 452747 / 451608 | Proxy models backing the grid |
| `model.FriendCityEntitiesModel` | 452570 | Entities of a friend's city |
| `model.InventoryCityBuildingsModel` | 452728 | Buildings currently held in inventory |

### city.inhabitants (12), city.igel (12), city.streets (11), city.neighborlyhelp (10), city.ingameshop (10)

| Class | Line | Role |
|---|---|---|
| `inhabitants.StreetInhabitantManager` | 27329 | Spawns/updates walking NPCs |
| `inhabitants.InhabitantsStreetsProvider` | 412929 | Walkable street segments |
| `inhabitants.render.StreetInhabitantRenderer` / `InhabitantRenderConfigSystem` | 413217 / 413197 | Rendering |
| `inhabitants.data.SpawnedStreetInhabitant` / `StreetInhabitantSettings` | 413130 / 413172 | NPC instance / settings |
| `igel.commands.ShowInGameEmailWindowCommand` / `SaveInGameEmailCommand` | 412341 / 412329 | In-game email ("IGEL") window |
| `igel.factory.InGameEmailWindowsFactory` / `igel.windows.InGameEmailWindowMediator` / `igel.events.AddInGameEmailEvent` | 412404 / 412420 / 68791 | |
| `streets.StreetPathCalculator` | 460828 | Computes street paths (weighted) |
| `streets.StreetWeightMap` / `StreetPlacementMap` / `StreetTilesBuildChecker` / `BuildStreetRenderer` / `StreetPathData` | 461090 / 18161 / 461043 / 460545 / 460966 | Street placement pipeline |
| `neighborlyhelp.commands.PerformQuickNeighborlyHelpCommand` | 455886 | Executes quick help |
| `neighborlyhelp.views.QuickNeighborlyHelpWindowMediator` / `BuildingHelpItemRenderer` | 456021 / 455935 | Quick-help window |
| `neighborlyhelp.events.QuickNeighborlyHelpEvent` / `configs.NeighborlyHelpConfiguration` | 52314 / 455899 | |
| `ingameshop.models.InGameShopModel` / `services.InGameShopService` | 51186 / 51393 | Premium in-game shop |
| `ingameshop.views.InGameShopWindowMediator` / `renderers.ShopItemRenderer` | 412560 / 412676 | |

### city.queuedproduction (8), city.decorations (8), city.configs (8), city.utils (7), city.stages (6), city.service (6), city.products (6), city.milestone (6), city.fx (6)

| Class | Line | Role |
|---|---|---|
| `queuedproduction.commands.FinishQueueProductionCommand` / `CancelQueueProductionCommand` / `UpgradeQueueProductionCommand` / `QueuedProductionSlotFinishedCommand` | 458360 / 458330 / 458396 / 458382 | Slot-queue production buildings |
| `queuedproduction.configs.QueuedProductionConfiguration` | 458418 | wiring |
| `decorations.CityGroundDecorator` / `EnhancementsDecorator` / `loader.ATFEnhancementsLoader` / `IFriendCityGroundDecorator` | 398018 / 398114 / 398212 / 49049 | Ground decorations & enhancement overlays |
| `configs.CityConfiguration` / `MainModuleConfiguration` / `CityViewConfiguration` / `NetConfiguration` / `FeaturesConfiguration` / `ShortcutsConfig` | 389892 / 389942 / 389913 / 389961 / 389931 / 389998 | DI wiring for the city module (see 03) |
| `utils.PerformanceMetricsLogger` / `PerformanceLogger` / `debug.MetricsTrackersFactory` / `debug.MetricsStatsMediator` / `debug.FPS` | 510300 / 510258 / 510573 / 510541 / 510497 | Perf instrumentation |
| `stages.commands.ShowStageOverviewCommand` / `views.multipickup.MultiPickupContainer` / `MultiPickupRenderer` / `events.ShowStageOverviewEvent` | 460442 / 460458 / 460504 / 44048 | Stage overview + multi-pickup |
| `service.NotificationService` | 458794 | Notification RPCs |
| `service.NeighborlyHelpService` | 458771 | Neighbourly-help RPCs (`helpPlayer`, `performAction` — extension `neighbourlyHelp.ts`/`localHelpPlayer.ts`) |
| `service.OtherPlayerService` | 14500 | Fetch another player's city/profile (`getNeighbourlyHelpBuildings` — extension `receivedNeighbourHelpBuildings.ts`) |
| `service.CityInformationService` | 66843 | City summary/info RPCs |
| `products.ProductUnlocker` / `UnitProductUpdater` / `UnitOriginUpdater` | 458177 / 458241 / 458203 | Product/unit unlocking with tech progress |
| `milestone.views.window.MilestoneWindowMediator` / `panel.MilestoneEventPanelMediator` / `configs.MilestoneConfiguration` / `tutorial.AnimateMilestoneHudAction` | 451492 / 451416 / 451364 / 451388 | Milestone events |
| `fx.managers.FxManager` / `factories.FxFactory` / `creators.IsoFxCreator` / `creators.UiFxCreator` / `FxType` | 412257 / 412234 / 412172 / 412185 / 400175 | Effect creation/pooling |

### city.services (4), configurations (4), culture (3), blimps (3), barrack (3), rewards (2), providers (2), armory (2), population (1), constants (1)

| Class | Line | Role |
|---|---|---|
| `services.CityMapService` | 458840 | City map RPCs (`placeBuilding` — see the `injectMutate.ts` comment recipe) |
| `services.BattleRetreatService` / `DiplomacyCancelService` | 458820 / 50004 | Retreat / cancel negotiation |
| `configurations.IInfoTextConfiguration` / `IButtonConfiguration` / `IInfoTextConfigurationCapable` | 386071 / 390038 / 36843 | widget config contracts |
| `culture.models.CultureModel` / `CultureBonus` / `data.CultureState` | 10752 / 395380 / 395318 | Culture points, satisfaction, bonus |
| `blimps.NeighborlyHelpBlimp` / `CauldronPortraitBlimp` / `VideoAdPortraitBlimp` | 382517 / 382494 / 382543 | In-world callouts |
| `barrack.models.UnitsTrainingModel` / `providers.UnitBonusProvider` | 382397 / 24120 | Training queue / unit bonuses |
| `rewards.factories.RewardWindowFactory` / `CityRewardWindow` | 458751 / 458744 | Reward popup |
| `providers.CitySquadSizeProvider` / `ICitySquadSizeProvider` | 458315 / 38416 | Squad size |
| `armory.providers.ArmoryBonusProvider` / `IArmoryBonusProvider` | 382362 / 43827 | Armory bonus |
| `population.models.PopulationModel` | 13791 | Available vs required population |
| `constants.ApplicationConstants` | 390048 | Global constants (`COPYRIGHT`, …) |

---

## 3. `de.innogames.onyx.shared.*` (2,259 classes, ~60 sub-packages)

Everything reused by more than one game module (city, world map, battle, tech tree, spire). Same
MVCS split as §0. Names relative to `de.innogames.onyx.shared.`.

### shared.ui (875)

The shared widget toolkit and window framework built on Feathers/Starling/innogui: windows and
their decorators, the HUD, the composite tooltip engine, buttons/tables/lists/scrollbars, context
menus, style constants. The extension captures `ui.components.pagination.Pagination`
(`window.aviad_pagination_a`) and drives `_onSelectNextPage()` on the one whose `parent` is a
`ranking.views.tabs.tabbodies.PlayerRankingBody` (`src/inject/local/localNextPage.ts`).

| ui.<sub> | Count | Content |
|---|---|---|
| components | 307 | Buttons (45), tables (38), images (25), text (19), progress bars (19), scrollbars (13), lists, combo boxes, pagination, plus the 93-class `contextmenu` sub-framework |
| windows | 176 | `BaseWindow`/`FeathersWindow`, tab windows, decorators, news, relics, battle result, profile, account settings, confirmation/premium dialogs |
| tooltips | 141 | The `composite` tooltip engine (130): compositions, element handlers, data converters |
| hud | 134 | Top/bottom HUD groups, resource fields (47), quest HUD (42), HUD tooltips (29) |
| playerpanel | 26 | Player info panel widgets |
| styles | 19 | `TextStyles`, `WindowStyles`, `ButtonStyles`, `FontNames`, `StyleBuilder`, … |
| provider | 11 | Requirements/costs/benefit description providers |
| events | 10 | Generic view events (`ButtonEvent`, `WindowEvent`, `ViewEvent`, …) |
| backgrounds, squad, behaviors, context, unit, image, builders, scroll, menu, containers, initiativeBar, factories | ≤ 8 each | Small helpers |

| Class | Line | Role |
|---|---|---|
| `ui.tooltips.BaseTooltipManager` | 10134 | Owns the active tooltip, hover delay timer, tooltip pool |
| `ui.tooltips.UITooltipManager` | 10276 | UI-layer specialisation |
| `ui.tooltips.composite.base.TooltipCompositionManager` | 604357 | Resolves a tooltip composition for a data type |
| `ui.tooltips.composite.base.AbstractTooltipDataConverter` | 367136 | Domain object → tooltip element data |
| `ui.windows.BaseWindow` | 11862 | Root class of every shared window |
| `ui.windows.decorators.AbstractWindowDecorator` | 371059 | Frame/title/close-button decoration |
| `ui.windows.factory.IWindowsFactory` | 19308 | Central window creation contract |
| `ui.windows.tabwindow.BaseTabWindow` (+ `BaseTabsCreator` L463295) | 12056 | Tabbed window base |
| `ui.hud.BaseGameHud` | 474669 | Top HUD group + bottom menu group container |
| `ui.hud.GameHudFactory` | 597953 | Builds the HUD for the active module |
| `ui.hud.HudBlimpsManager` | 13851 | Routes floating reward blimps to HUD resource fields |
| `ui.components.contextmenu.ContextMenuManager` / `ContextMenuController` | 586763 / 586673 | Right-click / player / guild context menus |
| `ui.components.buttons.ButtonFactory` (+ `ButtonSkinFactory` L63984) | 70725 | Button construction |
| `ui.components.table.Table` (+ `PaginatedTable` L376470) | 483064 | Generic table with pluggable renderers |
| `ui.components.pagination.Pagination` | 75946 | Pager widget (`_onSelectNextPage`, extension `aviad_pagination`) |
| `ui.events.WindowEvent` | 597622 | `"WindowEvent::addWindow"` etc. — how windows are shown |

### shared.guilds (288)

Full fellowship ("guild") feature: membership lifecycle (apply, invite, accept, expel, leave,
disband), roles, perks/progression, 182 view classes for the guild window tabs. The extension
parses guild member data via `localProcessGuildData.ts` (wire VOs; see `05-services-catalog.md`).

| Class | Line | Role |
|---|---|---|
| `guilds.models.GuildModel` | 554117 | User guild, visited guild, membership requests (`BaseActor` + `ITickObject`) |
| `guilds.models.perks.PerkModel` / `GuildProgressionModel` | 554267 / 554194 | Perk levels; guild XP/level |
| `guilds.models.roles.Roles` | 554456 | Leader/CoLeader/Ambassador/Member permission objects |
| `guilds.services.GuildService` | 554528 | Guild RPC endpoint |
| `guilds.services.GuildProgressionService` | 554498 | Perk/progression RPC |
| `guilds.commands.OpenGuildWindowCommand` | 553617 | Entry point for the guild window |
| `guilds.commands.UpgradePerkCommand` | 553913 | Perk upgrade flow |
| `guilds.commands.ExpelPlayerCommand` / `CreateGuildCommand` | 553432 / 553372 | |
| `guilds.views.factories.GuildWindowFactory` / `GuildTabFactory` / `GuildAlertFactory` | 556422 / 556380 / 556290 | Window/tab/alert construction |
| `guilds.vos.wrappers.Guild` (+ `GuildMember` L562356, `GuildBanner` L562173) | 562052 | Guild VO wrappers |
| `guilds.vos.wrappers.MembershipRequestWrapperFactory` | 562490 | Application/invitation wrappers |

### shared.rewards (149)

The generic reward pipeline: raw server reward payloads → `Reward` data via ~28 typed
`*RewardCreator`s → display widgets via `RewardViewFactory`; pending/episodic/weighted/flexible
reward models; the reward selection-kit ("choose one of N") flow.

| Class | Line | Role |
|---|---|---|
| `rewards.data.RewardSet` | 567976 | Container of all rewards from one grant |
| `rewards.creators.RewardCreator` | 576045 | Dispatching creator picking the typed creator per reward kind |
| `rewards.creators.AbstractRewardCreator` | 575553 | Base for `Building`/`Unit`/`Resource`/`Spell`/`RuneShard`/… creators |
| `rewards.factories.RewardViewFactory` / `RewardWrapperFactory` | 576716 / 576756 | Reward views / wrappers |
| `rewards.models.PendingRewardsModel` | 576870 | Rewards awaiting a popup |
| `rewards.models.EpisodicRewardsModel` / `WeightedRewardsModel` / `FlexibleRewardsModel` | 576807 / 576906 / 576846 | |
| `rewards.models.RewardSelectionKitsModel` | 11809 | Selection-kit state |
| `rewards.services.EpisodicRewardsService` | 576958 | Episodic reward RPC |
| `rewards.commands.ShowPendingRewardWindowsCommand` | 575410 | Drains the pending queue into windows |
| `rewards.views.RewardWindowMediator` / `RewardSelectionKitWindowMediator` | 577730 / 577415 | Reward popup / pick-your-reward window |
| `rewards.views.behaviors.RewardIconProvider` | 577798 | Reward type → icon |

### shared.quests (140)

Quest system: `QuestModel` (quest list + id map, states, conditions, rewards); the quest info window
is built from swappable modules (background, description, grid, milestones, rewards).

| Class | Line | Role |
|---|---|---|
| `quests.models.QuestModel` | 569579 | Quest list + id map, state transitions |
| `quests.models.Quest` | 569381 | Single quest VO |
| `quests.models.QuestMilestonesModel` | 33800 | Milestone groups and progress |
| `quests.models.QuestGiverNamesModel` | 569556 | Quest-giver names |
| `quests.services.QuestDataService` | 570869 | Quest RPC endpoint |
| `quests.services.QuestMilestoneService` | 52838 | Milestone RPC |
| `quests.commands.AdvanceQuestCommand` | 568634 | Completes/advances a quest |
| `quests.commands.OpenQuestWindowCommand` | 568821 | Opens quest info window |
| `quests.commands.CollectQuestMilestoneRewardCommand` | 568756 | Claims milestone reward |
| `quests.commands.CheckForAccomplishedTutorialQuestsCommand` | 568722 | Tutorial quest bridge |
| `quests.questInfoWindow.mediators.QuestWindowMediator` | 570206 | Classic quest window |
| `quests.views.ModuleQuestWindowMediator` | 570897 | Modular quest window |
| `quests.views.modules.grid.QuestGridModuleMediator` / `milestones.QuestMilestonesModuleMediator` | 571547 / 572592 | |
| `quests.questInfoWindow.ui.conditions.components.factories.QuestConditionComponentFactory` | 570781 | Row widget per quest condition type |

### shared.messaging (91)

In-game mail: inbox/outbox mailboxes, composition, conversation posts, report-player flow.
`MessageService` exposes `fetchMessages(mailboxType, offset, count)` and friends. The extension
parses message overviews in `src/elvenar/processMessageOverview.ts`.

| Class | Line | Role |
|---|---|---|
| `messaging.service.MessageService` | 564842 | Mail RPC: fetch/send/reply/remove/mark-read |
| `messaging.model.MessageModel` / `Mailbox` | 564435 / 564349 | Mailboxes and current conversation / one paged mailbox |
| `messaging.providers.MessageProvider` | 564740 | Lazy paged message supplier |
| `messaging.controller.GetMessagesCommand` / `SendMessageCommand` / `ReplyToMessageCommand` / `ShowReportPlayerWindowCommand` | 564087 / 564233 / 564204 / 564281 | |
| `messaging.view.MessageWindowsFactory` / `MessageWindowMediator` | 564973 / 564953 | Mail windows |
| `messaging.view.tabs.MessageTabsFactory` | 566799 | Inbox/outbox/new-message tabs |
| `messaging.view.mailboxes.MessagesBodyMediator` / `NewMessageBodyMediator` | 566525 / 566713 | |
| `messaging.view.itemrenderer.MessageItemRenderer` | 565838 | Message row with pluggable states |
| `messaging.view.tooltips.MessageRecipientsTooltipMediator` | 566883 | Recipient list tooltip |

### shared.ranking (85)

Leaderboards for players, guilds, tournaments, the Spire, guild events, tech unlocks.
`RankingModel` keeps one `RankingContainer` per `RankingCategory` (TOURNAMENT / PLAYER / GUILD /
GUILD_EVENT / …), each holding paginated `RankingPage`s. The extension pages through
`PlayerRankingBody` (`localNextPage.ts`) and parses `PlayerRankingVO`s (`localProcessRankingsData.ts`).

| Class | Line | Role |
|---|---|---|
| `ranking.models.RankingModel` / `RankingContainer` / `RankingOverviewModel` | 573728 / 573641 / 573783 | Category → pages; compact "your rank" |
| `ranking.models.data.RankingFactory` | 574077 | Typed ranking entries from raw data |
| `ranking.service.RankingService` | 574174 | Ranking RPC endpoint |
| `ranking.commands.GetRankingCommand` / `GetRankingOverviewCommand` / `UpdatePlayerRankCommand` | 573502 / 573514 / 573535 | |
| `ranking.views.RankingWindowsFactory` / `tabs.RankingTabFactory` | 574259 / 574289 | Window / per-category tabs |
| `ranking.views.tabs.tabbodies.AbstractRankingBodyMediator` | 521785 | Shared paging/scroll logic |
| `ranking.views.tabs.tabbodies.PlayerRankingBody` | 574829 | Player ranking tab body (extension) |
| `ranking.views.tabs.components.RankingTable` | 522038 | Base ranking table |
| `ranking.views.tabs.components.renders.rows.RankingRowHighlighter` | 574596 | Highlights own player/guild rows |
| `ranking.constants.RankingCategory` | 416143 | Category enum |

### shared.unit (58), shared.tooltips (51)

| Class | Line | Role |
|---|---|---|
| `unit.config.UnitConfig` / `UnitConfigCollection` | 613558 / 613748 | Static unit definitions (abilities, buffs, origin, class) |
| `unit.config.UnitAttributeCalculator` | 38959 | HP/damage/range from config + level |
| `unit.config.UnitAbility` / `UnitBuff` | 613419 / 613464 | |
| `unit.squad.SquadCollection` / `SquadFactory` | 614799 / 614867 | Unit-type → squad map |
| `unit.info.factories.UnitWindowInfoProvider` | 69524 | Feeds the unit info window |
| `unit.info.tooltips.data.UnitTooltipDataBuilder` | 614186 | Tooltip data from a unit |
| `unit.info.tooltips.handlers.ElementHandlerUnitDamageBonus` / `ElementHandlerUnitAbilities` | 614455 / 614309 | Tooltip sections (~25 such handlers) |
| `unit.info.windows.UnitInfoHelper` | 614725 | |
| `tooltips.calculators.BonusValueCalculatorProvider` / `formaters.BonusValueFormatterProvider` | 20571 / 20621 | Pick calculator/formatter per effect id (~28 calculators, ~17 formatters) |
| `tooltips.calculators.DefaultBonusCalculator` / `EffectCounterCalculator` / `AWCombinedLevelsBonusCalculator` | 581577 / 581631 / 581386 | |
| `tooltips.formaters.DefaultBonusFormatter` | 582265 | |
| `tooltips.handlers.ElementHandlerEffectList` / `tooltips.EffectGenericTooltip` / `tooltips.data.EffectTooltipData` | 582818 / 581339 / 514745 | |

### shared.tutorial (48), shared.blimps (31), shared.options (30), shared.sounds (27), shared.indicators (26)

| Class | Line | Role |
|---|---|---|
| `tutorial.model.TutorialModel` | 26592 | Tutorial state and step collections |
| `tutorial.TutorialChecker` | 17129 | Global "is tutorial active/blocking" predicate |
| `tutorial.commands.ContinueTutorialFlowCommand` / `ActivateTutorialCommand` / `MapTutorialActorCommand` | 583402 / 583363 / 583435 | |
| `tutorial.actions.spotlight.SpotlightAction` / `DisplayArrowAction` / `TutorialArrowsFactory` | 470074 / 469779 / 583313 | |
| `tutorial.displayObjects.TutorialDisplayObjectsFactory` | 583616 | Adapts native/Starling objects to tutorial targets |
| `tutorial.triggers.ModuleLoadedTrigger` / `tutorial.QuestInfoScreenQueue` | 583755 / 50847 | |
| `blimps.controller.BlimpsManager` | 24957 | Pools/places floating "+N" blimps on game layers |
| `blimps.commands.ShowBlimpsCommand` (from `ShowBlimpsEvent` L25030) | 547178 | |
| `blimps.creators.ResourceBlimpFactory` / `BaseResourceBlimpCreator` | 547515 / 547359 | |
| `blimps.animators.AbstractBlimpAnimator` (Fade L547080, Popup L547131) / `blimps.view.ResourceBlimp` | 547027 / 547247 | |
| `options.window.AdvancedOptionsWindowMediator` / `AdvancedOptionsTabCreator` / `OptionsRowCreator` | 567105 / 567092 / 567639 | Options window |
| `options.window.commands.SaveChangedPasswordCommand` / `SaveChangedEmailCommand` / `ValidateEmailCommand` | 567164 / 567142 / 567186 | |
| `options.window.components.AbstractSettingRow` / `tabs.GraphicsOptionsBodyMediator` | 567235 / 567561 | |
| `sounds.SoundController` / `SoundFacade` | 579650 / 579797 | Background/add-on/effect players from settings |
| `sounds.player.BaseSoundPlayer` / `BackgroundSoundPlayer` | 579973 / 580094 | |
| `sounds.settings.SoundsSettingsModel` | 580233 | Persisted volume/mute settings |
| `sounds.providers.BaseSoundsProvider` (Race L459509, CommonUI L361737) / `themes.AbstractSoundTheme` / `commands.PlayUISoundCommand` | 361560 / 361409 / 579929 | |
| `indicators.services.IndicatorsService` | 563052 | `getIndicators` RPC |
| `indicators.models.IndicatorsModel` / `detectors.IndicatorDetector` | 562963 / 562889 | Red-dot badges |
| `indicators.command.ClearIndicatorCommand` / `IndicatorsLoadedCommand` | 562736 / 562771 | |
| `indicators.views.IndicatorMediator` / `NewItemMarker` | 563080 / 563111 | |

### shared.utils (23), shared.streets (23), shared.portraits (21), shared.keydialog (17), shared.boost (17), shared.windows (15), shared.effects (15)

| Class | Line | Role |
|---|---|---|
| `utils.controller.KeyboardController` | 615088 | Per-tick key state, bindings, tutorial-aware gating |
| `utils.SimpleObjectPool` (+ `MultipleObjectPool` L41989) / `LocalStorage` / `enumwrapper.EnumWrapper` / `ObjectInstanceProvider` / `math.PseudoRandom` / `FrameTracker` | 56223 / 614987 / 374207 / 615019 / 615174 / 614925 | |
| `streets.models.StreetConnectionsModel` / `StreetInhabitantsModel` | 580924 / 580968 | Connectivity graph; which entities need a street |
| `streets.models.data.ConnectionStrategy` / `conditions.StreetInhabitantConditionFactory` / `StreetInhabitantConditionChecker` | 581013 / 581270 / 581243 | |
| `streets.commands.ConfigureStreetsCommand` | 580905 | |
| `portraits.PortraitModel` / `filter.IPortraitFilter` / `filter.ResearchedTechSegmentAndRacePortraitFilter` / `commands.ShowUnlockPortraitRewardCommand` / `data.PortraitsRewardSet` | 567734 / 568143 / 568193 / 567860 / 568136 | Avatar portraits |
| `keydialog.models.KeyDialogModel` / `commands.ShowKeyDialogWindowCommand` / `views.KeyDialogWindowMediator` / `data.KeyDialog` (+ `KeyDialogEntry` L563443) | 33630 / 563275 / 563579 / 563392 | NPC dialogue windows |
| `boost.RelicsModel` | 547750 | Relic counts per good type → boost % |
| `boost.BoostsModel` / `ProductionValueProvider` / `ProductionNameProvider` / `commands.UpdateRelicsCommand` / `data.Relic` | 16760 / 547713 / 547691 / 547954 / 548104 | |
| `windows.managements.WindowsManager` | 615349 | Open-window map, modal/blocking counters — the registry of live windows |
| `windows.managements.IWindowsViewContainer` / `windows.relics.RelicBoostInlet` / `windows.components.RequirementsAndCostsOverview` / `windows.relics.tooltips.GoodBoostTooltipMediator` | 80769 / 615661 / 615301 / 616043 | |
| `effects.model.EffectsModel` / `PlayerEffectsModel` / `FriendEffectsModel` / `NewAwEffectsModel` / `EffectConfigsModel` | 8878 / 9263 / 14487 / 550430 / 12253 | Buff/bonus system |
| `effects.model.ModuleAwareEffectController` / `effects.providers.EffectBoostProvider` / `effects.IEffectsProvider` | 550366 / 550481 / 8815 | |

### shared.production (14), challengerewards (14), battle (14), staticdata (12), events (11), calculator (11), starling (10), configs (10), commands (10), banderoles (10)

| Class | Line | Role |
|---|---|---|
| `production.ProductionQueueModel` / `ProductionQueue` / `ProductionQueueSlot` (+ `VirtualProductionQueueSlot` L568529) | 568414 / 568312 / 568492 | Production queues |
| `production.ProductionQueueMapper` / `providers.MultiPickupProvider` / `ProductionQueueIconProvider` | 52889 / 59982 / 568389 | |
| `challengerewards.factories.ChallengeRewardViewFactory` / `creators.ChallengeRewardViewCreator` / `views.ChallengeRewardView` / `creators.ChallengeRewardSelectionKitViewCreator` | 27465 / 548764 / 548945 / 548704 | Challenge-styled reward views |
| `battle.result.BattleResult` | 546849 | Outcome, losses, rewards |
| `battle.commands.BuyUnitsCommand` / `HealUnitsSquadCommand` | 546740 / 546752 | |
| `battle.model.UnitBonus` / `BattlePlaybackSpeed` / `battle.wrappers.BattleEnemyWave` | 546824 / 546793 / 546991 | |
| `staticdata.services.StaticDataService` / `StaticDataDiffService` | 580829 / 580779 | Static (game-config) template loading, diffing |
| `staticdata.StaticDataCache` / `StaticDataRegistry` / `commands.StaticDataCompositeCommand` / `data.AbstractStaticData` | 580747 / 15500 / 390959 / 393855 | |
| `events.PayPremiumEvent` (+ `PayPremiumEventBuilder` L550587) | 21347 | Premium-currency spend request |
| `events.PaymentEvent` / `ScreenEvent` / `ApplicationResizeEvent` / `StartBattleEvent` / `TechnologyUnlockedEvent` / `ReloadEvent` | 81039 / 550647 / 40652 / 550660 / 17064 / 550623 | |
| `events.AncientWondersDataEvent` / `events.LoadType` (enum) | 40928 / 550557 | `'displayAncientWonder'` event + `LoadType.LOAD_ONLY(id, baseName)` (extension `localOpenAw.ts`) |
| `calculator.premium.InstantFinishPremiumCostsFormula` | 548342 | Shared time → diamonds formula |
| `calculator.premium.FinishConstructionPremiumCalculator` / `FinishQueueProductionPremiumCalculator` / `FinishManualProductionPremiumCalculator` / `GoodsPremiumCostCalculator` / `UnitHealPremiumCalculator` | 548189 / 548235 / 548211 / 548289 / 548399 | |
| `starling.StarlingViewModel` / `processors.GameTouchProcessor` / `StarlingGridRenderer` / `texture.StarlingTextureAtlas` / `StarlingMovieClip` | 39744 / 399053 / 403429 / 580587 / 402516 | Starling adapters |
| `configs.SharedComponentConfiguration` / `EffectsCalculatorsFormattersConfiguration` / `WindowDecoratorConfiguration` / `battleresult.BattleResultConfiguration` | 549365 / 549327 / 549384 / 549405 | DI wiring |
| `commands.PayPremiumCommand` | 549262 | Central diamond-spend confirmation/execution |
| `commands.ManualMediationCommand` / `LoadAssetCommand` (+ `AbstractLoadAssetsCommand` L519769) / `LoadAtlasPagesCommand` / `LogUncaughtErrorCommand` / `MarkIndicatorAsViewedCommand` | 549217 / 549113 / 549136 / 549152 / 549238 | |
| `banderoles.factories.BanderoleFactory` / `DefaultBanderoleComponentFactory` / `views.BanderoleBuilder` / `views.Banderole` | 546504 / 546595 / 546703 / 546645 | Event banner strips |

### shared.states (8), providers (8), spells (7), neighborlyhelp (6), icons (6), data (6), atf (6), instructions (5), formatters (5), cursor (5)

| Class | Line | Role |
|---|---|---|
| `states.StateManager` / `InnoStateManager` / `StateConfiguration` | 580699 / 580648 / 141202 | Tiny FSM used by widgets |
| `providers.GameScreenShotProvider` / `StarlingScreenShotProvider` / `data.EffectRowDataProviderFactory` / `EffectTooltipMetadataProvider` | 568561 / 568594 / 72369 / 18524 | |
| `spells.model.SpellsModel` | 580282 | Owned spells and counts |
| `spells.services.SpellService` | 580454 | Spell apply/craft RPC (`castSpellOnBuilding(spellName, buildingId, cb)` — extension `castEe.ts`) |
| `spells.model.data.Spell` / `view.GlobalSpellConfirmAlertWindow` | 580433 / 580473 | |
| `neighborlyhelp.data.PlayerNeighbourlyHelp` / `NeighbourlyHelpBuilding` / `events.QuickNeighborlyHelpPerformedEvent` | 567037 / 567007 / 567065 | |
| `icons.IconProvider` / `BuildingIconProvider` / `IconProviderProxy` / `IconAffixes` | 414967 / 562671 / 562699 / 415843 | Icon-id resolution |
| `data.PaginatedData` / `TechnologySection` / `UnitSlotData` | 549817 / 549883 / 549938 | |
| `atf.ATFAtlasManager` (singleton, `getTexture(atlasId, textureId)`) / `raw.RawAtfAtlasLoader` / `raw.RawAtfAtlasManager` | 546082 / 546316 / 546403 | Compressed GPU texture atlases |
| `instructions.views.InstructionRenderer` / `InstructionSet` / `data.InstructionData` | 563170 / 563217 / 563148 | |
| `formatters.NumberFormatter` / `ProductionFormatter` / `ResourceValueFormatter` / `RewardItemAmountFormatter` | 551429 / 551432 / 553017 / 553026 | |
| `cursor.CursorManagerImpl` / `GameCursor` / `ingameCursor.IngameCursorComponent` | 549497 / 549551 / 38814 | |

### the small ones (≤ 4 classes each)

| Package | Classes | Line(s) |
|---|---|---|
| `trophies` | `model.TrophiesModel`, `config.TrophiesConfiguration`, `wrapper.Trophy` | 582919 / 582906 / 582952 |
| `logging` | `SentryIoLogger`, `SystemInfo`, `HTTPRequestHelper` | 563872 / 563974 / 563844 |
| `layers` | `IGameLayers` (what `Game.application` is cast to), `GameLayerIds`, `GameLayerRetriever` | 7814 / 563681 / 563687 |
| `errors` | `AbstractMethodError`, `IllegalArgumentError`, `IllegalStateError`, `NotFoundError` | 550515 / 550527 / 550539 / 550551 |
| `settings` | `BattleQualitySettings`, `CityQualitySettings`, `BackgroundSize` | 579449 / 579503 / 579427 |
| `models` | `IUserModel` (player identity/account contract), `UIGroupConfigurationsModel`, `UIGroupConstants` | 10568 / 566912 / 566978 |
| `fx` | `ArtifactItemUseFxAnimator`, `ArtifactItemUseFxView`, `IStageArrow` | 553040 / 553158 / 505420 |
| (direct) | `IDisposable`, `IGridCellStateController`, `IEntityConfigCloneable` | 10099 / 357256 / 546041 |
| `text` | `TextLinkFactory`, `TextLinks` | 581324 / 581334 |
| `features` | `FeatureModel` — static `isEnabled(id)` / `isUnlocked(id)` (feature flags such as `show_console`, `dom_uncaught_errors`, `crafting_redesign`); `FeatureEvent` | 551121 / 550697 |
| `exceptions` | `ExceptionService`, `ExceptionCodes` | 550678 / 550671 |
| `decay` | `ResourceDecayModel` (`IResourceDecayModel` L32606) | 549956 |
| `container` | `Game` (root display container; static `Game.application`), `DebugContainer` | 7960 / 549468 |
| `communicator` | `ICommunicatorCommand`, `AbstractCommunicatorResponse` | 387872 / 388692 |
| `clientBehavior` | `LoggingModel` (`ILoggingModel` L41218) | 549083 |
| `bootstrap` | `ModuleSequenceCommand`, `events.BootstrapEvent` | 359840 / 548166 |
| `basicvalues` | `BasicValuesModel`, `BasicValueIds` | 21739 / 546737 |
| `service` | `CallbackService` | 579410 |
| `milestone` | `events.MilestoneEvent` | 566902 |
| `hud` | `hud.menu.BaseButtonGroupMediator` | 475107 |
| `dragAndDrop` | `DragAndDropManager` (singleton) | 549997 |
| `alerts` | `LogoutAlertWindow` | 546056 |

---

## 4. The other `de.innogames.onyx.*` packages

Names relative to `de.innogames.onyx.`.

### onyx.assets (2,008)

Generated asset catalogue plus the runtime loader. 1,996 classes at the package root are
code-generated asset descriptors — one Haxe class per texture/atlas/sound/font entry
(`Common*` 1,515 of which `CommonGuiEvent*` 679; `City*` 106; `Atlas*` 79; `Techtree*` 76;
`Sounds*` 54; `Battle*`/`Worldmap*`/`Startup*`/`Province*`/`Events*`/`Spire*`/`Raceselection*`/`Barrack*` ~100;
`*MetaData`/`*MetaDataVO` ~45 hand-written descriptor types), then `.loaders` 8, `.strategy` 2,
`.data` 2. `AssetManager` (L142227) is a singleton (`init(stage, useHDTextures)`) with
`_registeredLoaders`, `_activeLoaders`, `_loaderWaitingQueue`, `_registeredAssets`, driven off the
stage `enterFrame`, exposing aggregate `get_progress`. `Assets._ensureAssetsInitialized` (L64192)
parses `window.elvenloader.assetsmanifest`.

| Class | Line | Role |
|---|---|---|
| `assets.AssetManager` | 142227 | Singleton loader queue / progress / HD-texture switch |
| `assets.Assets` | 64125 | Root registry of all asset groups (`Assets.data.worldmap`, …) |
| `assets.AssetGroup` / `AssetMetaData` / `AtlasTextureMetaData` / `AtlasProfileMetaData` / `AssetMetaDataNode` / `Atlas` | 142059 / 64265 / 64417 / 64510 / 142690 / 65150 | Descriptors |
| `assets.loaders.IAssetLoader` / `AbstractAssetLoader` / `ImageLoader` / `SoundLoader` | 356528 / 356568 / 356756 / 356801 | Loaders |
| `assets.strategy.AssetPackageStrategy` / `assets.data.LoadingStates` | 356930 / 356522 | |

### onyx.networking (538)

The wire layer: **504 of the 538 classes end in `VO`** (all in `.vos`, 505 entries) — generated
request/response DTOs (`CityMapEntityVO`, `SpellVO`, `BattleEnemyWaveVO`, `MultiplayerEventVO`,
`ManipulationVO`, …); `.services` holds 16 `I*Service` interfaces + 16 implementations;
`.staticdata.StaticData` (1). Only 16 of the 83 network services live here — the rest sit next to
their feature packages (`services-raw.md` lists them all; `04-networking-layer.md` explains the
mechanics). Services report `get_serviceName()` and build calls with
`this.request("method").withData([...])…`. The extension captures `TreasureService`
(`window.aviad_ts`).

| Class | Line | Role |
|---|---|---|
| `networking.services.StartupService` | 17108 | Initial session/startup payload |
| `networking.services.ManifestService` | 15479 | Client manifest / version handshake |
| `networking.services.FeaturesService` | 523855 | Feature-flag fetch |
| `networking.services.CashShopService` | 37190 | Cash shop |
| `networking.services.SpireService` (serviceName `"SpireService"`: `buyUnits`, `getData`, `getEncounter`, `getPointsArchive`, `instantOpenGate`, `openChest`, `openGate`, `openMysteryChest`, …) | 523990 | Spire map/encounter/chest |
| `networking.services.SpireShopService` / `SpireEffectService` | 524034 / 523964 | |
| `networking.services.GuardianService` | 523887 | Guardian summon/grow |
| `networking.services.CraftService` | 523799 | Magic-academy crafting |
| `networking.services.TreasureService` | 80843 | Treasure/reward claiming (extension `aviad_ts`) |
| `networking.services.EffectsService` | 68947 | Proxy-effect sync |
| `networking.services.TranscendenceService` | 524057 | AW transcendence |
| `networking.services.AbsolutionService` | 57401 | A/B test assignment |
| `networking.services.RewardSelectionKitService` | 49911 | Selection-kit reward choice |
| `networking.services.LogService` / `SupportService` | 31231 / 69211 | Client log shipping / support upload |

### onyx.worldmap (394)

The province world map module: hex/cell grid on Starling, scouting, province and encounter data,
its own bootstrap chain. `.view` 212, `.model` 60, `.controller` 26, `.bootstrap` 24, `.starling`
20, `.tutorial`/`.validators`/`.guard` 25, `.service` 9, `.events`/`.sounds`/`.util` 17.
`WorldMapModel` (L645833) keeps `worldAreasMap`/`provincesMap` keyed by row+column,
`positionCalculator`, `playerPosition`, `visibleAreaBounds`, `currentProvince`.
`WorldMapService` (L647651, serviceName `"WorldMapService"`) has `startup(callback)` and a batching
`getWorldMapAreas(areas, immediately, callback)`. The extension uses `WorldMapService`
(`getDiscoveredPlayerProvinces`, `startup`, raw `request(...)`), `WorldMapBattleService` and
`UnlockEncounterService.unlockEncounter(q, r, encounterIndex, cb)` in `src/inject/local/tourny*.ts`
and `fetchWorldNeighbors.ts`. Detail in `07-worldmap-tournaments-battle.md`.

| Class | Line | Role |
|---|---|---|
| `worldmap.model.WorldMapModel` | 645833 | Areas/provinces grid, camera bounds, player position |
| `worldmap.service.WorldMapService` | 647651 | Batched world-map tile/area RPC (extension) |
| `worldmap.model.ScoutingModel` / `service.ScoutingService` | 645754 / 647565 | Scouting |
| `worldmap.model.EncounterModel` | 645655 | Current province encounter state |
| `worldmap.service.UnlockEncounterService` | 647600 | Unlock-encounter RPC (extension) |
| `worldmap.service.WorldMapBattleService` | 647619 | Province battle start/resolve RPC (extension) |
| `worldmap.model.ProvinceDifficultiesModel` | 42468 | Difficulty scaling per province ring |
| `worldmap.model.WorldMapSquadSizeProvider` | 646032 | Squad-size for encounters |
| `worldmap.model.factory.WorldMapAreaFactory` / `model.ProvinceFinder` | 11603 / 645715 | |
| `worldmap.controller.ManualBattleCommand` / `InstantBattleCommand` | 645131 / 645009 | Enter manual / auto-resolve province battle |
| `worldmap.bootstrap.PreloadWorldMapCommand` | 644282 | Module preload entry point |
| `worldmap.starling.core.WorldMapTooltipManager` | 518605 | |

### onyx.spire (392)

Spire of Eternity: a levelled map of points, gates, mystery chests, diplomacy mini-game, ranking,
shop; its own loadable module. `.views`/`.view` 150, `.hud` 51, `.commands` 34, `.tooltips` 27,
`.events` 24, `.wrappers` 22, `.models` 16, `.providers`/`.factories`/`.controller` 25,
`.service` 6, `.config`+`.moduleconfig` 9. `SpireModel` (L14959, `BaseActor` + `ITickObject`)
holds `mapId`, `subtype`, `level`, `lastCompletedPointId`, `points` (`SpireMapPointState`),
`mysteryChests`, `currentEncounter`, `skillValue`, `_gateRemainingTime`; `update(vo)` rehydrates
from one server VO. The extension captures `views.windows.diplomacy.SpireDiplomacyWindowMediator`
(`window.aviad_wm`, `_onInvest`) and `wrappers.SpireEncounter` (`window.aviad_se`,
`diplomacyCosts.get_resources()`); see `08-spire.md`.

| Class | Line | Role |
|---|---|---|
| `spire.models.SpireModel` | 14959 | Core run state |
| `spire.models.SpireMapLevelsModel` / `SpireMapPointsModel` / `SpireRankingModel` / `SpireCrystalsModel` / `SpireStateModel` | 14626 / 14664 / 15059 / 36553 / 22663 | |
| `spire.service.SpireService` / `SpireBattleService` / `SpireDiplomacyService` | 24594 / 22578 / 21013 | RPC façades |
| `spire.wrappers.SpireEncounter` | 630049 | Encounter wrapper (extension `aviad_se`) |
| `spire.views.windows.diplomacy.SpireDiplomacyWindowMediator` | 625724 | Diplomacy window (extension `aviad_wm`) |
| `spire.factories.SpireWindowsFactory` | 21268 | Builds spire windows |
| `spire.controller.SpireConfigurationSequence` / `SpireShopController` | 617171 / 617205 | Bootstrap; in-run shop |
| `spire.commands.OpenGateCommand` / `StartSpireManualBattleCommand` | 616609 / 616900 | |
| `spire.moduleconfig.SpireModuleConfiguration` | 619649 | DI wiring as sub-module |

### onyx.battle (265)

Turn-based tactical battle engine: grid, units, state machines, animation command sequences,
interaction strategies, battle HUD. `.ui` 41, `.strategy` 31, `.unit` 30, `.controller` 30,
`.model` 26, `.behaviours` 20, root 18. `BattleModel` (L21769) holds `unitsPositionModel`,
`battlePathfinder`, `battleResult`, `movePointsTracker`, `_realm` (→ `battleId`), round/step
counters, `_unitsLifeTracker`, `_unitsBuffTracker`, `_isInteracting`, `_isSurrendered`.
Behaviour commands (`AttackAndRetaliateCommand`, `PlayDieSequenceCommand`, …) are `AsyncCommand`s.

| Class | Line | Role |
|---|---|---|
| `battle.model.BattleModel` | 21769 | Authoritative battle state |
| `battle.TurnsManager` / `MovementManager` / `BattlePlaybackModel` | 357459 / 357359 / 357083 | Turn order; path execution; server-log replay |
| `battle.services.BattleService` | 361366 | Battle RPC (start, act, surrender) |
| `battle.strategy.InteractionStrategyFactory` / `battle.AttackStrategyFactory` | 361841 / 356970 | |
| `battle.unit.UnitFactory` | 364596 | Battle units from configs |
| `battle.model.UnitsLifeTracker` / `UnitsBuffsTracker` / `MovePointsTracker` | 360764 / 360682 / 360657 | |
| `battle.assets.BattleAssetsManager` / `blimps.BattleBlimpsHandler` / `GridCellStateController` / `configs.BattleEngineConfig` | 357710 / 359162 / 357286 / 359320 | |

### onyx.techtree (233)

Research tree: technology graph, node states, sections, costs/rewards, the tech-tree screen.
`.view` 129, `.model` 44, `.controller` 24. `TechnologyModel` (L631274) keeps
`_technologiesBySection`, `_technologiesByLevel`, `_technologiesMap`, a walker and visitor-pattern
traversals (`_lastUnlockedTechnologyVisitor`, `_firstBlockingTechnologyVisitor`).

| Class | Line | Role |
|---|---|---|
| `techtree.model.TechnologyModel` / `TechnologyConfigsModel` / `TechnologySectionModel` | 631274 / 631242 / 631688 | |
| `techtree.model.data.TechnologyFactory` / `states.TechnologyStatesFactory` | 632250 / 632451 | |
| `techtree.service.TechnologyService` / `CityResearchService` | 632698 / 632683 | Research RPC |
| `techtree.controller.TechnologyPayCommand` / `TechnologyUseKnowledgePointsCommand` / `TechnologyInstantUnlockCommand` / `TechnologyGetRewardsCommand` | 630803 / 630916 / 630696 / 630596 | |
| `techtree.calculators.ScoutingCostsProvider` | 630391 | Scouting cost from research level |
| `techtree.view.graph.mediator.TechTreeGraphViewMediator` / `nodes.node.NodeStateHandler` / `windows.factory.TechnologyWindowFactory` | 633778 / 634878 / 635953 | |

### onyx.tournaments (176)

Weekly province tournaments: per-province encounter progress, guild checkpoint progress, chest
rewards, ranking, end-of-tournament. `.views`+`.view` 101, `.models` 25, `.commands` 18. The
extension calls `TournamentService.getTournamentProgress(cb)` and
`WorldMapTournamentService.getProvincesOverview(cb)` (`src/inject/local/tourny*.ts`). The running
tournament's good is `SeasonalEvent.subType` (`TournamentsModel.get_theme()`), fed by the
`SeasonalEventsService/getEvents` push and by startup `seasonal_events`. Detail in `07-worldmap-tournaments-battle.md`.

| Class | Line | Role |
|---|---|---|
| `tournaments.models.TournamentsModel` / `TournamentOverviewModel` / `TournamentEncounterModel` / `TournamentArchiveModel` | 638251 / 638196 / 36391 / 638114 | |
| `tournaments.models.TournamentCheckpointsProvider` | 638144 | Guild checkpoint ladder |
| `tournaments.services.TournamentService` | 638947 | Tournament RPC façade (extension) |
| `tournaments.services.WorldMapTournamentService` | 51469 | World-map tournament overlay RPC (extension) |
| `tournaments.view.TournamentsViewManager` | 639041 | Shows/hides tournament UI per screen |
| `tournaments.commands.StartTournamentEncounterCommand` / `ResetTournamentProvinceCommand` / `TournamentEndedCommand` / `UnlockNextChestWithArchivePointsCommand` | 637529 / 637500 / 637581 / 637641 | |
| `tournaments.views.factories.TournamentWindowFactory` / `providers.TournamentsIconProvider` / `configs.TournamentsConfig` | 639955 / 638916 / 637903 | |

### onyx.multiplayer (140), onyx.seasonalevents (73), onyx.chests (71)

| Class | Line | Role |
|---|---|---|
| `multiplayer.models.MultiplayerModel` / `WaypointPositionModel` | 520666 / 520772 | Multiplayer-event (MPE) waypoint path state |
| `multiplayer.services.MultiplayerService` | 520809 | MPE RPC |
| `multiplayer.controller.SelectPathCommand` / `CollectStageRewardCommand` / `UnlockStageRewardsCommand` / `RequestMultiplayerUpdateCommand` / `MultiplayerEndedCommand` | 519659 / 519602 / 519720 / 519648 / 519625 | |
| `multiplayer.view.map.MultiplayerMapViewMediator` / `waypointwindow.WaypointWindowMediator` / `ranking.MultiplayerRankingWindowMediator` / `factories.MultiplayerWindowFactory` / `hud.banners.MultiplayerInfoBannerMediator` | 521071 / 523062 / 521908 / 521033 / 520413 | |
| `multiplayer.configs.MultiplayerModuleConfig*` | 519518-519549 | DI wiring |
| `seasonalevents.models.SeasonalEventsModel` / `SeasonalEventsByTypeCollection` / `ChallengeEventsModel` / `StaticDataModel` | 545120 / 545078 / 32421 / 48593 | All active timed events by id / type |
| `seasonalevents.services.SeasonalEventsService` | 545997 | Events RPC |
| `seasonalevents.handlers.StaticDataHandler` (+ 30 per-feature handlers, e.g. `spire.SpireMapHandler` 544929, `currency.RoyalPassPrizesHandler` 544737, `seasonpass.SeasonPassLevelsHandler` 544872) | 82824 | Parse server config into models |
| `seasonalevents.commands.UpdateSeasonalEventsCommand` / `PrepareSeasonalEventsCommand` | 544432 / 544234 | |
| `seasonalevents.models.data.SeasonalEvent` / `util.SeasonalEventPropertyFactory` | 545607 / 546031 | Event entity (`type` field!) |
| `chests.models.ChestsModel` / `services.ChestsService` | 370818 / 371004 | Guild/event chests, rotations, contributions |
| `chests.commands.OpenChestAndCollectCommand` / `PayInChestCommand` / `UpdateRotationsCommand` / `UpdateContributionsCommand` | 370180 / 370230 / 370329 / 370278 | |
| `chests.conditions.ChestConditionsFactory` / `data.Chest` / `data.ChestPayInProgress` | 370407 / 370527 / 370675 | |
| `chests.views.factories.ChestWindowFactory` / `payin.components.PayInComponentMediator` / `rewards.ChestRewardAlertWindowMediator` | 371562 / 371824 / 372133 | |

### onyx.cashshop (62), onyx.guardians (54), onyx.resources (42), onyx.province (33), onyx.valuemanipulation (32)

| Class | Line | Role |
|---|---|---|
| `cashshop.models.CashShopModel` | 31300 | Catalogue, groups, selected tab |
| `cashshop.factory.PaymentBridgeFactory` / `bridge.IPaymentBridge` / `bridge.igpayment.IgPaymentBridge` / `bridge.microsoft.MicrosoftBridge` | 81022 / 85222 / 365872 / 365968 | Payment bridges (iframe + `window.onmessage`, see 01 §8.3) |
| `cashshop.commands.GetCashShopCommand` / `OpenCashShopCommand` / `SuccessPurchaseCommand` | 366014 / 366029 / 366117 | |
| `cashshop.factory.CashShopWindowFactory` / `util.DirectPurchase` / `util.CashShopLoader` / `data.CashShopProduct` | 23287 / 50420 / 23242 / 366253 | |
| `guardians.controller.GuardiansController` / `GuardianInfoController` / `_GuardiansController.GuardiansFetchCoordinator` | 24261 / 514575 / 514633 | Guardian summoning |
| `guardians.commands.ShowGuardianStageOverviewCommand` / `ConfirmUnsummonGuardianCommand` | 514505 / 514436 | |
| `guardians.data.GuardianStaticData` / `util.GuardianViewModelUtil` / `views.panels.GuardianEffectPanelView` / `views.windows.GuardiansWindow` / `behaviors.OpenGuardiansWindowBehavior` | 27136 / 514970 / 514984 / 515467 / 514425 | |
| `resources.models.ResourcesModel` | 10951 | Master resource balances (`ResourceSetsModel.getSet("instant_items")` L416303) |
| `resources.models.CachedResourcesModel` / `DynamicResourcesModel` / `SentientGoodsModel` / `AscendedGoodsModel` / `ResourceSetsModel` | 543407 / 543475 / 543544 / 543310 / 416303 | |
| `resources.service.ResourcesService` | 42751 | Resource sync RPC (`getResources` push) |
| `resources.provisions.ProvisionModel` / `util.ResourcesUpdater` / `util.FlexibleResources` / `util.BoostedGoods` / `commands.CheckStorageCapacityCommand` | 543674 / 10533 / 544011 / 543765 / 543109 | |
| `province.view.ProvinceViewMediator` / `EncountersLayerMediator` / `ProvinceBackgroundFactory` / `panels.ProvincePanelFactory` / `encounters.creators.EncounterButtonCreator` | 542841 / 542570 / 542759 / 543099 / 542987 | Province detail screen |
| `province.commands.SolveEncounterCommand` / `TradeEncounterCommand` / `PremiumTradeEncounterCommand` / `UnlockEncounterCommand` / `ShowEncounterRewardCommand` / `GetGoodEncountersCommand` / `shortcuts.OpenEncounterCommand` | 542432 / 542277 / 542338 / 542476 / 542411 / 542239 / 542549 | Encounter solving (fight / negotiate) |
| `valuemanipulation.models.ValueManipulationModel` / `services.ValueManipulationService` / `commands.HandleValueManipulationCommand` | 642273 / 642605 / 641971 | Server-driven property overrides/multipliers |
| `valuemanipulation.handlers.factories.HandlerFactory` / `BaseManipulationHandler` / `EntityConfigManipulationHandler` / `TechnologyManipulationHandler` / `ChestManipulationHandler` | 41093 / 642124 / 642242 / 642260 / 642231 | |
| `valuemanipulation.processors.factories.ProcessorFactory` / `ProductsRevenuePropertyProcessor` / `actions.factories.ActionFactory` / `data.ValueManipulation` | 77867 / 642515 / 59525 / 642082 | |

### onyx.currencyevents (31), army (30), eventintro (28), help (27), videoads (26)

| Class | Line | Role |
|---|---|---|
| `currencyevents.models.CurrencyEventsModel` | 513007 | Active currency-event state |
| `currencyevents.helpers.EventAssetHelper` / `EventWindowAssetHelper` / `EventQuestAssetHelper` / `EventSeasonPassAssetHelper` | 512651 / 512958 / 512873 / 512905 | Themed-asset lookup per event |
| `currencyevents.views.CurrencyEventsViewProcessor` / `windows.EventQuestDecorator` / `wrapper.CurrencyEventConfig` / `wrapper.CurrencyEventMainReward` / `constants.EventIconProvider` | 513264 / 513576 / 513733 / 513785 / 416195 | |
| `army.factories.ArmyWindowsFactory` | 39160 | Deployment/encounter windows |
| `army.deployment.windows.ArmyDeploymentWindow` / `elements.ArmyUnitsContainer` / `elements.BattleUnitsContainer` / `DeployedSquadSlot` / `ArmySquadInfoView` / `tooltips.ArmyCompositeTooltipMediator` | 25473 / 49264 / 28840 / 140517 / 140412 / 141458 | Squad selection before battle |
| `army.encounter.windows.EncounterWindow` / `defendingArmy.DefendingArmyView` / `trading.TradingView` | 39177 / 141599 / 141768 | Encounter (fight or negotiate) window |
| `eventintro.models.EventIntroDataModel` / `views.factories.EventIntroWindowFactory` / `views.BaseEventIntroWindow` / `MainEventIntroWindowMediator` / `SpireIntroWindowMediator` / `SeasonPassIntroWindowMediator` / `constants.EventIntroWindowAssetHelper` / `data.EventIntroData` / `configs.EventIntroConfiguration` | 514039 / 514356 / 22638 / 514187 / 514251 / 514233 / 513887 / 513979 / 513818 | Event intro splash windows |
| `help.models.HelpDataModel` / `commands.ShowHelpWindowCommand` / `views.factories.HelpWindowFactory` / `views.HelpBody` / `data.HelpData` / `HelpTabData` / `EntityTypeHelpRuleData` / `EntityComponentHelpRuleData` / `ProxyEffectHelpRuleData` / `constants.HelpWindowAssetHelper` | 517830 / 517389 / 518056 / 517932 / 517603 / 517705 / 517535 / 517520 / 517760 / 517452 | Contextual help |
| `videoads.control.VideoAdController` | 17733 | Rewarded video ads: availability, playback, reward |
| `videoads.control.GoogleAdSenseProvider` / `CMPHelper` / `CityIncidentHelper` / `BuilderBonusEffectHelper` / `models.RiseBridge` | 643050 / 642895 / 79719 / 642860 / 643670 | |
| `videoads.services.VideoAdService` / `commands.ConfirmVideoAdWatchingCommand` / `ShowVideoAdRewardsCommand` / `ShowVideoAdAlertCommand` | 643684 / 642628 / 642765 / 642665 | |

### onyx.miners (15), constants (15), archive (14), microsoft (13), fx (13), configs (9), cmp (7), buildings (5), absolution (5), loading (4), manifest (2), community (1), onyx root (3)

| Class | Line | Role |
|---|---|---|
| `miners.service.GoldMineService` / `commands.CollectGoldMineCommand` | 519453 / 519376 | Gold-mine collectibles on the world map |
| `miners.cells.renderer.GoldMineRenderer` / `creators.GoldMineRendererCreator` / `collected.CollectedGoldMineRenderer` / `scouted.ScoutedGoldMineRenderer` / `collected.GoldMineTimer` / `configs.GoldMineConfig` | 519211 / 519319 / 519228 / 519354 / 519282 / 519417 | |
| `constants.RaceAssetHelper` / `HumanAssets` / `ElfAssets` / `Race` | 415383 / 415536 / 415671 / 415805 | Race asset sets |
| `constants.GoodId` / `GoodsQuality` / `RelicId` / `GuestRaceChapter` / `GuestRaceNames` / `UnitClassMaps` / `StringKey` / `ExternalCommunicatorIDs` | 512563 / 512566 / 512575 / 512569 / 512572 / 512593 / 512584 / 512560 | Id/enum holders |
| `constants.ApplicationModuleName` (Haxe enum) | 512504 | `OTHER_CITY, OWN_CITY, TECH_TREE, WORLD_MAP, BATTLE, MULTIPLAYER, SPIRE, UNKNOWN` |
| `archive.models.AbstractArchiveModel` / `view.window.ArchivePointsPopupMediator` / `strategy.IArchivePointsEventStrategy` / `SpireArchivePointsStrategy` / `TournamentArchivePointsStrategy` / `states.UsableState` / `NotEnoughPointsState` / `events.SpendArchivePointsEvent` | 58645 / 140134 / 74450 / 140269 / 140322 / 140251 / 140223 / 140104 | Archive-points spend popup (Spire + Tournaments) |
| `microsoft.rating.commands.ShowRateAndReviewPopupCommand` / `guards.OpenMicrosoftRatingPopupGuard` / `views.AppRatingPopupMediator` / `support.SupportHandler` / `support.model.Diagnostics` / `rating.configs.MicrosoftRatingConfiguration` | 518384 / 518437 / 518456 / 518512 / 59279 / 518400 | Microsoft Store build |
| `fx.managers.IFxManager` / `factories.IFxFactory` / `animators.IFxAnimator` / `UiFxAnimator` / `configs.UiFxConfig` / `views.UiFxView` / `targets.FxTarget` / `animators.FxIdGenerator` | 19342 / 400781 / 372185 / 372210 / 372341 / 372427 / 514411 / 514394 | Generic effects framework |
| `configs.WorldMapConfig` / `WorldMapControllerConfig` / `WorldMapModelsConfig` / `WorldMapServicesConfig` / `WorldMapViewsConfig` / `WorldMapGridConfig` / `WorldMapUtilConfig` / `ArmyDeploymentConfiguration` / `ArmyDeploymentControllerConfiguration` | 512337 / 512354 / 512408 / 512427 / 512475 / 512396 / 512444 / 512315 / 512326 | DI bundles for world map & army deployment |
| `cmp.services.CmpService` / `models.UsercentricsBridge` / `commands.ShowAdConsentWarningCommand` / `ShowGameReloadPopupCommand` / `configs.CmpConfiguration` | 512190 / 512077 / 511923 / 511976 / 512031 | Consent management |
| `buildings.IRenderConfigSystem` / `data.BuildingRenderConfig` / `SpriteSheet` / `AnimationSpriteSheet` / `FirstFrameAnimationSpriteSheet` | 365685 / 365817 / 365695 / 365748 / 365851 | Building render config |
| `absolution.model.AbsolutionModel` / `data.AbsolutionGroup` / `AbsolutionGroups` / `AbsolutionTests` / `config.AbsolutionConfig` | 140068 / 140048 / 140062 / 140065 / 140035 | A/B testing |
| `loading.view.LoadingLayer` / `LoadingLayerMediator` / `events.LoadingEvent` (`"LoadingEvent::initialize"`, `::finished`) / `LoadingProgressEvent` | 42265 / 518258 / 518215 / 518236 | Loading overlay |
| `manifest.model.ManifestModel` / `config.ManifestConfig` | 518352 / 518315 | Parsed client manifest |
| `community.CommunityWindow` | 512208 | Community/social links window |
| `IsoAssets` / `IsoAssetsData` / `ModuleContextEvent` | 139999 / 139993 / 140025 | |

---

## 5. Third-party and framework layers (one line each)

| Package | Classes | What it is / key classes |
|---|---|---|
| `robotlegs.bender.*` | 140 | Robotlegs 2 ("bender") MVCS: `framework.impl.Context` (L741740), `framework.api.IInjector` (L9533) / `IContext` (L14551), `bundles.mvcs.Command` (L360152) / `Mediator` (L4121), `extensions.eventCommandMap.api.IEventCommandMap` (L15314), `extensions.mediatorMap.api.IMediatorMap` (L11578), `extensions.directCommandMap.api.IDirectCommandMap` (L739017), `OnyxBundle` (L738442 — installs logging, contextView, eventDispatcher, modularity, directCommandMap, eventCommandMap, localEventMap, viewManager, `OnyxStageObserverExtension`, mediatorMap, viewProcessorMap, stageSync) |
| `org.swiftsuspenders.*` | 27 | The DI container behind Robotlegs: `Injector` (L737598) — `getInstance(cls)`, `instantiateUnmapped(cls)`, `injectInto(o)`, `getOrCreateNewInstance`; `reflection.MacroReflector` (L8728) reads the compile-time `factories` table (L760820-780136) instead of runtime reflection; `typedescriptions.*` |
| `openfl.*` | 216 | Flash display-list API emulation on WebGL/canvas: `display.DisplayObject` (L1506), `Sprite` (L3654), `Stage` (L727170), `events.EventDispatcher` (L31) / `Event`, `Lib` (L706768: `getDefinitionByName`, `getURL`), `external.ExternalInterface` (L7014), `net.SharedObject` (localStorage), `Vector` (abstract, L880), `utils.*`, `geom.*`, `display3D.*` (Stage3D shim starling renders through) |
| `lime.*` | 39 | Native/browser platform layer under openfl: `app.Application` (L698403, `create({fps:35, windows:[…]})`, `window.backend.element` = the canvas container), `graphics.*`, `ui.*`, `utils.ObjectPool` (L228) |
| `starling.*` | 64 | Starling GPU 2D framework (`core.Starling` L39968, `display.*`, `textures.*`, `text.*`, `events.Touch*`, `filters.*`, `animation.Tween/Juggler`) — the city/worldmap/battle scenes and feathers UI render on it |
| `feathers.*` | 116 | Feathers UI toolkit on Starling (`core.FeathersControl` L506824, `controls.*` 26, `layout.*` 26, `themes.*`, `skins.*`, `dragDrop.*`) — the base of the shared window/button/table widgets |
| `innogui.*` | 54 | InnoGames' own component lifecycle/layout toolkit: `components.core.Component` (L4928) / `FlexibleComponent` (L5498) / `Container` (L5739), `lifecycle.StageManager` (L4349) / `ComponentManager` (L4632) with validation/render phases, `layout.*` (21), `flexible.*` — `Game`/`MainModule` are `innogui` containers |
| `snake.*`, `grid3d.*`, `abstract3d.*` | 30 / 25 / 67 | InnoGames' isometric engine underneath `onyx.city.engine`: `snake.Snake` (L742695), `snake.core.SnakeInteractionHandler` (L743225) / `SnakeObjectPool` (L743403) / `SnakeValidationManager` (L743499), `snake.layers/projection/sorting/camera`; `grid3d.Grid` (L18931), `GridPosition` (L650004), `renderers.*`, `cell.*`; `abstract3d.IScene` (L87192), `IAbstractCamera` (L86475), `objects.*`, `animation.*`, `light.*` — a render-agnostic 3D scene abstraction |
| `away3d.*` | 362 | Away3D 3D engine (loaders 85, materials 77, core 59, animators 33, …; `containers.View3D` L94271). Present in the bundle but no `de.innogames` class references it in the packages skimmed — most likely dead-weight from the AS3 port or used only via `abstract3d` adapters |
| `spine.*` | 65 | Spine skeletal animation runtime (`Skeleton` L745984, `animation.*`, `attachments.*`, `atlas.*`, `flash.SkeletonSprite`) — animated characters/units |
| `motion.*` | 28 | Actuate tweening library (`motion.Actuate` L705672, `actuators.*`, `easing.*`) |
| `com.greensock.*` | 4 | GSAP plugin shims (`PropTween`, `TweenPlugin`, `FilterPlugin`, `GlowFilterPlugin`); the `TweenMax`/`TweenLite` globals used throughout (`TweenMax.staggerFromTo`, `TweenLite.delayedCall`) are **not** in the bundle — they are page-provided externs |
| `de.flintfabrik.starling.*` | 5 | `FFParticleSystem` (L134591) — Starling particle effects |
| `tink.core.*` / `tink.state.*` | 29 / 22 | Futures/Promises/Signals/Callbacks and reactive observables — see `01-haxe-runtime-shape.md` §9 |
| `org.haxecommons.async.*` | 13 | as3-commons async operations (`operation.IOperation` L358009, `IProgressOperation` L358200) — used by the `AsyncCommand` machinery |
| `haxe.*` + root std | 37 + ~20 | `haxe.ds.*Map`, `haxe.Exception`, `haxe.Timer` (L380419), `haxe.Unserializer`, `haxe.crypto.Md5`, `haxe.xml.*`, `haxe.iterators.*`, `haxe.io.*`; root `Std` (L7386), `Type` (L7069), `Reflect` (L8173), `EReg` (L6863), `StringTools` (L8597), `StringBuf` (L8520), `Xml` (L86292), `Lambda` (L7850), `HxOverrides` (L7751), `IntIterator`/`ReverseIntIterator`, `Str` (L8474, gettext), `SimplePrintf` (L8289), `Delegate` (L6851) — see 01 §3.2 |
| `js.*` | 5 | `js.Boot` (L7187), `js.lib.HaxeIterator` (L697357), `js.lib.NativeStringTools` (L383263) |
| `tutorial.*` | 52 | Generic (non-Elvenar) tutorial engine: `core.StepsSequenceExecutor` (L759758), `TutorialActivator` (L759947), `TutorialStatus` (L760013), `data.*`, `mappers.*`, `validator.*`, `instructions.*`, `notifications.*` — driven by `onyx.shared.tutorial` and `onyx.city.tutorial` |
| `com.innogames.as3communicator.*` + `AS3Communicator` | 26 + 1 | Debug display-list automation API exposed on the canvas element (`clickObject`, `getObjectTree`, `setObjectProperty`, …), gated by feature `show_console` — see 01 §8.4 |
| `com.junkbyte.console.*` | 3 | Junkbyte "Console" (`Cc` L133075) — legacy AS3 on-screen console |
| `com.probertson.utils.*` | 3 | GZIP encoder (`GZIPEncoder` L133532) |
| `com.sociodox.utils.Base64` | 1 | Base64 (L133611) |
| `gnu.as3.gettext.*` | 3 | `AsGettext` (L35722) — `.mo` catalog reader behind `Str._` |
| `as3hx.*`, `avmplus.*`, `ASAny`/`ASObject`/`ASDictionary`, `FLGlobal`, `FLDate` | ~10 | AS3→Haxe conversion shims (`as3hx.Compat` L89401, `avmplus.DescribeTypeJSON` L89663, `FLGlobal` L7407 = flash globals: `navigateToURL`, `registerClassAlias`, `addExternalInterfaceCallback`) |

---

## 6. Where to look for X

| I want… | Look in | Notes |
|---|---|---|
| **network calls** (send an RPC) | `de.innogames.shared.networking.AbstractConnectionService` (L13105) → any `*Service` class; catalogue in `rev-eng/index/services-raw.md`; 16 generic ones in `de.innogames.onyx.networking.services`, the rest next to their feature (`onyx.worldmap.service`, `onyx.tournaments.services`, `onyx.city.service(s)`, `onyx.shared.*.services`, `strategycity.main.service`) | `new aviad['…Service']()` then `svc.method(args, cb)` or `svc.request('action').withData([...]).withCallback(cb).immediate().call()` (extension `aviad.ts`); details `04-networking-layer.md`, `05-services-catalog.md` |
| **wire DTOs / response shapes** | `de.innogames.onyx.networking.vos.*VO` (505), `de.innogames.strategycity.main.model.vo.*` (88), feature `vos/` packages | the JSON `__class__` discriminator on the wire equals the VO's short name (`ServerResponseVO`, `PlayerRankingVO`) |
| **the DI injector / instantiate a command with injection** | `de.innogames.onyx.city.model.ApplicationModel.injector` (L10650; extension `window.aviad_am.injector`), `org.swiftsuspenders.Injector` (L737598) | `injector.getInstance(Cls)`, `getOrCreateNewInstance(Cls)`, `instantiateUnmapped(Cls)`; injection table = `MacroReflector.factories` (L760820+); see 03 |
| **startup / bootstrap order** | `MainModule.init` (L8085) → `de.innogames.onyx.city.controller.bootstrap.ConfigurationSequence` (L390294) → `Configure*Command` (L390347-391100) → `post.PostConfigurationSequence`; per-module: `onyx.worldmap.bootstrap.*`, `onyx.spire.controller.SpireConfigurationSequence` (L617171), `onyx.multiplayer.controller.bootstrap.*` | see 03 |
| **which event triggers which command** | `*Configuration`/`*Config` classes' `configure()`: `commandMap.map("CityEvent::ENTER_OWN_CITY").toCommand(X)` — e.g. `city.configs.CityConfiguration` (L389892), `city.controller.bootstrap.ConfigureControllerCommand` (L390347), `onyx.configs.WorldMapControllerConfig` (L512354), `shared.*.configs.*` | grep `commandMap.map("` |
| **user actions** | `*Command` classes (`execute()`, `event` field) in `commands/`/`controller/` packages, triggered by `*Event` (`Event::type` strings) | instantiate via injector, set `.event`, call `.execute()` (extension `localOpenAw.ts`, `localVisitPlayer.ts`) |
| **state to read** | `*Model` classes (`models/`, `model/`), singletons in the injector: `ApplicationModel`, `UserModel` (L661530), `ResourcesModel` (L10951), `CityEntitiesModel` (L451695), `InventoryModel` (L26328), `TradesModel` (L462082), `GuildModel` (L554117), `QuestModel` (L569579), `RankingModel` (L573728), `WorldMapModel` (L645833), `SpireModel` (L14959), `TournamentsModel` (L638251), `BattleModel` (L21769), `TechnologyModel` (L631274), `SeasonalEventsModel` (L545120), `ChestsModel` (L370818) | `injector.getInstance(aviad['…Model'])`; read via `get_x()`; `tink_state` observables via `.getValue()`; see `12-models-and-startup-data.md` |
| **hex / province world map** | `de.innogames.onyx.worldmap.*` (model L645833, service L647651, view/cells), `onyx.province.*` (province screen), `onyx.miners.*` | `07-worldmap-tournaments-battle.md` |
| **tournaments** | `de.innogames.onyx.tournaments.*` (models L638251, `TournamentService` L638947, `WorldMapTournamentService` L51469), `onyx.seasonalevents.*` (event `subType`) | `07-worldmap-tournaments-battle.md`, `TOURNY.md` |
| **battle / fights** | `de.innogames.onyx.battle.*` (`BattleModel` L21769, `BattleService` L361366), `onyx.army.*` (deployment window), `onyx.shared.battle.*`, `onyx.shared.unit.*` (unit configs), `strategycity.main.model.ArmyModel` (L9290) / `ArmyDeploymentModel` (L660204), `worldmap.service.WorldMapBattleService` (L647619), `spire.service.SpireBattleService` (L22578) | |
| **spire** | `de.innogames.onyx.spire.*` (+ `onyx.networking.services.SpireService` L523990), `onyx.archive.*` | `08-spire.md` |
| **city grid / buildings / iso engine** | `de.innogames.onyx.city.engine.*` (`IsoEngine` L15944), `city.entities.*`, `city.model.*`, `city.modes.*` (place/move/sell), `city.streets.*`, `city.upgrade.*`, `city.services.CityMapService` (L458840), `onyx.buildings.*`, `snake.*`/`grid3d.*` | `09-city-engine-and-buildings.md` |
| **in-game UI windows** | `de.innogames.onyx.shared.ui.windows.*` (`BaseWindow` L11862, `WindowsManager` L615349, `WindowEvent` L597622 `"WindowEvent::addWindow"`), `onyx.city.ui.windows.*` (564), feature `views/windows` packages; window creation via `*WindowsFactory`/`*WindowFactory` | mediators (`*WindowMediator`) hold the logic; the extension captures `SpireDiplomacyWindowMediator` |
| **HUD / tooltips / context menus** | `onyx.shared.ui.hud.*`, `onyx.city.ui.hud.*`, `onyx.shared.ui.tooltips.composite.*`, `onyx.shared.tooltips.*` (effect calculators), `onyx.shared.ui.components.contextmenu.*` | |
| **social: neighbours, guild, messages, ranking, AW, spells** | `onyx.city.service.NeighborlyHelpService` (L458771) / `OtherPlayerService` (L14500), `city.commands.VisitOtherPlayerCommand` (L387820), `onyx.shared.guilds.*`, `onyx.shared.messaging.*`, `onyx.shared.ranking.*`, `onyx.city.ancientwonders.*` (`AncientWonderService` L21115), `onyx.shared.spells.services.SpellService` (L580454) | `10-social-neighbours-aw-spells.md` |
| **events / economy** | `onyx.city.mainevents.*`, `onyx.seasonalevents.*`, `onyx.city.currencyevents.*` + `onyx.currencyevents.*`, `onyx.city.challengeevents.*`, `onyx.multiplayer.*`, `onyx.chests.*`, `onyx.city.trade.*` (trader), `onyx.resources.*`, `onyx.shared.rewards.*`, `onyx.city.inventoryitems.*`, `onyx.city.treasure.*`, `onyx.cashshop.*`, `onyx.city.offers.*` | `11-events-economy-misc.md` |
| **quests / tutorial** | `onyx.shared.quests.*`, `onyx.shared.tutorial.*`, `onyx.city.tutorial.*`, `tutorial.*` (generic engine) | |
| **feature flags** | `de.innogames.onyx.shared.features.FeatureModel.isEnabled(id)` (L551121), `onyx.networking.services.FeaturesService` (L523855), `city.controller.FeaturesController` (L390108) | flags seen: `show_console`, `dom_uncaught_errors`, `show_performance_monitor`, `crafting_redesign` |
| **time / clocks / timers** | `de.innogames.shared.util.clock.GameClock` (L658890, `schedule/unschedule` `ITickObject`s), `strategycity.main.model.RunningActivitiesModel` (L15329), `haxe.Timer` (L380419) | |
| **localisation** | `Str._("…")` (L8476) → `gnu.as3.gettext.AsGettext` (L35722), catalog from `window.foepreloader.mofile` | |
| **assets / textures** | `de.innogames.onyx.assets.*` (`AssetManager` L142227), `onyx.shared.atf.ATFAtlasManager` (L546082), `onyx.constants.RaceAssetHelper` (L415383) | |
| **logging / errors** | `de.innogames.logging.Logger` (L66200), `onyx.shared.logging.SentryIoLogger` (L563872), `UncaughtErrorBuffer` (L86023), `city.controller.bootstrap.console.*` (L391778-392015) | |
| **the JS bridge / page globals** | `de.innogames.shared.util.ExternalUtil` (L658601), `openfl.external.ExternalInterface` (L7014), `AppMain.start` (L4102) | `01-haxe-runtime-shape.md` §8 |
| **enums** | `rev-eng/index/enums.tsv` (141); notable: `onyx.constants.ApplicationModuleName` (L512504), `onyx.shared.events.LoadType` (L550557), `onyx.shared.ranking.constants.RankingCategory` (L416143), `tink.core.Outcome` (L758194) | enum-abstracts (string ids) are not indexed |

---

## Open questions / not verified

- Descriptions of the ~50 smallest packages come from class names alone (no prototype skim); the
  "Role" column of those rows is an informed guess, not a verified reading.
- `away3d.*` (362 classes) looks unreferenced by `de.innogames.*` code but this was not proven
  with a full cross-reference grep; `abstract3d.*` may be its adapter layer.
- Counts are from `classes.tsv` (registered classes only). Abstracts (~220) and module-level
  functions (~240) are not counted anywhere and belong logically to the packages of their JS
  identifiers (`de_innogames_common_utils_InjectionUtil_*`, `tink_core_Future`, …).
