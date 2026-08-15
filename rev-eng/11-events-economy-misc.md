# 11 — Events, economy & misc (seasonal events, chests, quests, resources, trade, inventory, academy, tech tree, meta services)

## Scope

Everything the other domain docs do not own: the seasonal/main-event stack
(`de.innogames.onyx.seasonalevents.*`, `currencyevents.*`, `city.mainevents.*`, `eventintro.*`,
`city.challengeevents.*`, `chests.*`, `shared.rewards.*`, `shared.quests.*`, `city.treasure.*`,
`RewardSelectionKitService`), the economy (`resources.*`, `city.trade.*`, `city.offers.*`,
`city.inventoryitems.*`, `city.ui.windows.academy.*` crafting & cauldron, `city.ingameshop.*`,
`cashshop.*`, `valuemanipulation.*`, `miners.*`, `absolution.*`, `TranscendenceService`,
`guardians.*`), the tech tree (`techtree.*`) and the meta/telemetry layer (`StartupService`,
`PostStartupService`, `SettingsService`, `FeaturesService`, `ManifestService`, `LogService`,
Sentry, `SupportService`, `VideoAdService`, `cmp.*`, `city.crm3.*`, `NewsService`, `RelicService`,
`shared.indicators.*`, `microsoft.*`, `videoads.*`, `archive.*`, `de.innogames.diagnostics.*`,
`configs.*`, `constants.*`, `fx.*`). Snapshot: `tmp/elvenar-release-full-reveng.js` (Feb 12 2026).
Line numbers are `Lnnnnnn` in that file. Wire format of a call (`request().withData([...])`) is
described in `04-networking-layer.md`; the raw per-service action list is `index/services-raw.md`.

Conventions used below:

- "push" = a `requestClass/requestMethod` entry that arrives inside *any* response array (the
  server piggy-backs pushes on every reply); the extension already matches several of these in
  `src/inject/playerSpecificMatchers.ts` (`requestClass`/`requestMethod` pairs) — flagged as
  **[ext]** with the handler file.
- VO field lists come from the `de.innogames.onyx.networking.vos.*` constructors/`fromJsonObject`
  (the models & startup-data doc owns those classes in depth; here only what these features need).
- Recipes assume the hooks documented in the extension-hooks doc: `window.aviad[FQName]` gives a
  Haxe class constructor, `window.aviad_am.injector` is the app-context injector
  (`getInstance(Ctor)` for singletons — services/models — and `getOrCreateNewInstance(Ctor)` for
  commands), see `src/inject/local/localOpenAw.ts` / `localVisitPlayer.ts`; `inj` below is
  `window.aviad_am.injector`. `new svcCtor()` also works for fire-and-forget calls
  (`src/inject/local/localHelpPlayer.ts`) but a freshly `new`ed service has its injected model
  fields `null`, so pushes it handles itself (`_onGetResources` etc.) would throw — prefer
  `injector.getInstance`.

---

## 1. Seasonal events framework (`de.innogames.onyx.seasonalevents.*`, 73 classes)

### 1.1 Service

`de.innogames.onyx.seasonalevents.services.SeasonalEventsService` (L545997), serviceName
**SeasonalEventsService**:

| method | wire | notes |
|---|---|---|
| push `getEvents` → `onGetEvents(vos)` | `SeasonalEventVO[]` | **[ext]** `SeasonalEventsService.getEvents` → `src/elvenar/processSeasonalEvents.ts` (reads FA `multiplayerEvent`/`mpe_i` remaining time) and `src/elvenar/sendQuestQuery.ts` |
| `confirmEventStarted(seasonalEventId)` | `confirmEventStarted [id]` immediate | client acknowledges the "event started" popup |
| `confirmEventEnded(seasonalEventId)` | `confirmEventEnded [id]` immediate | acknowledges end popup; server then stops sending the event |
| `requestEventsUpdate()` | `requestEventsUpdate []` immediate | server answers with a `getEvents` push |

`SeasonalEventVO` (L537101, extends `AbstractSeasonalEventVO` L524525):
`eventId:Int, type:String, subType:String, name:String, state:String, remainingTime:Int (s),
properties:AbstractSeasonalEventPropertyVO[]`. `state` is the lower-cased form of
`SeasonalEventState` (L544515): `NEW | RUNNING | COMING | END | LAST | LOCK` (the extension tests
`state === 'running'`).

Event `type` values — `de.innogames.onyx.seasonalevents.constants.SeasonalEventTypes` (L544523,
statics at L784324ff):

| constant | value | notes |
|---|---|---|
| TOURNAMENT | `tournament` | subType = the tournament good; see worldmap/tournament doc |
| MULTIPLAYER_EVENT | `multiplayerEvent` | Fellowship Adventures, subType `mpe_i` |
| CHALLENGE_EVENT | `challengeEvent` | "Challenge" (production/spending slots, medals) |
| SPIRE_EVENT | `spireEvent` | see spire doc |
| CAULDRON | `cauldron` | cauldron season |
| SEASON_PASS | `seasonPass` | Season Pass |
| CURRENCY_EVENT / THEATER_EVENT / SHUFFLE_EVENT / TILE_EVENT / MERGE_EVENT | `currencyEvent`, `theaterEvent`, `shuffleEvent`, `tileEvent`, `mergeEvent` | `MAIN_EVENT_TYPES` — the big themed events; each has a `subType` naming the theme (`kitchen`, `dwarvengame`, `amuni`, `mistyforest`, `postal`, `garden`, `zodiac`, `yulecat`, `easter`, `aquatic`, `sorcerers` — see the `city.mainevents.<kind>.<theme>` sub-packages) |

Property VOs carried in `properties` (each has `__class__`; wrapped by
`SeasonalEventPropertyFactory` L546031 into `models.data.properties.*`, keyed by enum
`SeasonalEventPropertyType` L545866):

| VO (line) | fields | wrapper / enum |
|---|---|---|
| `EpisodeBasedEventPropertyVO` (L529732) | `episodeNumber, nextIn, reRollPremiumCosts` | `EpisodeBasedProperty` (L545760) / `EPISODE_BASED` |
| `TotalPaybackEventPropertyVO` (L540044) | `totalPayback` | `TotalPaybackProperty` (L545851) / `TOTAL_PAYBACK` |
| (last collected payback) | `lastPayback` | `LastCollectedPaybackCurrency` (L545775) / `LAST_COLLECTED_PAYBACK_CURRENCY` |
| (current iterable chest) | `chestId` | `CurrentIterableChestId` (L545746) / `CURRENT_ITERABLE_CHEST_ID` — which repeating grand prize is next |
| `RoyalPassProgressVO` (L536538) | `currentGrandPrizeIndex, currentRoyalPrizeIndex, hasRoyalPass, isGrandPrizeClaimable, isRoyalPrizeClaimable, nextReachableRewardIndex` | `RoyalPassProgress` (L545792) / `ROYAL_PASS_PROGRESS` |
| `SeasonPassPropertyVO` (L536910) | `nextDailyQuestsIn, nextWeeklyQuestsIn, availableWeeklyQuestRerolls, weeklyQuestsTotal, weeklyQuestsCompleted, hasSeasonPass, claimedLevels, premiumNextLevel, hasClaimedDailyChest, seasonPassOfferId, petalsOfferId` | `SeasonPassProperty` (L545819) / `SEASON_PASS` |

### 1.2 Model & wrappers

- `de.innogames.onyx.seasonalevents.models.SeasonalEventsModel` (L545120; interface
  `ISeasonalEventsModel` L11764): `eventsList`, `eventsMap` (IntMap by eventId), `eventsByType`
  (`SeasonalEventsByTypeCollection` L545078), `addEvents(events, mustResetEvents, dispatch)`,
  ticks `remainingTime` down (`ITickObject`).
- `models.data.SeasonalEvent` (L545607): `get_id/type/subType/name/state/remainingTime/running`
  (`running` = state NEW or RUNNING), `get_properties()`, `getProperty(SeasonalEventPropertyType)`.
  `NullSeasonalEvent` (L545550) is the null-object.
- `models.data.ChallengeEvent` (L545476), `Milestone` (L545534), `Slot` (L545666: `medals,
  position, icon, typeId, subType, title, baseNames[]`, `isEntityTargeted(cityEntityId)`),
  `SlotType` (L545705) — Challenge-event config; `models.ChallengeEventsModel` (L32421):
  `get_activeChallengeEvent, get_productionSlots, get_spendingSlots, get_milestones,
  get_nextMilestone, get_collectedMedals, get_maxMedals, getSlotsByType(id)`.

### 1.3 Commands / events (controller config `SeasonalEventsControllerConfiguration` L544465)

| event type string | command |
|---|---|
| `SeasonalEventsModelEvent::prepareEvents` | `PrepareSeasonalEventsCommand` (L544234) — makes sure the per-event static data is loaded (see 1.4) |
| `SeasonalEventsModelEvent::serverDataReceived` | `UpdateSeasonalEventsCommand` (L544432) |
| `SeasonalEventsModelEvent::modelUpdated`, `ModuleChangeEvent::moduleChanged` | `SeasonalEventsUpdatedCommand` (L544352) |
| `SeasonalEventsModelEvent::requestEventsUpdate` | `RequestSeasonalEventsUpdateCommand` (L544341) → `service.requestEventsUpdate()`; also `shared.quests.commands.UpdateQuestCommand` |
| `SeasonalEventsEvent::confirmStarted` | `ConfirmSeasonalEventStartedCommand` (L544222) (+ royal-pass/season-pass flexible-reward refresh) |
| `SeasonalEventsEvent::confirmEnded` | `ConfirmSeasonalEventEndedCommand` (L544210), `ClearEventQuestsCommand` (L544185) |
| (dispatched by model) | `SeasonalEventsEvent::started` / `::ended` (`events.SeasonalEventsEvent` L18148); `SeasonPassEndedCommand` listens on `::ended` |

