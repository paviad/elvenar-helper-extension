# 12 — Models, VOs and startup data: what the client keeps in memory and how to read it

Scope. This file documents the *state* layer of the compiled Elvenar client: the ~236 `*Model`
classes (where they live, how they are registered in the robotlegs injector, how they get filled),
the ~531 `*VO` value objects that carry server JSON, the `StartupService.getData` response and the
parsers that spread it over the models, the BigInt resource representation, server time, static
(balancing) data, and — most importantly — how injected extension code obtains a model instance and
reads it. It draws on `de.innogames.onyx.city.model.*`, `de.innogames.strategycity.main.model.*`,
`de.innogames.onyx.resources.*`, `de.innogames.onyx.shared.*.models`, `de.innogames.onyx.networking.vos.*`,
`de.innogames.shared.util.parsers.*`, `de.innogames.onyx.city.controller.bootstrap.parsers.*`,
`org.swiftsuspenders.*` and `robotlegs.bender.*`. Snapshot: `tmp/elvenar-release-full-reveng.js`
(Feb 12 2026); all `(L…)` numbers refer to it. Bootstrap/DI mechanics in general are in
`02-bootstrap-di-commands-events.md`; the network layer in `04-networking-layer.md`; per-feature
detail (worldmap/tournaments 07, spire 08, city engine 09, social/AW/spells 10, events/economy 11)
is only pointed at from here.

---

## 1. The model layer in one page

| Aspect | What the client does | Where |
|---|---|---|
| Base class | Most models extend `de.innogames.onyx.mvcs.BaseActor` (L8798): one injected field `eventDispatcher` and `dispatch(event)`. Some extend `de.innogames.onyx.mvcs.Actor` (L14236). A few are plain classes (`CultureModel`, `PopulationModel`, `EffectsModel`… implement `de.innogames.common.utils.ILocalInjector` and take the injector in the ctor). Static "models" (`FeatureModel`, `ResourceSetsModel`, `DynamicResourcesModel`, `NewAwEffectsModel`) are pure static classes — no instance needed. | `de.innogames.onyx.mvcs.BaseActor` (L8798) |
| Registration | Every model is mapped on a robotlegs/swiftsuspenders injector, almost always as a singleton: `injector.map(IFoo).toSingleton(Foo)` (interface → impl) or `injector.map(Foo).asSingleton()` (no interface). Second arg `true` = "initialize immediately". Singletons are created lazily on first `getInstance` and then cached by `org.swiftsuspenders.dependencyproviders.SingletonProvider.apply` (L737986). | `org.swiftsuspenders.mapping.InjectionMapping.asSingleton/toSingleton` (L738138 / L738149) |
| Mapping id | `<FQ class name of the KEY>|<name or "">` — `api_MappingName.makeId` (L89333) + `api_ClassName.ofClassRef` (L89312) which is just `c.__name__`. So the *interface* is the key when `toSingleton(Impl)` is used: `getInstance(UserModel)` throws `InjectorMissingMappingError`, `getInstance(IUserModel)` returns the `UserModel` singleton. | `org.swiftsuspenders.Injector.getInstance` (L737720) |
| Injection | Injected fields are `null` on the prototype and filled by generated code in the giant `org_swiftsuspenders_reflection_MacroReflector.factories = { 'fq.Class' : function(description){ … target.x = injector.getInstanceForMapping("Key|", Key, null); … } }` table starting at L760820 (2 197 entries). `postConstruct()` runs after injection. **This table is the authoritative "which model does class X hold in which field" index** — grep `'<FQ name>' : function` in it. | `org.swiftsuspenders.reflection.MacroReflector` (L8728), factories L760820 … ~L780000 |
| Contexts | One MAIN context (`de.innogames.onyx.city.configs.MainModuleConfiguration` L389942 + the long `configure(...)` chain in `de.innogames.onyx.city.configs.FeaturesConfiguration` L389937 + `de.innogames.onyx.city.controller.bootstrap.ConfigureModelCommand` L390605, `ConfigureServicesCommand` L390836, `ResourceModelConfig` L543216, `SpireConfiguration`/`SpireModelsConfig` L617018/617044, `TournamentsModelConfiguration` L637983 …). Sub-modules (`WorldMapModule` L86250, `SpireModule` L8454, `TechTreeModule` L8700, `BattleModule` L6831, `MultiplayerModule` L8154; all `de.innogames.shared.mvcs.AbstractModule` L6794) each `start()` a **child** context whose injector's parent is the main injector (`ModuleLoaderService._finishLoading` → `context.addChild(module.get_context())` L63029). Child sees main mappings; main does NOT see child mappings. | `de.innogames.strategycity.main.service.ModuleLoaderService` (L63029) |
| Population | (a) `StartupService.getData` → `StartupVO` → 22 `IStartupParser`s (section 3); (b) static balancing JSON files → `Load*Command`s (section 8); (c) push responses registered by services via `addSafePushResponse(Response, cb)` (see `rev-eng/index/services-raw.md` "push listeners" lines and `04-networking-layer.md`); (d) commands executed on events. | sections 3, 4, 8 |
| Time | No server-time offset is kept. Everything time-based arrives as *remaining seconds* and is counted down once per second by `onTick` handlers scheduled on `de.innogames.shared.util.clock.GameClock` (L658890). | section 7 |
| Numbers | Resource amounts are native JS `bigint`, wrapped as `de.innogames.collections.resources.Resource {id, _value}` (L137582) inside `ResourceCollection` (L137418). The Haxe abstract `de.innogames.onyx.shared.data.BigInt` (L549562) is a thin layer over `BigInt`. | section 6 |

### 1.1 Getting a model from injected code (the working call)

The extension already captures the `ApplicationModel` singleton as `window.aviad_am`
(`src/inject/injectMutate.ts` L237, `patchCtorRegistryAssignment(..., 'de.innogames.onyx.city.model.ApplicationModel', 'aviad_am')`)
and uses `window.aviad_am.injector.getOrCreateNewInstance(ctor)` for commands
(`src/inject/local/localVisitPlayer.ts`, `src/inject/local/localOpenAw.ts`). `ApplicationModel.injector`
(L10650, injected `robotlegs.bender.framework.api.IInjector`) is the **main-context**
`robotlegs.bender.framework.impl.RobotlegsInjector` (L742640, subclass of `org.swiftsuspenders.Injector` L737598).

```js
const inj = window.aviad_am.injector;                       // main-context injector
const C   = name => window.aviad[name];                     // $hxClasses lookup (injectMutate.ts hookRegistry 'aviad')

// singletons mapped under an INTERFACE → ask for the interface
const user = inj.getInstance(C('de.innogames.onyx.shared.models.IUserModel'));            // UserModel
const ents = inj.getInstance(C('de.innogames.strategycity.main.model.ICityEntitiesModel')); // CityEntitiesModel
// singletons mapped under their own class → ask for the class
const res  = inj.getInstance(C('de.innogames.onyx.resources.models.ResourcesModel'));      // CachedResourcesModel
inj.getInstance(C('de.innogames.onyx.city.model.ApplicationModel')) === window.aviad_am;    // true

// probing / listing
inj.hasMapping(C('de.innogames.onyx.techtree.model.ITechnologyModel'));   // false on the main injector (tech-tree module only)
Object.keys(inj.providerMappings.h);                                      // every mapping id "fq.Name|" known to this injector
inj.getOrCreateNewInstance(C('some.Command'));                            // getInstance if mapped, else instantiateUnmapped (injects fields)
```

Verified against `org.swiftsuspenders.Injector.getInstance(type,name,targetType)` (L737720):
`name` may be omitted (`makeId` turns `null` into `""`), it walks `parentInjector` chains
(`getProvider` L737820), and throws `org.swiftsuspenders.errors.InjectorMissingMappingError` (L738089)
when nothing matches. `hasMapping(type,name)` (L737812) is the safe probe. `injector.providerMappings`
(a `haxe_ds_StringMap`, ctor L737587) holds every direct mapping of that injector.

Models that live only in a **sub-module context** (world map, spire *module*, tech tree, battle —
see the "ctx" column in the catalog) are reached through the currently loaded module:

```js
const mls = inj.getInstance(C('de.innogames.strategycity.main.service.ModuleLoaderService'));
const modInj = mls._module && mls._module.get_context().get_injector();   // null when in own city
modInj && modInj.getInstance(C('de.innogames.onyx.worldmap.model.IWorldMapModel'));
```
(`ModuleLoaderService` L63029 is `asSingleton()` in `MainModuleConfiguration` L389951; `_module` is the
single active `AbstractModule`; ids "TechTree","WorldMap","Battle","Multiplayer","Spire".) The other
route the extension already uses is capturing a mediator/instance constructor with
`patchCtorRegistryAssignment` (`aviad_wm`, `aviad_se`, `aviad_tv`, `aviad_silm`) and reading its
injected model fields — see recipe 8.

Reading Haxe data from JS: `haxe_ds_StringMap`/`IntMap`/`openfl Dictionary` store in `.h`
(`Object.keys(m.h)`, `m.h[key]`); `openfl._Vector.ObjectVector` (L707588) has `.__array`, `get_length()`,
`get(i)`, `toArray()`; tink `State`/`Observable` values are read with `.getValue()`
(`tink_state_State.get_value` L550720 just calls `this1.getValue()`); properties compile to `get_x()`;
`Object.getPrototypeOf(o).__class__.__name__` gives an instance's FQ class name.

---

## 2. Injector mapping sites (main context unless noted)

Extracted with `grep -n "toSingleton(\|asSingleton(" … | grep -i model` (530 mapping lines total, ~150 models).
"Key" is what to pass to `getInstance`.

