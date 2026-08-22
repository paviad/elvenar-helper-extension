# 13 — Key findings, cross-cutting facts and errata

Scope: the things that came out of reading the whole bundle (docs 01–12) that change how the
extension should talk to the game, plus corrections to what the extension's own code/docs assume.
Each item points at the doc with the evidence. Snapshot: `tmp/elvenar-release-full-reveng.js`
(Feb 12 2026) unless stated.

## 1. Things that change how we drive the game

| # | Finding | Evidence | Consequence for the extension |
|---|---|---|---|
| 1 | **Hand-constructed services send but never receive.** `new window.aviad['…Service']()` skips DI, so `postConstruct` → `ServiceRegistry.register(this)` never runs. `ServiceRegistry.process` (L139991) fans a response out only to *registered* instances, and `NetConnectionService.processResponse` (L12801) matches callbacks per instance. `Providers.JSON` is a static `HttpConnectionProvider`, which is why the *send* still works. | 04 §2, §9; 05 §0 | Every `withCallback(cb)` / `console.log('E … response')` in `src/inject/local/*.ts` is dead code; results only ever arrive via the XHR interceptor (`R:<class>/<method>` matchers). To get callbacks/pushes: `aviad_am.injector.getInstance(<mapped key>)` (05 has the key per service) or `ServiceRegistry.register(svc)` on a bare `AbstractConnectionService` with an overridden `get_serviceName` (04 §9a). |
| 2 | **Injector keys are the interfaces.** ~60 models/services are mapped as `map(IFoo).toSingleton(Foo)`; `getInstance(Foo)` throws, `getInstance(IFoo)` works. `ResourcesModel` is really `CachedResourcesModel`. | 12 §1–2; 03 §3 | Always look up the `I…` key listed in 05/12. |
| 3 | **Sub-module child injectors are invisible from `aviad_am.injector`.** WorldMap, Spire (commands only), TechTree and Battle run in child contexts; lookup walks *up* only. Only event types listed in `MainModuleCommunicationConfig` (L523730) cross the boundary. Reach module singletons via `ModuleLoaderService._module.get_context().get_injector()`. | 03 §1, §5; 12 §1 | World-map/tournament-overview models and spire *commands* need the module injector; spire *models* are main-context (`FeaturesConfiguration`). |
| 4 | **Wire coordinate order is `[r, q, …]`.** `Province.call(this, vo.q, vo.r)` → `AbstractProvince(rowIndex=q, columnIndex=r)`, and every coordinate-taking request sends `[columnIndex, rowIndex, …]`. `unlockEncounter(q, r, 0)` maps to the same wire order. Confirmed by capture: request `[-47,-43]` ↔ province `{q:-43, r:-47}`. | 07 §1, §9; 05 §4 | The extension's `withData([r, q])` / `[r, q, 0, units]` / `unlockEncounter(q, r, 0)` are all correct, if counter-intuitive. |
| 5 | **The ctor-capture patch only works in sloppy mode.** `patchCtorRegistryAssignment` renames `var X = function` → `var X2aviad=function` then assigns `X=function(){…}` with no `var`; that is a `ReferenceError` under `"use strict"`. The served **min** (Closure) bundle has no `"use strict"`; the **full** bundle does. | 06 §2.4 | On a `full` game URL the patch would have killed the game at `ApplicationModel`. **Fixed 2026-08-15**: the wrapper is now emitted as `var X=function…`. |
| 6 | **Commands are driven exactly as the framework does it.** `CommandExecutor.executeCommand` (L738605) = `injector.getOrCreateNewInstance(cmd)`, inject `event`, `execute()`. **But** the 36 `EzCommand` macro commands (L366110) inject `_event`, not `event`, and their event type is literally `"<command FQ name>/EVENT_TYPE"`. `dispatch()` on Command/Mediator/BaseActor is a no-op when nobody listens. | 03 §4, §5 | `cmd.event = …` silently fails on EzCommands — set `_event`. Dispatching an unmapped event does nothing. |
| 7 | **No mouse needed to collect a building.** Dispatch `IsoTileEvent.getEvent('IsoTileEvent::tileClicked', x, y, true)` on the `IsoEngine` (or `ProductionEvent::pickupProduction` on the context dispatcher). Build-mode placement needs `tileOver` before `tileClicked` (ghost position). A raw `CityMapService.placeBuilding` never shows client-side until reload (`CityEntitiesModel._resetEntity` ignores unknown ids). | 09 §3, §6, §8 | Explains the mass-placement note in `injectMutate.ts`. |
| 8 | **The bundle exposes almost nothing.** Only `window.startElvenar`, `window.Reflect.getProperty/setProperty`. Inbound page→game callbacks are installed **on the canvas container DOM element** (`element.notify/error/disconnect`); the socket transport is page JS called via `ExternalUtil.evaluate("socket.send")`. There is no WebSocket client in the Haxe code. | 01 §9; 04 §7 | Hence the source-rewrite approach; hence `customWebSocket.ts` intercepts the *page's* socket. |
| 9 | **A dormant automation API exists.** `AS3Communicator` (`clickObject`, `setObjectProperty`, …) and `city.commands.communicator.*` (`clickOnCityGridTile`, `getCityEntities`, `openSpire`, …), gated by feature flag `show_console`; plus a `sendConsoleCommandToClient` hook. | 01 §9; 09 §7 | A cleaner driving surface if the flag can be forced client-side (not verified). |
| 10 | **`$bind` memoises closures** via `__id__`/`hx__closures__`. | 01 §3 | Prototype patches don't affect listeners already registered — patch before construction (as `patchCtorRegistryAssignment` does) or re-register. |
| 11 | **Server pushes after a tournament fight/cater**: `TournamentService/updateAllTournamentProvinces` + `updateTournamentPoints` arrive in the same batch. Client-side the tournament good is `SeasonalEvent.subType` (`TournamentsModel.get_theme()`), fed by `SeasonalEventsService/getEvents`. | 07 §6, §9 | The extension re-polls `getProvincesOverview` instead of reading the pushes; `TOURNY.md`'s "`SeasonalEvent.type` from `TournamentService/getEvents`" is wrong (code already uses `subType`). |
| 12 | **Squad size** = `Math.ceil(playerSquadSize / unitWeight)` (`ArmyModel.getSquadUnits`). | 07 §4 | `counterComposition.ts` / `TournyPlanner.tsx` / `TOURNY.md` used `Math.floor` — off by one when not exact, and that size went on the wire. **Fixed 2026-08-15** (`Math.ceil`). |
| 13 | **Diplomacy details**: `turn` in the VO is the *next* turn (4 = finished); the client sends `turnNumber = 1` on a fresh window; `_onInvest` fills OPEN frames in id order and overwrites the last frame when full; only `resource.id` goes to the server but `_value` must be a BigInt; the point state changes only on the server's `updateMap` push. | 08 §4 | Matches `localProcessSpireDiplomacyGetData.ts`; `s.slot \|\| 0` is needed because JSON omits `slot: 0`. |
| 14 | **No server-time offset is kept**; every timer is a locally decremented remaining-seconds counter (`GameClock`). Amounts are native `bigint`; unlimited cap sentinel `9223372036854775807n`. | 12 §6–7 | Compute cooldowns from `remainingTime` at receipt time. |
| 15 | **Telemetry / detection surface**: `LogService` sends load time, bootstrap step names and a `PerformanceMetricsVO` every 300 s; no per-click telemetry. `SentryIoLogger` ships client exceptions with `setUser({id, username})` and `extra.requestData` = the last request payload. | 11 §14 | Worse: `Sentry.init` uses `CaptureConsole({levels:['error']})`, and the ctor-capture wrapper the extension splices into the (page-origin, inline) bundle did `console.error('aviad_am = …ApplicationModel', this)` on every construction — a Sentry event with the player id and the hook's own text (subject to the `sentry_sample_rate` flashvar). `denyUrls` (chrome-extension://) does not filter console messages (no frames). **Fixed 2026-08-15**: the wrapper logs with `console.trace` (same stack, not captured), the other `console.error`s under `src/inject/` became `console.warn` (with an Error object) or `console.trace` ("not found" paths). Rule: **no `console.error` in MAIN-world code**, and keep injected code out of game callbacks / wrap in try/catch. |
| 16 | **Chest odds are static data** (`xml.balancing.seasonal_events.<type>.<subType>_<md5>.json` → `WeightedRewardsModel.getChances(id)`), not a server call. | 11 §2 | Same URL family `nonSpecificMatchers.ts` already sniffs. |
| 17 | **Signature**: body = first 10 hex chars of `md5(h + "MAW#YB*y06wqz$kTOE" + json)` + json (`SaltGenerator.get_key`, L658010); `h` from `json_gateway_url`; headers `X-Requested-With: ElvenarHaxeClient`, `Os-Type: browser`. Batching: 500 ms debounce, `immediate()` flushes, one request in flight. | 04 §3–4 | Needed only if we ever send without the game's own builder. |
| 18 | While visiting, the other city sits in `IFriendCityEntitiesModel` / `IFriendDataModel`. | 12 §3; 10 §1 | `localVisitPlayer.ts`'s wire-response trap could be replaced by reading the model after `get_isLoading()` clears. |
| 19 | `investKnowledgePoints` is queued (non-immediate); confirmation only via `phaseUpdated` push; the KP deduction is done client-side by the mediator. | 10 §3 | Bypassing the mediator leaves the local KP count stale until refresh. |
| 20 | Several wire arg orders differ from the method signature (`sendMessage` → `[recipients, body, subject]`, `IndicatorsService.clearIndicator` → `[categoryId, indicatorId]`, `sendGuildMessage`, `updatePassword`); several wire names differ from methods (`unlockEncounterByTrading`, `BattlefieldService`, `NeighbourlyHelpService`, `ResearchService` for `TechnologyService`). Five wire names are shared by 2–3 classes (`SpireService`×3, `CraftService`, `BattleService`, `SpireDiplomacyService`, `TournamentService`). | 05 §1, §10 | Trust 05's tables, not the method names. |

