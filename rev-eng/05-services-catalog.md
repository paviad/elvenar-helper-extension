# 05 — Services catalog: every network service class and the server RPCs it exposes

## Scope

This file is the reference table for the **83 network service classes** of the compiled Elvenar
web client (snapshot `tmp/elvenar-release-full-reveng.js`, Feb 12 2026): the abstract base
`de.innogames.shared.networking.AbstractConnectionService` (L13101) plus its 82 concrete
subclasses. For each one it lists the FQ class name and line range, the **wire `serviceName`**
(what appears as `requestClass` in HTTP/websocket traffic), interfaces, injector mapping, every
request-building method (`method(args)` → wire `requestMethod` + `requestData` array shape,
`immediate()`, callback / future, `parseLastResponse` / `handleOnlyLastPushResponses`), and every
**push listener** the class registers (`addPushResponseListener` / `addSafePushResponse` — the
`requestMethod`s the server can push *to* that service). It was built from
`rev-eng/index/services-raw.md` (mechanical extraction) plus a full read of every service body
(`sed -n` over each class range) and of the first game-side caller of every callback-taking
method (to name the response VO / wrapper).

It does **not** describe the transport (JSON provider, HTTP endpoint, websocket, `requestId`
bookkeeping) — see `04-networking-layer.md` — nor the domain models the responses feed — see
`07`–`12`. Extension hook recipes are in `06-extension-hooks-and-recipes.md`; here every method
the extension already invokes or observes is simply marked ✅/👁 with the file.

---

## 0. How to read this file

### 0.1 The request builder (recap; details in `04-networking-layer.md`)

Every service method builds a request the same way
(`de.innogames.networking.services.NetConnectionService.request` (L12908) →
`de.innogames.networking.services.ServerRequestBuilder` (L139530)):

```js
this.request("<requestMethod>")      // serviceName comes from this.get_serviceName()
    .withData([arg0, arg1, ...])     // → requestData (default [])
    .withCallback(cb)                // cb(responseData) when the answer arrives (per-instance!)
    .immediate()                     // send now instead of batching (default false)
    .parseLastResponse()             // ignore answers of older in-flight requests to the same method
    .handleOnlyLastPushResponses(["CityResourcesService.getResources"]) // drop stale pushes of that key
    .call();                         // or .callWithFuture([eager]) → tink_core Future of responseData
```

* **`(complex)` in `services-raw.md` means `callWithFuture()`** in every single case (63 methods,
  almost all in the newer `de.innogames.onyx.networking.services.*` package plus a few
  spire/AW/cauldron/in-game-shop ones). `callWithFuture(eager)` (L139603) wraps `call()` in a
  `tink_core` `Future`; the callback slot is replaced by the future's trigger, so the future
  resolves with `responseData`. Callers use `.handle(fn)` or `tink_core_Future.map(...)`.
* **Callbacks receive `response.get_result()` = the `responseData` field** of the wire response
  (`NetConnectionService.processResponse` (L12801)). If the JSON carries `__class__` markers the
  provider has already turned those objects into VO instances (`de.innogames.onyx.networking.vos.*`).
* **Push listeners** (`addPushResponseListener(name, cb)` = `addResponseListener` (L12798/L12947)) fire
  for **every** response whose `requestMethod == name` addressed to this `serviceName`, whether it
  is a reply to this client's own request or an unsolicited server push (both are delivered through
  the same `ServiceRegistry.process` (L139981)). `addSafePushResponse` is the same thing with a
  typed string constant (`de.innogames.networking.services.SafeResponse` (L139523) is an abstract
  over `String`). A listener name of `"*"` receives every response of the service (L12819).
* Argument **order on the wire is not always the method's order** — several methods swap
  `(rowIndex, columnIndex)` → `[columnIndex, rowIndex]` (= `[r, q]`, see §0.3); `sendMessage(recipient,
  subject, message)` → `[recipient, message, subject]`; `clearIndicator(indicatorId, categoryId)`
  → `[categoryId, indicatorId]`; `updatePassword(password, newPassword)` → `[newPassword, password]`.
  The tables below always show the **wire** order.

### 0.2 Getting hold of a service instance (and why callbacks may never fire)

* Services are Robotlegs singletons; `AbstractConnectionService.postConstruct()` (L13112)
  registers the instance in `de.innogames.networking.services.registries.ServiceRegistry`
  (L139953) keyed by **wire serviceName**. Only registered instances get `processResponse()`
  called (`ServiceRegistry.process` (L139981)), so only they run `withCallback` callbacks and push
  listeners.
* **`new Ctor()` from the extension (`window.aviad['de...Service']`) creates an unregistered
  instance**: `request(...).call()` still goes out on the wire (the provider is a static registry,
  `NetConnectionService.executeRequest` (L12911)), but its `withCallback` callback is stored in
  *that* instance's `_requestCallbacks` and **is never invoked**. The game's registered singleton
  of the same wire name still sees the answer through its push listeners (e.g.
  `WorldMapService.updateProvince`). This is exactly how the extension works today: every
  `console.log` callback in `src/inject/local/tourny.ts` / `src/inject/local/neighbourlyHelp.ts`
  is dead code and the real result is read from the XHR/websocket interceptor (`R:<class>/<method>`
  keys, §2). Methods that use `$bind(this, this._onX)` internally (e.g.
  `TournamentService.getTournamentProgress`) would even throw on a fresh instance if the callback
  ever ran, because `eventDispatcher`/injected models are null.
* To get the **live** instance (callbacks and push listeners working, injected models filled),
  resolve it through the injector using the key it was mapped with (column "injector key" in each
  service block): `window.aviad_am.injector.getInstance(window.aviad['<injector key FQ name>'])`
  (`aviad_am` = `de.innogames.onyx.city.model.ApplicationModel`, `src/inject/aviad.ts` L38; the
  typings there expose only `getOrCreateNewInstance`, but the Robotlegs injector also has
  `getInstance` / `hasMapping` — see `03-bootstrap-di-commands-events.md`). Mappings are of two
  kinds: `injector.map(X).asSingleton(true)` (key = the class itself) or
  `injector.map(IX).toSingleton(X, true)` (key = the **interface**; asking the injector for the
  class instead yields a fresh unregistered instance).
* Several **wire names are shared by two or three classes** (`BattleService`, `CraftService`,
  `SpireDiplomacyService`, `SpireService`, `TournamentService`). All registered instances with that
  name receive every response for it; each only reacts to the `requestMethod`s it listens to.

### 0.3 Legend

* ✅ = the extension already **calls** this method (file named). 👁 = the extension already
  **observes** this RPC's request (`Q:`) or response (`R:`) via `src/inject/playerSpecificMatchers.ts`.
* "imm." = `.immediate()`. "cb" = takes a callback (last arg unless noted). "future" = returns a
  `tink_core` Future (`callWithFuture`). "PLR" = `parseLastResponse()`. "—" = fire-and-forget.
* `q`/`r` = the province VO's axial hex fields. **`rowIndex` = `q`, `columnIndex` = `r`** — every province
  wrapper is built as `Province.call(this, vo.q, vo.r)` with signature `(rowIndex, columnIndex)` (L646974,
  L647034, L647110) and `WorldMapModel.getProvinceAt(rowIndex, columnIndex)` is called with `(vo.q, vo.r)`
  (L647716). So the wire order `[columnIndex, rowIndex]` used by all map RPCs is **`[r, q]`**.
* "injector key" = the class you pass to `injector.getInstance(...)` to get the registered instance.

---

## 1. Wire `serviceName` → class (alphabetical by wire name)

76 distinct wire names, 82 concrete classes. When you see `requestClass: "X"` in traffic, look
X up here; when two classes share a name both are listed.

