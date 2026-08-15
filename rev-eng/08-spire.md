# 08 — The Spire of Eternity: map, diplomacy minigame, battles, rewards

## Scope

Everything the client does for the Spire: how the spire map/points/state are modelled, the
network services that drive it, the diplomacy ("negotiation") minigame end to end (server VOs,
client mediator logic, exactly how the extension pre-fills picks), spire battles, chests /
mystery chests / gates, the spire shop, spire effects (Spire Ancient Wonder benefits), fellowship
spire (crystals, ranking, rounds overview), and recipes for reading state and driving turns
programmatically.

Drawn from `de.innogames.onyx.spire.*` (392 classes, mostly L616060–L630350 plus a scatter of
early-registered ones L14626–L83919), the spire services in `de.innogames.onyx.networking.services`
(`SpireService`, `SpireEffectService`, `SpireShopService`, L523961–L524053), the spire VOs in
`de.innogames.onyx.networking.vos` (L537782–L538988, plus round VOs L528160/L528189/L529561/
L531929/L536706), the seasonal-events static-data handlers for the spire
(`de.innogames.onyx.seasonalevents.handlers.spire.*`, L544892–L545020) and the extension's
`src/inject/local/localProcessSpireDiplomacyGetData.ts`, `src/inject/spirePicksStore.ts`,
`src/inject/injectMutate.ts`, `src/model/spire.ts`, `src/elvenar/processSpire*.ts`, `src/spirewizard/*`.

**`de.innogames.onyx.guardians.*` (54 classes) is NOT spire-related.** It is the "Guardian Grove"
city feature (summon guardians, grow stages, guardian effects — `GuardiansController` L24261,
`GuardiansWindow` L515467, `SummonTabBody` L517038). Its only spire touch is reusing the spire
multiplayer lock icon. It belongs with the city/buildings or events/economy files.

Cross-references: `04-networking-layer.md` for the request builder / push responses / SafeResponse
mechanics; `05-services-catalog.md` for the flat catalog; `06-extension-hooks-and-recipes.md` for
how `window.aviad*` are created; `07-worldmap-tournaments-battle.md` for the manual battle module,
`ArmyDeploymentModel`, `BattleStateVO`/`BattleRealmVO`; `11-events-economy-misc.md` for
`SeasonalEventsModel` (the spire is a seasonal event of type `"spireEvent"`); `12-models-and-startup-data.md`
for `RunningActivitiesModel` and the startup payload.

---

## 1. Big picture

| Concept | Where it lives |
|---|---|
| The spire is a **seasonal event** of type `"spireEvent"`; its `subType` (the map-set id) keys crystals/items. | `SpireCrystalHelper.getEventSubType` (L15033), `SpireDiplomacyWindowMediator._onEventsUpdated` (L626409: `seasonalEventsModel.hasRunningEvents("spireEvent")`) |
| Spire **static data** (map points, levels, waypoints, crystal rewards, mystery-chest positions, spire item) arrives as static-data components handled by `de.innogames.onyx.seasonalevents.handlers.spire.*` | `SpireMapHandler` (L544929), `SpireLevelsHandler` (L544908), `SpireWaypointsHandler` (L544995), `SpireRewardsHandler` (L544977), `SpireMysteryChestsHandler` (L544960), `SpireItemHandler` (L544892) |
| Spire **dynamic state** (level, point states, gate timer, mystery chests, skill value) is one `SpireVO` from `SpireService.getData` and every later `updateMap` push | `SpireModel.update` (L14959) |
| Entering the spire = clicking the `"spire"` interactive decoration in the city → module change to `ApplicationModuleName.SPIRE` | `SpireControllerConfig` (L617031) maps `IsoDecorationEvent::click` → `EnterSpireCommand` (L616411) guarded by `CanEnterSpire` (L617003) |
| Spire models/services are configured **in the city context** (`SpireConfiguration` L617018 → `SpireServicesConfig` L617066, `SpireModelsConfig` L617044, mapped from `FeaturesConfiguration` L389937) so `SpireModel`, `SpireMapPointsModel`, `SpireStateModel`, `SpireCrystalsModel`… are reachable from the root injector even outside the spire module; the spire **module** context adds its own (`SpireModuleConfiguration` L619649 → Models L619660 / Services L619690 / Commands L619611 / Views L619711) | see §8 recipes |
| A point is either an **encounter** (fight or negotiate → chest), a **gate** (timer between stages, open for free after the timer or instantly for diamonds) or an **effect_selection** point (pick one of N Spire-AW effects) | `SpirePointTypes` (L617126, values L785711–785713) |

### 1.1 State vocabularies

| Constant class | Values |
|---|---|
| `SpirePointStates` (L617123, values L785704–785710) | `"completed"`, `"available"`, `"inactive"`, `"rewarding"` (encounter beaten, chest not yet opened), `"diplomacy"` (negotiation in progress), `"battle"` (battle in progress), `"missed"` |
| `SpirePointTypes` (L617126) | `"encounter"`, `"gate"`, `"effect_selection"` |
| `SpirePointSizes` (L617120) | `"small"`, `"medium"`, `"boss"` (medium/boss = 5-frame diplomacy layout, §4.6) |
| `SpirePointFrameTypes` (L617117) | `SMALL=0`, `MEDIUM=1`, `MAIN=2` |
| `SpireMapPointsModel.VISIBLE_POINT_STATES` (L780307) | `["available","rewarding","battle","diplomacy"]` — the "current" point is the first point in one of these states |
| enum `SpireState` (L630297) | `UNAVAILABLE`, `ACTIVE`, `COMING`, `COMPLETED`, `GATE` — from `SpireStateVO.state` strings `"active"`, `"coming"`, `"completed"`, `"gate"` (anything else → UNAVAILABLE), `SpireStateModel.createState` (L22663) |
| enum `SpireRoundState` (L630287) | `COMING(properties, reappearsIn)`, `ENDED(properties, result)`, `LAST(properties, result, rewards, rewardsReady)`, `RUNNING(properties, remainingTime, pointId, pointLevel)`, `OTHER(properties)`, `NONE` — built from the round VOs by `SpireOverviewViewDataProvider.getState` (L624713, +253) |
| Diplomacy state (`SpireDiplomacyState`, L627445, instances L785832–785834) | `"in_progress"`, `"won"`, `"lost"` |
| Diplomacy slot history result (`DiplomacyTradeHistoryRenderer.registerStates`, L626928 +32) | `"correct"` (accepted), `"other"` ("Wrong Person" — some *other* spirit wanted it), `"nobody"` ("Nobody needs it") |
| Mystery chest state (`SpireMysteryChestView`, L623257) | `"locked"` / anything else = unlocked |
| Frame state (`DiplomacyFrameData.state`, L625121) | `"OPEN"`, `"COMPLETE"`, `"FAIL"` |

---

## 2. Services (wire names, methods, payloads)

Six client classes talk to **four** wire services (`serviceName`), plus the city-side
`SpireStateService`, `SpireRankingService`, `SpireRoundsService`. Two client classes share the wire
name `SpireService`, and a third `SpireService` in `spire.services` only listens to a push. All
extend `AbstractConnectionService` (see 04); the callback-style ones use
`this.request("m").withData([...]).withCallback(cb).immediate().call()`, the newer ones
`callWithFuture()`.

### 2.1 `SpireService` (wire name `SpireService`)

Client class A: `de.innogames.onyx.spire.service.SpireService` (L24594) — callback style, used by
the spire module commands. Client class B: `de.innogames.onyx.networking.services.SpireService`
(L523987) — future style, same wire methods. Either works from outside DI (`new`).

