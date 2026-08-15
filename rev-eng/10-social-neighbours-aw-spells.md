# 10 — Social: neighbourly help, visiting, ancient wonders, spells, fellowships, rankings, messaging

## Scope

Everything "between players" in the compiled Elvenar client: visiting another city and helping it
(`de.innogames.onyx.city.service.OtherPlayerService` / `NeighborlyHelpService`,
`de.innogames.onyx.city.commands.*OtherCity*` / `VisitOtherPlayerCommand`,
`de.innogames.onyx.city.neighborlyhelp.*`, `de.innogames.onyx.shared.neighborlyhelp.*`,
`de.innogames.strategycity.main.model.FriendDataModel`), ancient wonders
(`de.innogames.onyx.city.ancientwonders.*`, 206 classes), spells (`de.innogames.onyx.shared.spells.*`,
`de.innogames.onyx.city.spells.*`), fellowships (`de.innogames.onyx.shared.guilds.*`, 288 classes),
rankings (`de.innogames.onyx.shared.ranking.*` + `de.innogames.onyx.shared.ui.components.pagination.Pagination`),
messaging (`de.innogames.onyx.shared.messaging.*`, 91 classes; `de.innogames.onyx.city.chat.*`),
notifications (`NotificationService`), player profile (`PlayerProfileService`), the multiplayer /
fellowship-adventure package (`de.innogames.onyx.multiplayer.*`, 140 classes) and the in-game help
package (`de.innogames.onyx.help.*`). Line numbers are into `tmp/elvenar-release-full-reveng.js`
(Feb 12 2026) unless marked *jul-min* (= `tmp/elvenar-release-min-jul-2026.js`, the only local
bundle new enough to contain one-click `helpPlayer`). Wire format, request builder and push
responses: see `04-networking-layer.md`; commands/injector/mediators: `03-bootstrap-di-commands-events.md`;
extension patch surface (`window.aviad*`): `06-extension-hooks-and-recipes.md`.

Throughout, `svc(Name)` means `new window.aviad['<fq class>']()` — every service below extends
`de.innogames.shared.networking.AbstractConnectionService` (L13105) and works when constructed
outside DI (see 04). `injector` means `window.aviad_am.injector` (city context).

---

## 1. Visiting another player

### 1.1 `OtherPlayerService` (wire name `OtherPlayerService`)

`de.innogames.onyx.city.service.OtherPlayerService` (L14500)

| method | request | args | callback payload |
|---|---|---|---|
| `visitPlayer(playerId, cb)` | `visitPlayer` `.immediate()` | `[playerId]` | `OtherPlayerCityVO` (L534074) |
| `getNeighbourlyHelpBuildings(playerId, cb)` | `getNeighbourlyHelpBuildings` `.immediate()` | `[playerId]` | `PlayerNeighbourlyHelpVO` (L534464) |
| push `updatePlayer` | — | list of player VOs | `friendDataModel.updatePlayersNextInteraction(list)` then dispatches `OtherPlayerEvent::enterPlayerCity` |

`OtherPlayerCityVO` fields: `other_player` (`OtherPlayerVO`), `city_name`, `city_map`
(`OtherPlayerCityMapVO`), `relation` (int → `PlayerRelation`), `technologySection`,
`neighborly_help_reward` (resources VO), `effects` (array).
`OtherPlayerCityMapVO` (L534039) = `CityMapVO` (L527945: `unlocked_areas`, `entities`) + `helpBuildings`
(**int[] of city-entity ids that can still be helped**) + `ancientWonderResearchPhases`
(`ResearchPhaseVO[]`/`RunesPhaseVO[]`, see §3.2).
`OtherPlayerVO` (L534191) = `PlayerVO` + `location {q,r}`; `PlayerVO` (L534136) = `BasePlayerVO`
(L525021: `player_id`,`name`,`avatar`,`race`) + `score`,`rank`,`next_interaction_in`,`next_help_back_in`,
`profile_text`,`city_name`,`is_active`,`is_guest`,`guild_info` (`GuildInfoVO`: `id`,`name`,`banner`).

Extension: `src/model/otherPlayer.ts` (`OtherPlayerClass`: `player_id,name,avatar,race,rank,city_name,guild_info,location`)
matches `OtherPlayerVO`; `src/inject/local/localTrapVisitPlayer.ts` snoops the `visitPlayer`
response (`responseSelector OtherPlayerService/visitPlayer` in `src/inject/playerSpecificMatchers.ts`)
and fires per-player hooks. `src/inject/local/neighbourlyHelp.ts` builds the service and calls
`getNeighbourlyHelpBuildings`.

### 1.2 The visit flow (commands and events)

`de.innogames.strategycity.main.controller.event.OtherPlayerEvent(eventType, playerId=-1)` (L14528),
field `playerId`. Types (constants at L780300ff):

| type string | mapped command | effect |
|---|---|---|
| `OtherPlayerEvent::visitPlayer` | `de.innogames.onyx.city.commands.VisitOtherPlayerCommand` (L387820) — mapping L390447 | `visitPlayer` RPC → fill models → `ModuleChangeEvent::changeModule(OTHER_CITY)` |
| `OtherPlayerEvent::enterPlayerCity` | `de.innogames.strategycity.main.controller.EnterPlayerCityCommand` (L659641) — L390445 | ticks `nextInteractionIn`/`nextHelpBackIn` down each second while visiting |
| `OtherPlayerEvent::refreshPlayerCity` | `RefreshOtherPlayerCityCommand` (L387251) — L390472 | re-`visitPlayer`, `friendDataModel.updateCityData`, `friendCityEntitiesModel.updateConnections` |
| `OtherPlayerEvent::getNeighbourlyHelpBuildings` | `GetNeighbourlyHelpBuildingsCommand` (L387082) — L390473 | RPC → opens `QuickNeighborlyHelpWindow` (§2.3) |
| `OtherPlayerEvent::switchCity` | (listened by HUD/player panel mediators, e.g. `CityPlayerPanelMediator` L602309) | dispatched by `EnterOtherCityCommand` when the other city finished loading |
| `OtherPlayerEvent::returnToCity` | (listeners only) | dispatched by `BackToCityCommand` |
| `OtherPlayerEvent::helpedPlayer` | (listeners only) | dispatched after a help action |

`VisitOtherPlayerCommand.execute()` (L387820): `detain()`, listens `ServiceExceptionEvent::exception`
(code 5000 → abort), dispatches `ShortcutEvent::setDefaultMode`, `LoadingEvent::initialize`, calls
`service.visitPlayer(event.playerId, _onVisitedCityLoaded)`. `_onVisitedCityLoaded(vo)`:
`userModel.set_worldMapPosition(location)`, `cityEntitiesModel.initializePlayerMapConfiguration(vo.city_map)`
(the *friend* entities model), `ancientWondersModel.clearPhases()/addPhases(vo.city_map.ancientWonderResearchPhases)`
(the *friend* AW model), `effectsModel.visitUpdate(vo)`, `friendDataModel.updateCityData(vo)`, then
`ModuleChangeEvent::changeModule` (`de.innogames.onyx.mvcs.events.ModuleChangeEvent(type, module)` L45135)
with `de.innogames.onyx.constants.ApplicationModuleName.OTHER_CITY` (enum L512504: `OTHER_CITY=0,
OWN_CITY=1, TECH_TREE=2, WORLD_MAP=3, BATTLE(type)=4, MULTIPLAYER=5, SPIRE=6, UNKNOWN=7`).

Module change → `de.innogames.onyx.city.modules.states.OtherCityModuleState.load` (L455779) dispatches
`CityEvent::ENTER_OTHER_CITY` → `EnterOtherCityCommand` (L386985, map L390369): remaps the
"selective" interfaces to the friend models (`ISelectiveCityEntitiesModel`, `ISelectiveEntityProxyModel`,
`ISelectiveAncientWondersModel → IFriendAncientWondersModel`, `ISelectiveEffectsModel → FriendEffectsModel`),
dispatches `CityEvent::CREATE_OTHER_CITY` (`CreateOtherCityCommand` L386962), `CityEvent::SHOW_CITY`,
loads the iso engine, then `OtherPlayerEvent::enterPlayerCity`, `OtherPlayerEvent::switchCity`,
`LoadingEvent::finished`.

Leaving: `de.innogames.onyx.city.shortcuts.BackToCityCommand` (L458947, mapped to
`ShortcutEvent::backToCity` L390009, also keyboard shortcut L390873) dispatches
`ModuleChangeEvent::changeModule(OWN_CITY)` + `OtherPlayerEvent::returnToCity`; the module state
switch fires `CityEvent::LEAVE_OTHER_CITY` → `LeaveOtherCityCommand` (L387100) which remaps the
selective interfaces back to the own-city models, then `CityEvent::ENTER_OWN_CITY` →
`EnterOwnCityCommand` (L387028) (`friendDataModel.reset()`, `friendEntitiesModel.clear()`).
The other-city HUD (`OtherCityButtonGroupMediator` L475135) buttons: `backToCity`,
`neighborlyHelp` → `ShortcutEvent::activateNeighborlyHelp` (`ActivateNeighborlyHelpCommand` L458924
sets `applicationModel.interactionMode = "ModeTypes/helpMode"`, only if
`friendsModel.currentPlayer.helpedState == REQUIRE_HELP`), `openProvincesOverview` → the visited
player's AW list (§3.5).

Note (03 territory, but load-bearing here): `OtherPlayerEvent::visitPlayer`, `ShortcutEvent::backToCity`,
`AncientWondersDataEvent::showOtherPlayerAncientWonders` and `OtherPlayerEvent::getNeighbourlyHelpBuildings`
are relayed between module contexts through the "module"/"features" channels (L523737, L523742).