| wire `requestClass` | class (FQ) | lines | section |
|---|---|---|---|
| AbsolutionService | `de.innogames.onyx.networking.services.AbsolutionService` | L57398-L57417 | §9 |
| AncientWonderService | `de.innogames.onyx.city.ancientwonders.services.AncientWonderService` | L21107-L21163 | §6 |
| ArmyService | `de.innogames.strategycity.shared.service.ArmyService` | L666485-L666515 | §4 |
| BattleService | `de.innogames.onyx.battle.services.BattleService` | L361363-L361384 | §4 |
| BattleService | `de.innogames.onyx.city.services.BattleRetreatService` | L458817-L458832 | §4 |
| BattlefieldService | `de.innogames.onyx.worldmap.service.WorldMapBattleService` | L647616-L647643 | §4 |
| CallbackService | `de.innogames.onyx.shared.service.CallbackService` | L579406-L579421 | §9 |
| CashShopService | `de.innogames.onyx.networking.services.CashShopService` | L37187-L37212 | §8 |
| CauldronService | `de.innogames.onyx.city.ui.windows.academy.cauldron.services.CauldronService` | L481454-L481497 | §8 |
| ChallengeEventService | `de.innogames.onyx.city.challengeevents.services.ChallengeEventService` | L383965-L383981 | §7 |
| ChestsService | `de.innogames.onyx.chests.services.ChestsService` | L370997-L371053 | §7 |
| CityInformationService | `de.innogames.onyx.city.service.CityInformationService` | L66840-L66858 | §3 |
| CityMapService | `de.innogames.onyx.city.services.CityMapService` | L458833-L458921 | §3 |
| CityProductionService | `de.innogames.strategycity.main.service.CityProductionService` | L13124-L13204 | §3 |
| CityResearchService | `de.innogames.onyx.techtree.service.CityResearchService` | L632679-L632694 | §3 |
| CityResourcesService | `de.innogames.onyx.resources.service.ResourcesService` | L42743-L42798 | §3 |
| CmpService | `de.innogames.onyx.cmp.services.CmpService` | L512187-L512204 | §9 |
| CraftService | `de.innogames.onyx.city.ui.windows.academy.crafting.services.CraftService` | L36706-L36752 | §8 |
| CraftService | `de.innogames.onyx.networking.services.CraftService` | L523796-L523842 | §8 |
| Crm3Service | `de.innogames.onyx.city.crm3.services.CRMService` | L36917-L36966 | §9 |
| DisenchantService | `de.innogames.onyx.city.inventoryitems.service.DisenchantService` | L49659-L49676 | §8 |
| EffectsService | `de.innogames.onyx.networking.services.EffectsService` | L68944-L68966 | §3 |
| EpisodicRewardsService | `de.innogames.onyx.shared.rewards.services.EpisodicRewardsService` | L576954-L576973 | §7 |
| EventLeagueService | `de.innogames.onyx.city.mainevents.eventleague.services.EventLeagueService` | L423612-L423635 | §7 |
| ExceptionService | `de.innogames.onyx.shared.exceptions.ExceptionService` | L550673-L550692 | §9 |
| FeaturesService | `de.innogames.onyx.networking.services.FeaturesService` | L523852-L523871 | §9 |
| GoldMineService | `de.innogames.onyx.miners.service.GoldMineService` | L519450-L519465 | §4 |
| GuardianService | `de.innogames.onyx.networking.services.GuardianService` | L523884-L523912 | §3 |
| GuildProgressionService | `de.innogames.onyx.shared.guilds.services.GuildProgressionService` | L554494-L554519 | §6 |
| GuildService | `de.innogames.onyx.shared.guilds.services.GuildService` | L554520-L554633 | §6 |
| InGameOfferService | `de.innogames.onyx.city.ingameshop.services.InGameShopService` | L51390-L51411 | §8 |
| IndicatorsService | `de.innogames.onyx.shared.indicators.services.IndicatorsService` | L563048-L563076 | §9 |
| InventoryService | `de.innogames.onyx.city.inventoryitems.service.InventoryService` | L416999-L417036 | §8 |
| LogService | `de.innogames.onyx.networking.services.LogService` | L31228-L31292 | §9 |
| ManifestService | `de.innogames.onyx.networking.services.ManifestService` | L15476-L15495 | §9 |
| MerchantService | `de.innogames.onyx.city.trade.services.MerchantService` | L462247-L462275 | §8 |
| MergeEventService | `de.innogames.onyx.city.mainevents.shared.services.MergeEventService` | L23179-L23224 | §7 |
| MessageService | `de.innogames.onyx.shared.messaging.service.MessageService` | L564839-L564875 | §6 |
| MultiplayerEventService | `de.innogames.onyx.multiplayer.services.MultiplayerService` | L520801-L520854 | §7 |
| NeighbourlyHelpService | `de.innogames.onyx.city.service.NeighborlyHelpService` | L458768-L458789 | §6 |
| NewsService | `de.innogames.strategycity.main.service.NewsService` | L84524-L84564 | §9 |
| NotificationService | `de.innogames.onyx.city.service.NotificationService` | L458790-L458816 | §6 |
| OfferService | `de.innogames.onyx.city.offers.services.OfferService` | L457719-L457738 | §8 |
| OtherPlayerService | `de.innogames.onyx.city.service.OtherPlayerService` | L14496-L14519 | §6 |
| PlayerProfileService | `de.innogames.strategycity.main.service.PlayerProfileService` | L61106-L61158 | §9 |
| PostStartupService | `de.innogames.strategycity.main.service.PostStartupService` | L44710-L44724 | §9 |
| QuestMilestoneService | `de.innogames.onyx.shared.quests.services.QuestMilestoneService` | L52834-L52852 | §7 |
| QuestService | `de.innogames.onyx.shared.quests.services.QuestDataService` | L570864-L570893 | §7 |
| RankingService | `de.innogames.onyx.shared.ranking.service.RankingService` | L574168-L574207 | §6 |
| RelicService | `de.innogames.strategycity.main.service.RelicService` | L665405-L665425 | §3 |
| ResearchService | `de.innogames.onyx.techtree.service.TechnologyService` | L632695-L632725 | §3 |
| RewardSelectionKitService | `de.innogames.onyx.networking.services.RewardSelectionKitService` | L49908-L49927 | §8 |
| RoyalPassService | `de.innogames.onyx.city.mainevents.royalpass.services.RoyalPassService` | L427263-L427291 | §7 |
| SeasonPassService | `de.innogames.onyx.city.mainevents.seasonpass.services.SeasonPassService` | L80075-L80100 | §7 |
| SeasonalEventsService | `de.innogames.onyx.seasonalevents.services.SeasonalEventsService` | L545993-L546021 | §7 |
| SettingsService | `de.innogames.strategycity.main.service.SettingsService` | L665426-L665485 | §9 |
| ShuffleEventService | `de.innogames.onyx.city.mainevents.shared.services.ShuffleEventService` | L444320-L444345 | §7 |
| SpellService | `de.innogames.onyx.shared.spells.services.SpellService` | L580451-L580469 | §6 |
| SpireBattleService | `de.innogames.onyx.spire.service.SpireBattleService` | L22575-L22610 | §5 |
| SpireDiplomacyService | `de.innogames.onyx.spire.service.SpireDiplomacyService` | L21010-L21033 | §5 |
| SpireDiplomacyService | `de.innogames.onyx.city.services.DiplomacyCancelService` | L50001-L50015 | §5 |
| SpireEffectService | `de.innogames.onyx.networking.services.SpireEffectService` | L523961-L523986 | §5 |
| SpireRankingService | `de.innogames.onyx.spire.service.SpireRankingService` | L619797-L619815 | §5 |
| SpireRoundsService | `de.innogames.onyx.spire.service.SpireRoundsService` | L619816-L619830 | §5 |
| SpireService | `de.innogames.onyx.spire.service.SpireService` | L24590-L24636 | §5 |
| SpireService | `de.innogames.onyx.networking.services.SpireService` | L523987-L524030 | §5 |
| SpireService | `de.innogames.onyx.spire.services.SpireService` | L619831-L619846 | §5 |
| SpireShopService | `de.innogames.onyx.networking.services.SpireShopService` | L524031-L524053 | §5 |
| SpireStateService | `de.innogames.onyx.spire.service.SpireStateService` | L58690-L58708 | §5 |
| StartupService | `de.innogames.onyx.networking.services.StartupService` | L17105-L17127 | §9 |
| SupportService | `de.innogames.onyx.networking.services.SupportService` | L69208-L69230 | §9 |
| TileEventService | `de.innogames.onyx.city.mainevents.shared.services.TileEventService` | L444346-L444401 | §7 |
| TournamentService | `de.innogames.onyx.tournaments.services.TournamentService` | L638942-L638968 | §4 |
| TournamentService | `de.innogames.onyx.tournaments.services.WorldMapTournamentService` | L51465-L51502 | §4 |
| TradeService | `de.innogames.onyx.city.trade.services.TradeService` | L462276-L462309 | §8 |
| TranscendenceService | `de.innogames.onyx.networking.services.TranscendenceService` | L524054-L524076 | §3 |
| TreasureService | `de.innogames.onyx.networking.services.TreasureService` | L80840-L80865 | §7 |
| UnlockEncounterService | `de.innogames.onyx.worldmap.service.UnlockEncounterService` | L647597-L647615 | §4 |
| ValueManipulationService | `de.innogames.onyx.valuemanipulation.services.ValueManipulationService` | L642601-L642626 | §9 |
| VideoAdService | `de.innogames.onyx.videoads.services.VideoAdService` | L643681-L643714 | §9 |
| WorldMapScoutService | `de.innogames.onyx.worldmap.service.ScoutingService` | L647559-L647596 | §4 |
| WorldMapService | `de.innogames.onyx.worldmap.service.WorldMapService` | L647644-L647731 | §4 |

Naming traps (class ≠ wire name): `NeighborlyHelpService` → `NeighbourlyHelpService`;
`ResourcesService` → `CityResourcesService`; `TechnologyService` → `ResearchService`;
`QuestDataService` → `QuestService`; `MultiplayerService` → `MultiplayerEventService`;
`InGameShopService` → `InGameOfferService`; `CRMService` → `Crm3Service`; `ScoutingService` →
`WorldMapScoutService`; `WorldMapBattleService` → `BattlefieldService`; `WorldMapTournamentService`
→ `TournamentService`; `BattleRetreatService` → `BattleService`; `DiplomacyCancelService` →
`SpireDiplomacyService`.

---

## 2. What the extension already observes (`Q:` / `R:` keys)

The MAIN-world interceptor (`src/inject/xhrInterceptor.ts` L82, `src/inject/socketResponses.ts`
L40) matches every request/response against `src/inject/playerSpecificMatchers.ts`. A
`requestSelector` match is forwarded to the service worker as `Q:<requestClass>/<requestMethod>`
(payload = the whole request plus all responses in that HTTP batch), a `responseSelector` match as
`R:<requestClass>/<requestMethod>` (payload = that single response) —
`src/chrome/aggregateRequestResponse.ts` L37-L67. `src/service-worker/playerSpecificRequestHandler.ts`
L135-L184 maps those keys to processors. Matchers with a `local:` handler are consumed inside the
page and not forwarded.

Currently matched keys (as they appear on the wire):

| key | note |
|---|---|
| `Q:NotificationService/getAllNotifications`, `Q:NotificationService/getPreviewNotifications` | |
| `Q:StartupService/getData` | the whole startup payload |
| `Q:InventoryService/getItems` | |
| `Q:TradeService/getOtherPlayersTrades` | |
| `Q:CauldronService/getIngredients`, `Q:CauldronService/getPotionEffects` | matched; processors commented out |
| `Q:OtherPlayerService/visitPlayer`, `R:OtherPlayerService/visitPlayer` (local `localTrapVisitPlayer`) | |
| `R:CityResourcesService/getResources` | push |
| `R:InventoryService/updateItems` | push |
| `Q:SpireService/getEncounter` | |
| `R:SpireDiplomacyService/getData`, `R:SpireDiplomacyService/submit` (local `localProcessSpireDiplomacyGetData`), `Q:SpireDiplomacyService/submit` | |
| `R:SeasonalEventsService/getEvents` | push |
| `R:CityMapService/reset` | push |
| `R:TranscendenceService/allBuildingsStates` | push (game registers it via `addSafePushResponse`) |
| `R:EffectsService/update` | push |
| `R:QuestService/getUpdates`, `R:QuestMilestoneService/updateQuestMilestone` | push |
| `R:MultiplayerEventService/updateWaypoints`, `R:MultiplayerEventService/updateOverview`, `R:ChestsService/updateChestPayInProgress` | push |
| `R:MessageService/getMessageOverview`, `R:MessageService/fetchMessages`, `R:MessageService/markMessageAsRead`, `R:MessageService/replyMessage` | |
| `R:AncientWonderService/getOtherPlayerAncientWonders`, `R:AncientWonderService/phaseUpdated` | AW phases / contributions |
| `R:RankingService/getRankingList` (local `localProcessRankingsData`) | |
| `R:GuildService/getGuild` | processor mapped in the service worker, but the matcher is commented out — never delivered |
| `R:WorldMapService/fetchInitialWorldMapData`, `R:WorldMapService/getDiscoveredPlayerProvinces`, `R:WorldMapService/updateProvince`, `R:WorldMapService/getProvinceInformation`, `R:WorldMapService/updateTournamentTime` | |
| `R:OtherPlayerService/getNeighbourlyHelpBuildings` | |
| `R:TournamentService/getProvincesOverview` | |
| `R:ArmyService/addUnit` | push |
| `R:ResearchService/startup` | |
| `R:TreasureService/spawnTreasure` (local `localCollectEventTreasure`) | push |

Everything else in this catalog is **not** observed yet.

---

## 3. City / production / resources / research

### 3.1 `de.innogames.strategycity.main.service.CityProductionService` (L13124-L13204) — wire **`CityProductionService`**

* super `AbstractConnectionService`; injected `queueModel`. Injector key: the class itself
  (`injector.map(CityProductionService).toSingleton(CityProductionService,true)` L390820).
* Push listeners: `getProductionQueue` → `_onGetProductionQueue(productionQueue)`: `queueModel.updateQueue(vo)` + hides loader.
  Game-side `addSafePushResponse(CityProductionService_UpdateBoost="updateBoost", …)` (L16724) — the boost model listens for `updateBoost` pushes.

| method | wire method | requestData | flags | callback / result |
|---|---|---|---|---|
| `cancelProduction(entityId, slotId=0)` | `cancelProduction` | `[entityId, slotId]` | — | — |
| `discardProduction(entityId, forceCleanStorage=false)` | `discardProduction` | `[entityId, forceCleanStorage]` | — | — |
| `pickupProduction(entityId, cb)` | `pickupProduction` | `[[entityId, …]]` — ids are **batched for 1 s** (`TweenLite.delayedCall(1, _pickupProduction)`) then sent as one array | imm. | cb(data) — collector just resumes state machine (L407768) |
| `pickupProductionDetails(entityIds:Vector, cb)` | `pickupProductionDetails` | `[[id, …]]` (same 1 s batching) | imm. | cb(data) |
| `instantStart(entityId, productionOptionId, productionAmount=1)` | `instantStart` | `[entityId, productionOptionId, productionAmount]` | imm. | — |
| `startProduction(entityId, productionOptionId, productionAmount)` | `startProduction` | `[entityId, productionOptionId, productionAmount]` | `handleOnlyLastPushResponses(["CityResourcesService.getResources"])` | — |
| `startProductions(buildingIds, optionId, amount)` | `startProductions` | `[[buildingId,…], optionId, amount]` | same flag | — |
| `instantFinish(entityId)` | `instantFinish` | `[entityId]` | imm. | — |
| `updateQueue(queueId)` | `getProductionQueue` | `[queueId]` | imm. | answer handled by the push listener |