### 1.4 Per-event static data (this is where chest odds live)

Every seasonal event has a balancing JSON on the CDN keyed
`xml.balancing.seasonal_events.<type>.<subType>`
(`de.innogames.onyx.city.controller.bootstrap.staticdata.SeasonalEventStaticData.getKey` L393875),
fetched by `LoadSeasonalEventDataCommand` (L393787) via the manifest/hash mechanism used for
all `xml.balancing.*` files (the family the extension already sniffs by URL regex in
`src/inject/nonSpecificMatchers.ts`, e.g. `xml.balancing.city.Buildings_<md5>.json`; the file
name here is `xml.balancing.seasonal_events.<type>.<subType>_<md5>.json`). Its shape is
`{ <key>: { components: [ <StaticDataComponentVO>, ... ] } }`; each component has a `__class__`
and is dispatched by `seasonalevents.handlers.StaticDataHandler` (L82824) to one handler each:

| component `__class__` (VO line) | payload | handler → model |
|---|---|---|
| `ChestsComponentVO` (L527134) | `chests: ChestVO[]` (`id, name, description, type, subType, size, iterable`) | `ChestsHandler` (L544645) → `ChestsModel.initializeChestConfig` |
| `ChestRewardsComponentVO` (L527019) | `rewards: ChestRewardVO[]` (`chestId, rewards: RewardVO[]`) | `ChestRewardsHandler` (L544624) → `ChestsModel.initializeChestRewards` |
| `ChestCostsComponentVO` (L526778) | `chestCosts: ChestCostsVO[]` (`chestId, tier, costs:{good_id→value}, premiumCostPerOne`) | `ChestCostsHandler` (L544602) |
| `ChestConditionsComponentVO` (L526755) | `ChestConditionVO[]` (`chestId` + `ChestSeasonPassConditionVO`/`ChestMergeableConditionVO`) | via `chests.conditions.ChestConditionsFactory` (L370407) |
| `WeightedRewardsComponentVO` (L542107) | `weightedRewards: WeightedRewardVO[]` (`id, chances: RewardChanceVO[]`); `RewardChanceVO` (L536391) extends `RewardVO` and adds `percentage` | `WeightedRewardsHandler` (L544752) → `WeightedRewardsModel.addReward(id, RewardChance[])` |
| `CurrencyEventsComponentVO` (L528858) | `id, currencies[], paymentHeaderText, toolShopHeaderText, treasureHint, chestOpenDescription, eventWindowPrompt, milestoneQuestGiver` | `CurrencyEventsHandler` (L544662) → `CurrencyEventsModel.addConfig` |
| `CurrencyEventMainRewardComponentVO` (L528818) | `subtype, itemId, rewardId, rewardType` | `CurrencyEventsMainRewardHandler` (L544677) |
| `EventLeagueComponentVO` (L529871) | `type, subtype, description, eventLeagueConfigs: {name, topPercentage, rewards[]}[]` | `EventLeagueHandler` (L544692) |
| `KeyDialogComponentVO` (L531814), `HelpDataComponentVO` (L531421), `EventIntroComponentVO` (L529797) | UI texts / intro screens | `KeyDialogHandler` (L544707), `HelpDataHandler` (L544548), `EventIntroDataHandler` (L544533) |
| `QuestMilestoneComponentVO` (L535412) | `milestones: QuestMilestoneVO[]` (`counter, reward`) | `QuestMilestoneHandler` (L544722) → `QuestMilestonesModel` |
| `RoyalPassPrizesComponentVO` (L536500) | `subtype, grandPrizeRewards[], royalPrizeRewards[]` of `RoyalPassRewardVO {delta, iterable, reward}` | `RoyalPassPrizesHandler` (L544737) |
| `SeasonPassLevelsComponentVO` (L536867) | `levels: SeasonPassLevelVO[]` (`subtype, requiredXp, requiresPass, rewards[]`) | `SeasonPassLevelsHandler` (L544872) |
| `ChallengeConfigComponentVO` (L526620) | `id, name, milestones: MilestoneVO[] {effortNeeded, reward}, slots: SlotVO[], types: SlotTypeVO[]` | `ChallengeConfigHandler` (L544587) |
| `MergeCellOrderComponentVO`, `MergeChainsComponentVO`, `MergeablesComponentVO` (L532396/532423/532560) | merge-event board layout, chains, mergeable ids/names | `merge.CellOrderHandler/ChainsHandler/MergeablesHandler` (L544779ff) |
| `TileEventToolsComponentVO` (L539972) | `tools: TileEventToolVO[]` (`id, selectionConstraints[], targetConstraints[]`) | `tile.TileToolsHandler` (L545020) |
| `CauldronBasicValuesComponentVO` (L526301) | all cauldron tuning constants (`basicCost, criticalChanceMax, spellFragmentsBoost, …`) | `cauldron.CauldronBasicValuesHandler` (L544563) |
| Spire*/WaypointPositions/CheckpointRewards components | spire, FA & tournament — other docs | |

**Recipe — read the odds of an event chest at runtime** (no network):

```js
const inj = window.aviad_am.injector;
const cem = inj.getInstance(window.aviad['de.innogames.onyx.currencyevents.models.CurrencyEventsModel']);
const wrm = inj.getInstance(window.aviad['de.innogames.onyx.shared.rewards.models.WeightedRewardsModel']);
for (const chest of cem.getChests()) {                     // event_chest of the active event, sorted by event_currency_1 cost
  const cost = chest.costs.get_resources().map(r => [r.id, r.get_intValue()]);
  const weighted = chest.rewards.getRewardsByType('weighted')[0];  // RewardSet → Reward('weighted', subType = weighted-reward id)
  const odds = wrm.getChances(weighted.get_subType())      // RewardChance[]
      .map(c => ({type: c.get_type(), subType: c.get_subType(), amount: c.get_amount(), pct: c.get_percentage()}));
  console.log(chest.get_id(), cost, odds, 'premiumCostPerOne', chest.premiumCostPerOne);
}
```
(This is exactly what the chest tooltip does: `ElementHandlerChestWeightedReward` L397669.)
Grand prizes: `cem.getGrandPrizes()` / `getCurrentGrandPrize()` (chest type `event_grand_prize`);
premium currency packs: `cem.getEventCurrencyOptions()` (type `event_currency_option`).
Alternatively parse the static JSON directly (URL pattern above) — the same numbers.

---

## 2. Currency events (`de.innogames.onyx.currencyevents.*`, 31) and treasures (`city.treasure.*`, 28)

- `currencyevents.models.CurrencyEventsModel` (L513007, `ICurrencyEventsModel` L10059):
  `get_isRunning`, `get_activeEvent()` (a `SeasonalEvent`), `get_activeEventConfig()`
  (`wrapper.CurrencyEventConfig` L513733), `get_activeEventMainReward()`, `get_activeEventEpisode()`,
  `getChests()`, `getGrandPrizes()`, `getRepeatingGrandPrizes()`, `getCurrentGrandPrizeIndex()`,
  `areAllGrandPrizesCollected()`, `getEventCurrencyOptions()`, `getChestPositionForId(id)`.
  For `theaterEvent` chests come from `ChestsModel.getRotatedChests(subType)` (rotation pushed
  by `ChestsService.getEventChestRotation`).
- Event currency resource ids — `currencyevents.constants.EventCurrencies` (L416177):
  `event_currency_1`, `event_currency_2`, `event_payback`. Tile-event tools —
  `constants.ToolIds` (L416183): `tile_event_tool_single|column|adjacent`.
- `currencyevents.decorations.*` (L513260ff) restyle quest windows/HUD while an event runs
  (`IEventDecoratable` L43841); `helpers.Event*AssetHelper` (L512651ff) resolve theme assets — UI only.
- `events.CurrencyEventEvent` (L512641).

### 2.1 Treasures (the little chests that spawn in the city)

`de.innogames.onyx.networking.services.TreasureService` (L80843), serviceName **TreasureService**;
the extension registers its constructor as `window.aviad_ts` (`src/inject/injectMutate.ts`):

| method | wire | returns |
|---|---|---|
| `getCurrencyEventTreasures()` | `getCurrencyEventTreasures []` future | (treasure list; not used by the click flow) |
| `openTreasure(type)` | `openTreasure [type]` future | `RewardVO[]` |
| `refresh()` | `refresh []` | — |
| push `spawnTreasure` (`TreasureServiceConstants.SpawnTreasure` L784167) | `TreasureVO[]` (L540508: `type:String, isFirstTime:Bool`) | **[ext]** `TreasureService.spawnTreasure` → `src/inject/local/localCollectEventTreasure.ts` |

Treasure `type` values seen: `currency_event`, `neighbourly_help`, `video_ad`.

Flow (`city.treasure.config.TreasureControllerConfig` L469394):
1. `city.treasure.model.TreasureViewModel` (L80872; registered as `window.aviad_tv`) listens for the
   push, keeps `state` (tink `State<Treasure[]>`; `data.Treasure` L469427 = `{id, x, y,
   treasureType}`), `getTreasures(type)`, `hasTreasure(type)`, `removeTreasure(id)`.
   `neighbourly_help` treasures are *not* placed: `city.treasure.CityMapController.spawnTreasure`
   (L469077) immediately calls `openTreasure("neighbourly_help")` and shows the reward.
2. `videoads.control.IsoTreasureHelper.spawnCurrencyTreasure` (~L643420) turns each `Treasure`
   into a `TreasureDecoration` on the iso engine.