| Wire method | Args (`requestData`) | Response | Used by |
|---|---|---|---|
| `getData` | `[]` | `SpireVO` (§3.1) | `ConfigureStartupDataCommand` (L617369) on spire entry → `SpireModel.update` |
| `getEncounter` | `[pointId]` | `SpireEncounterVO` (§3.2) | `ShowSpireEncounterWindowCommand` (L616751), `LoadActiveSpireEncounterCommand` (L616442). Extension: request selector `SpireService/getEncounter` in `src/inject/playerSpecificMatchers.ts` → `src/elvenar/processSpireEncounterStart.ts` (forwards `responseData` to the Spire Wizard tab). |
| `buyUnits` | `[pointId, unitId]` | array of `UnitPremiumCostVO {unitId, cost}` (L540871) — updated diamond prices | `BuyUnitsCommand` (L616322) → `SpireEncounter.unitCosts.update(result)` |
| `openChest` | `[pointId]` | array of `RewardVO` (L528995) | `OpenChestCommand` (L616575) — chest of a `"rewarding"` point |
| `openGate` | `[pointId]` | status (ignored) | `OpenGateCommand` (L616609) — free open once `gateRemainingTime <= 0` |
| `instantOpenGate` | `[pointId]` | status (ignored) | `InstantOpenGateCommand` (L616421) — after diamond confirmation (`InstantOpenGatePremiumCalculator` L73211) |
| `openMysteryChest` | `[chestLocationId]` | array of `RewardVO` | `OpenMysteryChestCommand` (L616639) |
| `getPointsArchive` | `[]` | no callback — answered as **SafeResponse `"getPointsArchive"`** carrying `SeasonalEventPointsArchiveVO {level, points, size, pointsToUnlock}` (L537034) | `SpireArchiveModel` (L58661) |
| `unlockCrystalByArchive` | `[orbsNeededForCrystal]` | no callback | `UnlockNextCrystalWithArchivePointsCommand` (L616925): spend archive points for the fellowship's next crystal |
| **push** `updateMap` | — | `SpireVO` | `SpireService._onUpdateMap` (L24632) → `SpireMapUpdateEvent::update_map` → `UpdateMapCommand` (L616955) |
| **push** `showSpireRewards` | — | `SpireRewardsVO {rewards[], oldSkillValue, newSkillValue}` (L538650) | `SpireServicesConfig` (L617066): stores `SpireSkillValueData` (L394101) |
| **push** `showRewards` | — | array of `RewardVO` | `de.innogames.onyx.spire.services.SpireService._onShowRewards` (L619835) → `SpireRewardsEvent::showSpireAncientWonderRewards` |

Constants: `SpireServiceConstants_UpdateMap = "updateMap"`, `_ShowRewards = "showRewards"`,
`_ShowSpireRewards = "showSpireRewards"` (L784161–784163); `SpireService_GetArchivePoints = "getPointsArchive"` (L785773).

### 2.2 `SpireDiplomacyService` (wire name `SpireDiplomacyService`)

`de.innogames.onyx.spire.service.SpireDiplomacyService` (L21010):

```js
submit(pointId, chosenOptions, turnNumber, cb)  // request("submit").immediate().withData([pointId, chosenOptions, turnNumber])
getData(pointId, cb)                             // request("getData").immediate().withData([pointId])
cancelDiplomacy(pointId)                         // request("cancel").immediate().withData([pointId])   (no callback)
buyExtraTurn(pointId, boughtTurn, cb)            // request("buyExtraTurn").immediate().withData([pointId, boughtTurn])
```

- `chosenOptions` = array of `SpireDiplomacyChosenOptionVO {goodId: string, slot: int}` (L537822),
  built by `SendInvestmentsCommand._createChosenOptions` (L616673). `slot` is the 0-based frame id.
  Only filled frames are sent; solved (`COMPLETE`) frames are omitted.
- `turnNumber` = the `turn` value of the last `getData`/`submit` response (`SpireDiplomacy.currentTurn`),
  or `1` when there was none (`SpireDiplomacyWindowMediator._onSendInvestment` L626278).
- `boughtTurn` = `totalTurns + 1` (`_buyTurn` L626122); the diamond price is `costsExtraTurn`.
- `getData`, `submit` and `buyExtraTurn` all return the same `SpireDiplomacyVO` (§4.1).
- `cancel` gives up the negotiation (closing a lost negotiation, or leaving with the window open).
  There is a second city-side copy `de.innogames.onyx.city.services.DiplomacyCancelService`
  (L50004, same wire name, only `cancel`) driven by `de.innogames.onyx.city.commands.CancelDiplomacyCommand`
  (L386801) for cancelling a *running* diplomacy from the city context.

Extension: response selectors for `SpireDiplomacyService/getData` and `/submit` in
`src/inject/playerSpecificMatchers.ts` both run `localProcessSpireDiplomacyGetData`; the `/submit`
request selector forwards the response to the service worker → `src/elvenar/processSpireDiplomacySubmit.ts`
→ Spire Wizard tab (`src/spirewizard/submitDiplomacy.ts`).

### 2.3 `SpireBattleService` (wire name `SpireBattleService`)

`de.innogames.onyx.spire.service.SpireBattleService` (L22578):

```js
instantBattle(pointId, unitSquads, cb)   // withData([pointId, _getUnitsVO(unitSquads)])
startBattle(pointId, unitSquads, cb)     // same payload; manual battle
instantNextWave(battleId, cb)            // withData([battleId])
startNextWave(battleId, cb)              // withData([battleId])
getBattle(battleId, cb)                  // withData([battleId])
```

`_getUnitsVO` (L22583) maps each deployed squad (`IDataAware.get_data()`) to its `UnitSquadVO
{unitTypeId: string, size: int}` (L540897, `__class__: "UnitSquadVO"`) — the same unit payload
as world-map/tournament battles (see 07). Max 5 squads (`ArmyDeploymentModel.deploySquad` L660244).

Responses:
- `instantBattle` / `instantNextWave` / `getBattle` → `InstantSpireBattleResultVO` (L531695) /
  `SpireBattleStateVO` (L537782), both plain subclasses of `BattleStateVO` (L525374):
  `{battleId, completedWave, totalWaves, reviveCosts, state: BattleRealmStateVO (L525263) {round,
  activeUnitId, unitsOrder[BattleUnitVO], winnerBit, surrenderBit, stepHistory[BattleStepVO], distance_scale_factor}}`.
  `winnerBit == 1` ⇒ you won (`LoadSpireBattleCommand._onBattleResults` L616463).
  `completedWave != totalWaves` ⇒ more waves → `RunningActivitiesModel.set_runningBattle(ManualRunningBattle(battleId, BattleType.SPIRE_BATTLE))`.
- `startBattle` / `startNextWave` → a battle realm (has `battleId`); the client switches module to
  `ApplicationModuleName.BATTLE(BattleType.SPIRE_BATTLE)`.

### 2.4 `SpireEffectService` (wire name `SpireEffectService`, L523961) — effect_selection points