### 3.2 `de.innogames.onyx.city.services.CityMapService` (L458833-L458921) — wire **`CityMapService`**

* implements `de.innogames.strategycity.main.service.ICityMapService`; injector key **`ICityMapService`** (L390824). Injected `entityCategoryModel`, `entityConfigsModel`, `entitiesModel`.
* Push listeners: `updateExpansions` → `_onUpdateExpansions(expansions)` (rebuilds expansion category from `EntityConfigFactory`, dispatches `ExpansionEvent::expansionsUpdated`); `replaceBuilding` → `ReplaceEntityEvent::replace`; `updateEntity` → `entitiesModel.updateConnections(entities)`; `reset` 👁 → `_onResetEntities(entities)` (full city entity list; a `type=="guardian"` entry dispatches `AddGuardianEntityEvent::add`; then `entitiesModel.resetEntities`).

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `placeEntity(entity, isPremium=false, cb)` | `placeBuilding` / `placeBuildingForPremium` | `[entity.entityConfig.id, entity.x, entity.y]` | premium variant imm. | cb(data) — `data[0]` is the new `CityMapEntityVO` (L454503) |
| `replaceEntities(entities, cb)` | `replaceBuildings` | `[entities]` (array of entity VOs) | — | cb(data) — `data[0]` new entities |
| `removeEntity(entity, cb)` | `removeBuilding` | `[entity.id]` | — | cb(entities: CityMapEntityVO[]) |
| `moveEntity(entity, cb)` | `moveBuilding` | `[entity.id, entity.x, entity.y]` | imm. | cb(entities: CityMapEntityVO[]) |
| `upgradeEntity(entity, isPremium=false, cb)` | `upgradeBuilding` / `upgradeBuildingForPremium` | `[entity.id, entity.x, entity.y]` | imm. | cb(entities: CityMapEntityVO[]) |
| `cancelUpgrade(entity, cb)` | `cancelUpgrade` | `[entity.id, entity.x, entity.y]` | imm. | cb(entities) |
| `unlockArea(tileX, tileY, expansionConfig, cb)` | `unlockArea` | `[tileX, tileY, expansionConfig.unlockedThrough, expansionConfig.buyForPremium]` | — | cb |
| `reduceConstructionTime(mapEntityId, price, cb)` | `reduceConstructionTime` | `[mapEntityId, price]` | — | cb(mapEntityVO) |
| `update()` | `update` | `[]` | — | — |

### 3.3 `de.innogames.onyx.resources.service.ResourcesService` (L42743-L42798) — wire **`CityResourcesService`**

* injector key: the class (`asSingleton()` L543242). Injected `knowledgePointPackageModel`, `knowledgePointModel`, `resourcesModel`.
* Push listeners: `buyResourcePackage` → `knowledgePointPackageModel.update(packages)`; `updateResourceConfigs` → adds `GoodConfiguration`s; `updateResourceCaps` → `resourcesModel.updateCap`; `getResources` 👁 → `resourcesModel.update(...)` + `knowledgePointModel.update(resources.strategy_points)`; `getPremium` → `resourcesModel.setValueFor("premium", BigInt(n))`.
  Game-side safe pushes: `getCityCulture` (L10749) and `getCityPopulation` (L13789).

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `buyResourcePackage(id, ownerId, data, cb)` | `buyResourcePackage` | `[id, ownerId, data?.toVo() ?? null]` — `PurchasablePackageData.toVo()` gives a `PurchasablePackageDataVO` (L373867) | imm. | cb |
| `buyAWInstantKP(kpAmount, ownerId, data, cb)` | `buyInstantAwKp` | `[kpAmount, "KNOWLEDGE_POINTS_ANCIENT_WONDER", {__class__:"AncientWonderKnowledgePointsDataVO", baseName, ownerPlayerId}]` (L376724, `AncientWonderKnowledgePointData.toVo` L373890) | imm. | cb(result) |
| `syncResources()` | `getResources` | `[]` | imm. | internal `_onGetResources` |

### 3.4 `de.innogames.onyx.city.service.CityInformationService` (L66840-L66858) — wire **`CityInformationService`**

* injector key: the class (L390830). Game-side safe push `getCulture` (constant `CityInformationService_GetCityInformation`, L10750) → culture model.
* `getCulture()` → `getCulture`, `[]`, imm., no cb (answer arrives as the `getCulture` push).

### 3.5 `de.innogames.onyx.networking.services.EffectsService` (L68944-L68966) — wire **`EffectsService`**

* implements `IEffectsService`; injector key: the class (L390831). No listeners in ctor; game-side safe pushes: `update` 👁 (L8873, L9250 — active effects), `updateCounters` (L9258), `getAllSources` (L12225), `updateSources` (L12238), `nh_update_helpers` (L49580).
* `refresh()` → `refresh`, `[]`; `update()` → `update`, `[]`. Both fire-and-forget; results come as pushes.

### 3.6 `de.innogames.onyx.networking.services.TranscendenceService` (L524054-L524076) — wire **`TranscendenceService`**

* implements `ITranscendenceService`; injector key: the class (L468040). Game-side safe pushes `allBuildingsStates` 👁 and `buildingsStateUpdated` (L15621-2).
* `extendTime(buildingId)` → `extendTime`, `[buildingId]`, future; `refresh(buildingId)` → `refresh`, `[buildingId]`, future.

### 3.7 `de.innogames.onyx.networking.services.GuardianService` (L523884-L523912) — wire **`GuardianService`**

* implements `IGuardianService`; injector key **`IGuardianService`** (L514564). Game-side safe push `getCollection` (L24246).
* `getCollection()` → `getCollection`, `[]`, future(vos); `instantFinish(guardianId)` → `instantFinish`, `[guardianId]`, future; `summon(guardianId)` → `summon`, `[guardianId]`, future(vo); `unsummon(guardianId)` → `unsummon`, `[guardianId]`, future.

### 3.8 `de.innogames.strategycity.main.service.RelicService` (L665405-L665425) — wire **`RelicService`**

* implements `IRelicService`; injector key **`IRelicService`** (L390823). Push-only: `getRelicsInformation` → `RelicEvent::updateRelics` (Vector<RelicVO>); `getRelicBoostGoodInformation` → `RelicBoostsEvent::updateRelicBoostGood` (Vector<RelicBoostGoodVO>). No request methods.

### 3.9 `de.innogames.onyx.techtree.service.TechnologyService` (L632695-L632725) — wire **`ResearchService`**

* implements `ITechnologyService`; injector key **`ITechnologyService`** (L630471).

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `getTechnologyData(cb)` 👁 (`R:ResearchService/startup`) | `startup` | `[]` | imm. | cb(technologies) → `technologyModel.init(technologies)` (L630995) |
| `useKnowledgePoints(technologyId, amount)` | `invest` | `[technologyId, amount]` | PLR | — |
| `payTechnology(technologyId)` | `payTechnology` | `[technologyId]` | imm. | — |
| `buyInstantResearch(technologyId)` | `buyInstantResearch` | `[technologyId]` | imm. | — |
| `buyInstantResearchAndUnlock(technologyId, cb)` | `buyInstantResearchAndUnlock` | `[technologyId]` | imm. | cb(vo) — technology VO with `id` (L630714) |
| `unlockGate(technologyId)` | `unlockGate` | `[technologyId]` | imm. | — |

### 3.10 `de.innogames.onyx.techtree.service.CityResearchService` (L632679-L632694) — wire **`CityResearchService`**

* injector key: the class (L630472). Push-only: `updateTechnologySection` → `TechTreeSectionEvent::techSectionUpdated`.

---

## 4. World map / tournaments / battle

### 4.1 `de.innogames.onyx.worldmap.service.WorldMapService` (L647644-L647731) — wire **`WorldMapService`**

* implements `IWorldMapService`; injector key **`IWorldMapService`** (L512436). Injected `worldMapAreaFactory`, `worldMapModel`. Static method-name constants at L786088-L786094 (`METHOD_GET_PROVINCE_INFO` = "getProvinceInformation", …).
* Push listeners: `updateProvince` 👁 → `UpdateProvincesEvent::update` with `[ProvinceFactory.createProvince(vo)]`; `updateMapArea` → adds areas to `worldMapModel`, `WorldMapViewEvent::drawGrid`; `updateTournamentTime` 👁 → `{q, r, remainingTime, premiumCosts}` applied to the tournament province, redraw.
* ✅ Extension: `src/inject/local/neighbourlyHelp.ts` (`createWorldMapService`, `getDiscoveredPlayerProvinces`, `fetchInitialWorldMapData`), `src/inject/local/tourny.ts` (`getProvinceInformation` via raw `request('getProvinceInformation').withData([r,q])`), `src/inject/local/fetchWorldNeighbors.ts`, `tournyOpen.ts`.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `startup(cb)` ✅👁 | `fetchInitialWorldMapData` | `[]` | imm. | cb(startup) — `{world_map_area_length, world_map_area_height, player_world_map_area_vo, …}` (L644234) |
| `getWorldMapAreas(areas:Vector<IWorldMapArea>, immediately=false, cb)` | `fetchAreas` | `[[areaId,…]]` — area ids are collected in a map and flushed after **0.5 s** debounce (or at once if `immediately`) | — | cb(areas[]) — raw area VOs → `worldMapAreaFactory.createWorldMapArea` (L645110) |
| `getProvinceInformation(province, cb)` ✅👁 | `getProvinceInformation` | `[province.columnIndex, province.rowIndex]` = `[r, q]` | imm. | cb(data) — `{provinceRewards, playerSquadSize, baseTournamentPointsAmount, …}` (L637541 handler) |
| `getIncompleteProvinces(cb)` | `getIncompleteProvinces` | `[]` | imm. | cb(vos: province VOs) (L644970) |
| `getDiscoveredPlayerProvinces(cb)` ✅👁 | `getDiscoveredPlayerProvinces` | `[]` | imm. | cb(vos: province VOs) (L644939) |

### 4.2 `de.innogames.onyx.worldmap.service.ScoutingService` (L647559-L647596) — wire **`WorldMapScoutService`**

* implements `IScoutingService`; injector key **`IScoutingService`** (L512437). Injected `scoutingModel`.
* Push listeners: `findProvincesToScout` → `scoutingModel.updateProvinces(provinces)`; `removeScout` → clears scout; `updateScout` → `new ScoutData(vo)`; all dispatch `ScoutingViewEvent updateView`.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `startScouting(rowIndex, columnIndex, cb)` | `startScouting` | `[r, q]` | imm. | cb(data) — `{scout, locations_to_scout}` (L645310) |
| `finishScouting(rowIndex, columnIndex, cb)` | `finishScouting` | `[r, q]` | — | cb(areas[]) (L644912) |
| `instantFinish(rowIndex, columnIndex, cost, cb)` | `instantFinish` | `[r, q, cost]` | imm. | cb(areas[]) (L645094) |

### 4.3 `de.innogames.onyx.worldmap.service.UnlockEncounterService` (L647597-L647615) — wire **`UnlockEncounterService`**

* implements `IUnlockEncounterService`; injector key **`IUnlockEncounterService`** (L512434).
* ✅ `src/inject/local/tourny.ts` `unlockEncounter(service, {q, r})` → `service.unlockEncounter(q, r, 0, cb)` — correct: the method's `(rowIndex, columnIndex)` is `(q, r)` (§0.3) and it puts `[columnIndex, rowIndex]` = `[r, q]` on the wire, matching what `instantBattle` in the same file writes by hand (`withData([r, q, 0, units])`).

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `unlockEncounter(rowIndex, columnIndex, encounterIndex, cb)` ✅ | `unlockEncounterByTrading` | `[r, q, encounterIndex]` | imm. | cb(tradeResult) → `new UnlockEncounterResult(tradeResult)` (`UnlockEncounterResultVO {q, r, encounterNumber, …}` L540917) |
| `premiumUnlockEncounter(rowIndex, columnIndex, encounterIndex, cb)` | `unlockEncounterByTradingUsingPremium` | `[r, q, encounterIndex]` | imm. | same |

