# 07 — World map, provinces, tournaments, battle and army

Scope: the compiled Elvenar client's world map (`de.innogames.onyx.worldmap.*`, 394 classes),
province screen (`de.innogames.onyx.province.*`, 33), tournaments (`de.innogames.onyx.tournaments.*`,
176), the battle module (`de.innogames.onyx.battle.*`, 265) plus the shared battle/army pieces it
leans on (`de.innogames.onyx.army.*`, `de.innogames.onyx.shared.battle.*`,
`de.innogames.strategycity.main.model.ArmyModel` / `ArmyDeploymentModel` / `Squad`,
`de.innogames.strategycity.shared.service.ArmyService`, `de.innogames.onyx.city.services.BattleRetreatService`),
and the wire VOs those packages parse (`de.innogames.onyx.networking.vos.*Province*`, `*Encounter*`,
`*Battle*`, `*Tournament*`, `UnitSquadVO`, `ArmyDetailsVO`). Snapshot: `tmp/elvenar-release-full-reveng.js`
(Feb 12 2026); line numbers below are into that file. A real capture of a tournament session
(`tmp/tournament_progression.json`, gitignored) was used to confirm wire shapes; where a statement
rests on that capture rather than on the code it says so.

Extension side: `src/inject/local/tourny*.ts`, `src/inject/local/fetchWorldNeighbors.ts`,
`src/inject/local/neighbourlyHelp.ts` (service factories), `src/inject/playerSpecificMatchers.ts`,
`src/service-worker/playerSpecificRequestHandler.ts`, `src/elvenar/processTourny*.ts`,
`src/elvenar/processInitialWorldMapData.ts`, `src/elvenar/processWorldNeighbors.ts`,
`src/model/tourny/*`, `src/model/initialWorldMapData.ts`, `src/model/worldNeighbors.ts`,
`src/model/armyDetails.ts`. Networking mechanics (request builder, providers, push routing) are in
`04-networking-layer.md`; DI/module contexts in `02-bootstrap-di-commands-events.md`; static
balancing files (`xml.balancing.battle.BattleUnitTypes`, `xml.balancing.world_map.Encounters`) in the
models/startup and services files. Cross-references use those file names.

---

## 1. Hex coordinate system

### 1.1 `q`/`r` on the wire vs `rowIndex`/`columnIndex` in the client

Every province VO extends `de.innogames.onyx.networking.vos.AbstractProvinceVO` (L524443) which has
exactly two coordinate fields, `r` and `q` (both ints; `toJsonObject` emits `{r, q}`). The client
never uses `q`/`r` names internally: every wrapper turns them into `rowIndex`/`columnIndex`, and the
mapping is **always**

| server field | client accessor | evidence |
|---|---|---|
| `q` | `get_rowIndex()` | `GoldMineProvince` ctor `Province.call(this, vo.q, vo.r)` (L646979); `PlayerProvince` (L647123); `TournamentProvince.toProvince` copies `vo.q`/`vo.r` back (L647235); `ScoutData.get_rowIndex → _vo.destination.q` (L646076); `ProvinceProgress.get_rowIndex → _vo.q` (L638677); `WorldMapService._onUpdateTournamentTime` calls `getProvinceAt(vo.q, vo.r)` (L647651) |
| `r` | `get_columnIndex()` | same places, second argument |

`de.innogames.onyx.worldmap.model.data.province.AbstractProvince` (L646651) ctor is
`function(rowIndex, columnIndex)`; `WorldMapModel.provincesMap` (L645833) is
`IntMap<rowIndex, IntMap<columnIndex, province>>` and `getProvinceAt(rowIndex, columnIndex)`.

### 1.2 Wire argument ORDER of every coordinate-taking request

All coordinate-taking service methods take `(rowIndex, columnIndex, …)` **and send
`[columnIndex, rowIndex, …]`**, i.e. `[r, q, …]` in server-field terms:

| service (wire name) / method | JS method signature | `withData` sent |
|---|---|---|
| `WorldMapService/getProvinceInformation` (`WorldMapService.getProvinceInformation`, L647651) | `(province, cb)` | `[province.get_columnIndex(), province.get_rowIndex()]` = `[r, q]` |
| `BattlefieldService/instantBattle`, `/start` (`WorldMapBattleService`, L647619) | `(rowIndex, columnIndex, encounterIndex, playerUnits, cb)` | `[columnIndex, rowIndex, encounterIndex, squads]` |
| `UnlockEncounterService/unlockEncounterByTrading`, `/unlockEncounterByTradingUsingPremium` (L647600) | `(rowIndex, columnIndex, encounterIndex, cb)` | `[columnIndex, rowIndex, encounterIndex]` |
| `WorldMapScoutService/startScouting`, `/finishScouting`, `/instantFinish` (`ScoutingService`, L647565) | `(rowIndex, columnIndex[, cost], cb)` | `[columnIndex, rowIndex[, cost]]` |
| `TournamentService/instantUpgrade` (`WorldMapTournamentService`, L51469) | `(rowIndex, columnIndex, cost, cb)` | `[columnIndex, rowIndex, cost]` |
| `ArmyService/buyMissingUnitsForPremium` (`ArmyService.buyUnits`, L666485) | `(unitType, provinceColumnIndex, provinceRowIndex, cb)` | `[unitType, columnIndex, rowIndex]` |

Verified against the capture: `getProvinceInformation` request `[-47, -43]` returned a province the
overview lists as `{q: -43, r: -47}`; `instantBattle` `[-47, -43, 0, [...]]` returned
`encounter_result: {r: -47, q: -43}`; `unlockEncounterByTrading` `[67, 9, 0]` returned `{r: 67, q: 9}`.

**Extension alignment.** `src/inject/local/tourny.ts` sends `getProvinceInformation` with
`.withData([r, q])` and `instantBattle` with `[r, q, 0, units]`, and calls the game's
`unlockEncounter(q, r, 0, cb)` (which itself flips to `[r, q, 0]`). The extension's `q`/`r` are the
server's `q`/`r` (taken from `getProvincesOverview`), so all three are correct: **first wire arg = r =
columnIndex, second = q = rowIndex**. `processTournyProvinceInformation.ts` reads
`requestData[0]` as `r` and `[1]` as `q` — also correct.

### 1.3 Grid geometry (flat-top hexes, odd columns shifted down)

`de.innogames.onyx.worldmap.view.grid.WorldMapCellPositionCalculator` (L651447) extends
`grid3d.math.FlatHexPositionCalculator` (L651421) with radius 115 px:

```js
getCellCoordinatesAt(rowIndex, columnIndex) {
  x = columnIndex * 1.5 * radius; y = rowIndex * 2 * internalRadius;
  if (columnIndex % 2 != 0) y += internalRadius;      // "odd-q" offset layout
}
```

Neighbours — `de.innogames.onyx.worldmap.util.NeighborsFinder._findNeighborOffsets(offset)` (L648935),
`offset = |columnIndex % 2|`, offsets are `GridPosition(rowDelta, columnDelta)`:

| side | rowDelta | columnDelta |
|---|---|---|
| NORTH / SOUTH | −1 / +1 | 0 |
| NORTHWEST / NORTHEAST | −1 + offset | −1 / +1 |
| SOUTHWEST / SOUTHEAST | offset | −1 / +1 |

`WorldMapModel.getNeighborProvinces(rowIndex, columnIndex)` (L645833) returns the six neighbours in
order NW, SW, NE, SE, N, S. `de.innogames.common.map2D.*` (L137781–138525: `ValueMap`,
`PlacementMap`, `Pathfinding`) is **not** the world map — it is the city grid placement/pathfinding
(used by the city iso engine and by the battle pathfinder `PathfindingProvider` L365665).