| Config class (L) | Key → implementation |
|---|---|
| `de.innogames.onyx.city.configs.MainModuleConfiguration.configure` (L389948) | `ApplicationModel`, `BasicValuesModel` (asSingleton); `ModuleLoaderService` |
| `de.innogames.onyx.city.controller.bootstrap.ConfigureModelCommand._mapActors` (L390692–390758) | `IUserModel`→`UserModel`, `ISettingsModel`→`SettingsModel`, `IFriendDataModel`→`FriendDataModel`, `PremiumConstantsModel`, `KnowledgePointPackageModel`, `IWeightedRewardsModel`→`WeightedRewardsModel`, `IStageConfigurationsModel`→`StageConfigurationsModel`, `ProxyEffectConfigsModel`, `IRelicsModel`→`RelicsModel`, `ICityEntityConfigsModel`→`CityEntityConfigsModel`, `IOtherCityEntityProxyModel`/`IOwnCityEntityProxyModel`, `EffectConfigsModel`, `EffectConfigTooltipsModel`, `ICityEntitiesModel`→`CityEntitiesModel`, `IFriendCityEntitiesModel`→`FriendCityEntitiesModel`, `PlayerEffectsModel`, `FriendEffectsModel`, `BoostsModel`, `IKnowledgePointsModel`→`KnowledgePointsModel`, `PopulationModel`, `CultureModel`, `NeighborlyHelpersModel`, `IExpansionModel`→`ExpansionModel`, `IPremiumConstantsModel`, `IEntityCategoriesModel`→`EntityCategoriesModel`, `IRankingOverviewModel`, `IRankingModel`→`RankingModel`, `INotificationModel`→`NotificationModel`, `RunningActivitiesModel`, `IInventoryCityBuildingsModel`, `ITechnologyConfigsModel`→`TechnologyConfigsModel`, `IWaypointPositionModel`, `IUnitsTrainingModel`→`UnitsTrainingModel`, `vo.UnitsModel`, `IUnitsAbilitiesModel`, `ArmyModel`, `IArmyDeploymentModel`, `IBattleDetailsModel`, `IOfferModel`→`OfferModel` |
| `ConfigureSoundsCommand` (L390914) / `ConfigureLoggerCommand` (L391908) | `ISoundsSettingsModel`, `ILoggingModel` |
| `de.innogames.onyx.resources.config.ResourceModelConfig` (L543222) | `ResourcesModel`→**`CachedResourcesModel`**, `ISentientGoodsModel`, `IAscendedGoodsModel`, `IProvisionModel` |
| `ChestModelConfiguration` L370478, `AncientWondersModelConfiguration` L373457, `BuildingSetsModelConfiguration` L382627, `ChallengeEventsModelConfiguration` L383943, `ChatModelConfiguration` L385331, `CRMModelConfiguration` L394317, `CurrencyEventsModelConfiguration` L395480, `InGameShopModelConfiguration` L412501, `ClientInventoryModelConfiguration` L414581, `EventLeague/RoyalPass/SeasonPass/MergeEvent…` L423393–443417, `QueuedProductionModelConfiguration` L458451, `SpellsModelConfiguration` L460146, `TradeModelConfiguration` L461597, `TreasureModelConfig` L469416, `CauldronModelConfiguration` L480751, `CraftingConfiguration` L488353, `EventIntroModelConfiguration` L513836, `HelpModelConfiguration` L517429, `MultiplayerModelsConfig` L519502, `SeasonalEventsModelConfiguration` L544493, `ArchiveConfiguration` L549322, `ResourceDecayConfiguration` L549360, `GuildModelConfiguration` L553996, `IndicatorsModelConfiguration` L562821, `KeyDialogModelConfiguration` L563324, `MessagingModelConfiguration` L564045, `PortraitModelConfiguration` L567910, `QuestModelConfiguration` L569075, `RewardsModelConfiguration` L575530, `ConfigureStreetsCommand` L580912, `TrophiesConfiguration` L582912, `NewsConfiguration` L611303, `SpireModelsConfig` L617050 (SpireModel & co. — main!), `TournamentsModelConfiguration` L637983 (`ITournamentsModel` — main), `ValueManipulationModelConfiguration` L642016 | `IChestsModel`, `IAncientWondersModel`/`IFriendAncientWondersModel`/`OtherPlayerAncientWonderModel`/`SpireAncientWonderModel`, `IBuildingSetsModel`, `ChallengeEventsModel`, `IChatModel`, `CRMModel`, `ICurrencyEventsModel`, `InGameShopModel`, `InventoryModel`+`IInventoryItemConfigModel`, main-event models, `IProductionQueueModel`, `ISpellsModel`, `ITradesModel`/`IMerchantModel`, `TreasureViewModel`, `PotionEffectsModel`, `CraftingModel`, `IEventIntroDataModel`, `IHelpDataModel`, `IMultiplayerModel`, `ISeasonalEventsModel`+`StaticDataModel`, `SpireArchiveModel`, `IResourceDecayModel`, `IGuildModel`/`IPerkModel`/`IGuildProgressionModel`, `IIndicatorsModel`, `KeyDialogModel`, `IMessageModel`, `IPortraitModel`, `IQuestModel`/`QuestMilestonesModel`/`IQuestGiverNamesModel`, `IPendingRewardsModel`/`IEpisodicRewardsModel`/`IFlexibleRewardsModel`/`RewardSelectionKitsModel`, `IStreetInhabitantsModel`/`IStreetConnectionsModel`, `ITrophiesModel`, `NewsModel`, `MysteryChestPointsModel`/`SpireMapPointsModel`/`SpireMapLevelsModel`/`SpireWaypointsModel`/`SpireCrystalsModel`/`SpireItemsModel`/`SpireModel`/`SpireStateModel`, `TournamentEncounterModel`/`ITournamentsModel`/`ITournamentCheckpointsProvider`, `IValueManipulationModel` |
| **WorldMap module**: `de.innogames.onyx.configs.WorldMapModelsConfig` (L512408) + `de.innogames.onyx.tournaments.configs.TournamentsModelConfig` (L637966) | `IWorldMapModel`→`WorldMapModel`, `IScoutingModel`, `IEncounterModel`, `ProvinceDifficultiesModel`, `WorldMapSettingsModel`, `IProvinceFinder`; `ITournamentOverviewModel`, `AbstractArchiveModel`→`TournamentArchiveModel`, **and a second `ITournamentsModel`→`TournamentsModel` instance shadowing the main one** |
| **Spire module**: `SpireModuleModelsConfig` (L619660) | `SpireRankingModel`, `SpireBenefitsModel`, helpers |
| **TechTree module**: `TechTreeModelsConfig` (L630429) | `ITechnologyModel`→`TechnologyModel`, `FocusMarkerModel`, `ITechnologySectionModel`, factories |
| **Battle module**: `BattleModelsConfig` (L359366) | `BattleModel`, `IBattleUnitsModel`, `IBattlePlaybackModel`, … |

---

## 3. Startup data: `StartupService.getData` → `StartupVO` → parsers → models

`de.innogames.onyx.networking.services.StartupService` (L17108, serviceName `"StartupService"`):
`getData()` = `this.request("getData").withData([]).callWithFuture()`; also `getCrmData()`.
`de.innogames.onyx.city.controller.bootstrap.ConfigureStartupDataCommand.execute` (L390930) calls it,
then `injector.instantiateUnmapped(StartupParser).parse(data, done)`.
`de.innogames.onyx.city.controller.bootstrap.parsers.StartupParser` (L392803) builds 22 parsers in
`construct()`, injects each, and runs them in order in ≤20 ms slices from `GameClock` (`onTick`).
The response is parsed into `de.innogames.onyx.networking.vos.StartupVO` (L539261, alias `"StartupVO"`).

Top-level keys of the startup JSON, in parser order, and where each lands:

| StartupVO field | JSON → VO type | Parser (L) | Model / call |
|---|---|---|---|
| `featureFlags[]` (`.feature`), `features.unlocked[]`, `featureTechnologies[]` (`featureId`,`techId`) | `FeatureFlagVO[]`, `FeaturesVO` (L530121), `FeatureTechnologyVO[]` | `FeaturesParser` L392629 | static `FeatureModel.enable/unlock/linkTechnology`, then `markParsingComplete()` |
| `user_data`, `privacyVO`, `guild`, `settings` | `CityUserDataVO` L528048 (`player_id, user_name, city_name, race, portrait_id, profile_text, rank, playerType(enum), technologySection:TechnologySectionVO, guild_info:GuildInfoVO`), `PrivacyVO` L534880, `GuildVO` L531298, `SettingsVO` L537361 | `UserDataParser` L392968 | `UserModel.loadData(user_data)`, `setPrivacyData`; `GuildModel.set_userGuild(new Guild(guild))` + `ChatModel.addParticipant` per member; `SettingsModel.update(settings)`; sound flags |
| `runningBattle`, `runningScout`, `runningDiplomacy` | `RunningBattleVO`… | `RunningActivitiesParser` L392751 | `RunningActivitiesModel.set_running*` |
| `effects[]` (+ static effect configs) | `EffectVO[]` L529385 (`actionId, confId, level, owner, ownerId, permanent, remainingTime, stage, type`) | `EffectsParser` L392592 | `EffectConfigsModel.init`, `ProxyEffectConfigsModel`, spells↔effectConfig link, `PlayerEffectsModel.startupUpdate(startup)` |
| `ancient_wonder_phases[]` | `AbstractPhaseVO[]` (mostly `ResearchPhaseVO` L536059: `entityBaseName, playerId, resourceId, isFavourite, requiredKnowledgePoints, investedKnowledgePoints, receiverKpLimit, contributions[]`) | `AncientWondersParser` L392432 | `AncientWondersModel.addPhases` |
| `production_boost[]`, `relic_boost_good[]`, `player_relics[]` | `ProductionBoostVO[]`, `RelicBoostGoodVO[]`, `RelicVO[]` L535922 (`relic_id, amount, boosts, chain, quality`) | `RelicsParser` L392702 | `RelicsModel.addProductionBoosts/addRelicBoostGoods/addRelic` |
| `mapSize` (`width`,`height`) | size VO | `MapDimensionParser` L392665 | `ApplicationModel.set_mapWidth/set_mapLength` |
| `resourceSets[]` | `ResourceSetVO[]` L536329 (`id, name, resourceIds[]`; sets `basic_resources`, `good_resources`, `provisions`, …) | `ResourceSetsParser` L392718 | static `ResourceSetsModel.initialize`, `ProvisionModel.init()` |
| `resources`, `resources_cap` | `CityResourceVO` L528002 (`resources: StringMap<id→number\|string>`, `bundles`, `strategy_points: StrategyPointsVO` L539507 `{baseSP,currentSP,maxSP,nextSpIn,producingTime}`) | `ResourcesParser` L392731 | `ResourceBuilder.init().withVO(startup.resources).containAllIds().build()` → `ResourcesModel.update`; `KnowledgePointsModel.update(strategy_points)`; caps → `ResourcesModel.updateCap`; `BuildingSetsModel.updateDynamicResources()` |
| `premium_prices[]` | `PremiumPriceVO[]` | `PremiumPricesParser` L392690 | `PremiumConstantsModel.init` |
| `unlocked_items[]` (`name`,`unlocked`), `city_map` | `UnlockItemVO[]`, `CityMapVO` L527945 (`entities: CityMapEntityVO[]`, `unlocked_areas: CityMapUnlockedAreaVO[]`) | `CityEntitiesParser` L392470 | `CityEntityConfigsModel.setUnlockedItems`, notification unlocks, stage products, queued-production mapping, **`CityEntitiesModel.initializePlayerMapConfiguration(city_map)`**, `EntityCategoriesModel.addConfigsToCategories` |
| `city_culture` | `CityCultureVO` L527166 (`currentCulture, currentCultureDemand, currentCultureLevel, currentProductionModifier, neededForCurrentLevel/NextLevel, cultureBonusLevels[], neighbourlyHelpCultureBonus, spellFactor`) | `CultureParser` L392568 | `CultureModel.updateCulture` |
| `city_population` | `CityPopulationVO` L527975 (`currentPopulation, currentPopulationDemand`) | `PopulationParser` L392678 | `PopulationModel.updatePopulation` |
| `knowledgePointPackages[]` | `PackageVO[]` L534218 (`id, cost, costIncreasePerPurchase, gain, gainMax`) | `KnowledgePointPackagesParser` L392653 | `KnowledgePointPackageModel.update` |
| `army_details` | `ArmyDetailsVO` L524899 (`unitSquads: UnitSquadVO[]{unitTypeId,size}`, `availableUnitTypeIds[]`, `baseClusterSize, battleClusterSize, trainingClusterSize, premiumTrainingCosts, max*Reference`) | `UnitsParser` L392949 | `ArmyModel.initializeArmyDetails`, `UnitsTrainingModel.initializeTrainingDetails`, unit product/origin updaters |
| `trade_fee_percentage`, `trade_ratios` | Int, `TradeRatiosVO` | `TradesParser` L392935 | `TradesModel.setTradeFee(…, OTHER_PLAYERS)`, trade-ratio formula |
| `seasonal_events[]` | `SeasonalEventVO[]` L537101 (`eventId, name, type, subType, state, remainingTime` + typed properties) | `SeasonalEventsParser` L392785 | dispatches `SeasonalEventsModelEvent::prepareEvents` → `SeasonalEventsModel` (see 11) |
| `idsOfUnavailableChests[]` | String[] | `ChestsParser` L392458 | `ChestsModel.updateUnavailableChests` |
| `decayTimer` | Int | `DecayTimerParser` L392580 | `ResourceDecayModel.set_remainingSeconds` |
| `season` | String | `SeasonParser` L392772 | `ApplicationModel.set_season` |
| `tournamentProvinceUnlockTime` | Int | `TournamentProvinceUnlockTimeParser` L392923 | `TournamentsModel.set_totalProvinceUnlockTime` |
| `cauldron`, `lastUsedGobletResult` | `CauldronVO`… | `CauldronParser` L392444 | `CauldronController.init` (only if feature `cauldron` unlocked) |
| `craftingSettings` | VO | (read by crafting bootstrap, not by StartupParser) | — |