### 4.4 `de.innogames.onyx.worldmap.service.WorldMapBattleService` (L647616-L647643) — wire **`BattlefieldService`**

* implements `IWorldMapBattleService`; injector key **`IWorldMapBattleService`** (L512435).
* Helper `_getUnitsVO(units:Vector<ISquad>)` (L647620) → `units.map(s => s.get_data())`, i.e. an array of `de.innogames.onyx.networking.vos.UnitSquadVO` `{__class__:"UnitSquadVO", unitTypeId:String, size:Int}` (L540891; `Squad.get_data` L661422).
* ✅ `src/inject/local/tourny.ts` `instantBattle` builds the request by hand: `request('instantBattle').withData([r, q, 0, [unit×5]]).withCallback(...).immediate().call()` (`unit` is a `{unitTypeId,size}`-shaped object from `TournyFight`).

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `instantBattle(rowIndex, columnIndex, encounterIndex, playerUnits, cb)` ✅ | `instantBattle` | `[r, q, encounterIndex, [UnitSquadVO,…]]` | imm. | cb(battleResultVO) — `{battleId, state, completedWave, totalWaves, reviveCosts}` (L645024→`_onResponse`) |
| `startBattle(rowIndex, columnIndex, encounterIndex, playerUnits, cb)` | `start` | same | imm. | cb(vo) with `battleId` → manual battle module |

### 4.5 `de.innogames.onyx.battle.services.BattleService` (L361363-L361384) — wire **`BattleService`**

* implements `IBattleService`; injector key **`IBattleService`** (L359412). Manual-battle turn service (shared by worldmap/tournament/spire battles).

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `submitStep(battleId, step, isAutoBattle, cb)` | `submit` | `[battleId, step, isAutoBattle]` | imm. | cb(newState) — `{state, completedWave, totalWaves, reviveCosts}` (L359623) |
| `surrenderBattle(battleId, cb)` | `surrender` | `[battleId]` | imm. | cb(result) — `{state, battleId, completedWave, …}` |
| `getBattle(battleId, cb)` | `getBattle` | `[battleId]` | imm. | cb(newState) as above |

### 4.6 `de.innogames.onyx.city.services.BattleRetreatService` (L458817-L458832) — wire **`BattleService`** (second class on that name)

* implements `IBattleRetreatService`; injector key **`IBattleRetreatService`** (L390818).
* `retreatBattle(battleId, cb)` → `retreat`, `[battleId]`, imm., cb(result) — `result.unitSquads[]` re-populate the army model (L387302).

### 4.7 `de.innogames.strategycity.shared.service.ArmyService` (L666485-L666515) — wire **`ArmyService`**

* implements `IArmyService`; injector key **`IArmyService`** (L390822).
* Push listeners: `addUnit` 👁 → `AddUnitEvent addUnit` (vo); `healUnits` → `UnitsSquadEvent::unitHealed` (unitId); `revivedUnit` → `RevivedUnitEvent::updateUnit` (`RevivedUnit._hx_new(vo)`).

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `reviveUnits(battleId, wave, unitId)` | `reviveUnits` | `[battleId, wave, unitId]` | imm. | — |
| `buyUnits(unitType, provinceColumnIndex, provinceRowIndex, cb)` | `buyMissingUnitsForPremium` | `[unitType, columnIndex, rowIndex]` (= `[unitType, r, q]`) | imm. | cb |

### 4.8 `de.innogames.onyx.tournaments.services.TournamentService` (L638942-L638968) — wire **`TournamentService`**

* implements `ITournamentService`; injector key **`ITournamentService`** (L637995).
* Push listeners: `updateTournamentPoints` → `UpdatedTournamentPointsEvent::update` (points); `getTournamentReward` → `TournamentRewardEvent::showRewards` (`RewardSet(RewardParser.parse(rewards))`).
* ✅ `src/inject/local/tourny.ts` `getTournamentOverview(service)` calls `service.getTournamentProgress(cb)` — the method takes **no** callback (it binds its own `_onGetTournamentOverview`), so the extension's cb is silently ignored.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `getTournamentProgress()` ✅ | `getTournamentOverview` | `[]` | — | internal → `UpdatedTournamentsModelEvent(vo)` |

### 4.9 `de.innogames.onyx.tournaments.services.WorldMapTournamentService` (L51465-L51502) — wire **`TournamentService`** (second class on that name)

* injector key: the class (`asSingleton(true)` L637974).
* Push listeners: `updateAllTournamentProvinces` → `UpdateProvincesEvent::update` (Vector of `ProvinceFactory.createProvince(vo)`). Game-side safe push `getPointsArchive` (L638112 → archive-points model).
* ✅ `src/inject/local/tourny.ts` `getProvincesOverview(service)`; 👁 `R:TournamentService/getProvincesOverview`.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `instantUpgrade(rowIndex, columnIndex, cost, cb)` | `instantUpgrade` | `[r, q, cost]` | imm. | cb |
| `getProvincesOverview(cb)` ✅👁 | `getProvincesOverview` | `[]` | — | cb(provincesOverviewVO) → `new ProvincesOverview(vo)` (`de.innogames.onyx.tournaments.models.data.ProvincesOverview` L638748) |
| `getArchivePoints()` | `getPointsArchive` | `[]` | — | answer via safe push |
| `unlockNextChestWithArchivePoints(archivePoints)` | `unlockChestByArchive` | `[archivePoints]` | — | internal → `UpdatedTournamentsModelEvent(vo)` |

### 4.10 `de.innogames.onyx.miners.service.GoldMineService` (L519450-L519465) — wire **`GoldMineService`**

* implements `IGoldMineService`; injector key **`IGoldMineService`** (L519446).
* `mine(province, cb)` → `mine`, `[province.columnIndex, province.rowIndex]` (= `[r, q]`), cb(vo: province VO → `ProvinceFactory.createProvince`) (L519402).

---

## 5. Spire

### 5.1 `de.innogames.onyx.spire.service.SpireService` (L24590-L24636) — wire **`SpireService`** (callback style)

* injector key: the class (`asSingleton(true)` L617073, also L619697). Push listener `updateMap` → `SpireMapUpdateEvent::update_map` (vo). Game-side safe push `getPointsArchive` (L58659).
* 👁 `Q:SpireService/getEncounter`.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `getData(cb)` | `getData` | `[]` | imm. | cb(data) → `spireModel.update(data)` (L617377) |
| `getEncounter(pointId, cb)` 👁 | `getEncounter` | `[pointId]` | imm. | cb(encounter) → `new SpireEncounter(encounter)` (`de.innogames.onyx.spire.wrappers.SpireEncounter` L630049; exposed to the extension as `window.aviad_se`) |
| `buyUnits(pointId, unitId, cb)` | `buyUnits` | `[pointId, unitId]` | imm. | cb(result) → `unitCosts.update(result)` |
| `openChest(pointId, cb)` | `openChest` | `[pointId]` | imm. | cb(rewards[]) |
| `instantOpenGate(pointId, cb)` | `instantOpenGate` | `[pointId]` | imm. | cb(status) |
| `openGate(pointId, cb)` | `openGate` | `[pointId]` | imm. | cb(status) |
| `openMysteryChest(chestLocationId, cb)` | `openMysteryChest` | `[chestLocationId]` | imm. | cb(rewards[]) → `RewardParser.parse` |
| `getArchivePoints()` | `getPointsArchive` | `[]` | — | via safe push |
| `unlockNextCrystalWithArchivePoints(archivePoints)` | `unlockCrystalByArchive` | `[archivePoints]` | — | — |

### 5.2 `de.innogames.onyx.networking.services.SpireService` (L523987-L524030) — wire **`SpireService`** (future style, same RPCs)

* implements `ISpireService`; injector key: the class (L617075). Game-side safe push `showSpireRewards` (L617078, L617130).
* `buyUnits(pointId, unitId)` → `[pointId, unitId]`; `getData()` → `[]`; `getEncounter(pointId)` → `[pointId]`; `getPointsArchive()` → `[]`; `instantOpenGate(pointId)`; `openChest(pointId)`; `openGate(pointId)`; `openMysteryChest(chestLocationId)`; `unlockCrystalByArchive(orbsNeededForCrystal)` → `[orbsNeededForCrystal]`. All **future**, none imm.

### 5.3 `de.innogames.onyx.spire.services.SpireService` (L619831-L619846) — wire **`SpireService`** (push-only)

* injector key: the class (L617074). Push listener `showRewards` → `SpireRewardsEvent::showSpireAncientWonderRewards` (`RewardSet`).

### 5.4 `de.innogames.onyx.spire.service.SpireDiplomacyService` (L21010-L21033) — wire **`SpireDiplomacyService`**

* injector key: the class (L619699). 👁 `R:SpireDiplomacyService/getData`, `R:/Q:SpireDiplomacyService/submit` (`src/inject/local/localProcessSpireDiplomacyGetData.ts`, `src/inject/spirePicksStore.ts`).

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `submit(pointId, chosenOptions, turnNumber, cb)` 👁 | `submit` | `[pointId, [{__class__:"SpireDiplomacyChosenOptionVO", goodId, slot}, …], turnNumber]` (L616685 `_createChosenOptions`) | imm. | cb(result) → `new SpireDiplomacy(result)` (`de.innogames.onyx.spire.wrappers.SpireDiplomacy` L629881) |
| `getData(pointId, cb)` 👁 | `getData` | `[pointId]` | imm. | cb(result) → `SpireDiplomacy` |
| `cancelDiplomacy(pointId)` | `cancel` | `[pointId]` | imm. | — |
| `buyExtraTurn(pointId, boughtTurn, cb)` | `buyExtraTurn` | `[pointId, boughtTurn]` | imm. | cb(result) → `SpireDiplomacy` |

### 5.5 `de.innogames.onyx.city.services.DiplomacyCancelService` (L50001-L50015) — wire **`SpireDiplomacyService`** (second class)

* injector key: the class (L390819). Only `cancelDiplomacy(pointId)` → `cancel`, `[pointId]`, imm. (used from the city side to abandon a diplomacy in progress).

### 5.6 `de.innogames.onyx.spire.service.SpireBattleService` (L22575-L22610) — wire **`SpireBattleService`**

* injector key: the class (L619700). `_getUnitsVO` identical to §4.4 (array of `UnitSquadVO {unitTypeId,size}`).

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `instantBattle(pointId, unitSquads, cb)` | `instantBattle` | `[pointId, [UnitSquadVO,…]]` | imm. | cb(result) — `{state, battleId, completedWave, totalWaves, …}` (L616863) |
| `startBattle(pointId, unitSquads, cb)` | `startBattle` | same | imm. | cb(realm) — `realm.battleId` → manual battle |
| `instantNextWave(battleId, cb)` | `instantNextWave` | `[battleId]` | imm. | cb(result) as instantBattle |
| `startNextWave(battleId, cb)` | `startNextWave` | `[battleId]` | imm. | cb(result) |
| `getBattle(battleId, cb)` | `getBattle` | `[battleId]` | imm. | cb(result) |

### 5.7 `de.innogames.onyx.spire.service.SpireStateService` (L58690-L58708) — wire **`SpireStateService`**

* injector key: the class (L617076). Game-side safe push `updateState` (L22678). `getState()` → `getState`, `[]`, imm., no cb.