Extension: `src/inject/local/localVisitPlayer.ts` does exactly the manual form of this —
`injector.getOrCreateNewInstance(VisitOtherPlayerCommand)`, sets `.event = new OtherPlayerEvent('OtherPlayerEvent::visitPlayer', playerId)`,
calls `.execute()`; it then waits for `window.aviad_am.get_isLoading()` to become false (after the
`visitPlayer` response trap fired) before opening an AW window (§3.6). Nothing in the extension returns
home programmatically yet (recipe R1).

### 1.3 `FriendDataModel` — the visited player's state

`de.innogames.strategycity.main.model.FriendDataModel` (L660552), interface `IFriendDataModel`
(L14469): `get_currentPlayer()` (`Player`), `get_playerRank()`, `get_technologySection()`,
`get_neighborlyHelpReward()` (resources), `canPerformHelp(buildingId)` (membership in `helpBuildings`),
`updateCityData(otherCityVO)`, `updatePlayersNextInteraction(list)`, `reset()`. Every update dispatches
`FriendDataModelEvent/PLAYER_UPDATED` (L662618).

`de.innogames.strategycity.main.model.data.player.Player` (L662434) — accessors `get_id, get_name,
get_avatar, get_cityName, get_race, get_rank, get_helpedState/set_helpedState, get_relation/set_,
get_nextInteractionIn/set_, get_nextHelpBackIn/set_`. `PlayerHelpedState` (L662495, EnumWrapper):
`UNAVAILABLE` (relation UNKNOWN), `ALREADY_HELPED` (`nextInteractionIn != 0`), `REQUIRE_HELP`.

Obtain: `injector.getInstance(window.aviad['de.innogames.strategycity.main.model.IFriendDataModel'])`.

---

## 2. Neighbourly help

### 2.1 `NeighborlyHelpService` (wire name **`NeighbourlyHelpService`** — note the spelling)

`de.innogames.onyx.city.service.NeighborlyHelpService` (L458771), interface `INeighborlyHelpService`
(L41229: `performAction, pickup, updateEntityCultureEffect`).

| method | request | args | note |
|---|---|---|---|
| `performAction(action, entityId, playerId)` | `performHelp` `.immediate()` | `[action, entityId, playerId]` | **no callback parameter in the Feb-2026 client** — the extension passes a 4th arg, which is silently ignored (`neighbourlyHelp.ts`, `receivedNeighbourHelpBuildings.ts`) |
| `pickup(entityIds)` | `pickup` | `[[id,…]]` | collect coins the neighbours' help left on your town hall (§2.5) |
| `updateEntityCultureEffect(playerId)` | `updateEntityCultureEffect` | `[playerId]` | no caller found |
| **`helpPlayer(playerId, cb)`** (*jul-min* only) | `helpPlayer` `.immediate()` | `[playerId]` | one-click help; callback gets a rewards array (chest) |
| `helpAllGuildMembers(cb)` (*jul-min*) | `helpAllGuildMembers` `.immediate()` | `[]` | callback gets a rewards array |
| `getNeighbourlyHelpRewards(cb)` (*jul-min*) | `getNeighbourlyHelpRewards` `.immediate()` | `[]` | feeds `NeighbourlyHelpRewardsModel` |