Cell type is a pure function of coordinates — `de.innogames.onyx.worldmap.util.CellTypeHelper`
(L648898):

```js
isCity(row, col)     { if (col % 2 != 0) --row; return row % 3 == 0; }        // every 3rd row is a city ring
getGoodType(row, col){ shift = GOODS_SHIFT_PATTERN[row mod 9]; return GOOD_TYPES[(shift + col mod 9) % 9]; }
GOODS_SHIFT_PATTERN = [6,6,3,0,0,6,3,3,0]                                            // L786135
GOOD_TYPES = ["marble","scrolls","gems","steel","silk","elixir","planks","crystal","magic_dust"]  // L786136
```

So `EmptyGoodProvince.get_goodId()` (L646740) is computable client-side for any unscouted cell.

### 1.4 Ids

There are **no province ids** — provinces are addressed by `(q, r)` only. World map *areas* have a
string id `"columnIndex,rowIndex"` (`WorldMapArea` ctor splits `vo.id` on `,`, L646288); an area is
`world_map_area_length × world_map_area_height` cells (`WorldMapAreaFactory.init`, L11603).
Tournament provinces additionally carry `number` (1 = closest, the "Province N" label) and `level`
(round 1..6). Battles have an int `battleId`; battle units have signed int `unitId` (player units
negative in the capture: −1..−5, enemies −6..).

---

## 2. World map model, VOs and services

### 2.1 Province VO hierarchy (server → client)

`de.innogames.onyx.worldmap.model.data.province.ProvinceFactory` (L647310) maps VO class →
wrapper (`ProvinceFactory.createProvince(vo)` static):

| VO (`de.innogames.onyx.networking.vos.*`) | fields (beyond `r`, `q`) | wrapper | `get_group()` |
|---|---|---|---|
| `GoodProvinceVO` (L530538) | `good_id`, `player_encounters_amount`, `total_encounters_amount`, `difficulty`, `distance` | `GoodProvince` (L647037): `get_goodId/numCompletedEncounters/numTotalEncounters/difficulty/distance/completed`, `get_scouted()` always true | `"GOODS"` |
| `TournamentProvinceVO` (L540248) extends GoodProvinceVO | `level`, `number`, `remainingTime`, `premiumCosts` | `TournamentProvince` (L647235): `get_league()`=level, `get_order()`=number, `get_state()`, `get_remainingTime()`, `get_premiumCost()` | `"TOURNAMENTS"` |
| `PlayerProvinceVO` (L534512) | `player_id`, `cool_down`, `help_back_count_down`, `known`, `name`, `race`, `technology_section`, `guild_info`, `hasAncientWonder`, `avatar` | `PlayerProvince` (L647123): `get_playerId/level(=max(1,technology_section))/name/race/player/guildInfo/hasAncientWonder/remainingTime(=cool_down)/helpBackCountDown` | `"CITIES"` |
| `GoldMineProvinceVO` (L530436) | `coolDown`, `rewards` | `GoldMineProvince` (L646979) | `"GOLD_MINES"` |
| (none) | — | `EmptyGoodProvince` (L646740) / `EmptyPlayerProvince` (L646903): synthesized by `WorldMapModel.getProvinceAt` for cells the server never sent | `"GOODS"` / `"CITIES"` |
| `ScoutProvinceVO` (L536739) | `costs` (money int), `location: {q,r}`, `state`, `difficulty`, `totalTime`, `distance`, `reducedTime` | `ScoutableProvince` (L647352): `get_costs()` (ResourceCollection with `money`), `get_state()` → `ProvinceLockState` | scouting model only |
| `ProvinceLocationVO` (L535261) | just `r`, `q` | — | — |
| `TournamentProvinceUpdateVO` (L540220) | `remainingTime`, `premiumCosts` | applied in place by `WorldMapService._onUpdateTournamentTime` | push `updateTournamentTime` |

State enums (EnumWrapper string constants, L786069–786077):
`ProvinceLockState`: `UNLOCKED`, `LOCKED_COMPLETE_BORDERING_PROVINCES`, `LOCKED_COMPLETE_MORE_QUESTS`;
`TournamentProvinceState`: `READY`, `UPGRADE`, `FINISHED`; `GoldMineProvinceState`: `READY`,
`PENDING`, `COLLECTED`.

`TournamentProvince.get_state()` (L647235):
```js
if (level == 6) return FINISHED;          // all 6 rounds done
if (remainingTime > 0) return UPGRADE;    // cooldown until next round
return READY;
```
and `get_completed()` returns true unless state is READY *and* fewer than `total_encounters_amount`
encounters were done. Only READY provinces can be visited
(`TournamentEncounterVisitor.canVisit`, L649094).

There is no explicit "unexplored / scouted / negotiated / conquered" enum: unscouted cells are simply
absent (`Empty*Province`, `get_scouted() == false`), scouted goods provinces arrive as
`GoodProvinceVO`, progress is `player_encounters_amount / total_encounters_amount`, and
`get_completed()` is the derived "conquered". Whether a given encounter was negotiated or fought is
not kept.

### 2.2 `WorldMapModel` (L645833, `de.innogames.onyx.worldmap.model.IWorldMapModel`)

Readable state: `provincesMap` (row→col→province), `provincesByGroup` (`StringMap` group →
`Vector<IProvince>`; groups `"GOODS"`, `"CITIES"`, `"TOURNAMENTS"`, `"GOLD_MINES"`),
`worldAreasMap` (row→col→`WorldMapArea`), `playerPosition` (own city `GridPosition`),
`currentProvince` (the province currently open in the province screen), `userModel`.
Useful calls: `getProvinceAt(row, col)`, `getProvinceByGroup("TOURNAMENTS")`,
`getNeighborProvinces(row, col)`, `getWorldAreaAt(row, col)`, `addProvince(p)`, `addWorldArea(a)`.

Where it lives: mapped `toSingleton` in `de.innogames.onyx.configs.WorldMapModelsConfig` (L512408),
which is configured by the **`WorldMapModule` context** (`WorldMapModule.configure`, L86261 —
`WorldMapConfig` + `TournamentsConfig` + `GoldMineConfig`). It is therefore not in the main
`ApplicationModel` injector the extension already captures (`window.aviad_am.injector`); to reach it
from the extension you need an instance from the world-map context (e.g. patch the
`de.innogames.onyx.worldmap.model.WorldMapModel` constructor with the same
`patchCtorRegistryAssignment` trick `src/inject/injectMutate.ts` uses for `ApplicationModel`), and it
only exists while the world map module is loaded (destroyed on `ModuleContextEvent::destroyContext`
→ `WorldMapDestroyCommand`, L645526).

### 2.3 `WorldMapService` (wire `WorldMapService`, L647651)