3. Clicking dispatches `IsoDecorationEvent::click` (decorationId = treasure id) →
   `commands.OpenTreasureCommand` (L469120, guard `CanGetReward` L469296 = type != `video_ad`) →
   removes the decoration, `service.openTreasure(type)` → `TreasureRewardsEvent::showRewards` →
   `ShowCurrencyEventTreasureBlimpCommand` (L469196, own city) / neighbourly-help windows.
   `video_ad` treasures go to `OpenVideoAdTreasureCommand` (L469145).

**Recipe (what the extension does)** — `localCollectEventTreasure.ts`: after a response containing
`TreasureService.spawnTreasure`, wait 2 s, `window.aviad_tv.getTreasures('currency_event')`, then for
each id (10 s before the first, 1 s between) do
`window.aviad_silm.isoEngine.dispatchEvent(new window.aviad['de.innogames.onyx.city.engine.events.IsoDecorationEvent']('IsoDecorationEvent::click', id))`
(`aviad_silm` = `SnakeInteractiveLayerMediator`). The direct alternative is
`inj.getInstance(TreasureService).openTreasure('currency_event').handle(rewards => …)` — but that
skips the decoration bookkeeping, so the chest stays drawn until `TreasureViewModel.removeTreasure(id)`.

---

## 3. Chests (`de.innogames.onyx.chests.*`, 71)

`de.innogames.onyx.chests.services.ChestsService` (L371004), serviceName **ChestsService**:

| method | wire | returns / notes |
|---|---|---|
| `openChest(chestId, cb)` | `openChest [chestId]` imm | `RewardVO[]` — season-pass daily chest (`event_chest_daily_<subType>`), spire mystery chests, etc. |
| `openChestAndCollect(chestId, seasonalEventId, cb)` | `openChestAndCollect [chestId, eventId]` imm | `ChestRewardGroupVO` (L526962): `openedChestRewards: RewardVO[]`, `grandPrizeRewards: RewardVO[]` — the main-event "open chest" button; grand prizes go to `PendingRewardsModel` |
| `payIn(chestId, amount, cb)` | `payIn [chestId, amount]` imm | `RewardVO[]`; Fellowship-Adventure waypoint chests |
| `payInWithPremium(chestId, amount, premiumCosts, cb)` | `payInWithPremium [chestId, amount, premiumCosts]` imm | |
| `getEventChestRotation(seasonalEventId)` | `getEventChestRotation [eventId]` imm → `_onGetEventChestRotation` | `ChestRotationVO[]` (`chestId, eventSubType, slotOrder`) — theater events |
| push `updateUnavailableChests` | `String[]` chest ids | → `ChestsModelUnavailableEvent::UPDATE_UNAVAILABLE_CHESTS` |
| push `updateChestPayInProgress` | `ChestPayInProgressVO[]` (L526920: `chestId, currentValue, maxValue, costs, rewards`) | **[ext]** → `src/elvenar/processUpdateChestPayInProgress.ts` (FA stage tracking) |
| push `updateChestContributions` | `ChestPayInPlayerContributionVO[]` (`player, contributions: {chestId, amount}[]`) | |

Events → commands (`ChestControllerConfiguration` L370450): `OpenChestEvent::open` →
`OpenChestCommand` (L370210), `OpenChestEvent::openAndCollect` → `OpenChestAndCollectCommand`
(L370180; uses `currencyEventsModel.get_activeEvent().get_id()` as the eventId),
`PayInEvent::payIn` / `::payInWithPremium` → `PayInChestCommand` (L370230),
`ChestRotationEvent::getRotations` → `GetRotationsCommand` (L370166), `ShowChestRewardEvent::show` →
`ShowChestRewardAlertCommand` (L370254). Event ctors: `chests.events.OpenChestEvent(type, chestId,
showRewards=true)` (L14192), `PayInChestEvent(type, chestId, amount, premiumCosts=0)` (L45466).
The main-event window's chest button dispatches `openAndCollect` when `isMainEventChest`, else
`open` (L435488).

Model `chests.models.ChestsModel` (L370818, `IChestsModel` L10603): `getChestById(id)`,
`getChestsByType(type, subType)`, `getRotatedChests(subType)`, `getPayInProgressById(id)`,
`get_playerContributions`, `get_freshChestsAvailable`, `get_flexibleChests`.
`chests.data.Chest` (L370527, `IChest` L370499): `get_id/name/description/type/subType/size/isRepeating`,
`costs` (`ResourceCollection`), `premiumCostPerOne`, `rewards` (`RewardSet`), `conditions[]`,
`available`, `hasFlexibleRewards`. Chest types seen: `event_chest`, `event_grand_prize`,
`event_currency_option`, `event_chest_daily_*`, spire/FA chests.

**Recipe — open an event chest**:
```js
const C = window.aviad['de.innogames.onyx.chests.commands.OpenChestAndCollectCommand'];
const E = window.aviad['de.innogames.onyx.chests.events.OpenChestEvent'];
const c = inj.getOrCreateNewInstance(C); c.openChestEvent = new E('OpenChestEvent::openAndCollect', chestId); c.execute();
// or, bypassing the UI: inj.getInstance(ChestsService).openChestAndCollect(chestId, cem.get_activeEvent().get_id(), vo => …)
```
Cost is deducted server-side; the client learns the new balance from the `CityResourcesService.getResources` push.

---

## 4. Rewards (`de.innogames.onyx.shared.rewards.*`, 149) & reward selection kits

- `RewardVO` (L528995): `id, type, subType, amount, buildingId`. Everything reward-shaped in the
  protocol is this VO (or a subclass: `QuestRewardVO`, `RewardChanceVO`, `ResearchRewardVO`).
- `util.RewardParser.parse(vos)` / `parseReward(vo)` (L577340) → `data.Reward` (L569286:
  `get_type/get_subType/get_amount`) via `factories.RewardWrapperFactory` (L576756);
  special wrappers by `type`: `relic_boost_modifier`→`BoostReward` (L576349), `daily`→`DailyReward`
  (L576376), `expansionUnlocked`→`ExpansionReward` (L576474), `runeShard`→`RuneShardReward` (L576685).
- Reward `type` strings — `shared.quests.models.RewardTypes` (L569861, statics L784810–784840):
  `resource, good, unit, knowledge_points, runeShard, offer, tournamentPoints, guild_xp,
  expansionUnlocked, relic_boost_modifier, ranking, portraits, building, weighted, episodic,
  aggregate, item, shuffle_event_special_package, chest, flexible_reward, avatar, unknown_avatar,
  worker_premium, daily, royal_pass, reward_selection_kit, merge_event_generator, season_pass,
  season_xp, reduced_donation_costs, feature_token`. For `resource`/`good` the `subType` is the
  resource id (see §7), for `building`/`item` it's the entity/item id, for `weighted` it's the
  weighted-reward id (see §1.4), for `episodic` the episodic reward id. `RewardSubTypes` (L569858):
  ranking subtypes `tournaments, global, guild_event, guild`, `portrait_evt`.
- `data.RewardSet` (L567976): `addReward`, `getAllRewards()`, `getRewardsByType(type)`.
- `models.WeightedRewardsModel` (L576906): `addReward(id, RewardChance[])`, `getChances(id)`,
  `getChancesForType(id, rewardType)`. `data.RewardChance` (L576567): `get_type/subType/amount/percentage`.
- `models.EpisodicRewardsModel` (L576807) fed by `services.EpisodicRewardsService` (L576958,
  serviceName **EpisodicRewardsService**, push `getRewards` only) — the "episode" prizes of
  episode-based events; `getReward(id, amount)`, `getActiveEpisodicReward()`.
- `models.FlexibleRewardsModel` (L576846) + `util.FlexibleRewardUtil` (L577236): `flexible_reward`
  entries are resolved per chapter (`technologySectionIndex`) into concrete goods; the
  `UpdateFlexibleResources*Command`s (L575440ff) re-resolve after a chapter change.
- `models.PendingRewardsModel` (L576870) + `commands.ShowPendingRewardWindowsCommand` (L575410):
  rewards to show later (grand prizes).
- `creators.*` (L575553–576325) build the icon/tooltip for each reward type — UI.

`de.innogames.onyx.networking.services.RewardSelectionKitService` (L49911), serviceName
**RewardSelectionKitService**: `chooseOne(inventoryItemId, rewardIndex)` →
`chooseOne [inventoryItemId, rewardIndex]` future. Kit definitions come from the static file
`xml.balancing.rewards.reward_selection_kit.RewardSelectionKit_<md5>.json` (**[ext]** `tomes` matcher in
`src/inject/nonSpecificMatchers.ts` → `src/elvenar/processTomes.ts`); `RewardSelectionKitVO`
(L536447): `id, name, description, iconId, rarity, type, spellFragments, rewards: RewardVO[]`;
model `models.RewardSelectionKitsModel` (L11809).

---

## 5. Quests (`de.innogames.onyx.shared.quests.*`, 140)

`de.innogames.onyx.shared.quests.services.QuestDataService` (L570869), serviceName **QuestService**:

| method | wire | notes |
|---|---|---|
| `getUpdates()` | `getUpdates` | server replies with push `getUpdates` |
| `advanceQuest(questId, cb)` | `advanceQuest [questId]` | accept *and* complete/collect — the same call moves the quest along whatever its state; response = `RewardVO[]` |
| `abortQuest(questId)` | `abortQuest [questId]` | decline; server answers with push `abortQuest` (same handler as `getUpdates`) |
| `markSeen(questId)` | `markSeen [questId]` | |
| push `getUpdates` / `abortQuest` → `_onQuestUpdate(quests)` | `QuestVO[]` | **[ext]** `QuestService.getUpdates` → `src/elvenar/processQuestUpdates.ts`; `src/elvenar/sendQuestQuery.ts` re-POSTs the captured request |