### 5.8 `de.innogames.onyx.spire.service.SpireRankingService` (L619797-L619815) — wire **`SpireRankingService`**

* injector key: the class (L619698). Push `updateRanking` → `SpireRankingUpdateEvent::update_ranking` (vo). `getRanking(cb)` → `updateRanking`, `[]`, imm., cb(vo).

### 5.9 `de.innogames.onyx.spire.service.SpireRoundsService` (L619816-L619830) — wire **`SpireRoundsService`**

* injector key: the class (L617077). `getOverview()` → `getOverview`, `[]`, imm., **future(rounds)** (eager) — consumed at L36251 (`participation`, `remainingTime`, `roundHistory`, `rewards`).

### 5.10 `de.innogames.onyx.networking.services.SpireEffectService` (L523961-L523986) — wire **`SpireEffectService`**

* implements `ISpireEffectService`; injector key: the class (L619705). Game-side safe push `effectsOverview` (L619486).
* `getSelectionOptions(pointId)` → `[pointId]` future(vo); `reroll(pointId)` → `[pointId]` future(vo); `select(pointId, effectConfigId)` → `[pointId, effectConfigId]` future.

### 5.11 `de.innogames.onyx.networking.services.SpireShopService` (L524031-L524053) — wire **`SpireShopService`**

* implements `ISpireShopService`; injector key **`ISpireShopService`** (L619706). Constant `updateItem` exists (L784164) but no listener registers it in this snapshot.
* `buy(itemId)` → `buy`, `[itemId]`, future(rewards); `getShop()` → `getShop`, `[]`, future(remoteData → shop items).

---

## 6. Social: neighbours, ancient wonders, spells, guilds, ranking, messaging, notifications

### 6.1 `de.innogames.onyx.city.service.OtherPlayerService` (L14496-L14519) — wire **`OtherPlayerService`**

* injector key: the class (L390829). Injected `friendDataModel`. Push `updatePlayer` → `friendDataModel.updatePlayersNextInteraction(list)` + `OtherPlayerEvent::enterPlayerCity`.
* ✅ `src/inject/local/neighbourlyHelp.ts` (`createOtherPlayerService`, `getNeighborlyHelpBuildings`); 👁 `Q:/R:OtherPlayerService/visitPlayer` (`localTrapVisitPlayer.ts`), `R:OtherPlayerService/getNeighbourlyHelpBuildings` (`src/elvenar/processNeighbourHelpBuildings.ts`). Visiting itself is done through `VisitOtherPlayerCommand` (`localVisitPlayer.ts`), not by calling the service.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `visitPlayer(playerId, cb)` 👁 | `visitPlayer` | `[playerId]` | imm. | cb(otherCityVO) — `{city_map:{entities…}, …}` (L387261) |
| `getNeighbourlyHelpBuildings(playerId, cb)` ✅👁 | `getNeighbourlyHelpBuildings` | `[playerId]` | imm. | cb(vo) → `new PlayerNeighbourlyHelp…(vo)` quick-help window (L387091) |

### 6.2 `de.innogames.onyx.city.service.NeighborlyHelpService` (L458768-L458789) — wire **`NeighbourlyHelpService`**

* implements `INeighborlyHelpService`; injector key **`INeighborlyHelpService`** (L390828). No listeners.
* ✅ `src/inject/local/neighbourlyHelp.ts` `performHelp(service, action, entityId, playerId)`; ✅ `src/inject/local/localHelpPlayer.ts` calls `svc.helpPlayer(playerId, cb)` — **not in this snapshot** (nor the March one): it arrived with game 1.239 and is present in `tmp/elvenar-release-min-jul-2026.js` (`helpPlayer: request("helpPlayer").withData([playerId]).withCallback(cb).immediate()`, alongside new `helpAllGuildMembers` and `getNeighbourlyHelpRewards`). The extension gates the call on `compareVersion('1.239') >= 0` (`src/inject/inject-main.ts`). See 10 §2.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `performAction(action, entityId, playerId)` ✅ | `performHelp` | `[action, entityId, playerId]` — `action` ∈ `"unlimited_help" | "limited_help" | "time_limited_help"` (extension typing; `"unlimited_help"` confirmed at L9154) | imm. | — (the extension passes a 4th cb arg that the method ignores) |
| `pickup(entityIds)` | `pickup` | `[[entityId,…]]` | — | — |
| `updateEntityCultureEffect(playerId)` | `updateEntityCultureEffect` | `[playerId]` | — | — |

### 6.3 `de.innogames.onyx.city.ancientwonders.services.AncientWonderService` (L21107-L21163) — wire **`AncientWonderService`**

* injector key: the class (`asSingleton(true)` L373460).
* Push listeners (ctor, via `addSafePushResponse`): `showHelpReward` → `AncientWondersHelpRewardEvent::showReward` (`RewardSet`); `phaseUpdated` 👁 → `UpdateAllPhasesCommand_Event(phases)`.
* ✅ `src/inject/local/localProcessGuildData.ts` L31-40 and `localProcessRankingsData.ts` L42-51 call `getOtherPlayerAncientWonders(playerId, cb)` on a fresh instance (result read via 👁 `R:AncientWonderService/getOtherPlayerAncientWonders`); AW window opening goes through `DisplayAncientWonderCommand` (`localOpenAw.ts`).

| method | wire method | requestData | flags | callback / result |
|---|---|---|---|---|
| `getContributions()` | `getContributions` | `[]` | imm. | future(remoteData[]) → `AWContributionList_createContribution` (L372579) |
| `getPhase(playerId, entityId)` | `getOtherPlayerAncientWonders` | `[playerId, entityId]` | PLR | future(vo) — `vo.ancientWonderPhases` (L373378) |
| `getPhases(playerId)` | `getPhases` | `[playerId]` | imm. | future(phases[]) |
| `insertRuneShard(entityBaseName)` | `insertRuneShard` | `[entityBaseName]` | imm. | — |
| `investKnowledgePoints(playerId, entityBaseName, amount)` | `investKnowledgePoints` | `[playerId, entityBaseName, amount]` | — | — |
| `investRuneShards(playerId, entityBaseName, amount)` | `investKnowledgePointsBasedOnRuneShards` | `[playerId, entityBaseName, amount]` | — | — |
| `investGuildProgressionFreeKp(playerId, entityBaseName)` | `investGuildProgressionFreeKp` | `[playerId, entityBaseName]` | — | — |
| `useBrokenShards(entityBaseName, cb)` | `useBrokenShards` | `[entityBaseName]` | imm. | cb(phases[]) → `model.addPhases` |
| `payBrokenShards(entityBaseName, cb)` | `payBrokenShards` | `[entityBaseName]` | PLR | cb(phases[]) |
| `getOtherPlayerAncientWonders(playerId, cb)` ✅👁 | `getOtherPlayerAncientWonders` | `[playerId]` | PLR | cb(vo) → `new OtherPlayerAncientWonderList(vo)` (L374126); `.get_ancientWonderPhases()` |
| `updateFavourite(playerId, entityBaseName, isFavorite)` | `updateFavourite` | `[playerId, entityBaseName, isFavorite]` | imm. | — |

### 6.4 `de.innogames.onyx.shared.spells.services.SpellService` (L580451-L580469) — wire **`SpellService`**

* implements `ISpellService`; injector key **`ISpellService`** (L460147).
* ✅ `src/inject/local/castEe.ts` (`castSpellOnBuilding(spellName, buildingId, cb)`), `castEeOncePerSecond.ts`.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `castSpellOnBuilding(spellId, cityMapEntityId, cb)` ✅ | `castSpellOnBuilding` | `[spellId, cityMapEntityId]` | imm. | cb(entity: CityMapEntityVO) → `entitiesModel.updateEntity` (L460059) |
| `castGlobalSpell(spellId)` | `castSpell` | `[spellId]` | imm. | — |

### 6.5 `de.innogames.onyx.shared.guilds.services.GuildService` (L554520-L554633) — wire **`GuildService`**

* implements `IGuildService`; injector key **`IGuildService`** (L553995).
* Push listeners: `guild_application_accepted` → `GuildPushResponseEvent::applicationAccepted` (`new Guild(vo)`); `guild_role_changed` and `guild_changed` → `UpdateUserGuildEvent updateUserGuild`; `guild_expelled` → `GuildPushResponseEvent::memberExpelled`; `refreshGuild` → `UpdateUserGuildInfoEvent` + `UpdateUserGuildEvent`.
* 👁 `R:GuildService/getGuild` is wired in the service worker but its matcher is commented out.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `refreshGuild()` | `refreshGuild` | `[]` | imm. | internal `onRefreshGuild(guildVO)` |
| `getGuild(guildId, cb)` 👁 | `getGuild` | `[guildId]` | imm. | cb(guildVO) → `new Guild(guildVO)` (`de.innogames.onyx.shared.guilds.vos.wrappers.Guild` L562052) |
| `getMembershipRequests(cb)` | `getMembershipRequests` | `[]` | imm. | cb(membershipVOs[]) |
| `createGuild(name, description, allowInvitations, applicationData, banner, cb)` | `createGuild` | `[name, description, banner.shapeId, banner.shapeColor, banner.symbolId, banner.symbolColor, allowInvitations, false, applicationData.id]` | imm. | cb(guildVO) |
| `editGuild(…same…)` | `editGuild` | same 9-element array | imm. | cb |
| `disbandGuild(cb)` | `disbandGuild` | `[]` | imm. | cb |
| `leaveGuild(cb)` | `leaveGuild` | `[]` | imm. | cb |
| `kickMember(playerId, cb)` | `kickMember` | `[playerId]` | imm. | cb |
| `changeMemberRole(playerId, role, cb)` | `changeMemberRole` | `[playerId, role]` | imm. | cb |
| `sendApplication(guildId, cb)` | `sendApplication` | `[guildId]` | imm. | cb |
| `withdrawApplication(applicationId, cb)` | `withdrawApplication` | `[applicationId]` | imm. | cb |
| `acceptApplication(applicationId, cb)` | `acceptApplication` | `[applicationId]` | imm. | cb(guildVO) |
| `rejectApplication(applicationId)` | `rejectApplication` | `[applicationId]` | imm. | — |
| `invitePlayer(playerId, cb)` | `invitePlayer` | `[playerId]` | imm. | cb(invitationRequestVO) → `InvitationRequest` |
| `disinvitePlayer(invitationId, cb)` | `disinvitePlayer` | `[invitationId]` | imm. | cb |
| `acceptInvitation(invitationId, cb)` | `acceptInvitation` | `[invitationId]` | imm., PLR | cb(guildVO) |
| `declineInvitation(invitationId, cb)` | `declineInvitation` | `[invitationId]` | imm., PLR | cb |
| `getGuildSuggestions(cb)` | `getGuildSuggestions` | `[40]` (hard-coded count) | imm. | cb(vos[]) → `RankingFactory.createRanking` |

### 6.6 `de.innogames.onyx.shared.guilds.services.GuildProgressionService` (L554494-L554519) — wire **`GuildProgressionService`**

* implements `IGuildProgressionService`; injector key **`IGuildProgressionService`** (L554002). Push `getOverview` → `UpdateGuildProgressionEvent::update` with `{guildXP, resetPrice, guildLevel}` + `perks`.
* `getPerks()` → `getOverview`, `[]`, imm.; `upgradePerk(perkType, xpLevel)` → `upgradePerk`, `[perkType, xpLevel]`, imm.; `resetAllPerks()` → `resetPerks`, `[]`, imm.

### 6.7 `de.innogames.onyx.shared.ranking.service.RankingService` (L574168-L574207) — wire **`RankingService`**