| method | request | response | consumer |
|---|---|---|---|
| `startup(cb)` | `fetchInitialWorldMapData` `[]` (immediate) | `WorldMapStartUpVO` (L542191): `world_map_area_length`, `world_map_area_height`, `player_world_map_area_vo: WorldMapAreaVO {id:"x,y", provinces: AbstractProvinceVO[]}`, `locations_to_scout: ScoutProvinceVO[]`, `scout: ScoutVO|null` (running scout: `destination{q,r}`, `instant_costs`, `time_left`, `total_time`, `difficulty`), `unlock_encounter_reward_vo: UnlockEncounterResultVO|null` (a reward not yet shown) | `LoadWorldMapStartupDataCommand` (L644223) |
| `getWorldMapAreas(areas, immediately, cb)` | `fetchAreas` `[["x,y", …]]` — batched: collects ids and fires after 0.5 s unless `immediately` | `WorldMapAreaVO[]` | `LoadWorldMapAreasCommand` (L645100) |
| `getProvinceInformation(province, cb)` | `getProvinceInformation` `[col, row]` (immediate) | `ProvinceEncountersVO` (L535164) or `TournamentProvinceEncountersVO` (L540188), see §3 | `GetGoodEncountersCommand` (L542239), `StartTournamentEncounterCommand` (L637529) |
| `getIncompleteProvinces(cb)` | `getIncompleteProvinces` `[]` | `GoodProvinceVO[]` (started, not finished) | `GetIncompleteGoodProvincesCommand` (L644962) |
| `getDiscoveredPlayerProvinces(cb)` | `getDiscoveredPlayerProvinces` `[]` | `PlayerProvinceVO[]` — every neighbour city you have discovered (the "neighbours" list) | `GetDiscoveredPlayerProvincesCommand` (L644931) |
| push `updateProvince` | — | one province VO → `UpdateProvincesEvent::update` → `UpdateProvincesCommand` (L645390) replaces it in the model | e.g. after neighbourly help (`cool_down` etc.) |
| push `updateMapArea` | — | `WorldMapAreaVO[]` → model + `WorldMapViewEvent::drawGrid` | scouting done elsewhere |
| push `updateTournamentTime` | — | `TournamentProvinceUpdateVO {q, r, remainingTime, premiumCosts}` → patches the `TournamentProvince` in place | tournament round cooldown ticks |

**Extension:** `src/inject/local/fetchWorldNeighbors.ts` calls `startup()` then (200 ms later)
`getDiscoveredPlayerProvinces()` on a `new`-ed `WorldMapService`; the responses are picked up by the
network interceptor (`playerSpecificMatchers.ts` entries `WorldMapService/fetchInitialWorldMapData`,
`/getDiscoveredPlayerProvinces`, `/updateProvince`, `/getProvinceInformation`,
`/updateTournamentTime`) and processed by `processInitialWorldMapData.ts` (`InitialWorldMapData` =
`WorldMapStartUpVO` field-for-field), `processWorldNeighbors.ts` (`WorldNeighbor` =
`PlayerProvinceVO` field-for-field, incl. `help_back_count_down`, `cool_down`),
`processHelpPerformedUpdateProvince.ts` and `processTournyUpdateTime.ts` (`TournyTime` =
`TournamentProvinceUpdateVO`). Field names match the VOs exactly (`good_id`,
`player_encounters_amount`, `total_encounters_amount`, `technology_section`, `hasAncientWonder`,
`locations_to_scout[].location{q,r}`, `scout.destination`…). One nuance: `initialWorldMapData.ts`
types `Province.distance` but the game's `GoodProvinceVO` also has `difficulty` (int id into
`ProvinceDifficultyVO`, L535124: `id`, `title`, `description`, `province_description`, `color`),
which the extension model omits.

### 2.4 Scouting (`ScoutingService`, wire `WorldMapScoutService`, L647565; `ScoutingModel`, L645754)

| method | request | response / effect |
|---|---|---|
| `startScouting(row, col, cb)` | `startScouting` `[col, row]` (immediate) | `StartScoutVO {locations_to_scout: ScoutProvinceVO[], scout: ScoutVO}`; `StartScoutingCommand` (L645294) first subtracts `province.get_costs()` (money) locally |
| `finishScouting(row, col, cb)` | `finishScouting` `[col, row]` (not immediate) | `WorldMapAreaVO[]` (areas to merge into the model) — `FinishScoutingCommand` (L644898) |
| `instantFinish(row, col, cost, cb)` | `instantFinish` `[col, row, cost]` (immediate; `cost` = `ScoutData.get_instantCost()` diamonds) | same as finish |
| push `findProvincesToScout` | — | `ScoutProvinceVO[]` → `ScoutingModel.updateProvinces` |
| push `updateScout` / `removeScout` | — | `ScoutVO` → `ScoutingModel.set_scoutData(new ScoutData(vo))` / null |

`ScoutingModel`: `get_isScouting()`, `get_scoutData()` (`ScoutData` L646076: `get_rowIndex`=`destination.q`,
`get_columnIndex`=`destination.r`, `get_instantCost`, `get_remainingTime`=`time_left`,
`get_totalTime`), `getProvinceAt(row,col)` → `ScoutableProvince`. Commands are triggered by
`ScoutingEvent("ScoutingEvent::startScouting"|"::finishScouting"|"::instantFinishScouting", rowIndex,
columnIndex)` (ctor L11738; mappings in `WorldMapControllerConfig` L512354).

---

## 3. Encounters and the province screen

### 3.1 Wire shape of `getProvinceInformation`

`ProvinceEncountersVO` (L535164): `good_id`, `encounters: EncounterVO[]`, `encounterRewards:
RewardVO[]`, `unitPremiumCosts: UnitPremiumCostVO[] {cost (diamonds), unitId}`.
`TournamentProvinceEncountersVO` (L540188) adds `playerSquadSize`, `provinceRewards: RewardVO[]`,
`baseTournamentPointsAmount`.

`EncounterVO` (L529524): `number` (the encounter index sent back to the server; **absent = 0** in the
capture), `enemyWaves: BattleEnemyWaveVO[]`, `costs: CityResourceVO {resources: Dictionary<goodId,
amount>}`. `BattleEnemyWaveVO` (L525082): `army: UnitSquadVO[] {unitTypeId, size}`, `squadSize`
(enemy squad size), `waveIndex` (1-based). `RewardVO`: `id?`, `type`, `subType?`, `amount`
(types seen: `tournamentPoints`, `knowledge_points`, `good` + `subType` e.g. `relic_scrolls`,
`spell_supply_production_boost_1`, `runeShard` + `subType`).

Capture (a tournament province, level 1): one encounter, one wave of 5 enemy squads
(`mob_eblr_1 ×643`, `mob_eblr_1 ×643`, `mob_ebhm_1 ×107`, `mob_tghr_1 ×107`, `mob_hbhr_1 ×107`,
`squadSize: 643`), `costs.resources = {elixir: 8200, money: 1300000, magic_dust: 8200, premium: 0}`,
`playerSquadSize: 5100`, `unitPremiumCosts` for all 15 own unit types.

**Extension:** `src/model/tourny/provinceInformation.ts` mirrors `TournamentProvinceEncountersVO`
exactly (`good_id`, `encounters[].enemyWaves[].army[]/squadSize/waveIndex`, `costs.resources`,
`encounterRewards`, `unitPremiumCosts[].cost/unitId`, `playerSquadSize`, `provinceRewards`,
`baseTournamentPointsAmount`). Missing vs the game: `Encounter.number` (the client sends it back as
`encounterIndex`; the extension hard-codes `0`, which is what the server currently omits/defaults —
safer to send `encounters[0].number ?? 0`).

### 3.2 Client wrappers

`UpdateProvinceEncountersCommand` (L645363, on `ProvinceEncountersEvent::updateProvince`) builds
one `IEncounter` per VO via `EncounterFactory.create(vo, province, playerName)` (L646530):
`TournamentEncounter` (L646556, `get_type() == EncounterType.TOURNAMENT` = `"tournament"`) when the
current province group is `"TOURNAMENTS"`, else `DefaultEncounter` (`"normal"`). Both extend
`AbstractEncounter` (L646390):

```js
this._costs  = ResourceBuilder.init().withVO(vo.costs).build();   // ResourceCollection
this._solved = this._costs.createFilter().filter().count() == 0;  // SOLVED == "no costs left"
this._enemyWaves = vo.enemyWaves.map(w => new BattleEnemyWave(w)); // get_army(), get_squadSize(), get_waveIndex()
get_index()  { return this._vo.number; }                          // sent as encounterIndex
get_costs(), get_solved(), get_rewards()/set_rewards(), get_unitCosts() (UnitsPremiumCosts), solve()
```

