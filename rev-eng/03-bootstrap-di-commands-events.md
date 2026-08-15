# Bootstrap, DI, Commands and Events

## Scope

How the Elvenar web client boots (from `startElvenar()` to a visible city) and how the
Robotlegs "bender" MVCS layer wires user actions to code. Covers `AppMain` / `MainModule`,
`robotlegs.bender.*` (Context, injector, eventCommandMap, mediatorMap, viewProcessorMap),
`org.swiftsuspenders.*` (the actual DI container), the `*Config` / `*Configuration` classes
in `de.innogames.onyx.**` that do all the mapping, the Command families
(`de.innogames.shared.mvcs.controller.Command`, `de.innogames.shared.commands.*`,
`org.haxecommons.async.command.*`, `de.innogames.shared.util.ezcommand.EzCommand`), the
event classes and the global event dispatcher, mediators, and the window mechanism.

Sources: `tmp/elvenar-release-full-reveng.js` (Feb 12 2026 snapshot, 787,964 lines),
`rev-eng/index/classes.tsv`, and the extension code under `src/inject/`.

Cross-references: `04-networking-layer.md` (services), `02-runtime-shape.md` (package map),
`05-extension-hooks.md` (extension-side recipes).

---

## 1. Entry point and startup sequence

### 1.1 `AppMain.start` - the only exported entry point

There is no `main()`. The compiled Haxe exposes exactly one bootstrap function:
`AppMain.start` (L4102), exported to the page as `window.startElvenar`:

```js
AppMain.start = $hx_exports["startElvenar"] = function(elementId,background) {
  var app = new lime_app_Application();
  app.create({ fps : 35, windows : [{ element : window.document.getElementById(elementId),
    background : background, allowHighDPI : true, resizable : true, depthBuffer : true,
    stencilBuffer : true, majorPerformanceCaveatTest : ...ALLOW_IF}]});
  app.exec();
  app.stage.addChild(new MainModule());
};
```

`AppMain.DEFAULT_FPS = 35` (L780194). The page-level loader `loadGameCode()` is an inline
`<script>` on the game page (**not** in the snapshot) which injects the
`elvenar-release-{min,full}-<md5>.js` bundle; the extension replaces that function with a
no-op and re-fetches + rewrites the bundle itself - see `src/inject/injectMutate.ts`
(`injectMutate()`, `fetchAndModify()`).

### 1.2 `MainModule` - the Robotlegs context owner

`MainModule` (L8085), `__interfaces__ = [IMain]` (L7830), extends
`de.innogames.onyx.shared.container.Game` which implements
`de.innogames.onyx.shared.layers.IGameLayers` (L7810) - the display-list containers
`gameContainer`, `hudContainerBelowModal`, `uiContainer`, `hudContainerAboveModal`,
`tutorialContainer`, `miscContainer`, `tooltipContainer`, `debugContainer`.

The constructor (L8080) waits for `addedToStage`, then calls `MainModule.init()` (L8095),
which is the actual bootstrap:

```js
init: function() {
  de_innogames_onyx_shared_container_Game.application = this;
  de_innogames_strategycity_Version.init();
  this._flashHelper = new MainModuleHelper(this); this._flashHelper.init();
  this._context = new robotlegs_bender_framework_impl_Context(errorReporter);
  this._context.afterInitializing($bind(this,this._onInitializeComplete));
  this._context.install(robotlegs_bender_OnyxBundle);
  this._context.configure(de_innogames_onyx_city_configs_MainModuleConfiguration);
  this._context.configure(de_innogames_onyx_city_configs_TutorialConfiguration);
  this._context.configure(de_innogames_onyx_city_configs_CityConfiguration);
  this._context.configure(de_innogames_onyx_shared_configs_SharedComponentConfiguration);
  this._context.configure(de_innogames_onyx_city_configs_FeaturesConfiguration);
  this._context.configure(de_innogames_onyx_city_configs_ShortcutsConfig);
  this._context.configure(de_innogames_onyx_city_configs_PremiumConfig);
  this._context.configure(new robotlegs_bender_extensions_contextView_ContextView(this));
  this._flashHelper.sendKillSignal();
}
```

Then, once the context is initialized:

| Step | Code | What it does |
|---|---|---|
| 1 | `MainModule._onInitializeComplete` (L8113) | `GameClock.init(StageAdaptor.instance, injector.getInstance(openfl.events.IEventDispatcher))`, then `injector.instantiateUnmapped(ConfigurationSequence).execute()` |
| 2 | `de.innogames.onyx.city.controller.bootstrap.ConfigurationSequence` (L390294) | the 31-step async bootstrap chain (below) |
| 3 | `MainModule._onConfigurationComplete` (L8119) | `injector.instantiateUnmapped(PostConfigurationSequence).execute()` |
| 4 | `de.innogames.onyx.city.controller.bootstrap.post.PostConfigurationSequence` (L393018) | post-login UI steps; on complete calls `applicationModel.setLoadingComplete()` |

`MultiplayerModule` (L8195) shows the same pattern for a sub-module: it extends
`de.innogames.shared.mvcs.AbstractModule` (L6794) and in `configure(context)` chains
`context.afterInitializing(_onInitialize).configure(MultiplayerModuleConfiguration)`, then
runs `MultiplayerConfigurationSequence`.

### 1.3 `robotlegs.bender.OnyxBundle` - the installed extensions

`robotlegs.bender.OnyxBundle.extend` (L738442) sets `logLevel = DEBUG` and installs, in order:

`LoggerExtension`, `InjectableLoggerExtension`, `ContextViewExtension`,
`EventDispatcherExtension`, `ModularityExtension`, `DirectCommandMapExtension`,
`EventCommandMapExtension`, `LocalEventMapExtension`, `ViewManagerExtension`,
`OnyxStageObserverExtension`, `MediatorMapExtension`, `ViewProcessorMapExtension`,
`StageSyncExtension`; then `context.configure(ContextViewListenerConfig)`.

### 1.4 `ConfigurationSequence` - the 31 bootstrap steps

`de.innogames.onyx.city.controller.bootstrap.ConfigurationSequence` (L390294) extends
`de.innogames.shared.commands.AsyncSequenceCommand` (L359762). Its constructor (L390259)
registers, in this exact order:

| # | Command (`de.innogames.onyx.city.controller.bootstrap.` unless noted) | Line |
|---|---|---|
| 1 | `console.ConfigureLoggerCommand` | 391901 |
| 2 | `engines.ConfigureStarlingCommand` | 392108 |
| 3 | `assets.ConfigureFontsCommand` | 391646 |
| 4 | `assets.ConfigureAssetManagerCommand` | 391623 |
| 5 | `ConfigureRaceCommand` | 390765 |
| 6 | `ConfigureLoadingScreenCommand` | 390551 |
| 7 | `de.innogames.onyx.shared.streets.commands.ConfigureStreetsCommand` | - |
| 8 | `ConfigureModelCommand` | 390605 |
| 9 | `ConfigureServicesCommand` | 390808 |
| 10 | `ConfigureControllerCommand` | 390347 |
| 11 | `ConfigureSoundsCommand` | 390901 |
| 12 | `ConfigureStaticDataCommand` | 391047 |
| 13 | `ConfigureVideoAdsCommand` | 391168 |
| 14 | `ConfigureStaticBuildingDataCommand` | 391008 |
| 15 | `LoadAbTestCommand` | 391528 |
| 16 | `LoadFeatureManifestsCommand` | 391548 |
| 17 | `ConfigureStartupDataCommand` | 390930 |
| 18 | `console.FlushUncaughtErrorBuffer` | 391982 |
| 19 | `ConfigureWindowCommand` | 391431 |
| 20 | `ConfigureTooltipCommand` | 391056 |
| 21 | `ConfigureViewBehaviorsCommand` | 391183 |
| 22 | `ConfigureIsoEngineCommand` | 390492 |
| 23 | `ConfigureRenderEffectsCommand` | 390794 |
| 24 | `ConfigureShortcutsCommand` | 390850 |
| 25 | `ConfigureViewCommand` | 391199 |
| 26 | `ConfigureTutorialCommand` | 391080 |
| 27 | `ConfigureMetricsTrackerCommand` | 390578 |
| 28 | `assets.LoadGroupsConfigCommand` | 391677 |
| 29 | `assets.LoadEntitiesAssetsCommand` | 391659 |
| 30 | `console.ConfigureConsoleCommand` | 391881 |
| 31 | `console.ConfigureCommunicatorCommand` | 391778 |

`ConfigurationSequence.onProgress` (L390300) dispatches `BootstrapEvent/PROGRESS` on the
global dispatcher and calls `LogService.trackGameStartup(<step class simple name>)`.

`ConfigurationSequence.dispatchCompleteEvent` (L390309) is where "the game is loaded":

```js
applicationModel.set_isLoading(false);
eventDispatcher.dispatchEvent(new PostStartupEvent("PostStartupEvent::getPostStartupData"));
eventDispatcher.dispatchEvent(new BootstrapEvent("BootstrapEvent/FINISHED",progress,total));
eventDispatcher.dispatchEvent(new CRMDisplayPointEvent("CRMDisplayPointEvent::reached","login"));
eventDispatcher.dispatchEvent(new UserDataEvent("UserDataEvent::userDataParsed"));
// + cursor defaults, LogService.logGameLogin(executionTime), ExternalUtil.hideSupportButton()
```

So **`applicationModel.get_isLoading()` flips to `false` at the end of
`ConfigurationSequence`, before `PostConfigurationSequence` runs.** The extension polls
exactly this in `src/inject/local/localVisitPlayer.ts`
(`while (window.aviad_am.get_isLoading()) await sleep(500)`).

`ConfigureStartupDataCommand` (L390930) is the step that pulls the big startup payload
(`StartupService.getData`); the `PostStartupEvent::getPostStartupData` dispatch above is
what triggers the `PostStartupService` call. See `10-models-startup-data.md`.

Failure path: `ConfigurationSequence._onSequenceExecutionError` (L390325) dispatches
`BootstrapEvent/FAILURE` with a message.

### 1.5 `PostConfigurationSequence` - post-login steps

`de.innogames.onyx.city.controller.bootstrap.post.PostConfigurationSequence` (L393018)
builds its step list in `postConstruct()` (i.e. after DI), using `_step(Cmd, [guards])` and
`_parallel([...])` helpers (`_parallel` instantiates
`de.innogames.shared.commands.AsyncParallelCommand`, L390779). Steps in order:

`ConnectSocketCommand` (L391512) -> `post.commands.ShowWelcomeCityWindowCommand` ->
`city.ui.windows.newsletter.commands.ShowNewsletterWindowCommand` ->
`post.commands.ShowUnlockQueuedPortraitsCommand` -> `post.commands.ShowPendingRewardsCommand` ->
`seasonalevents.commands.SeasonalEventsUpdatedCommand` ->
`post.commands.ExecutePendingCallToActionsCommand` ->
*parallel*(`engines.PreloadUiAssetsCommand`, `engines.PreloadTechtreeUiAssetsCommand` guarded
by `post.guards.OnlyDuringTutorial`) -> `post.commands.StartSoundCommand` ->
`engines.LoadCityBackgroundCommand` -> `city.commands.UpdateCityDecorationsCommand` ->
`post.commands.LoadBuildingAnimationsCommand` -> `cashshop.commands.PreloadCashShopCommand` ->
`shared.quests.commands.UpdateQuestCommand`.

On complete: `applicationModel.setLoadingComplete()` -> `_isGameLoaded.set(true)`.

### 1.6 The camera controller site (L390539)

The extension patches `_createCameraController` to capture its return value as
`window.aviad2` (`src/inject/injectMutate.ts`). That method lives on
**`de.innogames.onyx.city.controller.bootstrap.ConfigureIsoEngineCommand`** (class L390492,
method L390539) - the only `_createCameraController` in the bundle:

```js
_createCameraController: function() {
  var isoEngine = this.injector.getInstance(de_innogames_onyx_city_engine_snake_IsoEngine);
  var controller = this.injector.instantiateUnmapped(de_innogames_onyx_city_engine_camera_CityCameraController);
  controller.set_strategyFactory(new de_innogames_onyx_city_engine_camera_CityCameraDragStrategyFactory(isoEngine));
  controller.setStrategy("default");
  return controller;
}
```

So `window.aviad2` is a `de.innogames.onyx.city.engine.camera.CityCameraController`. It is
also mapped into the injector (`injector.map(ICityCameraController).toValue(this._createCameraController())`,
L390527) so `injector.getInstance(aviad['de.innogames.onyx.city.engine.camera.ICityCameraController'])`
returns the same object - the ctor patch is not strictly necessary.

The same command's `_mapEngineSpecificActors` (L390523) maps `StreetInhabitantManager`,
`StreetPlacementMap`, `EntityTooltipManager`, `IOtherCityInteractionModeController` and
`IInteractionModeController`; `_mapEngineSpecificCommands` (L390530) maps 11 iso-engine
event->command pairs.

---

## 2. `de.innogames.onyx.city.model.ApplicationModel`

Class registered at L10650 (ctor L10630), extends `de.innogames.onyx.mvcs.BaseActor`
(L8798), implements `de.innogames.strategycity.main.model.ITickObject` (L10626).
Mapped as a **singleton** in `MainModuleConfiguration.configure` (L389950):
`this.injector.map(ApplicationModel).asSingleton();`

The extension captures the single instance as `window.aviad_am` by patching the constructor
(`patchCtorRegistryAssignment(..., 'de.innogames.onyx.city.model.ApplicationModel', 'aviad_am')`,
`src/inject/injectMutate.ts` L237).

### Fields

| Field | Type / value | Notes |
|---|---|---|
| `injector` | `IInjector` | **DI-injected**; the app-wide `RobotlegsInjector`. The extension's whole "get any singleton" trick hangs off this. |
| `gameLoaded` | `tink.state.State<Bool>` | alias of `_isGameLoaded` |
| `currentModule` | `tink.state.AutoObservable<ApplicationModuleName>` | computed from `_states.currentModule` |
| `_states` | `de.innogames.onyx.city.modules.core.ModuleStateMachine` | module state machine |
| `_isGameLoaded` | `tink.state.State<Bool>` | set `true` by `setLoadingComplete()` |
| `_interactionMode` | `String`, default `"ModeTypes/defaultMode"` | |
| `_reloadWindowShown` | `Bool` | session-timeout guard |
| `_loading` | `Bool`, default `true` | backing field of `isLoading` |
| `_season` | | current season |
| `_mapWidth`, `_mapLength` | `Int` | city map dimensions |
| `_stage` | `openfl.display.Stage` | set via `set_stage` |

Inherited from `BaseActor` (L8798): `eventDispatcher` (injected) and `dispatch(event)`.

### Methods / properties

| Member | Line | Behaviour |
|---|---|---|
| `get_isLoading()` / `set_isLoading(v)` | 10693 / 10696 | plain accessor on `_loading`; `true` from construction until `ConfigurationSequence.dispatchCompleteEvent` |
| `get_interactionMode()` / `set_interactionMode(v)` | 10683 / 10686 | setter dispatches `ApplicationModelEvent/MODE_CHANGED` |
| `get_/set_mapWidth`, `get_/set_mapLength`, `get_/set_season` | 10699-10714 | plain |
| `set_stage(v)` | 10675 | also registers `deactivate`/`activate` listeners |
| `postConstruct()` | 10717 | builds the module state machine, then `changeState(ApplicationModuleName.OWN_CITY)` |
| `setCurrentModule(name)` | 10745 | `_states.changeState(name)` - switches module (OWN_CITY / OTHER_CITY / WORLD_MAP / ...) |
| `setLoadingComplete()` | 10748 | `_isGameLoaded.set(true)` |
| `onTick(step)` | 10721 | session-timeout watchdog: shows the "Session Timed Out" exception window |
| `_onApplicationLostFocus` / `_onApplicationReceiveFocus` | 10739 / 10734 | schedules/unschedules the watchdog on `GameClock` (2,400,000 ms = 40 min), dispatches `ApplicationEvent::LOST_FOCUS` / `ApplicationEvent::RECEIVE_FOCUS` |

`ApplicationModel` exposes no service or model registry of its own - its value to an outside
caller is entirely `am.injector` plus `get_isLoading()` / `gameLoaded` / `currentModule`.

---

## 3. Robotlegs and the injector

### 3.1 Context

`robotlegs.bender.framework.impl.Context` (L741740) implements `IContext` (L14551) and
extends `openfl.events.EventDispatcher`.

| Member | Line | Notes |
|---|---|---|
| `get_injector()` | 741747 | the `RobotlegsInjector` |
| `install(...extensionClasses)` | 741973 (`ExtensionInstaller`) | |
| `configure(config)` | 741860 | `_configManager.addConfig(config)`; accepts a class **or** an instance |
| `beforeInitializing` / `afterInitializing` / `beforeDestroying` / `afterDestroying` | - | lifecycle hooks |
| `detain(o)` / `release(o)` | 741904 / 741913 | pin an object so it survives while an async command runs |
| `addChild` / `removeChild` | 741863 / 741881 | child contexts get their injector's `parent` set |
| `setup()` | 741928 | maps `IInjector`->itself and `IContext`->the context; creates `Pin`, `Lifecycle`, `ConfigManager`, `ExtensionInstaller` |

`ConfigManager` (L741648) is what makes `context.configure(SomeConfigClass)` work: it
instantiates the class through the injector (so a config's `injector`, `context`,
`commandMap`, `mediatorMap`, `eventCommandMap`, `gameHudFactory` fields are DI-filled) and
calls `configure()`.

### 3.2 The injector

`robotlegs.bender.framework.impl.RobotlegsInjector` (L742643) is a thin subclass of
**`org.swiftsuspenders.Injector`** (L737598), adding `parent` / `createChild`. `Injector`
extends `openfl.events.EventDispatcher` and fires `MappingEvent` / `InjectionEvent`.

| Method | Line | Behaviour |
|---|---|---|
| `map(type, name?)` | 737665 | returns an `InjectionMapping` (creates on demand); `name` defaults to `""` |
| `unmap(type, name?)` | 737673 | throws on sealed mappings |
| `getInstance(type, name?, targetType?)` | 737717 | **throws `InjectorMissingMappingError` if not mapped** |
| `getOrCreateNewInstance(type)` | 737735 | `satisfies(type) ? getInstance(type) : instantiateUnmapped(type)` - never throws for a concrete class |
| `instantiateUnmapped(type)` | 737742 | constructs via the described ctor, then applies injection points + `postConstruct` |
| `injectInto(target)` | 737712 | fills injection points on an already-constructed object (and runs `postConstruct`) |
| `hasMapping` / `hasDirectMapping` / `satisfies` / `satisfiesDirectly` | 737796 / 737800 / 737697 / 737701 | mapping probes; `satisfies` walks parent injectors |
| `getMapping(type, name?)` | 737705 | throws if absent |
| `destroyInstance(o)` / `teardown()` | 737754 / 737763 | |
| `createChild(appDomain?)` | 742655 | child injector with `parent` set |
| `mapToValue` / `mapToType` / `mapToSingleton` | 737624-737632 | shorthands |

Mapping IDs are `api.MappingName.makeId(ClassName.ofClassRef(type), name)`, i.e. the FQ
class name plus `|` plus the optional name - `Injector._baseTypes` (built by
`initBaseTypeMappingIds`, L737600) is the list of types that never get a default provider.

**Mapping DSL** - `org.swiftsuspenders.mapping.InjectionMapping` (L738124):

| Method | Line | Provider |
|---|---|---|
| `asSingleton(initializeImmediately=false)` | 738138 | `toSingleton(self)` |
| `toType(type)` | 738145 | `ClassProvider` - a **new** instance per request |
| `toSingleton(type, initializeImmediately=false)` | 738149 | `SingletonProvider`; `true` forces construction now |
| `toValue(value, autoInject?, destroyOnUnmap?)` | 738159 | `ValueProvider` |
| `toProvider(provider)` | 738172 | raw |

Provider lookup (`getProvider`, L737804) walks up the parent-injector chain, deferring
`SoftDependencyProvider` and skipping `LocalOnlyProvider` on non-owning injectors. This is
how module sub-contexts (world map, spire, battle, multiplayer) see the main context's
singletons.

### 3.3 How `postConstruct` fires

`Injector.applyInjectionPoints(target, type, description)` (L737870):

```js
// 1. dispatch PRE_CONSTRUCT (only if a listener is registered)
// 2. description.injectionMethods.forEach(fn => fn(target, this));   // field/method injection
// 3. description.postConstructionMethods.forEach(fn => fn(target));  // @:postConstruct
// 4. if description.preDestroyMethods != null -> remember target in _managedObjects
// 5. dispatch POST_CONSTRUCT
```

`description` comes from the Haxe **macro** reflector
`org.swiftsuspenders.reflection.MacroReflector` (L8728) producing a
`org.swiftsuspenders.typedescriptions.TypeDescription` (L738320); the injection points are
generated at compile time, not read from runtime metadata. Consequence: **injected fields
appear as `null` on the prototype and there is no runtime table listing them** - to see what
a class needs, read its prototype's `null` fields.

`applyInjectionPoints` runs from `instantiateUnmapped`, from `injectInto`, and from the
`ClassProvider` / `SingletonProvider` paths - so `getOrCreateNewInstance` always returns a
fully injected, `postConstruct`ed object.

### 3.4 Mapping style used by the game

```js
this.injector.map(IFxManager).toSingleton(FxManager);   // interface -> shared impl
this.injector.map(ApplicationModel).asSingleton();      // concrete class, one instance
this.injector.map(IRuleCondition).toType(RuleCondition);// interface -> new instance each time
this.injector.map(IStage).toValue(StageAdaptor.get_instance()); // pre-built object
```

`de.innogames.onyx.city.configs.MainModuleConfiguration.configure` (L389946) in full:

```js
this.injector.map(ModuleLoaderService).asSingleton();
this.injector.map(IWindowDecoratorFactory).toSingleton(WindowDecoratorFactory);
this.injector.map(ApplicationModel).asSingleton();
this.injector.map(IStage).toValue(StageAdaptor.get_instance());
this.injector.map(BasicValuesModel).asSingleton();
this.injector.map(IGameHudFactory).toSingleton(GameHudFactory);
this.context.configure(de_innogames_onyx_mvcs_MainModuleCommunicationConfig);
this.context.configure(de_innogames_onyx_city_configs_NetConfiguration);
```

`de.innogames.onyx.city.configs.FeaturesConfiguration.configure` (L389936) is a single
chained `context.configure(...)` call over **54 feature configuration classes** - the master
list of features in the client (ResourceConfiguration, RewardsConfiguration,
QuestConfiguration, TradeConfiguration, MessagingConfiguration, IndicatorsConfiguration,
GuildConfiguration, ChatConfiguration, AncientWondersConfiguration,
ClientInventoryConfiguration, SpellsConfiguration, QueuedProductionConfiguration,
CauldronConfiguration, CraftingConfiguration, ChestConfiguration, CashShopConfiguration,
MicrosoftRatingConfiguration, SupportConfiguration, CRMConfiguration,
TrophiesConfiguration, SeasonalEventsConfiguration, TournamentsConfiguration,
CurrencyEventsConfiguration, ChallengeEventsConfiguration, MultiplayerConfiguration,
MainEventsConfiguration, ShuffleEventConfiguration, TileEventConfiguration,
TreasureConfiguration, SpireConfiguration, BlimpsConfiguration, HelpConfiguration,
EventIntroConfiguration, NewsConfiguration, InGameEmailConfiguration,
InGameShopConfiguration, NewsletterConfiguration, BuildingSetsConfiguration,
ValueManipulationConfiguration, MilestoneConfiguration, StagesConfiguration,
NeighborlyHelpConfiguration, KeyDialogConfiguration, AbsolutionConfig, ManifestConfig,
EventLeagueConfiguration, RoyalPassConfiguration, MergeEventConfiguration,
SeasonPassConfiguration, CmpConfiguration, GuardiansConfiguration,
TranscendenceConfiguration).

---

## 4. The Command pattern

### 4.1 The families

There are **825 classes whose name ends in `Command`**. They fall into four families:

| Base | Line | `execute()` returns | Used for |
|---|---|---|---|
| `de.innogames.shared.mvcs.controller.Command` | 359469 | `Void` | the ordinary event->command workhorse (most of the 825) |
| `robotlegs.bender.bundles.mvcs.Command` | 360152 | `Void` | plain robotlegs base, used where no `eventDispatcher`/`context` is needed |
| `de.innogames.shared.commands.AsyncCommand` | 358150 | `IOperation` | bootstrap / service steps; extends `org.haxecommons.async.operation.impl.AbstractOperation` (L358058) |
| `de.innogames.shared.util.ezcommand.EzCommand` | 366110 | `Void` | macro-generated command + event + mapping triple (see 4.4) |

`de.innogames.shared.mvcs.controller.Command` (L359469) - the one to know:

```js
de_innogames_shared_mvcs_controller_Command.prototype = {
  eventDispatcher: null   // injected: the global dispatcher
  ,injector: null         // injected
  ,context: null          // injected: IContext
  ,execute: function() {}
  ,detain:  function() { this.context.detain(this); }
  ,release: function() { this.context.release(this); }
  ,dispatch: function(event) {
      if(this.eventDispatcher.hasEventListener(event.type))
        return this.eventDispatcher.dispatchEvent(event);
      return false; }
};
```

Note `dispatch()` is a **no-op when nobody listens** - the same guard exists on
`de.innogames.onyx.mvcs.BaseActor.dispatch` (L8800) and
`robotlegs.bender.bundles.mvcs.Mediator.dispatch` (L4146). An event with no registered
command/listener silently vanishes.

`detain()` / `release()` pin the command instance in the context while an async service call
is in flight - both `VisitOtherPlayerCommand` and `DisplayAncientWonderCommand` do this.

### 4.2 Async commands

`org.haxecommons.async.command.ICommand` (L32203) / `IAsyncCommand` (L358026);
`AbstractOperation` (L358058) provides `addCompleteListener` / `addErrorListener` /
`addProgressListener` / `dispatchCompleteEvent` / `dispatchErrorEvent` / timeouts.

Composites:

| Class | Line | Behaviour |
|---|---|---|
| `org.haxecommons.async.command.impl.CompositeCommand` | 358264 | `SEQUENCE` or `PARALLEL` (`CompositeCommandKind`, L737425) |
| `de.innogames.shared.commands.AsyncSequenceCommand` | 359762 | `registerCommand(cmd)`, `execute()`, `get_progress/total/currentCommand/executionTime`. **`_addNextCommand` calls `this.injector.injectInto(command)` before adding** - which is how each bootstrap step gets its dependencies even though it was constructed with `new` in the sequence's ctor |
| `de.innogames.shared.commands.AsyncParallelCommand` | 390779 | parallel variant |
| `de.innogames.shared.commands.ResettableCompositeCommand` | 358427 | re-runnable composite |
| `de.innogames.shared.commands.DynamicCommandSequence` | 657720 | sequence built at runtime |

### 4.3 How `event` gets injected, and `execute()`

`EventCommandTrigger.eventHandler(event)` (L739249):

```js
eventHandler: function(event) {
  var eventConstructor = js_Boot.getClass(event);
  var payloadEventClass;
  if(eventConstructor == this._eventClass || this._eventClass == null) payloadEventClass = eventConstructor;
  else if(this._eventClass == openfl_events_Event)                      payloadEventClass = this._eventClass;
  else return;
  this._executor.executeCommands(this._mappings.getList(),
      new CommandPayload([event],[payloadEventClass]));
}
```

`CommandExecutor.executeCommand(mapping, payload)` (L738605) then does:

```js
// 1. map the payload types temporarily:  injector.map(EventClass).toValue(theEvent)
// 2. evaluate guards (GuardsApprove.call(...))
// 3. command = injector.getOrCreateNewInstance(mapping.commandClass)   <-- injection happens here
// 4. apply hooks
// 5. unmap the payload types
// 6. command.execute()
```

Two consequences that make the extension's trick work:

1. **The `event` field is an ordinary injected field**, filled because the concrete event
   class was temporarily mapped `toValue(event)`. There is nothing magic about it - assigning
   `cmd.event = myEvent` by hand produces the identical state.
2. **`getOrCreateNewInstance` is the exact call the framework itself uses.** A command class
   is normally *not* mapped in the injector, so `satisfies()` is false and the call falls
   through to `instantiateUnmapped`, which constructs it and fills every *other* injected
   field (models, services, `eventDispatcher`, `context`, `injector`) from the live singletons.

`CommandMapping` (L738698) defaults: `_executeMethod = "execute"`, `_payloadInjectionEnabled = true`,
`_fireOnce = false`, empty guards/hooks. The DSL on `CommandMapper` (L738645) is
`.toCommand(C).once().withGuards([...]).withHooks([...]).withExecuteMethod(name).withPayloadInjection(bool)`.

`DirectCommandMap` (L739047) is the fire-once variant used for one-shot work:
`directCommandMap.map(C).execute(payload)`; `DirectCommandMapper` sets `fireOnce = true` in
its constructor.

### 4.4 `EzCommand` - the macro-generated triple

`de.innogames.shared.util.ezcommand.EzCommand` (L366110) is a compile-time macro pattern.
For each subclass the compiler emits three things (example: `SuccessPurchaseCommand`, L366116):

```js
SuccessPurchaseCommand.event = function(product) { return new SuccessPurchaseCommand_$Event(product); };
SuccessPurchaseCommand.map   = function(commandMap) {
  commandMap.map("de.innogames.onyx.cashshop.commands.SuccessPurchaseCommand/EVENT_TYPE")
            .toCommand(SuccessPurchaseCommand); };
SuccessPurchaseCommand.prototype._event = null;             // injected
SuccessPurchaseCommand.prototype.run     = function(product) { ... };
SuccessPurchaseCommand.prototype.execute = function() { this.run(this._event.product); };
```

and a sibling event class `<Command>_Event` (`SuccessPurchaseCommand_$Event`, L41238) whose
`type` is the literal `"<command FQ name>/EVENT_TYPE"`.

There are **36 `_$Event` classes**, i.e. 36 EzCommands. They are easy to spot in the mapping
table below by their `.../EVENT_TYPE` event type. Note the injected field is **`_event`,
not `event`** - so to drive one by hand you set `cmd._event = Cmd.event(args...)`, or simply
call the static factory and dispatch it.

### 4.5 Walk-through 1: `VisitOtherPlayerCommand`

`de.innogames.onyx.city.commands.VisitOtherPlayerCommand` (L387820) extends
`de.innogames.shared.mvcs.controller.Command`. Mapped in
`ConfigureControllerCommand._mapCommandsAndModuleCommands` (L390447):

```js
this.commandMap.map("OtherPlayerEvent::visitPlayer").toCommand(VisitOtherPlayerCommand);
```