Everything not in the startup blob (quests, inventory, messages, notifications, tech tree, offers,
trades, AW details, spire, tournament progress …) arrives afterwards: `PostStartupService.getPostStartupData`
(`de.innogames.strategycity.main.service.PostStartupService` L44713, request `"getPostStartupData"`, no
callback — the server answers with a batch of *push* responses that the services' `addSafePushResponse`
listeners route into models; triggered by `GetPostStartupDataCommand` L659685), plus module bootstraps
(`de.innogames.onyx.techtree.controller.bootstrap.ConfigureTechTreeDataCommand` L630987 → `TechnologyModel.init`,
`de.innogames.onyx.worldmap.bootstrap.LoadWorldMapStartupDataCommand` L644223 → `WorldMapService.startup`
(`WorldMapStartUpVO` L542191), `de.innogames.onyx.spire.controller.bootstrap.ConfigureStartupDataCommand` L617369).

---

## 4. Catalog of the important models

Legend — **ctx**: M = main context (reachable from `window.aviad_am.injector`), W/S/T/B = WorldMap /
Spire / TechTree / Battle module context (see 1.1), static = static class (call on
`window.aviad['…']` directly). "Key" = what to pass to `getInstance`. Only the essential API is
listed; the full method list is one `sed -n` away at the given line.

### 4.1 Player / user / settings / features

| Model (L) | ctx / Key | Key fields & getters | Populated by | Read recipe |
|---|---|---|---|---|
| `de.innogames.strategycity.main.model.UserModel` (L661530) | M / `de.innogames.onyx.shared.models.IUserModel` (L10568) | `get_playerId()`, `get_playerName()`, `get_cityName()`, `get_race()` ("elves"/"humans"), `get_portraitId()`, `get_profile()`, `get_playerType()` (EnumIppTypeVO), `get_technologySection()` → `de.innogames.onyx.shared.data.TechnologySection` (L549883): `get_index()` (0-based chapter index), `get_name()`, `get_guestRaceId()`; `get_hasGuestRace()` (= index ≥ 6), `get_guildId()`, `_guildName`, `_guildBanner`, `get_ranking()`, `get_emailValidated()`, `get_worldMapPosition()`, `toPlayer()` → `Player` | `UserDataParser` (startup `user_data`, `privacyVO`); guild info updates | `inj.getInstance(C('de.innogames.onyx.shared.models.IUserModel')).get_playerId()` |
| `de.innogames.strategycity.main.model.SettingsModel` (L661167) | M / `…ISettingsModel` (L31095) | `get_zoomFactor()`, `get_battleQuality()`, `get_cityQuality()`, `get_showPremiumConfirmation()`, `get_showCityOverlays()`, `get_leaveSpireDiplomacyPopup()`, `get_alwaysUseParallelProductions()`, `get_notifications*()`, `update(SettingsVO)` | startup `settings` (`SettingsVO` L537361), settings service pushes | `…get_zoomFactor()` |
| `de.innogames.onyx.shared.features.FeatureModel` (L551121) | static | `isEnabled(id)`, `isUnlocked(id)`, `getState(id)`, `getLinkedTechnologyId(id)`, `get_unlocked()`, `whenUnlocked(id)` (tink Future) | `FeaturesParser` (startup `featureFlags`, `features.unlocked`, `featureTechnologies`); tech research unlocks | `window.aviad['de.innogames.onyx.shared.features.FeatureModel'].isUnlocked('spire')` |
| `de.innogames.onyx.city.model.ApplicationModel` (L10650) | M / itself (= `window.aviad_am`) | `get_isLoading()`, `gameLoaded` (tink State, `.getValue()`), `currentModule` (Observable of `de.innogames.onyx.constants.ApplicationModuleName` enum L512504: OTHER_CITY, OWN_CITY, TECH_TREE, WORLD_MAP, MULTIPLAYER, SPIRE, …), `get_interactionMode()`, `get_mapWidth()/get_mapLength()`, `get_season()`, `injector` | `MapDimensionParser`, `SeasonParser`, module state machine | `window.aviad_am.currentModule.getValue()._hx_name` |
| `de.innogames.strategycity.main.model.PremiumConstantsModel` (L661073) | M / itself or `IPremiumConstantsModel` (L35199) | `instantFinishConstruction/ManualProduction/SpellProduction/Crafting`, `instantSpireOpenGate`, `instantMerchantCooldown` (FormulaCost `get_base()/get_modifier()`), `get_instantTrainingBaseCost()`, `get_spireInflation()`, `get_tournamentPremiumBaseScouting()` | `PremiumPricesParser` (startup `premium_prices`) | — |
| `de.innogames.onyx.shared.clientBehavior.LoggingModel` (L549083) | M / `ILoggingModel` | user id/name for logs | `UserDataParser` | — |

### 4.2 Resources, KP, boosts

| Model (L) | ctx / Key | Key fields & getters | Populated by | Read recipe |
|---|---|---|---|---|
| `de.innogames.onyx.resources.models.ResourcesModel` (L10951) — actual instance is `CachedResourcesModel` (L543407) | M / `de.innogames.onyx.resources.models.ResourcesModel` | `getValueFor(id)` → `bigint`; `getCapValue(id)`, `getCapFor(id)`, `isCapped(id)`; `getResourceById(id)` → `Resource{id,_value}`; `getResourceValue(id)` → tink State (`.getValue()`); `_resources`/`_resourcesCap` (`ObservableResourceCollection`: `get_ids()`, `get_resources()` (cloned array of Resource), `getValues()`); `hasEnough(id, v)`, `hasEnoughResourcesFor(collection)`, `getMissingResourcesFor(coll)`; good configs: `getGoodConfiguration(id)` → `de.innogames.strategycity.main.model.vo.GoodConfiguration` (L663117: `get_id/get_name/get_type/get_chain/get_quality/get_ratio/get_isLimited`), `getNameForId(id)`, `_goodConfigs.h`; signals `get_updateResources()`/`get_updateResourceCap()` (`.listen(ids => …)`), plus events `ResourcesModelEvent::updateResources` on the context dispatcher (L11226) | `ResourcesParser` (startup `resources`, `resources_cap`); `de.innogames.onyx.resources.service.ResourcesService` (L42743, serviceName **CityResourcesService**) pushes `getResources` → `_onGetResources` (rebuilds full collection, diff applied), `updateResourceCaps`, `getPremium` (→ `setValueFor("premium", n)`), `updateResourceConfigs`; static `Goods` file → `addGoodConfiguration` | `res.getValueFor('money')`, `res.getValueFor('premium')`, `res.getValueFor('knowledge_points')`; ids: `money, supplies, population, culture, premium, knowledge_points, spell_fragments, mana, seeds, orcs, unurium, <good ids e.g. planks/marble/steel/…>, provisions`; sets via `ResourceSetsModel.getResourceIds('good_resources')` |
| `de.innogames.onyx.resources.models.ResourceSetsModel` (L416303) | static | `initialize(sets)`, `getResourceIds(setId)`, `get_goodIds()`, `get_ids()`, `getSet(id)`, `getSetName(id)` | `ResourceSetsParser` | `window.aviad['de.innogames.onyx.resources.models.ResourceSetsModel'].getResourceIds('basic_resources')` |
| `de.innogames.strategycity.main.model.KnowledgePointsModel` (L660699) | M / `IKnowledgePointsModel` (L45174) | `get_timeToNextKP()` (s, counted down by `onTick`), `get_isFull()`, `get_missingKnowledgePoints()`, `get_refillCap()`, `_generationTime` | `ResourcesParser`/`ResourcesService._onGetResources` with `strategy_points` (`StrategyPointsVO`) | `kp.get_timeToNextKP()`; the KP amount itself is `res.getValueFor('knowledge_points')` |
| `de.innogames.strategycity.main.model.KnowledgePointPackageModel` (L42803) | M / itself | KP-for-coins/goods packages (`PackageVO`) | `KnowledgePointPackagesParser`, `ResourcesService` push `buyResourcePackage` | — |
| `de.innogames.onyx.shared.boost.RelicsModel` (L547750) | M / `IRelicsModel` (L34864) | `get_relics()`, `getRelic(type)`, `get_productionBoosts()`, `isGoodBoosted(goodId, goodType)`, `getRelicBoostGoodsByType(t)`, `getCurrent/Next/PrevRelicsNeeded(good)` | `RelicsParser` (startup `player_relics`, `production_boost`, `relic_boost_good`) | boosted goods = `rm.get_productionBoosts()` |
| `de.innogames.onyx.shared.boost.BoostsModel` (L16760) | M / itself | `activeBoosts`, `getBoostValue(resourceId, category, entityId)`, `hasGlobalBoost(...)`, `getEntityProductionBoost(...)` | boost pushes | — |
| `de.innogames.onyx.resources.provisions.ProvisionModel` (L543674) / `SentientGoodsModel` (L543544) / `AscendedGoodsModel` (L543310) | M / `IProvisionModel`, `ISentientGoodsModel`, `IAscendedGoodsModel` | good-set helpers over `ResourceSetsModel` | startup | — |
| `de.innogames.onyx.shared.decay.models.ResourceDecayModel` (L549956) | M / `IResourceDecayModel` | `get_remainingSeconds()` (decay timer) | `DecayTimerParser` | — |
| `de.innogames.onyx.shared.basicvalues.BasicValuesModel` (L21739) | M / itself | `getValue(id)` — balancing constants from `xml.balancing.BasicValues` | `LoadBasicValuesCommand` L393294 | `bv.getValue('…')` |