`QuestVO` (L535633): `id:Int, type, subType, state, title, headline, description,
accomplishedHeadline, accomplishedDescription, questGiverId, race, slot, priority, flags:Int,
args:String (JSON of QuestOption strings), waitingTime, isProgressChanged,
successConditions: QuestSuccessConditionVO[], rewards: QuestRewardVO[]`.
`QuestSuccessConditionVO` (L535554): `id, type, typeData, relation, description, hint, iconType,
currentProgress, maxProgress, progress, overspill`. `QuestRewardVO` (L535505, extends RewardVO):
`quest_id, hidden, random, iconType, resources`. `QuestGiverVO` (L535385): `id, name`.

Constants (`shared.quests.models.*`, statics L784775ff): `QuestStates` (L569842) = `accepted |
rejected | accomplished | aborted | collectReward | closed | waitingForEpisode`; `QuestTypes`
(L569848) = `tutorial | story | normal | repeating | daily_login | season_pass_daily |
season_pass_weekly | fakeLastQuestMilestoneQuest`; `QuestFlags` (L569545) bit indices
`PAY_CONDITION=0, FLAG_ABORTABLE=2, FLAG_RANDOMIZED=3`; `QuestOption` (L569822) values
`show-info-screen, show-reward-blimps, no-reward-window, no-reshow-info-screen,
no-tutorial-restart, keep-character-*, milestone`; `QuestSubTypePrefixes.MPE = "mpe_"`.

Model `models.QuestModel` (L569579, `IQuestModel` L19292): `quests`, `getQuest(id)`,
`hasQuest(id)`, `hasQuestInState(id, state)`, `getQuestsByType(type)`, `getQuestsByOption(opt)`,
`removeQuest(id)`; `models.Quest` (L569381): `get_id/type/subType/state/title/headline/description/
questGiverId/isAbortable/isRandomized/hasPayCondition/requirements/rewards/rewardResources/slot`,
`isAccomplished()`, `hasOption(QuestOption)`.

Controller (`QuestControllerConfiguration` L569048): `QuestEvent/complete` →
`AdvanceQuestCommand` (L568634; if state is `collectReward` it pre-adds `rewardResources` locally,
removes the quest from the model, calls `advanceQuest`, shows the reward window unless the quest
has `no-reward-window`), `QuestEvent/reject` → `QuestAbortCommand` (L568842),
`QuestEvent/update` → `UpdateQuestCommand` (L568854), `QuestEvent/markQuestSeen` →
`MarkQuestSeenCommand` (L568802), `QuestDataServiceEvent/UPDATE` →
`strategycity.main.controller.bootstrap.QuestUpdateCommand`. `events.QuestEvent(type, questId)` (L47460).

**Recipe — collect / accept a quest**:
```js
const c = inj.getOrCreateNewInstance(window.aviad['de.innogames.onyx.shared.quests.commands.AdvanceQuestCommand']);
c.event = new (window.aviad['de.innogames.onyx.shared.quests.events.QuestEvent'])('QuestEvent/complete', questId);
c.execute();
// bare: inj.getInstance(QuestDataService).advanceQuest(questId, rewards => …)  (local model stale until next getUpdates push)
// decline: inj.getInstance(QuestDataService).abortQuest(questId)
```

Quest milestones (event "milestone" bar): `services.QuestMilestoneService` (L52838), serviceName
**QuestMilestoneService**: `collectReward(cb)` → `collectReward []` imm → `RewardVO[]`; push
`updateQuestMilestone` → `QuestMilestoneProgressVO` (L535446: `progress:Int, states:String[]`)
**[ext]** → `src/elvenar/processQuestMilestoneUpdate.ts`. Milestone config from static
`QuestMilestoneComponentVO` (`counter, reward`), model `models.QuestMilestonesModel` (L33800),
command `CollectQuestMilestoneRewardCommand` (L568756) on `CollectQuestMilestoneRewardEvent::collect`.

---

## 6. Main-event variants (`de.innogames.onyx.city.mainevents.*`, 657 — 272 of them `shared.components` UI)

All share `SeasonalEventsService` for lifecycle and `ChestsService` for chests; each variant adds
one service. Command events of the form `"<FQ command name>/EVENT_TYPE"` are dispatched with the
auto-generated `<Command>_Event` classes (e.g. `ClaimSeasonPassRewardCommand_Event` L80106).

| feature | service (line, serviceName) | actions | pushes | model / notes |
|---|---|---|---|---|
| Royal Pass | `royalpass.services.RoyalPassService` (L427267, **RoyalPassService**) | `claimAllRewards(cb)`, `claimNextGrandPrize(cb)`, `claimNextRoyalPrize(cb)` — all `[]` imm, return `RewardVO[]` | `sendRoyalPassEndRewards` | `royalpass.models.RoyalPassModel` (L11395); progress via `RoyalPassProgress` event property; commands on `RoyalPassClaimRewardsEvent::claimAll|claimNextGrandPrize|claimNextRoyalPrize` (L426938ff); `ShowRoyalPassWindowCommand` (L427098) logs `trackEventWindowOpen("royal_pass")` |
| Season Pass | `seasonpass.services.SeasonPassService` (L80080, **SeasonPassService**) | `claimReward(level, rewardIndex, cb)` → `claimReward [level, rewardIndex]` imm; `rerollQuest(questId)` → `rerollQuest [questId]` imm | `getSeasonPassReward`, `getSeasonPassEndReward` (RewardVO[]) | `seasonpass.models.SeasonPassModel` (L21390), `data.SeasonPassLevel` (L429707), `SeasonPassSeason` (L429765); resource ids `seasonpass.constants.SeasonPassResources` (L416294); daily chest = `OpenChestEvent::open` with `event_chest_daily_<subType>` (L432268) |
| Event League | `eventleague.services.EventLeagueService` (L423617, **EventLeagueService**) | `getLeagueProgress()` → `getEventLeagueProgress []` imm | `updateEventLeagueProgress` → `EventLeagueProgressVO` (`currentPoints, minimumPoints[]`), `sendEventLeagueEndReward` → `EventLeagueEndRewardVO` (`league, leagueName, rewards[]`) | `eventleague.models.EventLeagueModel` (L35920), `data.EventLeague/EventLeagueConfig` (L423428/423478) |
| Tile event | `shared.services.TileEventService` (L444353, **TileEventService**) | `getTileEvent()`; `useTool(toolId, cellX, cellY)`; `collectReward(cellX, cellY, cb)` | `updateCells`, `addColumn` (`TileEventCellVO[]`: `x, y, state, isActive, isRevealed, assetName, reward`), `autoCollectRewards`, `updateRevealChargePositions` | `shared.models.TileEventModel` (L14286); board 8×6 (`TileBoardConstants` L443903); events `TileEventToolEvent::useTool`, `TileEventRewardEvent::collectReward`; tool constraints validated client-side (`shared.models.data.constraints.*` L444030ff) |
| Shuffle event | `shared.services.ShuffleEventService` (L444324, **ShuffleEventService**) | `getPackages()` → `getOverview`; `shufflePackages()` → `shuffle`; `openPackage(position, cb)` → `openPackage [position]` | `updateShuffleEvent` → `ShuffleEventVO` (L537491: `packages: {state, reward, modifiers[]}[], canShuffle, shuffleCount, openPackageCosts, doubleRewardActive, dailyReward, additionalPackageRewards[]`) | `shared.models.ShuffleEventModel` (L25051); events `ShuffleEventPackageEvent::getPackages|shufflePackages|openPackage` |
| Merge event | `shared.services.MergeEventService` (L23184, **MergeEventService**) | `getOverview()`, `getOrders(cb)`, `generate(chestIds[])`, `move(fromPosition, toPosition)`, `discard(position)`, `completeOrder(chestId, cb)`, `discardOrder(chestId)`, `instantSkipOrderCooldown(slot)` — all imm | `initializeBoard`, `updateBoard` → `MergeEventVO` (`cells: {position, content}[]`, `orders: {chestId, state, remainingTime}[]`) | `shared.models.MergeEventModel` (L20333); cell content `waiting`/`empty` (`MergeCellContentConstants` L443716) |
| Challenge event | `city.challengeevents.services.ChallengeEventService` (L383969, **ChallengeEventService**) | none | `getMilestoneRewards` (RewardVO[]) | `seasonalevents.models.ChallengeEventsModel` (see §1.2); 46 classes mostly UI, `ChallengeEventRewardEvent::showRewards` |
| Theater / scroll events | no own service — chests + `ChestsService.getEventChestRotation` | | | `mainevents.theater.*`, `mainevents.scroll.*` themes |

`de.innogames.onyx.eventintro.*` (28): `EventIntroDataModel` (L514039) holds intro-screen pages
(`EventIntroData` L513979) parsed from `EventIntroComponentVO`; asset helpers per event kind — UI only.

---

## 7. Resources (`de.innogames.onyx.resources.*`, 42)

`de.innogames.onyx.resources.service.ResourcesService` (L42751), serviceName
**CityResourcesService**:

| method / push | wire | notes |
|---|---|---|
| push `getResources` → `_onGetResources(resources)` | `{ __class__:"ResourcesVO", <resourceId>: number, ... }` (flat map) | **[ext]** `CityResourcesService.getResources` → `src/elvenar/processCityResourcesUpdate.ts`. Almost every mutating call asks the server to append it (`handleOnlyLastPushResponses(["CityResourcesService.getResources"])`) — this is how balances refresh. `strategy_points` also feeds `KnowledgePointModel` |
| push `getPremium` | `Int` | diamonds only |
| push `updateResourceCaps` | `ResourcesVO` | storage caps |
| push `updateResourceConfigs` | `GoodConfigurationVO[]` (L530473: `id, name, type, quality, chain, ratio, tradeable, limitStorage, productionLabel`) | |
| push `buyResourcePackage` | `PackageVO[]` | KP package prices after a purchase |
| `syncResources()` | `getResources []` imm | force refresh |
| `buyResourcePackage(id, ownerId, data, cb)` | `buyResourcePackage [packageId, ownerId, data?.toVo()]` imm | buy KP with coins; `ownerId` = `"KNOWLEDGE_POINTS_PLAYER"` (or `"KNOWLEDGE_POINTS_ANCIENT_WONDER"`), packages from `StartupVO.knowledgePointPackages` (`PackageVO` L534218: `id, cost, costIncreasePerPurchase, gain, gainMax`) |
| `buyAWInstantKP(kpAmount, ownerId, data, cb)` | `buyInstantAwKp [kpAmount, ownerId, data.toVo()]` imm | diamonds → KP straight into a wonder (L376724) |

Model `resources.models.ResourcesModel` (L10951): `getResourceValue(id)` (BigInt), `getCapValue(id)`,
`hasEnough(id, value)`, `hasEnoughResourcesFor(collection)`, `hasEnoughStorageFor(collection)`,
`getRatioForId(id)`, `getQualityForId(id)`, `addResources(delta)`, `update(collection)`.
Values are **BigInt**: `de.innogames.collections.resources.ResourceCollection` (L137418) holds
`Resource {id, _value: BigInt}` (L137582, `get_intValue()` clamps to Number); `ResourceBuilder`
(L544053) builds one from a VO map; `ResourceConverter.toCityGoodVO(resource)` (L544135) →
`CityGoodVO {good_id, value:Int}` (clamped to `MAX_SAFE_INTEGER`) — the wire form for trades.

Resource ids: `resources.data.ResourceIds` (L543257): `premium` (diamonds), `money` (coins),
`supplies`, `strategy_points` (KP), `unurium`, `random`. Goods `constants.GoodId` (L512563):
`marble steel planks crystal scrolls silk elixir magic_dust gems`, sentient = `sentient<good>`,
ascended = `ascended<good>`; relics `relic_<good>` (`constants.RelicId` L512575);
event currencies see §2; FA badges/other ids the extension already lists in
`processCityResourcesUpdate.ts` (`badge_*`, `golden_bracelet`, …). `GoodsQuality` (L512566):
BASIC=1, CRAFTED=2, MAGICAL=3. Resource *sets* (`ResourceSetIds` L543292; `resources.models.ResourceSetsModel` L416303,
fed by `StartupVO.resourceSets`): `goods_standard, goods_sentient, goods_ascended, relics, spells,
units, event, tile_event_tools, wholesaler_goods, convertable_to_witch_points, …`.
Related: `SentientGoodsModel` (L543544, decay), `AscendedGoodsModel` (L543310),
`util.BoostedGoods` (L543765), `RelicBoostInfoProvider` (L543508), `provisions.ProvisionModel`
(L543674: culture/population/resource provisions), `commands.CheckStorageCapacityCommand` (L543109).

`de.innogames.strategycity.main.service.RelicService` (L665410, **RelicService**) is push-only:
`getRelicsInformation` → `RelicVO[]` (`relic_id, amount, quality, chain, boosts`),
`getRelicBoostGoodInformation` → `RelicBoostGoodVO[]` (`relic_id, good_id, good_type, quality`).

---

## 8. Trade & merchants (`de.innogames.onyx.city.trade.*`, 174)

`de.innogames.onyx.city.trade.services.TradeService` (L462279), serviceName **TradeService**:

| method | wire | returns |
|---|---|---|
| `getOtherPlayersTrades(cb)` | `getOtherPlayersTrades` | `PlayerTradeVO[]` **[ext]** → `src/elvenar/processTradeData.ts` (`src/model/trade.ts` types it: `id, offer{good_id,value}, need{…}, trader{player_id,name,avatar,guild_info}, expiresIn, traderDiscovered`; VO also has `feeRequired, isNewMerchantTrade`) |
| `getOwnPlayerTrades(cb)` | `getOwnPlayerTrades` | `PlayerTradeVO[]` |
| `getNPCTrades(cb)` | `getNPCOffers` | `WholesalerVO` (L542131: `npcTrades: NPCTradeVO[] {id, offer, need, money, supplies}, remainingTime`) |
| `acceptPlayerTrade(tradeId, cb)` | `acceptPlayerTrade [tradeId]` | — (command removes trade from `TradesModel`) |
| `acceptWholesalerTrade(tradeId, cb)` | `acceptNpcOffer [tradeId]` imm | new `WholesalerVO` |
| `createTrade(offer, need, cb)` | `createTrade [CityGoodVO, CityGoodVO]` | offer/need are `Resource`s converted by `ResourceConverter.toCityGoodVO` |
| `cancelTrade(tradeId, cb)` | `cancelTrade [tradeId]` imm | |

`MerchantService` (L462251, **MerchantService**) — the hireable travelling merchant:
`getMerchants()`, `hireMerchant(merchantId)`, `finishCooldown(merchantId)` (diamonds),
`trade(merchantId, offer, demand, cb)` → `trade [merchantId, CityGoodVO, CityGoodVO]`; push
`updateMerchants` → `MerchantVO[]` (L532352: `id, state, offerAmount, timeLeft, availableIn, costs`);
static `MerchantConfigVO` (L532258: `id, hiringDuration, cooldownDuration, metadata[{mainHallLevel,
hiringCosts, offerAmount}]`).

Controller (`TradeControllerConfiguration` L461564) event names are bare strings: `acceptPlayerTrade`,
`acceptNPCTrade`, `cancelTrade`, `createTrade`, `getNPCTrades`, `getOtherPlayersTrades`,
`getOwnPlayerTrades`, `tradeAdded`, `TradeModelEvent::updateTrades`,
`MerchantEvent::getMerchants|hireMerchant|finishCooldown|showTradeWindow`. Event class
`trade.events.TradeEvent(type, tradeId, offer, need, expiresIn)` (L41717). Commands
`AcceptPlayerTradeCommand` (L461177), `AcceptWholesalerTradeCommand` (L461203), `CancelTradeCommand`
(L461222), `CreateTradeCommand` (L461256).
Models: `models.TradesModel` (L462082; `TradesContainer`/`PlayerTradesContainer` per
`TradeCategory` OWN_PLAYER/OTHER_PLAYERS/WHOLESALER), `models.MerchantModel` (L461892),
`vos.PlayerTrade`/`WholesalerTrade` wrappers (L467813/467958). Ratio rules:
`validators.TradeRatioFormula` (L462838) — `min/maxRatio × qualityRatio^(qualityDiff)` from
`TradeRatiosVO` (`trade_min_ratio, trade_max_ratio, trade_quality_ratio` in `StartupVO.trade_ratios`),
`trade_fee_percentage` in `StartupVO`. Sorting/filtering `sorting.*`, `filtering.*` — UI.

**Recipes**
- accept a player trade: `inj.getInstance(window.aviad['de.innogames.onyx.city.trade.services.TradeService']).acceptPlayerTrade(tradeId, r => console.log(r))`
  (server rejects with an error response if the trade is gone / fee unaffordable).
- wholesaler: `getNPCTrades(vo => …)` then `acceptWholesalerTrade(vo.npcTrades[i].id, next => …)` — the
  reply is the refreshed offer list with escalated prices.
- create: build two `de.innogames.collections.resources.Resource(id, BigInt(v))` and call `createTrade(offer, need, cb)`.

---

## 9. Inventory (`de.innogames.onyx.city.inventoryitems.*`, 175)

`de.innogames.onyx.city.inventoryitems.service.InventoryService` (L417003), serviceName
**InventoryService**:

| method | wire | notes |
|---|---|---|
| `getItems()` | `getItems []` imm | **[ext]** `InventoryService.getItems` → `src/elvenar/processInventory.ts` |
| push `updateItems` | `InventoryItemVO[]` | **[ext]** `InventoryService.updateItems` (same file) |
| `placeBuilding(inventoryItemId, x, y, cb)` | `placeBuilding [itemId, x, y]` imm | building from inventory |
| `useItem(itemId)` | `useItem [itemId]` imm | instants without target (refills, expansions…) |
| `useItemOn(itemId, targetVO)` | `useItemOn [itemId, TargetVO]` imm | targets: `BuildingTargetVO {entityId, ownerId}` (L525920), `ProvinceTargetVO {q, r}` (L535331), `BattleUnitTargetVO {battleId, wave, unitId}` (L525527), `GuardianBuildingTargetVO {+guardianId}` (L530611), `MerchantTargetVO {merchantId}` (L532326), `CraftingTargetVO`, `SpireGateTargetVO` |