Injected fields (the prototype's `null` fields): `ancientWondersModel`, `cityEntitiesModel`,
`friendDataModel`, `effectsModel`, `userModel`, `service`
(`de.innogames.onyx.city.service.OtherPlayerService`), `event`, `eventMap`, plus the three
from the base class (`eventDispatcher`, `injector`, `context`).

```js
execute: function() {
  this.detain();
  this.eventMap.mapListener(this.eventDispatcher,"ServiceExceptionEvent::exception", this._onServiceException);
  this.dispatch(new ShortcutEvent("ShortcutEvent::setDefaultMode"));
  this.dispatch(new LoadingEvent("LoadingEvent::initialize"));
  this.service.visitPlayer(this.event.playerId, this._onVisitedCityLoaded);
}
```

`_onVisitedCityLoaded(playerCityVO)` (L387839) writes the world-map position into
`userModel`, calls `cityEntitiesModel.initializePlayerMapConfiguration(city_map)`, refreshes
the AW phases and friend data, then dispatches
`ModuleChangeEvent("ModuleChangeEvent::changeModule", ApplicationModuleName.OTHER_CITY)` and
`release()`s.

The event: `de.innogames.strategycity.main.controller.event.OtherPlayerEvent` (L14528),
`new OtherPlayerEvent(eventType, playerId = -1)`, one field `playerId`.
Known types: `OtherPlayerEvent::visitPlayer`, `OtherPlayerEvent::enterPlayerCity`,
`OtherPlayerEvent::refreshPlayerCity`, `OtherPlayerEvent::getNeighbourlyHelpBuildings`.

The extension (`src/inject/local/localVisitPlayer.ts`) does exactly this:

```ts
const vopc = window.aviad_am.injector.getOrCreateNewInstance(
  window.aviad['de.innogames.onyx.city.commands.VisitOtherPlayerCommand']);
vopc.event = new window.aviad['de.innogames.strategycity.main.controller.event.OtherPlayerEvent'](
  'OtherPlayerEvent::visitPlayer', playerId);
vopc.execute();
```

The alternative - dispatching `OtherPlayerEvent::visitPlayer` on the global dispatcher -
would work too, but the direct call skips guards/hooks and gives you the command object.

### 4.6 Walk-through 2: `DisplayAncientWonderCommand`

`de.innogames.onyx.city.ancientwonders.commands.DisplayAncientWonderCommand` (L373000),
also a `de.innogames.shared.mvcs.controller.Command`. Injected: `service`, `factory`
(`IAncientWondersWindowFactory`, L16640), `event`, `model`, `friendAncientWondersModel`,
`cityEntitiesModel`.

```js
execute: function() {
  this.detain();
  this.dispatch(new LoaderViewEvent("LoaderViewEvent::SHOW_LOADER"));
  this.context.addEventListener("ServiceExceptionEvent::exception", this._handleServiceException);
  switch(this.event.loadType._hx_index) {
    case 0: break;                                                    // LOAD_ALL -> nothing
    case 1: this.service.getPhase(this.event.playerId,_g.baseName).handle(this.onUpdateThis); break;
    case 2: this.service.getPhase(this.event.playerId,_g.baseName).handle(this.onLoadOnly); break;
  }
}
```

`onLoadOnly(vo)` (L373039) wraps the response in `OtherPlayerAncientWonderList`, updates
`model` + `friendAncientWondersModel`, calls `cityEntitiesModel.initializeEntities(vo.cityMapEntities)`
and finally `createWindow(loadType.ancientWonderId)` (L373054):

```js
createWindow: function(entityConfigId) {
  this.dispatch(new WindowEvent("WindowEvent::addWindow",
      this.factory.createFriendBuildingWindow(entityConfigId, this.event.windowId)));
  this.release();
}
```

The event: `de.innogames.onyx.shared.events.AncientWondersDataEvent` (L40928):

```js
new AncientWondersDataEvent(eventType, playerId, loadType, windowId)
// fields: playerId, loadType (LoadType enum), windowId (String)
```

The enum `de.innogames.onyx.shared.events.LoadType` (L550557,
`$hxEnums["de.innogames.onyx.shared.events.LoadType"]`):

| Constructor | `_hx_index` | Params | Effect in `execute()` |
|---|---|---|---|
| `LOAD_ALL` | 0 | - | no-op (handled elsewhere) |
| `UPDATE_THIS(ancientWonderId, baseName)` | 1 | 2 | `getPhase` -> `onUpdateThis` -> window |
| `LOAD_ONLY(ancientWonderId, baseName)` | 2 | 2 | `getPhase` -> `onLoadOnly` -> window |

**Beware the parameter names**: the real signature is `LOAD_ONLY(ancientWonderId, baseName)`.
`src/inject/aviad.ts` declares it as `LOAD_ONLY(baseName: string, type: string)` - the names
are wrong but the *order* used in `src/inject/local/localOpenAw.ts`
(`LOAD_ONLY(buildingId, baseName)`) is correct: `ancientWonderId` = the entity-config id used
to build the window, `baseName` = what is sent to `AncientWonderService.getPhase`.

The extension's `localOpenAw.ts`:

```ts
const cmd = window.aviad_am.injector.getOrCreateNewInstance(
  window.aviad['de.innogames.onyx.city.ancientwonders.commands.DisplayAncientWonderCommand']);
const enumObj = window.aviad_enum['de.innogames.onyx.shared.events.LoadType'].LOAD_ONLY(buildingId, baseName);
cmd.event = new window.aviad['de.innogames.onyx.shared.events.AncientWondersDataEvent'](
  'displayAncientWonder', playerId, enumObj, 'window_0');
cmd.execute();
```

`'window_0'` is a hand-picked window id (see §7 - real ids come from
`WindowId._hx_new()`); passing a fixed one means a later
`windowsManager.closeWindowWithId('window_0')` will close it.

---

## 5. Events

### 5.1 Shape

Every game event extends `openfl.events.Event` (L10823). The type is a **plain string**;
there is no enum. Three naming conventions coexist:

| Convention | Example |
|---|---|
| `ClassName::method` | `OtherPlayerEvent::visitPlayer`, `WindowEvent::addWindow` |
| `ClassName/CONSTANT` | `BootstrapEvent/PROGRESS`, `PaginationEvent/PAGE_INDEX_CHANGED` |
| bare word | `reload`, `unitAction`, `placeEntity`, `moveEntity`, `displayAncientWonder` |
| EzCommand | `de.innogames.onyx.cashshop.commands.SuccessPurchaseCommand/EVENT_TYPE` |

Constants live as statics at the very end of the bundle
(e.g. `de_innogames_onyx_shared_ui_events_WindowEvent.ADD_WINDOW = "WindowEvent::addWindow";`
L785274) - grep `^\w+\.[A-Z_]+ = "` in the L780000+ region to enumerate them.

**586 classes end in `Event`**, spread over ~90 `*.events` / `*.event` packages. The biggest:

| Package | # |
|---|---|
| `de.innogames.onyx.spire.events` | 24 |
| `de.innogames.onyx.shared.guilds.events` | 24 |
| `de.innogames.strategycity.main.controller.event` | 21 |
| `de.innogames.onyx.city.mainevents.shared.events` | 20 |
| `de.innogames.onyx.city.events` | 14 |
| `de.innogames.strategycity.main.model.events` | 13 |
| `de.innogames.onyx.tournaments.events` / `...multiplayer.events` | 12 each |
| `de.innogames.onyx.shared.events` | 11 |
| `de.innogames.onyx.shared.ui.events` | 10 |

`de.innogames.onyx.shared.events` in full: `TechnologyUnlockedEvent` (17064),
`PayPremiumEvent` (21347), `ApplicationResizeEvent` (40652), `AncientWondersDataEvent`
(40928), `UpdateIndicatorEvent` (56663), `PaymentEvent` (81039), `PayPremiumEventBuilder`
(550587), `ReloadEvent` (550623), `RunningActivityEvent` (550635), `ScreenEvent` (550647),
`StartBattleEvent` (550660).

`de.innogames.strategycity.main.controller.event` in full: `StartProductionEvent` (13216),
`OtherPlayerEvent` (14528), `ProductionEvent` (17550), `MultipleProductionEvent` (23157),
`SettingsEvent` (45421), `NotEnoughPremiumEvent` (46289), `PremiumConfirmDialogueEvent`
(48185), `CityBuildingEvent` (56981), `ModuleDisplayEvent` (62948), `ConstructBuildingEvent`
(79499), `IsoEngineStateEvent` (80407), `SelectSpellEvent` (83515),
`ArmyDeploymentModelEvent` (660017), `CityNameEvent` (660030), `CitySettingsEvent` (660047),
`InventoryBuildingEvent` (660062), `ProvinceEvent` (660083), `ResendActivationEmailEvent`
(660095), `ShowAccountSettingsEvent` (660104), `UpdateEmailEvent` (660116),
`UpdatePasswordEvent` (660125).

### 5.2 Where the shared dispatcher lives

`robotlegs.bender.extensions.eventDispatcher.EventDispatcherExtension` (L739264) creates one
`openfl.events.EventDispatcher` per context and maps it:

```js
extend: function(context) {
  context.get_injector().map(openfl_events_IEventDispatcher).toValue(this._eventDispatcher);
  ...
}
```

So **the global dispatcher is `injector.getInstance(openfl.events.IEventDispatcher)`**
(L15 in classes.tsv). Every `Command.eventDispatcher`, `Mediator.eventDispatcher` and
`BaseActor.eventDispatcher` is that same object. `MainModule._onInitializeComplete` (L8113)
also hands it to `GameClock.init(...)`.

`LifecycleEventRelay` (L739365) republishes context lifecycle events onto it, and
`EventRelay` (L739295) is the mechanism behind the cross-module relays.

### 5.3 Cross-module relaying (modularity)

Sub-modules (world map, spire, battle, multiplayer, tech tree) run in **child contexts with
their own dispatcher**. `de.innogames.onyx.mvcs.MainModuleCommunicationConfig` (L523730) and
`de.innogames.onyx.mvcs.SubModuleCommunicationConfig` (L523750) declare which event types
cross the boundary, on named channels: `application`, `module`, `premium`, `units`, `sounds`,
`tutorial`, `features`.

```js
this.connector.onChannel("module")
  .receiveEvent("ModuleChangeEvent::changeModule")
  .receiveEvent("ModuleEvent::moduleLoaded")
  .receiveEvent("OtherPlayerEvent::visitPlayer")
  .receiveEvent("ShortcutEvent::backToCity")
  .relayEvent("ServiceExceptionEvent::exception") ...
```

`relayEvent` = send outward, `receiveEvent` = accept inward (the two configs are mirror
images). **Practical consequence: an event type not listed in these configs will not reach a
sub-module's commands.** `WindowEvent::addWindow` *is* relayed both ways, so a window opened
from anywhere shows up.

### 5.4 Recipes

**Dispatch a global event**

```js
const inj  = window.aviad_am.injector;
const disp = inj.getInstance(window.aviad['openfl.events.IEventDispatcher']);
const Ev   = window.aviad['de.innogames.strategycity.main.controller.event.OtherPlayerEvent'];
disp.dispatchEvent(new Ev('OtherPlayerEvent::visitPlayer', 12345));
```

This runs *all* commands mapped to that type, with guards and hooks, exactly as a UI click
would.

**Listen to a global event**

```js
disp.addEventListener('BootstrapEvent/FINISHED', e => console.log('loaded', e));
disp.addEventListener('WindowEvent::addWindow', e => console.log('window', e.window));
```

`openfl.events.EventDispatcher` (L31) has the usual
`addEventListener(type, listener, useCapture?, priority?, useWeakReference?)` /
`removeEventListener` / `hasEventListener` / `dispatchEvent`.

Robotlegs' own listener bookkeeping is
`robotlegs.bender.extensions.localEventMap.impl.EventMap` (L739390) -
`mapListener(dispatcher, type, listener, eventClass?)` / `unmapListener(...)` /
`unmapListeners()`. Mediators and `de.innogames.onyx.mvcs.Actor` (L14236) use it so all their
listeners are torn down together; from outside there is no reason to bother with it.

---

## 6. Mediators

### 6.1 Base classes

| Class | Line | Notes |
|---|---|---|
| `robotlegs.bender.extensions.mediatorMap.api.IMediator` | 4109 | `viewComponent`, `initialize`, `destroy`, `postDestroy` |
| `robotlegs.bender.bundles.mvcs.Mediator` | 4121 | the real base: `eventMap`, `eventDispatcher`, `viewComponent`, `addViewListener`, `addContextListener`, `removeViewListener`, `removeContextListener`, `dispatch` |
| `de.innogames.onyx.mvcs.Mediator` | 140117 | adds a `Disposer` and `register(disposable)`; `postDestroy` cancels it. **The base for most game mediators.** |
| `de.innogames.shared.mediator.TickableMediator` | 366546 | + `GameClock` tick |
| `de.innogames.shared.mediator.TabMediator` / `ITabMediator` | 380087 / 380074 | tab bodies |
| `de.innogames.shared.mediator.TickableTabMediator` | 464578 | both |
| `ApplicationMediator` | 4158 | the top-level one; injected `settingsModel`, `view`, `stage`, `applicationModel`, `contextMenuManager`, `supportHandler` |

There is **no `de.innogames.onyx.shared.mvcs` package** - the MVCS base classes live in
`de.innogames.onyx.mvcs.*` (`BaseActor` L8798, `Actor` L14236, `Mediator` L140117) and
`de.innogames.shared.mvcs.*` (`controller.Command` L359469, `view.ViewBase` L10374,
`view.Disposer` L657784, `AbstractModule` L6794).

**430 classes end in `Mediator`.**

### 6.2 How a mediator gets its view

`MediatorMap.map(ViewClass).toMediator(MediatorClass)` (L740032 / L740079), or
`mapMatcher(new TypeMatcher().allOf([A,B])).toMediator(M)` when the view must satisfy several
types at once (very common in `ConfigureWindowCommand`, L391437).

At runtime `MediatorViewHandler` (L740195) notices a view being added to the stage
(`OnyxStageObserver`, L740784), and `MediatorFactory.createMediator` (L739910) runs:

```js
// 1. inject the view itself under each type in the matcher: injector.map(T).toValue(view)
// 2. mediator = injector.instantiateUnmapped(MediatorClass)   // <- all its @inject fields filled
// 3. unmap those types again
// 4. MediatorManager.initializeMediator: mediator.viewComponent = view; mediator.initialize();
```

`MediatorManager` (L739961) also adds a `removedFromStage` listener (when
`mapping.autoRemoveEnabled`, the default) so `destroy()` + `viewComponent = null` +
`postDestroy()` run when the view leaves the display list.

Two names for the view: the framework sets **`viewComponent`**; most game mediators also
declare an injected field named **`view`** (typed to the concrete view class), which the
injector fills from the temporary `map(ViewClass).toValue(view)` in step 1. Both point at the
same object.

### 6.3 Capturing mediator instances from outside

There is no registry of live mediators. The extension's approach
(`patchCtorRegistryAssignment` in `src/inject/injectMutate.ts`) rewrites the bundle text: it
finds `$hxClasses["<FQ name>"] = <Ctor>;`, renames the original constructor to `<Ctor>2aviad`
and substitutes a wrapper that calls it and then stashes `this`:

```js
Ctor = function(args){ Ctor2aviad.call(this,args);
  window['<field>'] = this;
  (window['<field>_a'] ||= []).push(this); };
$hxClasses["<FQ name>"] = Ctor;
```

so `window.<field>` is the most recent instance and `window.<field>_a` is every instance ever
constructed. Currently patched:

| FQ class | Line | Global | Kind |
|---|---|---|---|
| `de.innogames.onyx.spire.views.windows.diplomacy.SpireDiplomacyWindowMediator` | 625724 | `aviad_wm` | mediator |
| `de.innogames.onyx.city.engine.snake.components.layers.SnakeInteractiveLayerMediator` | 404275 | `aviad_silm` | mediator |
| `de.innogames.onyx.shared.ui.components.pagination.Pagination` | 75946 | `aviad_pagination` (+ `_a`) | view component |
| `de.innogames.onyx.spire.wrappers.SpireEncounter` | 630049 | `aviad_se` | model wrapper |
| `de.innogames.onyx.networking.services.TreasureService` | - | `aviad_ts` | service |
| `de.innogames.onyx.city.treasure.model.TreasureViewModel` | 80872 | `aviad_tv` | model |
| `de.innogames.onyx.city.model.ApplicationModel` | 10650 | `aviad_am` | model (singleton) |

This is the only reliable route for mediators, because they are never mapped in the injector
(`instantiateUnmapped`). For anything mapped as a singleton (models, services, managers),
prefer `injector.getInstance(...)` - no patching needed.

`SnakeInteractiveLayerMediator` is mapped in `CityViewConfiguration.configure` (L389921):
`mediatorMap.map(SnakeInteractiveLayer).toMediator(SnakeInteractiveLayerMediator)`.

### 6.4 viewProcessorMap

`robotlegs.bender.extensions.viewProcessorMap.impl.ViewProcessorMap` (L741267) is the
lighter-weight alternative used when a view needs *processing* rather than a mediator:
`viewProcessorMap.map(ViewClass).toProcess(processorInstance)` /
`.toInjection()` / `.toNoProcess()`. `ViewInjectionProcessor` (L741102) simply runs
`injector.injectInto(view)`. `AbstractMediatorProcessor` (L414615) is the game's bridge that
picks a mediator class per view instance - e.g.
`ExpansionRendererMediatorProcessor().mapExpansionSource("construction_menu", ...)` in
`ConfigureWindowCommand` (L391484).

---

## 7. Windows

### 7.1 The mechanism

There is no direct "open window" API. Windows are **display objects** that get handed to the
window manager by dispatching one global event:

```js
eventDispatcher.dispatchEvent(
    new de_innogames_onyx_shared_ui_events_WindowEvent("WindowEvent::addWindow", windowInstance));
```

`de.innogames.onyx.shared.ui.events.WindowEvent` (L597618): `new WindowEvent(type, window)`,
one field `window`. Constants (L785273-4): `CLOSE_WINDOW = "WindowEvent::closeWindow"`,
`ADD_WINDOW = "WindowEvent::addWindow"`. **269 sites in the bundle dispatch `addWindow`.**

The listener is `de.innogames.onyx.city.ui.windows.management.WindowsViewContainerMediator`
(L499221). Its `initialize()` (L499231) wires:

| Event | Handler |
|---|---|
| `WindowEvent::addWindow` | `_onAddWindow` -> queue if `isQueueable` and something is open, else `_showWindow` |
| `WindowEvent::closeWindow` | `_onCloseWindow` |
| `CloseWindowsEvent::closeAllWindows` | `windowsManager.closeAllWindows()` |
| `CloseWindowsEvent::closeGroupWindows` | `windowsManager.closeGroupWindows(event.group)` |
| `ApplicationResizeEvent/RESIZED` | resize |

`_showWindow` also disables iso-engine dragging while any window is open.
The world-map module has its own equivalent listener in
`de.innogames.onyx.worldmap.view.WorldMapViewManager` (L649250, listener at L649267).

### 7.2 `WindowsManager`

`de.innogames.onyx.shared.windows.managements.WindowsManager` (L615349), implements
`IWindowsManager` (L28057), extends `BaseActor`. It is mapped as a singleton, so:
`injector.getInstance(aviad['de.innogames.onyx.shared.windows.managements.IWindowsManager'])`.

| Method | Line | Notes |
|---|---|---|
| `addWindow(w)` | 615367 | throws on `null`; registers + adds to the view container |
| `closeWindow(w)` | 615373 | `w.close()` then unregister |
| `closeWindowWithId(id)` | 615380 | scans open windows for `get_windowId() == id` |
| `closeAllWindows()` | 615389 | **no-op while a blocking (non-closable) window is open** |
| `closeGroupWindows(group)` | 615395 | `group` defaults to `"common"` on `BaseWindow` |
| `hasOpenWindows()` / `hasBlockingWindows()` / `get_numOpenWindows()` | 615404 / 615407 / 615364 | |
| `whenClosedWindow(id)` | 615437 | returns a `tink.core.Future` that fires when that id closes |

### 7.3 Window ids

`de.innogames.onyx.shared.windows.managements.WindowId._hx_new()` (L615336):

```js
return "window_" + Std.string(WindowId__uniqueId++);
```

A plain abstract over `String`; ids are `window_0`, `window_1`, ... allocated in construction
order from a single module-level counter. `IBaseWindow.get_windowId()/set_windowId()` (L11831)
expose it, and it is **optional** - `BaseWindow._windowId` starts as `null`
(`BaseWindow` ctor, L11855).

`DisplayAncientWonderCommand` passes `event.windowId` straight through to
`AncientWondersWindowFactory.createFriendBuildingWindow(entityConfigId, windowId)` (L379400),
which does `window.set_windowId(windowId)`. That is why the extension can invent
`'window_0'`: nothing validates it, it is only a handle for `closeWindowWithId` /
`whenClosedWindow`.

### 7.4 Where windows come from

Windows are built by **factories**, each mapped to an interface in a feature configuration:

| Factory interface | Line | Sample method |
|---|---|---|
| `de.innogames.onyx.shared.ui.windows.factory.IWindowsFactory` | 19308 | `createWindow`, `createConstructionWindow`, `createQuestWindow`, `createKnowledgePointsWindow`, `createCauldronWindow`, ... (30 methods) |
| `de.innogames.onyx.city.ancientwonders.views.factories.IAncientWondersWindowFactory` | 16640 | `createFriendBuildingWindow(entityConfigId, windowId)` |
| `de.innogames.onyx.shared.ui.windows.factory.IExceptionWindowFactory` | 32396 | `createExceptionWindow()` |
| `de.innogames.onyx.shared.rewards.factories.IRewardWindowFactory` | 32619 | |
| `de.innogames.onyx.shared.guilds.views.factories.IGuildWindowFactory` | 36994 | |
| `de.innogames.onyx.spire.factories.SpireWindowsFactory` | 21268 | |
| `de.innogames.onyx.city.inventoryitems.windows.factories.IInventoryWindowFactory` | 49883 | |
| `de.innogames.onyx.city.notifications.view.factories.INotificationWindowsFactory` | 46069 | |
| ... ~25 more `*WindowFactory` / `*WindowsFactory` interfaces | | see `classes.tsv` |

Most features additionally expose a **`Show...Event` / `Open...Event` mapped to a command**
that builds and dispatches the window for you - that is the preferred route (see the mapping
table: e.g. `ShowHelpWindowEvent::show`, `ShowStageOverviewEvent::show`,
`ShortcutEvent::openTechTree`, `ShortcutEvent::openInventory`, ...). Opening a window through
its shortcut event is one line and gets all the model loading for free.

---

## 8. Where the mappings live

`eventCommandMap` / `commandMap` registrations happen in three kinds of place:

1. **Bootstrap commands** run once from `ConfigurationSequence` -
   `ConfigureControllerCommand` (L390347) alone contributes **108 mappings**, split across
   `_mapCommands` (L390384), `_mapModuleCommands` (L390438),
   `_mapCommandsAndModuleCommands` (L390444), `_mapSectorModeCommands` (L390475),
   `_mapCRMAndBundleCommands` (L390379), `_mapCityCommands` (L390367) and `_mapControllers`
   (L390364). `ConfigureIsoEngineCommand`, `ConfigureModelCommand`, `ConfigureSoundsCommand`
   and `ConfigureTutorialCommand` add more.
2. **`IConfig` classes** (`*Config` / `*Configuration`, 663 of them) reached via
   `context.configure(...)`, most of them from the single chain in `FeaturesConfiguration`
   (L389936). They receive `commandMap` / `eventCommandMap` / `mediatorMap` / `injector` /
   `context` by injection.
3. **EzCommand static `map(commandMap)`** methods on the command class itself (36 of them).

The injected field is called `commandMap` in 431 places and `eventCommandMap` in 96 - both
resolve to the same `robotlegs.bender.extensions.eventCommandMap.impl.EventCommandMap`
(L739176) singleton mapped by `EventCommandMapExtension` (L739160).

**Total: 565 `map("...").toCommand(...)` registrations across 100 owner classes.**

### 8.1 Full event type -> command table

The `Event class` column is inferred from the bundle (static `TYPE = "..."` constants,
`openfl_events_Event.call(this,"...")` in event constructors and `new XxxEvent("...")` call
sites); where several classes can carry the same string, all are listed. A `map object:`
note marks the few owners that use a field other than `commandMap`.

#### `de.innogames.onyx.battle.configs.BattleControllerConfig` (L359292) - 17 mappings

| Event type | Command | Event class |
|---|---|---|
| `BattleEvent::startAutoBattle` | `de.innogames.onyx.battle.controller.StartAutoBattleCommand` | `de.innogames.onyx.battle.events.BattleEvent` |
| `BattleEvent::surrenderClicked` | `de.innogames.onyx.battle.controller.HandlerSurrenderButtonClickedCommand` | `de.innogames.onyx.battle.events.BattleEvent` |
| `BattleEvent::surrender` | `de.innogames.onyx.battle.controller.SurrenderBattleCommand` | `de.innogames.onyx.battle.events.BattleEvent` |
| `unitAction` | `de.innogames.onyx.battle.controller.AddUnitActionToModelCommand` | `de.innogames.onyx.battle.events.BattlefieldEvent` |
| `finishTurn` | `de.innogames.onyx.battle.controller.FinishTurnCommand` | `de.innogames.onyx.battle.events.BattlefieldEvent` |
| `TurnEvent::turnFinished` | `de.innogames.onyx.battle.controller.UpdateBuffsByTurnCommand` | `de.innogames.onyx.battle.events.TurnEvent` |
| `TurnEvent::submitTurn` | `de.innogames.onyx.battle.controller.SubmitFinishedTurnCommand` | `de.innogames.onyx.battle.events.TurnEvent` |
| `BattleStateEvent::gameOver` | `de.innogames.onyx.battle.controller.GameOverCommand` | `de.innogames.onyx.battle.events.BattleStateEvent` |
| `ModuleContextEvent::destroyContext` | `de.innogames.onyx.battle.controller.DestroyBattleCommand` | `de.innogames.onyx.ModuleContextEvent` |
| `animationSpeedChanged` | `de.innogames.onyx.battle.controller.UpdateUnitAnimationSpeedCommand` | `de.innogames.onyx.battle.events.AnimationSettingsEvent` |
| `changePlaybackSpeed` | `de.innogames.onyx.battle.controller.ChangeBattlePlaybackSpeedCommand` | `de.innogames.onyx.battle.events.ChangeBattlePlaybackSpeedEvent` |
| `UnitsSquadEvent::highlight` | `de.innogames.onyx.battle.ui.initiativeBar.commands.HighlightUnitCommand` | `de.innogames.onyx.shared.battle.events.UnitsSquadEvent` |
| `BattleCameraEvent/update` | `de.innogames.onyx.battle.controller.grid.UpdateCameraCommand` | `de.innogames.onyx.battle.events.BattleCameraEvent` |
| `SeasonalEventsEvent::ended` | `de.innogames.onyx.tournaments.commands.TournamentEndedBattleCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsEvent` |
| `LeaveBattleAfterTournamentEndedEvent::leaveBattle` | `de.innogames.onyx.tournaments.commands.LeaveBattleAfterTournamentEndedCommand` | `de.innogames.onyx.tournaments.events.LeaveBattleAfterTournamentEndedEvent` |
| `UpdateBattleEvent::update_state` | `de.innogames.onyx.battle.controller.UpdateBattleStateCommand` | `de.innogames.onyx.battle.events.UpdateBattleEvent` |
| `hit` | `de.innogames.onyx.battle.ui.initiativeBar.commands.HandleUnitHitCommand` | `de.innogames.onyx.battle.events.BattleUnitAnimationEvent` |

#### `de.innogames.onyx.battle.configs.BattleGridConfig` (L359352) - 4 mappings

| Event type | Command | Event class |
|---|---|---|
| `GridActionEvent/activate` | `de.innogames.onyx.battle.controller.grid.ActivateGridActionsCommand` | `de.innogames.onyx.battle.events.BattlefieldEvent`, `de.innogames.onyx.battle.events.GridActionEvent` |
| `GridActionEvent/rollOver` | `de.innogames.onyx.battle.controller.grid.GridRollOverCommand` | `de.innogames.onyx.battle.events.GridActionEvent` |
| `GridActionEvent/rollOut` | `de.innogames.onyx.battle.controller.grid.GridRollOutCommand` | `de.innogames.onyx.battle.events.GridActionEvent` |
| `GridActionEvent/click` | `de.innogames.onyx.battle.controller.grid.GridClickCommand` | `de.innogames.onyx.battle.events.GridActionEvent` |

#### `de.innogames.onyx.cashshop.commands.SuccessPurchaseCommand` (L366117) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.cashshop.commands.SuccessPurchaseCommand/EVENT_TYPE` | `de.innogames.onyx.cashshop.commands.SuccessPurchaseCommand` | `de.innogames.onyx.cashshop.commands.SuccessPurchaseCommand_Event` |

#### `de.innogames.onyx.cashshop.configs.CashShopControllerConfiguration` (L366159) - 3 mappings

| Event type | Command | Event class |
|---|---|---|
| `OfferEvent::removeOffer` | `de.innogames.onyx.cashshop.commands.GetCashShopCommand` | `de.innogames.onyx.city.offers.events.OfferEvent` |
| `CashShopEvent::getProducts` | `de.innogames.onyx.cashshop.commands.GetCashShopCommand` | `de.innogames.onyx.cashshop.events.CashShopEvent` |
| `PaymentEvent::openWindow` | `de.innogames.onyx.cashshop.commands.OpenCashShopCommand` | `de.innogames.onyx.shared.events.PaymentEvent` |

#### `de.innogames.onyx.chests.configs.ChestControllerConfiguration` (L370450) - 11 mappings

| Event type | Command | Event class |
|---|---|---|
| `OpenChestEvent::open` | `de.innogames.onyx.chests.commands.OpenChestCommand` | `de.innogames.onyx.chests.events.OpenChestEvent` |
| `OpenChestEvent::openAndCollect` | `de.innogames.onyx.chests.commands.OpenChestAndCollectCommand` | `de.innogames.onyx.chests.events.OpenChestEvent` |
| `ChestsModelUnavailableEvent::UPDATE_UNAVAILABLE_CHESTS` | `de.innogames.onyx.chests.commands.UpdateUnavailableChestsCommand` | `de.innogames.onyx.chests.events.ChestsModelUnavailableEvent` |
| `ChestsModelProgressEvent::updatePayInProgress` | `de.innogames.onyx.chests.commands.UpdatePayInProgressCommand` | `de.innogames.onyx.chests.events.ChestsModelPayInProgressEvent` |
| `ChestsModelContributionsEvent::updateContributions` | `de.innogames.onyx.chests.commands.UpdateContributionsCommand` | `de.innogames.onyx.chests.events.ChestsModelContributionsEvent` |
| `ShowPayInAlertWindowEvent::show` | `de.innogames.onyx.chests.commands.ShowPayInAlertWindowCommand` | `de.innogames.onyx.chests.events.ShowPayInAlertWindowEvent` |
| `ShowChestRewardEvent::show` | `de.innogames.onyx.chests.commands.ShowChestRewardAlertCommand` | `de.innogames.onyx.chests.events.ShowChestRewardEvent` |
| `PayInEvent::payIn` | `de.innogames.onyx.chests.commands.PayInChestCommand` | `de.innogames.onyx.chests.events.PayInChestEvent` |
| `PayInEvent::payInWithPremium` | `de.innogames.onyx.chests.commands.PayInChestCommand` | `de.innogames.onyx.chests.events.PayInChestEvent` |
| `ChestRotationEvent::getRotations` | `de.innogames.onyx.chests.commands.GetRotationsCommand` | `de.innogames.onyx.chests.events.ChestRotationsEvent` |
| `ChestRotationEvent::updateRotations` | `de.innogames.onyx.chests.commands.UpdateRotationsCommand` | `de.innogames.onyx.chests.events.ChestRotationsEvent` |

#### `de.innogames.onyx.city.ancientwonders.commands.UpdateAllPhasesCommand` (L373337) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.ancientwonders.commands.UpdateAllPhasesCommand/EVENT_TYPE` | `de.innogames.onyx.city.ancientwonders.commands.UpdateAllPhasesCommand` | `de.innogames.onyx.city.ancientwonders.commands.UpdateAllPhasesCommand_Event` |

#### `de.innogames.onyx.city.ancientwonders.configs.AncientWondersControllerConfiguration` (L373419) - 18 mappings

map object: `eventCommandMap`

| Event type | Command | Event class |
|---|---|---|
| `cancelEntity` | `de.innogames.onyx.city.ancientwonders.commands.CancelAncientWonderUpgradeCommand` | `de.innogames.onyx.city.modes.events.CitySectorModeEvent` |
| `investKnowledgePoints` | `de.innogames.onyx.city.ancientwonders.commands.InvestKnowledgePointsCommand` | `de.innogames.onyx.city.ancientwonders.events.InvestKnowledgePointsEvent` |
| `investRuneshards` | `de.innogames.onyx.city.ancientwonders.commands.InvestRuneshardsCommand` | `de.innogames.onyx.city.ancientwonders.events.InvestRuneShardsEvent` |
| `investFriendKnowledgePoints` | `de.innogames.onyx.city.ancientwonders.commands.InvestFriendKnowledgePointsCommand` | `de.innogames.onyx.city.ancientwonders.events.InvestKnowledgePointsEvent` |
| `investFreeFriendKnowledgePoints` | `de.innogames.onyx.city.ancientwonders.commands.InvestFreeFriendKnowledgePointsCommand` | `de.innogames.onyx.city.ancientwonders.events.InvestKnowledgePointsEvent` |
| `AncientWonderWindowEvent::openWindow` | `de.innogames.onyx.city.ancientwonders.commands.OpenDetailWindowCommand` | `de.innogames.onyx.city.ancientwonders.events.AncientWonderWindowEvent` |
| `AncientWondersDataEvent::update` | `de.innogames.onyx.city.ancientwonders.commands.UpdateAncientWonderDataCommand` | `de.innogames.onyx.shared.events.AncientWondersDataEvent` |
| `InsertRuneShardsEvent::insertShard` | `de.innogames.onyx.city.ancientwonders.commands.InsertRuneShardsCommand` | `de.innogames.onyx.city.ancientwonders.events.InsertRuneShardsEvent` |
| `InsertRuneShardsEvent::forgeShard` | `de.innogames.onyx.city.ancientwonders.commands.ForgeRuneShardsCommand` | `de.innogames.onyx.city.ancientwonders.events.InsertRuneShardsEvent` |
| `InstantForgeInsertShardEvent::instantForgeShard` | `de.innogames.onyx.city.ancientwonders.commands.InstantForgeRuneShardsCommand` | `de.innogames.onyx.city.ancientwonders.events.InstantForgeInsertShardEvent` |
| `AncientWondersHelpRewardEvent::showReward` | `de.innogames.onyx.city.ancientwonders.commands.ShowAncientWondersHelpRewardCommand` | `de.innogames.onyx.city.ancientwonders.events.AncientWondersHelpRewardEvent` |
| `SpireRewardsEvent::showSpireAncientWonderRewards` | `de.innogames.onyx.city.ancientwonders.commands.ShowSpireAncientWonderRewardCommand` | `de.innogames.onyx.spire.events.SpireRewardsEvent` |
| `CastSpellEvent::cast_spell` | `de.innogames.onyx.city.ancientwonders.commands.ShowResourcesPerSpellEffectCommand` | `de.innogames.onyx.city.spells.events.CastSpellEvent` |
| `AncientWondersDataEvent::showOtherPlayerAncientWonders` | `de.innogames.onyx.city.ancientwonders.commands.ShowOtherPlayerAncientWondersCommand` | `de.innogames.onyx.shared.events.AncientWondersDataEvent` |
| `AncientWondersDataEvent::displayAncientWonder` | `de.innogames.onyx.city.ancientwonders.commands.DisplayAncientWonderCommand` | `de.innogames.onyx.shared.events.AncientWondersDataEvent` |
| `FavoriteAncientWonderEvent::setFavorite` | `de.innogames.onyx.city.ancientwonders.commands.SetFavoriteCommand` | `de.innogames.onyx.city.ancientwonders.views.details.components.events.FavoriteAncientWonderEvent` |
| `FriendDataModelEvent/PLAYER_UPDATED` | `de.innogames.onyx.city.ancientwonders.commands.UpdatePlayerCommand` | `de.innogames.strategycity.main.model.events.FriendDataModelEvent` |
| `de.innogames.onyx.city.ancientwonders.commands.UpdateAllPhasesCommand/EVENT_TYPE` | `de.innogames.onyx.city.ancientwonders.commands.UpdateAllPhasesCommand` | `de.innogames.onyx.city.ancientwonders.commands.UpdateAllPhasesCommand_Event` |

#### `de.innogames.onyx.city.buildingsets.configs.BuildingSetsControllerConfiguration` (L382609) - 2 mappings

| Event type | Command | Event class |
|---|---|---|
| `ShowMoveWarningAlertWindowEvent::show` | `de.innogames.onyx.city.buildingsets.commands.ShowMoveWarningAlertWindowCommand` | `de.innogames.onyx.city.buildingsets.events.ShowMoveWarningAlertWindowEvent` |
| `ShowSetOverviewWindowEvent::show` | `de.innogames.onyx.city.buildingsets.commands.ShowSetOverviewWindowCommand` | `de.innogames.onyx.city.buildingsets.events.ShowSetOverviewWindowEvent` |

#### `de.innogames.onyx.city.challengeevents.configs.ChallengeEventsControllerConfiguration` (L383923) - 3 mappings

| Event type | Command | Event class |
|---|---|---|
| `SeasonalEventsModelEvent::modelUpdated` | `de.innogames.onyx.city.challengeevents.commands.UpdateChallengeEventCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsModelEvent` |
| `ChallengeEventRewardEvent::showRewards` | `de.innogames.onyx.city.challengeevents.commands.ShowChallengeEventRewardCommand` | `de.innogames.onyx.city.challengeevents.events.ChallengeEventRewardEvent` |
| `SeasonalEventsEvent::ended` | `de.innogames.onyx.city.challengeevents.commands.ChallengeEventEndedCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsEvent` |

#### `de.innogames.onyx.city.chat.configs.ChatControllerConfiguration` (L385311) - 4 mappings

map object: `eventCommandMap`

| Event type | Command | Event class |
|---|---|---|
| `ChatMessageEvent::newChatMessage` | `de.innogames.onyx.city.chat.commands.NewChatMessageCommand` | `de.innogames.onyx.city.chat.events.ChatMessageEvent` |
| `SendChatMessageEvent::sendChatMessage` | `de.innogames.onyx.city.chat.commands.SendChatMessageCommand` | `de.innogames.onyx.city.chat.events.SendChatMessageEvent` |
| `ChatHistoryEvent::getHistory` | `de.innogames.onyx.city.chat.commands.GetChatHistoryCommand` | `de.innogames.onyx.city.chat.events.ChatHistoryEvent` |
| `MarkChatRoomAsReadEvent/MARK_ROOM_AS_READ` | `de.innogames.onyx.city.chat.commands.ReadChatRoomCommand` | `de.innogames.onyx.city.chat.events.MarkChatRoomAsReadEvent` |

#### `de.innogames.onyx.city.configs.NetConfiguration` (L389961) - 4 mappings

| Event type | Command | Event class |
|---|---|---|
| `ConnectionServiceErrorEvent/ERROR` | `de.innogames.strategycity.main.controller.ShowConnectionErrorCommand` | `de.innogames.shared.mvcs.event.ConnectionServiceErrorEvent` |
| `ServiceExceptionEvent::exception` | `de.innogames.strategycity.main.controller.ShowExceptionWindowCommand` | `de.innogames.strategycity.main.service.events.ServiceExceptionEvent` |
| `RedirectEvent::redirectTo` | `de.innogames.strategycity.main.controller.RedirectCommand` | `de.innogames.strategycity.main.service.events.RedirectEvent` |
| `reload` | `de.innogames.onyx.shared.commands.ReloadCommand` | `de.innogames.onyx.shared.events.ReloadEvent` |

#### `de.innogames.onyx.city.configs.PremiumConfig` (L389985) - 3 mappings

| Event type | Command | Event class |
|---|---|---|
| `PremiumConfirmDialogueEvent/SHOW` | `de.innogames.strategycity.main.controller.ConfirmPremiumPaymentCommand` | `de.innogames.strategycity.main.controller.event.PremiumConfirmDialogueEvent` |
| `NotEnoughPremiumEvent/SHOW` | `de.innogames.strategycity.main.controller.ShowNotEnoughPremiumCommand` | `de.innogames.strategycity.main.controller.event.NotEnoughPremiumEvent` |
| `PayPremiumEvent/PAY` | `de.innogames.onyx.shared.commands.PayPremiumCommand` | `de.innogames.onyx.shared.events.PayPremiumEvent` |

#### `de.innogames.onyx.city.configs.ShortcutsConfig` (L389998) - 16 mappings

| Event type | Command | Event class |
|---|---|---|
| `ShortcutEvent::activateNeighborlyHelp` | `de.innogames.onyx.city.shortcuts.ActivateNeighborlyHelpCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::openPlayersRanking` | `de.innogames.onyx.city.shortcuts.OpenPlayersRankingCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::openTechTree` | `de.innogames.onyx.city.shortcuts.OpenTechTreeCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::openWorldMap` | `de.innogames.onyx.city.shortcuts.OpenWorldMapCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::openMagicAcademy` | `de.innogames.strategycity.main.controller.OpenMagicAcademyWindowCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::backToCity` | `de.innogames.onyx.city.shortcuts.BackToCityCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::openConstructionMenu` | `de.innogames.onyx.city.shortcuts.OpenConstructionMenuCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::openInventory` | `de.innogames.onyx.city.shortcuts.OpenInventoryCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::openAncientWonders` | `de.innogames.onyx.city.shortcuts.OpenAncientWondersCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::openNotifications` | `de.innogames.onyx.city.shortcuts.OpenNotificationsCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::setDefaultMode` | `de.innogames.onyx.city.shortcuts.SetDefaultModeCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::openMessages` | `de.innogames.onyx.city.shortcuts.OpenMessagesCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::openTrader` | `de.innogames.onyx.city.shortcuts.OpenTraderCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::logout` | `de.innogames.onyx.city.shortcuts.LogoutCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::openSpire` | `de.innogames.onyx.spire.commands.EnterSpireCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `ShortcutEvent::openCrafting` | `de.innogames.onyx.city.shortcuts.OpenCraftingCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |

#### `de.innogames.onyx.city.controller.bootstrap.ConfigureControllerCommand` (L390347) - 108 mappings

| Event type | Command | Event class |
|---|---|---|
| `CityEvent::CREATE_OTHER_CITY` | `de.innogames.onyx.city.commands.CreateOtherCityCommand` | `de.innogames.onyx.city.events.CityEvent` |
| `CityEvent::ENTER_OTHER_CITY` | `de.innogames.onyx.city.commands.EnterOtherCityCommand` | `de.innogames.onyx.city.events.CityEvent` |
| `CityEvent::LEAVE_OTHER_CITY` | `de.innogames.onyx.city.commands.LeaveOtherCityCommand` | `de.innogames.onyx.city.events.CityEvent` |
| `CityEvent::ENTER_OWN_CITY` | `de.innogames.onyx.city.commands.EnterOwnCityCommand` | `de.innogames.onyx.city.events.CityEvent` |
| `CityEvent::LEAVE_OWN_CITY` | `de.innogames.onyx.city.commands.LeaveOwnCityCommand` | `de.innogames.onyx.city.events.CityEvent` |
| `CityEvent::SHOW_CITY` | `de.innogames.onyx.city.commands.engine.ShowCityCommand` | `de.innogames.onyx.city.events.CityEvent` |
| `IsoEngineStateEvent::activateEngine` | `de.innogames.onyx.city.commands.engine.ActivateIsoEngineCommand` | `de.innogames.strategycity.main.controller.event.IsoEngineStateEvent` |
| `IsoEngineStateEvent::deactivateEngine` | `de.innogames.onyx.city.commands.engine.DeactivateIsoEngineCommand` | `de.innogames.strategycity.main.controller.event.IsoEngineStateEvent` |
| `CityInhabitantEvent::startInhabitants` | `de.innogames.onyx.city.commands.StartInhabitantsCommand` | `de.innogames.onyx.city.events.CityInhabitantEvent` |
| `CityInhabitantEvent::stopInhabitants` | `de.innogames.onyx.city.commands.StopInhabitantsCommand` | `de.innogames.onyx.city.events.CityInhabitantEvent` |
| `OfferEvent::removeOffer` | `de.innogames.onyx.city.offers.commands.RemoveOfferCommand` | `de.innogames.onyx.city.offers.events.OfferEvent` |
| `OfferModelEvent::updateOffers` | `de.innogames.onyx.city.offers.commands.UpdateOffersCommand` | `de.innogames.onyx.city.offers.events.OfferModelEvent` |
| `OfferModelEvent::offersUpdated` | `de.innogames.onyx.city.offers.commands.OffersUpdatedCommand` | `de.innogames.onyx.city.offers.events.OfferModelEvent` |
| `ExceededResourceLimitEvent::resourceLimitExceeded` | `de.innogames.onyx.city.commands.errors.ExceededResourceLimitCommand` | `de.innogames.onyx.city.events.ExceededResourceLimitEvent` |
| `PostStartupEvent::getPostStartupData` | `de.innogames.strategycity.main.controller.GetPostStartupDataCommand` | `de.innogames.strategycity.main.service.events.PostStartupEvent` |
| `CityEntityBlimpsEvent::showBlimps` | `de.innogames.onyx.city.commands.ShowBlimpsOnEntityCommand` | `de.innogames.onyx.city.ui.events.CityEntityBlimpsEvent` |
| `InstantFinishConstructionEvent/INSTANT_FINISH_CONSTRUCTION` | `de.innogames.onyx.city.controller.InstantFinishConstructionCommand` | `de.innogames.onyx.city.controller.events.InstantFinishConstructionEvent` |
| `UpdateIndicatorEvent::markAsViewed` | `de.innogames.onyx.shared.commands.MarkIndicatorAsViewedCommand` | `de.innogames.onyx.shared.events.UpdateIndicatorEvent` |
| `ReplaceEntityEvent::replace` | `de.innogames.onyx.city.commands.ReplaceEntityCommand` | `de.innogames.onyx.city.events.ReplaceEntityEvent` |
| `AddGuardianEntityEvent::add` | `de.innogames.onyx.city.commands.AddGuardianEntityCommand` | `de.innogames.onyx.city.events.AddGuardianEntityEvent` |
| `CityBuildingEvent/UPGRADE_BUILDING` | `de.innogames.onyx.city.controller.UpgradeBuildingCommand` | `de.innogames.strategycity.main.controller.event.CityBuildingEvent` |
| `CityBuildingEvent/CONFIRM_BUILDING_UPGRADE` | `de.innogames.onyx.city.commands.ConfirmUpgradeCommand` | `de.innogames.strategycity.main.controller.event.CityBuildingEvent` |
| `CityBuildingEvent/CONFIRM_BUILDING_MOVE_AND_UPGRADE` | `de.innogames.onyx.city.commands.ConfirmMoveAndUpgradeCommand` | `de.innogames.strategycity.main.controller.event.CityBuildingEvent` |
| `HighlightEvent::confirmGet` | `de.innogames.onyx.city.commands.ConfirmGetRequiredCommand` | `de.innogames.onyx.city.events.HighlightEvent` |
| `MultipleProductionEvent::startAllProductions` | `de.innogames.onyx.city.commands.StartAllProductionsCommand` | `de.innogames.strategycity.main.controller.event.MultipleProductionEvent` |
| `StartProductionEvent::startProduction` | `de.innogames.onyx.city.commands.StartProductionsCommand` | `de.innogames.strategycity.main.controller.event.StartProductionEvent` |
| `ProductionEvent::startPremiumProduction` | `de.innogames.onyx.city.commands.StartPremiumProductionCommand` | `de.innogames.strategycity.main.controller.event.ProductionEvent` |
| `ProductionEvent::pickupProduction` | `de.innogames.onyx.city.commands.PickupProductionCommand` | `de.innogames.strategycity.main.controller.event.ProductionEvent` |
| `MultipleProductionEvent::cancelAllProductions` | `de.innogames.onyx.city.commands.CancelAllProductionsCommand` | `de.innogames.strategycity.main.controller.event.MultipleProductionEvent` |
| `ProductionEvent::cancelProduction` | `de.innogames.onyx.city.commands.CancelManualProductionCommand` | `de.innogames.strategycity.main.controller.event.ProductionEvent` |
| `ProductionEvent::finishProduction` | `de.innogames.onyx.city.commands.FinishManualProductionCommand` | `de.innogames.strategycity.main.controller.event.ProductionEvent` |
| `ProductionEvent::discardProduction` | `de.innogames.onyx.city.commands.DiscardProductionCommand` | `de.innogames.strategycity.main.controller.event.ProductionEvent` |
| `DiscardProductionPopupEvent::showPopup` | `de.innogames.onyx.city.commands.ShowDiscardProductionPopupCommand` | `de.innogames.onyx.city.ui.windows.portal.events.DiscardProductionPopupEvent` |
| `CityMapModelEvent/CANCEL_CONSTRUCTION` | `de.innogames.onyx.city.controller.CancelConstructionCommand` | `de.innogames.strategycity.main.model.events.CityMapModelEvent` |
| `OpenEntityWindowEvent/WORKER` | `de.innogames.strategycity.main.controller.OpenWorkerHutWindowCommand` | `de.innogames.onyx.city.events.OpenEntityWindowEvent` |
| `OpenEntityWindowEvent/MAGIC_ACADEMY` | `de.innogames.strategycity.main.controller.OpenMagicAcademyWindowCommand` | `de.innogames.onyx.city.events.OpenEntityWindowEvent` |
| `ConstructBuildingEvent::buildingSelected` | `de.innogames.strategycity.main.controller.StartBuildEntityCommand` | `de.innogames.strategycity.main.controller.event.ConstructBuildingEvent` |
| `RelicBoostsEvent::updateRelicBoostGood` | `de.innogames.onyx.shared.boost.commands.UpdateRelicBoostGoodCommand` | `de.innogames.onyx.shared.boost.events.RelicBoostsEvent` |
| `RelicEvent::updateRelics` | `de.innogames.onyx.shared.boost.commands.UpdateRelicsCommand` | `de.innogames.onyx.shared.boost.events.RelicEvent` |
| `open` | `de.innogames.onyx.shared.ui.playerpanel.OpenPlayerProfileWindowCommand` | `de.innogames.onyx.shared.ui.windows.profile.PlayerProfileWindowEvent`, `openfl.events.Event`, `starling.events.Event` |
| `CityEntityEvent::constructionFinished` | `de.innogames.strategycity.main.controller.UpdateCityMapServiceCommand` | `de.innogames.onyx.city.events.CityEntityEvent` |
| `CityEntityEvent::constructionFinished` | `de.innogames.onyx.city.controller.ShowBlimpsAfterConstructionCommand` | `de.innogames.onyx.city.events.CityEntityEvent` |
| `showContextMenu` | `de.innogames.onyx.shared.ui.components.contextmenu.commands.ShowMenuCommand` | `de.innogames.onyx.shared.ui.components.contextmenu.events.ShowContextMenuEvent` |
| `RankingOverviewEvent::getRankingOverview` | `de.innogames.onyx.shared.ranking.commands.GetRankingOverviewCommand` | `de.innogames.onyx.shared.ranking.events.RankingOverviewEvent` |
| `RankingRequestEvent::accessRanking` | `de.innogames.onyx.shared.ranking.commands.AccessRankingCommand` | `de.innogames.onyx.shared.ranking.events.RankingRequestEvent` |
| `RankingRequestEvent::getRanking` | `de.innogames.onyx.shared.ranking.commands.GetRankingCommand` | `de.innogames.onyx.shared.ranking.events.RankingRequestEvent` |
| `PlayerRankingEvent::newRankReceived` | `de.innogames.onyx.shared.ranking.commands.UpdatePlayerRankCommand` | `de.innogames.onyx.shared.ranking.events.PlayerRankingEvent` |
| `UpdateRankingModelEvent::updateRankings` | `de.innogames.onyx.shared.ranking.commands.UpdateRankingModelCommand` | `de.innogames.onyx.shared.ranking.events.UpdateRankingModelEvent` |
| `addUnit` | `de.innogames.strategycity.main.controller.AddUnitCommand` | `de.innogames.strategycity.shared.service.events.AddUnitEvent` |
| `TechnologyUnlockedEvent:buildingUnlocked` | `de.innogames.onyx.city.commands.UnlockBuildingCommand` | `de.innogames.onyx.shared.events.TechnologyUnlockedEvent` |
| `SelectSpellEvent/SPELL_SELECTED` | `de.innogames.onyx.city.spells.commands.StartSpellActivationCommand` | `de.innogames.strategycity.main.controller.event.SelectSpellEvent` |
| `TimeLimitedEffectExpiredEvent::expired` | `de.innogames.onyx.city.entities.states.behaviors.commands.GetCultureCommand` | `de.innogames.onyx.city.entities.states.behaviors.events.TimeLimitedEffectExpiredEvent` |
| `EffectsEvent::refresh` | `de.innogames.onyx.city.entities.states.behaviors.commands.RefreshEffectsCommand` | `de.innogames.onyx.shared.effects.events.EffectsEvent` |
| `de.innogames.strategycity.main.controller.UpdateFeaturesCommand/EVENT_TYPE` | `de.innogames.strategycity.main.controller.UpdateFeaturesCommand` | `de.innogames.strategycity.main.controller.UpdateFeaturesCommand_Event` |
| `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.ShowCraftingReloadPopupCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.ShowCraftingReloadPopupCommand` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.ShowCraftingReloadPopupCommand_Event` |
| `ShowExpiringUpgradeWarningAlertWindowEvent::show` | `de.innogames.onyx.city.commands.ShowExpiringUpgradeWarningAlertWindowCommand` | `de.innogames.onyx.city.events.ShowExpiringUpgradeWarningAlertWindowEvent` |
| `BuildingChapterAdvanceEvent::CHAPTER_ADVANCE` | `de.innogames.onyx.city.commands.BuildingChapterAdvanceCommand` | `de.innogames.onyx.city.events.BuildingChapterAdvanceEvent` |
| `BuildingChapterAdvanceEvent::CHAPTER_ADVANCE` | `de.innogames.onyx.chests.commands.UpdateFlexibleResourcesChestCommand` | `de.innogames.onyx.city.events.BuildingChapterAdvanceEvent` |
| `BuildingChapterAdvanceEvent::CHAPTER_ADVANCE` | `de.innogames.onyx.shared.rewards.commands.UpdateFlexibleResourcesWeightedRewardsCommand` | `de.innogames.onyx.city.events.BuildingChapterAdvanceEvent` |
| `BuildingChapterAdvanceEvent::CHAPTER_ADVANCE` | `de.innogames.onyx.shared.rewards.commands.UpdateFlexibleResourcesEpisodicRewardsCommand` | `de.innogames.onyx.city.events.BuildingChapterAdvanceEvent` |
| `BuildingChapterAdvanceEvent::CHAPTER_ADVANCE` | `de.innogames.onyx.city.mainevents.eventleague.commands.UpdateFlexibleResourcesEventLeagueConfigsCommand` | `de.innogames.onyx.city.events.BuildingChapterAdvanceEvent` |
| `BuildingChapterAdvanceEvent::CHAPTER_ADVANCE` | `de.innogames.onyx.city.mainevents.royalpass.commands.UpdateFlexibleResourcesRoyalPassRewardsCommand` | `de.innogames.onyx.city.events.BuildingChapterAdvanceEvent` |
| `BuildingChapterAdvanceEvent::CHAPTER_ADVANCE` | `de.innogames.onyx.city.mainevents.seasonpass.commands.UpdateFlexibleResourcesSeasonPassRewardsCommand` | `de.innogames.onyx.city.events.BuildingChapterAdvanceEvent` |
| `BuildingChapterAdvanceEvent::CHAPTER_ADVANCE` | `de.innogames.onyx.shared.rewards.commands.UpdateFlexibleResourcesRewardSelectionKitsCommand` | `de.innogames.onyx.city.events.BuildingChapterAdvanceEvent` |
| `de.innogames.onyx.shared.commands.ManualMediationCommand/EVENT_TYPE` | `de.innogames.onyx.shared.commands.ManualMediationCommand` | `de.innogames.onyx.shared.commands.ManualMediationCommand_Event` |
| `ModuleLoaderEvent::moduleLoaded` | `de.innogames.strategycity.main.controller.modules.DisplayModuleCommand` | `de.innogames.strategycity.main.service.events.ModuleLoaderEvent` |
| `ModuleDisplayEvent::addedToStage` | `de.innogames.onyx.city.controller.bootstrap.TrackModuleFPSCommand` | `de.innogames.strategycity.main.controller.event.ModuleDisplayEvent` |
| `ModuleLoaderEvent::moduleUnloaded` | `de.innogames.strategycity.main.controller.modules.RemoveModuleCommand` | `de.innogames.strategycity.main.service.events.ModuleLoaderEvent` |
| `ModuleChangeEvent::changeModule` | `de.innogames.onyx.city.controller.ChangeModuleCommand` | `de.innogames.onyx.mvcs.events.ModuleChangeEvent` |
| `OtherPlayerEvent::enterPlayerCity` | `de.innogames.strategycity.main.controller.EnterPlayerCityCommand` | `de.innogames.strategycity.main.controller.event.OtherPlayerEvent` |
| `exitFullscreen` | `de.innogames.onyx.shared.commands.ExitFullscreenCommand` | `de.innogames.onyx.shared.events.ScreenEvent` |
| `OtherPlayerEvent::visitPlayer` | `de.innogames.onyx.city.commands.VisitOtherPlayerCommand` | `de.innogames.strategycity.main.controller.event.OtherPlayerEvent` |
| `ApplicationResizeEvent/RESIZED` | `de.innogames.onyx.city.controller.ResizeCommand` | `de.innogames.onyx.shared.events.ApplicationResizeEvent` |
| `getNotifications` | `de.innogames.onyx.city.notifications.commands.GetNotificationsCommand` | `de.innogames.onyx.city.notifications.events.NotificationEvent` |
| `getNotificationPreviews` | `de.innogames.onyx.city.notifications.commands.GetNotificationPreviewsCommand` | `de.innogames.onyx.city.notifications.events.NotificationEvent` |
| `SetPlayerNotificationStateEvent::setState` | `de.innogames.onyx.city.notifications.commands.SetPlayerNotificationStateCommand` | `de.innogames.onyx.city.notifications.events.SetPlayerNotificationStateEvent` |
| `RunningActivityEvent::retreat_battle` | `de.innogames.onyx.city.commands.RetreatBattleCommand` | `de.innogames.onyx.shared.events.RunningActivityEvent` |
| `RunningActivityEvent::cancel_diplomacy` | `de.innogames.onyx.city.commands.CancelDiplomacyCommand` | `de.innogames.onyx.shared.events.RunningActivityEvent` |
| `saveProfile` | `de.innogames.strategycity.main.controller.UpdateUserProfileCommand` | `de.innogames.onyx.shared.ui.windows.profile.PlayerProfileEvent` |
| `SettingsEvent:updateSettings` | `de.innogames.strategycity.main.controller.UpdateSettingsCommand` | `de.innogames.strategycity.main.controller.event.SettingsEvent` |
| `RequestActivationCodeEvent/requestActivationCode` | `de.innogames.onyx.shared.options.window.commands.RequestActivationCodeCommand` | `de.innogames.onyx.shared.options.window.events.RequestActivationCodeEvent` |
| `RequestActivationCodeEvent/requestActivationCodeWithNewEmail` | `de.innogames.onyx.shared.options.window.commands.RequestActivationCodeCommand` | `de.innogames.onyx.shared.options.window.events.RequestActivationCodeEvent` |
| `SaveChangedPasswordEvent::save` | `de.innogames.onyx.shared.options.window.commands.SaveChangedPasswordCommand` | `de.innogames.onyx.shared.options.window.events.SaveChangedPasswordEvent` |
| `SaveChangedEmailEvent::save` | `de.innogames.onyx.shared.options.window.commands.SaveChangedEmailCommand` | `de.innogames.onyx.shared.options.window.events.SaveChangedEmailEvent` |
| `ValidateEmailEvent::VALIDATE` | `de.innogames.onyx.shared.options.window.commands.ValidateEmailCommand` | `de.innogames.onyx.shared.options.window.events.ValidateEmailEvent` |
| `ValidatePasswordEvent::VALIDATE` | `de.innogames.onyx.shared.options.window.commands.ValidatePasswordCommand` | `de.innogames.onyx.shared.options.window.events.ValidatePasswordEvent` |
| `ShowAccountSettingsEvent::show` | `de.innogames.strategycity.main.controller.ShowAccountSettingsWindowCommand` | `de.innogames.strategycity.main.controller.event.ShowAccountSettingsEvent` |
| `UserDataEvent::validateProfileImage` | `de.innogames.strategycity.main.controller.ValidatePlayerProfileCommand` | `de.innogames.strategycity.main.model.events.UserDataEvent` |
| `UserDataEvent::userDataParsed` | `de.innogames.onyx.chests.commands.UpdateFlexibleResourcesChestCommand` | `de.innogames.strategycity.main.model.events.UserDataEvent` |
| `UserDataEvent::userDataParsed` | `de.innogames.onyx.shared.rewards.commands.UpdateFlexibleResourcesWeightedRewardsCommand` | `de.innogames.strategycity.main.model.events.UserDataEvent` |
| `UserDataEvent::userDataParsed` | `de.innogames.onyx.shared.rewards.commands.UpdateFlexibleResourcesEpisodicRewardsCommand` | `de.innogames.strategycity.main.model.events.UserDataEvent` |
| `UserDataEvent::userDataParsed` | `de.innogames.onyx.city.mainevents.eventleague.commands.UpdateFlexibleResourcesEventLeagueConfigsCommand` | `de.innogames.strategycity.main.model.events.UserDataEvent` |
| `UserDataEvent::userDataParsed` | `de.innogames.onyx.city.mainevents.royalpass.commands.UpdateFlexibleResourcesRoyalPassRewardsCommand` | `de.innogames.strategycity.main.model.events.UserDataEvent` |
| `UserDataEvent::userDataParsed` | `de.innogames.onyx.city.mainevents.seasonpass.commands.UpdateFlexibleResourcesSeasonPassRewardsCommand` | `de.innogames.strategycity.main.model.events.UserDataEvent` |
| `UserDataEvent::userDataParsed` | `de.innogames.onyx.shared.rewards.commands.UpdateFlexibleResourcesRewardSelectionKitsCommand` | `de.innogames.strategycity.main.model.events.UserDataEvent` |
| `UserDataEvent::userDataParsed` | `de.innogames.onyx.spire.commands.UpdateFlexibleResourcesCrystalsCommand` | `de.innogames.strategycity.main.model.events.UserDataEvent` |
| `OtherPlayerEvent::refreshPlayerCity` | `de.innogames.onyx.city.commands.RefreshOtherPlayerCityCommand` | `de.innogames.strategycity.main.controller.event.OtherPlayerEvent` |
| `OtherPlayerEvent::getNeighbourlyHelpBuildings` | `de.innogames.onyx.city.commands.GetNeighbourlyHelpBuildingsCommand` | `de.innogames.strategycity.main.controller.event.OtherPlayerEvent` |
| `cancelEntity` | `de.innogames.onyx.city.modes.commands.CancelUpgradeEntityCommand` | `de.innogames.onyx.city.modes.events.CitySectorModeEvent` |
| `upgradeEntity` | `de.innogames.onyx.city.modes.commands.StartUpgradeEntityCommand` | `de.innogames.onyx.city.modes.events.CitySectorModeEvent` |
| `placeEntity` | `de.innogames.onyx.city.modes.commands.PlaceCityEntityCommand` | `de.innogames.onyx.city.modes.events.CitySectorModeEvent` |
| `PlaceInventoryItemEvent::PLACE_BUILDING` | `de.innogames.onyx.city.modes.commands.PlaceInventoryBuildingCommand` | `de.innogames.onyx.city.modes.events.PlaceInventoryItemEvent` |
| `placeStreet` | `de.innogames.onyx.city.modes.commands.PlaceCityStreetCommand` | `de.innogames.onyx.city.modes.events.PlaceCitySectorModeEvent` |
| `removeEntity` | `de.innogames.onyx.city.modes.commands.RemoveCityEntityCommand` | `de.innogames.onyx.city.modes.events.CitySectorModeEvent` |
| `moveEntity` | `de.innogames.onyx.city.modes.commands.MoveCityEntityCommand` | `de.innogames.onyx.city.modes.events.CitySectorModeEvent` |
| `PlaceCityAreaEvent::unlockArea` | `de.innogames.onyx.city.modes.commands.UnlockCityAreaCommand` | `de.innogames.onyx.city.modes.events.PlaceCityAreaEvent` |
| `CityUnlockModeEvent::unlockAreas` | `de.innogames.onyx.city.commands.UnlockCityAreasCommand` | `de.innogames.onyx.city.modes.events.CityUnlockModeEvent` |
| `NeighborlyHelpEvent::executeAction` | `de.innogames.onyx.city.commands.PerformHelpNeighborCommand` | `de.innogames.onyx.city.controller.events.NeighborlyHelpEvent` |

#### `de.innogames.onyx.city.controller.bootstrap.ConfigureIsoEngineCommand` (L390492) - 11 mappings

| Event type | Command | Event class |
|---|---|---|
| `IsoEngineEvent::ready` | `de.innogames.onyx.city.commands.CityAnimationSettingsUpdatedCommand` | `de.innogames.onyx.city.engine.events.IsoEngineEvent` |
| `IsoEngineEvent::ready` | `de.innogames.onyx.city.commands.CityInitViewCommand` | `de.innogames.onyx.city.engine.events.IsoEngineEvent` |
| `CitySettingsEvent::settingsUpdated` | `de.innogames.onyx.city.commands.CityAnimationSettingsUpdatedCommand` | `de.innogames.strategycity.main.controller.event.CitySettingsEvent` |
| `CitySettingsEvent::settingsUpdated` | `de.innogames.onyx.city.commands.UpdateCityDecorationsCommand` | `de.innogames.strategycity.main.controller.event.CitySettingsEvent` |
| `CityEvent::ENTER_OWN_CITY` | `de.innogames.onyx.city.commands.UpdateCityDecorationsCommand` | `de.innogames.onyx.city.events.CityEvent` |
| `CityEvent::ENTER_OTHER_CITY` | `de.innogames.onyx.city.commands.UpdateCityDecorationsCommand` | `de.innogames.onyx.city.events.CityEvent` |
| `CitySettingsEvent::settingsUpdated` | `de.innogames.onyx.city.commands.UpdateEnhancementsCommand` | `de.innogames.strategycity.main.controller.event.CitySettingsEvent` |
| `CityEvent::ENTER_OWN_CITY` | `de.innogames.onyx.city.commands.UpdateEnhancementsCommand` | `de.innogames.onyx.city.events.CityEvent` |
| `CityEvent::ENTER_OTHER_CITY` | `de.innogames.onyx.city.commands.UpdateEnhancementsCommand` | `de.innogames.onyx.city.events.CityEvent` |
| `CitySettingsEvent::settingsUpdated` | `de.innogames.onyx.city.controller.bootstrap.engines.ConfigureViewportEffectsCommand` | `de.innogames.strategycity.main.controller.event.CitySettingsEvent` |
| `CitySettingsEvent::cityQualityChanged` | `de.innogames.onyx.city.controller.bootstrap.engines.LoadCityBackgroundCommand` | `de.innogames.strategycity.main.controller.event.CitySettingsEvent` |

#### `de.innogames.onyx.city.controller.bootstrap.ConfigureModelCommand` (L390605) - 5 mappings

| Event type | Command | Event class |
|---|---|---|
| `activateTutorial` | `de.innogames.onyx.shared.tutorial.commands.ActivateTutorialCommand` | `de.innogames.onyx.shared.tutorial.events.TutorialEvent` |
| `mapActor` | `de.innogames.onyx.shared.tutorial.commands.MapTutorialActorCommand` | `de.innogames.onyx.shared.tutorial.events.TutorialActorMapperEvent` |
| `mapUIActor` | `de.innogames.onyx.shared.tutorial.commands.MapTutorialUIActorCommand` | `de.innogames.onyx.shared.tutorial.events.TutorialActorMapperEvent` |
| `unmapActor` | `de.innogames.onyx.shared.tutorial.commands.UnmapTutorialActorCommand` | `de.innogames.onyx.shared.tutorial.events.TutorialActorMapperEvent` |
| `mapInstruction` | `de.innogames.onyx.shared.tutorial.commands.MapTutorialInstructionCommand` | `de.innogames.onyx.shared.tutorial.events.TutorialInstructionMapperEvent` |

#### `de.innogames.onyx.city.controller.bootstrap.ConfigureSoundsCommand` (L390901) - 6 mappings

| Event type | Command | Event class |
|---|---|---|
| `playEffectSound` | `de.innogames.onyx.shared.sounds.commands.PlayEffectSoundCommand` | `de.innogames.onyx.shared.sounds.events.SoundEvent` |
| `stopEffectCommand` | `de.innogames.onyx.shared.sounds.commands.StopEffectSoundCommand` | `de.innogames.onyx.shared.sounds.events.SoundEvent` |
| `playUISound` | `de.innogames.onyx.shared.sounds.commands.PlayUISoundCommand` | `de.innogames.onyx.shared.sounds.events.SoundEvent` |
| `playProduceResourceSound` | `de.innogames.onyx.city.sounds.commands.PlayStartProductionSoundCommand` | `de.innogames.onyx.city.sounds.events.ResourceSoundEvent` |
| `playOpenWindowSound` | `de.innogames.onyx.city.sounds.commands.PlayOpenWindowSoundCommand` | `de.innogames.onyx.city.sounds.events.EntitySoundEvent` |
| `playCollectResourceSound` | `de.innogames.onyx.city.sounds.commands.PlayCollectResourceSoundCommand` | `de.innogames.onyx.city.sounds.events.ResourceSoundEvent` |

#### `de.innogames.onyx.city.controller.bootstrap.ConfigureTutorialCommand` (L391080) - 6 mappings

| Event type | Command | Event class |
|---|---|---|
| `activateTutorialQuest` | `de.innogames.onyx.shared.tutorial.commands.ActivateTutorialQuestsCommand` | `de.innogames.onyx.shared.tutorial.events.TutorialEvent` |
| `showTutorialInfoScreen` | `de.innogames.onyx.shared.tutorial.commands.ShowQuestInfoScreenCommand` | `de.innogames.onyx.shared.tutorial.events.TutorialEvent` |
| `showTutorialResultScreen` | `de.innogames.onyx.shared.tutorial.commands.ShowQuestResultScreenCommand` | `de.innogames.onyx.shared.tutorial.events.TutorialEvent` |
| `tutorialPartComplete` | `de.innogames.onyx.shared.quests.commands.CheckForAccomplishedTutorialQuestsCommand` | `de.innogames.onyx.shared.tutorial.events.TutorialEvent` |
| `mainTutorialComplete` | `de.innogames.onyx.city.controller.bootstrap.engines.LoadCityBackgroundCommand` `.once()` | `de.innogames.onyx.shared.tutorial.events.TutorialEvent` |
| `initialized` | `de.innogames.onyx.shared.tutorial.commands.ContinueTutorialFlowCommand` | `de.innogames.onyx.shared.tutorial.events.TutorialSystemEvent` |

#### `de.innogames.onyx.city.controller.bootstrap.console.FlushUncaughtErrorBuffer` (L391982) - 1 mapping

| Event type | Command | Event class |
|---|---|---|
| `uncaughtError` | `de.innogames.onyx.shared.commands.LogUncaughtErrorCommand` | `openfl.events.UncaughtErrorEvent` |

#### `de.innogames.onyx.city.crm3.configs.CRMControllerConfiguration` (L394291) - 9 mappings

map object: `eventCommandMap`

| Event type | Command | Event class |
|---|---|---|
| `CRMModelEvent::addInterstitials` | `de.innogames.onyx.city.crm3.commands.AddInterstitialsCommand` | `de.innogames.onyx.city.crm3.events.CRMModelEvent` |
| `CRMModelEvent::removeInterstitial` | `de.innogames.onyx.city.crm3.commands.RemoveInterstitialCommand` | `de.innogames.onyx.city.crm3.events.CRMModelEvent` |
| `CRMInterstitialEvent::accept` | `de.innogames.onyx.city.crm3.commands.AcceptInterstitialCommand` | `de.innogames.onyx.city.crm3.events.CRMInterstitialEvent` |
| `CRMInterstitialEvent::markSeen` | `de.innogames.onyx.city.crm3.commands.MarkInterstitialSeenCommand` | `de.innogames.onyx.city.crm3.events.CRMInterstitialEvent` |
| `CRMInterstitialEvent::reject` | `de.innogames.onyx.city.crm3.commands.RejectInterstitialCommand` | `de.innogames.onyx.city.crm3.events.CRMInterstitialEvent` |
| `CRMInterstitialEvent::show` | `de.innogames.onyx.city.crm3.commands.ShowInterstitialCommand` | `de.innogames.onyx.city.crm3.events.CRMInterstitialEvent` |
| `CRMDisplayPointEvent::reached` | `de.innogames.onyx.city.crm3.commands.DisplayPointReachedCommand` | `de.innogames.onyx.city.crm3.events.CRMDisplayPointEvent` |
| `CRMCallToActionEvent::executeCTA` | `de.innogames.onyx.city.crm3.commands.ExecuteCallToActionCommand` | `de.innogames.onyx.city.crm3.events.CRMCallToActionEvent` |
| `CRMCallToActionEvent::preExecuteCTA` | `de.innogames.onyx.city.crm3.commands.PreExecuteCallToActionCommand` | `de.innogames.onyx.city.crm3.events.CRMCallToActionEvent` |

#### `de.innogames.onyx.city.currencyevents.configs.CurrencyEventsControllerConfiguration` (L395461) - 3 mappings

| Event type | Command | Event class |
|---|---|---|
| `CurrencyEventEvent::openEventCurrencyWindow` | `de.innogames.onyx.city.currencyevents.commands.OpenEventCurrencyWindowCommand` | `de.innogames.onyx.currencyevents.events.CurrencyEventEvent` |
| `SeasonalEventsEvent::ended` | `de.innogames.onyx.city.currencyevents.commands.CurrencyEventEndedCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsEvent` |
| `SeasonalEventsModelEvent::modelUpdated` | `de.innogames.onyx.city.currencyevents.commands.UpdateEventCurrenciesCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsModelEvent` |

#### `de.innogames.onyx.city.igel.configs.InGameEmailControllerConfiguration` (L412369) - 3 mappings

| Event type | Command | Event class |
|---|---|---|
| `showTutorialResultScreen` | `de.innogames.onyx.city.igel.commands.ShowInGameEmailWindowCommand` | `de.innogames.onyx.shared.tutorial.events.TutorialEvent` |
| `BootstrapEvent/FINISHED` | `de.innogames.onyx.city.igel.commands.ShowInGameEmailWindowCommand` | `de.innogames.onyx.shared.bootstrap.events.BootstrapEvent` |
| `AddInGameEmailEvent::ADD_EMAIL` | `de.innogames.onyx.city.igel.commands.SaveInGameEmailCommand` | `de.innogames.onyx.city.igel.events.AddInGameEmailEvent` |

#### `de.innogames.onyx.city.inventoryitems.configs.ClientInventoryControllerConfiguration` (L414553) - 10 mappings

| Event type | Command | Event class |
|---|---|---|
| `ResourcesModelEvent::updateResources` | `de.innogames.onyx.city.inventoryitems.commands.UpdateInventorySpellsCommand` | `de.innogames.onyx.resources.events.ResourcesModelEvent` |
| `InventoryModelEvent::updateModel` | `de.innogames.onyx.city.inventoryitems.commands.UpdateInventoryModelCommand` | `de.innogames.onyx.city.inventoryitems.events.InventoryModelEvent` |
| `InventoryModelEvent::processItems` | `de.innogames.onyx.city.inventoryitems.commands.ProcessInventoryItemsCommand` | `de.innogames.onyx.city.inventoryitems.events.InventoryModelEvent` |
| `InventoryItemEvent::useItem` | `de.innogames.onyx.city.inventoryitems.commands.UseItemCommand` | `de.innogames.onyx.city.inventoryitems.events.InventoryItemEvent` |
| `InventoryItemEvent::useItemOn` | `de.innogames.onyx.city.inventoryitems.commands.UseItemOnCommand` | `de.innogames.onyx.city.inventoryitems.events.InventoryItemEvent` |
| `UseInstantItemWindowEvent::showWindow` | `de.innogames.onyx.city.inventoryitems.commands.ShowUseInstantItemWindowCommand` | `de.innogames.onyx.city.inventoryitems.events.UseInstantItemWindowEvent` |
| `DisenchantItemEvent::disenchantInstant` | `de.innogames.onyx.city.inventoryitems.commands.DisenchantInstantCommand` | `de.innogames.onyx.city.inventoryitems.events.DisenchantItemEvent` |
| `DisenchantItemEvent::disenchantBuilding` | `de.innogames.onyx.city.inventoryitems.commands.DisenchantBuildingCommand` | `de.innogames.onyx.city.inventoryitems.events.DisenchantItemEvent` |
| `DisenchantItemEvent::disenchantSpell` | `de.innogames.onyx.city.inventoryitems.commands.DisenchantSpellCommand` | `de.innogames.onyx.city.inventoryitems.events.DisenchantItemEvent` |
| `DisenchantItemEvent::disenchantSorcery` | `de.innogames.onyx.city.inventoryitems.commands.DisenchantSorceryCommand` | `de.innogames.onyx.city.inventoryitems.events.DisenchantItemEvent` |

#### `de.innogames.onyx.city.mainevents.eventleague.configs.EventLeagueControllerConfiguration` (L423372) - 4 mappings

| Event type | Command | Event class |
|---|---|---|
| `GetEventLeagueProgressEvent::getProgress` | `de.innogames.onyx.city.mainevents.eventleague.commands.GetEventLeagueProgressCommand` | `de.innogames.onyx.city.mainevents.eventleague.events.GetEventLeagueProgressEvent` |
| `UpdateEventLeagueProgressEvent::updateProgress` | `de.innogames.onyx.city.mainevents.eventleague.commands.UpdateEventLeagueProgressCommand` | `de.innogames.onyx.city.mainevents.eventleague.events.UpdateEventLeagueProgressEvent` |
| `ShowEventLeagueWindowEvent::show` | `de.innogames.onyx.city.mainevents.eventleague.commands.ShowEventLeagueWindowCommand` | `de.innogames.onyx.city.mainevents.eventleague.events.ShowEventLeagueWindowEvent` |
| `ShowEventLeagueEndRewardWindowEvent::show` | `de.innogames.onyx.city.mainevents.eventleague.commands.ShowEventLeagueEndRewardWindowCommand` | `de.innogames.onyx.city.mainevents.eventleague.events.ShowEventLeagueEndRewardWindowEvent` |

#### `de.innogames.onyx.city.mainevents.royalpass.config.RoyalPassControllerConfiguration` (L427152) - 5 mappings

| Event type | Command | Event class |
|---|---|---|
| `RoyalPassClaimRewardsEvent::claimAll` | `de.innogames.onyx.city.mainevents.royalpass.commands.ClaimAllRoyalPassPrizesCommand` | `de.innogames.onyx.city.mainevents.royalpass.events.RoyalPassClaimPrizesEvent` |
| `RoyalPassClaimRewardsEvent::claimNextGrandPrize` | `de.innogames.onyx.city.mainevents.royalpass.commands.ClaimNextGrandPrizeCommand` | `de.innogames.onyx.city.mainevents.royalpass.events.RoyalPassClaimPrizesEvent` |
| `RoyalPassClaimRewardsEvent::claimNextRoyalPrize` | `de.innogames.onyx.city.mainevents.royalpass.commands.ClaimNextRoyalPrizeCommand` | `de.innogames.onyx.city.mainevents.royalpass.events.RoyalPassClaimPrizesEvent` |
| `ShowRoyalPassWindowEvent::show` | `de.innogames.onyx.city.mainevents.royalpass.commands.ShowRoyalPassWindowCommand` | `de.innogames.onyx.city.mainevents.royalpass.events.ShowRoyalPassWindowEvent` |
| `ShowRoyalPassEndRewardsWindowEvent::show` | `de.innogames.onyx.city.mainevents.royalpass.commands.ShowRoyalPassEndRewardsWindowCommand` | `de.innogames.onyx.city.mainevents.royalpass.events.ShowRoyalPassEndRewardsWindowEvent` |

#### `de.innogames.onyx.city.mainevents.seasonpass.commands.ClaimSeasonPassRewardCommand` (L429481) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.mainevents.seasonpass.commands.ClaimSeasonPassRewardCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.seasonpass.commands.ClaimSeasonPassRewardCommand` | `de.innogames.onyx.city.mainevents.seasonpass.commands.ClaimSeasonPassRewardCommand_Event` |

#### `de.innogames.onyx.city.mainevents.seasonpass.commands.RerollSeasonPassQuestCommand` (L429524) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.mainevents.seasonpass.commands.RerollSeasonPassQuestCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.seasonpass.commands.RerollSeasonPassQuestCommand` | `de.innogames.onyx.city.mainevents.seasonpass.commands.RerollSeasonPassQuestCommand_Event` |

#### `de.innogames.onyx.city.mainevents.seasonpass.commands.ShowSeasonPassEndRewardsCommand` (L429562) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.mainevents.seasonpass.commands.ShowSeasonPassEndRewardsCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.seasonpass.commands.ShowSeasonPassEndRewardsCommand` | `de.innogames.onyx.city.mainevents.seasonpass.commands.ShowSeasonPassEndRewardsCommand_Event` |

#### `de.innogames.onyx.city.mainevents.seasonpass.commands.ShowSeasonPassRewardsCommand` (L429583) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.mainevents.seasonpass.commands.ShowSeasonPassRewardsCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.seasonpass.commands.ShowSeasonPassRewardsCommand` | `de.innogames.onyx.city.mainevents.seasonpass.commands.ShowSeasonPassRewardsCommand_Event` |

#### `de.innogames.onyx.city.mainevents.seasonpass.config.SeasonPassControllerConfiguration` (L429643) - 5 mappings

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.mainevents.seasonpass.commands.ClaimSeasonPassRewardCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.seasonpass.commands.ClaimSeasonPassRewardCommand` | `de.innogames.onyx.city.mainevents.seasonpass.commands.ClaimSeasonPassRewardCommand_Event` |
| `de.innogames.onyx.city.mainevents.seasonpass.commands.RerollSeasonPassQuestCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.seasonpass.commands.RerollSeasonPassQuestCommand` | `de.innogames.onyx.city.mainevents.seasonpass.commands.RerollSeasonPassQuestCommand_Event` |
| `de.innogames.onyx.city.mainevents.seasonpass.commands.ShowSeasonPassRewardsCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.seasonpass.commands.ShowSeasonPassRewardsCommand` | `de.innogames.onyx.city.mainevents.seasonpass.commands.ShowSeasonPassRewardsCommand_Event` |
| `de.innogames.onyx.city.mainevents.seasonpass.commands.ShowSeasonPassEndRewardsCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.seasonpass.commands.ShowSeasonPassEndRewardsCommand` | `de.innogames.onyx.city.mainevents.seasonpass.commands.ShowSeasonPassEndRewardsCommand_Event` |
| `SeasonalEventsEvent::ended` | `de.innogames.onyx.city.mainevents.seasonpass.commands.SeasonPassEndedCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsEvent` |

#### `de.innogames.onyx.city.mainevents.shared.commands.DiscardMergeableCommand` (L433806) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.mainevents.shared.commands.DiscardMergeableCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.DiscardMergeableCommand` | `de.innogames.onyx.city.mainevents.shared.commands.DiscardMergeableCommand_Event` |

#### `de.innogames.onyx.city.mainevents.shared.commands.GenerateMergeableCommand` (L433829) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.mainevents.shared.commands.GenerateMergeableCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.GenerateMergeableCommand` | `de.innogames.onyx.city.mainevents.shared.commands.GenerateMergeableCommand_Event` |

#### `de.innogames.onyx.city.mainevents.shared.commands.GetMergeEventOverviewCommand` (L433852) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.mainevents.shared.commands.GetMergeEventOverviewCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.GetMergeEventOverviewCommand` | `de.innogames.onyx.city.mainevents.shared.commands.GetMergeEventOverviewCommand`, `de.innogames.onyx.city.mainevents.shared.commands.GetMergeEventOverviewCommand_Event` |

#### `de.innogames.onyx.city.mainevents.shared.commands.MergeEventCompleteOrderCommand` (L433895) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.mainevents.shared.commands.MergeEventCompleteOrderCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventCompleteOrderCommand` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventCompleteOrderCommand`, `de.innogames.onyx.city.mainevents.shared.commands.MergeEventCompleteOrderCommand_Event` |

#### `de.innogames.onyx.city.mainevents.shared.commands.MergeEventDiscardOrderCommand` (L433926) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.mainevents.shared.commands.MergeEventDiscardOrderCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventDiscardOrderCommand` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventDiscardOrderCommand`, `de.innogames.onyx.city.mainevents.shared.commands.MergeEventDiscardOrderCommand_Event` |

#### `de.innogames.onyx.city.mainevents.shared.commands.MergeEventGetOrdersCommand` (L433947) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.mainevents.shared.commands.MergeEventGetOrdersCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventGetOrdersCommand` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventGetOrdersCommand`, `de.innogames.onyx.city.mainevents.shared.commands.MergeEventGetOrdersCommand_Event` |

#### `de.innogames.onyx.city.mainevents.shared.commands.MergeEventInstantSkipOrderCooldownCommand` (L433970) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.mainevents.shared.commands.MergeEventInstantSkipOrderCooldownCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventInstantSkipOrderCooldownCommand` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventInstantSkipOrderCooldownCommand`, `de.innogames.onyx.city.mainevents.shared.commands.MergeEventInstantSkipOrderCooldownCommand_Event` |

#### `de.innogames.onyx.city.mainevents.shared.commands.MergeableMoveCommand` (L433991) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.mainevents.shared.commands.MergeableMoveCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.MergeableMoveCommand` | `de.innogames.onyx.city.mainevents.shared.commands.MergeableMoveCommand_Event` |

#### `de.innogames.onyx.city.mainevents.shared.configs.MergeEventControllerConfiguration` (L443281) - 8 mappings

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.mainevents.shared.commands.GetMergeEventOverviewCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.GetMergeEventOverviewCommand` | `de.innogames.onyx.city.mainevents.shared.commands.GetMergeEventOverviewCommand`, `de.innogames.onyx.city.mainevents.shared.commands.GetMergeEventOverviewCommand_Event` |
| `de.innogames.onyx.city.mainevents.shared.commands.GenerateMergeableCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.GenerateMergeableCommand` | `de.innogames.onyx.city.mainevents.shared.commands.GenerateMergeableCommand_Event` |
| `de.innogames.onyx.city.mainevents.shared.commands.MergeableMoveCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.MergeableMoveCommand` | `de.innogames.onyx.city.mainevents.shared.commands.MergeableMoveCommand_Event` |
| `de.innogames.onyx.city.mainevents.shared.commands.DiscardMergeableCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.DiscardMergeableCommand` | `de.innogames.onyx.city.mainevents.shared.commands.DiscardMergeableCommand_Event` |
| `de.innogames.onyx.city.mainevents.shared.commands.MergeEventCompleteOrderCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventCompleteOrderCommand` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventCompleteOrderCommand`, `de.innogames.onyx.city.mainevents.shared.commands.MergeEventCompleteOrderCommand_Event` |
| `de.innogames.onyx.city.mainevents.shared.commands.MergeEventDiscardOrderCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventDiscardOrderCommand` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventDiscardOrderCommand`, `de.innogames.onyx.city.mainevents.shared.commands.MergeEventDiscardOrderCommand_Event` |
| `de.innogames.onyx.city.mainevents.shared.commands.MergeEventInstantSkipOrderCooldownCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventInstantSkipOrderCooldownCommand` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventInstantSkipOrderCooldownCommand`, `de.innogames.onyx.city.mainevents.shared.commands.MergeEventInstantSkipOrderCooldownCommand_Event` |
| `de.innogames.onyx.city.mainevents.shared.commands.MergeEventGetOrdersCommand/EVENT_TYPE` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventGetOrdersCommand` | `de.innogames.onyx.city.mainevents.shared.commands.MergeEventGetOrdersCommand`, `de.innogames.onyx.city.mainevents.shared.commands.MergeEventGetOrdersCommand_Event` |

#### `de.innogames.onyx.city.mainevents.shared.configs.ShuffleEventControllerConfiguration` (L443340) - 5 mappings

| Event type | Command | Event class |
|---|---|---|
| `ShuffleEventUpdateEvent::updateModel` | `de.innogames.onyx.city.mainevents.shared.commands.UpdateShuffleEventCommand` | `de.innogames.onyx.city.mainevents.shared.events.ShuffleEventUpdateEvent` |
| `ShuffleEventPackageEvent::getPackages` | `de.innogames.onyx.city.mainevents.shared.commands.GetShuffleEventPackagesCommand` | `de.innogames.onyx.city.mainevents.shared.events.ShuffleEventPackageEvent`, `de.innogames.onyx.city.mainevents.shared.events.ShuffleEventUpdateEvent` |
| `ShuffleEventPackageEvent::shufflePackages` | `de.innogames.onyx.city.mainevents.shared.commands.ShufflePackagesCommand` | `de.innogames.onyx.city.mainevents.shared.events.ShuffleEventPackageEvent` |
| `ShuffleEventPackageEvent::openPackage` | `de.innogames.onyx.city.mainevents.shared.commands.OpenShuffleEventPackageCommand` | `de.innogames.onyx.city.mainevents.shared.events.ShuffleEventPackageEvent` |
| `OpenSpecificChestComponentEvent::openChest` | `de.innogames.onyx.city.mainevents.shared.components.chests.commands.OpenSpecificChestCommand` | `de.innogames.onyx.city.mainevents.shared.components.chests.events.OpenSpecificChestComponentEvent` |

#### `de.innogames.onyx.city.mainevents.shared.configs.TileEventControllerConfiguration` (L443392) - 8 mappings

| Event type | Command | Event class |
|---|---|---|
| `TileEventEvent::getTileEvent` | `de.innogames.onyx.city.mainevents.shared.commands.GetTileEventCommand` | `de.innogames.onyx.city.mainevents.shared.events.TileEventEvent` |
| `TileEventToolEvent::useTool` | `de.innogames.onyx.city.mainevents.shared.commands.TileEventUseToolCommand` | `de.innogames.onyx.city.mainevents.shared.events.TileEventToolEvent` |
| `TileEventModelEvent::updateModel` | `de.innogames.onyx.city.mainevents.shared.commands.TileEventUpdateModelCommand` | `de.innogames.onyx.city.mainevents.shared.events.TileEventModelEvent` |
| `TileEventCellsEvent::updateCells` | `de.innogames.onyx.city.mainevents.shared.commands.TileEventUpdateCellsCommand` | `de.innogames.onyx.city.mainevents.shared.events.TileEventCellsEvent` |
| `TileEventToolShopEvent::openWindow` | `de.innogames.onyx.city.mainevents.shared.commands.TileEventOpenToolShopWindowCommand` | `de.innogames.onyx.city.mainevents.shared.events.TileEventToolShopEvent` |
| `TileEventCellsEvent::addColumn` | `de.innogames.onyx.city.mainevents.shared.commands.TileEventAddColumnCommand` | `de.innogames.onyx.city.mainevents.shared.events.TileEventCellsEvent` |
| `TileEventRewardEvent::collectReward` | `de.innogames.onyx.city.mainevents.shared.commands.TileEventCollectRewardCommand` | `de.innogames.onyx.city.mainevents.shared.events.TileEventRewardEvent` |
| `TileEventAutoRewardCollectEvent::autoCollectReward` | `de.innogames.onyx.city.mainevents.shared.commands.TileEventAutoCollectRewardCommand` | `de.innogames.onyx.city.mainevents.shared.events.TileEventAutoRewardCollectEvent` |

#### `de.innogames.onyx.city.neighborlyhelp.configs.NeighborlyHelpControllerConfiguration` (L455910) - 1 mapping

| Event type | Command | Event class |
|---|---|---|
| `QuickNeighborlyHelpEvent::executeAction` | `de.innogames.onyx.city.neighborlyhelp.commands.PerformQuickNeighborlyHelpCommand` | `de.innogames.onyx.city.neighborlyhelp.events.QuickNeighborlyHelpEvent` |

#### `de.innogames.onyx.city.queuedproduction.configs.QueuedProductionControllerConfiguration` (L458431) - 4 mappings

| Event type | Command | Event class |
|---|---|---|
| `QueueProductionEvent::CANCEL_PRODUCTION` | `de.innogames.onyx.city.queuedproduction.commands.CancelQueueProductionCommand` | `de.innogames.onyx.shared.production.events.QueueProductionEvent` |
| `QueueProductionEvent::FINISH_PRODUCTION` | `de.innogames.onyx.city.queuedproduction.commands.FinishQueueProductionCommand` | `de.innogames.onyx.shared.production.events.QueueProductionEvent` |
| `QueueProductionEvent::SLOT_FINISHED` | `de.innogames.onyx.city.queuedproduction.commands.QueuedProductionSlotFinishedCommand` | `de.innogames.onyx.shared.production.events.QueueProductionEvent` |
| `QueueProductionEvent::UPGRADE` | `de.innogames.onyx.city.queuedproduction.commands.UpgradeQueueProductionCommand` | `de.innogames.onyx.shared.production.events.QueueProductionEvent` |

#### `de.innogames.onyx.city.spells.configs.SpellsControllerConfiguration` (L460129) - 1 mapping

| Event type | Command | Event class |
|---|---|---|
| `EnchantBuildingEvent::enchant_building` | `de.innogames.onyx.city.spells.commands.EnchantBuildingCommand` | `de.innogames.onyx.city.spells.events.EnchantBuildingEvent` |

#### `de.innogames.onyx.city.trade.configs.TradeControllerConfiguration` (L461564) - 15 mappings

| Event type | Command | Event class |
|---|---|---|
| `acceptNPCTrade` | `de.innogames.onyx.city.trade.commands.AcceptWholesalerTradeCommand` | `de.innogames.onyx.city.trade.events.TradeEvent` |
| `acceptPlayerTrade` | `de.innogames.onyx.city.trade.commands.AcceptPlayerTradeCommand` | `de.innogames.onyx.city.trade.events.TradeEvent` |
| `cancelTrade` | `de.innogames.onyx.city.trade.commands.CancelTradeCommand` | `de.innogames.onyx.city.trade.events.TradeEvent` |
| `createTrade` | `de.innogames.onyx.city.trade.commands.CreateTradeCommand` | `de.innogames.onyx.city.trade.events.TradeEvent` |
| `getNPCTrades` | `de.innogames.onyx.city.trade.commands.GetWholesalerTradesCommand` | `de.innogames.onyx.city.trade.events.TradeEvent` |
| `getOtherPlayersTrades` | `de.innogames.onyx.city.trade.commands.GetOtherPlayersTradesCommand` | `de.innogames.onyx.city.trade.events.TradeEvent` |
| `getOwnPlayerTrades` | `de.innogames.onyx.city.trade.commands.GetOwnPlayerTradesCommand` | `de.innogames.onyx.city.trade.events.TradeEvent` |
| `tradeAdded` | `de.innogames.onyx.city.trade.commands.TradeAddedCommand` | `de.innogames.onyx.city.trade.events.TradeEvent` |
| `TradeModelEvent::updateTrades` | `de.innogames.onyx.city.trade.commands.UpdateTradesModelCommand` | `de.innogames.onyx.city.trade.events.TradeModelEvent` |
| `showTradeNotAppropriateAlert` | `de.innogames.onyx.city.trade.commands.ShowTradeNotAppropriateAlertCommand` | `de.innogames.onyx.city.trade.events.TradeAlertEvent` |
| `MerchantEvent::getMerchants` | `de.innogames.onyx.city.trade.commands.GetMerchantsCommand` | `de.innogames.onyx.city.trade.events.MerchantEvent` |
| `MerchantEvent::hireMerchant` | `de.innogames.onyx.city.trade.commands.HireMerchantCommand` | `de.innogames.onyx.city.trade.events.MerchantEvent` |
| `MerchantEvent::finishCooldown` | `de.innogames.onyx.city.trade.commands.FinishCooldownCommand` | `de.innogames.onyx.city.trade.events.MerchantEvent` |
| `UpdateMerchantEvent::updateMerchants` | `de.innogames.onyx.city.trade.commands.UpdateMerchantsCommand` | `de.innogames.onyx.city.trade.events.UpdateMerchantEvent` |
| `MerchantEvent::showTradeWindow` | `de.innogames.onyx.city.trade.commands.CreateMerchantTradingWindowCommand` | `de.innogames.onyx.city.trade.events.MerchantEvent` |

#### `de.innogames.onyx.city.treasure.config.TreasureControllerConfig` (L469394) - 5 mappings

| Event type | Command | Event class |
|---|---|---|
| `TreasureRewardsEvent::showRewards` | `de.innogames.onyx.city.treasure.commands.ShowNeighborlyHelpTreasureRewardWindowCommand` `.withGuards([de_innogames_onyx_city_treasure_commands_guards_OnlyInVisitedCity])` | `de.innogames.onyx.city.treasure.events.TreasureRewardsEvent` |
| `TreasureRewardsEvent::showRewards` | `de.innogames.onyx.city.treasure.commands.ShowQuickNeighborlyHelpTreasureRewardWindowCommand` `.withGuards([de_innogames_onyx_city_treasure_commands_guards_OnlyShowNeighborlyHelpTreasureRewards])` | `de.innogames.onyx.city.treasure.events.TreasureRewardsEvent` |
| `TreasureRewardsEvent::showRewards` | `de.innogames.onyx.city.treasure.commands.ShowCurrencyEventTreasureBlimpCommand` `.withGuards([de_innogames_onyx_city_treasure_commands_guards_OnlyInOwnCity,de_innogames_onyx_city_treasure_commands_guards_OnlyDuringCurrencyEvent,de_innogames_onyx_city_treasure_commands_guards_NotShowNeighborlyHelpTreasureRewards])` | `de.innogames.onyx.city.treasure.events.TreasureRewardsEvent` |
| `IsoDecorationEvent::click` | `de.innogames.onyx.city.treasure.commands.OpenTreasureCommand` `.withGuards([de_innogames_onyx_city_treasure_commands_guards_CanGetReward]).withPayloadInjection()` | `de.innogames.onyx.city.engine.events.IsoDecorationEvent` |
| `IsoDecorationEvent::click` | `de.innogames.onyx.city.treasure.commands.OpenVideoAdTreasureCommand` `.withGuards([de_innogames_onyx_city_treasure_commands_guards_CanWatchVideoAd]).withPayloadInjection()` | `de.innogames.onyx.city.engine.events.IsoDecorationEvent` |

#### `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.OpenCauldronWindowCommand` (L480482) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.OpenCauldronWindowCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.OpenCauldronWindowCommand` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.OpenCauldronWindowCommand_Event` |

#### `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.SetGobletResultCommand` (L480504) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.SetGobletResultCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.SetGobletResultCommand` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.SetGobletResultCommand_Event` |

#### `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.ShowBrewConfirmationPopupCommand` (L480525) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.ShowBrewConfirmationPopupCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.ShowBrewConfirmationPopupCommand` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.ShowBrewConfirmationPopupCommand_Event` |

#### `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.ShowGobletsConfirmationPopupCommand` (L480548) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.ShowGobletsConfirmationPopupCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.ShowGobletsConfirmationPopupCommand` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.ShowGobletsConfirmationPopupCommand_Event` |

#### `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.StartNotificationTimerCommand` (L480665) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.StartNotificationTimerCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.StartNotificationTimerCommand` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.StartNotificationTimerCommand_Event` |

#### `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.UpdateCauldronStateCommand` (L480689) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.UpdateCauldronStateCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.UpdateCauldronStateCommand` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.UpdateCauldronStateCommand_Event` |

#### `de.innogames.onyx.city.ui.windows.academy.cauldron.configurations.CauldronControllerConfiguration` (L480723) - 6 mappings

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.OpenCauldronWindowCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.OpenCauldronWindowCommand` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.OpenCauldronWindowCommand_Event` |
| `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.ShowBrewConfirmationPopupCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.ShowBrewConfirmationPopupCommand` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.ShowBrewConfirmationPopupCommand_Event` |
| `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.ShowGobletsConfirmationPopupCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.ShowGobletsConfirmationPopupCommand` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.ShowGobletsConfirmationPopupCommand_Event` |
| `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.UpdateCauldronStateCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.UpdateCauldronStateCommand` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.UpdateCauldronStateCommand_Event` |
| `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.StartNotificationTimerCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.StartNotificationTimerCommand` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.StartNotificationTimerCommand_Event` |
| `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.SetGobletResultCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.SetGobletResultCommand` | `de.innogames.onyx.city.ui.windows.academy.cauldron.commands.SetGobletResultCommand_Event` |

#### `de.innogames.onyx.city.ui.windows.academy.crafting.configurations.CraftingConfiguration` (L488342) - 15 mappings

map object: `eventCommandMap`

| Event type | Command | Event class |
|---|---|---|
| `CraftingEvent::get_data` | `de.innogames.onyx.city.ui.windows.academy.crafting.commands.CraftingGetDataCommand` | `de.innogames.onyx.city.ui.windows.academy.crafting.events.CraftingEvent` |
| `CraftingEvent::premium_instant_finish` | `de.innogames.onyx.city.ui.windows.academy.crafting.commands.CraftingInstantFinishCommand` | `de.innogames.onyx.city.ui.windows.academy.crafting.events.CraftingEvent` |
| `CraftingEvent::premium_refresh_recipes` | `de.innogames.onyx.city.ui.windows.academy.crafting.commands.CraftingPremiumRefreshRecipesCommand` | `de.innogames.onyx.city.ui.windows.academy.crafting.events.CraftingEvent` |
| `CraftingEvent::refresh_recipes` | `de.innogames.onyx.city.ui.windows.academy.crafting.commands.CraftingRefreshRecipesCommand` | `de.innogames.onyx.city.ui.windows.academy.crafting.events.CraftingEvent` |
| `CraftingEvent::craft` | `de.innogames.onyx.city.ui.windows.academy.crafting.commands.CraftingBeginCraftCommand` | `de.innogames.onyx.city.ui.windows.academy.crafting.events.CraftingEvent` |
| `CraftingEvent::premiumCraft` | `de.innogames.onyx.city.ui.windows.academy.crafting.commands.CraftingBeginPremiumCraftCommand` | `de.innogames.onyx.city.ui.windows.academy.crafting.events.CraftingEvent` |
| `CraftingEvent::cancel` | `de.innogames.onyx.city.ui.windows.academy.crafting.commands.CraftingCancelCommand` | `de.innogames.onyx.city.ui.windows.academy.crafting.events.CraftingEvent` |
| `CraftingServiceEvent::update_progress` | `de.innogames.onyx.city.ui.windows.academy.crafting.commands.CraftingProgressUpdateCommand` | `de.innogames.onyx.city.ui.windows.academy.crafting.events.CraftingServiceEvent` |
| `CraftingServiceEvent::update_data` | `de.innogames.onyx.city.ui.windows.academy.crafting.commands.CraftingDataUpdateCommand` | `de.innogames.onyx.city.ui.windows.academy.crafting.events.CraftingServiceEvent` |
| `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.CraftingCollectChestCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.CraftingCollectChestCommand` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.CraftingCollectChestCommand_Event` |
| `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.OpenInventoryInDisenchantModeCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.OpenInventoryInDisenchantModeCommand` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.OpenInventoryInDisenchantModeCommand_Event` |
| `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.ShowCraftingRecipeRewardWindowCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.ShowCraftingRecipeRewardWindowCommand` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.ShowCraftingRecipeRewardWindowCommand_Event` |
| `CraftingServiceEvent::update_active_recipe` | `de.innogames.onyx.city.ui.windows.academy.crafting.commands.CraftingActiveRecipeUpdateCommand` | `de.innogames.onyx.city.ui.windows.academy.crafting.events.CraftingServiceEvent` |
| `CraftingEvent::collect_chest` | `de.innogames.onyx.city.ui.windows.academy.crafting.commands.DeprecatedCraftingCollectChestCommand` | `de.innogames.onyx.city.ui.windows.academy.crafting.events.CraftingEvent` |
| `CraftingEvent::collect` | `de.innogames.onyx.city.ui.windows.academy.crafting.commands.CraftingCollectCommand` | `de.innogames.onyx.city.ui.windows.academy.crafting.events.CraftingEvent` |

#### `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.CraftingCollectChestCommand` (L489112) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.CraftingCollectChestCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.CraftingCollectChestCommand` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.CraftingCollectChestCommand_Event` |

#### `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.OpenInventoryInDisenchantModeCommand` (L489145) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.OpenInventoryInDisenchantModeCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.OpenInventoryInDisenchantModeCommand` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.OpenInventoryInDisenchantModeCommand_Event` |

#### `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.ShowCraftingRecipeRewardWindowCommand` (L489178) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.ShowCraftingRecipeRewardWindowCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.ShowCraftingRecipeRewardWindowCommand` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.ShowCraftingRecipeRewardWindowCommand_Event` |

#### `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.ShowCraftingReloadPopupCommand` (L489214) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.ShowCraftingReloadPopupCommand/EVENT_TYPE` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.ShowCraftingReloadPopupCommand` | `de.innogames.onyx.city.ui.windows.academy.craftingredesign.commands.ShowCraftingReloadPopupCommand_Event` |

#### `de.innogames.onyx.city.ui.windows.newsletter.configs.NewsletterControllerConfiguration` (L500474) - 1 mapping

| Event type | Command | Event class |
|---|---|---|
| `NewsletterEvent::CONFIRM` | `de.innogames.onyx.city.ui.windows.newsletter.commands.SaveNewsletterConfirmCommand` | `de.innogames.onyx.city.ui.windows.newsletter.events.NewsletterEvent` |

#### `de.innogames.onyx.city.ui.windows.stages.configs.StagesControllerConfiguration` (L504998) - 2 mappings

| Event type | Command | Event class |
|---|---|---|
| `ShowStageOverviewEvent::show` | `de.innogames.onyx.city.stages.commands.ShowStageOverviewCommand` | `de.innogames.onyx.city.stages.events.ShowStageOverviewEvent` |
| `ShowEvolveInfoEvent::show` | `de.innogames.onyx.city.ui.windows.stages.commands.ShowEvolveInfoCommand` | `de.innogames.onyx.city.ui.windows.stages.events.ShowEvolveInfoEvent` |

#### `de.innogames.onyx.cmp.commands.ShowAdConsentWarningCommand` (L511923) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.cmp.commands.ShowAdConsentWarningCommand/EVENT_TYPE` | `de.innogames.onyx.cmp.commands.ShowAdConsentWarningCommand` | `de.innogames.onyx.cmp.commands.ShowAdConsentWarningCommand_Event` |

#### `de.innogames.onyx.cmp.commands.ShowGameReloadPopupCommand` (L511976) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.cmp.commands.ShowGameReloadPopupCommand/EVENT_TYPE` | `de.innogames.onyx.cmp.commands.ShowGameReloadPopupCommand` | `de.innogames.onyx.cmp.commands.ShowGameReloadPopupCommand_Event` |

#### `de.innogames.onyx.cmp.configs.CmpConfiguration` (L512031) - 2 mappings

map object: `instance`

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.cmp.commands.ShowAdConsentWarningCommand/EVENT_TYPE` | `de.innogames.onyx.cmp.commands.ShowAdConsentWarningCommand` | `de.innogames.onyx.cmp.commands.ShowAdConsentWarningCommand_Event` |
| `de.innogames.onyx.cmp.commands.ShowGameReloadPopupCommand/EVENT_TYPE` | `de.innogames.onyx.cmp.commands.ShowGameReloadPopupCommand` | `de.innogames.onyx.cmp.commands.ShowGameReloadPopupCommand_Event` |

#### `de.innogames.onyx.configs.ArmyDeploymentControllerConfiguration` (L512326) - 1 mapping

| Event type | Command | Event class |
|---|---|---|
| `UnitsSquadEvent::BuyUnitsEvent` | `de.innogames.onyx.shared.battle.commands.BuyUnitsCommand` | `de.innogames.onyx.shared.battle.events.BuyUnitsEvent` |

#### `de.innogames.onyx.configs.WorldMapControllerConfig` (L512354) - 31 mappings

| Event type | Command | Event class |
|---|---|---|
| `ScoutingEvent::instantFinishScouting` | `de.innogames.onyx.worldmap.controller.InstantFinishScoutingCommand` | `de.innogames.onyx.worldmap.events.ScoutingEvent` |
| `ScoutingEvent::finishScouting` | `de.innogames.onyx.worldmap.controller.FinishScoutingCommand` | `de.innogames.onyx.worldmap.events.ScoutingEvent` |
| `ScoutingEvent::startScouting` | `de.innogames.onyx.worldmap.controller.StartScoutingCommand` | `de.innogames.onyx.worldmap.events.ScoutingEvent` |
| `loadAreas` | `de.innogames.onyx.worldmap.controller.LoadWorldMapAreasCommand` | `de.innogames.onyx.worldmap.events.WorldMapAreaLoadingEvent` |
| `WorldMapViewEvent::startWorldMap` | `de.innogames.onyx.worldmap.controller.StartWorldMapCommand` | `de.innogames.onyx.worldmap.events.WorldMapViewEvent` |
| `WorldMapViewEvent::updateAreas` | `de.innogames.onyx.worldmap.controller.UpdateWorldMapAreasCommand` | `de.innogames.onyx.worldmap.events.WorldMapViewEvent` |
| `WorldMapViewEvent::drawGrid` | `de.innogames.onyx.worldmap.controller.DrawWorldMapGridCommand` | `de.innogames.onyx.worldmap.events.WorldMapViewEvent` |
| `navigateToScout` | `de.innogames.onyx.worldmap.controller.NavigateToScoutCommand` | `de.innogames.onyx.worldmap.view.hud.events.WorldMapSubMenuEvent` |
| `navigateToHome` | `de.innogames.onyx.worldmap.controller.NavigateToHomeCommand` | `de.innogames.onyx.worldmap.view.hud.events.WorldMapSubMenuEvent` |
| `showRelicInfo` | `de.innogames.onyx.worldmap.controller.ShowRelicWindowCommand` | `de.innogames.onyx.worldmap.view.hud.events.WorldMapSubMenuEvent` |
| `showProvincesOverview` | `de.innogames.onyx.worldmap.controller.ShowProvincesOverviewWindowCommand` | `de.innogames.onyx.worldmap.view.hud.events.WorldMapSubMenuEvent` |
| `SolveEncounterEvent::encounter` | `de.innogames.onyx.province.commands.SolveEncounterCommand` | `de.innogames.onyx.province.events.SolveEncounterEvent` |
| `SolveEncounterEvent::tournament_encounter` | `de.innogames.onyx.province.commands.SolveTournamentEncounterCommand` | `de.innogames.onyx.province.events.SolveEncounterEvent` |
| `UnlockEncounterEvent::unlockEncounter` | `de.innogames.onyx.province.commands.UnlockEncounterCommand` | `de.innogames.onyx.province.events.UnlockEncounterEvent` |
| `EncounterRewardEvent::showReward` | `de.innogames.onyx.province.commands.ShowEncounterRewardCommand` | `de.innogames.onyx.province.events.EncounterRewardsEvent` |
| `EncounterRewardEvent::showRewardBlimps` | `de.innogames.onyx.province.commands.ShowEncounterRewardBlimpsCommand` | `de.innogames.onyx.province.events.EncounterRewardsEvent` |
| `ProvinceEncountersEvent::updateProvince` | `de.innogames.onyx.worldmap.controller.UpdateProvinceEncountersCommand` | `de.innogames.onyx.province.events.ProvinceEncountersEvent` |
| `UpdateProvincesEvent::update` | `de.innogames.onyx.worldmap.controller.UpdateProvincesCommand` | `de.innogames.onyx.tournaments.events.UpdateProvincesEvent` |
| `TrackProvincesEvent::track` | `de.innogames.onyx.worldmap.controller.TrackProvincesCommand` | `de.innogames.onyx.worldmap.events.TrackProvincesEvent` |
| `EncounterRewardSequenceEvent::showProvinceReward` | `de.innogames.onyx.worldmap.controller.ShowProvinceRewardCommand` | `de.innogames.onyx.province.events.EncounterRewardsEvent` |
| `EncounterRewardSequenceEvent::showProductionBoostReward` | `de.innogames.onyx.worldmap.controller.ShowProductionBoostRewardCommand` | `de.innogames.onyx.province.events.EncounterRewardsEvent` |
| `tradeForPremium` | `de.innogames.onyx.province.commands.PremiumTradeEncounterCommand` | `de.innogames.onyx.province.events.EncounterEvent` |
| `trade` | `de.innogames.onyx.province.commands.TradeEncounterCommand` | `de.innogames.onyx.province.events.EncounterEvent` |
| `StartBattleEvent::instantBattle` | `de.innogames.onyx.worldmap.controller.InstantBattleCommand` | `de.innogames.onyx.shared.events.StartBattleEvent` |
| `StartBattleEvent::startBattle` | `de.innogames.onyx.worldmap.controller.ManualBattleCommand` | `de.innogames.onyx.shared.events.StartBattleEvent` |
| `ApplicationResizeEvent/RESIZED` | `de.innogames.onyx.worldmap.controller.UpdateWorldMapAreasCommand` | `de.innogames.onyx.shared.events.ApplicationResizeEvent` |
| `ApplicationResizeEvent/RESIZED` | `de.innogames.onyx.worldmap.controller.UpdateWorldMapViewPortCommand` | `de.innogames.onyx.shared.events.ApplicationResizeEvent` |
| `ModuleContextEvent::destroyContext` | `de.innogames.onyx.worldmap.controller.WorldMapDestroyCommand` | `de.innogames.onyx.ModuleContextEvent` |
| `ProvinceNagivationEvent::navigate` | `de.innogames.onyx.worldmap.controller.NavigateToProvinceCommand` | `de.innogames.onyx.worldmap.events.ProvinceNagivationEvent` |
| `GetIncompleteGoodProvincesEvent::updateProvinces` | `de.innogames.onyx.worldmap.controller.GetIncompleteGoodProvincesCommand` | `de.innogames.onyx.worldmap.controller.GetIncompleteGoodProvincesEvent` |
| `GetDiscoveredPlayerProvincesEvent::updateProvinces` | `de.innogames.onyx.worldmap.controller.GetDiscoveredPlayerProvincesCommand` | `de.innogames.onyx.worldmap.controller.GetDiscoveredPlayerProvincesEvent` |

#### `de.innogames.onyx.guardians.commands.ShowGuardianInfoCommand` (L514461) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.guardians.commands.ShowGuardianInfoCommand/EVENT_TYPE` | `de.innogames.onyx.guardians.commands.ShowGuardianInfoCommand` | `de.innogames.onyx.guardians.commands.ShowGuardianInfoCommand_Event` |

#### `de.innogames.onyx.guardians.commands.ShowGuardianStageOverviewCommand` (L514505) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.guardians.commands.ShowGuardianStageOverviewCommand/EVENT_TYPE` | `de.innogames.onyx.guardians.commands.ShowGuardianStageOverviewCommand` | `de.innogames.onyx.guardians.commands.ShowGuardianStageOverviewCommand_Event` |

#### `de.innogames.onyx.guardians.configs.GuardiansConfiguration` (L514554) - 3 mappings

map object: `eventCommandMap`

| Event type | Command | Event class |
|---|---|---|
| `UnsummonGuardianRequestEvent::requestUnsummon` | `de.innogames.onyx.guardians.commands.ConfirmUnsummonGuardianCommand` | `de.innogames.onyx.guardians.events.UnsummonGuardianRequestEvent` |
| `de.innogames.onyx.guardians.commands.ShowGuardianInfoCommand/EVENT_TYPE` | `de.innogames.onyx.guardians.commands.ShowGuardianInfoCommand` | `de.innogames.onyx.guardians.commands.ShowGuardianInfoCommand_Event` |
| `de.innogames.onyx.guardians.commands.ShowGuardianStageOverviewCommand/EVENT_TYPE` | `de.innogames.onyx.guardians.commands.ShowGuardianStageOverviewCommand` | `de.innogames.onyx.guardians.commands.ShowGuardianStageOverviewCommand_Event` |

#### `de.innogames.onyx.help.configs.HelpControllerConfiguration` (L517412) - 1 mapping

map object: `eventCommandMap`

| Event type | Command | Event class |
|---|---|---|
| `ShowHelpWindowEvent::show` | `de.innogames.onyx.help.commands.ShowHelpWindowCommand` | `de.innogames.onyx.help.events.ShowHelpWindowEvent` |

#### `de.innogames.onyx.microsoft.rating.configs.RatingControllerConfiguration` (L518415) - 1 mapping

| Event type | Command | Event class |
|---|---|---|
| `MicrosoftRatingEvent::showPopup` | `de.innogames.onyx.microsoft.rating.commands.ShowRateAndReviewPopupCommand` `.withGuards([de_innogames_onyx_microsoft_rating_guards_OpenMicrosoftRatingPopupGuard])` | `de.innogames.onyx.microsoft.rating.events.MicrosoftRatingEvent` |

#### `de.innogames.onyx.miners.configs.GoldMineControllerConfig` (L519429) - 1 mapping

| Event type | Command | Event class |
|---|---|---|
| `CollectGoldMineEvent::collect` | `de.innogames.onyx.miners.commands.CollectGoldMineCommand` | `de.innogames.onyx.miners.events.CollectGoldMineEvent` |

#### `de.innogames.onyx.multiplayer.configs.MultiplayerControllerConfig` (L519478) - 6 mappings

| Event type | Command | Event class |
|---|---|---|
| `MultiplayerModelMultiplayerEvent::updateModelMultiplayer` | `de.innogames.onyx.multiplayer.controller.UpdateMultiplayerModelMultiplayerCommand` | `de.innogames.onyx.multiplayer.events.MultiplayerModelMultiplayerEvent` |
| `MultiplayerModelWaypointsEvent::updateModelWaypoints` | `de.innogames.onyx.multiplayer.controller.UpdateMultiplayerModelWaypointsCommand` | `de.innogames.onyx.multiplayer.events.MultiplayerModelWaypointsEvent` |
| `MultiplayerModelContributionEvent::updateModelContribution` | `de.innogames.onyx.multiplayer.controller.UpdateMultiplayerModeContributionCommand` | `de.innogames.onyx.multiplayer.events.MultiplayerModelContributionEvent` |
| `MultiplayerModelStageRewardsEvent::unlockStageRewards` | `de.innogames.onyx.multiplayer.controller.UnlockStageRewardsCommand` | `de.innogames.onyx.multiplayer.events.MultiplayerModelStageRewardsEvent` |
| `SeasonalEventsEvent::ended` | `de.innogames.onyx.multiplayer.controller.MultiplayerEndedCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsEvent` |
| `MultiplayerRewardEvent::showRewards` | `de.innogames.onyx.multiplayer.controller.ShowMultiplayerRewardsCommand` | `de.innogames.onyx.multiplayer.events.MultiplayerRewardEvent` |

#### `de.innogames.onyx.multiplayer.configs.MultiplayerModuleControllerConfig` (L519518) - 7 mappings

| Event type | Command | Event class |
|---|---|---|
| `WaypointWindowEvent::show` | `de.innogames.onyx.multiplayer.controller.ShowWaypointWindowCommand` | `de.innogames.onyx.multiplayer.events.WaypointWindowEvent` |
| `WaypointWindowDataEvent::loadWaypointData` | `de.innogames.onyx.multiplayer.controller.LoadWaypointDataCommand` | `de.innogames.onyx.multiplayer.events.WaypointWindowDataEvent` |
| `StageRewardWindowEvent::show` | `de.innogames.onyx.multiplayer.controller.ShowStageRewardWindowCommand` | `de.innogames.onyx.multiplayer.events.StageRewardWindowEvent` |
| `StageRewardEvent::collect` | `de.innogames.onyx.multiplayer.controller.CollectStageRewardCommand` | `de.innogames.onyx.multiplayer.events.StageRewardEvent` |
| `RankingWindowEvent::show` | `de.innogames.onyx.multiplayer.controller.ShowRankingWindowCommand` | `de.innogames.onyx.multiplayer.events.MultiplayerRankingWindowEvent` |
| `MultiplayerMapPathEvent::selectPath` | `de.innogames.onyx.multiplayer.controller.SelectPathCommand` | `de.innogames.onyx.multiplayer.events.MultiplayerMapPathEvent` |
| `MultiplayerModelMultiplayerEvent::requestModelMultiplayerUpdate` | `de.innogames.onyx.multiplayer.controller.RequestMultiplayerUpdateCommand` | `de.innogames.onyx.multiplayer.events.MultiplayerModelMultiplayerEvent` |

#### `de.innogames.onyx.resources.config.ResourceControllerConfig` (L543204) - 2 mappings

| Event type | Command | Event class |
|---|---|---|
| `CheckStorageCapacityEvent::check` | `de.innogames.onyx.resources.commands.CheckStorageCapacityCommand` | `de.innogames.onyx.resources.events.CheckStorageCapacityEvent` |
| `ResourcesServiceEvent::sync_resources` | `de.innogames.onyx.resources.commands.SyncResourcesCommand` | `de.innogames.onyx.resources.events.ResourcesServiceEvent` |

#### `de.innogames.onyx.seasonalevents.configs.SeasonalEventsControllerConfiguration` (L544465) - 11 mappings

| Event type | Command | Event class |
|---|---|---|
| `SeasonalEventsModelEvent::modelUpdated` | `de.innogames.onyx.seasonalevents.commands.SeasonalEventsUpdatedCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsModelEvent` |
| `ModuleChangeEvent::moduleChanged` | `de.innogames.onyx.seasonalevents.commands.SeasonalEventsUpdatedCommand` | `de.innogames.onyx.mvcs.events.ModuleChangeEvent` |
| `SeasonalEventsModelEvent::serverDataReceived` | `de.innogames.onyx.seasonalevents.commands.UpdateSeasonalEventsCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsModelEvent` |
| `SeasonalEventsModelEvent::prepareEvents` | `de.innogames.onyx.seasonalevents.commands.PrepareSeasonalEventsCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsModelEvent` |
| `SeasonalEventsModelEvent::requestEventsUpdate` | `de.innogames.onyx.seasonalevents.commands.RequestSeasonalEventsUpdateCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsModelEvent` |
| `SeasonalEventsModelEvent::requestEventsUpdate` | `de.innogames.onyx.shared.quests.commands.UpdateQuestCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsModelEvent` |
| `SeasonalEventsEvent::confirmStarted` | `de.innogames.onyx.seasonalevents.commands.ConfirmSeasonalEventStartedCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsEvent` |
| `SeasonalEventsEvent::confirmStarted` | `de.innogames.onyx.city.mainevents.royalpass.commands.UpdateFlexibleResourcesRoyalPassRewardsCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsEvent` |
| `SeasonalEventsEvent::confirmStarted` | `de.innogames.onyx.city.mainevents.seasonpass.commands.UpdateFlexibleResourcesSeasonPassRewardsCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsEvent` |
| `SeasonalEventsEvent::confirmEnded` | `de.innogames.onyx.seasonalevents.commands.ConfirmSeasonalEventEndedCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsEvent` |
| `SeasonalEventsEvent::confirmEnded` | `de.innogames.onyx.seasonalevents.commands.ClearEventQuestsCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsEvent` |

#### `de.innogames.onyx.shared.blimps.config.BlimpsControllerConfig` (L547214) - 1 mapping

| Event type | Command | Event class |
|---|---|---|
| `ShowBlimpsEvent::showBlimps` | `de.innogames.onyx.shared.blimps.commands.ShowBlimpsCommand` | `de.innogames.onyx.shared.blimps.events.ShowBlimpsEvent` |

#### `de.innogames.onyx.shared.commands.ManualMediationCommand` (L549217) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.shared.commands.ManualMediationCommand/EVENT_TYPE` | `de.innogames.onyx.shared.commands.ManualMediationCommand` | `de.innogames.onyx.shared.commands.ManualMediationCommand_Event` |

#### `de.innogames.onyx.shared.configs.battleresult.BattleResultControllerConfiguration` (L549418) - 2 mappings

| Event type | Command | Event class |
|---|---|---|
| `ReviveUnitsEvent::revive_unit` | `de.innogames.onyx.shared.battle.commands.HealUnitsSquadCommand` | `de.innogames.onyx.shared.battle.events.ReviveUnitsEvent` |
| `UnitsSquadEvent::unitHealed` | `de.innogames.onyx.shared.battle.commands.UnitSquadHealedCommand` | `de.innogames.onyx.shared.battle.events.UnitsSquadEvent` |

#### `de.innogames.onyx.shared.guilds.configs.GuildControllerConfiguration` (L553946) - 33 mappings

map object: `eventCommandMap`

| Event type | Command | Event class |
|---|---|---|
| `getUserGuild` | `de.innogames.onyx.shared.guilds.commands.GetUserGuildCommand` | `de.innogames.onyx.shared.guilds.events.GetGuildDataEvent` |
| `getUserMemberships` | `de.innogames.onyx.shared.guilds.commands.GetUserMembershipsCommand` | `de.innogames.onyx.shared.guilds.events.GetGuildDataEvent` |
| `getVisitedGuild` | `de.innogames.onyx.shared.guilds.commands.GetVisitedGuildCommand` | `de.innogames.onyx.shared.guilds.events.GetGuildDataEvent` |
| `updateUserGuild` | `de.innogames.onyx.shared.guilds.commands.UpdateUserGuildCommand` | `de.innogames.onyx.shared.guilds.events.UpdateUserGuildEvent` |
| `updateUserGuildInfo` | `de.innogames.onyx.shared.guilds.commands.UpdateUserGuildInfoCommand` | `de.innogames.onyx.shared.guilds.events.UpdateUserGuildInfoEvent` |
| `updateVisitedGuild` | `de.innogames.onyx.shared.guilds.commands.UpdateVisitedGuildCommand` | `de.innogames.onyx.shared.guilds.events.UpdateVisitedGuildEvent` |
| `updateUserMemberships` | `de.innogames.onyx.shared.guilds.commands.UpdateUserMembershipsCommand` | `de.innogames.onyx.shared.guilds.events.UpdateUserMembershipsEvent` |
| `addInvitation` | `de.innogames.onyx.shared.guilds.commands.AddInvitationCommand` | `de.innogames.onyx.shared.guilds.events.AddInvitationEvent` |
| `GuildPushResponseEvent::memberExpelled` | `de.innogames.onyx.shared.guilds.commands.MemberExpelledCommand` | `de.innogames.onyx.shared.guilds.events.GuildPushResponseEvent` |
| `GuildPushResponseEvent::applicationAccepted` | `de.innogames.onyx.shared.guilds.commands.ApplicationAcceptedCommand` | `de.innogames.onyx.shared.guilds.events.GuildPushResponseEvent` |
| `get_suggestions` | `de.innogames.onyx.shared.guilds.commands.GetSuggestedGuildsCommand` | `de.innogames.onyx.shared.guilds.events.GuildSuggestionEvent` |
| `ChangeGuildEvent::createGuild` | `de.innogames.onyx.shared.guilds.commands.CreateGuildCommand` | `de.innogames.onyx.shared.guilds.events.ChangeGuildEvent` |
| `ChangeGuildEvent::editGuild` | `de.innogames.onyx.shared.guilds.commands.EditGuildCommand` | `de.innogames.onyx.shared.guilds.events.ChangeGuildEvent` |
| `disbandGuild` | `de.innogames.onyx.shared.guilds.commands.DisbandGuildCommand` | `de.innogames.onyx.shared.guilds.events.DisbandGuildEvent` |
| `showDisbandAlert` | `de.innogames.onyx.shared.guilds.commands.ShowDisbandGuildAlertCommand` | `de.innogames.onyx.shared.guilds.events.DisbandGuildEvent` |
| `showDisbandedAlert` | `de.innogames.onyx.shared.guilds.commands.ShowGuildDisbandedAlertCommand` | `de.innogames.onyx.shared.guilds.events.DisbandGuildEvent` |
| `ShortcutEvent::openGuildWindow` | `de.innogames.onyx.shared.guilds.commands.OpenGuildWindowCommand` | `de.innogames.onyx.city.shortcuts.ShortcutEvent` |
| `StartGuildMemberNeighborlyHelpCoolDownEvent::start` | `de.innogames.onyx.shared.guilds.commands.StartGuildMemberNeighborlyHelpCoolDownCommand` | `de.innogames.onyx.shared.guilds.events.StartGuildMemberNeighborlyHelpCoolDownEvent` |
| `ChangeGuildRoleEvent/changeRole` | `de.innogames.onyx.shared.guilds.commands.ChangeGuildMemberRoleCommand` | `de.innogames.onyx.shared.guilds.events.ChangeGuildRoleEvent` |
| `invitePlayer` | `de.innogames.onyx.shared.guilds.commands.InvitePlayerCommand` | `de.innogames.onyx.shared.guilds.events.InvitePlayerEvent` |
| `showLeaveAlert` | `de.innogames.onyx.shared.guilds.commands.ShowLeaveGuildAlertCommand` | `de.innogames.onyx.shared.guilds.events.LeaveGuildEvent` |
| `leaveGuild` | `de.innogames.onyx.shared.guilds.commands.LeaveGuildCommand` | `de.innogames.onyx.shared.guilds.events.LeaveGuildEvent` |
| `ExpelPlayerEvent/EXPEL_PLAYER` | `de.innogames.onyx.shared.guilds.commands.ExpelPlayerCommand` | `de.innogames.onyx.shared.guilds.events.ExpelPlayerEvent` |
| `SendGuildApplicationEvent::sendApplication` | `de.innogames.onyx.shared.guilds.commands.SendGuildApplicationCommand` | `de.innogames.onyx.shared.guilds.events.SendGuildApplicationEvent` |
| `SendJoinGuildEvent::join` | `de.innogames.onyx.shared.guilds.commands.SendJoinGuildCommand` | `de.innogames.onyx.shared.guilds.events.SendJoinGuildEvent` |
| `MembershipRequestEvent::accept` | `de.innogames.onyx.shared.guilds.commands.AcceptMembershipCommand` | `de.innogames.onyx.shared.guilds.events.MembershipRequestEvent` |
| `MembershipRequestEvent::reject` | `de.innogames.onyx.shared.guilds.commands.RejectMembershipCommand` | `de.innogames.onyx.shared.guilds.events.MembershipRequestEvent` |
| `CandidateRequestEvent::accept` | `de.innogames.onyx.shared.guilds.commands.AcceptCandidateCommand` | `de.innogames.onyx.shared.guilds.events.CandidateRequestEvent` |
| `CandidateRequestEvent::reject` | `de.innogames.onyx.shared.guilds.commands.RejectCandidateCommand` | `de.innogames.onyx.shared.guilds.events.CandidateRequestEvent` |
| `PerkEvent::getPerks` | `de.innogames.onyx.shared.guilds.commands.GetPerksCommand` | `de.innogames.onyx.shared.guilds.events.PerkEvent` |
| `PerkEvent::upgradePerk` | `de.innogames.onyx.shared.guilds.commands.UpgradePerkCommand` | `de.innogames.onyx.shared.guilds.events.PerkEvent` |
| `PerkEvent::resetAllPerks` | `de.innogames.onyx.shared.guilds.commands.ResetAllPerksCommand` | `de.innogames.onyx.shared.guilds.events.PerkEvent` |
| `UpdateGuildProgressionEvent::update` | `de.innogames.onyx.shared.guilds.commands.UpdateGuildProgressionCommand` | `de.innogames.onyx.shared.guilds.events.UpdateGuildProgressionEvent` |

#### `de.innogames.onyx.shared.indicators.configs.IndicatorsControllerConfiguration` (L562801) - 3 mappings

map object: `eventCommandMap`

| Event type | Command | Event class |
|---|---|---|
| `IndicatorsServiceEvent::indicatorsLoaded` | `de.innogames.onyx.shared.indicators.command.IndicatorsLoadedCommand` | `de.innogames.onyx.shared.indicators.events.IndicatorsServiceEvent` |
| `ClearIndicatorsEvent::clear` | `de.innogames.onyx.shared.indicators.command.ClearIndicatorsCommand` | `de.innogames.onyx.shared.indicators.events.ClearIndicatorsEvent` |
| `ClearIndicatorEvent::clear` | `de.innogames.onyx.shared.indicators.command.ClearIndicatorCommand` | `de.innogames.onyx.shared.indicators.events.ClearIndicatorEvent` |

#### `de.innogames.onyx.shared.keydialog.configs.KeyDialogControllerConfiguration` (L563307) - 1 mapping

| Event type | Command | Event class |
|---|---|---|
| `ShowKeyDialogWindowEvent::show` | `de.innogames.onyx.shared.keydialog.commands.ShowKeyDialogWindowCommand` | `de.innogames.onyx.shared.keydialog.events.ShowKeyDialogWindowEvent` |

#### `de.innogames.onyx.shared.messaging.configs.MessagingControllerConfiguration` (L564019) - 9 mappings

| Event type | Command | Event class |
|---|---|---|
| `removeMessage` | `de.innogames.onyx.shared.messaging.controller.RemoveMessageCommand` | `de.innogames.onyx.shared.messaging.events.RemoveMessageEvent` |
| `replyToMessage` | `de.innogames.onyx.shared.messaging.controller.ReplyToMessageCommand` | `de.innogames.onyx.shared.messaging.events.ReplyMessageEvent` |
| `getMessages` | `de.innogames.onyx.shared.messaging.controller.GetMessagesCommand` | `de.innogames.onyx.shared.messaging.events.GetMessagesEvent` |
| `getMessageMetadata` | `de.innogames.onyx.shared.messaging.controller.GetMessageMetadataCommand` | `de.innogames.onyx.shared.messaging.events.GetMessagesEvent` |
| `sendMessage` | `de.innogames.onyx.shared.messaging.controller.SendMessageCommand` | `de.innogames.onyx.shared.messaging.events.SendMessageEvent` |
| `messageSentAlertWindow` | `de.innogames.onyx.shared.messaging.controller.ShowMessageSentAlertCommand` | `de.innogames.onyx.shared.messaging.events.SendMessageEvent` |
| `readMessage` | `de.innogames.onyx.shared.messaging.controller.MarkMessageAsReadCommand` | `de.innogames.onyx.shared.messaging.events.ReadMessageEvent` |
| `readMessage` | `de.innogames.onyx.shared.messaging.controller.ReadMessageCommand` | `de.innogames.onyx.shared.messaging.events.ReadMessageEvent` |
| `showReportPlayerWindowNew` | `de.innogames.onyx.shared.messaging.controller.ShowReportPlayerWindowCommand` | `de.innogames.onyx.shared.messaging.events.ReportPlayerEvent` |

#### `de.innogames.onyx.shared.portraits.config.PortraitControllerConfiguration` (L567890) - 1 mapping

| Event type | Command | Event class |
|---|---|---|
| `UnlockedPortraitsUpdatedEvent/UPDATED` | `de.innogames.onyx.shared.portraits.commands.ShowUnlockPortraitRewardCommand` | `de.innogames.onyx.shared.portraits.events.UnlockedPortraitsUpdatedEvent` |

#### `de.innogames.onyx.shared.quests.configs.QuestControllerConfiguration` (L569048) - 10 mappings

map object: `eventCommandMap`

| Event type | Command | Event class |
|---|---|---|
| `QuestDataServiceEvent/UPDATE` | `de.innogames.strategycity.main.controller.bootstrap.QuestUpdateCommand` | `de.innogames.strategycity.shared.service.events.QuestDataServiceEvent` |
| `QuestEvent/complete` | `de.innogames.onyx.shared.quests.commands.AdvanceQuestCommand` | `de.innogames.onyx.shared.quests.events.QuestEvent` |
| `QuestEvent/reject` | `de.innogames.onyx.shared.quests.commands.QuestAbortCommand` | `de.innogames.onyx.shared.quests.events.QuestEvent` |
| `QuestEvent/update` | `de.innogames.onyx.shared.quests.commands.UpdateQuestCommand` | `de.innogames.onyx.shared.quests.events.QuestEvent` |
| `QuestEvent/openWindow` | `de.innogames.onyx.shared.quests.commands.OpenQuestWindowCommand` | `de.innogames.onyx.shared.quests.events.QuestEvent` |
| `QuestEvent/markQuestSeen` | `de.innogames.onyx.shared.quests.commands.MarkQuestSeenCommand` | `de.innogames.onyx.shared.quests.events.QuestEvent` |
| `QuestModelEvent::addedQuests` | `de.innogames.onyx.shared.quests.commands.DispatchStartTutorialQuestCommand` | `de.innogames.onyx.shared.quests.events.QuestModelEvent` |
| `QuestModelEvent::updatedExistingQuests` | `de.innogames.onyx.shared.quests.commands.CheckForAccomplishedTutorialQuestsCommand` | `de.innogames.onyx.shared.quests.events.QuestModelEvent` |
| `QuestMilestoneModelProgressEvent::updateModel` | `de.innogames.onyx.shared.quests.commands.UpdateQuestMilestoneProgressCommand` | `de.innogames.onyx.shared.quests.events.QuestMilestoneModelProgressEvent` |
| `CollectQuestMilestoneRewardEvent::collect` | `de.innogames.onyx.shared.quests.commands.CollectQuestMilestoneRewardCommand` | `de.innogames.onyx.shared.quests.events.CollectQuestMilestoneRewardEvent` |

#### `de.innogames.onyx.shared.rewards.configs.RewardsControllerConfiguration` (L575508) - 3 mappings

| Event type | Command | Event class |
|---|---|---|
| `SetEpisodicRewardsEvent/SET_REWARDS` | `de.innogames.onyx.seasonalevents.commands.SetEpisodicRewardsCommand` | `de.innogames.onyx.shared.rewards.events.SetEpisodicRewardsEvent` |
| `EpisodicRewardsModelEvent::updateFlexibleRewards` | `de.innogames.onyx.shared.rewards.commands.UpdateFlexibleResourcesEpisodicRewardsCommand` | `de.innogames.onyx.shared.rewards.events.EpisodicRewardsModelEvent` |
| `PendingRewardEvent::showWindows` | `de.innogames.onyx.shared.rewards.commands.ShowPendingRewardWindowsCommand` | `de.innogames.onyx.shared.rewards.events.PendingRewardEvent` |

#### `de.innogames.onyx.shared.ui.windows.news.configs.NewsConfiguration` (L611296) - 4 mappings

| Event type | Command | Event class |
|---|---|---|
| `NewsServiceEvent::UPDATE` | `de.innogames.onyx.shared.ui.windows.news.commands.NewsUpdateCommand` | `de.innogames.strategycity.main.service.events.NewsServiceEvent` |
| `NewsEvent::MARK_AS_NEW` | `de.innogames.onyx.shared.ui.windows.news.commands.MarkNewsAsNewCommand` | `de.innogames.onyx.shared.ui.windows.news.events.NewsEvent` |
| `NewsEvent::SHOW_WINDOW` | `de.innogames.onyx.shared.ui.windows.news.commands.ShowNewsWindowCommand` | `de.innogames.onyx.shared.ui.windows.news.events.NewsEvent` |
| `NewsTrackEvent::track` | `de.innogames.onyx.shared.ui.windows.news.commands.NewsTrackCommand` | `de.innogames.onyx.shared.ui.windows.news.events.NewsTrackEvent` |

#### `de.innogames.onyx.spire.commands.ShowSpireShopRewardWindowCommand` (L616806) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.spire.commands.ShowSpireShopRewardWindowCommand/EVENT_TYPE` | `de.innogames.onyx.spire.commands.ShowSpireShopRewardWindowCommand` | `de.innogames.onyx.spire.commands.ShowSpireShopRewardWindowCommand_Event` |

#### `de.innogames.onyx.spire.config.SpireControllerConfig` (L617031) - 3 mappings

| Event type | Command | Event class |
|---|---|---|
| `IsoDecorationEvent::click` | `de.innogames.onyx.spire.commands.EnterSpireCommand` `.withGuards([de_innogames_onyx_spire_commands_guards_CanEnterSpire]).withPayloadInjection()` | `de.innogames.onyx.city.engine.events.IsoDecorationEvent` |
| `SpireEvent::show` | `de.innogames.onyx.spire.commands.MoveCameraToSpireCommand` | `de.innogames.onyx.eventintro.events.SpireEvent` |
| `SpireRewardsEvent::showRewards` | `de.innogames.onyx.spire.commands.ShowSpireRewardsCommand` | `de.innogames.onyx.spire.events.SpireRewardsEvent` |

#### `de.innogames.onyx.spire.moduleconfig.SpireModuleCommandsConfig` (L619611) - 27 mappings

| Event type | Command | Event class |
|---|---|---|
| `SpireEncounterWindowEvent::show_window` | `de.innogames.onyx.spire.commands.ShowSpireEncounterWindowCommand` | `de.innogames.onyx.spire.events.SpireEncounterWindowEvent` |
| `SpireEncounterWindowEvent::click_diplomacy` | `de.innogames.onyx.spire.commands.ShowSpireDiplomacyWindowCommand` | `de.innogames.onyx.spire.events.SpireEncounterWindowEvent` |
| `SpireBuyUnitsEvent::buy_units` | `de.innogames.onyx.spire.commands.BuyUnitsCommand` | `de.innogames.onyx.spire.events.SpireBuyUnitsEvent` |
| `SpirePointViewEvent::open_chest` | `de.innogames.onyx.spire.commands.OpenChestCommand` | `de.innogames.onyx.spire.events.SpirePointViewEvent` |
| `SpireMysteryChestEvent::open_chest` | `de.innogames.onyx.spire.commands.OpenMysteryChestCommand` | `de.innogames.onyx.spire.events.SpireMysteryChestEvent` |
| `SpirePointViewEvent::instant_open_gate` | `de.innogames.onyx.spire.commands.InstantOpenGateCommand` | `de.innogames.onyx.spire.events.SpirePointViewEvent` |
| `SpirePointViewEvent::open_gate` | `de.innogames.onyx.spire.commands.OpenGateCommand` | `de.innogames.onyx.spire.events.SpirePointViewEvent` |
| `SpireMapUpdateEvent::update_map` | `de.innogames.onyx.spire.commands.UpdateMapCommand` | `de.innogames.onyx.spire.events.SpireMapUpdateEvent` |
| `SpireRankingUpdateEvent::update_ranking` | `de.innogames.onyx.spire.commands.UpdateRankingCommand` | `de.innogames.onyx.spire.events.SpireRankingUpdateEvent` |
| `SpireMysteryChestEvent::spawn_blimp` | `de.innogames.onyx.spire.commands.MysteryChestBlimpCommand` | `de.innogames.onyx.spire.events.SpireMysteryChestEvent`, `de.innogames.onyx.spire.events.SpireUpdateEvent` |
| `SpireInvestEvent::submit` | `de.innogames.onyx.spire.commands.SendInvestmentsCommand` | `de.innogames.onyx.spire.events.SpireSendInvestmentEvent` |
| `SpireOverEvent::over` | `de.innogames.onyx.spire.commands.SpireEventEndCommand` | `de.innogames.onyx.spire.events.SpireOverEvent` |
| `SpireCameraEvent::move_to_next_point` | `de.innogames.onyx.spire.commands.MoveCameraToNextPointCommand` | `de.innogames.onyx.spire.events.SpireCameraEvent` |
| `SpireCameraEvent::move_to_next_mystery_chest` | `de.innogames.onyx.spire.commands.MoveCameraToNextMysteryChestCommand` | `de.innogames.onyx.spire.events.SpireCameraEvent` |
| `SpireCancelDiplomacyEvent::cancel` | `de.innogames.onyx.spire.commands.CancelDiplomacyCommand` | `de.innogames.onyx.spire.events.SpireCancelDiplomacyEvent` |
| `SpireBuyExtraTurnEvent::buy` | `de.innogames.onyx.spire.commands.BuyExtraTurnCommand` | `de.innogames.onyx.spire.events.SpireBuyExtraTurnEvent` |
| `CharacterMovementEvent::moveToPointComplete` | `de.innogames.onyx.spire.commands.ShowSpireCompleteCommand` | `de.innogames.onyx.spire.views.movements.CharacterMovementEvent` |
| `SpireBattleEvent::start_instant_battle` | `de.innogames.onyx.spire.commands.StartSpireInstantBattleCommand` | `de.innogames.onyx.spire.events.SpireBattleEvent` |
| `SpireBattleEvent::start_manual_battle` | `de.innogames.onyx.spire.commands.StartSpireManualBattleCommand` | `de.innogames.onyx.spire.events.SpireBattleEvent` |
| `SpireBattleEvent::continue_instant_battle` | `de.innogames.onyx.spire.commands.ContinueSpireInstantBattleCommand` | `de.innogames.onyx.spire.events.SpireBattleEvent` |
| `SpireBattleEvent::continue_manual_battle` | `de.innogames.onyx.spire.commands.ContinueSpireManualBattleCommand` | `de.innogames.onyx.spire.events.SpireBattleEvent` |
| `ModuleContextEvent::destroyContext` | `de.innogames.onyx.spire.commands.DestroySpireCommand` | `de.innogames.onyx.ModuleContextEvent` |
| `SpireDataEvent::spireDataParsed` | `de.innogames.onyx.spire.commands.UpdateFlexibleResourcesCrystalsCommand` | `de.innogames.onyx.spire.events.SpireDataEvent` |
| `BuildingChapterAdvanceEvent::CHAPTER_ADVANCE` | `de.innogames.onyx.spire.commands.UpdateFlexibleResourcesCrystalsCommand` | `de.innogames.onyx.city.events.BuildingChapterAdvanceEvent` |
| `SpendArchivePointsEvent::spend` | `de.innogames.onyx.spire.commands.UnlockNextCrystalWithArchivePointsCommand` | `de.innogames.onyx.archive.events.SpendArchivePointsEvent` |
| `SpireMapShopWindowEvent::showWindow` | `de.innogames.onyx.spire.commands.ShowSpireMapShopWindowCommand` | `de.innogames.onyx.spire.events.SpireMapShopWindowEvent` |
| `de.innogames.onyx.spire.commands.ShowSpireShopRewardWindowCommand/EVENT_TYPE` | `de.innogames.onyx.spire.commands.ShowSpireShopRewardWindowCommand` | `de.innogames.onyx.spire.commands.ShowSpireShopRewardWindowCommand_Event` |

#### `de.innogames.onyx.techtree.configs.TechTreeControllerConfig` (L630404) - 14 mappings

| Event type | Command | Event class |
|---|---|---|
| `TechnologyStateEvent/newStateReadyToPay` | `de.innogames.onyx.techtree.controller.TechnologyNewStateReadyToPayCommand` | `de.innogames.onyx.techtree.events.TechnologyStateEvent` |
| `TechnologyStateEvent/newStateResearched` | `de.innogames.onyx.techtree.controller.TechnologyNewStateResearchedCommand` | `de.innogames.onyx.techtree.events.TechnologyStateEvent` |
| `getRewards` | `de.innogames.onyx.techtree.controller.TechnologyGetRewardsCommand` | `de.innogames.onyx.techtree.events.TechnologyEvent` |
| `pay` | `de.innogames.onyx.techtree.controller.TechnologyPayCommand` | `de.innogames.onyx.techtree.events.TechnologyEvent` |
| `showRewardWindow` | `de.innogames.onyx.techtree.controller.TechnologyShowRewardWindowCommand` | `de.innogames.onyx.techtree.events.TechnologyEvent` |
| `useKnowledgePoints` | `de.innogames.onyx.techtree.controller.TechnologyUseKnowledgePointsCommand` | `de.innogames.onyx.techtree.events.KnowledgePointEvent` |
| `instantProgress` | `de.innogames.onyx.techtree.controller.TechnologyInstantProgressCommand` | `de.innogames.onyx.techtree.events.KnowledgePointEvent` |
| `instantUnlock` | `de.innogames.onyx.techtree.controller.TechnologyInstantUnlockCommand` | `de.innogames.onyx.techtree.events.KnowledgePointEvent` |
| `ModuleContextEvent::destroyContext` | `de.innogames.onyx.techtree.controller.TechTreeDestroyCommand` | `de.innogames.onyx.ModuleContextEvent` |
| `TechTreeSectionEvent::techSectionUpdated` | `de.innogames.onyx.techtree.controller.UpdateTechSectionCommand` | `de.innogames.onyx.techtree.events.TechTreeSectionEvent` |
| `TechTreeSectionEvent::newTechSection` | `de.innogames.onyx.techtree.view.windows.newsegment.NewTechSegmentCommand` | `de.innogames.onyx.techtree.events.TechTreeSectionEvent` |
| `TechnologyGateEvent/OPEN_GATE` | `de.innogames.onyx.techtree.controller.OpenTechnologyGateCommand` | `de.innogames.onyx.techtree.events.TechnologyGateEvent` |
| `de.innogames.onyx.techtree.controller.GrantResearchPointCommand/EVENT_TYPE` | `de.innogames.onyx.techtree.controller.GrantResearchPointCommand` | `de.innogames.onyx.techtree.controller.GrantResearchPointCommand_Event` |
| `de.innogames.onyx.techtree.controller.TechnologyShowCauldronRewardsCommand/EVENT_TYPE` | `de.innogames.onyx.techtree.controller.TechnologyShowCauldronRewardsCommand` | `de.innogames.onyx.techtree.controller.TechnologyShowCauldronRewardsCommand_Event` |

#### `de.innogames.onyx.techtree.controller.GrantResearchPointCommand` (L630519) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.techtree.controller.GrantResearchPointCommand/EVENT_TYPE` | `de.innogames.onyx.techtree.controller.GrantResearchPointCommand` | `de.innogames.onyx.techtree.controller.GrantResearchPointCommand_Event` |

#### `de.innogames.onyx.techtree.controller.TechnologyShowCauldronRewardsCommand` (L630845) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.techtree.controller.TechnologyShowCauldronRewardsCommand/EVENT_TYPE` | `de.innogames.onyx.techtree.controller.TechnologyShowCauldronRewardsCommand` | `de.innogames.onyx.techtree.controller.TechnologyShowCauldronRewardsCommand_Event` |

#### `de.innogames.onyx.tournaments.configs.TournamentsControllerConfig` (L637930) - 11 mappings

| Event type | Command | Event class |
|---|---|---|
| `SeasonalEventsEvent::ended` | `de.innogames.onyx.tournaments.commands.TournamentEndedWorldMapCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsEvent` |
| `ProvinceEncountersEvent::updateProvince` | `de.innogames.onyx.tournaments.commands.UpdateTournamentProvinceEncountersCommand` | `de.innogames.onyx.province.events.ProvinceEncountersEvent` |
| `TournamentProvinceEvent::INSTANT_UPGRADE` | `de.innogames.onyx.tournaments.commands.InstantUpgradeTournamentProvinceCommand` | `de.innogames.onyx.tournaments.events.TournamentProvinceEvent` |
| `TournamentProvinceEvent::RESET_PROVINCE` | `de.innogames.onyx.tournaments.commands.ResetTournamentProvinceCommand` | `de.innogames.onyx.tournaments.events.TournamentProvinceEvent` |
| `TournamentProvinceEvent::OPEN_PROVINCE` | `de.innogames.onyx.tournaments.commands.OpenProvinceFromTournamentOverviewCommand` | `de.innogames.onyx.tournaments.events.TournamentProvinceEvent` |
| `GetProvincesOverviewEvent::getData` | `de.innogames.onyx.tournaments.commands.GetProvincesOverviewCommand` | `de.innogames.onyx.tournaments.events.GetProvincesOverviewEvent` |
| `ProvinceEncountersEvent::startEncounter` | `de.innogames.onyx.tournaments.commands.StartTournamentEncounterCommand` | `de.innogames.onyx.province.events.ProvinceEncountersEvent` |
| `TournamentOverviewEvent::openTournament` | `de.innogames.onyx.tournaments.commands.OpenTournamentOverviewCommand` | `de.innogames.onyx.tournaments.events.TournamentOverviewEvent` |
| `TournamentOverviewEvent::openTournamentProvinces` | `de.innogames.onyx.tournaments.commands.OpenTournamentProvincesOverviewCommand` | `de.innogames.onyx.tournaments.events.TournamentOverviewEvent` |
| `TournamentOverviewEvent::reopenOverviewAfterEncounter` | `de.innogames.onyx.tournaments.commands.ReopenOverviewAfterEncounterCommand` | `de.innogames.onyx.tournaments.events.TournamentOverviewEvent` |
| `SpendArchivePointsEvent::spend` | `de.innogames.onyx.tournaments.commands.UnlockNextChestWithArchivePointsCommand` | `de.innogames.onyx.archive.events.SpendArchivePointsEvent` |

#### `de.innogames.onyx.tournaments.configs.TournamentsControllerConfiguration` (L637951) - 5 mappings

| Event type | Command | Event class |
|---|---|---|
| `SeasonalEventsModelEvent::serverDataReceived` | `de.innogames.onyx.tournaments.commands.UpdateTournamentCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsModelEvent` |
| `SeasonalEventsEvent::ended` | `de.innogames.onyx.tournaments.commands.TournamentEndedCommand` | `de.innogames.onyx.seasonalevents.events.SeasonalEventsEvent` |
| `UpdatedTournamentPointsEvent::update` | `de.innogames.onyx.tournaments.commands.UpdateTournamentPointsCommand` | `de.innogames.onyx.tournaments.events.UpdatedTournamentPointsEvent` |
| `TournamentsModelUpdateEvent::update` | `de.innogames.onyx.tournaments.commands.UpdateTournamentsModelCommand` | `de.innogames.onyx.tournaments.events.UpdatedTournamentsModelEvent` |
| `TournamentRewardEvent::showRewards` | `de.innogames.onyx.tournaments.commands.ShowTournamentRewardsCommand` | `de.innogames.onyx.tournaments.events.TournamentRewardEvent` |

#### `de.innogames.onyx.valuemanipulation.configs.ValueManipulationControllerConfiguration` (L641999) - 1 mapping

| Event type | Command | Event class |
|---|---|---|
| `ValueManipulationEvent::handle` | `de.innogames.onyx.valuemanipulation.commands.HandleValueManipulationCommand` | `de.innogames.onyx.valuemanipulation.events.ValueManipulationEvent` |

#### `de.innogames.onyx.videoads.commands.ConfirmVideoAdWatchingCommand` (L642628) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.videoads.commands.ConfirmVideoAdWatchingCommand/EVENT_TYPE` | `de.innogames.onyx.videoads.commands.ConfirmVideoAdWatchingCommand` | `de.innogames.onyx.videoads.commands.ConfirmVideoAdWatchingCommand_Event` |

#### `de.innogames.onyx.videoads.commands.ShowVideoAdAlertCommand` (L642665) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.videoads.commands.ShowVideoAdAlertCommand/EVENT_TYPE` | `de.innogames.onyx.videoads.commands.ShowVideoAdAlertCommand` | `de.innogames.onyx.videoads.commands.ShowVideoAdAlertCommand_Event` |

#### `de.innogames.onyx.videoads.commands.ShowVideoAdRewardsCommand` (L642765) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.videoads.commands.ShowVideoAdRewardsCommand/EVENT_TYPE` | `de.innogames.onyx.videoads.commands.ShowVideoAdRewardsCommand` | `de.innogames.onyx.videoads.commands.ShowVideoAdRewardsCommand_Event` |

#### `de.innogames.onyx.videoads.configs.VideoAdsControllerConfig` (L642820) - 3 mappings

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.onyx.videoads.commands.ShowVideoAdRewardsCommand/EVENT_TYPE` | `de.innogames.onyx.videoads.commands.ShowVideoAdRewardsCommand` | `de.innogames.onyx.videoads.commands.ShowVideoAdRewardsCommand_Event` |
| `de.innogames.onyx.videoads.commands.ShowVideoAdAlertCommand/EVENT_TYPE` | `de.innogames.onyx.videoads.commands.ShowVideoAdAlertCommand` | `de.innogames.onyx.videoads.commands.ShowVideoAdAlertCommand_Event` |
| `de.innogames.onyx.videoads.commands.ConfirmVideoAdWatchingCommand/EVENT_TYPE` | `de.innogames.onyx.videoads.commands.ConfirmVideoAdWatchingCommand` | `de.innogames.onyx.videoads.commands.ConfirmVideoAdWatchingCommand_Event` |

#### `de.innogames.strategycity.main.controller.UpdateFeaturesCommand` (L659883) - 1 mapping *(EzCommand static `map()`)*

| Event type | Command | Event class |
|---|---|---|
| `de.innogames.strategycity.main.controller.UpdateFeaturesCommand/EVENT_TYPE` | `de.innogames.strategycity.main.controller.UpdateFeaturesCommand` | `de.innogames.strategycity.main.controller.UpdateFeaturesCommand_Event` |

---

## 9. Recipes

All of these assume the extension's globals are present: `window.aviad` = `$hxClasses`,
`window.aviad_enum` = `$hxEnums`, `window.aviad_am` = the `ApplicationModel` singleton
(see `src/inject/injectMutate.ts`). Without the extension, the same objects are reachable
only through a captured `ApplicationModel` or `Context`.

Handy prelude:

```js
const C    = window.aviad;                 // $hxClasses
const E    = window.aviad_enum;            // $hxEnums
const inj  = window.aviad_am.injector;     // the app-wide RobotlegsInjector
const disp = inj.getInstance(C['openfl.events.IEventDispatcher']);  // the global dispatcher
```

### (a) Run any Command with an event

```js
function runCommand(cmdName, evtName, ...evtArgs) {
  const cmd = inj.getOrCreateNewInstance(C[cmdName]);   // constructs + injects + postConstruct
  if (evtName) cmd.event = new C[evtName](...evtArgs);  // the field the framework would inject
  return cmd.execute();
}

// visit another player's city
runCommand('de.innogames.onyx.city.commands.VisitOtherPlayerCommand',
           'de.innogames.strategycity.main.controller.event.OtherPlayerEvent',
           'OtherPlayerEvent::visitPlayer', playerId);

// open an Ancient Wonder window in the visited city
const lt = E['de.innogames.onyx.shared.events.LoadType'].LOAD_ONLY(buildingId, baseName);
runCommand('de.innogames.onyx.city.ancientwonders.commands.DisplayAncientWonderCommand',
           'de.innogames.onyx.shared.events.AncientWondersDataEvent',
           'displayAncientWonder', playerId, lt, 'window_0');
```

Caveats:

- Use the **exact event type string** the command expects; several commands branch on it.
- For an **EzCommand** (event type ends in `/EVENT_TYPE`) set `cmd._event`, not `cmd.event`,
  and build the event with the command class's own static factory:
  `cmd._event = C[cmdName].event(...args)`.
- Guards and hooks declared in the mapping are **skipped** on this path. If you want them,
  dispatch the event instead (recipe (c)).
- Commands that `detain()` themselves keep a reference in the context until they `release()`;
  if the service call fails in a way the command does not handle, the object leaks. Harmless
  in practice.
- `execute()` on an `AsyncCommand` subclass returns an `IOperation`; add
  `cmd.addCompleteListener(fn)` / `cmd.addErrorListener(fn)` **before** calling `execute()`.

### (b) Get any singleton (model / service / manager) from the injector

```js
const get = name => inj.getInstance(C[name]);

get('de.innogames.onyx.city.model.ApplicationModel');                       // === window.aviad_am
get('de.innogames.onyx.shared.windows.managements.IWindowsManager');
get('de.innogames.onyx.city.engine.camera.ICityCameraController');          // === window.aviad2
get('openfl.events.IEventDispatcher');                                     // global dispatcher
get('robotlegs.bender.framework.api.IContext');                            // the Context itself
get('robotlegs.bender.framework.api.IInjector');                           // the injector itself
get('robotlegs.bender.extensions.eventCommandMap.api.IEventCommandMap');   // add your own mappings
get('robotlegs.bender.extensions.mediatorMap.api.IMediatorMap');
```

Rules of thumb:

- **`getInstance` throws `InjectorMissingMappingError` if the type is not mapped.** Probe
  first with `inj.hasMapping(C[name])` or `inj.satisfies(C[name])`, or use
  `inj.getOrCreateNewInstance(C[name])` which falls back to constructing a fresh instance.
- Mapped keys are usually the **interface** (`IWindowsManager`, `IFxManager`,
  `ICityCameraController`), not the implementation. If `getInstance(Impl)` fails, look for the
  `I…` sibling in `classes.tsv`.
- Services (`de.innogames.onyx.**.services.*Service`) are mostly mapped as singletons too,
  but the extension usually just does `new C['…Service']()` and calls `request(...)` directly
  - see `04-networking-layer.md`.
- Anything **not** mapped (mediators, views, commands) cannot be fetched; use the constructor
  patch (§6.3) or `getOrCreateNewInstance` for a fresh throwaway.
- Sub-module singletons (world map, spire, battle) live in **child injectors** and are *not*
  visible from `am.injector` (lookup only walks *up*). Capture those via a ctor patch or via
  an object that already holds the child injector.

### (c) Dispatch a global event

```js
const Ev = C['de.innogames.onyx.city.shortcuts.ShortcutEvent'];
disp.dispatchEvent(new Ev('ShortcutEvent::openTechTree'));
```

This runs every command mapped to that type, **with** guards and hooks, and reaches
sub-modules for the event types listed in `MainModuleCommunicationConfig` (L523730).
Look up the type string in the table in §8.1.

To listen:

```js
disp.addEventListener('WindowEvent::addWindow', e => console.log(e.window));
disp.addEventListener('BootstrapEvent/FINISHED', () => console.log('game ready'));
disp.addEventListener('ModuleChangeEvent::changeModule', e => console.log('module', e));
```

Remember `Command.dispatch` / `Mediator.dispatch` / `BaseActor.dispatch` check
`hasEventListener` first - registering a listener for a type is enough to make the game start
producing it internally where it previously short-circuited (this only affects *their* guard,
not correctness).

### (d) Open (and close) a window

Preferred - use the feature's own event, so the models load too:

```js
const S = C['de.innogames.onyx.city.shortcuts.ShortcutEvent'];
disp.dispatchEvent(new S('ShortcutEvent::openInventory'));      // OpenInventoryCommand
disp.dispatchEvent(new S('ShortcutEvent::openAncientWonders')); // OpenAncientWondersCommand
disp.dispatchEvent(new S('ShortcutEvent::openTrader'));         // OpenTraderCommand
disp.dispatchEvent(new S('ShortcutEvent::openMagicAcademy'));   // OpenMagicAcademyWindowCommand
disp.dispatchEvent(new S('ShortcutEvent::openSpire'));          // EnterSpireCommand
```

(full list: `ShortcutsConfig`, L389998 - 16 shortcuts.)

Manual - build a window from a factory and hand it to the manager:

```js
const WindowEvent = C['de.innogames.onyx.shared.ui.events.WindowEvent'];
const factory = inj.getInstance(C['de.innogames.onyx.city.ancientwonders.views.factories.IAncientWondersWindowFactory']);
const win = factory.createFriendBuildingWindow(entityConfigId, 'window_0');
disp.dispatchEvent(new WindowEvent('WindowEvent::addWindow', win));
```

Closing:

```js
const wm = inj.getInstance(C['de.innogames.onyx.shared.windows.managements.IWindowsManager']);
wm.closeWindowWithId('window_0');   // by the id you set
wm.closeGroupWindows('common');     // by group (BaseWindow default group)
wm.closeAllWindows();               // no-op while a non-closable window is open
console.log(wm.get_numOpenWindows(), wm.hasOpenWindows(), wm.hasBlockingWindows());

// or from the window itself
win.close();                        // dispatches WindowEvent::closeWindow, manager unregisters
```

Await a close:

```js
wm.whenClosedWindow('window_0');    // tink.core.Future
```

Bypassing the event entirely (`wm.addWindow(win)`) works but skips
`WindowsViewContainerMediator._showWindow`, so the queueing, the tooltip-hide and the
iso-engine drag lock do not happen. Prefer the event.

---

## Open questions / not verified

- **Not verified at runtime.** Everything here is read from the Feb 12 2026 bundle; none of
  the recipes were executed against the live client in this pass. Line numbers are for
  `tmp/elvenar-release-full-reveng.js` only.
- The `Event class` column in §8.1 is **inferred**, not authoritative: it is derived from
  static `TYPE = "..."` constants, `openfl_events_Event.call(this,"...")` in event
  constructors and `new XxxEvent("...")` call sites. Where several classes carry the same
  string all are listed; a blank cell means no literal producer was found (the type is built
  dynamically, or comes from a constant I did not match).
- `commandMap.map(type, eventClass)` has a two-argument form that narrows the mapping to a
  specific event class. Every call site in this bundle uses the one-argument form, so the
  narrowing path in `EventCommandTrigger.eventHandler` (`this._eventClass != null`) appears
  to be dead code here - not proven exhaustively.
- The exact set of injected fields per class cannot be enumerated at runtime (macro-generated
  `TypeDescription`s are opaque function arrays). The "injected fields" lists in §4.5/§4.6 are
  read off the prototype's `null` fields and may include non-injected state.
- `MainModuleHelper` (L8189) is an empty stub in the JS target (`init`, `sendKillSignal`,
  `closeLC` all no-ops) - it was the AIR/Flash LocalConnection helper. Nothing to hook.
- I did not trace `ModuleLoaderService` (mapped in `MainModuleConfiguration`, L389947) or how
  sub-module SWF/JS bundles are loaded and their child contexts created - that belongs with
  the runtime-shape / package-map document.
- `StartupService.getData` and `PostStartupService` payloads are only referenced here;
  the shapes belong to `10-models-startup-data.md` and `04-networking-layer.md`.
- Whether a window id must be unique is unverified. `closeWindowWithId` closes *every* window
  whose id matches, so reusing `'window_0'` for two windows would close both.
- The 100 owner classes in §8.1 were attributed by tracking the most recent
  `var X = function` / `X.prototype =` / `X.f = function` declaration above each mapping line.
  Spot checks were correct, but a mapping emitted inside an unusual closure could be
  mis-attributed.