## 2. Errata against the extension's own code and docs

| Where | Says | Actually | Doc |
|---|---|---|---|
| `src/inject/local/*.ts` (all `withCallback` / `console.log('E …')`) | callback logs the response | never fires (finding 1) | 04, 06 |
| `src/inject/local/neighbourlyHelp.ts` `performHelp(…, cb)` | 4-arg call | `NeighborlyHelpService.performAction(action, entityId, playerId)` takes no callback; 4th arg dropped | 10 §2 |
| `src/inject/local/tourny.ts` `getTournamentProgress(cb)` | takes callback | takes none in the game | 05, 07 |
| `src/inject/aviad.ts` `LoadType.LOAD_ONLY(baseName, type)` | param names | real order `(ancientWonderId, baseName)`; call sites are correct | 03 §4, 10 §3 |
| `src/inject/aviad.ts` `aviadVisit`, `aviadOpenAw`, `compVer` | declared | never assigned anywhere | 06 §5 |
| `src/inject/injectMutate.ts` `aviad2`, `aviad_ts` | captured | never used; `aviad2` is a `CityCameraController` (L398381) that is also injector-mapped | 06, 09 |
| `src/inject/local/localOpenAw.ts` | event type `'displayAncientWonder'`, `windowId 'window_0'` | game uses `AncientWondersDataEvent::displayAncientWonder`; `WindowId` is just `"window_" + counter` — harmless because the command is executed directly, but `'window_0'` can collide with a real window | 03 §7, 06 §4 |
| `src/inject/local/localHelpPlayer.ts` | `helpPlayer(playerId, cb)` | absent from Feb/Mar 2026 full snapshots; present in `tmp/elvenar-release-min-jul-2026.js` (game ≥ 1.239) with new `helpAllGuildMembers`, `getNeighbourlyHelpRewards`, `NeighbourlyHelpFavouritesService`; the version gate in `inject-main.ts` is right | 05, 06, 10 |
| `TOURNY.md` §7.2 | tournament good = `SeasonalEvent.type` via `TournamentService/getEvents` | `subType` via `SeasonalEventsService/getEvents`; no `TournamentService/getEvents` handler exists | 07 |
| `TOURNY.md` / `counterComposition.ts` / `TournyPlanner.tsx` | squad size `floor` | `ceil` (finding 12) — fixed 2026-08-15 | 07 |
| `src/inject/playerSpecificMatchers.ts` `R:GuildService/getGuild` | matched | no game caller found — dead key; cauldron processors disabled | 05 §2 |
| `injectMutate.ts` `setTimeout(onGameCodeLoaded, 500)` | looks like a race guard | it is the actual game starter — inline `<script>` never fires `load` | 06 §2 |
| 05 §3.2, 09 §3.1 | `CityMapService/reset` is the **full city entity list** | also the **delta** the game sends when a building changes: starting, collecting and cancelling a production each answer with a `reset` carrying that one `CityMapEntityVO`. Observed 2026-08-22 on `P_Humans_Workshop_1` — cancel → `state: {__class__: "IdleVO"}` and nothing else (**an `IdleVO` carries no `next_state_transition_in`**), start → `ProducingVO` with the countdown reset. **[ext]** `processCityMapServiceUpdate.ts` folds these in and stamps each entity with `stateAt` (arrival time), because `next_state_transition_in` counts from the report, not from `cityQuery.timestamp` | 05 §3.2, 09 §3.1 |