They are collected in `de.innogames.onyx.worldmap.model.EncounterModel` (L645655):
`get_encounters()` (Vector, in server order), `get_selectedEncounter()/set_selectedEncounter()`,
`get_unlockEncounterResult()`, `reset()`. Static encounter layouts (`EncounterConfigVO` L529485:
`number`, `x`, `y`, `theme`, `type`) come from `xml.balancing.world_map.Encounters` (L784180) via
`LoadEncountersCommand` (L644837) and only position the buttons.

Cost determination is **server-side only** — the client never computes negotiation goods; it just
renders `encounter.get_costs()` (`EncounterWindowMediator.updateTradingCosts`, L654676) and, if
`costs.premium > 0`, swaps the trade button for the diamond button (`showPremiumButton`).
After every solved encounter `UnlockEncounterCommand._updateCompletedEncounters` (L542476) writes
`result.premiumCosts[encounter.get_index()]` into each unsolved encounter's `premium` cost — that is
how "the next encounter costs diamonds" appears without a re-fetch. `de.innogames.shared.UnitsPremiumCosts`
wraps `unitPremiumCosts` (price to buy the missing units for one squad).

### 3.3 Cater vs fight in the UI

Opening a province: `ProvinceEvent::visitProvince` → `de.innogames.onyx.province.view.ProvinceViewMediator._onEnterProvince` (L542841)
→ `GetProvinceDataCommand` (L644997) = `LoadProvinceBackgroundCommand` + `GetGoodEncountersCommand`
(L542239: `encounterModel.reset(); service.getProvinceInformation(currentProvince, …)` →
`ProvinceEncountersEvent::updateProvince`). Clicking an encounter button →
`EncountersLayerMediator._onEncounterSelected` (L542570) sets `selectedEncounter` and opens
`WorldMapEncounterWindow` (L78024) mediated by
`de.innogames.onyx.worldmap.view.window.encounter.EncounterWindowMediator` (L654676):

| view event | mediator handler | dispatches |
|---|---|---|
| `TradingViewEvent::trade` | `onTrade` | `EncounterEvent("trade", encounter)` → `TradeEncounterCommand` (L542277) |
| `TradingViewEvent::trade_premium` | `onTradePremium` → premium confirmation → `onConfirmation` | `EncounterEvent("tradeForPremium", encounter)` → `PremiumTradeEncounterCommand` (L542338) |
| `DefendingArmyViewEvent::fight` | `onFight` | opens `ArmyDeploymentWindow` (`windowsFactory.createArmyDeploymentWindow()`) |
| `EncounterWindowEvent::closed` | `onClickCloseButton` | tournament: `ProvinceEvent::leaveProvince` |

`updateView` sets `tradingState` `"TOURNAMENT"`/`"NORMAL"` and `defendingArmyState` `"CAN_FIGHT"` /
`"NO_UNITS"` (`armyModel.hasAvailableUnits()`).

`TradeEncounterCommand.execute` (L542277): shows loader, disables shortcuts, then
`service.unlockEncounter(province.get_rowIndex(), province.get_columnIndex(), encounter.get_index(),
onTradeRelicComplete)`. On response (`UnlockEncounterResultVO`, L540928: `provinceRewards`,
`encounterRewards`, `provincesNeeded`, `premiumCosts: int[]` (indexed by encounter index),
`encounterNumber`, `r`, `q`): `encounter.solve()`, dispatch
`UnlockEncounterEvent::unlockEncounter` (→ `UnlockEncounterCommand` updates
`province.numCompletedEncounters` and premium costs), then for tournaments
`ShowProvinceRewardsWindowBehavior.execute()` (L656214), otherwise
`EncounterViewEvent::encountersUpdated` + `EncounterRewardEvent::showReward`. Server errors with
`code 6000` or `2000` are swallowed (`_onServiceException`).

The army deployment window (`ArmyDeploymentWindowMediator`, L653451) listens to
`ButtonEvent::clicked` with ids `"auto_fight"` → `StartBattleEvent("StartBattleEvent::instantBattle",
battleType)` and `"fight"` → `StartBattleEvent("StartBattleEvent::startBattle", battleType)`, after
`_updateBattleModel()` stored `battlePosition`, `encounterIndex` and `isTournamentEncounter` in
`BattleDetailsModel` (L660420). `battleType` is `BattleType.TOURNAMENT_BATTLE` when
`currentProvince.get_group() == "TOURNAMENTS"`, else `WORLD_MAP_BATTLE` (enum L512516: `SPIRE_BATTLE`=0,
`TOURNAMENT_BATTLE`=1, `WORLD_MAP_BATTLE`=2, `UNKNOWN`=3). Mappings: `WorldMapGridConfig` L512396
(`StartBattleEvent::instantBattle` → `InstantBattleCommand`, `::startBattle` →
`ManualBattleCommand`, `"trade"` → `TradeEncounterCommand`, `"tradeForPremium"` →
`PremiumTradeEncounterCommand`) and `WorldMapControllerConfig` L512354
(`SolveEncounterEvent::encounter` → `SolveEncounterCommand`, `::tournament_encounter` →
`SolveTournamentEncounterCommand`, `UnlockEncounterEvent::unlockEncounter` → `UnlockEncounterCommand`,
`ProvinceEncountersEvent::updateProvince` → `UpdateProvinceEncountersCommand`).

---

## 4. Battle

### 4.1 `WorldMapBattleService` (wire `BattlefieldService`, L647619) and the squad payload

```js
instantBattle(rowIndex, columnIndex, encounterIndex, playerUnits, cb) → request("instantBattle").withData([columnIndex, rowIndex, encounterIndex, _getUnitsVO(playerUnits)]).immediate()
startBattle  (rowIndex, columnIndex, encounterIndex, playerUnits, cb) → request("start")        .withData([...same...]).immediate()
_getUnitsVO(units) = units.map(squad => squad.get_data())     // Squad → its UnitSquadVO
```

`playerUnits` is `ArmyDeploymentModel.getDeployedSquads()` (L660204): a `Vector<Squad>` of the
**deployed slots only** — up to 5 (`get_isSquadCountLimitReached: length >= 5`), no placeholders for
empty slots, duplicates of the same unit type allowed, order = order of deployment. Each element
serialises through `UnitSquadVO.toJsonObject()` (L540897) as
`{"__class__":"UnitSquadVO","unitTypeId":"hb_lr_4","size":5100}` (`__class__` comes from
`AbstractVO.toJsonObject`, L414747). Capture:
`[-47,-43,0,[{hb_lr_4,5100},{tg_ma_4,1700},{mc_hm_5,850},{mc_hm_5,850},{mc_hm_5,850}]]`.

Squad sizing (`ArmyDeploymentModel.deploySquad(unitType, squadUnitsCount)`): the slot gets
`min(remainingUnitsOfType, squadUnitsCount)` — a partial squad is legal. `squadUnitsCount` comes from
`de.innogames.onyx.worldmap.model.WorldMapSquadSizeProvider.getSquadSize(unitType)` (L646032):

```js
squadSize = armyModel.maxSquadSize;                                    // ArmyDetailsVO.battleClusterSize
if (worldMapModel.currentProvince.get_group() == "TOURNAMENTS") squadSize = tournamentEncounterModel.get_playerSquadSize();
return armyModel.getSquadUnits(unitType, squadSize);
// ArmyModel.getSquadUnits (L9290): Math.ceil(squadSize / max(1, unitConfig.unitWeight | 0))
```