* implements `IRankingService`; injector key **`IRankingService`** (L390834).
* Push listeners: `accessRanking` and `getRankingList` 👁 → `UpdateRankingModelEvent::updateRankings` (`new RankingList(rankings)`); `newRank` → `PlayerRankingEvent::newRankReceived`.
* Category names (`de.innogames.onyx.shared.ranking.constants.RankingCategory` L782580-7): `tournament`, `player`, `guild`, `guild_event`, `previous_guild_event`, `spire`, `previous_spire`, `none`.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `accessRanking(category, id)` | `accessRanking` | `[category.name, 8, id]` (8 = page size) | — | via push |
| `getRankingList(category, pageIndex, filterString="", filterType="")` 👁 | `getRankingList` | `[category.name, pageIndex, 8, filterString, filterType]` | — | via push |
| `getRankingOverview(playerId, cb)` | `getRankingOverview` | `[playerId]` | imm. | cb(vos[]) → `RankingOverview` |

### 6.8 `de.innogames.onyx.shared.messaging.service.MessageService` (L564839-L564875) — wire **`MessageService`**

* implements `IMessageService`; injector key **`IMessageService`** (L564044). `MailboxType.toString()` ∈ `"INBOX" | "OUTBOX"` (L784708).
* 👁 `R:MessageService/getMessageOverview`, `/fetchMessages`, `/markMessageAsRead`, `/replyMessage`.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `getMessages(mailboxType, offset, count, cb)` 👁 | `fetchMessages` | `["INBOX"/"OUTBOX", offset, count]` | — | cb(vo) → messages list |
| `getMetadata(mailboxType, cb)` 👁 | `getMessageOverview` | `["INBOX"/"OUTBOX"]` | — | cb(vo) — `vo.metadata` |
| `replyMessage(messageId, message, cb)` 👁 | `replyMessage` | `[messageId, message]` | imm. | cb(vo) → `MessageConversationPost` |
| `deleteMessage(messageId, cb)` | `deleteMessage` | `[messageId]` | imm. | cb |
| `markMessageAsRead(messageId, cb)` 👁 | `markMessageAsRead` | `[messageId]` | imm. | cb(messageVO) → `Message` |
| `sendMessage(recipientName, subject, message, cb)` | `sendMessage` | `[recipientName, message, subject]` ⚠ order | imm. | cb(vo) → `Message` |
| `sendGuildMessage(subject, message, cb)` | `sendGuildMessage` | `[message, subject]` ⚠ order | imm. | cb(vo) |
| `reportPlayer(reportMessage, reportedMessageId, messagePostId)` | `reportPlayer` | `[reportedMessageId, messagePostId, reportMessage]` | imm. | — |

### 6.9 `de.innogames.onyx.city.service.NotificationService` (L458790-L458816) — wire **`NotificationService`**

* implements `INotificationService`; injector key **`INotificationService`** (L390833). Push `getGlobalNotifications` → each `notification.message` shown via `ExternalUtil.evaluate("message.showWarning", …)`.
* 👁 `Q:NotificationService/getAllNotifications`, `Q:NotificationService/getPreviewNotifications`.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `cleanPendingNotifications(scope, cb)` | `cleanPendingNotifications` | `[scope]` | — | cb |
| `getAllNotifications(cb)` 👁 | `getAllNotifications` | `[]` | — | cb(result[]) → `model.addNotifications` |
| `getNotificationPreviews(playerId, cb)` 👁 | `getPreviewNotifications` | `[playerId]` | — | cb(result[]) |

---

## 7. Events: seasonal, main events, chests, quests, passes, multiplayer, treasures

### 7.1 `de.innogames.onyx.seasonalevents.services.SeasonalEventsService` (L545993-L546021) — wire **`SeasonalEventsService`**

* implements `ISeasonalEventsService`; injector key **`ISeasonalEventsService`** (L544492). Push `getEvents` 👁 → `SeasonalEventsModelEvent::prepareEvents` (`new SeasonalEvent(vo)` each).
* `confirmEventStarted(id)` → `[id]` imm.; `confirmEventEnded(id)` → `[id]` imm.; `requestEventsUpdate()` → `requestEventsUpdate`, `[]`, imm.

### 7.2 `de.innogames.onyx.chests.services.ChestsService` (L370997-L371053) — wire **`ChestsService`**

* implements `IChestsService`; injector key **`IChestsService`** (L370477).
* Push listeners: `updateUnavailableChests` → `ChestsModelUnavailableEvent` (ids); `updateChestPayInProgress` 👁 → `ChestPayInProgress[]`; `updateChestContributions` → `ChestPayInPlayerContribution[]`; `getEventChestRotation` → `ChestRotation[]` (`ChestRotationEvent::updateRotations`).

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `openChest(chestId, cb)` | `openChest` | `[chestId]` | imm. | cb(rewards[]) |
| `openChestAndCollect(chestId, seasonalEventId, cb)` | `openChestAndCollect` | `[chestId, seasonalEventId]` | imm. | cb(chestRewards) — `{grandPrizeRewards[], openedChestRewards[], …}` |
| `payIn(chestId, amount, cb)` | `payIn` | `[chestId, amount]` | imm. | cb(rewards[]) |
| `payInWithPremium(chestId, amount, premiumCosts, cb)` | `payInWithPremium` | `[chestId, amount, premiumCosts]` | imm. | cb(rewards[]) |
| `getEventChestRotation(seasonalEventId)` | `getEventChestRotation` | `[seasonalEventId]` | imm. | internal `_onGetEventChestRotation` |

### 7.3 `de.innogames.onyx.shared.quests.services.QuestDataService` (L570864-L570893) — wire **`QuestService`**

* implements `IQuestDataService`; injector key **`IQuestDataService`** (L569074). Push `getUpdates` 👁 and `abortQuest` → `QuestDataServiceEvent/UPDATE` (quests).
* `getUpdates()` → `getUpdates`, `[]`; `advanceQuest(questId, cb)` → `[questId]`, cb(rewardVOs[]); `abortQuest(questId)` → `[questId]`; `markSeen(questId)` → `[questId]`. None imm.

### 7.4 `de.innogames.onyx.shared.quests.services.QuestMilestoneService` (L52834-L52852) — wire **`QuestMilestoneService`**

* injector key: the class (L569077). Push `updateQuestMilestone` 👁 → `QuestMilestoneModelProgressEvent::updateModel` (`QuestMilestoneProgress`). `collectReward(cb)` → `collectReward`, `[]`, imm., cb.

### 7.5 `de.innogames.onyx.city.mainevents.seasonpass.services.SeasonPassService` (L80075-L80100) — wire **`SeasonPassService`**

* injector key: the class (L429665). Push `getSeasonPassReward` / `getSeasonPassEndReward` → show-rewards command events (`RewardSet`).
* `claimReward(level, rewardIndex, cb)` → `[level, rewardIndex]`, imm., cb(rewards[]); `rerollQuest(questId)` → `[questId]`, imm.

### 7.6 `de.innogames.onyx.city.mainevents.royalpass.services.RoyalPassService` (L427263-L427291) — wire **`RoyalPassService`**

* implements `IRoyalPassService`; injector key **`IRoyalPassService`** (L427173). Push `sendRoyalPassEndRewards` → `ShowRoyalPassEndRewardsWindowEvent::show`.
* `claimAllRewards(cb)`, `claimNextGrandPrize(cb)`, `claimNextRoyalPrize(cb)` → same wire names, `[]`, imm., cb(rewards[]).

### 7.7 `de.innogames.onyx.city.mainevents.eventleague.services.EventLeagueService` (L423612-L423635) — wire **`EventLeagueService`**

* implements `IEventLeagueService`; injector key **`IEventLeagueService`** (L423392). Push `updateEventLeagueProgress` → `EventLeagueProgress`; `sendEventLeagueEndReward` → `EventLeagueEndReward`.
* `getLeagueProgress()` → `getEventLeagueProgress`, `[]`, imm.

### 7.8 `de.innogames.onyx.city.mainevents.shared.services.MergeEventService` (L23179-L23224) — wire **`MergeEventService`**

* injector key: the class (L443306). Injected `mergeEventModel`. Push `initializeBoard` / `updateBoard` → `MergeEvent._hx_new(vo)` into the model.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `getOverview()` | `getOverview` | `[]` | imm. | — |
| `getOrders(cb)` | `getOrders` | `[]` | imm. | cb |
| `generate(chestIds)` | `generate` | `[[chestId,…]]` | imm. | — |
| `move(fromPosition, toPosition)` | `move` | `[from, to]` | imm. | — |
| `discard(position)` | `discard` | `[position]` | imm. | — |
| `completeOrder(chestId, cb)` | `completeOrder` | `[chestId]` | imm. | cb(rewards[]) |
| `discardOrder(chestId)` | `discardOrder` | `[chestId]` | imm. | — |
| `instantSkipOrderCooldown(slot)` | `instantSkipOrderCooldown` | `[slot]` | imm. | — |

### 7.9 `de.innogames.onyx.city.mainevents.shared.services.ShuffleEventService` (L444320-L444345) — wire **`ShuffleEventService`**

* implements `IShuffleEventService`; injector key **`IShuffleEventService`** (L443361). Push `updateShuffleEvent` → `ShuffleEventUpdateEvent::updateModel` (`new ShuffleEvent(vo)`).
* `getPackages()` → `getOverview`, `[]`, imm. (internal cb); `shufflePackages()` → `shuffle`, `[]`, imm.; `openPackage(position, cb)` → `[position]`, imm., cb(rewardGroup `{grandPrizeRewards, openedChestRewards}`).

### 7.10 `de.innogames.onyx.city.mainevents.shared.services.TileEventService` (L444346-L444401) — wire **`TileEventService`**

* implements `ITileEventService`; injector key **`ITileEventService`** (L443416). Push `updateCells` / `addColumn` → `TileEventCell[]` events; `autoCollectRewards` → `TileEventAutoRewardCollectEvent`; `updateRevealChargePositions` → `TileChargeEvent::updatePositions`.
* `getTileEvent()` → `getTileEvent`, `[]`, imm. (internal → `new TileEvent(vo)`); `useTool(toolId, cellX, cellY)` → `[toolId, cellX, cellY]`, imm.; `collectReward(cellX, cellY, cb)` → `[cellX, cellY]`, imm., cb(vo `{rewards, x, y}`).

### 7.11 `de.innogames.onyx.multiplayer.services.MultiplayerService` (L520801-L520854) — wire **`MultiplayerEventService`**

* implements `IMultiplayerService`; injector key **`IMultiplayerService`** (L519585).
* Push listeners: `updateOverview` 👁 → `new Multiplayer(vo)`; `updateWaypoints` 👁 → `Waypoint[]`; `unlockStageReward` → `MultiplayerModelStageRewardsEvent`; `getMultiplayerEventReward` → `RewardSet`; `updateContributors` → `MultiplayerEventContribution._hx_new(vo)`.
* `getOverview()` → `[]` imm.; `openWaypoint(waypointId)` → `[waypointId]` imm.; `collectStageReward()` → `[]` imm.; `selectPath(path)` → `[path]` imm.

### 7.12 `de.innogames.onyx.city.challengeevents.services.ChallengeEventService` (L383965-L383981) — wire **`ChallengeEventService`**

* implements `IChallengeEventService`; injector key **`IChallengeEventService`** (L383942). Push-only: `getMilestoneRewards` → `ChallengeEventRewardEvent::showRewards`.

### 7.13 `de.innogames.onyx.shared.rewards.services.EpisodicRewardsService` (L576954-L576973) — wire **`EpisodicRewardsService`**

* implements `IEpisodicRewardsService`; injector key **`IEpisodicRewardsService`** (L575531). Push-only: `getRewards` → `SetEpisodicRewardsEvent/SET_REWARDS` (`EpisodicReward[]`).