## 3. Cross-snapshot notes

- Bundle URLs are `elvenar-release-<min|full>-<sha1(content)[0:32]>.js` (verified on the Aug 2026 min
  build): a build is identified by `sha1sum <file> | cut -c1-32`; the hash is not predictable and the
  `full` hash is not derivable from the min one (06 §1.1).

- Feb 12 2026 (`…-reveng.js`, unminified) is the reference; Mar 14 2026 (`…-20260314.js`) confirms
  the same layout; Jul 2026 (`…-min-jul-2026.js`, minified) is the only local copy with the
  ≥ 1.239 neighbourly-help API. Anchor strings the extension patches differ between min and full
  (`var d={},` / `Ab=Ab||{},` / `vb=vb||{},` vs `var $hxClasses = {},` / `$hxEnums = $hxEnums || {},`).
- Rebuild `index/` for a new snapshot with `node rev-eng/tools/build-index.js <file>` and re-anchor
  line numbers by grepping the FQ names.

## Open questions / not verified

- Whether `show_console` (finding 9) can be forced client-side without a server flag.
- Exact response shapes of the ≥ 1.239 neighbourly-help methods (only seen minified).
- Whether the JSON provider hands the same `responseData` object to all services sharing a wire name
  (05 §10).
- Live confirmation that registering a bare `AbstractConnectionService` (finding 1) receives pushes
  without side effects on the game's own handlers.