`InventoryItemVO` (L531712): `id:Int, type, subtype, amount, isNew, changedAt,
properties: [ChapterBasedInventoryItemPropertyVO {chapter} | InventoryItemEvoBuildingPropertyVO
{stage} | InventoryItemTranscendedBuildingPropertyVO {stage, counter, costs, purchasableTime}]`.
`InventoryItemType` (L416531): `CITY_ENTITY | SPELLS | ITEM | REWARD_SELECTION_KIT`.
`InventoryItemCategory` (L416473, statics L782609ff) recognises instants by subtype prefix:
`INS_RF_CN` coin refill, `INS_RF_S*` supplies refill, `INS_TR` time reduction, `INS_KP*` AW KP,
`INS_EX` expansion, `INS_RS` restoration, `INS_GROW`, `INS_EVO` evolution, `INS_UNIT`,
`INS_REV_SQD` revive squad. `ItemRarity` (L416576) 1..5 BASIC…LEGENDARY. Static item definitions:
`xml.balancing.city.Items_<md5>.json` (**[ext]** `items` matcher → `src/elvenar/processItems.ts`;
`ItemVO` L531765: `id, name, description, level, rarity, effectConfigId, spellFragments`).
Model `model.InventoryModel` (L26328): `getItemById(id)`, categories, spells; `model.InventoryItemConfigModel` (L416764).
Commands: `UseItemCommand` (L413598; computes preview resources for refills/units, then
`service.useItem`), `UseItemOnCommand` (L414528), `Disenchant*Command` (L413331ff).

`DisenchantService` (L49662, **DisenchantService**): `disenchantItems(inventoryItemId, count)`,
`disenchantSpells(inventoryItemId, count)` — both `[id, count]` imm; yield spell fragments.

---

## 10. Magic Academy: crafting & cauldron (`city.ui.windows.academy.*`, 185)

Two `CraftService` classes exist with the same serviceName **CraftService**:

- `city.ui.windows.academy.crafting.services.CraftService` (L36711) — the one wired to the window:
  `getCraftingData()` → `getCraftingData` imm (→ `_onUpdateData(CraftVO)`), `craft(recipeId)` →
  `startCrafting [recipeId]` imm, `premiumCraft(recipeId)` → `startPremiumCrafting [recipeId]` imm,
  `collectCraftedItem(cb)` → `collectCraftedItems` imm, `instantFinish()` → `instantFinish` imm,
  `cancelCrafting()` → `cancelCrafting` imm, `instantGetSlots()` → `instantRefreshSlots` imm
  (diamond re-roll), `collectChest(cb)` → `collectChestRewards` imm; pushes `updateActiveRecipe`
  (`ActiveRecipeVO {recipeId, remainingTime}` L524687), `updateProgress`.
- `networking.services.CraftService` (L523799) — future-based twin used by the redesign
  (`crafting_redesign` feature flag): same actions plus `collectCraftedItem`, `trackHighlightsOpened`;
  push names in `CraftServiceConstants` (L784148ff: `getCraftingData, getTransitionRewards,
  updateActiveRecipe, updateProgress`).

`CraftVO` (L528344): `craftingSlots: CraftingSlotVO[]` (L528465: `recipeId, state, rarity, costs,
craftingTime, rewards[], isLimited, craftingCount, craftingLimit`), `activeRecipe`, `progress`,
`recipesRefreshTimer`, `highlights[]` (`CraftingHighlightVO {rarity, rewards[]}`),
`seasonalEventCraft {subtype, slots[], remainingTime, startCountdown}`. Slot states
(`crafting.enums.CraftingSlotState` L783398): `AVAILABLE, ACTIVE, READY, COLLECTED`.
`CraftingSettingsVO` (`StartupVO.craftingSettings`): `refreshCost, progressChestCost,
shardsPerPremium`. Model `crafting.models.CraftingModel` (L25769).
Events (`crafting.events.CraftingEvent(type, recipeId, cost)` L36766): `CraftingEvent::craft`,
`::premiumCraft`, `::cancel`, `::collect` → `CraftingBeginCraftCommand` (L487917),
`CraftingBeginPremiumCraftCommand` (L487931), `CraftingCancelCommand` (L487945),
`CraftingCollectCommand` (L487959).

**Recipe — start a craft**: `inj.getInstance(window.aviad['de.innogames.onyx.city.ui.windows.academy.crafting.services.CraftService']).craft(recipeId)`
(recipeId from `getCraftingData` → `craftingSlots[i].recipeId`, state must be `AVAILABLE`);
collect with `.collectCraftedItem(rewards => …)`.

Cauldron — `cauldron.services.CauldronService` (L481459), serviceName **CauldronService**:

| method | wire |
|---|---|
| `getIngredientList()` | `getIngredients` imm future → `IngredientVO[]` (L531636: `id, name, description, order, isPremium`) **[ext]** `CauldronService.getIngredients` → `src/elvenar/processCauldron.ts` |
| `getPotionEffectsList()` | `getPotionEffects` imm future → `PotionEffectVO[]` (L534689: `id, name, level, boost, nextBoost, duration, nextDuration, state, techName, diplomasRequired, upgradeCost, witchPointsInvested, potionEffectIngredients[{id, factor, value}]`) **[ext]** `CauldronService.getPotionEffects` |
| `getConvertableResourceList()` | `getResources` imm future |
| `brew(ingredientList, spellFragmentUsed, premiumBoost)` | `brew [String[] ingredient ids (one entry per unit; `IngredientsModel.serialize` L482942), Int, Int]` imm |
| `confirmGobletEffect(id)` | `confirmGobletEffect [id]` imm |
| `investWitchPoints(potionEffectId, witchPointsCost)` | `investWitchPoints [id, cost]` imm future |
| `convertToWitchPoints(resourceId, convertNum)` | `trade [resourceId, num]` imm |
| push `getData` → `CauldronVO` (`state, playerState, remainingTime`); push `getLastUsedGobletResult` → `LastUsedGobletResultVO` (L531959: `success{gobletEffect{id, potionEffectId, booster, critical, duration}}, failure{spellFragmentsInvested/Refund, premiumSpellFragmentsRefund, trophyGobletsLeft}, conflict{existingEffect, newEffect}, gobletsLeft`) | |

Models: `cauldron.models.CauldronModel` (L480945), `PotionEffectsModel` (L67287),
`ConvertibleResourcesModel` (L480982); tuning constants from `CauldronBasicValuesComponentVO` (§1.4)
and `StartupVO.cauldron`. `src/elvenar/sendCauldronQuery.ts` (extension) replays the captured
request to refresh ingredient/effect data.

---

## 11. Shops & offers

- `city.ingameshop.services.InGameShopService` (L51393), serviceName **InGameOfferService**:
  `getOffers(offerId)` → `getOffers [offerId]` imm future → `InGameOfferVO[]` (L531546: `id,
  fullPrice, discountedPrice, discountPercentage, purchaseCount, purchaseLimit, isLimited,
  canPurchase, reward`); `buyOffer(offerId)` → `buyOffer [id]` imm future. Diamond-priced bundles
  behind CRM/offer CTAs (`offerId` resolved from the CTA `targetId`, L412588); model
  `InGameShopModel` (L51186).
- `city.offers.services.OfferService` (L457723, **OfferService**) push-only:
  `refreshActiveOffers` → `OfferVO[]` (L533940: `id, offerId, playerId, active, activationTime,
  expirationTime, isMultipleTimesSaleable, frontendOfferVO {headline, info, isNew, remainingTime,
  cta}`). Known `offerId`s (`OfferIds` L457499, statics L783128ff): `worker_premium_bundle`,
  `event_currency_bundle_offer`, `event_currency_package_offer`, `expansions_discount_static_offer`,
  `double_payback_offer_`. Model `OfferModel` (L457541).
- `networking.services.CashShopService` (L37190, **CashShopService**): `getCashShopConfig()`,
  `getProducts()` → `CashShopVO` (L526253: `trackingId, productGroups[]` of `CashShopProductVO`
  L526145: `productId, genericProductId, offerId, premiumAmount, quantity, price {currency,
  priceInCents, formattedPrice}, rewards[], bonusPercentage, bonusUntil, popular, signature,
  payload, featureMainType/SubType, …`), `getPurchaseLink(productId)`; pushes
  `getProducts`/`refreshProducts` (`CashShopServiceConstants` L784146). `cashshop.*` (62):
  `CashShopModel` (L31300), payment bridges `IgPaymentBridge` (L365872, InnoGames payment iframe)
  / `MicrosoftBridge` (L365968), `DirectPurchase` (L50420, `direct_purchase` flag),
  `SuccessPurchaseCommand` (L366117) — real-money, nothing to drive.
- `city.crm3.services.CRMService` (L36925), serviceName **Crm3Service** — interstitial popups:
  pushes `getInterstitials`/`addInterstitial` (`Crm3InterstitialVO` L528584: `targetId, priority,
  displayPoints[], validFrom, validTo, validPlatforms[], screen, cta {type, targetId, value}`),
  `removeInterstitial`, `executeCallToAction`; actions `acceptInterstitial(targetId, displayPoint,
  buttonIndex, cb)`, `rejectInterstitial(targetId, displayPoint)`, `markInterstitialSeen(targetId,
  displayPoint)`. `StartupService.getCrmData()` fetches the initial set.

---

## 12. Value manipulation, guardians, miners, absolution, transcendence

- `valuemanipulation.services.ValueManipulationService` (L642605, **ValueManipulationService**),
  push `getValueManipulations` → `ManipulationVO[]` (L532214: `handler, target, manipulations:
  ManipulatedPropertyVO[] {property, processor, action, value, validFrom, validTo}`). These are
  **server-driven balancing overrides / temporary boosts** applied client-side to static configs:
  handlers `EntityConfigManipulationHandler` (L642242, buildings), `TechnologyManipulationHandler`
  (L642260), `ChestManipulationHandler` (L642231); actions multiply / override
  (`MultiplyPropertyAction` L641949, `OverridePropertyAction` L641961); processors for
  `products__product__%d__production_time`, `products__product__%d__revenue__%s`, `good__value`,
  `supplies`, `money` (`helper.PropertyTokens` L642270, statics L786005ff). Model
  `ValueManipulationModel` (L642273), command `HandleValueManipulationCommand` (L641971) on
  `ValueManipulationEvent::handle`. Read-only from the client's side; e.g. a "double coin
  production" weekend arrives this way, so displayed building output ≠ raw balancing file.