### 7.14 `de.innogames.onyx.networking.services.TreasureService` (L80840-L80865) — wire **`TreasureService`**

* implements `ITreasureService`; injector key: the class (L469415). Game-side safe push `spawnTreasure` 👁 (L80870, L469075 — the city treasure decorations the extension auto-collects in `src/inject/local/localCollectEventTreasure.ts` by dispatching an `IsoDecorationEvent` on `aviad_silm.isoEngine`, not by calling this service).
* `getCurrencyEventTreasures()` → `[]` future; `openTreasure(type)` → `openTreasure`, `[type]` (e.g. `"neighbourly_help"` L469093, or `treasureDecoration.treasureType`), future(rewards[]); `refresh()` → `refresh`, `[]`, fire-and-forget.

---

## 8. Economy: trade, shop/offers, inventory, crafting, cauldron

### 8.1 `de.innogames.onyx.city.trade.services.TradeService` (L462276-L462309) — wire **`TradeService`**

* implements `ITradeService`; injector key **`ITradeService`** (L461595). `ResourceConverter.toCityGoodVO(resource)` (L544137) → `CityGoodVO {__class__:"CityGoodVO", good_id, value:Number}`.
* 👁 `Q:TradeService/getOtherPlayersTrades`.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `acceptWholesalerTrade(tradeId, cb)` | `acceptNpcOffer` | `[tradeId]` | imm. | cb(wholesalerVO) — `.npcTrades` |
| `acceptPlayerTrade(tradeId, cb)` | `acceptPlayerTrade` | `[tradeId]` | — | cb(data) |
| `cancelTrade(tradeId, cb)` | `cancelTrade` | `[tradeId]` | imm. | cb |
| `createTrade(offer, need, cb)` | `createTrade` | `[CityGoodVO(offer), CityGoodVO(need)]` | — | cb(result) — `{offer:{good_id,value}, need:…}` |
| `getNPCTrades(cb)` | `getNPCOffers` | `[]` | — | cb(wholesalerVO) |
| `getOtherPlayersTrades(cb)` 👁 | `getOtherPlayersTrades` | `[]` | — | cb(trades[]) |
| `getOwnPlayerTrades(cb)` | `getOwnPlayerTrades` | `[]` | — | cb(trades[]) |

### 8.2 `de.innogames.onyx.city.trade.services.MerchantService` (L462247-L462275) — wire **`MerchantService`**

* implements `IMerchantService`; injector key **`IMerchantService`** (L461596). Push `updateMerchants` → `UpdateMerchantEvent::updateMerchants`.
* `getMerchants()` → `[]` imm.; `hireMerchant(merchantId)` → `[merchantId]` imm.; `finishCooldown(merchantId)` → `[merchantId]` imm.; `trade(merchantId, offer, demand, cb)` → `trade`, `[merchantId, CityGoodVO(offer), CityGoodVO(demand)]`, cb.

### 8.3 `de.innogames.onyx.city.inventoryitems.service.InventoryService` (L416999-L417036) — wire **`InventoryService`**

* implements `IInventoryService`; injector key **`IInventoryService`** (L414579). Push `updateItems` 👁 → `InventoryModelEvent::processItems` (`InventoryItem[]`).
* 👁 `Q:InventoryService/getItems`.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `getItems()` 👁 | `getItems` | `[]` | imm. | — (answer arrives as `updateItems` push) |
| `placeBuilding(inventoryItemId, x, y, cb)` | `placeBuilding` | `[inventoryItemId, x, y]` | imm. | cb(data) — `data[0]` CityMapEntityVO |
| `useItem(itemId)` | `useItem` | `[itemId]` | imm. | — |
| `useItemOn(itemId, targetVO)` | `useItemOn` | `[itemId, targetVO]` | imm. | — |

### 8.4 `de.innogames.onyx.city.inventoryitems.service.DisenchantService` (L49659-L49676) — wire **`DisenchantService`**

* injector key: the class (L414580). `disenchantItems(inventoryItemId, count)` → `[id, count]` imm.; `disenchantSpells(inventoryItemId, count)` → `[id, count]` imm.

### 8.5 `de.innogames.onyx.networking.services.RewardSelectionKitService` (L49908-L49927) — wire **`RewardSelectionKitService`**

* implements `IRewardSelectionKitService`; injector key: the class (L575535). `chooseOne(inventoryItemId, rewardIndex)` → `chooseOne`, `[inventoryItemId, rewardIndex]`, future(rewards) (L577685).

### 8.6 `de.innogames.onyx.city.offers.services.OfferService` (L457719-L457738) — wire **`OfferService`**

* implements `IOfferService`; injector key **`IOfferService`** (L390835). Push-only: `refreshActiveOffers` → `OfferModelEvent::updateOffers` (`Offer[]`).

### 8.7 `de.innogames.onyx.city.ingameshop.services.InGameShopService` (L51390-L51411) — wire **`InGameOfferService`**

* injector key: the class (L412500). Game-side safe pushes `getOffers` and `updateInGameOffers` (L51180-2).
* `getOffers(offerId)` → `getOffers`, `[offerId]`, imm., future(eager); `buyOffer(offerId)` → `buyOffer`, `[offerId]`, imm., future.

### 8.8 `de.innogames.onyx.networking.services.CashShopService` (L37187-L37212) — wire **`CashShopService`**

* implements `ICashShopService`; injector key: the class (L366191). Game-side safe pushes `getProducts`, `refreshProducts` (L31313-4).
* `getCashShopConfig()` → `[]` future(vo); `getProducts()` → `[]` future(vo); `getPurchaseLink(productId)` → `[productId]` future(url).

### 8.9 `de.innogames.onyx.city.ui.windows.academy.crafting.services.CraftService` (L36706-L36752) — wire **`CraftService`** (callback style)

* injector key: the class (L488352). Push `updateActiveRecipe` → `CraftingServiceEvent::update_active_recipe`; `updateProgress` → `::update_progress`.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `getCraftingData()` | `getCraftingData` | `[]` | imm. | internal → `CraftingServiceEvent::update_data` |
| `craft(recipeId)` | `startCrafting` | `[recipeId]` | imm. | — |
| `premiumCraft(recipeId)` | `startPremiumCrafting` | `[recipeId]` | imm. | — |
| `collectCraftedItem(cb)` | `collectCraftedItems` | `[]` | imm. | cb(rewards[]) |
| `instantFinish()` | `instantFinish` | `[]` | imm. | — |
| `cancelCrafting()` | `cancelCrafting` | `[]` | imm. | — |
| `instantGetSlots()` | `instantRefreshSlots` | `[]` | imm. | internal → update_data |
| `collectChest(cb)` | `collectChestRewards` | `[]` | imm. | cb(rewards[]) |

### 8.10 `de.innogames.onyx.networking.services.CraftService` (L523796-L523842) — wire **`CraftService`** (future style)

* implements `ICraftService`; injector keys: the class **and** `ICraftService` (L488358-9). Game-side safe pushes `getCraftingData`, `updateActiveRecipe`, `updateProgress` (L55507-9); constant `getTransitionRewards` exists (L784149) but is unused.
* `cancelCrafting()` `[]`; `collectChestRewards()` `[]` future; `collectCraftedItem()` `[]` future; `collectCraftedItems()` `[]` future; `getCraftingData()` `[]` future; `instantFinish()` `[]`; `instantRefreshSlots()` `[]` future; `startCrafting(recipeId)` `[recipeId]`; `startPremiumCrafting(recipeId)` `[recipeId]`; `trackHighlightsOpened()` `[]`. None imm.

### 8.11 `de.innogames.onyx.city.ui.windows.academy.cauldron.services.CauldronService` (L481454-L481497) — wire **`CauldronService`**

* injector key: the class (`toSingleton(CauldronService,true)` L480750). Push `getData` → `UpdateCauldronStateCommand_Event(new CauldronData(vo))`; `getLastUsedGobletResult` → `SetGobletResultCommand_Event(vo)`.
* 👁 `Q:CauldronService/getIngredients`, `Q:CauldronService/getPotionEffects` (processors disabled).

| method | wire method | requestData | flags | result |
|---|---|---|---|---|
| `getIngredientList()` 👁 | `getIngredients` | `[]` | imm. | `Async` wrapper around future (`de.innogames.networking.services.Async._hx_new` L139511) |
| `brew(ingredientList, spellFragmentUsed, premiumBoost)` | `brew` | `[ingredientList, spellFragmentUsed, premiumBoost]` | imm. | — |
| `confirmGobletEffect(id=0)` | `confirmGobletEffect` | `[id]` | imm. | — |
| `getPotionEffectsList()` 👁 | `getPotionEffects` | `[]` | imm. | future |
| `getConvertableResourceList()` | `getResources` | `[]` | imm. | future |
| `investWitchPoints(potionEffectId, witchPointsCost)` | `investWitchPoints` | `[potionEffectId, witchPointsCost]` | imm. | future(diff) → `potionEffectsModel.updateWithDiff` |
| `convertToWitchPoints(resourceId, convertNum)` | `trade` | `[resourceId, convertNum]` | imm. | — |

---

## 9. Meta: startup, log, settings, features, manifest, support, ads, CRM, CMP, misc

### 9.1 `de.innogames.onyx.networking.services.StartupService` (L17105-L17127) — wire **`StartupService`**