```js
getSelectionOptions(pointId)   → Future<SpireEffectSelectionOptionsVO {effectConfigIds: int[], rerollPrice: int}>  (L537986)
reroll(pointId)                → Future<SpireEffectSelectionOptionsVO>   (costs rerollPrice diamonds)
select(pointId, effectConfigId)→ Future<_>   (client then dispatches CloseWindowsEvent::closeAllWindows)
push "effectsOverview"         → SpireEffectOverviewVO[] {effectConfigId, state, level} (L537956) → SpireBenefitsModel.benefits (L619494)
```
Driven by `SpireEffectSelectionController` (L627622); the window is `SpireEffectSelectionWindow`
(L627730), opened by `SpireMapViewMediator._onMoveComplete` (L621266) when the reached point's type
is `"effect_selection"`. Effects are Spire Ancient Wonder effects (`spire_ancient_wonder`); effect
ids seen in this package: `spire_reduce_negotiation_cost` (→ `SpireEncounterVO.discount`),
`extra_radiant_stones`, `spire_gate_time_reduction`, `spire_gate_instant_open`,
`spire_stage_effect_increase`, `spire_negotiation_costs_{basic,standard,refined,precious}`
(`SpireEffectCostsReturnUtil` L785686 — goods refunded after a negotiation, shown as blimps).

### 2.5 `SpireShopService` (wire name `SpireShopService`, L524031) — the radiant-stones shop

```js
getShop()   → Future<SpireShopVO {remainingRounds, groups[SpireShopGroupVO {name, type, items[SpireShopItemVO {id, cost, reward, available, limit}]}]}>  (L538789/L538709/L538744)
buy(itemId) → Future<RewardVO[]>
push "updateItem"  (SpireShopServiceConstants_UpdateItem L784164)
```
`SpireShopController` (L617205): `getShopItems()` fills a `PaginatedData` of view models,
`buyItem(id)` buys, shows the reward window (`ShowSpireShopRewardWindowCommand` L616806) and
refreshes the shop when it closes. Window: `SpireShopWindow` (L625391), opened via
`SpireMapShopWindowEvent::showWindow` → `ShowSpireMapShopWindowCommand` (L616778) (also marks
indicator `"spire_shop"` viewed). Currency: **radiant stones** (`RadiantStoneValueField` L73701;
reward subType `"radiant_stones"`).

### 2.6 `SpireStateService` (wire name `SpireStateService`, L58693) — city-side "is the spire on?"

`getState()` (no callback) — the answer arrives as **SafeResponse `"updateState"`**
(`SpireStateService_UpdateState`, L785774) with `SpireStateVO {state, remainingTime, eventId}` (L538818)
→ `SpireStateModel.onStateUpdated` (L22663). The model holds tink states `spireState`
(`SpireState` enum) and `spireRemainingTime` (seconds, ticks down once per second, re-fetches at 0).
Refetched on `SeasonalEventsModelEvent::requestEventsUpdate`.

### 2.7 `SpireRankingService` (wire name `SpireRankingService`, L619801) and `SpireRoundsService` (L619819)

- `getRanking(cb)` → `request("updateRanking")`; also **push `updateRanking`** → `SpireRankingUpdateEvent::update_ranking`
  → `UpdateRankingCommand` (L616991) → `SpireRankingModel.update(vo)` (L15059).
  VO `SpireRankingVO {guildId, orbs, players[SpirePlayerRankingVO {playerId, guildContribution, progress[SpireProgressVO {level, numCompletedEncounters}]}]}` (L538617/L538558/L538590).
- `SpireRoundsService.getOverview()` → `Future<round VO[]>` where each element is one of
  `SpireRoundVO {index, orbs, subtype}` (L528160) / `ComingSpireRoundVO {+reappearsIn}` (L528189) /
  `EndedSpireRoundVO {+archivePoints, totalArchivePoints, numParticipants, totalParticipants}` (L529561) /
  `LastSpireRoundVO {+ended fields, rewards, rewardsReady}` (L531929) /
  `RunningSpireRoundVO {+remainingTime, lastCompletedPoint: SpireLastCompletedPointVO {level, pointId}}` (L536706).
  Consumed by `SpireOverviewController.updateOverview` (L36226) via `SpireOverviewViewDataProvider` (L624713).

---

## 3. Data model

### 3.1 `SpireVO` (L538856) — the dynamic spire state (`getData` reply and every `updateMap` push)

| Field | Meaning |
|---|---|
| `mapId: string` | current level's map id; `SpireModel.subtype = mapId.substring(0, mapId.lastIndexOf("_"))`, i.e. `mapId = "<subtype>_<level>"` (assets: `SpireAssets.getMap` L616060 uses the last character as the level digit) |
| `level: int` | current level |
| `lastCompletedPointId: int` | where the character stands |
| `points: SpireMapPointStateVO[] {pointId, state}` (L538339) | state overrides for the current level's points (states from §1.1) |
| `mysteryChests: SpireMysteryChestVO[] {chestLocationId, state, rarity, rewardId}` (L538500) | mystery chests lying on the map |
| `gateRemainingTime`, `gateTotalTime` | seconds; `SpireModel.onTick` counts `_gateRemainingTime` down |
| `skillValue`, `previousSkillValue` | Spire AW skill value ("SPIRE_AW\|Previous Spire Round", `SpireSkillValueField` L80785) |
| `pointsArchiveSpent` | archive points already spent |

`SpireModel` (L14959, singleton in the city context) mirrors these plus `currentEncounter: SpireEncounter`
(set when an encounter window is opened), `hasNewMysteryChest`, `get_gateRemainingTime()`,
`get_hasMysteryChests()`, `get_mysteryChestCount()`.

`SpireMapPointsModel` (L14664): the static map points as `SpireMapPoint` wrappers (L629949, an
`openfl.geom.Point` with getters) over `SpireMapPointVO {id, level, mapId, stage, type, size,
assetId, rewardId, extraRewards, connections, x, y, z, isFirst, isLast, bubbleText, orbs}` (L538380).
Useful methods: `getPoint(pointId)`, `getPointByLevel(level, pointId)`, `getPointsByStates(states[])`,
`getFirstVisiblePoint()`, `getPointsInStage(pointId)`, `getStageStatus()` → `SpireStageStatus
{solvedPoints, totalPoints}` (L617573), `getAllEncounters(mapId, subtype)`, `getFirstPointByLevel(level)`,
`getLastPointByLevel(level)`, `getEncounterByCount(level, count)`, `updatePointState(pointId, state)`,
`completePoint(pointId)`, `refresh()` (re-applies `SpireModel.points` states, marks lower levels
completed, flips an `"available"` gate to `"rewarding"` when the timer is 0). Wrapper subclasses:
`SpireEncounterPoint` (L630138, `get_interactive()` when `available`/`rewarding`), `SpireGatePoint`
(L630150, same), `SpireEffectSelectionPoint` (L630015, when `available`).

`SpireMapLevelsModel` (L14626): `SpireMapLevel {id, mapId, level, name, assetId}` (L630178) per level,
`getLevels(spireMapId)`, `getLevel(mapId)`. `SpireWaypointsModel` (L56890): character paths between
points. `MysteryChestPointsModel` (L24738): chest coordinates (`SpireMysteryChestPoint {chestId, mapId, z, x, y}` L630242).

### 3.2 `SpireEncounterVO` (L538139) → `SpireEncounter` wrapper (L630049) = `window.aviad_se`