- Guardians (`de.innogames.onyx.guardians.*`, 54 — **not** spire): summonable guardian buildings.
  `networking.services.GuardianService` (L523887, **GuardianService**): `getCollection()` →
  `GuardianVO[]` (L530721: `id, stage, remainingTime`) + static `GuardianConfigVO` (L530638:
  `guardianId, buildingId, name, description, rarity, duration, stages[{stage, transitionStage,
  effectIds[]}]`), `summon(guardianId)`, `unsummon(guardianId)` (needs `guardian_unsummon` flag),
  `instantFinish(guardianId)` — all `[guardianId]` futures; push `getCollection`.
  `guardians.controller.GuardiansController` (L24261): `loadGuardianCollection()`,
  `summonGuardian(id)`, `unsummonGuardian(id)`; dispatches `GuardianSummonEvent::summoned`
  (buildingId, stage). Static data `guardians.data.GuardianStaticData` (L27136).
- `miners.service.GoldMineService` (L519453, **GoldMineService**): `mine(province, cb)` →
  `mine [columnIndex, rowIndex]` — collect a world-map gold-mine province
  (`GoldMineProvinceVO {coolDown, rewards}` L530436); `CollectGoldMineCommand` (L519376) on
  `CollectGoldMineEvent` first runs a storage-capacity check.
- `absolution.*` (5) — A/B test assignment: `AbsolutionService` (L57401, **AbsolutionService**)
  `getData()` → `AbsolutionAssignmentVO[]` (`testName, groupName`); `AbsolutionModel.hasGroup(test,
  group)` (L140068); only group constant `test_group` (L781729). Nothing to drive.
- `networking.services.TranscendenceService` (L524057, **TranscendenceService**):
  `extendTime(buildingId)`, `refresh(buildingId)` (futures); pushes `allBuildingsStates`,
  `buildingsStateUpdated` (`TranscendenceServiceConstants` L784165) → `TranscendenceVO[]`
  (L540454: `buildingId, state, remainingTime, initialDuration, purchasableTime, costs,
  effectsIds[], stageToUnlock`) **[ext]** `TranscendenceService.allBuildingsStates` →
  `src/elvenar/processTranscendenceService.ts`.

---

## 13. Tech tree (`de.innogames.onyx.techtree.*`, 233)

`de.innogames.onyx.techtree.service.TechnologyService` (L632698), serviceName **ResearchService**:

| method | wire | notes |
|---|---|---|
| `getTechnologyData(cb)` | `startup` imm | `TechnologyVO[]` (L539757: `id, boosted_good, progress: ResearchTechnologyProgressVO {tech_id, currentSP, is_paid, gate_unlocked}` L536247) — only techs the player has touched. **[ext]** `ResearchService.startup` → `src/elvenar/processResearchStatus.ts` (joins with the balancing tree) |
| `useKnowledgePoints(technologyId, amount)` | `invest [techId, amount]` parseLastResponse | spend KP |
| `payTechnology(technologyId)` | `payTechnology [techId]` imm | pay the goods/coins/supplies cost once `currentSP == maxSP` |
| `buyInstantResearch(technologyId)` | `buyInstantResearch [techId]` imm | diamonds for remaining KP |
| `buyInstantResearchAndUnlock(technologyId, cb)` | `buyInstantResearchAndUnlock [techId]` imm | diamonds for KP + cost |
| `unlockGate(technologyId)` | `unlockGate [techId]` imm | province-count gates |

`CityResearchService` (L632683, **CityResearchService**) push `updateTechnologySection` →
`TechnologySectionVO` (L539722: `index, guestRace, description`) — chapter change.

Static tree: `xml.balancing.research.ResearchTechnologies(Humans|Elves)_<md5>.json` (**[ext]**
`researchTechnologies` matcher → `src/elvenar/processResearchTechnologies.ts`), entries are
`ResearchTechnologyConfigVO` (L536133: `id, name, description, category, section, level, race,
parentIds[], childrenIds[], maxSP, premiumMax, requirements, rewards: ResearchRewardVO[] {…, value},
gate {completedProvinces, rewards}, expectedProductionBoost, featureFlag, focusMarker, iconId,
score`). Loaded by `controller.bootstrap.staticdata.LoadTechnologyConfigsCommand` (L631123) into
`model.TechnologyConfigsModel` (L631242); runtime `model.TechnologyModel` (L631274):
`getTechnologyById(id)`; `model.data.Technology` (L631858): `get_id/state/requirements/parentIds/
childrenIds/level/currentPoints/maxPoints/remainingPoints/rewards/basicCost/maxPremiumCost/
sectionIndex/gate`, `isGateUnlocked()`, `isPaymentNeeded()`, `isUnlocked()`; states
`TechnologyNotAvailable|Available|CurrentlyResearching|ReadyToPay|Researched` (L632391–632439).
`helpers.TechPremiumCostCalculator` (L631186) — diamond price for the rest.
`walkers.TechnologiesWalker` (L637316) + `FirstBlockingTechnologyVisitor` (L637205) — tree traversal.

Controller (`configs.TechTreeControllerConfig` L630404): `useKnowledgePoints` →
`TechnologyUseKnowledgePointsCommand` (L630916: subtracts KP locally, updates state, then
`researchDataService.useKnowledgePoints`), `pay` → `TechnologyPayCommand` (L630803),
`instantProgress` / `instantUnlock` → `TechnologyInstantProgressCommand` (L630656) /
`TechnologyInstantUnlockCommand` (L630696), `getRewards` → `TechnologyGetRewardsCommand` (L630596),
`TechnologyGateEvent/OPEN_GATE` → `OpenTechnologyGateCommand` (L630548),
`TechTreeSectionEvent::techSectionUpdated` → `UpdateTechSectionCommand` (L630951). Event ctors:
`events.KnowledgePointEvent(type, technologyId, numKnowledgePoints)` (L35672),
`events.TechnologyEvent(type, technologyId)` (L10902).

**Recipe — research**: `inj.getInstance(window.aviad['de.innogames.onyx.techtree.service.TechnologyService']).useKnowledgePoints('tech_id', n)`
then, when `currentSP == maxSP`, `.payTechnology('tech_id')`. The tech-tree module (models above)
only exists while the tech-tree screen is open (`TechTreeDestroyCommand` L630583 on
`ModuleContextEvent::destroyContext`), so use the service directly outside it; balances refresh
via the `getResources` push.

---

## 14. Meta / bootstrap / telemetry services

| service (line, serviceName) | actions & pushes | notes |
|---|---|---|
| `networking.services.StartupService` (L17108, **StartupService**) | `getData()` → `getData []` future → `StartupVO` (L539261; fields incl. `user_data, city_map, resources, resources_cap, resourceSets[], player_relics[], relic_boost_good[], seasonal_events[], effects[], featureFlags[], featureTechnologies[], features{unlocked[]}, knowledgePointPackages[], premium_prices[], craftingSettings, cauldron, lastUsedGobletResult, guild, ancient_wonder_phases[], army_details, runningBattle/Diplomacy/Scout, trade_ratios, trade_fee_percentage, idsOfUnavailableChests[], unlocked_items[], settings, privacyVO, mapSize, season, decayTimer, tournamentProvinceUnlockTime`); `getCrmData()` → `getCrmData []` future | **[ext]** `StartupService.getData` → `src/elvenar/processCityData.ts`. Detailed field semantics: models & startup-data doc |
| `strategycity.main.service.PostStartupService` (L44713, **PostStartupService**) | `getPostStartupData()` → `getPostStartupData []` imm | fired by `GetPostStartupDataCommand` (L659685) after the city is up; reply carries the deferred pushes (quests, events, notifications…) |
| `networking.services.ManifestService` (L15479, **ManifestService**) | `getManifests()` → `getManifests []` future → `ManifestVO[]` (`type, nestedPath`) | hashes for the `xml.balancing.*` static files (`manifest.model.ManifestModel`) |
| `networking.services.FeaturesService` (L523855, **FeaturesService**) | `getFeatureFlags()` → `getFeatureFlags []`; pushes `getFeatureFlags` (`FeatureFlagVO[] {feature, status}`), `getFeatures` (`FeaturesVO {unlocked[]}`) | → `shared.features.FeatureModel` (L551121, static API): `isUnlocked(id)`, `isEnabled(id)`, `whenUnlocked(id)`, `getLinkedTechnologyId(id)`. Ids seen: `guild, neighbourhood, crafting, cauldron, ancient_wonder, tournaments_tech, spire, prosperity, video_ad, crafting_redesign, microsoftRating`; flags: `experimental, show_console, show_performance_monitor, dom_uncaught_errors, cmp_ad_consent, cmp_consent_popup, cmp_reload_popup, upgrade_mode, direct_purchase, guardian_unsummon, seasonPassCashShop, join_guild_after_*_start` |
| `strategycity.main.service.SettingsService` (L665431, **SettingsService**) | `updateSettings(SettingsVO, immediately, cb)` (L537361 fields: `zoomFactor, cityQuality, battleQuality, animationSpeedup, effectSound, backgroundSound, showCityOverlays, showPremiumConfirmDialog, showUnboostedManufactoryConfirmDialog, alwaysUseParallelProductions, alwaysUseParallelManufactories, drawTechTreeConnections, leaveSpireDiplomacyPopup, notificationsAncientWonder/Merchant/NeighborlyHelp/Trade`), `fetchEmail`, `updateEmail(new, pw, cb)`, `updatePassword(pw, newPw, cb)`, `validateEmail`, `addEmail(email, acceptedEmails, cb)`, `validatePassword(pw, playerName, cb)`, `activateEmail(code)`, `requestActivationCode`, `requestActivationCodeWithNewEmail(email)`, `ignorePlayer(name)`, `unignorePlayer(name)`; pushes `requestActivationCode`, `updateActivationEmail` | |
| `networking.services.SupportService` (L69211, **SupportService**) | `getSupportUrl(data)`, `getSupportUrlForClientData(device, data)` (futures) | `microsoft.support.SupportHandler` (L518512) attaches `model.Diagnostics` (L59279) |
| `strategycity.main.service.NewsService` (L84528, **NewsService**) | push `fetchNews` → `NewsVO[]` (L533813: `id, type, theme, title, message, urgent, startTime, endTime, buttonType/Text/Value, active`); `trackNews(news, trackType, tab)` → `TrackNewsVO {type, theme, action, tab, priority, firstRead}` | tells the server which news you opened |
| `shared.indicators.services.IndicatorsService` (L563052, **IndicatorsService**) | `getIndicators()`; `clearIndicator(indicatorId, categoryId)` → **`clearIndicator [categoryId, indicatorId]`** (note reversed order); `clearIndicators(ids[])`; push `getIndicators` → `IndicatorVO[]` (`id, group, value`) | "new" badges; ids `IndicatorId` (L562956, statics L784654ff): `guild, messages, inventory_items|spells|buildings|instants|sorceries, entity_category, notifications, cauldron_*, buildings, technology, technology_section, news, spire_shop, crafting_highlights, local_*season_pass*`; model `IndicatorsModel` (L562963) |
| `videoads.services.VideoAdService` (L643684, **VideoAdService**) | `getFeatures()` → `VideoAdVO[]` (L541866: `featureId, adId, limit, remaining, resetIn`), `getBuildersBonusConfig()` → `VideoAdBuildersBonusConfigVO`; `start/finish/track/bypass(featureId, context)` (`VideoAd*ContextVO`, e.g. `VideoAdResearchKpFinishContextVO {techId}` L541792) | rewarded ads (Google AdSense H5 via `GoogleAdSenseProvider` L643050, `RiseBridge` L643670); `bypass` = pay diamonds instead |
| `cmp.services.CmpService` (L512190, **CmpService**) | `storeConsentToken(consentToken, controllerId)`, `trackOpenConsentPopup()` | Usercentrics (`cmp.models.UsercentricsBridge` L512077) |
| `networking.services.LogService` (L31231, **LogService**) | see below | |