### 4.3 City map, entities, building definitions, production

| Model (L) | ctx / Key | Key fields & getters | Populated by | Read recipe |
|---|---|---|---|---|
| `de.innogames.onyx.city.model.CityEntitiesModel` (L451695) | M / `de.innogames.strategycity.main.model.ICityEntitiesModel` (L11506) | `get_entities()` → openfl Vector of `de.innogames.onyx.city.entities.data.CityMapEntity` (L406405); `getEntityById(id)`, `getEntitiesByType(type)`, `getEntitiesForBasename(baseName)`, `getUniqueBuilding("main_hall"\|"academy"\|"worker_hut"\|…)`, `get_unlockedAreas()` (`CityMapUnlockedAreaVO[]`), `get_totalWorkers()`, `freeWorkers` (State), `getEntitiesUnderConstruction()`, `whenMapLoaded()`; ticks `next_state_transition_in` down once/s (`onTick` L451965). Entity API: `get_id()`, `get_cityEntityId()` (config id e.g. `"E_Residential_5"`), `get_type()`, `get_x()/get_y()`, `get_playerId()`, `get_connected()`, `get_state()` (`get_stateId()` ∈ construction/upgrading/production/idle/unconnected/finished/waiting/pre_construction/pre_upgrading, `get_nextTransitionIn()`), `getRemainingTime()`, `isProductionRunning()`, `canCollect()`, `get_entityConfig()` → `EntityConfig`, `get_stage()`, `get_activeLevel()`, `get_revenueResource()`, `_vo.getValue()` (raw `CityMapEntityVO`) | `CityEntitiesParser` → `initializePlayerMapConfiguration(startup.city_map)`; `de.innogames.onyx.city.services.CityMapService` (L458833) pushes `reset` → `resetEntities`, `updateEntity` → `updateConnections`, `replaceBuilding`; production/collection commands (see 09) | see recipe 2 |
| `de.innogames.onyx.city.model.CityEntityConfigsModel` (L452081) | M / `de.innogames.strategycity.main.model.ICityEntityConfigsModel` (L16690) | `getConfigById(id)`, `hasConfig(id)`, `get_configs()`, `getConfigByBaseName(base)`, `getAllConfigsByBaseName(base)`, `getFirstLevelConfigsByType(type)`, `getAllConfigsByType(type)`, `getConfigForLevel(cfg, lvl)`, `getNextLevel(cfg)`, `getMaxLevel(cfg)`, `getStageAppliedConfigsById(id)`, `isUnlocked(id)`, `getProducedResourceId(cfg)`; `_configsById.h`. `EntityConfig` (`de.innogames.strategycity.main.model.vo.configs.EntityConfig` L663907, wraps `CityEntityVO` L527282): `get_id/get_baseName/get_name/get_type/get_level/get_width/get_length/get_race/get_category/get_constructionTime/get_requirements()/get_upgradeRequirements()/get_requiredResources()/get_production()/get_providedCulture()/get_providedPopulation()/get_capacity()/get_isPremiumItem()/get_rarity()/get_rankingPoints()/get_resaleResources()/hasComponent(id)/getComponent(id)` | static `xml.balancing.city.Buildings` via `LoadEntityConfigsCommand` L393418 (`EntityConfigFactory.createConfig(CityEntityVO)`); positions/caps files; `CityMapService` push `updateExpansions` adds expansion configs | recipe 5 |
| `de.innogames.strategycity.main.model.EntityCategoriesModel` (L660444) / `ExpansionModel` (L660529) / `StageConfigurationsModel` (L661447) | M / `IEntityCategoriesModel`, `IExpansionModel`, `IStageConfigurationsModel` | build-menu categories (`get_categories()`, `getCategoryById`), expansions (`get_researchExpansion/premium/province`), evolving-building stages (`getStageConfiguration(baseName)`) | static + startup | — |
| `de.innogames.onyx.city.model.FriendCityEntitiesModel` (L452570) | M / `de.innogames.strategycity.main.model.IFriendCityEntitiesModel` (L14459) | same shape as CityEntitiesModel for the **visited** city: `get_entities()`, `getEntityById`, `getEntitiesByType`, `getUniqueBuilding`, `get_unlockedAreas()` | `de.innogames.onyx.city.commands.VisitOtherPlayerCommand` (L387850) after `OtherPlayerService.visitPlayer` (`OtherPlayerCityVO` L534074: `city_map: OtherPlayerCityMapVO` L534039 (+`helpBuildings[]`, `ancientWonderResearchPhases[]`), `other_player`, `relation`, `effects[]`, `technologySection`, `neighborly_help_reward`) | recipe 2 (with `IFriendCityEntitiesModel`) |
| `de.innogames.strategycity.main.model.FriendDataModel` (L660552) | M / `IFriendDataModel` (L14469) | `get_currentPlayer()` → `Player` (L662434: `get_id/get_name/get_avatar/get_cityName/get_race/get_rank/get_relation/get_nextInteractionIn/get_nextHelpBackIn/get_guildInfo`), `get_playerRank()`, `get_technologySection()` (Int), `get_neighborlyHelpReward()`, `canPerformHelp(buildingId)` | `VisitOtherPlayerCommand` → `updateCityData(otherCityVO)`; `OtherPlayerService` push `updatePlayer` | `inj.getInstance(C('de.innogames.strategycity.main.model.IFriendDataModel')).get_currentPlayer().get_id()` (the extension's visit flow in `src/inject/local/localVisitPlayer.ts` could read this instead of trapping) |
| `de.innogames.onyx.city.model.OwnCityEntityProxyModel` / `OtherCityEntityProxyModel` (L452765/452747) | M / `IOwnCityEntityProxyModel`, `IOtherCityEntityProxyModel` | entity ↔ iso-sprite proxies (`getProxyForEntity`, `getProxyForIsoEntity`) — city engine, see 09 | iso engine | — |
| `de.innogames.onyx.shared.production.ProductionQueueModel` (L568414) | M / `IProductionQueueModel` (L11472) | `getQueue(id)` (`ProductionQueueVO` L535027: `id, maxSlots, unlockedSlots, providingEntityBaseName, slots: ProductionQueueSlotVO[]{amount, order, producingEntityId, productId, remainingTime, timestamp}`), `getQueueSlot`, `getQueueSlotProduct`, `getProvidingEntityForQueue` | `de.innogames.strategycity.main.service.CityProductionService` (L13190) push `getProductionQueue` | — |
| `de.innogames.onyx.city.culture.models.CultureModel` (L10752) / `PopulationModel` (L13791) | M / themselves | `cultureState.getValue()` → `CultureState` (wraps `CityCultureVO`); `populationState.getValue()`, `get_residencePopulation()`, `hasEnoughPopulation(req)` | startup + `ResourcesService.getCityCulture` / `CityInformationService.getCityInformation` pushes | `cm.cultureState.getValue()` |
| `de.innogames.onyx.city.buildingsets.models.BuildingSetsModel` (L382973) | M / `IBuildingSetsModel` | `getSetByBaseName`, `getSetBonusesByBaseName`, `isSetBuilding(baseName)` | static `SetBuildings` | — |
| `de.innogames.onyx.city.model.InventoryCityBuildingsModel` (L452728) | M / `IInventoryCityBuildingsModel` | buildings just placed from inventory | commands | — |
| `de.innogames.strategycity.main.model.RunningActivitiesModel` (L15329) | M / itself | `get_runningBattle()/get_runningScout()/get_runningDiplomacy()`, `get_hasRunningBattle()` | `RunningActivitiesParser` | — |

### 4.4 Army / units

| Model (L) | ctx / Key | Key fields & getters | Populated by | Read recipe |
|---|---|---|---|---|
| `de.innogames.strategycity.main.model.ArmyModel` (L9290) | M / itself | `get_squads()` → array of `de.innogames.strategycity.main.model.Squad` (L661404: `get_unitType()`, `get_unitsNum()`), `getSquadsByOrigin(originId)`, `hasAvailableUnits()`, `isUnitAvailable(unitType)`, `getTopUnitConfigByBaseType(base)`, `maxSquadSize`, `get_unitConfigs()` | `UnitsParser` (startup `army_details`); `de.innogames.strategycity.main.controller.AddUnitCommand` (L659580) / `RetreatBattleCommand` (L387293) / army pushes | `army.get_squads().map(s => [s.get_unitType(), s.get_unitsNum()])` |
| `de.innogames.strategycity.main.model.vo.UnitsModel` (L12390) | M / itself | `getUnitConfig(unitTypeId)` → `de.innogames.onyx.shared.unit.config.UnitConfig` (L613558: `get_unitType/get_baseName/get_name/get_hitPoints/get_baseDamage/get_damageRange/get_initiative/get_movementPoints/get_range/get_retaliation/get_unitClass/get_race/get_origin/get_trainingTime/get_abilitiesIds/isStrongAgainst(class)`), `getUnitConfigByBaseName(base, level)`, `getConfigsForRace(race)`, `get_configs()`, `getOrigins()` | static `xml.balancing.battle.BattleUnitTypes` (`LoadUnitTypesCommand` L394044, `BattleUnitTypeVO` L525581) | recipe 5b |
| `de.innogames.strategycity.main.model.UnitsAbilitiesModel` (L661490) | M / `IUnitsAbilitiesModel` | `getUnitAbility(id)` | static `BattleUnitAbilities` | — |
| `de.innogames.onyx.city.barrack.models.UnitsTrainingModel` (L382397) | M / `IUnitsTrainingModel` (L32381) | `get_trainingSize()`, `get_fullTrainingSize()`, `getUnitsTrainingTime(cfg, n)`, `getMaxTrainableUnits(unitId)` | `UnitsParser` | — |
| `de.innogames.strategycity.main.model.ArmyDeploymentModel` (L660204) / `BattleDetailsModel` (L660394) | M / `IArmyDeploymentModel`, `IBattleDetailsModel` | pre-battle deployment & last battle result — see 07 | battle flow | — |

### 4.5 World map, tournaments, spire (pointers)

| Model (L) | ctx / Key | Notes |
|---|---|---|
| `de.innogames.onyx.worldmap.model.WorldMapModel` (L645833) | **W** / `IWorldMapModel` (L11720) | `provincesMap`, `getProvinceAt(row,col)`, `getProvinceByGroup`, `playerPosition`, `currentProvince`; `ScoutingModel` (L645754, `IScoutingModel`), `EncounterModel` (L645655, `IEncounterModel`), `ProvinceDifficultiesModel` (L42468), `WorldMapSettingsModel` (L33378) — see `07-worldmap-tournaments-battle.md` |
| `de.innogames.onyx.tournaments.models.TournamentsModel` (L638251) | M / `ITournamentsModel` (L25661) — **and a second instance in W** | `get_current()/get_next()/get_last()`, `get_isRunning()`, `get_remainingTime()`, `get_tournamentName()`, `get_theme()`, `get_totalScore()`, `get_contributors()`, `get_totalProvinceUnlockTime()`; `TournamentOverviewModel` (L638196, W, `ITournamentOverviewModel`), `TournamentEncounterModel` (L36391), `TournamentArchiveModel` (L638114) — see 07 |
| `de.innogames.onyx.spire.models.SpireModel` (L14959) | M / itself | `mapId, level, points, lastCompletedPointId, mysteryChests, currentEncounter, skillValue, get_gateRemainingTime()`; `SpireStateModel` (L22663, `state`, `remainingTime`), `SpireMapPointsModel` (L14664), `SpireMapLevelsModel` (L14626), `SpireCrystalsModel` (L36553), `SpireItemsModel` (L55953), `SpireWaypointsModel` (L56890), `MysteryChestPointsModel` (L24738) all M; `SpireRankingModel` (L15059) / `SpireBenefitsModel` (L619494) in **S** — see `08-spire.md`. The extension's `aviad_wm` (SpireDiplomacyWindowMediator) holds `spireModel`, `mapPointsModel`, `resourceModel`, `settingsModel` … (factory entry L771085) |
| `de.innogames.onyx.battle.model.BattleModel` (L21769), `BattleUnitsModel` (L361298) | **B** | see 07 |

### 4.6 Guild / social / rankings / messaging / notifications

| Model (L) | ctx / Key | Key fields & getters | Populated by | Read recipe |
|---|---|---|---|---|
| `de.innogames.onyx.shared.guilds.models.GuildModel` (L554117) | M / `IGuildModel` (L17036) | `get_userGuild()` → `de.innogames.onyx.shared.guilds.vos.wrappers.Guild` (L562052: `get_id/get_name/get_level/get_rank/get_points/get_description/get_banner()/get_memberships()` → `GuildMembership[]` (L562422: `get_player()` → `Player`/`GuildPlayer`/`BasePlayer` L562273 (`get_id/get_name/get_avatar`), `get_score`, `get_rank`, `get_roleId`, `get_isMyself`, `get_hasAncientWonder`), `getMembership(playerId)`, `hasPermission(perm, pid)`, `hasRole(role,pid)`, `get_trophies()`), `hasUserGuild()`, `get_visitedGuild()`, `get_userMembershipRequests()`; `onTick` decreases member NH timers | `UserDataParser` (startup `guild` = `GuildVO` L531298: `id, name, level, rank, points, fellowship_points, fellowship_rank, members: GuildMembershipVO[]{player: GuildMemberVO(BasePlayerVO+ online, nhCoolDown, nhBackCountDown), rank, score, role_id, joined_at, hasAncientWonder}, applications[], invitations[], trophies[], banner`); GuildService pushes (`getGuild` etc., see 10). The extension currently parses the raw `GuildService.getGuild` response in `src/inject/local/localProcessGuildData.ts` | recipe 6 |
| `de.innogames.onyx.shared.guilds.models.perks.PerkModel` (L554267) / `GuildProgressionModel` (L554194) | M / `IPerkModel`, `IGuildProgressionModel` | fellowship perks & progression | static `Perks` + pushes | — |
| `de.innogames.onyx.shared.ranking.models.RankingModel` (L573728) | M / `IRankingModel` (L13741) | `getRankingPage(category, pageIndex)` → `RankingListVO` L535795 (`category, length, pageIndex, rankings: RankingVO[]` — `PlayerRankingVO` L534572 `{player, guildInfo, …}`, `GuildRankingVO` L531251), `getRank(category)`, `getPageIndex/getPageCount(category)` | `RankingService.getRankingList` pushes (extension parses the wire response in `src/inject/local/localProcessRankingsData.ts`) | `rm.getRankingPage('players', 0)` |
| `de.innogames.onyx.shared.ranking.models.RankingOverviewModel` (L573783) | M / `IRankingOverviewModel` | own ranks per type (`CurrentRankVO` L528931) | pushes | — |
| `de.innogames.strategycity.main.model.NotificationModel` (L660783) | M / `INotificationModel` (L17079) | `get_notifications()`, `getNotificationById(id)`, `get_notificationPreviews()`, `getFilterGroups()`; notification VOs extend `AbstractNotificationVO` L524286 (`id, type, timestamp, is_read, other_player, visit_state`) | notification service pushes; static `NotificationFilter` | — |
| `de.innogames.onyx.shared.messaging.model.MessageModel` (L564435) | M / `IMessageModel` (L32689) | `getMessages(mailbox)`, `getMessageById(id, mailbox)`, `getAvailableMessages(mailbox)`; `MessageVO` L531107 (`id, subject, status, created_at, updatedAt, initiator, recipients[], posts: MessagePostVO[]`) | messaging pushes | — |
| `de.innogames.onyx.city.chat.model.ChatModel` (L385447) | M / `IChatModel` | `get_guildRoom()`, `getRoomById`, `getParticipantById(pid)`, `_participants` | startup guild members + chat service | — |
| `de.innogames.onyx.shared.portraits.PortraitModel` (L567734) | M / `IPortraitModel` | `get_portraits()`, `_unlocked`, `getAvailablePortraitIds(race, seg)` | static `Avatar` + pushes | — |
| `de.innogames.onyx.shared.effects.model.NeighborlyHelpersModel` (L49587) / `FriendEffectsModel` (L14487) | M / themselves | who helped which building; effects on the visited city | pushes / visit | — |
| `de.innogames.onyx.city.trade.models.TradesModel` (L462082) / `MerchantModel` (L461892) | M / `ITradesModel`, `IMerchantModel` | `getAllTrades(category)`, `getTrade(id, cat)`, `getTradeFee(cat)`, `get_remainingTime()`; `getMerchant(id)`, `getConfig(id)` | `TradesParser` (fee) + `de.innogames.onyx.city.trade.commands.UpdateTradesModelCommand` L461504; static `Merchants` | — |
| `de.innogames.onyx.city.offers.models.OfferModel` (L457541) | M / `IOfferModel` | `get_offers()`, `getOffer(id)`, `getOfferByTargetId(tid)` (timed offers, ticked) | pushes | — |

### 4.7 Ancient wonders, spells, inventory, quests, effects, chests, events

| Model (L) | ctx / Key | Key fields & getters | Populated by | Read recipe |
|---|---|---|---|---|
| `de.innogames.onyx.city.ancientwonders.models.AncientWondersModel` (L373585) | M / `IAncientWondersModel` (L20311) | `getPhase(entityBaseName)` → `de.innogames.onyx.city.ancientwonders.models.data.ResearchPhase` (L374327: `get_status/get_requiredKnowledgePoints/get_investedKnowledgePoints/get_missingKnowledgePoints/get_contributions()/get_receiverKpLimit/get_resourceId`), `getPhaseStatus(base)`, `favorite`, `setFavorite(base, v)`, `get_update()` | `AncientWondersParser` (startup `ancient_wonder_phases`), AW service pushes — see 10 | `aw.getPhase('A_Elves_Tree_1')` |
| `FriendAncientWondersModel` (L373684) / `OtherPlayerAncientWonderModel` (L21217) / `SpireAncientWonderModel` (L26058) | M / `IFriendAncientWondersModel`, itself, itself | visited city's phases; `OtherPlayerAncientWonderModel.get_player()/get_entityConfigs()/get_entityStateMap()` (filled by `AncientWonderService.getOtherPlayerAncientWonders`, which the extension calls in `src/inject/local/localOpenAw.ts`) | visit / AW window | — |
| `de.innogames.onyx.shared.spells.model.SpellsModel` (L580282) | M / `ISpellsModel` (L12739) | `get_spells()` (collection, `.toArray()`), `getSpellById(id)` → `de.innogames.onyx.shared.spells.model.data.Spell` (L580433: `id, name, description, effectConfigId, effectConfig, global, stackable, spellFragmentRatio`), `getSpellOnEntity(entity)`, `hasSpellOnEntity(entity)`, `get_selectedSpellId()` | static `SpellsById` (`LoadSpellsCommand` L393908, `SpellVO` L537722) | `sm.getSpellById('spell_production_boost')` |
| `de.innogames.onyx.city.inventoryitems.model.InventoryModel` (L26328) | M / itself | `items`, `getItemsByType(type, category)`, `getItemById(id)`, `getItemBySubType(sub)`, `getItemAmount(subType)`, `hasItemsByType(type)`, `get_updateInventory()`; item = `de.innogames.onyx.city.inventoryitems.data.InventoryItem` (L414924: `id, amount, type, subType, isNew, changedAt, itemConfig, properties`) from `InventoryItemVO` L531712 | `de.innogames.onyx.city.inventoryitems.commands.ProcessInventoryItemsCommand` (L413523) on inventory pushes | `inv.getItemAmount('spell_fragments')`; list `inv.items` |
| `de.innogames.onyx.city.inventoryitems.model.InventoryItemConfigModel` (L416764) | M / `IInventoryItemConfigModel` (L10793) | `getItemConfigById(id)` (`ItemVO` L531765: `id, name, description, level, rarity, effectConfigId, spellFragments`) | static `xml.balancing.city.Items` (`LoadItemsCommand` L393573) | — |
| `de.innogames.onyx.shared.quests.models.QuestModel` (L569579) | M / `IQuestModel` (L19292) | `quests` (array of `de.innogames.onyx.shared.quests.models.Quest` L569381: `get_id/get_title/get_type/get_subType/get_state/get_requirements/get_rewards/isAccomplished()/get_slot/get_isAbortable`), `getQuest(id)`, `getQuestsByType(type)`, `hasQuestInState(id, state)`; `QuestVO` L535633 | `de.innogames.strategycity.main.controller.bootstrap.QuestUpdateCommand` (L659968) on quest pushes | `qm.quests.map(q => [q.get_id(), q.get_state()])` |
| `de.innogames.onyx.shared.effects.model.EffectsModel` (L8878) — instances `PlayerEffectsModel` (L9263) and `FriendEffectsModel` (L14487) | M / `PlayerEffectsModel` (own city), `FriendEffectsModel` (visited) | `getAllEffects(actionId, target)`, `getFirstEffect`, `hasEffect(actionId, target)`, `getEffectFactor(actionId, target)`, `getEffectOnEntity(actionId, entity)`, `getSpellOnEntity(entity)`, `getEffectsByType(type)`, `getCountersByOwnerId(id)`, `_effects` | `EffectsParser` (`startupUpdate(startup)` reads `startup.effects: EffectVO[]`), effect pushes | — |
| `de.innogames.onyx.shared.effects.model.EffectConfigsModel` (L12253) | M / itself | `getEffectConfigById(id)`, `getEffectConfigsByBaseName(base)`, `getEffectConfigByName(actionId)`, `configsById.h` | static `EffectConfigs` (`LoadEffectConfigsCommand` L393397) + `EffectsParser.init` | — |
| `de.innogames.onyx.chests.models.ChestsModel` (L370818) | M / `IChestsModel` (L10603) | `getChestById(id)`, `getChestsByType(type, sub)`, `get_playerContributions()`, `getPayInProgressById(id)` | `ChestsParser` + `de.innogames.onyx.chests.commands.Update*Command` (L370278–370341) | — |
| `de.innogames.onyx.seasonalevents.models.SeasonalEventsModel` (L545120) | M / `ISeasonalEventsModel` (L11764) | `get_events()`, `getEventById(id)`, `getEventByTypeAndSubType(t, s)`, `getActiveEvent(type)`, `getActiveMainEvent()`, `hasRunningEvents(t, s)`, `getNextComingEvent(types)`; the running tournament's good is `SeasonalEvent.subType` (`TournamentsModel.get_theme()`, see 07) | `SeasonalEventsParser` → `SeasonalEventsModelEvent::prepareEvents`; `TournamentService.getEvents` — see 11 | `se.getActiveEvent('tournament')` |
| `de.innogames.onyx.seasonalevents.models.StaticDataModel` (L48593) | M / itself | per-event static-data load state (`setState(type, subType, "loading"/"available")`) — **not** the balancing static data | `LoadSeasonalEventDataCommand` L393787 | — |
| `de.innogames.onyx.currencyevents.models.CurrencyEventsModel` (L513007), `de.innogames.onyx.city.mainevents.*` models (L11395–35920), `ChallengeEventsModel` (L32421) | M | see `11-events-economy-misc.md` | — | — |
| `de.innogames.onyx.shared.rewards.models.PendingRewardsModel` (L576870) / `WeightedRewardsModel` (L576906) / `FlexibleRewardsModel` (L576846) / `RewardSelectionKitsModel` (L11809) / `EpisodicRewardsModel` (L576807) | M / `IPendingRewardsModel` etc. | reward configs & queued reward popups (`retrievePendingRewards()`) | static + pushes | — |
| `de.innogames.onyx.shared.trophies.model.TrophiesModel` (L582919), `IndicatorsModel` (L562963, `IIndicatorsModel`: `getIndicatorValue(id)`), `TutorialModel` (L26592), `HelpDataModel` (L517830), `NewsModel` (L26725), `KeyDialogModel` (L33630), `ValueManipulationModel` (L642273), `CRMModel` (L28411), `CashShopModel` (L31300), `InGameShopModel` (L51186), `TreasureViewModel` (L80872, = `window.aviad_tv`, `getTreasures(type)`), `MultiplayerModel` (L520666), `StreetConnectionsModel`/`StreetInhabitantsModel` (L580924/580968), `TechnologyConfigsModel` (L631242, M, `getConfig(id)`) | M | misc; listed for completeness | | |
| `de.innogames.onyx.techtree.model.TechnologyModel` (L631274) | **T** / `ITechnologyModel` (L11266) | `get_technologies()`, `getTechnologyById(id)`, `getTechnologiesBySection(s)`, `getParents/getChildren(id)`, `areParentTechnologiesResearched(id)`; `TechnologyVO` L539757 (`id, boosted_good, progress`) | `ConfigureTechTreeDataCommand` L630987 (tech-tree module bootstrap) | via `ModuleLoaderService` while the tech tree is open |

---

## 5. VO conventions and the important VOs

**How JSON becomes VOs.** Every wire object carries `"__class__": "<Alias>"`.
`de.innogames.shared.util.parsers.HaxeJSONParser.parseClass(value)` (L66085) does
`Type.createInstance(FLGlobal.getClassByAlias(value.__class__), []).fromJsonObject(value)`;
`FLGlobal.getClassByAlias` (L7421) is a `StringMap` filled once by
`de.innogames.onyx.networking.vos.ValueObjectRegistry.init()` (L541043, 531 `registerClassAlias("Alias", ctor)`
lines; called from `NetConfiguration.configure` L389968). `HaxeJSONParser.parse(value, type)` (L66039)
dispatches on the declared type string: `"Bool"/"Int"/"Float"/"String"` → `normalize*` (L66131–66161,
tolerant: strings are `parseInt`ed, falsy → 0/""), `"Array<T>"` → `parseArray`, `"GenericDictionary<K,V>"`
→ `parseDictionary` (StringMap in `.h`), `"…VO"` or any object with `__class__` → `parseClass`, `"None"`
(used for `ServerResponseVO.responseData` L537184) → recursive auto-detect. Maps like
`CityResourceVO.resources` use `processMap(new StringMap(), json.resources, "BigInt")` (L66099) —
`"BigInt"` is not a known type so values stay raw JSON numbers/strings until `ResourceBuilder` (L544053)
converts them.

Every VO extends `de.innogames.onyx.networking.vos.AbstractVO` (L414745): `__clazz__` (the alias),
`fromJsonObject(json)` (per-field `if (json.x != null) this.x = …`), `toJsonObject()` (adds `__class__`),
`mergeJsonObjects`. So a VO instance is a plain object with the JSON field names (`snake_case` or
`camelCase` exactly as the server sends them) — read them directly. `AbstractStateVO` (L524391) adds
`next_state_transition_in`. Requests are `ServerRequestVO` (L537145: `requestClass, requestMethod,
requestData[], requestId`) — see 04. All 504 VOs sit in `de.innogames.onyx.networking.vos.*` between
L414745 and L542191.

| VO (L, alias = simple name) | Fields (type) | Used by |
|---|---|---|
| `CityMapVO` (L527945) | `entities: CityMapEntityVO[]`, `unlocked_areas: CityMapUnlockedAreaVO[]{x,y,width,length}` | startup `city_map`; `OtherPlayerCityMapVO` (L534039) adds `helpBuildings: Int[]`, `ancientWonderResearchPhases: ResearchPhaseVO[]` |
| `CityMapEntityVO` (L527843) | `id:Int`, `cityentity_id:String`, `type:String`, `level:Int`, `stage:Int`, `player_id:Int`, `x,y:Int`, `connected:Bool`, `connectedSets: ConnectedSetVO[]{setId, buildingBasenames[]}`, `state: <StateVO>` | wrapped by `CityMapEntity`; state classes: `IdleVO` L531527, `ConstructionVO` L528328, `UpgradingVO` L541035, `UnconnectedVO` L540791 (`paused_state`), `ProducingVO` L534930 / `ProductionFinishedVO` L534968 (extend `AbstractProductionVO` L524413: `current_product: CityEntityProductVO`, `resources`), all with `next_state_transition_in` |
| `CityEntityVO` (L527282) — building definition | `id, base_name, name, type, category, race, level, width, length, construction_time, description, feature, phase, is_premium_entity, premium_cost_factor, rarity, rankingPoints, resaleable, resale_resources, spellFragments, unlockedSlots, coins_bonus, coins_reward, displayOrder, expected_production_boost, productionTimeReduction, use_neighbourly_help_charge, capacity, provisions, requirements: CityEntityRequirementsVO{chapter, worker, resources, requiredResources: ProvidedRequirementVO[], connectionStrategyId}, upgradeRequirements, production: <ProductionTypeVO>` | static `Buildings` → `EntityConfig` |
| `CityEntityProductVO` (L527567) = "production option" | `production_option:Int` (option id sent to `startProduction`), `name`, `asset_name`, `production_time:Int`, `originalProductionTime`, `productionAmount`, `requiredResources`, `revenue`, `originalRevenue`, `premiumCostFactor`, `teasedAtLevel`, `isManipulated` | inside `AbstractProductionTypeVO.products[]` (L524368; subclasses `ManualProductionVO` L532244, `AutomaticProductionVO` L524956 `earlyPickupTime`, `SwitchableProductionVO` L539688, `QueuedProductionVO` L535732) — see 09 |
| `CityResourceVO` (L528002) | `resources: StringMap<id→amount>`, `bundles: StringMap`, `strategy_points: StrategyPointsVO{baseSP,currentSP,maxSP,nextSpIn,producingTime}` | startup `resources`/`resources_cap`, `CityResourcesService.getResources` push |
| `de.innogames.collections.resources.Resource` (L137582) — not a VO | `id:String`, `_value: bigint`; `get_value()`, `get_intValue()`, `clone()` | what the extension sees as `{id,_value}` (`src/inject/aviad.ts`) |
| `UnitSquadVO` (L540897) / `ArmyDetailsVO` (L524899) | `unitTypeId:String, size:Int` / see 3 | startup `army_details` |
| `AbstractUnitVO` (L524593) / `BattleUnitVO` (L525736) / `BattleUnitTypeVO` (L525581) | `unitId, unitType, amountOfUnits, currentHitpoints, ownerId` / battle fields / unit definition (`unitTypeId, baseName, name, hitpoints, baseDamage, damageRange, initiative, movementPoints, range, retaliation, unitClass, unitClassName, unitWeight, race, origin, trainingTime, specialAbilities[], upgradedFromTypeId, points, requirements`) | battle (07), static units |
| `AbstractProvinceVO` (L524443) `{q, r}` → `PlayerProvinceVO` (L534512: `player_id, name, avatar, race, known, guild_info, technology_section, cool_down, help_back_count_down, hasAncientWonder`), `GoodProvinceVO` (L530538: `good_id, difficulty, distance, player_encounters_amount, total_encounters_amount`), `TournamentProvinceVO` (L540248: `+level, number, premiumCosts, remainingTime`), `GoldMineProvinceVO` (L530436) | | worldmap (07) |
| `ProvinceProgressVO` (L535279) / `ProvincesOverviewVO` (L535357) | `q, r, number, level, encounters, upgradeTime, baseTournamentPointsAmount, rewards[]` / `maxEncounters, provinces[]` | tournaments (07); extension `TOURNY.md` |
| `BasePlayerVO` (L525021) → `PlayerVO` (L534136) → `OtherPlayerVO` (L534191); `GuildMemberVO` (L531019) | `player_id, name, avatar, race` / `+city_name, guild_info, is_active, is_guest, rank, score, next_help_back_in, next_interaction_in, profile_text` / `+location` ; `+online, nhCoolDown, nhBackCountDown, nhBackCountDownBoosted` | everywhere a player is referenced |
| `GuildVO` (L531298) / `GuildMembershipVO` (L531057) / `GuildInfoVO` (L530941) / `GuildBannerVO` (L530845) | see 4.6 / `player, rank, score, role_id, joined_at, hasAncientWonder` / `id, name, banner` / `shapeId, symbolId(+colors)` | guild (10) |
| `CityUserDataVO` (L528048), `PrivacyVO` (L534880), `SettingsVO` (L537361) | see 3 | startup |
| `ResearchPhaseVO` (L536059) / `AbstractPhaseVO` (L524335) / `ResearchContributionVO` (L535990) | AW research phase: `entityBaseName, playerId, resourceId, isFavourite, requiredKnowledgePoints, investedKnowledgePoints, receiverKpLimit, contributions[]{player, knowledgePoints, rank, reward}` | AW (10) |
| `InventoryItemVO` (L531712) / `ItemVO` (L531765) | `id, type, subtype, amount, isNew, changedAt, properties: AbstractInventoryItemPropertyVO[]` / item definition | inventory |
| `QuestVO` (L535633) | `id, type, subType, state, title, headline, description, priority, slot, flags, race, questGiverId, waitingTime, args, rewards: QuestRewardVO[], successConditions: QuestSuccessConditionVO[]` | quests |
| `EffectVO` (L529385) | `actionId, confId, type, owner, ownerId, level, stage, permanent, remainingTime` | effects/spells |
| `SeasonalEventVO` (L537101) | `eventId, name, type, subType, state, remainingTime` | events (11) |
| `SpireVO` (L538856), `SpireStateVO` (L538818), `SpireEncounterVO` (L538139)… | see 08 | spire |
| `RankingListVO` (L535795), `PlayerRankingVO` (L534572), `GuildRankingVO` (L531251), `CurrentRankVO` (L528931) | see 4.6 | rankings (10) |
| `AbstractNotificationVO` (L524286) + ~15 subclasses (`NeighborlyHelpNotificationVO` L533661, `TournamentNotificationVO` L540128, `AncientWonderResearch*NotificationVO` L524805/524835 …) | `id, type, timestamp, is_read, other_player, visit_state` | notifications |
| `MessageVO` (L531107) | `id, subject, status, created_at, updatedAt, initiator, recipients[], posts[]` | messages |
| `ServerRequestVO` (L537145) / `ServerResponseVO` (L537184) | `requestClass, requestMethod, requestId, requestData[]` / `+order, responseData` | wire envelope (04) |

---

## 6. BigInt / large-number handling

* Amounts are **native JS `bigint`**. `de.innogames.onyx.shared.data.BigInt` (L549562) is a Haxe abstract:
  `_hx_new(v)`/`fromInt`/`fromString`/`fromFloat(f, floor?, safe?)` all reduce to `v == null ? BigInt(0) : BigInt(v)`;
  `toInt(v, safe?)` → `Number(clamped to MAX_SAFE_INTEGER)`; `toFloat(v, safe?)` → `Number(v)`;
  `toString(v)` → `v.toString()`. Helper functions `de_innogames_onyx_shared_data_BigInt_getBigInt(v)`
  (L549647, coerces number/string/bigint), `_multiplyAndRound(value, factor, floor)` and
  `_divideAndRound` (L549657–549705) do fixed-point math with `getFraction(f)` (factor → numerator/denominator).
  Comparisons in compiled code are plain `<`, `>=`, `===` on bigints; the sentinel "unlimited cap" is
  `BigInt("9223372036854775807")` (`ResourcesModel.updateCap` L10960).
* Containers: `de.innogames.collections.resources.Resource` (L137582) `{id, _value}` and
  `ResourceCollection` (L137418: `getValueFor(id)`, `setValueFor(id, v)`, `addTo`, `subtractFrom`,
  `get_ids()`, `get_resources()` (clones), `getValues()`, `add(coll)`, `subtract(coll)`, `multiply(factor)`,
  `createFilter()`, `clone()`), `ObservableResourceCollection` (L137522, + `getResourceValue(id)` tink State).
* From JS: `5n`, `BigInt(5)`, `BigInt("12345678901234567890")` are all accepted wherever the client
  expects a BigInt (it always re-wraps with `BigInt(v)`). Build a Resource with
  `new window.aviad['de.innogames.collections.resources.Resource']('money', 100n)`; a collection with
  `const c = new window.aviad['de.innogames.collections.resources.ResourceCollection'](); c.setValueFor('money', 100n)`.
  Never mix with Numbers (`1n + 1` throws) — use `Number(x._value)` for display and `BigInt(n)` for math.
  The extension's existing consumers (`aviad_se.diplomacyCosts.get_resources()`, `aviad_wm._onInvest({resource})` in
  `src/inject/local/localProcessSpireDiplomacyGetData.ts`) already pass these objects through untouched.