**Extension mismatch (fixed 2026-08-15):** `src/overlay/counterComposition.ts`, `TournyPlanner.tsx` (and `TOURNY.md` §5) sized squads with
`Math.floor(playerSquadSize / unitWeight)`; the game uses **`Math.ceil`** — now the extension does too. Identical whenever the
division is exact (as in the capture: 5100/1, 5100/3 = 1700, 5100/6 = 850) but off by one otherwise,
and the server accepts what the client sends, so the extension used to under-fill such squads.
`src/model/tourny/tournyFight.ts` (`unit: {__class__:'UnitSquadVO', unitTypeId, size}`, sent 5×)
matches the wire format.

Unit type ids are `<building>_<class>_<level>` for own units (`hb_lr_4`, `mc_hm_5`, `tg_ma_4`;
`hb`/`eb` human/elf barracks, `mc` mercenary camp, `tg` training grounds; classes `lm lr hm hr ma`)
and `mob_<building><class>_<level>` for enemies (`mob_eblr_1`) —
`UnitsModel.getUnitConfigByBaseName(baseName, level)` looks up `baseName + "_" + level` (L12406).
(There is no `"G_Elves_Archer_1"` style id; `G_Elves_*` names are city building assets.) Unit stats
(`BattleUnitTypeVO`, L525581: `unitTypeId`, `unitAssetName`, `unitClass`, `name`, `hitpoints`,
`range`, `initiative`, `movementPoints`, `baseDamage`, `attackBonus{}`, `defenseBonus{}`,
`unitWeight`, `damageRange`, `trainingTime`, `race`, `origin`, `order`, `upgradedFromTypeId`,
`baseName`, `specialAbilities[]`, `strengths{}`) come from the static
`xml.balancing.battle.BattleUnitTypes_<hash>.json` (extension: `nonSpecificMatchers.ts`
`battleUnitTypes` → `processBattleUnitTypes.ts`) and are also embedded verbatim in every
`BattleUnitVO.unitType` of a battle result.

### 4.2 Instant battle response and the result model

`instantBattle` returns `InstantBattleResultVO` (L531673) = `BattleStateVO` (L525374: `state:
BattleRealmStateVO`, `battleId`, `completedWave`, `totalWaves`, `reviveCosts: Dictionary<unitId,
diamonds>`) + `encounter_result: UnlockEncounterResultVO` (same shape as a trade result; `null`/absent
on defeat — the code only reads it when `winner`). `BattleRealmStateVO` (L525263): `stepHistory:
BattleStepVO[]`, `surrenderBit`, `winnerBit` (1 = player won), `unitsOrder: BattleUnitVO[]`,
`activeUnitId`, `round`, `distance_scale_factor`. `BattleUnitVO` (L525736, extends `AbstractUnitVO`
L524593 `unitId, ownerId, currentHitpoints, unitType, amountOfUnits`): `teamFlag` (1 = player),
`pos`, `startpos`, `startHitpoints`, `lastRetaliationRound`, `teamInitiative`, `startAmountOfUnits`,
`lostUnitsLastAttack`, `squadDamage`, `clusterSize`, `activeBuffs`, `retaliations`,
`amountOfHealedUnits`. `BattleStepVO` (L525430): `unitId`, `path[]`, `attackedUnitId`,
`dealtDamage`, `attackModifier`, `attackedUnitHitpoints`, `unitHitpoints`, `retaliationDamage`,
`retaliationAttackModifier`, `didRetaliate`, `round`, `amountOfUnits`, `attackedAmountOfUnits`,
`killedUnits`, `lostUnits`, `targetNewBuffs{}`.

`InstantBattleCommand._onResponse` (L645009): sets `runningActivities.runningBattle`,
`battleResult.update(vo.state)` (`de.innogames.onyx.shared.battle.result.BattleResult`, L546849:
`winner = state.winnerBit == 1`, `playerUnits`/`enemyUnits` slot data, `getDeadUnitsNum(unitId) =
startAmountOfUnits - amountOfUnits`, `getHealingCost(unitId)`), stores
`encounter_result` in `EncounterModel.unlockEncounterResult` if won, then dispatches
`UnlockEncounterEvent::unlockEncounter` (won) and `SolveEncounterEvent::tournament_encounter` or
`::encounter` (→ battle result window; `SolveTournamentEncounterCommand` L542449 shows reward blimps
on close when won, or re-opens the tournament provinces overview when lost and `state.mustOpen`).

### 4.3 Manual battle (`BattleService`, wire `BattleService`, L361366) and retreat

`ManualBattleCommand` (L645131) → `startBattle` → response `BattleRealmVO` (L525318: `battleId`,
`map: BattleMapVO {width, height, tiles[][] {typeId, movementCosts}, mapObstacles[]}`, `battleType`,
`attackerPlayerId`, `defenderPlayerId`, `startTime`, `state: BattleRealmStateVO`) → sets
`runningActivities.runningBattle = ManualRunningBattle(battleId, battleType)` and switches module:
`ModuleChangeEvent::changeModule` with `ApplicationModuleName.BATTLE(battleType)` (enum L512504).
The battle module then:

| command | call | response handling |
|---|---|---|
| `ConfigureBattleStartupData` (L359963) | `BattleService.getBattle(battleId)` → `getBattle [battleId]` | `BattleModel.initialize(new BattleRealm(vo))` (L21769) |
| `SubmitFinishedTurnCommand` (L359634) | `submitStep(battleId, step, false)` → `submit [battleId, step, isAutoBattle]` (`step` = `BattleStepVO` built by the client for the active unit) | `UpdateBattleEvent::update_state (state, completedWave, totalWaves, reviveCosts)` → `UpdateBattleStateCommand` (L359679) |
| `StartAutoBattleCommand` (L359608) ("auto" from inside a manual fight) | `submitStep(battleId, currentTurn, true)` | same + `BattleEvent::showAutoBattleResults` |
| `SurrenderBattleCommand` (L359652) | `surrenderBattle(battleId)` → `surrender [battleId]` | `BattleStateEvent::gameOver` |
| `RetreatBattleCommand` (`de.innogames.onyx.city.commands`, L387302) | `BattleRetreatService.retreatBattle(battleId)` → `BattleService/retreat [battleId]` | response `.unitSquads: UnitSquadVO[]` → `armyModel.clearSquads()` + re-add; `runningActivities.cancelRunningBattle()`. Triggered from the city via `RunningActivityEvent::retreat_battle` when a battle is left unfinished |

`de.innogames.onyx.city.services.BattleRetreatService` (L458817) is a second class with
`get_serviceName() == "BattleService"` (only `retreat`); both it and `BattleService` are registered
under the same wire name, so each receives every `BattleService/*` response and only the one holding
the request callback reacts. Waves: `completedWave/totalWaves` exist on every result, but world map and
tournament encounters are single-wave (`maxEncounters: 1`, one `enemyWaves` entry); multi-wave
handling (`WaveBattleResultWindow`) belongs to the spire (`08-spire.md`).

Healing after a fight: revive with diamonds `ArmyService.reviveUnits(battleId, wave, unitId)` →
`ArmyService/reviveUnits [battleId, wave, unitId]` (from the result window's
`ReviveUnitsEvent::revive_unit`, L608541) or with an item
`InventoryService/useItemOn [itemId, {__class__:"BattleUnitTargetVO", battleId, wave, unitId}]`
(capture); the server answers with pushes `ArmyService/revivedUnit` (`RevivedUnitVO` L536362:
`unitId`, `aliveUnits`, `premiumCost`) and `ArmyService/addUnit`.