```
SpireEncounterVO {
  pointId, basicCosts, mysteryChestDropChance, orbs, discount,
  battle:    SpireEncounterBattleVO (L538016)    { squadSize, enemyWaves[BattleEnemyWaveVO {waveIndex, squadSize, army[UnitSquadVO]}], unitCosts[UnitPremiumCostVO {unitId, cost}], streakRewards[RewardVO] }
  diplomacy: SpireEncounterDiplomacyVO (L538090) { costOptions: {resources: {<goodId>: amount, ...}}, slotsNumber, numStreaks, bonus: {basicReward, streakBonus, totalReward}, streakRewards[RewardVO] }
}
```
The extension's `src/model/spire.ts` `EncounterData` types exactly this shape (observed
`costOptions.resources` keys: `money`, `supplies`, `marble`, `gems`, `scrolls`, … — one entry per
good the spirits may ask for; every entry carries the same per-slot amount).

`SpireEncounter` fields: `pointId`, `waves: BattleEnemyWave[]` (L546991), `squadSize`,
`unitCosts: UnitsPremiumCosts` (L657413), `diplomacyCosts: ResourceCollection` (built by
`ResourceBuilder.init().withVO(vo.diplomacy.costOptions).build()`, L544053), `basicCosts`,
`slotsNumber`, `mysteryChestDropChance`, `orbs`, `discount` (clamped ≥ −100), and the raw
`battle` / `diplomacy` VOs.
`diplomacyCosts.get_resources()` → `de.innogames.collections.resources.Resource[]` (L137582): each
`{id: string, _value: BigInt}` with `get_value()`, `get_intValue()`, `clone()`. **These Resource
objects are what a "pick" is** (§4.4). `ResourceCollection` (L137418) also has `getValueFor(id)`,
`get_ids()`, `addResource(r)`.

Extension: `src/inject/injectMutate.ts` patches the `SpireEncounter` constructor so every instance
is stored in `window.aviad_se` (latest) and `window.aviad_se_a` (all). Declared in `src/inject/aviad.ts`.

### 3.3 Crystals, archive, benefits, ranking

- `SpireCrystalsModel` (L36553) / `SpireCrystalModel` (L619528) / `SpireCrystal` (L629817): fellowship
  progress markers from `CrystalVO {level, pointId, orbsNeeded, rewards, guildXP}` (L528748), keyed by
  the event subtype (`SpireCrystalHelper` L15033: `get_crystals()`, `get_totalOrbs()`, `getCrystalByPointId(level, pointId)`).
  Flexible-reward crystals are recomputed on `SpireDataEvent::spireDataParsed` / chapter advance (`UpdateFlexibleResourcesCrystalsCommand` L616938).
- Orbs = spirit essence (`"spire_orbs"` trophy ↔ resource `"spiritessence"`, L784619). Each encounter
  point has `orbs`; `SpireSpiritEssenceHelper` (L31143) applies the extra-essence effect.
- `SpireArchiveModel` (L58661): archive points (`SeasonalEventPointsArchiveVO`), updated by SafeResponse `getPointsArchive`.
- `SpireBenefitsModel` (L619494): active Spire-AW effects (`SpireEffectOverviewVO[]`, sorted by level desc) from push `effectsOverview`; `SpireBenefitsController` (L617926) builds the HUD panel.
- `SpireRankingModel` (L15059): `get_orbs()`, `get_contributors()` (fellowship members →
  `SpireContributor` L629779 with their current point / `SpireOutsider` L630264 for non-participants),
  `getCurrentCrystal()`. `SpireGuildInfoProvider.canParticipateToMultiplayer()` (L23981) = has a
  fellowship and did not join it after the spire started. `SpireProgressProvider` (L44726):
  `get_lastCompletedPoint()`, `get_markers()`, `get_nextCrystal()`.

---

## 4. The diplomacy (negotiation) minigame — in full

### 4.1 Server VO: `SpireDiplomacyVO` (L537911) — reply of `getData`, `submit`, `buyExtraTurn`

```
SpireDiplomacyVO {
  pointId: int,
  turn: int,             // 1-based number of the NEXT turn to play; after the 3rd submit of a
                         //   3-turn negotiation the reply carries turn = 4
  totalTurns: int,       // normally 3; +1 per bought extra turn
  state: string,         // "in_progress" | "won" | "lost"
  costsExtraTurn: int,   // diamonds for one more turn
  slots: SpireDiplomacySlotVO[] (L537879) {
    slot: int,           // 0-based frame/spirit index (the JSON omits it when 0 — the extension uses `s.slot || 0`)
    history: SpireDiplomacySlotHistoryVO[] (L537849) { result: "correct"|"other"|"nobody", goodId: string, turn: int }
  }
}
```

Client wrapper `SpireDiplomacy` (L629881, ctor L629860): `pointId`, `currentTurn (= vo.turn)`,
`totalTurns`, `remainTurns = totalTurns − turn + 1`, `state`, `costsExtraTurn`,
`slots: SpireDiplomacySlot[]` (L629922) `{slotId, history: SpireDiplomacySlotHistory[] (L629936)
{result, resourceId (= goodId), turn}, lastHistoryPoint (= last history entry)}`.