* Note: `getBigInt` has a compile artefact `if(typeof value == 'bigint')` referring to an undefined
  `value` — harmless because it falls through to `BigInt(v)`.

## 7. Server time and timers

There is **no server-time offset** in the client. `de.innogames.shared.util.clock.GameClock` (L658890)
is initialised from the local clock (`GameClock.init` L658896: `_currentUTCTime = new Date().getTime()`) and advanced
per frame; `GameClock.get_currentUTCTime()` (L658932) is local wall time in ms, `GameClock.getTimestamp()`
a tink State of local seconds. Every server duration is delivered as *remaining seconds*
(`next_state_transition_in`, `remainingTime`, `nextSpIn`, `cool_down`, `next_interaction_in`, `decayTimer`,
`upgradeTime`, `gateRemainingTime`, `waitingTime` …) and models registered with `GameClock.schedule(this, 1000)`
decrement it in `onTick` (`CityEntitiesModel.onTick` L451965, `KnowledgePointsModel.onTick`,
`SeasonalEventsModel.decreaseRemainingTime`, `GuildModel._decreaseNeighborlyHelpTimers`,
`NotificationModel._decreaseNeighborlyHelpBackTimers`, `OfferModel.onTick`, `SpireModel.onTick`, …).
Absolute server timestamps do appear as UNIX seconds in a few VOs (`GuildVO.created_at`,
`GuildMembershipVO.joined_at`, `InventoryItemVO.changedAt`, `AbstractNotificationVO.timestamp`,
`ProductionQueueSlotVO.timestamp`, `MessageVO.updatedAt`) — comparing them with `Date.now()/1000`
is the only way to estimate a server↔client offset. Wire envelopes (`ServerResponseVO`) carry no time.
Practical recipe for cooldowns: read the remaining seconds from the model at time `t0 = Date.now()` and
compute `end = t0 + remaining*1000`; do not expect an absolute server clock anywhere.
(`de.innogames.strategycity.util.TimeUtil` L591620 only formats durations: `staticTime`, `runningTime`.)