### 4.4 Army: `ArmyModel`, `ArmyService`, `addUnit`

`de.innogames.strategycity.main.model.ArmyModel` (L9290, main-context singleton, mapped in
`de.innogames.onyx.city.controller.bootstrap.ConfigureModelCommand` L390605 together with
`UnitsModel`, `IArmyDeploymentModel`, `IBattleDetailsModel`): `maxSquadSize`
(= `ArmyDetailsVO.battleClusterSize`), `get_squads()` (`Squad[]`, ordered by unit config `order`),
`getSquadUnits(unitType, squadSize)`, `hasAvailableUnits()`, `isUnitAvailable(unitType)`,
`get_unitConfigs()`. It is initialised from `ArmyDetailsVO` (L524899: `availableUnitTypeIds[]`,
`unitSquads: UnitSquadVO[]`, `maxHitpointsReference`, `maxBaseDamageReference`,
`maxUnitWeightReference`, `baseClusterSize`, `battleClusterSize`, `trainingClusterSize`,
`premiumTrainingCosts`) which the extension already stores from startup as
`cityQuery.armyDetails` (`src/model/armyDetails.ts`, identical fields).
`Squad` (L661400) wraps one `UnitSquadVO`: `get_unitType()`, `get_unitsNum()/set_unitsNum()`,
`get_data()`.

`de.innogames.strategycity.shared.service.ArmyService` (wire `ArmyService`, L666485):

| direction | name | payload | effect |
|---|---|---|---|
| request | `reviveUnits` | `[battleId, wave, unitId]` | premium revive |
| request | `buyMissingUnitsForPremium` (`buyUnits(unitType, col, row, cb)`) | `[unitType, columnIndex, rowIndex]` | tops the deployed squad up to full size for diamonds (`BuyUnitsEvent` from the deployment window, `BuyUnitsCommand` L546740); response `UnitPremiumCostVO` |
| push | `addUnit` | `UnitSquadVO {unitTypeId, size}` — **a signed delta**, e.g. `{hb_lr_4, -427}` after a fight, `{mc_lr_4, 100000}` after training/pickup | `AddUnitCommand` (L659583) → `armyModel.addUnitsSquad(new Squad)` → `SquadCollection.addAt` (L614799) adds to the existing squad and removes it at 0 |
| push | `healUnits` | `unitId` | `UnitsSquadEvent::unitHealed` → result window shows full stack |
| push | `revivedUnit` | `RevivedUnitVO` | updates result window |

`addUnit` events are relayed between module contexts on channel `"units"` (L523739). **Extension:**
`processTournyAddUnits.ts` intercepts `R:ArmyService/addUnit` and applies the delta to
`cityQuery.armyDetails.unitSquads` — matches the game's semantics; small gap: it only updates a squad
that already exists in the list, whereas the game creates a new one for a unit type seen for the first
time.

---

## 5. Tournaments

### 5.1 The two `TournamentService` classes (both wire name `TournamentService`)

| class | context | requests | pushes |
|---|---|---|---|
| `de.innogames.onyx.tournaments.services.TournamentService` (L638947) — mapped `ITournamentService` in `TournamentsModelConfiguration` (main context, L637983) | main | `getTournamentProgress()` → `getTournamentOverview []` (**no callback parameter**; result goes to its own `_onGetTournamentOverview` → `UpdatedTournamentsModelEvent` → `TournamentsModelUpdateEvent::update` → `UpdateTournamentsModelCommand` L637700 → `TournamentsModel`) | `updateTournamentPoints` (int total guild score → `UpdatedTournamentPointsEvent::update` → `TournamentsModel.set_totalScore`), `getTournamentReward` (`RewardVO[]` → reward window) |
| `de.innogames.onyx.tournaments.services.WorldMapTournamentService` (L51469) — `asSingleton` in `TournamentsModelConfig` (world-map context, L637966) | WorldMapModule | `getProvincesOverview(cb)` → `getProvincesOverview []` (**not** immediate: rides the next batch); `instantUpgrade(row, col, cost, cb)` → `instantUpgrade [col, row, cost]` (skip the round cooldown for `premiumCosts` diamonds); `getArchivePoints()` → `getPointsArchive []`; `unlockNextChestWithArchivePoints(points)` → `unlockChestByArchive [points]` (response = a `TournamentOverviewVO`) | `updateAllTournamentProvinces` (`TournamentProvinceVO[]` → `UpdateProvincesEvent::update` → `UpdateProvincesCommand`) |