`action` is one of the three help effect ids (see §2.2): `unlimited_help` (town hall → coins),
`limited_help` (builders' hut), `time_limited_help` (culture building / AW culture).

**About `helpPlayer` (v1.239+, "one-click help")**: it is absent from both full snapshots (Feb 12 and
Mar 14 2026) and present in the July 2026 minified bundle (*jul-min* L22538:
`helpPlayer:function(a,b){this.request("helpPlayer").withData([a]).withCallback(b).immediate().call()}`;
method-name constants `$I.METHOD_HELP_PLAYER = "helpPlayer"`, `METHOD_HELP_ALL_GUILD_MEMBERS`,
`METHOD_GET_NEIGHBOURLY_HELP_REWARDS` at *jul-min* L61823). Callers in that build:
`de.innogames.onyx.city.commands.PerformFavouriteHelpCommand` (mapped to
`PerformFavouriteHelpEvent::perform`; event fields `playerId`, `helpedBack`, `blimpPosition`;
after a `CheckStorageCapacityEvent::check` confirm it calls `service.helpPlayer(playerId, _showHelpChestRewards)`
and dispatches `QuickNeighborlyHelpPerformedEvent::playerHelped`), and
`HelpAllFellowshipMembersCommand` (`HelpAllFellowshipMembersEvent::helpAll`, iterates guild members
with `nhCoolDown == 0`). Which building gets helped is decided **server-side from the helper's saved
favourites**: `de.innogames.onyx.networking.services.NeighbourlyHelpFavouritesService`
(wire `NeighbourlyHelpFavouritesService`, `getFavourites()` → future `{primary, secondary}`,
`setFavourites(primary, secondary)` with lowercase category names; UI
`de.innogames.onyx.city.neighborlyhelp.views.NeighborlyHelpFavoritesController` — categories index 0
worker_hut, 1 main_building, 2 "best culture building"). The chest reward from the callback is shown via
`TreasureRewardsEvent::showRewards` with source `QUICK_HELP` / `"neighbourly_help"`.
Extension: `src/inject/local/localHelpPlayer.ts` calls `svc.helpPlayer(playerId, cb)`; `src/inject/inject-main.ts`
gates it on `compareVersion('1.239') >= 0` and falls back to `getNeighbourlyHelpBuildings` +
`performAction` (`receivedNeighbourHelpBuildings.ts`: prefers builders → culture → town hall) on
older clients. `src/inject/aviad.ts` declares both.

### 2.2 The three help types and how the client picks one

`de.innogames.onyx.city.entities.states.behaviors.help.AbstractChargeBuildingBehavior` (L410539) with
`ChargeCultureBehavior.getEffectActionId() = "time_limited_help"` (L410560),
`ChargeTownHallBehavior → "unlimited_help"` (L410572), `ChargeWorkerHutBehavior → "limited_help"`
(L410584). The same switch by entity type lives in `QuickNeighborlyHelpWindowMediator._getEffectActionId`
(L456021ff: `main_building → unlimited_help`, `worker_hut → limited_help`, default →
`time_limited_help`). The ids are also **effect action ids** on the receiving side
(`effectsModel.hasEffect("unlimited_help")`, `getEffectLevel("limited_help")` = builder charges,
`hasEffectOnEntity("time_limited_help", building)` = culture boost with `getRemainingTime()`), see
`09-city-engine-and-buildings.md` for the effects model.

In-city help (help mode, clicking a building) → `de.innogames.onyx.city.controller.events.NeighborlyHelpEvent`
(L57094: `get_entity()`, `get_effectActionId()`), type `NeighborlyHelpEvent::executeAction` →
`de.innogames.onyx.city.commands.PerformHelpNeighborCommand` (L387146, map L390485):
`service.performAction(effectActionId, entity.get_id(), entity.get_playerId())`, sets the guild
member's `nhCoolDown = 23h`, `visitingPlayer.set_helpedState(ALREADY_HELPED)`, dispatches
`OtherPlayerEvent::helpedPlayer`.

### 2.3 Quick help window (help without visiting)

`de.innogames.onyx.city.commands.GetNeighbourlyHelpBuildingsCommand` (L387082) → RPC →
`windowsFactory.createQuickNeighbourlyHelpWindow(new PlayerNeighbourlyHelp(vo))` →
`de.innogames.onyx.city.neighborlyhelp.views.QuickNeighborlyHelpWindow` (L48433, `name = "quickNhWindow"`,
title "Neighborly Help") + `QuickNeighborlyHelpWindowMediator` (L456021). Selecting a building
renderer → `_onSelected` → (storage check) → dispatch
`de.innogames.onyx.city.neighborlyhelp.events.QuickNeighborlyHelpEvent("QuickNeighborlyHelpEvent::executeAction", entityId, playerId, effectActionId, rewards)`
(L52314) → `PerformQuickNeighborlyHelpCommand` (L455886, map L455910):
`service.performAction(effectActionId, entityId, playerId)` + `QuickNeighborlyHelpPerformedEvent::playerHelped`.

Data wrappers `de.innogames.onyx.shared.neighborlyhelp.data.PlayerNeighbourlyHelp` (L567037:
`get_player()` → `Player`, `get_rewards()` → resources, `get_buildings()` → `NeighbourlyHelpBuilding[]`,
`get_guildXP()`), `NeighbourlyHelpBuilding` (L567007: `get_entityConfigId, get_entityId, get_type, get_stage`).

`PlayerNeighbourlyHelpVO` (L534464): `player` (PlayerVO), `rewards` (resources VO), `buildings`
(`NeighbourlyHelpBuildingVO[]` L533738: `entityConfigId`, `entityId`, `type`, `stage`), `guildXPReward`.
Extension `src/model/neighbourHelpBuildings.ts` (`NeighbourHelpData`: `player, rewards, buildings[entityConfigId,entityId,type]`)
matches, minus `stage` and `guildXPReward`; its `receivedNeighbourHelpBuildings.ts` assumes town hall
`entityId === 1` and builders `entityId === 2` (true for standard cities, not guaranteed by the VO —
switching on `type` is what the game does).

### 2.4 Help *received* — VOs and notifications

`NeighborlyHelperVO` (L533706: `helperName, avatarId, cityEntityId`) — helpers currently shown on your
buildings (`NeighborlyHelpersModel` L49587, `HasNeighborlyHelperGuard` L407372).
`NeighborlyHelpNotificationVO` (L533661: `interaction_type, entityId, entityName, entityType` +
`AbstractNotificationVO` L524286: `id, other_player, type, is_read, visit_state, timestamp`),
`NeighborlyHelpBackVO` (L533633: `countDown, countDownBoosted`) — the "help back" state inside a
notification's `visit_state`. Notification filter names: `neighborly_help`, `trader`, `ancient_wonders`,
`merchant` (L662186ff).

### 2.5 Picking up help rewards

The coins that helpers charge your town hall with are collected by
`de.innogames.onyx.city.entities.pickers.TownHallRewardPicker` (L408016): `canPickup` =
`effectsModel.hasEffect("unlimited_help") && !resourcesModel.isCapped("money")`; `callService` →
`effectsModel.removeUnlimitedHelp(baseName)` + **`NeighborlyHelpService.pickup([entity.get_id()])`**;
revenue = `townHallConfig.get_coinsBonus() * getEffectLevel("unlimited_help")`. It is chosen by
`PickupProductionCommand.getPicker` (L387168) for `main_building`. Builder charges (`limited_help`)
and culture boosts (`time_limited_help`) need no pickup — they are consumed as effects.

Rewards *for* helping (chests) arrive through `TreasureService`/`TreasureRewardsEvent` (see 11) and,
for AW help, via the `showHelpReward` push on `AncientWonderService` (§3.1).

---

## 3. Ancient wonders

### 3.1 `AncientWonderService` (wire name `AncientWonderService`)

`de.innogames.onyx.city.ancientwonders.services.AncientWonderService` (L21115). Registered as
singleton in `AncientWondersModelConfiguration` (L373450). Extension: `src/inject/aviad.ts` declares
`getOtherPlayerAncientWonders`; `src/inject/local/localProcessRankingsData.ts` / `localProcessGuildData.ts`
call it for every player id they harvest; `playerSpecificMatchers.ts` snoops the
`getOtherPlayerAncientWonders` response and the `phaseUpdated` push.

| method | request | args | returns |
|---|---|---|---|
| `getContributions()` | `getContributions` `.immediate().callWithFuture()` | — | tink Future of `AncientWonderContributionVO[]` — *your* KP in other people's AWs |
| `getPhase(playerId, entityId)` | `getOtherPlayerAncientWonders` `.parseLastResponse().callWithFuture()` | `[playerId, entityId]` | Future of `OtherPlayerAncientWondersVO` with `ancientWonderPhases[0]` = that AW |
| `getPhases(playerId)` | `getPhases` `.immediate().callWithFuture()` | `[playerId]` | Future of phase VO array |
| `insertRuneShard(entityBaseName)` | `insertRuneShard` `.immediate()` | `[baseName]` | (push `phaseUpdated`) |
| `investKnowledgePoints(playerId, entityBaseName, amount)` | `investKnowledgePoints` (queued, not immediate) | `[playerId, baseName, amount]` | (push `phaseUpdated`) |
| `investRuneShards(playerId, entityBaseName, amount)` | `investKnowledgePointsBasedOnRuneShards` | `[playerId, baseName, amount]` | KP from spare rune shards |
| `investGuildProgressionFreeKp(playerId, entityBaseName)` | `investGuildProgressionFreeKp` | `[playerId, baseName]` | fellowship-perk free KP |
| `useBrokenShards(entityBaseName, cb)` | `useBrokenShards` `.immediate()` | `[baseName]` | cb: phase VO array |
| `payBrokenShards(entityBaseName, cb)` | `payBrokenShards` `.parseLastResponse()` | `[baseName]` | cb: phase VO array (premium forge) |
| `getOtherPlayerAncientWonders(playerId, cb)` | `getOtherPlayerAncientWonders` `.parseLastResponse()` | `[playerId]` | cb: `OtherPlayerAncientWondersVO` |
| `updateFavourite(playerId, entityBaseName, isFavorite)` | `updateFavourite` `.immediate()` | `[playerId, baseName, bool]` | — |
| push `showHelpReward` (L782052) | — | reward VOs | → `AncientWondersHelpRewardEvent::showReward` (reward window, `ShowAncientWondersHelpRewardCommand` L373199, also `NotificationService.cleanPendingNotifications("ancient_wonder")`) |
| push `phaseUpdated` (L782053) | — | phase VO array | → `UpdateAllPhasesCommand_Event` (L57573) → `UpdateAllPhasesCommand` (L373337) partitions by `playerId == own` into `AncientWondersModel` / `FriendAncientWondersModel` |

`AncientWonderContributionVO` (L524718): `owner` (PlayerVO), `contributedKPs`, `cityEntityId`,
`ancientWonderId`, `totalInvestedKPs`, `requiredKPs`, `reward` (`ResearchContributionRewardVO`:
`icon`, `rewards[]`). Wrapped by `models.data.AWContribution` (L373772) for the "Contributions" tab
(`AWContributionsController` L372569, `getContributions()`, `openResearchWindow(contribution)` →
`AncientWondersDataEvent::displayAncientWonder` with `LoadType.LOAD_ONLY`).

`OtherPlayerAncientWondersVO` (L533994, extends `AbstractPhaseVO`): `cityMapEntities`
(city-map entity VOs of the AWs), `cityEntities` (entity *configs*), `ancientWonderPhases`
(`ResearchPhaseVO|RunesPhaseVO[]`), `playerInfo` (BasePlayerVO). Wrapped by
`models.data.OtherPlayerAncientWonderList` (L374126: `get_entityConfigs()` — spire AWs
(`is_spire_aw` component) filtered out, `get_player()`, `get_entityStateMap()` (cityentity_id → entity
state), `get_ancientWonderPhases()`, `updatePhase(vo)`).

### 3.2 Phase VOs and models

`AbstractPhaseVO` (L524335): `playerId`, `entityBaseName`, `isFavourite`, `resourceId` (the rune-shard
resource id, e.g. `<basename lowercased>_shards`).
`ResearchPhaseVO` (L536059): + `investedKnowledgePoints`, `requiredKnowledgePoints`, `contributions`
(`ResearchContributionVO[]`), `receiverKpLimit` (-1 = unlimited).
`ResearchContributionVO` (L535990): `rank` (-1 = owner), `player` (PlayerVO), `knowledgePoints`, `reward`
(`ResearchContributionRewardVO` L535960: `icon`, `rewards` = `RewardVO[]`).
`RunesPhaseVO` (L536616): + `runesMask` (9-bit), `insertionCost`, `numRunes`, `forgeResourceId`
(`broken_shards` / `shattered_orbs`), `numForgeResources`.
Extension `src/model/ancientWonderPhase.ts` mirrors all of these field-for-field (incl. `__class__`
discriminators `ResearchPhaseVO`/`RunesPhaseVO`, `ResearchContributionVO`, `ResearchContributionRewardVO`,
`RewardVO`).

Client wrappers (`de.innogames.onyx.city.ancientwonders.models.data.*`): `IPhase` (L373830:
`get_entityBaseName, get_status, get_isFavorite/set_`), `ResearchPhase` (L374327: `get_required/
invested/missingKnowledgePoints, get_contributions` (`ResearchContribution[]` L374280: `getPlayer()`,
`get_rank`, `get_knowledgePoints`, `get_reward`, `rewards`), `get_receiverKpLimit, get_resourceId`;
`status` COMPLETE when invested ≥ required), `RunesPhase` (L374367: `get_runesMask, get_runeShardId,
get_insertionCost, get_numInsertedRuns` (bit count), `get_numRunes, get_forgeResourceId, get_numForgeResources`),
`CompleteResearchPhase` (L373953) / `CompleteRunesPhase` (L374011) / `EmptyRunesPhase` (L374055)
(synthetic phases for the sell / cancel-upgrade paths), `PhaseStatus` (L374270 EnumWrapper: `PROGRESS`,
`COMPLETE`, `UNKNOWN`), `AncientWonderKnowledgePointData(playerId, baseName)` (L373878 →
`AncientWonderKnowledgePointsDataVO` L524778 `{ownerPlayerId, baseName}` used when buying KP for an AW
with diamonds via `resourcesService.buyAWInstantKP(amount, "KNOWLEDGE_POINTS_ANCIENT_WONDER", data, cb)`).

Models (all keyed by `entityBaseName` in a `haxe_ds_StringMap` `_phaseModel.h`):

| class | interface / DI key | holds |
|---|---|---|
| `models.AncientWondersModel` (L373585) | `IAncientWondersModel` (L20311); default `ISelectiveAncientWondersModel` (L14439) | own AW phases; `favoriteState` (tink State of the favourite phase); `get_update()` tink Signal fired with the changed phases |
| `models.FriendAncientWondersModel` (L373684) | `IFriendAncientWondersModel` (L14454); becomes `ISelectiveAncientWondersModel` while visiting | the visited / listed player's phases |
| `models.OtherPlayerAncientWonderModel` (L21217) | itself (singleton) | last `OtherPlayerAncientWonderList` + player (`updateData`, `updatePhase`, `updatePlayer`, `get_entityConfigs`, `get_player`, `get_hasNoAncientWonders`, `get_entityStateMap`) |
| `models.SpireAncientWonderModel` (L26058) | itself | spire AW rune data (see 08) |

Common API on both phase models: `addPhases(voArray)`, `addPhase(phase)`, `updatePhase(vo)`,
`getPhase(baseName)`, `getPhaseStatus(baseName)`, `clearPhases()`, `get_update()`; own model adds
`setFavorite(baseName, bool)` (only one favourite at a time). `AncientWonderPhaseModel` (L373494) is the
static helper implementation.

### 3.3 Events → commands (`AncientWondersControllerConfiguration` L373419)

| event type | event class | command | what it does |
|---|---|---|---|
| `investKnowledgePoints` | `events.InvestKnowledgePointsEvent(type, entityBaseName, amount)` (L21196) | `InvestKnowledgePointsCommand` (L373143) | `service.investKnowledgePoints(user.playerId, baseName, amount)` |
| `investFriendKnowledgePoints` | same | `InvestFriendKnowledgePointsCommand` (L373130) | `service.investKnowledgePoints(otherPlayerAncientWonderModel.player.id, baseName, amount)` |
| `investFreeFriendKnowledgePoints` | same (amount unused) | `InvestFreeFriendKnowledgePointsCommand` (L373117) | `service.investGuildProgressionFreeKp(...)` |
| `investRuneshards` | `events.InvestRuneShardsEvent(playerId, entityBaseName, amount)` (L67058) | `InvestRuneshardsCommand` (L373156) | `service.investRuneShards(...)` |
| `InsertRuneShardsEvent::insertShard` / `::forgeShard` | `events.InsertRuneShardsEvent` (L43266) | `InsertRuneShardsCommand` (L373087) / `ForgeRuneShardsCommand` (L373069) | insert one shard / forge with broken shards |
| `InstantForgeInsertShardEvent::instantForgeShard` | `events.InstantForgeInsertShardEvent` (L85664) | `InstantForgeRuneShardsCommand` (L373099) | `payBrokenShards` |
| `AncientWonderWindowEvent::openWindow` | `events.AncientWonderWindowEvent` (L75192, `get_id()` = baseName) | `OpenDetailWindowCommand` (L373168) | own AW detail window |
| `AncientWondersDataEvent::update` | `de.innogames.onyx.shared.events.AncientWondersDataEvent` | `UpdateAncientWonderDataCommand` (L373365) | `LOAD_ALL` → `getPhases(playerId)`; `UPDATE_THIS` → `getPhase(playerId, baseName)`; result → `UpdateAllPhasesCommand_Event` |
| `AncientWondersDataEvent::showOtherPlayerAncientWonders` | same | `ShowOtherPlayerAncientWondersCommand` (L373222) | `getOtherPlayerAncientWonders(playerId)` → fills `OtherPlayerAncientWonderModel` + `FriendAncientWondersModel`, closes window groups `ancientWonderListHelp`/`ancientWonderHelp`, maps `ISelectiveAncientWondersModel`/`ISelectiveCityEntitiesModel` to the friend models, opens `PlayerAWListWindow` |
| `AncientWondersDataEvent::displayAncientWonder` | same | `DisplayAncientWonderCommand` (L373000) | see §3.6 |
| `FavoriteAncientWonderEvent::setFavorite` | `views.details.components.events.FavoriteAncientWonderEvent(type, entityName, isFavorite)` (L21170) | `SetFavoriteCommand` (L373182) | model + `updateFavourite` RPC |
| `AncientWondersHelpRewardEvent::showReward` | `events.AncientWondersHelpRewardEvent` (L82374, `get_rewards()`) | `ShowAncientWondersHelpRewardCommand` (L373199) | big reward window |
| `SpireRewardsEvent::showSpireAncientWonderRewards` | — | `ShowSpireAncientWonderRewardCommand` (L373314) | — |
| `CastSpellEvent::cast_spell` | `de.innogames.onyx.city.spells.events.CastSpellEvent` | `ShowResourcesPerSpellEffectCommand` (L373258) | mana / goods blimps for `mana_per_spell_usage` / `goods_per_spell_usage` AW effects |
| `cancelEntity` | city event with `get_entity()` | `CancelAncientWonderUpgradeCommand` (L372964) | puts back a synthetic complete phase |
| `FriendDataModelEvent/PLAYER_UPDATED` | — | `UpdatePlayerCommand` (L373394) | `otherPlayerAncientWonderModel.updatePlayer(friendDataModel.currentPlayer)` |
| `de.innogames.onyx.city.ancientwonders.commands.UpdateAllPhasesCommand/EVENT_TYPE` | `UpdateAllPhasesCommand_Event(phases)` | `UpdateAllPhasesCommand` | split phases into own / friend models |

`de.innogames.onyx.shared.events.AncientWondersDataEvent(eventType, playerId, loadType, windowId)`
(L40928), fields `playerId`, `loadType`, `windowId`.
`de.innogames.onyx.shared.events.LoadType` (enum L550557): `LOAD_ALL` (index 0, no params),
`UPDATE_THIS(ancientWonderId, baseName)` (1), `LOAD_ONLY(ancientWonderId, baseName)` (2) —
`ancientWonderId` is the **entity-config id** string (e.g. `A_Elves_Sanctuary_5`), `baseName` the level-less
name. Obtain via `window.aviad_enum['de.innogames.onyx.shared.events.LoadType'].LOAD_ONLY(id, baseName)`
(the extension's `AviadLoadType` typing in `aviad.ts` names the parameters `(baseName, type)` — the real
order is `(ancientWonderId, baseName)`, which is what `localOpenAw.ts` actually passes).

### 3.4 Windows and mediators

Factory `views.factories.AncientWondersWindowFactory` (L379362): `createOverviewWindow()`
(`AncientWonderOverviewWindow` L82854 — own AW overview: gallery / contributions tabs, mediator
L381654), `createBuildingWindow(entityConfigId, tab)` (own AW detail, tabs from
`AncientWondersTabsCreator` L374504: overview / research / runes / upgrade / levels…),
`createFriendBuildingWindow(entityConfigId, windowId)` (friend AW detail; tabs from
`AncientWondersFriendTabsCreator` L374416 → the "help" tab), `createPlayerAWListWindow()`
(`PlayerAWListWindow` L28958, group `ancientWonderListHelp`, one `OtherPlayerAncientWonderItemRenderer`
L381318 per AW named `other_player_aw_list_renderer<i>`), `createSellWindow()`.
`AncientWonderWindow` (L47493, group `ancientWonderHelp`) is a tab window; `AncientWonderWindowMediator`
(L375815) only handles the "?" help button.

`PlayerAWListWindowMediator` (L375839): builds `PlayerAWViewData` (L381612) per AW (`state` ∈
`KP_PHASE | CONTRIBUTED | RUNE_PHASE | CONSTRUCTION | UNCONNECTED | UPGRADING | MAX_LEVEL`,
`investedKnowledgePoints`, `requiredKnowledgePoints`, `runesIndicatorRunesMask`, `level`, `id`, `isFavorite`),
favourite first; clicking "open" (`_openButtonClickHandler` L376086) allocates a
`WindowId._hx_new()` (`"window_<n>"`, L615336) and dispatches
`AncientWondersDataEvent::displayAncientWonder` with `LoadType.UPDATE_THIS(entityConfigId, baseName)`;
when that window closes it refreshes the list.

KP donation UI: `views.details.components.research.AbstractAncientWonderProgressMediator` (L376650)
listens to the button events `ResearchButtonEvent::oneKPInvested / allKPsInvested / kPInputValueInvested /
buyKP / useInstantItem / buyOneKPWithPremium / buyAllKPsWithPremium / buyWithRuneshards / kPInputChanged`.
`investKnowledgePoints(n)` subtracts `n` from the local `knowledge_points` resource, bumps `_investedKP`
and dispatches `InvestKnowledgePointsEvent(getInvestKnowledgePointEventType(), basename, n)`.
Subclasses: `AncientWonderResearchProgressMediator` (L377073, own AW, event type `investKnowledgePoints`)
and `AncientWonderHelpProgressMediator` (L376941, friend AW, `investFriendKnowledgePoints`;
`getAvailableKnowledgePoints()` = min(own KP, missing KP, `receiverKpLimit`), free-KP button dispatches
`investFreeFriendKnowledgePoints` when the target is a fellow (`guild_progression_free_kp` resource),
`getKpFromRuneshardsAmmount()` = basic value `bv_runeshards_kpvalue_others`). Rune-shard KP is batched:
`investRuneshards` counts per basename and 1 s later dispatches one `InvestRuneShardsEvent`.
Contributor list: `ContributorRankingComponent(Mediator)` (L45199 / L376349), rows
`ContributorRowRenderer(Mediator)` (L18341 / L376410).
State classes for the progress bar: `NotUnlockedProgressState, InvestingResearchProgressState,
FinishedResearchProgressState, MaxLevelResearchProgressState, NoHelpProgressState, FinishedHelpProgressState,
ReceiverKPLimitReachedState` (L377124–L377247).

### 3.5 Where the "other player's AWs" entry points are

`AncientWondersDataEvent::showOtherPlayerAncientWonders` with `LOAD_ALL` is dispatched from: the
other-city HUD button `openProvincesOverview` (L475158), the fellowship member row (L558994,
`membershipItem.memberId`), the player-profile / ranking context (L586934), the world-map neighbour
province (L655316). All go through `ShowOtherPlayerAncientWondersCommand` (§3.3).

### 3.6 `DisplayAncientWonderCommand` (L373000) — open one AW window

`execute()`: `detain()`, `LoaderViewEvent::SHOW_LOADER`, listen `ServiceExceptionEvent::exception`; by
`event.loadType._hx_index`: 0 (`LOAD_ALL`) → nothing (no-op), 1 (`UPDATE_THIS`) →
`service.getPhase(playerId, baseName).handle(onUpdateThis)`, 2 (`LOAD_ONLY`) →
`service.getPhase(...).handle(onLoadOnly)`.
`onUpdateThis(vo)`: `model.updatePhase(vo.ancientWonderPhases[0])` (own model) +
`friendAncientWondersModel.updatePhase(...)`, then `createWindow(loadType.ancientWonderId)`.
`onLoadOnly(vo)`: wraps into `OtherPlayerAncientWonderList`, `otherPlayerAncientWonderModel.updateData`,
`friendAncientWondersModel.clearPhases()/addPhases(...)`, `cityEntitiesModel.initializeEntities(vo.cityMapEntities)`
(the friend entities model — so LOAD_ONLY works **without** having visited), then `createWindow`.
`createWindow(entityConfigId)`: `WindowEvent::addWindow` with
`factory.createFriendBuildingWindow(entityConfigId, event.windowId)`, `release()`, `HIDE_LOADER`.

Extension: `src/inject/local/localOpenAw.ts` builds this command through the injector, sets
`.event = new AncientWondersDataEvent('displayAncientWonder', playerId, LoadType.LOAD_ONLY(buildingId, baseName), 'window_0')`
and executes it. Two caveats visible in the source: the type string is `'displayAncientWonder'`, not
`'AncientWondersDataEvent::displayAncientWonder'` — harmless because the command is executed directly
and never reads `event.type`; and `windowId 'window_0'` is a constant, so `whenClosedWindow` bookkeeping
in `PlayerAWListWindowMediator` will not fire for it (fine when the list window is not open).

---

## 4. Spells (enchantments)

### 4.1 Model and static data

`de.innogames.onyx.shared.spells.model.SpellsModel` (L580282, `ISpellsModel` L12739): `init(spells)`
(from static data `StaticData.SPELLS_BY_ID` via `LoadSpellsCommand` L393908), `get_spells()` (sorted by
`order`), `getSpellById(id)`, `getSpellByConfigId(effectConfigId)`, `get_selectedSpellId/set_`
(the spell armed in "ModeTypes/spell" mode), `hasSpellOnEntity(entity)`, `getSpellOnEntity(entity)`,
`getSpellEffectOnEntity(entity)`. `NO_EFFECT_SPELLS = ["combiningcatalyst","spell_teleport_1"]` (L785000).
`model.data.Spell` (L580433) from `SpellVO` (L537722: `id, effectConfId, name, description,
targetDescription, effectDescription, assetName, order, global, stackable, spellFragments`) → fields
`id, effectConfigId, hasEffect, name, description, targetDescription, effectDescription, order, global,
stackable, spellFragmentRatio, effectConfig`.

Spell **inventory** is not a separate service: a spell is a resource in the city resources model with
the spell id as resource id (`resourceModel.subtractFrom(spellId, 1)` in `EnchantBuildingCommand`;
counts come with `CityResourcesService/getResources`, see 11 / 12). Spell fragments are the resource
`spell_fragments`.

Spell ids seen in code: `spell_neighborly_help_boost_1` (Ensorcelled Endowment — icon `culturebonus`,
`SpellTooltipIconProvider` L417206), `spell_good_production_boost_1` (Magical Manufacturing),
`spell_supply_production_boost_1` (Power of Provision), `spell_teleport_1` (Teleport Building),
`spell_pet_food_1` (Pet Food), `combiningcatalyst`; the effect ids they apply
(`EffectActionId_getAllSpellEffectIds()` L406665): `good_production_boost_spell,
supply_production_boost_spell, neighbourly_help_boost_spell, settlement_production_boost_spell`.
Other spell ids (Inspiring Meditation, Royal Restoration, etc.) come only from static data.

### 4.2 `SpellService` (wire name `SpellService`)

`de.innogames.onyx.shared.spells.services.SpellService` (L580454), `ISpellService` (L63164).

| method | request | args |
|---|---|---|
| `castSpellOnBuilding(spellId, cityMapEntityId, cb)` | `castSpellOnBuilding` `.immediate()` | `[spellId, entityId]` → cb gets the updated **city-map entity VO** |
| `castGlobalSpell(spellId)` | `castSpell` `.immediate()` | `[spellId]` |

Extension: `src/inject/local/castEe.ts` — `castSpellOnBuilding('spell_neighborly_help_boost_1', buildingId, cb)`;
`castEeOncePerSecond.ts` casts on a list of entity ids 1 s apart (driven by the overlay's EE view over
the user's own culture buildings, `src/util/getEeMissingBuildings.ts`).

### 4.3 The in-game cast flow (`de.innogames.onyx.city.spells.*`)

`StartSpellActivationCommand` (L460069): non-global spell → `CloseWindowsEvent::closeAllWindows`,
`spellsModel.selectedSpellId = id`, `applicationModel.interactionMode = "ModeTypes/spell"`; global spell →
`GlobalSpellConfirmAlertWindow` (L580473) → `castGlobalSpell` + `CastSpellEvent::cast_spell`.
Clicking a building in spell mode → `CastSpellOnBuildingBehavior.handle` (L459949) → dispatches
`de.innogames.onyx.city.spells.events.EnchantBuildingEvent(type, spellId, entity)` (L63177) with
`EnchantBuildingEvent::show_animation` and `EnchantBuildingEvent::enchant_building` (map L460135) →
`EnchantBuildingCommand` (L460018): subtract 1 spell resource, `spellService.castSpellOnBuilding(spellId, entity.id, _onSpellCasted)`,
dispatch `CastSpellEvent("CastSpellEvent::cast_spell", spellId, entityId)` (L80634); on response
`entitiesModel.updateEntity(createEntityWrapper(vo))`.
Guards (`CanCastSpellOnBuildingGuard` L460198): target base name must be in
`spell.effectConfig.vo.targets`; pet-food targets are excluded for other spells; **EE requires
`entityConfig.get_providedCulture() != 0`**; a building can carry only one spell at a time unless the
same spell (`stackable`). Teleport has its own guard (`CanCastTeleportSpellGuard` L460245).

---

## 5. Fellowships (guilds)

### 5.1 `GuildService` (wire `GuildService`) and `GuildProgressionService` (wire `GuildProgressionService`)

`de.innogames.onyx.shared.guilds.services.GuildService` (L554528, `IGuildService` L19459):

| method | request | args |
|---|---|---|
| `refreshGuild()` | `refreshGuild` `.immediate()` | — (cb = `onRefreshGuild`) |
| `getGuild(guildId, cb)` | `getGuild` `.immediate()` | `[guildId]` → `GuildVO` |
| `getMembershipRequests(cb)` | `getMembershipRequests` `.immediate()` | — → `GuildMembershipRequestVO[]` |
| `createGuild(name, description, allowInvitations, applicationData, banner, cb)` / `editGuild(...)` | `createGuild` / `editGuild` | `[name, description, shapeId, shapeColor, symbolId, symbolColor, allowInvitations, false, applicationData.id]` |
| `disbandGuild(cb)`, `leaveGuild(cb)` | same names | — |
| `kickMember(playerId, cb)`, `changeMemberRole(playerId, role, cb)` | `kickMember`, `changeMemberRole` | |
| `sendApplication(guildId, cb)`, `withdrawApplication(id, cb)`, `acceptApplication(id, cb)`, `rejectApplication(id)` | | |
| `invitePlayer(playerId, cb)`, `disinvitePlayer(invitationId, cb)`, `acceptInvitation(id, cb)`, `declineInvitation(id, cb)` | | |
| `getGuildSuggestions(cb)` | `getGuildSuggestions` | `[40]` |
| pushes | `guild_application_accepted`, `guild_role_changed`, `guild_expelled`, `guild_changed`, `refreshGuild` | → `UpdateUserGuildEvent("updateUserGuild", Guild)`, `GuildPushResponseEvent::applicationAccepted/memberExpelled`, `UpdateUserGuildInfoEvent("updateUserGuildInfo")` |

`GuildProgressionService` (L554498, `IGuildProgressionService` L55066): `getPerks()` → `getOverview`;
`upgradePerk(perkType, xpLevel)`; `resetAllPerks()` → `resetPerks`; push → `UpdateGuildProgressionEvent::update`
(`{guildXP, resetPrice, guildLevel}`, perks). `GuildProgressionVO` (L531214: `guildXP, resetPrice,
guildLevel, perks[]`), `PerkVO` (L534398: `perkId, level, upgradePrice, rewardAmount, rewardAmountNextLevel`),
`GuildProgressionModel` (L554194), `PerkModel` (L554267), `Perk` (L554221).

### 5.2 VOs and wrappers

`GuildVO` (L531298): `id, name, description, banner (GuildBannerVO L530845: shapeId, shapeColor, symbolId, symbolColor),
members (GuildMembershipVO[]), invitation_allowed, application_allowed, member_acquisition_type, created_at,
applications, invitations, rank, points, fellowship_rank, fellowship_points, trophies[], level`.
`GuildMembershipVO` (L531057): `role_id, rank, score, player (GuildMemberVO), joined_at, hasAncientWonder`.
`GuildMemberVO` (L531019, extends `BasePlayerVO`): + `nhCoolDown, nhBackCountDown, nhBackCountDownBoosted, online`.
`GuildInfoVO` (L530941: `id, name, banner`), `GuildExtendedInfoVO` (L530972, +`leaderName`), `GuildRankingVO`
(L531251: `guild_info, member_count, member_acquisition_type` + `RankingVO`), `GuildEventRankingVO`
(L530906: `guildInfo, rewards, guildRank`), `GuildMembershipRequestVO` (L530778: `id, player, guild_info, created_at`),
`GuildInvitationVO` (L530993: `invited_player`), `GuildApplicationVO` (L530817: `rejected, isAccepted`),
`GuildMessageVO` (L531163: `guildId, guild`), `GuildNotificationVO` (L531190: `guild_name`).

Extension `src/inject/local/localProcessGuildData.ts` (`GuildData`, `Member`, `Player`) matches
`GuildVO`/`GuildMembershipVO`/`GuildMemberVO` except it omits `applications`, `invitations`,
`nhCoolDown` and `nhBackCountDown` (it keeps `nhBackCountDownBoosted` and `online`). Its matcher entry in
`playerSpecificMatchers.ts` is currently commented out.

Wrappers `de.innogames.onyx.shared.guilds.vos.wrappers.*`: `Guild` (L562052: `get_id, get_name,
get_description, get_banner, get_memberships()` (`GuildMembership[]`), `getMembership(playerId)`,
`hasMembership(playerId)`, `get_membershipRequests`, `hasPermission`, `hasRole`, `get_rank`, `get_points`,
`get_level`, `get_trophies`, `get_invitationsAllowed`, `addInvitation`, `hasInvitation`, `removeMembership`),
`GuildMembership` (L562422: `get_player()` (`GuildMember`), `get_roleId, get_rank, get_score,
get_hasAncientWonder, get_isMyself`), `GuildMember` (L562356: `get_nhCoolDown/set_, get_nhBackCountDown,
get_nhBackCountDownBoosted, decreaseTimers()`), roles `models.roles.*` (L554330–L554456:
Leader/CoLeader/Ambassador/Member/NoMember).

`models.GuildModel` (L554117, `IGuildModel` L17036): `get_userGuild()/set_`, `hasUserGuild()`,
`get_visitedGuild()`, `get_userMembershipRequests()`; ticks every second to decrease members' NH timers
(`GuildDataUpdatedEvent::nhTimerEnded`, `GuildDataUpdatedEvent::userGuildUpdated / userMembershipsUpdated`, L554070).

### 5.3 Events → commands (`GuildControllerConfiguration` L553946)

`getUserGuild` (event with `get_guildId()`) → `GetUserGuildCommand` (L553490: `service.getGuild(id)`,
exception 5001 → no guild); `getUserMemberships`, `getVisitedGuild` (`UpdateVisitedGuildEvent` L47718),
`updateUserGuild`, `updateUserGuildInfo`, `updateVisitedGuild`, `updateUserMemberships`, `addInvitation`,
`GuildPushResponseEvent::memberExpelled / applicationAccepted`, `get_suggestions`,
`ChangeGuildEvent::createGuild / editGuild`, `disbandGuild`, `showDisbandAlert`, `showDisbandedAlert`,
`ShortcutEvent::openGuildWindow` → `OpenGuildWindowCommand` (L553617; tab constant e.g.
`GuildWindowTab_REQUESTS`), `StartGuildMemberNeighborlyHelpCoolDownEvent::start` (L553810),
`ChangeGuildRoleEvent/changeRole`, `invitePlayer`, `showLeaveAlert`, `leaveGuild`,
`ExpelPlayerEvent/EXPEL_PLAYER`, `SendGuildApplicationEvent::sendApplication`, `SendJoinGuildEvent::join`,
`MembershipRequestEvent::accept/reject`, `CandidateRequestEvent::accept/reject`,
`PerkEvent::getPerks / upgradePerk / resetAllPerks`, `UpdateGuildProgressionEvent::update`.
The fellowship window UI lives in `views.guildwindow.*` / `views.tabbodies.*` (members tab renderers
carry the NH-cooldown tooltip `ElementHandlerNeighborlyHelpCooldown` L559393 and the per-member
"show AWs" button that dispatches `AncientWondersDataEvent::showOtherPlayerAncientWonders`, L558994).

### 5.4 Fellowship Adventures = `de.innogames.onyx.multiplayer.*`

Not in `shared.guilds`. The 140-class `de.innogames.onyx.multiplayer` package is the FA module
(`ApplicationModuleName.MULTIPLAYER`): `MultiplayerService` (L520809, wire **`MultiplayerEventService`**:
`getOverview`, `openWaypoint(waypointId)`, `collectStageReward`, `selectPath(path)`; pushes
`updateOverview` → `MultiplayerModelMultiplayerEvent::updateModelMultiplayer`, `updateWaypoints` →
`MultiplayerModelWaypointsEvent::updateModelWaypoints`, `unlockStageRewards`, `getMultiplayerEventReward`
→ `MultiplayerRewardEvent::showRewards`, `updateContributors` → `MultiplayerModelContributionEvent`),
`models.MultiplayerModel` (L520666), `data.Multiplayer` (L519938), `data.waypoints.Waypoint` (L520221),
`data.stageRewards.StageReward` (L520180), `view.map.MultiplayerMapView(Mediator)` (waypoint buttons),
`view.waypointwindow.WaypointWindow(Mediator)` (pay-in renderers, contribution table),
`view.stagerewardwindow.*`, `view.ranking.MultiplayerRankingWindow` (uses `AbstractRankingBodyMediator`,
category `guild_event`), `hud.*`. `MultiplayerEventContributionVO` (L533457). Details of the FA economy
(waypoint pay-ins, chests) belong to `11-events-economy-misc.md`; the extension already snoops
`MultiplayerEventService/updateWaypoints` and `updateOverview` (`playerSpecificMatchers.ts`, models
`src/model/faOverview.ts`, `FAWaypointData.ts`, `faStageProgress.ts`).

---

## 6. Rankings

### 6.1 `RankingService` (wire `RankingService`)

`de.innogames.onyx.shared.ranking.service.RankingService` (L574174, `IRankingService` L36449).

| method | request | args | note |
|---|---|---|---|
| `accessRanking(category, id)` | `accessRanking` (queued) | `[category.name, 8, id]` | "show me the page containing player/guild `id`" (page size 8) |
| `getRankingList(category, pageIndex, filterString="", filterType="")` | `getRankingList` (queued) | `[category.name, pageIndex, 8, filterString, filterType]` | page `pageIndex` (0-based) |
| `getRankingOverview(playerId, cb)` | `getRankingOverview` `.immediate()` | `[playerId]` | cb: `RankingOverviewVO[]` (L535831: `category, score`) |
| pushes `accessRanking`, `getRankingList` | | `RankingListVO` | → `UpdateRankingModelEvent::updateRankings` (`RankingList` L574098) |
| push `newRank` | | ranking VO | → `PlayerRankingEvent::newRankReceived` → `UpdatePlayerRankCommand` (L573535, `userModel.set_ranking`) |

`RankingCategory` (L416143, names at L782580ff): `tournament, player, guild, guild_event,
previous_guild_event, spire, previous_spire, none`. `RankingFilterType` (L573579): `name`, `guild_application`.
`RankingListVO` (L535795): `length` (total entries), `rankings[]`, `pageIndex`, `category`.
`RankingVO` (L530879: `rank, points`); `PlayerRankingVO` (L534572: + `player` (PlayerVO), `guildInfo`
(GuildInfoVO/GuildExtendedInfoVO)); `TournamentRankingVO` (L540281, +`reward`); `GuildRankingVO` (§5.2);
`SpireRankingVO` (L538617: `guildId, orbs, players[]` of `SpirePlayerRankingVO` L538558: `playerId,
guildContribution, progress[]`) — spire rankings use `SpireRankingService` (L619797), see 08.
Extension `src/model/rankingData.ts` (`ResponseData: length, rankings[rank, points, player, guildInfo],
pageIndex, category`) matches `RankingListVO`/`PlayerRankingVO`; `localProcessRankingsData.ts` snoops
`RankingService/getRankingList` and calls `getOtherPlayerAncientWonders` for each `PlayerRankingVO.player.player_id`
(dropping the 9th entry when a page has 9 rows: the client asks for 8, so a 9th row is the requester's own).

Model: `models.RankingModel` (L573728, `IRankingModel` L13741): per category `setPageCount`,
`setPageIndex/getPageIndex`, `getPageCount`, `clearRankings`, `addRanking`, `getRankingPage(category, index)`
(`RankingPage` L573811 / `EmptyRankingPage` L573613), `setRank`; `UpdateRankingModelCommand` (L573550) fills
it (`pageCount = ceil(length / 8)`) and dispatches `UpdateRankingEvent::rankingUpdated(category)` (L573585).

Events → commands (L390415–L390419): `RankingRequestEvent::accessRanking` → `AccessRankingCommand` (L573490),
`RankingRequestEvent::getRanking` → `GetRankingCommand` (L573502), `RankingOverviewEvent::getRankingOverview` →
`GetRankingOverviewCommand` (L573514), `PlayerRankingEvent::newRankReceived`, `UpdateRankingModelEvent::updateRankings`.
`RankingRequestEvent(eventType, category, pageIndex, id, filterString, filterType)` (L36480).
`ShortcutEvent::openPlayersRanking` → `OpenPlayersRankingCommand` (map L390005) opens the ranking window.

### 6.2 Ranking bodies and `Pagination`

`views.tabs.tabbodies.AbstractRankingBodyMediator` (L521785): on init `accessRanking(id)`; on the view's
`PaginationEvent/PAGE_INDEX_CHANGED` → `_onPageIndexChanged`: if the model page is empty/partial →
dispatch `RankingRequestEvent::getRanking` for that page, else render from the model. Subclasses:
`PlayerRankingBodyMediator` (L574853, category PLAYER; initial `accessRanking(currentPlayerId)` — the
visited player's id when in OTHER_CITY), `GuildRankingBodyMediator` (L574698), `TournamentRankingBodyMediator`
(L575134), `SpireRankingBodyMediator` (L574959), `MultiplayerPastRankingBodyMediator` (L574793),
`UnlockTechRankingBodyMediator` (L575207). Views: `PlayerRankingBody` (L574829), `GuildRankingBody` (L574627),
`TournamentRankingBody` (L575062), `SpireRankingBody` (L574893), tables `PlayerRankingTable` (L574371) etc.

`de.innogames.onyx.shared.ui.components.pagination.Pagination` (L75946, a `ViewBase`): fields
`pageIndex`, `pageCount`, `wrapPages`; `set_pageIndex(v)` clamps, updates buttons and — when the change
is "internal" (button/typed) — starts a 30 ms timer that dispatches
`PaginationEvent("PaginationEvent/PAGE_INDEX_CHANGED", oldIndex, newIndex)` (`_onDelayComplete` L76171).
Button handlers `_onSelectFirstPage / _onSelectPreviousPage / _onSelectNextPage / _onSelectLastPage` and
`_onPageEntered`; the button display names are `paginationFirstPage/PreviousPage/NextPage/LastPage`.
`_onSelectNextPage(event)` (L76197): `pageIndex+1` (wrapping when `wrapPages`), sets it "internally" →
the mediator's `_onPageIndexChanged` runs → a `getRankingList` request if needed. `parent` is the openfl
display parent (for a ranking tab: the `PlayerRankingBody` instance).

Extension: `src/inject/injectMutate.ts` patches the `Pagination` constructor
(`patchCtorRegistryAssignment(..., 'aviad_pagination')`) so every instance is pushed to
`window.aviad_pagination_a`; `src/inject/local/localNextPage.ts` keeps only instances whose
`parent` proto `__class__.__name__ === 'de.innogames.onyx.shared.ranking.views.tabs.tabbodies.PlayerRankingBody'`
and calls `_onSelectNextPage()` on the last one — i.e. it drives the *real* UI, so the game itself
issues `getRankingList` and the extension's response matcher harvests the page.

---

## 7. Messaging, chat, notifications, profile

### 7.1 `MessageService` (wire `MessageService`)

`de.innogames.onyx.shared.messaging.service.MessageService` (L564842, `IMessageService` L32674).
`MailboxType` (L564830, EnumWrapper): `INBOX`, `OUTBOX` (L784708); `toString()` gives the wire strings
`"inbox"` / `"outbox"`.

| method | request | args | callback |
|---|---|---|---|
| `getMessages(mailboxType, offset, count, cb)` | `fetchMessages` (queued) | `["inbox"\|"outbox", offset, count]` | `MessageListVO` (L532617: `messages[]`, `length`, `folder`) |
| `getMetadata(mailboxType, cb)` | `getMessageOverview` | `["inbox"]` | `MessageMetadataVO` (L532649: `folder`, `metadata` = id → updatedAt) |
| `replyMessage(messageId, message, cb)` | `replyMessage` `.immediate()` | `[messageId, text]` | `MessageConversationPostVO` (L532588: `conversationId`, `messagePost`) |
| `deleteMessage(messageId, cb)` | `deleteMessage` `.immediate()` | `[messageId]` | |
| `markMessageAsRead(messageId, cb)` | `markMessageAsRead` `.immediate()` | `[messageId]` | |
| `sendMessage(recipientName, subject, message, cb)` | `sendMessage` `.immediate()` | **`[recipients, message, subject]`** (note the order) | `MessageVO` |
| `sendGuildMessage(subject, message, cb)` | `sendGuildMessage` `.immediate()` | `[message, subject]` | `MessageVO` |
| `reportPlayer(reportMessage, reportedMessageId, messagePostId)` | `reportPlayer` `.immediate()` | `[messageId, postId, text]` | |

`recipients` is a comma-separated string of player names (`RecipientsMessageField` L565594 splits/joins on
`,`, max 50). `MessageVO` (L531107): `id, subject, initiator (BasePlayerVO), recipients[], status, posts
(MessagePostVO[] L532681: post_id, author, post, is_reported, isIgnored, created_at), created_at, updatedAt`.
`SystemMessageVO` (L539708) extends it (`guestRace, index, description, fontColor`).
Model: `model.MessageModel` (L564435) with two `Mailbox`es (L564349: `get_messages()` sorted by
`updatedAt` desc, `getMessageById`, `addMetadata` creating `VirtualMessage` placeholders,
`isMessageLoaded(index)`), wrappers `model.data.Message` (L564534), `MessagePost` (L564640),
`MessageConversationPost` (L564599).
Commands (map L564019ff): `getMessages` (`GetMessagesCommand` L564087 — loads pages of 5 lazily via
`getMessages(mailbox, offset, count)`), `getMessageMetadata` (L564068), `sendMessage` (`SendMessageCommand`
L564233: guild flag → `sendGuildMessage`), `replyToMessage` (L564204), `readMessage` (`MarkMessageAsReadCommand`
L564153 + `ReadMessageCommand` L564175), `removeMessage` (L564187), `messageSentAlertWindow`, `showReportPlayerWindowNew`.
Windows: `view.MessageWindow(Mediator)` (L564944), tabs inbox/outbox/new (`view.mailboxes.*`),
`SetMessageRecipientEvent("setRecipient", name)` (L564330) pre-fills the compose tab (used by the
other-city "sendMessage" player-panel button, `HandlePlayerPanelButtonClickBehavior` L602796).
No push responses on this service; new-mail indicators come from notifications / the message
indicator (`ClearIndicatorEvent::clear "messages"`).
Extension: matchers for `MessageService/getMessageOverview, fetchMessages, markMessageAsRead, replyMessage`
in `playerSpecificMatchers.ts`; model `src/model/gameMessage.ts` (`MessageFolder = 'inbox' | 'outbox'`).

### 7.2 Chat (websocket, not RPC)

`de.innogames.onyx.city.chat.*` — chat is a socket-server plugin driven through the JS bridge
`ExternalUtil.evaluate("socket.send", [...])` (04 covers the websocket): `GetChatHistoryCommand`
(L385232) sends `["chat/rpc","get-history", roomId, {maxMessages:100}, playerId]`,
`SendChatMessageCommand` (L385279) sends `["chat","send", roomId, {message}]` (or `["chat","who", roomId, {}, playerId]`
for `/who`), `ReadChatRoomCommand` (L385263) `["chat/markasread","update", roomId, {}, playerId]`.
Incoming frames are handled by `processors.*` (`ChatConnectedProcessor` L385702, `ChatHistoryProcessor`
L385728, `ChatSendProcessor` L385863, `UserJoinedProcessor`, `UserLeftProcessor`, `WhoOnlineChatProcessor`,
`ChatUpdateMetadataProcessor`; method names in `ChatPluginMethods` L385603/L782231: `connected, user-left,
user-joined, get-history, send, update-other-user-metadata, who`) into `model.ChatModel` (L385447,
`ChatRoom` L385627 / `ChatMessage` L385554). Extension: `src/model/socketMessages/*` types the frames
(`chat/rpc/get-history`, `chat/who`, `chat/send`) and `src/inject/customWebSocket.ts` passes chat frames
through untouched.

### 7.3 `NotificationService` (wire `NotificationService`)

`de.innogames.onyx.city.service.NotificationService` (L458794, `INotificationService` L32645):
`getAllNotifications(cb)` → `getAllNotifications`; `getNotificationPreviews(playerId, cb)` →
`getPreviewNotifications [playerId]`; `cleanPendingNotifications(scope, cb)` (`scope` e.g.
`"ancient_wonder"`, `"spire_ancient_wonder"`); push `getGlobalNotifications` → `message.showWarning`
toasts. Commands: `getNotifications` → `GetNotificationsCommand` (L456275) → `NotificationEvent("notificationsLoaded")`,
`getNotificationPreviews`, `SetPlayerNotificationStateEvent::setState` (map L390449–L390451). Notification VOs all
extend `AbstractNotificationVO` (`id, other_player, type, is_read, visit_state, timestamp`): NH (§2.4),
`AncientWonderResearchContributedNotificationVO` (L524805: `entityId, entityName, knowledgePoints`),
`AncientWonderResearchFinishedNotificationVO` (L524835), `TradeAcceptedNotificationVO`, `BattleNotificationVO`,
`GuildNotificationVO`, `RewardCollectedNotificationVO`, `TournamentNotificationVO`, … Notification rows
offer "visit" / "visit & help back" extensions (`view.extensions.player.*`) and "open AW"
(`OpenAncientWonderWindowExtension`). Extension already snoops both `getAllNotifications` and
`getPreviewNotifications` requests.

### 7.4 `PlayerProfileService` (wire `PlayerProfileService`)

`de.innogames.strategycity.main.service.PlayerProfileService` (L61111): `setCityName(name)`,
`setPortraitId(portraitId)`, `setEmailOptin(bool)`; pushes `getUnlockedAvatars` / `getAllUnlockedAvatars`
→ portrait model. Profile window: `de.innogames.onyx.shared.ui.windows.profile.*`
(`PlayerProfileWindowEvent("open")`). There is no "neighbourhood list" service here — neighbours come
from the world map (`WorldMapService.getDiscoveredPlayerProvinces`, see 07; the extension's
`src/inject/local/fetchWorldNeighbors.ts`), fellows from `GuildService.getGuild`, everyone else from rankings.

### 7.5 `de.innogames.onyx.help.*` (27 classes)

In-game *help/info* windows (the "?" button: `ShowHelpWindowEvent("ShowHelpWindowEvent::show", type, id)`
(L17935) → `ShowHelpWindowCommand` L517389, `HelpDataModel` L517830 with `HelpTabData`/`HelpRuleData`
from static data) — nothing to do with neighbourly help.

---

## 8. Cross-check of extension field names against the game VOs

| extension file | game VO | verdict |
|---|---|---|
| `src/model/otherPlayer.ts` `OtherPlayerClass` | `OtherPlayerVO`/`PlayerVO` | OK (subset; `score`, `next_interaction_in`, `next_help_back_in`, `is_active`, `profile_text` also exist) |
| `src/model/neighbourHelpBuildings.ts` `NeighbourHelpData` | `PlayerNeighbourlyHelpVO` | OK; missing `guildXPReward`, `buildings[].stage` |
| `src/model/ancientWonderPhase.ts` | `ResearchPhaseVO`, `RunesPhaseVO`, `ResearchContributionVO`, … | exact |
| `src/model/rankingData.ts` | `RankingListVO`, `PlayerRankingVO`, `RankingVO` | exact |
| `src/inject/local/localProcessGuildData.ts` `GuildData/Member/Player` | `GuildVO`, `GuildMembershipVO`, `GuildMemberVO` | OK; missing `applications`, `invitations`, `nhCoolDown`, `nhBackCountDown` |
| `src/inject/aviad.ts` `NeighborlyHelpService.performAction(…, callback)` | `performAction(action, entityId, playerId)` | extra arg ignored by the Feb-2026 client (no callback there) |
| `src/inject/aviad.ts` `LoadType.LOAD_ONLY(baseName, type)` | `LOAD_ONLY(ancientWonderId, baseName)` | parameter names misleading; call sites pass the right order |
| `playerSpecificMatchers.ts` request/response class names | `serviceName` strings | all match (`NeighbourlyHelpService` is not matched anywhere yet — `performHelp` responses are not captured) |

---

## 9. Recipes

All snippets assume the injected MAIN-world context (`window.aviad`, `window.aviad_enum`,
`window.aviad_am`) — see 06. `own` = own player id
(`injector.getInstance(A['de.innogames.onyx.shared.models.IUserModel']).get_playerId()`, `IUserModel` L10568;
also in startup data, see 12). Events can be dispatched into the city context with
`window.aviad_am.eventDispatcher.dispatchEvent(evt)` (`ApplicationModel` L10650 extends `BaseActor` L8798,
which carries the injected `eventDispatcher`).

**R1 — visit a player and return home**
```js
const A = window.aviad, inj = window.aviad_am.injector;
// go
const cmd = inj.getOrCreateNewInstance(A['de.innogames.onyx.city.commands.VisitOtherPlayerCommand']);
cmd.event = new A['de.innogames.strategycity.main.controller.event.OtherPlayerEvent']('OtherPlayerEvent::visitPlayer', playerId);
cmd.execute();                       // → visitPlayer RPC → OTHER_CITY module (poll aviad_am.get_isLoading())
// home (what the "back to city" button / shortcut does)
const back = inj.getOrCreateNewInstance(A['de.innogames.onyx.city.shortcuts.BackToCityCommand']);
back.execute();                      // ModuleChangeEvent::changeModule(OWN_CITY) + OtherPlayerEvent::returnToCity
```
`BackToCityCommand.canExecute()` refuses while `applicationModel.get_isLoading()` or when the current
module is OWN_CITY (index 1) or a BATTLE (index 4) — see L458958. The extension already does the "go" half
(`localVisitPlayer.ts`).

**R2 — help a specific building of a player (no visit needed)**
```js
const nh = new A['de.innogames.onyx.city.service.NeighborlyHelpService']();
// which buildings? (callback gets PlayerNeighbourlyHelpVO: buildings[{entityConfigId, entityId, type, stage}])
new A['de.innogames.onyx.city.service.OtherPlayerService']().getNeighbourlyHelpBuildings(playerId, vo => {
  const b = vo.buildings.find(x => x.type === 'worker_hut');       // or 'main_building' / culture
  const action = b.type === 'main_building' ? 'unlimited_help' : b.type === 'worker_hut' ? 'limited_help' : 'time_limited_help';
  nh.performAction(action, b.entityId, playerId);                   // wire: NeighbourlyHelpService/performHelp
});
// v1.239+: one call, server picks the building from your saved favourites
nh.helpPlayer(playerId, rewards => {/* chest rewards array */});
```
Already implemented: `neighbourlyHelp.ts` / `receivedNeighbourHelpBuildings.ts` / `localHelpPlayer.ts`.
While *inside* a city you can instead dispatch `NeighborlyHelpEvent('NeighborlyHelpEvent::executeAction', actionId, entity)`
on `aviad_am.eventDispatcher` (also updates `helpedState`, guild cooldown, `helpedPlayer` event).

**R3 — cast EE on a wonder (or any culture-providing building you own)**
```js
new A['de.innogames.onyx.shared.spells.services.SpellService']()
  .castSpellOnBuilding('spell_neighborly_help_boost_1', cityEntityId, vo => {/* updated entity VO */});
```
Only your own city; the target must provide culture (`get_providedCulture() != 0`) and be in the
spell's `targets`; you must own ≥ 1 `spell_neighborly_help_boost_1` (the client normally subtracts it
locally first — a direct call leaves the local count stale until the next resources update). Already
implemented: `castEe.ts` / `castEeOncePerSecond.ts`.

**R4 — invest KP in your own / another player's wonder**
```js
const aw = new A['de.innogames.onyx.city.ancientwonders.services.AncientWonderService']();
aw.investKnowledgePoints(own,       'A_Elves_Sanctuary', 5);   // own AW: playerId = own, baseName (no level suffix)
aw.investKnowledgePoints(playerId,  'A_Elves_Sanctuary', 5);   // someone else's AW
aw.investGuildProgressionFreeKp(playerId, 'A_Elves_Sanctuary'); // fellowship free KP (fellows only)
aw.investRuneShards(playerId, 'A_Elves_Sanctuary', 1);          // KP from a spare shard (rate bv_runeshards_kpvalue_others)
```
The request is queued (no `.immediate()`); the server answers with a `phaseUpdated` push
(`ResearchPhaseVO` with the new `investedKnowledgePoints` / `contributions`) which the extension
already snoops. Respect `receiverKpLimit` and `requiredKnowledgePoints - investedKnowledgePoints`
(the UI clamps to `min(ownKP, missing, receiverKpLimit)`); the client does not deduct KP locally when
you bypass `AbstractAncientWonderProgressMediator`. To open the game's own window instead:
`localOpenAw.ts` (`DisplayAncientWonderCommand` + `LoadType.LOAD_ONLY(entityConfigId, baseName)`), or
dispatch `AncientWondersDataEvent::showOtherPlayerAncientWonders` with `LOAD_ALL` for the list window.
Read state first: `aw.getPhase(playerId, entityConfigId).handle(vo => vo.ancientWonderPhases[0])`,
`aw.getPhases(playerId).handle(arr => …)`, or `aw.getOtherPlayerAncientWonders(playerId, vo => …)`
(the last is what `localProcessRankingsData.ts` / `localProcessGuildData.ts` fire per player).
Own contributions with reward tiers: `aw.getContributions().handle(list => …)`.

**R5 — page through rankings**
```js
// (a) drive the UI: with the ranking window open on the Players tab
window.aviad_pagination_a.at(-1)._onSelectNextPage();     // localNextPage.ts (filters parent = PlayerRankingBody)
// (b) go direct (the game will also update its RankingModel because the push handler is on the class):
const rs = new A['de.innogames.onyx.shared.ranking.service.RankingService']();
const cat = A['de.innogames.onyx.shared.ranking.constants.RankingCategory'].PLAYER;
rs.getRankingList(cat, pageIndex);           // args become ["player", pageIndex, 8, "", ""]
rs.accessRanking(cat, playerId);             // the page that contains playerId
rs.getRankingList(cat, 0, 'Name', 'name');   // search by name
```
Responses come back as `RankingListVO` on the `getRankingList` push (`length` = total, so pages =
`ceil(length/8)`); the extension's `RankingService/getRankingList` matcher already harvests them.

**R6 — read the fellowship member list**
```js
new A['de.innogames.onyx.shared.guilds.services.GuildService']().getGuild(guildId, guildVO => {
  guildVO.members.forEach(m => [m.player.player_id, m.player.name, m.player.nhCoolDown, m.role_id, m.score, m.hasAncientWonder]);
});
// or from the model without a request:
const gm = inj.getInstance(A['de.innogames.onyx.shared.guilds.models.IGuildModel']);
gm.hasUserGuild() && gm.get_userGuild().get_memberships().map(ms => ms.get_player().get_id());
```
`guildId` = `PlayerVO.guild_info.id` of the user (startup data, see 12). `localProcessGuildData.ts`
already parses this response.

**R7 — send / read a message**
```js
const ms = new A['de.innogames.onyx.shared.messaging.service.MessageService']();
const INBOX = A['de.innogames.onyx.shared.messaging.service.MailboxType'].INBOX;   // toString() → "inbox"
ms.getMetadata(INBOX, meta => {/* meta.metadata: id -> updatedAt */});
ms.getMessages(INBOX, 0, 20, list => {/* list.messages: MessageVO[] */});
ms.markMessageAsRead(messageId, () => {});
ms.replyMessage(messageId, 'text', post => {});
ms.sendMessage('Name1,Name2', 'subject', 'body', vo => {});   // wire order [recipients, body, subject]
ms.sendGuildMessage('subject', 'body', vo => {});
```
The extension currently only listens (`getMessageOverview`, `fetchMessages`, `markMessageAsRead`, `replyMessage`).

---

## Open questions / not verified

- `helpPlayer` / `helpAllGuildMembers` / `getNeighbourlyHelpRewards` / `NeighbourlyHelpFavouritesService`
  were read only from the minified July 2026 bundle; their response shapes (rewards array,
  `{primary, secondary}` favourites) are inferred from callers, not from VO classes. Which exact game
  version introduced them (the extension says 1.239) is not confirmed from the bundles.
- `performAction`'s server response was never inspected (the client passes no callback); the extension
  has no matcher for `NeighbourlyHelpService/performHelp`.
- `AncientWonderService.getPhases(playerId)` response type is assumed to be a plain phase VO array
  (`UpdateAncientWonderDataCommand.update` treats it so).
- The `LOAD_ALL` branch of `DisplayAncientWonderCommand` is a no-op in this build (`case 0: break;`) —
  the command then never releases; probably never dispatched with LOAD_ALL.
- Whether calling `AncientWonderService.investKnowledgePoints` directly (without the local KP
  subtraction the mediator does) desynchronises the KP display until the next resource push was not
  observed at runtime.
- The `updateEntityCultureEffect(playerId)` RPC has no callers found in the snapshot.
- Chat frame formats are documented from the extension's own types (`src/model/socketMessages`), not
  re-derived from the processors.