## 8. Static (balancing) data

Loaded once at bootstrap by `de.innogames.onyx.shared.staticdata.commands.AbstractStaticLoadCommand`
subclasses (L383159): each returns a `de.innogames.onyx.networking.staticdata.StaticData` id (constants at
L784168–784217, e.g. `BUILDINGS = "xml.balancing.city.Buildings"`, `GOODS = "xml.balancing.Goods"`,
`BATTLE_UNIT_TYPES`, `SPELLS_BY_ID`, `ITEMS`, `EFFECT_CONFIGS`, `EVOLVING_BUILDINGS`, `SET_BUILDINGS`,
`RESEARCH_TECHNOLOGIES*`, `PROVINCE_DIFFICULTIES`, `ENCOUNTERS`, `PERKS`, `TROPHIES`, `MERCHANTS`,
`WEIGHTED_REWARDS`, `BASIC_VALUES`, `AVATAR` …), fetched by
`de.innogames.onyx.shared.staticdata.services.StaticDataService.request` (L580829, URL template with
`{id}` = `<id>_<hash from JsonManifestModel>`), JSON-parsed, `apply(data)`ed into a model, then diffed by
`StaticDataDiffService` (L580779). Raw parsed files that opt in (`get_canBeCached()`) are kept in
`de.innogames.onyx.shared.staticdata.StaticDataCache` (L580747, key = `staticData.get_filename()`;
`IStaticDataCache` mapped in `ConfigureServicesCommand` L390838; `StaticDataRegistry` L15500 lists all
registered `get_staticData()` entries). The `Load*Command` → model table (`de.innogames.onyx.city.controller.bootstrap.staticdata.*`
L393267–394084): `LoadEntityConfigsCommand`→`CityEntityConfigsModel.addConfig` (BUILDINGS),
`LoadGoodConfigsCommand`→`ResourcesModel.addGoodConfiguration` (GOODS), `LoadUnitTypesCommand`→`UnitsModel.addUnitConfig`
(BATTLE_UNIT_TYPES), `LoadSpellsCommand`→`SpellsModel.init`, `LoadItemsCommand`→`InventoryItemConfigModel.addItemConfigs`,
`LoadEffectConfigsCommand`→`EffectConfigsModel`, `LoadStageConfigurationsCommand`→`StageConfigurationsModel`,
`LoadBasicValuesCommand`→`BasicValuesModel.setValues`, `LoadPerksCommand`→`PerkModel`, `LoadTrophiesCommand`→`TrophiesModel`,
`LoadMerchantsCommand`→`MerchantModel.setConfig`, `LoadCityEntityCapsCommand`→`CityEntitiesModel.set_entitiesCap`,
`LoadBuildingPositionsCommand`, `LoadFlexibleRewardsCommand`/`LoadReducedWeightedRewardsCommand`/`LoadRewardSelectionKitsCommand`,
`LoadRaceSpecificResourcesCommand`→static `DynamicResourcesModel.init`, `LoadNewAwEffectsCommand`→static `NewAwEffectsModel`,
`LoadStreetConnectionsCommand`, `LoadInhabitantsCommand`, `LoadNotificationFilterGroupsCommand`, `LoadQuestGiverNamesCommand`,
`LoadAvatarsCommand`, `LoadSoundSettingsCommand`; tech tree: `LoadTechnologyConfigsCommand` L631123 → `TechnologyConfigsModel.addConfig`.
Look-ups at runtime therefore go through the *models* (recipe 5), not through the cache.