* implements `IStartupService`; injector key: the class (L390815). 👁 `Q:StartupService/getData` (the payload the extension's `processCityData` consumes).
* `getData()` → `getData`, `[]`, future(startup payload — see `12-models-and-startup-data.md`); `getCrmData()` → `getCrmData`, `[]`, future.

### 9.2 `de.innogames.strategycity.main.service.PostStartupService` (L44710-L44724) — wire **`PostStartupService`**

* injector key: the class (L390816). `getPostStartupData()` → `getPostStartupData`, `[]`, imm. — no callback; the batched answer is a bundle of pushes to other services.

### 9.3 `de.innogames.onyx.networking.services.ManifestService` (L15476-L15495) — wire **`ManifestService`**

* implements `IManifestService`; injector key: the class (L518321). `getManifests()` → `[]` future(vos[]) → `ManifestModel.addManifest(Manifest._hx_new(vo))` (L391558) — static-data manifests (see `04-networking-layer.md` "static data").

### 9.4 `de.innogames.onyx.networking.services.FeaturesService` (L523852-L523871) — wire **`FeaturesService`**

* implements `IFeaturesService`; injector key: the class (L390817). Game-side safe pushes `getFeatures`, `getFeatureFlags` (L390105-6). `getFeatureFlags()` → `[]`, fire-and-forget (answer via push).

### 9.5 `de.innogames.onyx.networking.services.AbsolutionService` (L57398-L57417) — wire **`AbsolutionService`**

* implements `IAbsolutionService`; injector key: the class (L140041). `getData()` → `getData`, `[]`, future.

### 9.6 `de.innogames.onyx.networking.services.LogService` (L31228-L31292) — wire **`LogService`**

* implements `ILogService`; injector key: the class (L389978). All fire-and-forget, none imm.: `logGameLogin(loadingTime)`, `logPerformanceMetrics(vo)`, `trackAppLifeCycle(step)`, `trackCrossSell(deviceId, campaignId)`, `trackDownloadFinishSize(category, retryCounter, elapsedTime, size)`, `trackDownloadStartSize(category, size)`, `trackDownloadStopSize(category, reason, size)`, `trackEventWindowOpen(type)`, `trackGameStartup(stepName)`, `trackInstallSize(installSize, freeSpace)`, `trackRatingScreen(action)`, `trackShopCancel(sessionId)`, `trackShopClose()`, `trackShopError(sessionId, type, errorCode, message)`, `trackShopOpen(sessionId)`, `trackSocketConnection(method)` — wire method = method name, requestData = the args in order.

### 9.7 `de.innogames.strategycity.main.service.SettingsService` (L665426-L665485) — wire **`SettingsService`**

* implements `ISettingsService`; injector key **`ISettingsService`** (L390825). Push `requestActivationCode` / `updateActivationEmail` → `ResendActivationEmailEvent::success`.

| method | wire method | requestData | flags | callback |
|---|---|---|---|---|
| `updateSettings(settings, immediately=false, cb)` | `updateSettings` | `[settingsVO]` | imm.(immediately), PLR | cb(success:Bool) |
| `fetchEmail()` | `fetchEmail` | `[]` | imm. | — |
| `updateEmail(newEmail, password, cb)` | `updateEmail` | `[newEmail, password]` | — | cb(data `{successful,…}`) |
| `updatePassword(password, newPassword, cb)` | `updatePassword` | `[newPassword, password]` ⚠ | imm. | cb(data) |
| `validateEmail(email, cb)` | `validateEmail` | `[email]` | imm. | cb(data) |
| `addEmail(email, hasAcceptedEmails=false, cb)` | `addEmail` | `[email, hasAcceptedEmails]` | imm. | cb(data) |
| `validatePassword(password, playerName, cb)` | `validatePassword` | `[password, password, playerName]` | imm. | cb(data) |
| `activateEmail(activationCode)` | `activateEmail` | `[activationCode]` | imm. | — |
| `requestActivationCode()` | `requestActivationCode` | `[]` | — | via push |
| `requestActivationCodeWithNewEmail(email)` | `updateActivationEmail` | `[email]` | — | via push |
| `ignorePlayer(playerName)` / `unignorePlayer(playerName)` | same | `[playerName]` | imm. | — |

### 9.8 `de.innogames.strategycity.main.service.PlayerProfileService` (L61106-L61158) — wire **`PlayerProfileService`**

* injector key: the class (L390821). Injected `portraitModel`. Push `getUnlockedAvatars` → `portraitModel.addUnlocked(ids as strings)`; `getAllUnlockedAvatars` → `portraitModel.set_unlocked`.
* `setCityName(name)` → `[name]`; `setPortraitId(portraitId)` → `[portraitId]`; `setEmailOptin(hasAcceptedEmails)` → `[bool]` imm.

### 9.9 `de.innogames.strategycity.main.service.NewsService` (L84524-L84564) — wire **`NewsService`**

* injector key: the class (L390826). Push `fetchNews` → `NewsServiceEvent::UPDATE` (`NewsData[]`).
* `trackNews(news, trackType, tab)` → `trackNews`, `[TrackNewsVO {type:news.newsType, action:trackType.name, firstRead:news.isNew, priority:news.isUrgent, tab, theme:news.themeId}]`, imm.

### 9.10 `de.innogames.onyx.shared.indicators.services.IndicatorsService` (L563048-L563076) — wire **`IndicatorsService`**

* implements `IIndicatorsService`; injector key **`IIndicatorsService`** (L390827). Push `getIndicators` → `IndicatorsServiceEvent::indicatorsLoaded` (`Indicator[]`).
* `getIndicators()` → `[]` imm.; `clearIndicator(indicatorId, categoryId)` → `clearIndicator`, `[categoryId, indicatorId]` ⚠ order, imm.; `clearIndicators(indicatorIds)` → `[[id,…]]` imm.

### 9.11 `de.innogames.onyx.valuemanipulation.services.ValueManipulationService` (L642601-L642626) — wire **`ValueManipulationService`**

* implements `IValueManipulationService`; injector key **`IValueManipulationService`** (L642017). Push-only: `getValueManipulations` → `ValueManipulationEvent::handle` (`ValueManipulation[]`) — server-driven balancing overrides.

### 9.12 `de.innogames.onyx.shared.exceptions.ExceptionService` (L550673-L550692) — wire **`ExceptionService`**

* injector key: the class (L389977). Push-only: `exception` → `ServiceExceptionEvent::exception` (exception `{code, …}`; e.g. code 5001 handled in guild code L553511); `redirect` → `RedirectEvent::redirectTo` (`redirect.url`, `redirect.message`).

### 9.13 `de.innogames.onyx.shared.service.CallbackService` (L579406-L579421) — wire **`CallbackService`**

* injector key: the class (L390832). Push-only: `call` → `_onCallback(vo)` which **issues a new request** `this.request(vo.method).withService(vo.service).immediate().call()` — the server can make the client call any `service.method` with empty data.

### 9.14 `de.innogames.onyx.city.crm3.services.CRMService` (L36917-L36966) — wire **`Crm3Service`**

* injector key: the class (L394316). Push listeners: `getInterstitials` → `CRMModelEvent::addInterstitials` (`CRMInterstitial[]`); `addInterstitial` (only if `vo.validPlatforms` contains `"bro"`); `removeInterstitial` (targetId); `executeCallToAction` → `CRMCallToActionEvent::executeCTA`; `displayTrackingPixel` (static handler → `ExternalUtil.showMarketingPixel(pixelContent)`).
* `acceptInterstitial(targetId, displayPoint, buttonIndex, cb)` → `[targetId, displayPoint, buttonIndex]`, cb; `rejectInterstitial(targetId, displayPoint)` → `[targetId, displayPoint]`; `markInterstitialSeen(targetId, displayPoint)` → `[targetId, displayPoint]`. None imm.

### 9.15 `de.innogames.onyx.cmp.services.CmpService` (L512187-L512204) — wire **`CmpService`**

* injector key: the class (L512036). `storeConsentToken(consentToken, controllerId)` → `[token, controllerId]` imm.; `trackOpenConsentPopup()` → `[]` imm.

### 9.16 `de.innogames.onyx.networking.services.SupportService` (L69208-L69230) — wire **`SupportService`**

* implements `ISupportService`; injector key: the class (L518543). `getSupportUrl(data)` → `[diagnosticsInfo]` future(url); `getSupportUrlForClientData(device, data)` → `[device, data]` future(url).

### 9.17 `de.innogames.onyx.videoads.services.VideoAdService` (L643681-L643714) — wire **`VideoAdService`**

* injector key: the class (L642844). Game-side safe pushes `getFeatures`, `getRewards`, `getBuildersBonusConfig` (constants in `api.VideoAdAPI`, L781300-2; registered L17726-8).
* `getFeatures()` → `[]` future; `getBuildersBonusConfig()` → `[]` future; `start/finish/track/bypass(featureId, context)` → `[featureId, context]` imm.

---

## 10. Reconciliation with the raw index (nothing missed)

* `grep -c 'get_serviceName: function'` = 86: the 83 catalogued classes plus 3 non-services
  (`NetConnectionService` L12795 throwing `NotImplementedError`, `ServerRequest.get_serviceName`
  L139746, `ServerResponse.get_serviceName` L657918).
* `__super__ = de_innogames_shared_networking_AbstractConnectionService` = 82 = all concrete
  services in `services-raw.md`. No class extends another *service* (checked every service's
  compiled identifier against `__super__ =`), so there are no second-level subclasses.
* Every `this.request("…")` (293 occurrences) lies inside one of the 83 class ranges. Other
  `.request(` hits are unrelated (`diffService.request`, `requestHelper.request`, and
  `CallbackService._onCallback` at L579418 which is inside its range).
* Every `.addPushResponseListener(` / `.addResponseListener(` call is inside a service ctor; the
  35 `.addSafePushResponse(` calls made from *outside* the services (models/mediators) are the
  "game-side safe push" notes above — those are extra `requestMethod`s the server sends that the
  ctor tables do not show: `updateBoost`, `getCityCulture`, `getCityPopulation`, `getCulture`,
  `update`/`updateCounters`/`getAllSources`/`updateSources`/`nh_update_helpers` (EffectsService),
  `allBuildingsStates`/`buildingsStateUpdated`, `getFeatures`/`getRewards`/`getBuildersBonusConfig`
  (VideoAdService), `updateState` (SpireStateService), `getCollection` (GuardianService),
  `getProducts`/`refreshProducts` (CashShop), `getOffers`/`updateInGameOffers`,
  `getCraftingData`/`updateActiveRecipe`/`updateProgress`, `getPointsArchive` (both spire and
  tournament), `spawnTreasure`, `getFeatures`/`getFeatureFlags` (FeaturesService),
  `showSpireRewards`, `effectsOverview`, `phaseUpdated`/`showHelpReward` (AW, in ctor).
* Two `SpireService` packages (`…spire.service` vs `…spire.services`) plus the
  `…networking.services.SpireService` all answer to wire `SpireService`; likewise two
  `CraftService`s. The `de.innogames.onyx.networking.services.*` family (Absolution, CashShop,
  Craft, Effects, Features, Guardian, Log, Manifest, RewardSelectionKit, Spire, SpireEffect,
  SpireShop, Startup, Support, Transcendence, Treasure) is the newer future-based generation with
  `I<Name>Service` interfaces and `…constants.<Name>ServiceConstants_*` push-name constants
  (L784146-L784167).

## 11. Quick recipes (service-level; fuller ones in `06-extension-hooks-and-recipes.md`)

```js
// live, registered instance (callbacks + pushes work):
const inj = window.aviad_am.injector;
const wm  = inj.getInstance(window.aviad['de.innogames.onyx.worldmap.service.IWorldMapService']);
wm.getProvinceInformation({get_columnIndex:()=>r, get_rowIndex:()=>q}, data => console.log(data)); // wire: [r, q]

// fire a raw RPC on any service (fresh instance is fine when you only need the wire call;
// read the answer via the interceptor key R:<wire>/<method>):
const S = window.aviad['de.innogames.onyx.tournaments.services.WorldMapTournamentService'];
new S().request('getProvincesOverview').immediate().call();      // → R:TournamentService/getProvincesOverview

// invest KP into another player's wonder (fire-and-forget; watch R:AncientWonderService/phaseUpdated):
const AW = window.aviad['de.innogames.onyx.city.ancientwonders.services.AncientWonderService'];
new AW().investKnowledgePoints(playerId, entityBaseName, amount);  // → AncientWonderService.investKnowledgePoints [playerId, baseName, amount]
```

## Open questions / not verified

* Response shapes are given only to the depth of the first game-side handler (VO or wrapper class
  name, top-level fields touched). Full field lists of the VOs
  (`de.innogames.onyx.networking.vos.*`) are the `12-models-and-startup-data.md` agent's scope.
* Whether the JSON provider hands the same `responseData` object to *all* registered services with
  a shared wire name (it iterates them, L139981-L139989) — presumably yes; not traced into the provider.
* `NeighborlyHelpService.helpPlayer` (used by `src/inject/local/localHelpPlayer.ts`) is newer than
  both full snapshots (game ≥ 1.239, verified in the July 2026 min bundle) — its exact response
  shape has not been read from unminified code.
* Which of the two `TournamentService` classes actually receives `getProvincesOverview` pushes
  first is irrelevant (both registered instances get every response), but the extension's
  `getTournamentProgress(cb)` cb argument is definitely ignored (method takes none).
* `SpireShopServiceConstants_UpdateItem = "updateItem"` and `CraftServiceConstants_GetTransitionRewards`
  are defined but no listener registers them in this snapshot; the server may still push them.
* `CallbackService` (`call` push → arbitrary `service.method` request) was not observed in traffic;
  its `vo` shape `{service, method}` is inferred from the handler only.
* Injector keys were taken from the `injector.map(...)` lines found for each class; a few
  services are mapped in more than one context (e.g. `SpireService` at L617073 and L619697); the
  extension's `aviad_am.injector` is the root context — child-context-only mappings (spire, battle
  modules) may not resolve from it. Not tested at runtime.