`getTournamentOverview` → `TournamentOverviewVO` (L540142): `contributors:
TournamentContributorVO[] {player: BasePlayerVO {player_id, name, avatar, race}, score,
trophyGoblets}`, `nonParticipants: string[]`, `rewards: RewardVO[]`, `pointsArchiveSpent: {points}`.
`getProvincesOverview` → `ProvincesOverviewVO` (L535357): `maxEncounters` (1 in the capture),
`provinces: ProvinceProgressVO[]` (L535279: `number`, `q`, `r`, `level`, `encounters`
(done this round), `rewards: RewardVO[]`, `upgradeTime` (seconds; absent when READY),
`baseTournamentPointsAmount`). Wrapped by `ProvincesOverview`/`ProvinceProgress` (L638748/L638677;
`get_rowIndex()=q`, `get_columnIndex()=r`) into `TournamentOverviewModel` (L638196: `get_provinces()`,
`get_maxEncounters()`, `state {mustOpen, pageIndex}`; `onTick` decrements `upgradeTime` locally once
per second) and, for the table, `ProvinceProgressItem` via `ProvinceProgressItemFactory` (L38604:
`buttonState` = `MAX_LEVEL_REACHED` if `level == 6`, `UNDER_CONSTRUCTION` if the map province has
`remainingTime > 0` (or `upgradeTime != 0` when the province is not on the map yet), `IS_CURRENT`,
else `VISIT`; `premiumCost` read from the map's `TournamentProvince`).

**Extension:** `src/model/tourny/provincesOverview.ts` (`TournyProvince`: `number, q, r, level?,
encounters?, rewards?, baseTournamentPointsAmount?, upgradeTime?`) mirrors `ProvinceProgressVO`;
`processTournyProvincesOverview.ts` adds `upgradeTimeEnd` — same idea as the game's per-second tick.
`src/inject/local/tourny.ts` calls `getTournamentProgress(cb)` with a callback the game method does not
accept (ignored) — harmless, the response is read from the wire.

### 5.2 Tournament model, event type and "the good"

`de.innogames.onyx.tournaments.models.TournamentsModel` (L638251, main-context `ITournamentsModel`):
`get_current()` = `seasonalEventsModel.getActiveEvent("tournament")`, `get_tournaments()` =
`getEventsByType("tournament")`, `get_isRunning/hasEnded/hasLast/hasNext`,
`get_last/ended/next` (by `SeasonalEventState` `LAST`/`END`/`COMING`), `get_remainingTime()`,
`get_tournamentName()`, **`get_theme()` = `get_current().get_subType()`** — the good of the running
tournament (`"scrolls"`, `"magic_dust"`, …) is the seasonal event's **`subType`**, with `type ==
"tournament"` as the category (`SeasonalEventVO` L537104: `eventId`, `type`, `subType`, `name`,
`state`, `remainingTime`, `properties`). It is fed by `SeasonalEventsService` (wire
`SeasonalEventsService`, L545995) through the push `getEvents` and by startup `seasonal_events`. So
the older note in `TOURNY.md` ("the good is in `SeasonalEvent.type` from `TournamentService/getEvents`") is not what
the client does: the client reads `subType`, and the push it listens to is `SeasonalEventsService/getEvents`
(no `TournamentService/getEvents` handler exists in the snapshot). The extension already intercepts
`SeasonalEventsService/getEvents` (`processSeasonalEvents.ts`) and reads `subType` from startup
(`tournamentSchedule.ts`), which agrees with the game. Also on the model: `get_contributors()`,
`get_totalScore()`, `get_isParticipant()`, `get_rewards()`, `get_isActive()` (running and in a
guild), `get_isLockedUntilNextTime()` (feature flag `join_guild_after_tournament_start`).
`TournamentEncounterModel` (L36391, main): `get_playerSquadSize()`, `get_rewards()`,
`baseTournamentPointsAmount` — filled from the last `getProvinceInformation` of a tournament province.
Guild chest thresholds are `TournamentCheckpointsProvider` (L638144) / `ProgressCalculator` (L41551)
per theme (static rewards config; see the events/economy file).

Tournament end handling: `SeasonalEventsEvent::ended (seasonalEventId)` → `TournamentEndedCommand`
(L637581, alert + `SeasonalEventState.LOCK`), `TournamentEndedWorldMapCommand` (L637609: leaves the
province, converts every `TournamentProvince` back to a `GoodProvince` via `toProvince()`),
`TournamentEndedBattleCommand` (L637564: pauses a running tournament battle).

### 5.3 Province star/round model

Each tournament province goes through `level` 1..6 (the "stars"); one round = `maxEncounters`
encounters (1); after a round the province enters `UPGRADE` for `remainingTime` seconds (8640 s in the
capture at level 1 → 2, ~51 800 s at level 4) or can be `instantUpgrade`d for `premiumCosts` diamonds;
level 6 = `FINISHED`. Points: `encounterRewards.tournamentPoints` per encounter (20 at province 1
level 1) plus `provinceRewards` on completing the round (30 points, KP, relics, spells, rune shards);
`baseTournamentPointsAmount` is the unboosted value shown when `tournament_points_boost` is active.
`ProvinceProgressVO.number` orders provinces by distance and is what the UI calls "Province N".

### 5.4 Enemy generation

Nothing is client-side: the enemy squads (`enemyWaves[].army`), their `squadSize`, the player's
`playerSquadSize`, catering `costs`, and rewards all arrive in `TournamentProvinceEncountersVO`. The
client only derives the highest enemy level for the deployment window
(`ArmyDeploymentWindowMediator._calculateHighestEnemyUnitLevel`, L653451) and the strong/weak
highlighting from `BattleUnitTypeVO.strengths`. There is no `TournamentEncounterVO`; the tournament
variant is `TournamentProvinceEncountersVO` + `TournamentEncounter` wrapper.

### 5.5 What the game does around a tournament fight (order of wire traffic, from the capture + code)

1. HUD button / overview: `TournamentService/getTournamentOverview` and `TournamentService/getProvincesOverview` (one batch; `TournamentProvincesOverviewWindowMediator.initialize` L641415 dispatches `GetProvincesOverviewEvent::getData` on every open — this is the **only** place the overview is re-fetched).
2. Click a province row → `OpenProvinceFromTournamentOverviewCommand`/`_onOpenEncounter` (L649094): camera `navigateTo(row, col)`, `worldMapModel.currentProvince = province`, `TournamentOverviewEvent::reopenOverviewAfterEncounter(page)` (sets `state.mustOpen`), `ProvinceEncountersEvent::startEncounter` → `StartTournamentEncounterCommand` (L637529) → `WorldMapService/getProvinceInformation [r, q]` → builds **`encounters[0]` only**, selects it, opens the encounter window.
3. Fight → `BattlefieldService/instantBattle [r, q, encounterIndex, squads]`. Response batch (capture): pushes `CityResourcesService/getResources`, `TournamentService/updateTournamentPoints`, `CityProductionService/updateBoost`, `RelicService/getRelicsInformation`, `IndicatorsService/getIndicators`, `QuestService/getUpdates`, `ArmyService/addUnit` (loss delta), `TournamentService/updateAllTournamentProvinces` (the fought province now has `level+1`/`remainingTime`/`premiumCosts`), then the `instantBattle` result. Cater → `UnlockEncounterService/unlockEncounterByTrading [r, q, encounterIndex]` with the same pushes minus `addUnit`, plus `EffectsService/updateCounters`, then the `UnlockEncounterResultVO`.
4. Client side after the win: `UnlockEncounterEvent::unlockEncounter` → `UnlockEncounterCommand`; `SolveEncounterEvent::tournament_encounter` → result window → on close `EncounterRewardEvent::showRewardBlimps` → `ShowEncounterRewardBlimpsCommand` → `ShowProvinceRewardsWindowBehavior` (L656214): all encounters solved → `TournamentProvinceEvent::RESET_PROVINCE` (`ResetTournamentProvinceCommand` zeroes `numCompletedEncounters`) + `EncounterRewardSequenceEvent::showProvinceReward`; the reward window's close behaviour `OpenTournamentOverviewRewardWindowBehavior` (L656188) re-opens the provinces overview if `state.mustOpen` — which triggers step 1's `getProvincesOverview` again. The `updateAllTournamentProvinces` push is what actually updates the map (`UpdateProvincesCommand` → `WorldMapViewEvent::drawGrid`, `UpdateProvincesUpdatedEvent::updated`), and `updateTournamentTime` pushes keep `remainingTime`/`premiumCosts` current while a province cools down.

The extension's `tournyFight.ts`/`tournyCater.ts` mimic this by calling `getTournamentProgress()`
and `getProvincesOverview()` 200 ms and 400 ms after the action; the pushes in step 3 arrive in the
action's own response batch anyway (extension already intercepts `updateTournamentTime` and `addUnit`;
it does **not** intercept `TournamentService/updateAllTournamentProvinces` or
`updateTournamentPoints`, which would give the new level/cooldown/premium cost and the guild total
without the extra `getProvincesOverview` round-trip).

---

## 6. Recipes

All service classes are plain constructors in `$hxClasses` (`window.aviad[...]`); `new X()` works
because `AbstractConnectionService` (L13101) sets the JSON provider itself. Two caveats that follow
from `NetConnectionService`/`ServiceRegistry` (L12784, L139953; details in `04-networking-layer.md`):
a `new`-ed service is **not registered** (`postConstruct` never runs), so `withCallback` callbacks
on it **never fire** — the response is still sent and the game's registered instance of the same
wire name processes pushes normally; read the result through the extension's network interceptor,
or use the injected singleton (`injector.getInstance(de_innogames_onyx_worldmap_service_IWorldMapService)`
in the world-map context) if you want the callback. Also `dispatch()` on a `new`-ed service throws
(no `eventDispatcher`) — only relevant for methods that dispatch in their own callback
(`TournamentService.getTournamentProgress`), and the error is caught by `processResponse`.

**Read the running tournament (main context):**
`tm = aviad_am.injector.getInstance(de_innogames_onyx_tournaments_models_ITournamentsModel)`;
`tm.get_isRunning()`, `tm.get_theme()` (good), `tm.get_remainingTime()`, `tm.get_totalScore()`,
`tm.get_contributors()[i].get_score()/get_player()`, `tm.get_current().get_id()`.
`tem = …getInstance(de_innogames_onyx_tournaments_models_TournamentEncounterModel)` →
`get_playerSquadSize()` (after a tournament province was opened).

**Read own army (main context):** `am = …getInstance(de_innogames_strategycity_main_model_ArmyModel)`;
`am.get_squads().map(s => [s.get_unitType(), s.get_unitsNum()])`, `am.maxSquadSize`,
`am.getSquadUnits(unitType, squadSize)`. Same data on the wire: startup `army_details`
(`ArmyDetailsVO`), kept current by `ArmyService/addUnit` deltas (extension: `cityQuery.armyDetails`).

**Read current province state:** on the map, `worldMapModel.getProvinceAt(row, col)` (world-map
context) → for tournaments `get_league()`, `get_order()`, `get_state().get_name()`,
`get_remainingTime()`, `get_premiumCost()`, `get_numCompletedEncounters()/get_numTotalEncounters()`;
`worldMapModel.getProvinceByGroup("TOURNAMENTS")` for all of them; `worldMapModel.currentProvince`
for the open one. Off the map: `new WorldMapTournamentService().getProvincesOverview(cb)` and read
`TournamentService/getProvincesOverview` from the wire (extension: `tourny.ts getProvincesOverview`,
`processTournyProvincesOverview.ts`).

**Load a province's encounter (needed before fight/cater in the game's own flow, and to learn
`playerSquadSize`, enemy army and cater cost):**
`new WorldMapService().request("getProvinceInformation").withData([r, q]).immediate().call()` —
`[r, q]` = `[columnIndex, rowIndex]` — response `TournamentProvinceEncountersVO`
(extension: `tournyOpen.ts` → `processTournyProvinceInformation.ts`).

**Fight a tournament encounter:**
`new WorldMapBattleService().request("instantBattle").withData([r, q, encounters[0].number ?? 0,
squads]).immediate().call()` where `squads` is 1..5 `{__class__:"UnitSquadVO", unitTypeId, size}` with
`size = ceil(playerSquadSize / unitWeight)` (or fewer if you lack units; the server accepts partial
squads). Response `InstantBattleResultVO` — `state.winnerBit == 1` means won, `encounter_result`
lists rewards, `state.unitsOrder` gives per-squad `startAmountOfUnits`/`amountOfUnits`; losses come
back as `ArmyService/addUnit` deltas. Extension: `tournyFight.ts` (sends five identical squads).
For a manual fight use `request("start")` with the same payload, then the battle module drives
`BattleService/getBattle`, `/submit`, `/surrender`.

**Cater it:** `new UnlockEncounterService().unlockEncounter(q, r, encounters[0].number ?? 0, cb)`
(the method takes `(rowIndex, columnIndex, …)` = `(q, r, …)` and sends `[r, q, index]`); pay
diamonds instead with `premiumUnlockEncounter(...)` → `unlockEncounterByTradingUsingPremium`. Cost is
`encounters[0].costs.resources` (goods + `money`; `premium` > 0 means only the diamond route is open).
Response `UnlockEncounterResultVO`. Extension: `tournyCater.ts`.

**Skip a province's cooldown:** `new WorldMapTournamentService().instantUpgrade(q, r,
premiumCosts, cb)` (diamonds); the game confirms via `PayPremiumEventBuilder` first
(`TournamentProvincesOverviewWindowMediator._onInstantUpgrade`, L641415).

**Drive the game UI instead of the wire (world-map context event dispatcher):**
`TournamentProvinceEvent("TournamentProvinceEvent::OPEN_PROVINCE", rowIndex, columnIndex)` (L72378)
navigates + opens the encounter window; `ProvinceEncountersEvent("ProvinceEncountersEvent::startEncounter",
null)` after setting `worldMapModel.currentProvince`; `EncounterEvent("trade", encounter)`;
`StartBattleEvent("StartBattleEvent::instantBattle", BattleType.TOURNAMENT_BATTLE)` after deploying
squads via `IArmyDeploymentModel.deploySquad(unitType, size)`; `TournamentOverviewEvent("TournamentOverviewEvent::openTournamentProvinces", page)`
opens the provinces window; `ScoutingEvent("ScoutingEvent::startScouting", row, col)` scouts.

**Neighbours:** `new WorldMapService().startup()` (own area: cities, goods, tournament provinces
around you) and `.getDiscoveredPlayerProvinces()` (all discovered player cities with
`player_id`, `name`, `race`, `technology_section`, `guild_info`, `hasAncientWonder`, `cool_down`,
`help_back_count_down`); extension `fetchWorldNeighbors.ts` + `processWorldNeighbors.ts`.
`getProvinceAt`/`getNeighborProvinces` (§1.3) turn any `(q, r)` into its ring of six.

---

## 7. Extension ↔ game field alignment summary

| extension | game | status |
|---|---|---|
| `TournyFight {q, r, unit{__class__,unitTypeId,size}}`, `instantBattle [r,q,0,units]` | `WorldMapBattleService.instantBattle` → `[col,row,idx,UnitSquadVO[]]`, `q`=row, `r`=col | OK; `0` should be `encounters[0].number ?? 0`; squad `size` should use `ceil` not `floor` (§4.1) |
| `unlockEncounter(q, r, 0)` | `UnlockEncounterService.unlockEncounter(rowIndex, columnIndex, idx)` | OK |
| `getProvinceInformation [r, q]`, `TournyProvinceInformationRaw` | `[col,row]`, `TournamentProvinceEncountersVO` | OK; `Encounter.number` missing in the model |
| `TournyProvince` (`getProvincesOverview`) | `ProvinceProgressVO` | OK |
| `TournyTime {r,q,remainingTime,premiumCosts}` | `TournamentProvinceUpdateVO` | OK |
| `TournyAddUnits {unitTypeId,size}` (delta) | `ArmyService/addUnit` `UnitSquadVO` delta | OK; new unit types are dropped |
| `ArmyDetails` | `ArmyDetailsVO` | OK |
| `InitialWorldMapData`, `WorldNeighbor` | `WorldMapStartUpVO`, `PlayerProvinceVO` | OK (`difficulty` missing on `Province`) |
| `getTournamentProgress(cb)` | `TournamentService.getTournamentProgress()` (no cb) | callback ignored |
| tournament good = `SeasonalEvent.type` (`TOURNY.md` §7.2) | `TournamentsModel.get_theme()` = `subType`; push is `SeasonalEventsService/getEvents` | extension code (`tournamentSchedule.ts`, `processSeasonalEvents.ts`) already uses `subType`; the `TOURNY.md` wording is wrong |
| not intercepted | `TournamentService/updateAllTournamentProvinces`, `/updateTournamentPoints`, `/getTournamentOverview` | opportunity: province level/cooldown/premium cost and guild score without extra polling |

---

## Open questions / not verified

- Whether the server rejects `instantBattle`/`unlockEncounterByTrading` when the province was not
  "opened" first with `getProvinceInformation` (the extension's `tournyFight`/`tournyCater` do not
  call it; the game always does). The capture shows the game's order only.
- The exact `EncounterVO.number` values for **regular** (non-tournament) provinces with 8 encounters
  (0-based vs 1-based) — only tournament traffic was captured, where `number` is absent (= 0).
- What the server sends for `encounter_result` on a **lost** instant battle (`null` vs absent) — the
  client only reads it when `winnerBit == 1`.
- `UnlockEncounterResultVO.provincesNeeded` semantics (presumably provinces still needed for the next
  expansion) — not read anywhere except `get_provincesNeeded()`.
- The response type of `TournamentService/getPointsArchive` (archive model, `de.innogames.onyx.archive.*`)
  and the checkpoint/chest reward static config — out of scope here.
- Whether the trade button is ever disabled client-side for unaffordable costs (`set_tradeEnabled(true)`
  is unconditional in `EncounterWindowMediator.updateTradingCosts`; the resource cost view may only
  colour it) — i.e. whether the server error codes 6000/2000 are the only guard.
- Diamond `instantUpgrade` response payload (the game passes a callback but I found no consumer of
  its result).
- The March 2026 snapshot was not diffed for these classes.