---

## 9. Recipes

All snippets assume `const inj = window.aviad_am.injector; const C = n => window.aviad[n];` in the
MAIN world (the extension's injected script). Wrap in `try/catch` — a missing mapping throws.

**1. Dump own player info**
```js
const u = inj.getInstance(C('de.innogames.onyx.shared.models.IUserModel'));
const res = inj.getInstance(C('de.innogames.onyx.resources.models.ResourcesModel'));
({ id: u.get_playerId(), name: u.get_playerName(), city: u.get_cityName(), race: u.get_race(),
   chapterIndex: u.get_technologySection().get_index(), chapter: u.get_technologySection().get_name(),
   guildId: u.get_guildId(), guildName: u._guildName, portrait: u.get_portraitId(),
   diamonds: res.getValueFor('premium'), kp: res.getValueFor('knowledge_points'),
   module: window.aviad_am.currentModule.getValue()._hx_name });
```

**2. List all city entities with type/state (own city; swap the key for the visited city)**
```js
const key = window.aviad_am.currentModule.getValue()._hx_name === 'OTHER_CITY'
  ? 'de.innogames.strategycity.main.model.IFriendCityEntitiesModel'
  : 'de.innogames.strategycity.main.model.ICityEntitiesModel';
const em = inj.getInstance(C(key));
em.get_entities().toArray().map(e => ({
  id: e.get_id(), cfg: e.get_cityEntityId(), name: e.get_entityConfig().get_name(),
  type: e.get_type(), level: e.get_entityConfig().get_level(), x: e.get_x(), y: e.get_y(),
  state: e.get_state().get_stateId(), remaining: e.getRemainingTime(), connected: e.get_connected(),
  raw: e._vo.getValue() /* CityMapEntityVO */ }));
em.getEntityById(12345); em.getUniqueBuilding('main_hall'); em.getEntitiesByType('residential');
```

**3. Read the resources map**
```js
const res = inj.getInstance(C('de.innogames.onyx.resources.models.ResourcesModel'));
const all = Object.fromEntries(res._resources.get_resources().map(r => [r.id, r._value]));   // {money: 123n, …}
const caps = Object.fromEntries(res._resourcesCap.get_resources().map(r => [r.id, r._value]));
const goods = C('de.innogames.onyx.resources.models.ResourceSetsModel').getResourceIds('good_resources');
res.getGoodConfiguration('planks').get_name();      // localized name
res.get_updateResources().listen(ids => console.log('changed', ids));   // live updates (tink Signal)
```

**4. Server time / countdown**
```js
const now = C('de.innogames.shared.util.clock.GameClock').get_currentUTCTime();  // local ms, NOT server
const kp = inj.getInstance(C('de.innogames.strategycity.main.model.IKnowledgePointsModel'));
const nextKpAt = Date.now() + kp.get_timeToNextKP() * 1000;      // remaining-seconds pattern
```

**5. Look up a building / unit / spell / item definition by id**
```js
const cfgs = inj.getInstance(C('de.innogames.strategycity.main.model.ICityEntityConfigsModel'));
const cfg = cfgs.getConfigById('E_Residential_5');    // EntityConfig
[cfg.get_name(), cfg.get_baseName(), cfg.get_level(), cfg.get_width(), cfg.get_length(),
 cfg.get_constructionTime(), cfg.get_providedPopulation(), cfg.get_providedCulture(),
 cfg.get_requirements().get_resources().get_resources()];        // Resource[] costs
cfgs.getAllConfigsByBaseName('E_Residential').map(c => c.get_level());
Object.keys(cfgs._configsById.h).length;                         // every definition id
// 5b units / spells / items
inj.getInstance(C('de.innogames.strategycity.main.model.vo.UnitsModel')).getUnitConfig('E_Elves_Sword_2').get_hitPoints();
inj.getInstance(C('de.innogames.onyx.shared.spells.model.ISpellsModel')).getSpellById('spell_production_boost');
inj.getInstance(C('de.innogames.onyx.city.inventoryitems.model.IInventoryItemConfigModel')).getItemConfigById('…');
```

**6. Fellowship member list**
```js
const gm = inj.getInstance(C('de.innogames.onyx.shared.guilds.models.IGuildModel'));
if (gm.hasUserGuild()) {
  const g = gm.get_userGuild();
  ({ id: g.get_id(), name: g.get_name(), level: g.get_level(),
     members: g.get_memberships().map(m => ({ id: m.get_player().get_id(), name: m.get_player().get_name(),
       score: m.get_score(), rank: m.get_rank(), role: m.get_roleId(), me: m.get_isMyself(),
       raw: m._vo /* GuildMembershipVO: joined_at, player.online, player.nhCoolDown … */ })) });
}
```

**7. Own quests / inventory / army / AW phase / active events**
```js
inj.getInstance(C('de.innogames.onyx.shared.quests.models.IQuestModel')).quests.map(q => [q.get_id(), q.get_type(), q.get_state()]);
inj.getInstance(C('de.innogames.onyx.city.inventoryitems.model.InventoryModel')).items;   // InventoryItem[]
inj.getInstance(C('de.innogames.strategycity.main.model.ArmyModel')).get_squads().map(s => [s.get_unitType(), s.get_unitsNum()]);
inj.getInstance(C('de.innogames.onyx.city.ancientwonders.models.IAncientWondersModel')).getPhase('A_Elves_Tree_1');
inj.getInstance(C('de.innogames.onyx.seasonalevents.models.ISeasonalEventsModel')).get_events();
```

**8. Find the model behind any window (mediator → injected fields)**
1. Get the window/mediator class name: `Object.getPrototypeOf(obj).__class__.__name__`, or from
   `rev-eng/index/classes.tsv` (`…WindowMediator`).
2. Read its injection description: `grep -n "'<FQ.Mediator>' : function" tmp/elvenar-release-full-reveng.js`
   → the `target.<field> = injector.getInstanceForMapping("<Key>|", …)` lines list every injected
   model and the exact mapping key (e.g. L771085 for `SpireDiplomacyWindowMediator`: `spireModel`,
   `resourceModel`, `settingsModel`, `seasonalEventsModel`, `effectsModel`, `mapPointsModel` …;
   L761161 for `VisitOtherPlayerCommand`: `IFriendCityEntitiesModel`, `IFriendDataModel`, `IFriendAncientWondersModel`, `FriendEffectsModel`).
3. Either `inj.getInstance(C('<Key>'))` (main-context keys) or capture the mediator instance with
   `patchCtorRegistryAssignment` in `src/inject/injectMutate.ts` (as done for `aviad_wm`) and read
   `window.aviad_wm.spireModel` — this also works for module-context models, because the mediator was
   injected by the module's own injector.
4. Alternatively, `Object.keys(inj.providerMappings.h)` lists every mapping key on an injector, and
   `Object.entries(mediator).filter(([k,v]) => v && v.__class__)` shows what a live mediator holds.

---

## Open questions / not verified

* Not run in a live browser: `getInstance` semantics are read from the compiled injector, but I did not
  execute `window.aviad_am.injector.getInstance(...)` against a running game (the extension only uses
  `getOrCreateNewInstance` for commands today). Lazily created singletons will be instantiated (and
  injected) on first `getInstance`, which is what the client does too, so side effects should be nil.
* Whether `ModuleLoaderService._module` is reliably non-null while a module is open (it is set in
  `loadModule` and cleared in `unloadModule`) was not traced through the module-change commands.
* The WorldMap module maps a second `ITournamentsModel` (L637992) — I did not confirm which instance the
  tournament windows in the world map actually read from (probably the module's; the HUD reads main).
* The full list of the "post startup" push responses (which service methods the server pushes in
  response to `PostStartupService.getPostStartupData`) is only visible on the wire; not enumerated here
  (see 04/05).
* `HaxeJSONParser.processMap(…, "BigInt")` leaves raw JSON values (numbers or strings?) in
  `CityResourceVO.resources`; whether the server sends amounts above 2^53 as strings was not verified
  (`BigInt(v)` handles both).
* Line numbers are for the Feb 12 2026 snapshot; the March 2026 file was not cross-checked.