Semantics as used by the client (`SpireDiplomacyWindowMediator`, L625724):
- A slot is solved iff `slot.lastHistoryPoint.result == "correct"` → its frame becomes `"COMPLETE"` and is never filled again (`_updateFramesState` L625948, `_getNextEmptyFrameId` L626110).
- Every `goodId` that ever came back `"nobody"` is greyed out of the resource panel for the rest of the encounter (`_updateInvestmentButton` L625967 → `SpireUpdateButtonsEvent::updateButtons(filterOutResources)` → `InvestmentPanel.updateButtonsByResources`).
- `"other"` = some other still-open spirit wants that good (the wizard's "yellow").
- The joker: `goodId "spire_diplomacy_joker"` is a resource you own; `InvestmentPanelMediator` (L627197) adds a joker button when `resourcesModel.hasEnough("spire_diplomacy_joker", 1)`, investing `new Resource("spire_diplomacy_joker", 1)`. At most one joker per encounter (`_canUseJoker` = not in the current frames and nowhere in the slot history, `_updateJoker` L626050).
- Frames also get `isMissing` when you do not own enough of the good (`resourceModel.hasEnough(id, total)`); the "Offer" button then turns into a diamond button (§4.4).
- On `state == "lost"` the mediator resumes ticking → `NoTurnsLeftWarningWindow` (L625574): "premium" → `PayPremiumEvent(costsExtraTurn)` → `SpireBuyExtraTurnEvent::buy(pointId, totalTurns+1)` → `BuyExtraTurnCommand` (L616303) → `buyExtraTurn` → another `investment_result`; "close" (optionally after `LeaveSpireWarningWindow` L625526) → `SpireCancelDiplomacyEvent::cancel(pointId)` → `CancelDiplomacyCommand` (L616341) → `SpireDiplomacyService.cancel(pointId)`, character walks back to `lastCompletedPointId` (`CharacterMovementEvent::moveToPoint`), window disposed.
- On `state == "won"` the client sends nothing more: closing the window (`_onClose` L626469) only disposes it and fires `SpireShowEncounterRewardBlimpEvent::showBlimps(pointId, spiritEssence, radiantStones)` (radiant stones from `diplomacy.streakRewards`, ×(1+factor) if effect `extra_radiant_stones`; essence via `SpireSpiritEssenceHelper`). The point becomes `"rewarding"` through the server's `updateMap` push; the player then opens the chest (`openChest`).
- After every result the frames are cleared (`clearInvestment`), the history strip is redrawn (last 6 entries per slot, `_updateFramesHistory` L625856), `remainTurns` shown, and if still in progress the investment panel is positioned on the first OPEN frame.

### 4.2 Flow of events / commands

```
map point click ─SpireEncounterViewMediator._onPointClick (L623062)─▶ SpireUpdateEvent::lock_view + CharacterMovementEvent::moveByPath(pointId)
  ─(walk)─▶ CharacterMovementEvent::moveComplete(pointId) ─SpireMapViewMediator._onMoveComplete (L621266)─▶
  SpireEncounterWindowEvent::show_window(pointId) (L24641) ─▶ ShowSpireEncounterWindowCommand (L616751)
      : SpireService.getEncounter(pointId) → spireModel.currentEncounter = new SpireEncounter(vo)   [= aviad_se]
      : WindowEvent::addWindow(SpireEncounterWindow L39342)   — Fight / Negotiate / info
"Negotiate" ─SpireEncounterWindowMediator.onClickDiplomacy (L625235)─▶ SpireEncounterWindowEvent::click_diplomacy
  ─▶ ShowSpireDiplomacyWindowCommand (L616727)
      : WindowEvent::addWindow(SpireDiplomacyWindow L58057) → SpireDiplomacyWindowMediator created   [= aviad_wm]
      : SpireDiplomacyService.getData(pointId) → SpireInvestEvent::init_diplomacy(SpireDiplomacy)
pick    ─InvestmentPanelMediator._onMouseEvent (L627197)─▶ SpireInvestEvent::invest(resource) (L617667) ─▶ mediator._onInvest (L626201)
"Offer" ─SpireDiplomacyWindow._onInvest (L58057 +236)─▶ SpireInvestEvent::invest_button_click ─▶ mediator._onSendInvestment
  ─▶ SpireInvestEvent::submit  (SpireSendInvestmentEvent(options, turnNumber) L28884) ─▶ SendInvestmentsCommand (L616673)
      : SpireDiplomacyService.submit(pointId, [{goodId, slot}], turnNumber) → SpireInvestEvent::investment_result(SpireDiplomacy)
  ─▶ mediator._onInvestmentResult (L626296): update frames/history/turns, clear frames, wait for the next picks
```
All event → command mappings are in `SpireModuleCommandsConfig.configure` (L619611).

Restoring an interrupted negotiation: startup data `runningDiplomacy` (`SpireRunningDiplomacyVO
{pointId, spireId}` L538682, parsed by `RunningActivitiesParser` L392751 into
`RunningActivitiesModel.runningDiplomacy` L15329) → on spire entry `RestoreSpireDiplomacyCommand`
(L617418) runs `LoadActiveSpireEncounterCommand` (getEncounter of the first point in state
`battle`/`diplomacy`) then `LoadSpireDiplomacyCommand` (L616492: `getData(pointId)` → window +
`investment_result`). Same idea for battles: `RestoreSpireBattleCommand` (L617392).

### 4.3 `SpireDiplomacyWindowMediator` (L625724) — state you can read

| Field | Content |
|---|---|
| `_frames: DiplomacyFrameData[]` (L625121) | one per spirit: `{id, isEmpty, state: "OPEN"\|"COMPLETE"\|"FAIL", isMissing, investment: Resource}`; ids `0..slotsNumber-1` in creation order |
| `_currentFrame` | the frame the next `_onInvest` fills |
| `_diplomacyResult: SpireDiplomacy` | last `getData`/`submit`/`buyExtraTurn` result. `null` until the first `investment_result` — note `init_diplomacy` (the reply of the initial `getData`) does **not** set it, so on a fresh window `_onSendInvestment` sends `turnNumber = 1` |
| `_canUseJoker` | §4.1 |
| `spireModel`, `mapPointsModel`, `resourceModel`, `effectsModel`, `costCalculator`, `spireDiplomacyFactory`, `view` | injected; `spireModel.currentEncounter === window.aviad_se`; `mapPointsModel` is the `SpireMapPointsModel` |
| `eventDispatcher` / `dispatch(evt)` | the spire module context dispatcher (robotlegs `Mediator` L4121: `dispatch` only fires if someone listens) |
| `get__isDiplomacyLost()` | `_diplomacyResult != null && state == "lost"` |

`window.aviad_wm` is the **last created** mediator; after the window closes it is stale (destroyed
mediator, `view` disposed). `window.aviad_wm_a` holds all of them.

### 4.4 `_onInvest({resource})` — what one pick does (L626201)

1. `this._currentFrame.set_investment(event.resource)` — stores the `Resource` (`{id, _value}`) in the current frame (`isEmpty=false`). Throws if `_currentFrame` is null (never happens once the window validated).
2. Rebuilds a `ResourceCollection` of all non-empty frames; recomputes `_canUseJoker`.
3. For every filled frame: `frame.isMissing = !resourceModel.hasEnough(id, totalForThatId)`; `view.updateFrame`.
4. `nextEmptyFrameId = _getNextEmptyFrameId()` — first frame with `isEmpty && state == "OPEN"`.
   - none left → dispatch `SpireInitiateInvestmentEvent::finish_investment` (hides the panel) and
     `view.showInvestButton(costCalculator.calculateGoodsCost(investment) | 0)`: the green **"Offer"**
     button (`name "diplomacy_offer"`) when the diamond cost is 0, otherwise the premium button
     (`"diplomacy_premium_offer"`, `SpirePremiumGoodsCostCalculator` L58601: missing purchasable goods
     scored by resource ratio ÷ `ceil(basicCosts × spireInflation)`).
   - otherwise → moves the investment panel to that frame; `_currentFrame = that frame`.
5. Recomputes the greyed-out button list (`SpireUpdateButtonsEvent::updateButtons`).

Consequences: **calling `_onInvest` repeatedly fills OPEN frames in id order**, skipping COMPLETE
ones. When all frames are filled `_currentFrame` stays on the last frame, so an extra `_onInvest`
**overwrites the last frame** rather than erroring. Clicking a frame (`InvestHolderEvent::click` →
`_onInvestHolderClick` L626194) sets `_currentFrame` to that frame, so re-picking is possible.
`_currentFrame` is first set by `_onValidateComplete` (first frame, L626458) and after each
`investment_result` by the "next empty frame" logic. Only `resource.id` reaches the server, but
`_value` must be a BigInt because the mediator does BigInt arithmetic on it (`_showBlimps` L626003).

### 4.5 `_onSendInvestment()` — when it submits (L626278)

Builds `SpireDiplomacyChosenOption(frame.investment.id, frame.id)` (L629898) for every non-empty
frame, hides the button and dispatches `SpireInvestEvent::submit` with
`turnNumber = _diplomacyResult ? _diplomacyResult.currentTurn : 1`. `SendInvestmentsCommand`
converts to `SpireDiplomacyChosenOptionVO[]` and calls `submit(spireModel.currentEncounter.pointId, …)`,
showing the loader (`LoaderViewEvent::SHOW_LOADER`) until the reply → `SpireInvestEvent::investment_result`.
The premium variant (`_onSendPremiumInvestment`) wraps the same in a `PayPremiumEvent`.

**The extension never presses "Offer" — the human does.** `localProcessSpireDiplomacyGetData.ts`
only pre-fills the frames (§4.7). Programmatic submit = `aviad_wm._onSendInvestment(null)` (§8).

### 4.6 Frames / slots layout

`SpireDiplomacyFactory.createFrames` (L58310): for `size == "boss"|"medium"` a 5-frame layout, else
a smaller one; it creates exactly `spireModel.currentEncounter.slotsNumber` frames with ids
`0..slotsNumber-1` (`_idCounter++`), spirit portraits chosen from `small_1..5` / `medium_1..3`
asset ids other than the point's own. Frame id == server `slot`. Hints shown after a result:
"Nobody needs it" (`DiplomacyTradeHistoryNobodyState` L627332), "Wrong Person"
(`DiplomacyTradeHistoryWrongState` L627346), accepted (`…AcceptedState` L627319).

### 4.7 How the extension drives it (already implemented)

- `src/inject/injectMutate.ts` L205–213: `patchCtorRegistryAssignment` on
  `de.innogames.onyx.spire.views.windows.diplomacy.SpireDiplomacyWindowMediator` → `window.aviad_wm`
  (+ `aviad_wm_a`), and on `de.innogames.onyx.spire.wrappers.SpireEncounter` → `window.aviad_se`.
- `src/inject/playerSpecificMatchers.ts`: on the response of `SpireDiplomacyService/getData` **and**
  `/submit` → `localProcessSpireDiplomacyGetData(request)`. It reads `submit.responseData.{turn,state}`;
  if `turn === 4 || state === 'won'` it clears the stored picks and stops. Otherwise it waits 500 ms,
  waits up to 30 s for picks from the Spire Wizard tab (`src/inject/spirePicksStore.ts`
  `waitForPicks`; picks arrive as a `spirePicks` message with one goodId per still-open slot in slot
  order, falsy for solved), then for each pick finds
  `resource = aviad_se.diplomacyCosts.get_resources().find(r => r.id === pick)` and calls
  `aviad_wm._onInvest({resource})` with 200 ms gaps. Picks are consume-once (both handlers run the same flow).
- `src/elvenar/processSpireDiplomacySubmit.ts` / `src/spirewizard/submitDiplomacy.ts`: the submit
  reply's `slots[].history` entries with `turn === reply.turn - 1` are translated to wizard colours
  (`correct`→G, `other`→Y, `nobody`→R, `src/spirewizard/spirewizard-inject.ts` `resultColors`) and
  the wizard's next choice comes back as the next picks. `src/spirewizard/startNewEncounter.ts` seeds
  the wizard from `getEncounter`'s `diplomacy.costOptions.resources` keys.
- Field-name cross-check: extension `DiplomacySubmitData {pointId, turn, totalTurns, slots[{slot?, history[{result, goodId, turn}]}], state, costsExtraTurn}` (`src/model/spire.ts`) matches `SpireDiplomacyVO` exactly; the extension's turn-4 check matches `turn` being the *next* turn.

---

## 5. Spire battle

- Encounter window "Fight" (`SpireEncounterWindowMediator.onClickFight` L625235 +108) → `ArmyWindowsFactory.createArmyDeploymentWindow()`;
  `SpireArmyDeploymentWindowMediator` (L625157) dispatches `SpireBattleEvent::start_manual_battle` or `::start_instant_battle` on `ButtonEvent::clicked` (L617602 event class).
- `StartSpireInstantBattleCommand` (L616848): `pointsModel.updatePointState(pointId, "battle")`,
  `SpireBattleService.instantBattle(pointId, armyDeploymentModel.getDeployedSquads())`; on result
  updates `battleResult` (units, winner, waves, reviveCosts), sets/cancels the running battle, opens
  `WaveBattleResultWindow` (L83158) via `factory.createBattleResultWindow()`, plays win/lose sound.
- `WaveBattleResultWindowMediator` (L629556): "continue" → `SpireBattleEvent::continue_instant_battle`
  → `ContinueSpireInstantBattleCommand` (L616353) → `instantNextWave(battleId)`; or `::continue_manual_battle`
  → `ContinueSpireManualBattleCommand` (L616378) → `startNextWave` + module switch; retreat →
  `RunningActivityEvent::retreat_battle`; revive units (`ReviveUnitsEvent::revive_unit`, diamonds
  `battleResult.getHealingCost(unitId)` or the revive item). After the final victory it fires the same
  reward blimps as diplomacy. Result-window configurations: `WaveBattleResultDefeat/Victory/VictoryContinue/FinalVictoryConfiguration` (L629469–629535).
- `StartSpireManualBattleCommand` (L616900): `startBattle` → `ModuleChangeEvent::changeModule(BATTLE(SPIRE_BATTLE))`.
- `RestoreSpireBattleCommand` (L617392): if `runningActivities.hasRunningBattle` and a point is in `"battle"`, `getEncounter` + `getBattle(battleId)` and reopen the result window. `ShowOrbsBlimpsAfterBattleCommand` (L617442) shows essence blimps for `"rewarding"` points after a won manual battle.
- Buying units for diamonds inside the deployment window: `SpireBuyUnitsEvent::buy_units` (L79519) → `BuyUnitsCommand` (L616322) → `SpireService.buyUnits(pointId, unitId)`.
- Enemy waves: `SpireEncounter.waves[i]` = `BattleEnemyWave` (L546991) over `{waveIndex, squadSize, army[{unitTypeId, size}]}`; `SpireEnemyUnitsContainerMediator` (L622324) shows them.

---

## 6. Rewards, chests, gates, mystery chests

| Thing | Trigger → command → call → result |
|---|---|
| Encounter chest (`"rewarding"` point) | click → `SpirePointViewEvent::open_chest` (L27119) → `OpenChestCommand` (L616575): `pointsModel.completePoint(pointId)` then `SpireService.openChest(pointId)` → `RewardVO[]` → big reward window (`UpdateChestRewardsWindowBehavior` L616192 / `CloseChestRewardsWindowBehavior` L616163) |
| Gate, timer done | `SpireGateViewMediator._onOptionSelected` (L623213) `"openGate"` → `SpirePointViewEvent::open_gate` → `OpenGateCommand` (L616609) (warns first if it is the last point and mystery chests are unopened: `ForgottenMysteryChestWarningWindow` L625147) → `openGate(pointId)` → `SpireCameraEvent::move_to_next_point` |
| Gate, instant | `"instantOpenGate"` → `PayPremiumEvent(InstantOpenGatePremiumCalculator.calculate(gateRemainingTime))` → `SpirePointViewEvent::instant_open_gate` → `InstantOpenGateCommand` (L616421) → `instantOpenGate(pointId)`; alternatively the spire item (`SpireItemsModel.getItem(subType)` L55953, `OpenGateItemTarget` L629737, `InstantOpenGatePanel` L624503) |
| Mystery chest | drops with `mysteryChestDropChance` after an encounter; `SpireModel.hasNewMysteryChest` → `SpireMysteryChestEvent::spawn_blimp` → `MysteryChestBlimpCommand` (L616564); click → `SpireMysteryChestEvent::open_chest(chestId)` (L51437) → `OpenMysteryChestCommand` (L616639) → `openMysteryChest(chestLocationId)` → `RewardVO[]` |
| Diplomacy / battle streak rewards | `SpireEncounterVO.diplomacy.streakRewards` / `battle.streakRewards` (radiant stones + `numStreaks`, `bonus {basicReward, streakBonus, totalReward}`), shown by `SpireEncounterWindowMediator.setDiplomacyStreakRewards` (L625235 +40); tooltips `DiplomacyStreakTooltip` (L619932), `EncounterRewardsTooltip` (L619950), `RadiantStonesTooltip` (L620005) |
| Fellowship crystals | `SpireProgressProvider` (L44726) `get_nextCrystal()`; unlock with archive points via `SpendArchivePointsEvent::spend` → `UnlockNextCrystalWithArchivePointsCommand` (L616925) → `unlockCrystalByArchive(orbsNeeded)` |
| Round-end rewards | push `showRewards` → `SpireRewardsEvent::showSpireAncientWonderRewards` (L32630); push `showSpireRewards` (`SpireRewardsVO`) → skill value delta; `SpireRewardsController` (L617132), `ShowSpireRewardsCommand` (L616794) |
| Spire complete | `CharacterMovementEvent::moveToPointComplete` → `ShowSpireCompleteCommand` (L616706) → `SpireCompleteWindow` (L43192) |
| Spire over | `SpireOverEvent::over` → `SpireEventEndCommand` (L616838) |

---

## 7. What settles when — signals to watch

| After you… | The game state settles when… | Observe |
|---|---|---|
| open an encounter (`getEncounter`) | the response arrives | new `SpireEncounter` ⇒ `window.aviad_se` changes (ctor patched); `WindowEvent::addWindow(SpireEncounterWindow)` |
| click Negotiate | `getData` response | new `window.aviad_wm`; `SpireInvestEvent::init_diplomacy` on the module dispatcher |
| `submit` a turn | `submit` response | `SpireInvestEvent::investment_result` on `aviad_wm.eventDispatcher`; `aviad_wm._diplomacyResult` updated; extension: response selector `SpireDiplomacyService/submit` |
| win a negotiation / battle, open a chest / gate | the server's **`updateMap` push** (a `SpireVO`) — the client does not flip an encounter to `"rewarding"`/`"completed"` locally except the optimistic `completePoint` in the chest/gate commands and `"battle"` in the battle commands | `SpireMapUpdateEvent::update_map` → `UpdateMapCommand` (L616955) → `SpireUpdateEvent::update_map_view` (same level) or a full reload (`LoadingEvent::initialize` … `SpireUpdateEvent::update_map_points`, `::waypoints_updated`, `LoadingEvent::finished`) when `mapId` changed (new level) |
| anything that changes fellowship progress | push `updateRanking` | `SpireRankingUpdateEvent::update_ranking` → `SpireUpdateEvent::ranking_updated` |
| the spire round starts/ends (city side) | SafeResponse `updateState` on `SpireStateService` | `SpireStateModel.spireState` / `spireRemainingTime` (tink states) |
| character walks | `CharacterMovementEvent::moveComplete(pointId)` / `::moveToPointComplete` | `CharacterMovementMediator` (L622893) |

`SpireUpdateEvent` string ids (L785736–785744): `update_unit_slots`, `update_map_points`,
`update_map_view`, `waypoints_updated`, `view_updated`, `ranking_updated`, `markers_updated`,
`lock_view`, `unlock_view`.

Other event ids: `SpireEncounterWindowEvent::{show_window,click_diplomacy,click_fight,click_info}` (L780418),
`SpirePointViewEvent::{click,open_chest,instant_open_gate,open_gate}` (L780467),
`SpireMysteryChestEvent::{mystery_chest_click,spawn_blimp,open_chest}` (L780838),
`SpireBattleEvent::{start_manual_battle,start_instant_battle,continue_instant_battle,continue_manual_battle}` (L785718),
`SpireInvestEvent::{invest,invest_button_click,invest_premium_button_click,close,submit,investment_result,init_diplomacy}` (L785723–785730, L780510),
`SpireCancelDiplomacyEvent::cancel` (L780382), `SpireBuyExtraTurnEvent::buy` (L781098), `SpireBuyUnitsEvent::buy_units` (L781168),
`SpireCameraEvent::{move_to_next_point,move_to_next_mystery_chest}` (L781049), `SpireMapUpdateEvent::update_map` (L780928),
`SpireRankingUpdateEvent::update_ranking` (L780763), `SpireRewardsEvent::{showRewards,showSpireAncientWonderRewards}` (L780554),
`SpireDataEvent::spireDataParsed` (L785722, end of `SpireConfigurationSequence` L617171 — the spire module's bootstrap sequence),
`SpireOverEvent::over` (L785733), `SpireMapShopWindowEvent::showWindow` (L785732),
`SpireInitiateInvestmentEvent::finish_investment` (L785727), `SpireUpdateButtonsEvent::updateButtons` (L785735).

---

## 8. Recipes (MAIN world, with the extension's `window.aviad*` globals)

`window.aviad` = `$hxClasses` (constructor by FQ name), `window.aviad_enum` = `$hxEnums`,
`window.aviad_am` = the `ApplicationModel` (root `injector`), `window.aviad_se` = latest
`SpireEncounter`, `window.aviad_wm` = latest `SpireDiplomacyWindowMediator` (see 06).

### 8.1 Read the current spire state (works from the city too, once the spire has been entered at least once this session)

```js
const A = window.aviad, inj = window.aviad_am.injector;
const spire  = inj.getInstance(A['de.innogames.onyx.spire.models.SpireModel']);          // L14959
const points = inj.getInstance(A['de.innogames.onyx.spire.models.SpireMapPointsModel']); // L14664
spire.mapId, spire.level, spire.lastCompletedPointId, spire.get_gateRemainingTime(), spire.mysteryChests.map(c => c.get_chestLocationId());
spire.points.map(p => [p.get_pointId(), p.get_state()]);          // raw states from the last SpireVO
const cur = points.getFirstVisiblePoint();                       // first available/rewarding/battle/diplomacy point
cur.get_id(), cur.get_type(), cur.get_state(), cur.get_size(), cur.get_orbs(), cur.get_stage();
points.getStageStatus();                                          // {solvedPoints, totalPoints}
spire.currentEncounter === window.aviad_se;                       // after an encounter window was opened
```
`SpireModel` is empty (fields null) until `SpireService.getData` ran (spire entered). To fetch it
yourself: `new A['de.innogames.onyx.spire.service.SpireService']().getData(vo => …)` (L24594) —
the callback receives the raw `SpireVO`; the extension can also just watch the
`SpireService/getData` response entry (`ElvenarRequestResponseEntry {requestClass, requestMethod, requestData, responseData}`).

City-side "is the spire running": `inj.getInstance(A['de.innogames.onyx.spire.models.SpireStateModel'])`
(L22663) → `tink_state_State.get_value(m.spireState)._hx_name` (`"ACTIVE"`…) and `get_value(m.spireRemainingTime)`.

### 8.2 Read an encounter (costs, slots, waves) — after opening it

```js
const se = window.aviad_se;                       // SpireEncounter, L630049
se.pointId, se.slotsNumber, se.basicCosts, se.discount, se.orbs, se.mysteryChestDropChance;
se.diplomacyCosts.get_resources().map(r => [r.id, r.get_intValue()]);   // goods a spirit may ask for + per-slot amount
se.diplomacy.numStreaks, se.diplomacy.bonus, se.diplomacy.streakRewards;
se.waves.length, se.battle.enemyWaves, se.squadSize, se.battle.unitCosts;
```
Or from the wire: watch the `SpireService/getEncounter` response (raw `SpireEncounterVO`, typed by
`src/model/spire.ts` `EncounterData`) — that is what `src/elvenar/processSpireEncounterStart.ts` does.

### 8.3 Open an encounter / start a negotiation without clicking the map

The commands are mapped in the **spire module** context, so dispatch on that context's dispatcher —
`aviad_wm.eventDispatcher` (any live spire mediator's `eventDispatcher` works, `aviad_wm` only
exists once a diplomacy window has been created this session):
```js
const A = window.aviad, d = window.aviad_wm.eventDispatcher;
d.dispatchEvent(new A['de.innogames.onyx.spire.events.SpireEncounterWindowEvent']('SpireEncounterWindowEvent::show_window', pointId));  // L24641 → getEncounter + encounter window
d.dispatchEvent(new A['de.innogames.onyx.spire.events.SpireEncounterWindowEvent']('SpireEncounterWindowEvent::click_diplomacy'));      // → diplomacy window + getData
```
The natural path is `SpireEncounterViewMediator._onPointClick` (walk first); skipping the walk is
what the game itself does on restore (`LoadActiveSpireEncounterCommand` + `LoadSpireDiplomacyCommand`).
`pointId` must be the current `available` point (server enforces).

### 8.4 Run a diplomacy turn programmatically (what the extension does, plus the submit)

```js
const wm = window.aviad_wm, se = window.aviad_se;
const res = id => se.diplomacyCosts.get_resources().find(r => r.id === id);
// picks: one good id per still-OPEN frame, in frame-id order (skip COMPLETE frames)
for (const id of ['marble', 'scrolls', 'gems']) wm._onInvest({ resource: res(id) });      // L626201
// joker: wm._onInvest({ resource: new window.aviad['de.innogames.collections.resources.Resource']('spire_diplomacy_joker', 1n) })
wm._frames.map(f => [f.id, f.state, f.isEmpty ? null : f.investment.id, f.isMissing]);      // verify
wm._onSendInvestment(null);   // L626278 → SpireInvestEvent::submit → SpireDiplomacyService.submit(pointId, [{goodId, slot}], turn)
```
Notes: only frames with `state == "OPEN"` are filled; the mediator sends `turn = wm._diplomacyResult ? wm._diplomacyResult.currentTurn : 1`.
`_onSendInvestment` uses the free path — if goods are missing the server will reject (the UI would
have shown the diamond button instead; check `wm._frames.some(f => f.isMissing)` first).
Direct wire alternative (bypasses the window entirely, same server effect):
```js
const S = new window.aviad['de.innogames.onyx.spire.service.SpireDiplomacyService']();     // L21010
S.getData(pointId, vo => console.log(vo.turn, vo.state, vo.slots));
S.submit(pointId, [{goodId: 'marble', slot: 0}, {goodId: 'gems', slot: 2}], turn, vo => console.log(vo));   // plain objects are fine, only goodId/slot are read server-side
S.buyExtraTurn(pointId, vo.totalTurns + 1, cb);   S.cancelDiplomacy(pointId);
```
(the open window will not learn about a bypassing submit until it gets an `investment_result`; feed it with
`wm.eventDispatcher.dispatchEvent(new A['de.innogames.onyx.spire.events.SpireInvestmentResultEvent']('SpireInvestEvent::investment_result', new A['de.innogames.onyx.spire.wrappers.SpireDiplomacy'](vo)))` if you want the UI to follow).

Reading the result: `wm._diplomacyResult.{currentTurn,totalTurns,remainTurns,state,costsExtraTurn}`,
`wm._diplomacyResult.slots.map(s => [s.slotId, s.lastHistoryPoint?.result, s.history.map(h => [h.turn, h.resourceId, h.result])])`.
Done when `state == "won"` (or `"lost"` → buy a turn / cancel). Then wait for the `updateMap` push,
then `SpirePointViewEvent::open_chest` (or `SpireService.openChest(pointId)`) to collect.

### 8.5 Fight a spire encounter programmatically

```js
const A = window.aviad, inj = window.aviad_am.injector;
const army = inj.getInstance(A['de.innogames.strategycity.main.model.ArmyDeploymentModel']);   // L660204 (see 07)
// (the deployment window's mediator initialises the model for the current encounter; deploySquad(unitType, count) up to 5)
const B = new A['de.innogames.onyx.spire.service.SpireBattleService']();                       // L22578
B.instantBattle(pointId, army.getDeployedSquads(), r => console.log(r.completedWave, r.totalWaves, r.state.winnerBit));
// or bypass the model: request("instantBattle").withData([pointId, [{unitTypeId:'orc_warrior', size: 1234}, ...]]).withCallback(cb).immediate().call()
// continue waves: B.instantNextWave(r.battleId, cb) until completedWave == totalWaves
```
UI path: dispatch `SpireBattleEvent::start_instant_battle` (after the deployment window filled the
model) → `StartSpireInstantBattleCommand`; then `SpireBattleEvent::continue_instant_battle` per wave.
The extension does not automate spire fights today.

### 8.6 Chests / gates / shop / effects, one-liners

```js
const S = new window.aviad['de.innogames.onyx.spire.service.SpireService']();
S.openChest(pointId, rewards => …);  S.openGate(pointId, cb);  S.instantOpenGate(pointId, cb);  S.openMysteryChest(chestLocationId, cb);
const Sh = new window.aviad['de.innogames.onyx.networking.services.SpireShopService']();   Sh.getShop().handle(vo => …); Sh.buy(itemId).handle(rewards => …);
const E  = new window.aviad['de.innogames.onyx.networking.services.SpireEffectService'](); E.getSelectionOptions(pointId).handle(o => …); E.select(pointId, effectConfigId);
new window.aviad['de.innogames.onyx.spire.service.SpireRankingService']().getRanking(vo => …);
new window.aviad['de.innogames.onyx.spire.service.SpireRoundsService']().getOverview().handle(rounds => …);
```
Or through the UI: `SpirePointViewEvent::open_chest(pointId)`, `::open_gate`, `::instant_open_gate`,
`SpireMysteryChestEvent::open_chest(chestId)`, `SpireMapShopWindowEvent::showWindow` on the module dispatcher.

---

## Open questions / not verified

- Exact `mapId` / event `subType` strings (e.g. whether the subtype is literally `"spire"` and maps are `"spire_1..3"`) — only the `"<subtype>_<level>"` split and the `"spire_default"+lastChar` asset rule are visible in code.
- Whether the server sends the `updateMap` push inside the same batch as the winning `submit` / `openChest` / `openGate` reply or as a separate message — the client only reacts to the push, so timing is a server matter. Likewise whether `updateRanking` pushes accompany it.
- The `getData` reply for a *fresh* encounter: does `slots` come empty, or with `slotsNumber` entries with empty `history`? `_onInvestmentResult` dereferences `lastHistoryPoint.result`, so at least every `submit` reply has ≥1 history entry per slot; `_onInitDiplomacy` tolerates empty history.
- Whether the server validates `turnNumber` on `submit` (the client sends `1` for a brand-new window even if `getData` said otherwise, so it is probably lenient or `getData` returns `turn: 1` there).
- `_value` of the resource sent to `_onInvest`: the game passes the per-slot cost; the extension passes the same `Resource` objects, so this is safe — but a hand-made `{id, _value: 0n}` would still work for the submit (only `id` is sent) at the price of a wrong "missing goods" display.
- `SpireDiplomacyVO.slot` omission for `0` is an extension observation (`slot?: number`), not something the client code proves.
- `SpireEncounterVO.discount` sign/units (percentage clamped to ≥ −100 in `SpireEncounter`) and how the discounted costs are computed server-side.
- Push routing when both the city-context and the module-context `SpireService` instances exist (both register `updateMap` listeners; the module's command map is what reacts) — see 04 for the push-listener registry.
- The Spire Ancient Wonder skill-value formula (`SpireRewardsVO.newSkillValue`) and what `SpireBenefitState` (L617988) values are — not read.
- HUD classes (`SpireTopBar`, `SpireProgress*`, `MarkersGroup`, `ContributorsGroup`, tooltips) were skimmed only for the events they emit; nothing actionable found there beyond what §7 lists.