### 14.1 What the client reports (detection-relevant)

`LogService` (**LogService**) — every call is `withData([...])`, non-immediate (batched with the next
request):

| method | when |
|---|---|
| `logGameLogin(loadingTime)` | once, end of bootstrap (L390320) — total load time |
| `trackGameStartup(stepName)` | each bootstrap command name (L390306) and `"missing-hardware-acceleration"` (L392140) |
| `logPerformanceMetrics(PerformanceMetricsVO)` | `city.utils.PerformanceMetricsLogger` (L510300) **every 300 s**: `fps, vram, driver_info, gpu_profile, module (city/worldmap/battle…), screen_resolution_x/y, city_engine:"snake"` (VO L534304) |
| `trackAppLifeCycle(step)`, `trackSocketConnection(method)`, `trackDownload*(…)`, `trackInstallSize`, `trackCrossSell` | app-shell / mobile & socket bookkeeping |
| `trackEventWindowOpen(type)` | only `"royal_pass"` (L427108) |
| `trackShopOpen/Close/Cancel/Error` | cash shop |
| `trackRatingScreen(action)` | Microsoft rating popup |

Other explicit tracking calls: `NewsService.trackNews`, `CRMService.markInterstitialSeen`,
`CmpService.trackOpenConsentPopup`, `VideoAdService.track`, `CraftService.trackHighlightsOpened`,
`SeasonalEventsService.confirmEventStarted/Ended`, `QuestDataService.markSeen`.
The client does **not** send input timings or per-click telemetry; what the server sees is the
sequence and timing of the game requests themselves (see `04-networking-layer.md` for the request
envelope) plus the above.

Error reporting: `shared.logging.SentryIoLogger` (L563872) initialises Sentry with the world's DSN
(`GameUrls.sentry` L665676, `ApplicationParams.version` L665537 as release), `setUser({id, username})`
from `shared.clientBehavior.LoggingModel.userInformation` (L549083), tags + `extra.requestData` =
`HTTPRequestHelper.getLatestData()` (the **last request payload**), `extra.stacktrace`. Gated by
`LoggingModel.serverLogLevel` (`ApplicationParams.worldLogLevel`, bit-mask over
`LogLevel` DEBUG/INFO/WARNING/ERROR; changeable from the in-game console
`SentryLoggingCommand` L389248); `dom_uncaught_errors` flag adds `window.onerror`.
Practical consequence: an exception thrown by injected code inside a game callback can be shipped to
InnoGames' Sentry together with the previous request body. `de.innogames.diagnostics.DiagnosticTool`
(L139142) collects WebGL vendor/renderer/version, resolution, compressed-texture support
(`collectors.*` L139174ff) for the support URL and Sentry diagnostics.

### 14.2 Small packages

- `de.innogames.onyx.microsoft.*` (13): Windows-Store build extras — `rating.*` (rate-and-review
  popup, `microsoftRating` feature) and `support.*` (support handler with `Diagnostics`).
- `de.innogames.onyx.archive.*` (14): the "archive points" popup for spire/tournament
  (`ArchivePointsPopup` L74334, strategies `SpireArchivePointsStrategy` L140269 /
  `TournamentArchivePointsStrategy` L140322; VOs `SeasonalEventPointsArchiveVO {points,
  pointsToUnlock, size}` L537034, `SeasonalEventPointsArchiveSpentVO {points}` L537011); the
  spending calls belong to the spire/tournament services.
- `de.innogames.onyx.fx.*` (13): UI particle/animation helpers (`UiFxAnimator` L372210,
  `FxTarget` L514411) — nothing to drive.
- `de.innogames.onyx.configs.*` (9): robotlegs configuration classes for the world map and army
  deployment modules (`WorldMapConfig` L512337 …) — see the worldmap doc.
- `de.innogames.onyx.constants.*` (15): `Race` (L415805: `humans | elves | neutral | all`,
  `Race.getPlayerRace()`), `GoodId`, `GoodsQuality`, `RelicId` (see §7), `GuestRaceChapter`
  (L512569: DWARFS=6, FAIRIES=7, ORCS_GOBLINS=8, WOODELVES=9, SORCERERS_DRAGONS=10, HALFLINGS=11,
  ELEMENTALS=12, AMUNI=13, CONSTRUCTS=14, ELEMENTALS_2=18), `GuestRaceNames` (`gr9` = constructs),
  `Seasons` (`winter spring summer autumn`), `BaseNameTokens` (L512557: `M_Humans_Barracks`,
  `M_Elves_Barracks`, `M_Fairies_Barracks`, `M_Orcs_Barracks`, `Premium_Workshop`, `B_Gr9_*`),
  `UnitClassMaps` (L512593: unit-type→class helpers, `getClassByType(unitType)`),
  `ExternalCommunicatorIDs` (L512560: DOM/automation ids of UI elements —
  `technology_`, `questGiver_`, `buyKpButton`, `windowCloseButton`, `finishBattleAutomatically`,
  `battleSurrender`, `visitOtherPlayer`, `healUnits`, `buyPremium`, `paginationNextPage`, …
  L783702–783745), `HumanAssets`/`ElfAssets`/`RaceAssetHelper` (assets), `StringKey`.
  Push-name constants for the future-style services live in
  `networking.services.constants.*` (L784146–784167): `CashShopServiceConstants.GetProducts/
  RefreshProducts`, `CraftServiceConstants.GetCraftingData/GetTransitionRewards/UpdateActiveRecipe/
  UpdateProgress`, `FeaturesServiceConstants.GetFeatureFlags/GetFeatures`,
  `GuardianServiceConstants.GetCollection`, `TranscendenceServiceConstants.AllBuildingsStates/
  BuildingsStateUpdated`, `TreasureServiceConstants.SpawnTreasure`, plus effects/spire ones.

---

## Open questions / not verified

- The exact JSON of `openChestAndCollect`'s error/edge cases (chest unavailable, not enough
  currency) — only the success shape (`ChestRewardGroupVO`) was traced.
- `TreasureService.getCurrencyEventTreasures()` return shape (never consumed by the click flow;
  presumably `TreasureVO[]`); the treasure spawn cadence is server-side.
- Whether `SeasonalEventVO.state` is always the lower-cased `SeasonalEventState` name (`running`,
  `new`, `end`, `last`, `lock`, `coming`) — the extension relies on `running`; the others are inferred.
- `buyResourcePackage`'s `data` argument type for the player-KP case (the AW case passes
  `AncientWonderKnowledgePointData.toVo()`; the KP window passes `window.get_data()` which may be null).
- Merge/tile/shuffle event server-side validation rules (constraints are also enforced client-side
  in `shared.models.data.constraints.*` L444030ff, not re-derived here).
- `InGameShopService.getOffers(offerId)` — `offerId` is the numeric `OfferVO.id` matched by CTA
  targetId (L412588); untested whether `0` lists everything.
- Sentry `beforeSend` filtering (`beforeSendFilterStrings = ["script error.","ad placement api"]`,
  hash-stripping regex) — whether stack frames from an injected script are actually delivered was
  not verified; treat as "assume yes".
- `ValueManipulationService` is push-only in this snapshot; whether the server ever sends
  manipulations outside promotions was not observed.
- The March 2026 snapshot was not checked for renames in these packages.
