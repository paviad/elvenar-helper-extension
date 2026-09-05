# 06 — Extension hooks and recipes: how ElvenAssist taps into the compiled game

## Scope

This file is the authoritative description of **how the ElvenAssist extension gets code into the
game page, how it rewrites the game bundle at load time, what it observes at runtime (XHR,
WebSocket, keyboard) and every in-game action it performs**, each cross-checked against the
Feb 12 2026 full snapshot (`tmp/elvenar-release-full-reveng.js`; line refs `L…` point there)
and, where the full snapshot predates a feature, against the July 2026 min bundle
(`tmp/elvenar-release-min-jul-2026.js`).

Sources read whole: `src/inject/**` (all 38 files incl. `local/**`), `src/inject.ts` (the
content script that inserts the MAIN-world bundle), `manifest/manifest-chrome.jsonc`,
`webpack.config.js`, `src/overlay.ts` / `src/chrome/*.ts` / `src/overlay/OverlayMain.tsx`
(the content-script side of every `postMessage`), `readme.md`, `TOURNY.md`. Game classes drawn on:
`ApplicationModel`, `Pagination`, `TreasureService`, `TreasureViewModel`,
`SnakeInteractiveLayerMediator`, `SpireDiplomacyWindowMediator`, `SpireEncounter`,
`ConfigureIsoEngineCommand`, `CityCameraController`, `VisitOtherPlayerCommand`,
`DisplayAncientWonderCommand`, `OpenTreasureCommand`, the eight services the extension constructs,
`NetConnectionService`/`AbstractConnectionService`/`ServiceRegistry`, `org.swiftsuspenders.Injector`,
`AbstractFlashVars`.

Related files: `01-haxe-runtime-shape.md` (what `$hxClasses`/`$hxEnums` are),
`03-bootstrap-di-commands-events.md` (injector, commands, mediators, windows),
`04-networking-layer.md` (why a hand-made service can send but never receives its callback),
`05-services-catalog.md` (every RPC), `07-worldmap-tournaments-battle.md`, `08-spire.md`,
`09-city-engine-and-buildings.md`, `10-social-neighbours-aw-spells.md`.

---

## 0. Delivery pipeline: how the MAIN-world script gets there

| Step | Where | What |
|---|---|---|
| 1 | `manifest/manifest-chrome.jsonc` `content_scripts[1]` | `elvenassist-overlay-inject.bundle.js` (= `src/inject.ts`) runs at **`document_start`** on `https://*.elvenar.com/*` in the isolated world. |
| 2 | `src/inject.ts` | `injectScriptTag('elvenassist-inject.bundle.js')` then `injectScriptTag('elvenassist-vendors.bundle.js')`: creates `<script src=chrome.runtime.getURL(...)>` and inserts it **before the first `<script>` of the page** (fallback: append to `<head>`). Both files are listed under `web_accessible_resources` for `https://*.elvenar.com/*`. Order does not matter: webpack's runtime defers the entry until its split chunks (`vendors` = rxjs) are present. |
| 3 | `webpack.config.js` | Entry `'elvenassist-inject': './src/inject/inject-main.ts'`; `splitChunks.cacheGroups.vendor` puts `node_modules` into `elvenassist-vendors`, and shared own-code chunks are named `elvenassist-shared-<entries>`. `dist/prod.manifest.json` confirms `elvenassist-inject` needs exactly `[vendors, inject]` — the modules it shares with the overlay (`playerSpecificMatchers.ts`, `parseSocketMessage.ts`, model types) are below the split threshold, so no `elvenassist-shared-inject-…` chunk exists (if one ever appears, `src/inject.ts` must inject it too or the game bundle never runs). |
| 4 | `src/inject/inject-main.ts` (MAIN world) | Top-level, synchronous, before the game: `window.WebSocketUnchanged = window.WebSocket; window.WebSocket = CustomWebSocket;` `new GlobalHttpInterceptorService()`; then `injectMutate()` (immediately if `document.readyState !== 'loading'`, else on `DOMContentLoaded`); a `window.addEventListener('message')` switch for content-script commands (§4); `setupKeyHandlers()`. |
| 5 | Content script (isolated world) | `src/overlay.ts` `initFunc()` registers the listeners for everything the MAIN world posts (§3.6). The overlay UI talks back with `relayToGame(type, payload)` (`src/inject/relayToGame.ts`, bundled into the overlay too). |

There is **no `world: "MAIN"` manifest entry** — MAIN-world execution is achieved purely by the
`<script src>` insertion in step 2 (works identically in Chrome/Firefox/Safari manifests).

### 0.1 Hidden-tab keep-alive — `src/inject/frameKeepAlive.ts` (added 2026-08-27)

`keepFramesAliveWhileHidden()` is the first thing `inject-main.ts` does. It replaces
`window.requestAnimationFrame` / `cancelAnimationFrame` with a wrapper that, while
`document.visibilityState === 'hidden'`, delivers any callback the browser has not serviced in time from a
`setTimeout` instead — every 100 ms while the city is loading (`window.aviad_am` absent or `get_isLoading()`
true), every 250 ms once it is up; visible pages see a pure passthrough. Lime looks
`window.requestAnimationFrame` up on every frame, so the game loop — and with it `enterFrame`, `GameClock`,
Starling's `advanceTime`, innogui validation, tink re-runs — keeps running in a background tab or minimised
window, for good, not just during loading (03 §1.4a has the measurements).

Running is not drawing. Four hidden cities each drawing ten frames a second is what made Chrome lose their
WebGL contexts (the game then re-uploads every texture: flicker, missing images, sometimes a stall), so once
the city is loaded `starling.core.Starling.prototype.render` is wrapped (lazily, via `window.aviad`) to skip
the draw while hidden: it still runs `contextValid → makeCurrent → updateViewPort → dispatchEventWith("render")`
— innogui's `StageManager` (L4378) and Feathers' `ValidationQueue` (L682030) validate on that event, innogui
also on `enterFrame` — and returns before `mStage.render` / `present`. Loading keeps drawing; it is short.

GSAP is handled separately: the page's `merged-haxe-deps-sentry-*.js` runs *before* our MAIN-world script
(our own first console line is already attributed to Sentry's console wrapper), and GSAP 1.x/2.x copies
`requestAnimationFrame` into its `Ticker` at load, so the wrapper never reaches it. On `visibilitychange` the
module calls `TweenLite.ticker.useRAF(false)` + `fps(10)` (hidden) / `fps(<previous>)` + `useRAF(true)`
(visible), guarded on both methods existing, and retries from the fallback path if `TweenLite` only appears
later.

Sentry hygiene: the game's callback is handed to the browser — or, while hidden, to
`setTimeout(callback, 0, now)` — *as is*; a trailing sentinel request of our own in the same frame (or a
trailing 0 ms timer) is how the wrapper learns it ran. So no extension frame is ever on the stack when game
code runs, and a game exception shipped to Sentry (13 §15) carries nothing of ours. When the page becomes
visible, a callback still parked in the timer queue is moved back onto a real frame, so the game resumes on
the next paint even if intensive wake-up throttling (hidden > 5 min → chained timers once a minute; add
`IntensiveWakeUpThrottling` to `--disable-features` to be sure) had hold of the timer. One console line per
transition (`tab hidden - …` / `tab visible - …`). Unit-tested against a fake browser/game in
`frameKeepAlive.spec.ts`; `rev-eng/tools/focus-probe.js` measures the effect in the live page.

### 0.2 Client-side session timeout, removed — `src/inject/preventSessionTimeout.ts` (added 2026-08-27)

`ApplicationModel.set_stage` (L10667) registers `deactivate`/`activate` on the OpenFL stage — DOM
window blur/focus, via the chain in 03 §1.4a. `_onApplicationLostFocus` (L10733) does
`GameClock.schedule(this, 2400000)`; `_onApplicationReceiveFocus` (L10728) unschedules, and
`TimeObject.setTo` zeroes `accumulator` on every re-add, so it is **forty unbroken minutes with the
window never once focused**, not forty minutes cumulative. The trigger is focus, not visibility:
alt-tabbing to another application arms it as surely as switching tab does.

When it fires, `onTick` (L10712) — `FlashPlayerUtil.isDebug()` is a hardcoded `return false`
(L138594), so the guard is always live — raises an `ExceptionWindow` (L610649, extending
`BaseExceptionWindow` L610639, an `AlertWindow` whose ctor does `set_buttonIds(["ok"])`) titled
*"Session Timed Out"* / *"One moment. To ensure a smooth gaming experience, we need to reload
Elvenar"*, calls `GameClock.unschedule(this)` and sets `_reloadWindowShown = true`.
`ExceptionWindowMediator.onClicked` (L610669) dispatches `ReloadEvent("reload")` → `ReloadCommand`
(L549310) → `openfl.Lib.getURL(GameUrls.index, "_self")`, i.e. a full page navigation.

**None of this involves the server** — the socket stays up, the clock keeps ticking, the entity
model is intact. It is the client deciding on its own that a long-unattended page had better start
fresh. It also only became reachable **because of the keep-alive in §0.1**: `GameClock` counts on
`enterFrame` (L658898) and a hidden tab used to get no frames, so the accumulator never arrived.

The fix patches **`ApplicationModel.prototype.onTick`** to a body that only calls
`GameClock.unschedule(this)` — what the original does on its way out, minus the window. That is
surgical because `onTick` on this class serves the watchdog and nothing else: L10734 is the only
`GameClock.schedule` whose argument is the application model (the sole non-`this` schedule anywhere
is `GameClock._timestampState` at L658906), and every `this.onTick(0)` self-priming call in the
bundle is in some other class. The focus listeners, `ApplicationEvent::LOST_FOCUS`/`RECEIVE_FOCUS`
and their listeners (`AutoCollectSectorMode`, the module relays) are untouched.

Patched on the **prototype**, not the instance, and called straight after
`document.body.appendChild(newScript)` in `injectMutate` — the rewritten bundle is an inline script,
so `$hxClasses` is full the moment that returns, long before the model is constructed and before
anything can have blurred. `GameClock._proceedTick` reads `handler.onTick` at call time rather than
holding a `$bind` closure (finding 10), so a prototype patch would take even on an already-scheduled
object. `onTick`, `unschedule` and both `$hxClasses` keys survive minification (checked against the
live Aug-2026 min bundle). If the registry hook ever failed, the patch logs and returns `false`
rather than throwing — and `gameState.readGameState` still reads `_reloadWindowShown`, so the
detection in §4.16 remains the backstop. Unit-tested in `preventSessionTimeout.spec.ts`.

---

## 1. Load-time tampering — `src/inject/injectMutate.ts`

### 1.1 Intercepting the page loader (`loadGameCode`)

**Bundle URL naming** (verified 2026-08-15 on `elvenar-release-min-09bdb30f574f350c72416fa7d3b0a254.js`):
`https://oxen.innogamescdn.com/cache/elvenar-release-<min|full>-<hash>.js` where `<hash>` is the
**first 32 hex chars of the SHA-1 of the file content** (`sha1 = 09bdb30f…3b0a254 53f773f5`; MD5 does
not match). It is a pure content hash: it cannot be predicted, and the `full` variant's hash is the
SHA-1 of a different file, so it cannot be derived from the min URL. Nothing in the bundle names its
own script (`elvenar-release` does not occur in it; `window.elvenloader.manifest` only carries
asset/static-data hashes) — the only in-page source is the inline `loadGameCode()` body below.
Use the hash to identify a build (`sha1sum file | cut -c1-32`).

The game page contains an inline `<script>` with `function loadGameCode(){ … }` whose body holds
the bundle URL (`https://….innogamescdn.com/…/elvenar-release-(min|full)-<md5>.js`). Nothing of
that page script is in the snapshot; what follows is what `injectMutate.ts` relies on.

`injectMutate()`:

1. `document.querySelectorAll('script')` → find the one matching `/function\s+loadGameCode\s*\(/`.
2. Extract the body (`/function\s+loadGameCode\s*\([^)]*\)\s*\{([\s\S]*?)\}/` — non-greedy up to
   the **first** `}`; works because the real body has no nested braces), then
   `/https?:\/\/[^\s'"]*elvenar-release-(min|full)[^\s'"]*/i` for the URL. `min`/`full` is decided
   by the URL text; `window.gameVars.gameScriptUrl = url` (see §3.5 for `gameVars`).
3. Install **`window.loadGameCode = async () => { await fetchAndModify(url, version); postMessage({type:'gameVars', payload: window.gameVars}) }`**
   — replacing the page's function object *and* rewriting the inline script text so its body is
   `{console.log("ElvenAssist: loadGameCode called");}` (belt and braces; text replacement of an
   already-executed inline script has no effect by itself). The page later calls
   `loadGameCode()` and gets ours.
4. Also installs `window.wrapOne(v, name)` (§2).
5. Starts a `MutationObserver` on `document.body` (`childList, characterData, subtree`) that (a) blanks
   the body of any *later-added* inline `loadGameCode` script (min URL only, and it does **not**
   install the override — legacy path, effectively a no-op because parser-inserted scripts execute
   before the mutation record is delivered), and (b) `script.remove()`s any later-added
   `<script src=…elvenar-release-min-<32 hex>.js>` — a guard so a pristine bundle is not run next to
   the patched one if the page manages to add it directly.

### 1.2 `fetchAndModify(url, version)`

```
fetch(url) → text → hookRegistry×2 → _createCameraController capture → patchCtorRegistryAssignment×7
→ <script type=text/javascript> with textContent = patched text → document.body.appendChild
→ addEventListener('load', window.onGameCodeLoaded)   // inline scripts never fire 'load'
→ setTimeout(window.onGameCodeLoaded, 500)            // this is what actually starts the game
```

`window.onGameCodeLoaded` is a **page-defined** function (not in the snapshot; the original
`loadGameCode` presumably attached it as the `onload` of the CDN `<script>`); it ends up calling the
bundle's only export `startElvenar` (`AppMain.start`, see `01-haxe-runtime-shape.md` §9). Because
`appendChild` of an inline script executes it synchronously, the 500 ms is not a race guard for the
bundle — it is only there because the `load` listener will never fire for an inline script. Any
`fetch`/CORS failure is caught and logged (`'Failed to fetch script:'`) and the game then never
starts (the page's own loader was neutered).

### 1.3 `hookRegistry(minText, fullText, hookName)` — leaking `$hxClasses` and `$hxEnums`

Anchor strings and what they become (full build; the snapshot's line 7 is
`var $hxClasses = {},$estr = function() { … },$hxEnums = $hxEnums || {},$_;`):

| hookName | full anchor | min anchor | replacement (registryText from `/^(var )?([\w$]+)/`) |
|---|---|---|---|
| `aviad` | `var $hxClasses = {},` | `var d={},` | `var $hxClasses = {};window.aviad=$hxClasses;var ` |
| `aviad_enum` | `$hxEnums = $hxEnums || {},` | `Ab=Ab||{},` (fallback `vb=vb||{},`) | `$hxEnums = $hxEnums || {};window.aviad_enum=$hxEnums;var ` |

`indexOf` must find the anchor or it `throw`s (the `aviad_enum` call is wrapped in `try/catch`
to try the second min spelling). Verified against `tmp/elvenar-release-min.js` (Feb 2026):
`…var d={},W=function(){return v.__string_rec(this,"")},Ab=Ab||{},L,Ra=…` — and the July 2026 min
bundle still has `Ab=Ab||{},L,`. Result: **`window.aviad["fq.Name"]` is the live class ctor
(`$hxClasses`) and `window.aviad_enum["fq.Enum"]` the live enum object (`$hxEnums`)** — the very
objects the game uses, so `.prototype` patches from the console affect the game (the comment block
at the bottom of `injectMutate.ts` shows `aviad['de.innogames.onyx.city.modes.BuildBuildingSectorMode'].prototype.placeBuilding` being wrapped).

### 1.4 `_createCameraController` return capture → `window.aviad2`

Regex `/(_createCameraController\s*:\s*function\s*\(\)\s*\{)([\s\S]*?)(\}\s*,)/g`; inside the body
it finds the last `return`, extracts the returned expression and inserts `window.aviad2=<expr>;`
before it. The only such method in the bundle is
`de.innogames.onyx.city.controller.bootstrap.ConfigureIsoEngineCommand._createCameraController`
(class L390492, method L390539):

```js
_createCameraController: function() {
	var isoEngine = this.injector.getInstance(de_innogames_onyx_city_engine_snake_IsoEngine);
	var controller = this.injector.instantiateUnmapped(de_innogames_onyx_city_engine_camera_CityCameraController);
	controller.set_strategyFactory(new de_innogames_onyx_city_engine_camera_CityCameraDragStrategyFactory(isoEngine));
	controller.setStrategy("default");
	return controller;
}
```

So **`window.aviad2` is the `de.innogames.onyx.city.engine.camera.CityCameraController` (L398381)**
— an `Actor` with `enableDragging()/disableDragging()`, `setStrategy(type)`, `_navigator`
(`CityNavigator.moveToTile/moveTo/stop`), `_zoomer` (`CityZoomer.zoomTo`) and context listeners for
`CityTileCameraEvent::moveToTile`, `CityCameraZoomEvent::zoom`, `CityCameraEvent::moveTo`
(L398440-398452). Nothing in `src/` reads `aviad2` today (not even declared in `aviad.ts`); it is
also obtainable without the patch via
`aviad_am.injector.getInstance(aviad['de.innogames.onyx.city.engine.camera.ICityCameraController'])`
because L390522 maps it `toValue(...)`.

### 1.5 `patchCtorRegistryAssignment(scriptText, registryPath, windowField)` — capturing instances

Mechanics (all regexes built from the FQ name; `escapedRegistryPath !== registryPath` because of the
dots, so `registryRegex1` — the bracket form — is used):

1. `registryRegex1 = /([\$\w]+)\[['"]<fq>['"]\]\s*=\s*([\w$]+)\s*;/g` finds
   `$hxClasses["<fq>"] = <Ctor>;` (min: `d["<fq>"]=<ctor>;`) → captures registry (`$hxClasses` / `d`)
   and the ctor identifier. If not found, the text is returned untouched (silent no-op).
2. `ctorAssignmentRegex = /\s<Ctor>\s*=\s*function\(([^)]*)\)/g` — the ctor declaration
   `var <Ctor> = function(args) {` (min: `var dc=function(){`) is renamed to
   ` <Ctor>2aviad=function(args)` (the leading `var ` is kept, so it becomes `var <Ctor>2aviad=…`).
   The parameter list is remembered as `argumentList` (last match wins).
3. The registry line is replaced by
   ```js
   var <Ctor>=function(args){<Ctor>2aviad.call(this,args);console.trace('<field> = <fq>', this);
     window['<field>']=this;window['<field>_a']=window['<field>_a']||[];window['<field>_a'].push(this)};
   $hxClasses['<fq>']=<Ctor>;
   ```
   Because Haxe emits `X.__name__ = …`, `X.__super__ = …`, `X.prototype = …` **after** the
   registration line, the wrapper function is the one that receives the prototype and statics — so
   instances behave exactly like the original, `instanceof` still works, and DI/mediatorMap create the
   wrapper (they hold `X` by reference from later lines).

**Finding (fixed 2026-08-15): the wrapper used to be assigned without `var`.** After step 2 the identifier `<Ctor>` was no longer
declared anywhere; step 3 assigned to it as an implicit global. Reproduced with node on the real
`ApplicationModel` lines: in **sloppy mode it works (`aviad_am` set)**, in **strict mode it throws
`ReferenceError: de_innogames_onyx_city_model_ApplicationModel is not defined`**. The served
**min** bundle starts `(function(uoc,xc){function g(a,b){…` — Closure Compiler dropped the
`"use strict"` — so the patch works there. The **full** bundle starts
`(function ($hx_exports, $global) { "use strict";` (both `tmp/elvenar-release-full.js` and the
March 2026 file), so on a `full` URL the ctor patches would kill the game at the first patched
class (`ApplicationModel`, L10650, ~1 % into the file). This is presumably why `src/overlay.ts`
paints a 13 px red border when `gameVars.gameScriptUrl.includes('full')`. **Fixed**: step 3 now
emits `var <Ctor>=function…` (safe in both modes; `var` re-declaration is legal).

Also note the capture log fires on **every** construction and `<field>_a` grows unboundedly (see §6
gotchas). It used to be `console.error` — **changed to `console.trace` 2026-08-15** (same expandable stack, not captured), because the game's
`SentryIoLogger` initialises Sentry with `CaptureConsole({levels:['error']})` and `Sentry.setUser`
(L563870, L392033): every `console.error` on the page — including one emitted from the patched,
page-origin inline bundle — became a Sentry event carrying the player id and the hook's own text.
`denyUrls` (chrome-extension://) does not help: console-captured messages have no stack frames.
The same reasoning turned every other `console.error` under `src/inject/` into `console.warn`
(only the `error` level is captured). Never reintroduce `console.error` in MAIN-world code.

#### The seven patched classes — verified in the snapshot

| `window.*` | Class (ctor line / `$hxClasses` line) | Ctor params | Instances over a session | Fields/methods the extension reads — verified |
|---|---|---|---|---|
| `aviad_wm` | `de.innogames.onyx.spire.views.windows.diplomacy.SpireDiplomacyWindowMediator` (L625719 / L625724) | `()` | one per diplomacy window opened | `_onInvest(event)` (L626201) reads only `event.resource`: `this._currentFrame.set_investment(event.resource)`, recomputes `_canUseJoker`, moves `_currentFrame` to `_getNextEmptyFrameId()` or, when none is left, dispatches `SpireInitiateInvestmentEvent::finish_investment` and `view.showInvestButton(cost)`. Game-side it is the listener for `SpireInvestEvent::invest` (L625756), dispatched by `InvestmentPanelMediator._onMouseEvent` (L627271) with `button.resource`. |
| `aviad_se` | `de.innogames.onyx.spire.wrappers.SpireEncounter` (L630024 / L630049) | `(vo)` | one per encounter load (`LoadActiveSpireEncounterCommand.onResult` L616455 / `ShowSpireEncounterWindowCommand` L616771 → `spireModel.currentEncounter = new SpireEncounter(encounter)`) | `diplomacyCosts` = `ResourceBuilder.init().withVO(vo.diplomacy.costOptions).build()` → `de.innogames.collections.resources.ResourceCollection` (L137418); `get_resources()` (L137422) returns **clones** of `de.innogames.collections.resources.Resource` (L137582) `{id, _value: BigInt}` — exactly what `_onInvest` wants (the game itself passes `spireModel.currentEncounter.diplomacyCosts.get_resources()[i]`, L627210). Other fields: `waves`, `squadSize`, `unitCosts`, `pointId`, `basicCosts`, `slotsNumber`, `battle`, `diplomacy`. |
| `aviad_ts` | `de.innogames.onyx.networking.services.TreasureService` (L80840 / L80843) | `()` | singleton (`injector.map(TreasureService).asSingleton(true)`, L469415) | `getCurrencyEventTreasures()`, `openTreasure(type)` (both `callWithFuture()`), `refresh()`, `addSafePushResponse("spawnTreasure", cb)`; serviceName `"TreasureService"`. **Not read by any `src/` code today** (declared nowhere in `aviad.ts`). |
| `aviad_tv` | `de.innogames.onyx.city.treasure.model.TreasureViewModel` (L80866 / L80872) | `(injector)` | singleton (L469416) | `getTreasures(treasureType)` (L80886) filters `tink_state_State.get_value(this.internalState)` by `el.treasureType` and returns `de.innogames.onyx.city.treasure.data.Treasure` (L469427) `{x, y, treasureType, id = StringKey.generate([type,x,y])}`. Also `hasTreasure(type)`, `removeTreasure(id)`, `spawnTreasure(vos)` (push listener installed in the ctor: `TreasureService.addSafePushResponse("spawnTreasure", spawnTreasure)`, L80870, gated on `FeatureModel.whenParsingComplete()`). |
| `aviad_silm` | `de.innogames.onyx.city.engine.snake.components.layers.SnakeInteractiveLayerMediator` (L404271 / L404275) | `()` | one per city view mediation (`mediatorMap.map(SnakeInteractiveLayer).toMediator(...)`, L389926) | injected `isoEngine` (`de.innogames.onyx.city.engine.snake.IsoEngine`, L15944, an EventDispatcher) — the game's own click path is `_onDetectDecorationClick` (L404291) → `this.isoEngine.dispatchEvent(new IsoDecorationEvent("IsoDecorationEvent::click", decoration.get_id()))` (L404305). |
| `aviad_am` | `de.innogames.onyx.city.model.ApplicationModel` (L10635 / L10650) | `()` | singleton (`injector.map(ApplicationModel).asSingleton()`, L389951) | `get_isLoading()` (L10684) → `_loading` (initially `true`; set by `ApplicationMediator._onLoadingInitialized/_onLoadingFinished` (L4267/L4270) on `LoadingEvent::initialize` / `LoadingEvent::finished`, the latter dispatched by `ModuleSequenceCommand.dispatchCompleteEvent` L359851). Injected `injector` = the main context's `org.swiftsuspenders.Injector` (L737598) whose `getOrCreateNewInstance(type)` (L737740) = `satisfies(type) ? getInstance(type) : instantiateUnmapped(type)` — the latter constructs, applies injection points and fires `POST_INSTANTIATE`. Also `currentModule`, `gameLoaded`, `get_interactionMode()`, `get_season()`. |
| `aviad_pagination` (+ `aviad_pagination_a`) | `de.innogames.onyx.shared.ui.components.pagination.Pagination` (L75937 / L75946) | `()` | one per paginated view ever built (ranking bodies, etc.) | `_onSelectNextPage(event)` (L76197): `set_pageIndex(pageIndex+1)` (wraps if `wrapPages`) → `PaginationEvent/PAGE_INDEX_CHANGED` after a delay → `AbstractRankingBody._onPageIndexChanged`. `parent` is the openfl `DisplayObject.parent` (L1529) set by `AbstractRankingBody` (L521615) `this.addComponent(this._pagination)` (L521697), so `parent` is the `PlayerRankingBody` (L574829) instance for the player-ranking window. |

Verification of the *shape* the extension assumes: every one of these fields exists with the
signature above; none is a `get_`/`set_` property that would need a call instead of a field read,
except `get_isLoading()`/`get_resources()` which the extension already calls as methods.

### 1.6 Fragility (min vs full, version drift)

- **Anchor strings** are byte-exact: `var d={},` and `Ab=Ab||{},` are Closure-assigned names for
  `$hxClasses` / `$hxEnums`; they move whenever the game's variable count changes (`vb` was one
  earlier spelling). A miss throws inside `fetchAndModify` → caught → **game never starts**
  (`loadGameCode` was replaced). Anything new should be anchored on FQ strings (`"de.innogames…"`),
  which Haxe never minifies, as `patchCtorRegistryAssignment` does.
- **Short minified ctor names**: `ctorAssignmentRegex` for e.g. `dc` is `/\sdc\s*=\s*function\(/g`;
  a *local* `var dc=function(a){…}` elsewhere in the 33 MB min bundle would also be renamed and its
  args would win `argumentList`. Has not bitten so far, but is the first suspect if a capture breaks
  after a game release.
- **min vs full**: registry hooks differ (table above); ctor hooks used to work only in the sloppy-mode min
  build (§1.5) — fixed with `var` on 2026-08-15, still only exercised on min in practice. The MutationObserver guard only knows the `elvenar-release-min-<32 hex>.js` filename.
- **Game API drift**: the game's own version string is `gameVars.version` (page-level, parsed by
  `de.innogames.strategycity.main.utils.AbstractFlashVars.parse` L665578: `build_number`,
  `version`, `market`, `world_id`, `sid`, `platform`, `locale`, …). The extension gates on it with
  `compareVersion('1.239')` (§3.5) — e.g. `NeighborlyHelpService.helpPlayer` exists only from 1.239
  (present in the July 2026 min bundle, absent from both full snapshots). New game methods must be
  gated the same way. (The kphunt fork's own manifest version carries a `.5` suffix —
  unrelated to the game version, but both bumps happen at the same time and are easy to confuse.)

---

## 2. `shadowProxy.ts` — `window.wrapOne` and `window.aviadlog`

`shadowHandler(name)` is a `ProxyHandler` whose `construct` trap builds the real instance with
`Reflect.construct` and returns **a Proxy of the instance** whose `get` trap, when
`window.aviadlog` is truthy, wraps every function-valued property (except names starting with `__`
and a `dontLogFunctions` list of hot getters: `get_visible`, `get_transform`, `get_x`, `setPosition`,
`hasEventListener`, …) in a logger: `E [CALL]: <name> Method "<prop>" called with: [args]`.
Constructions log `E [CONSTRUCT]: <name> Creating <target.name>`.

`window.wrapOne = (v, nm) => new Proxy(v, shadowHandler(nm))` is installed by `injectMutate` for
console use, e.g. `aviad['a.b.C'] = wrapOne(aviad['a.b.C'], 'C')` **before** the game constructs any
`C` — but note that only replaces the registry entry, not the `a_b_C` variable the game references,
so in practice it is a console tool for classes you then instantiate yourself, or it must be applied
via a text patch. Toggle at runtime with `window.aviadlog = true/false`. Nothing in `src/` calls
`wrapOne`; `TargetClass` in the file is a leftover sample.

---

## 3. Runtime interception

### 3.1 `xhrInterceptor.ts` — `GlobalHttpInterceptorService`

Patches `XMLHttpRequest.prototype.open` and `.send` (the game's `HttpConnectionProvider`, L658028,
sends every RPC batch as `POST <world>.elvenar.com/game/json?h=<sid>` with an `ArrayBuffer` body,
see `04-networking-layer.md` §6.1):

| Hook | What it does |
|---|---|
| `open(method,url,…)` | stores `this._requestUrl`; initialises `this.sharedInfo: ExtensionSharedInfo = {reqUrl, reqReferrer, worldId, sessionId, tabId:-1, reqBody}` (all empty). |
| `send(body)` | `requestUrl = toAbsoluteUrl(_requestUrl)`; `nonSpecificMatchFound = nonSpecificMatchers.find(regex)`; `urlMatch = /^(https:\/\/(.*?)\.elvenar\.com\/)game\/json\?h=([\w\d]+)$/`. Neither → pass through untouched. Game RPC → `decodeRequestBody(body)` (ArrayBuffer/Uint8Array/string → text), fills `sharedInfo` (`reqReferrer` = origin, `worldId` = subdomain e.g. `en1`, `sessionId` = `h`, `reqBody`), sets module-level `latestSharedInfo`, parses `body.substring(10)` (the first 10 chars are the MD5 signature) as `ElvenarRequestResponseEntry[]` and `addRequest()`s each `{requestClass, requestMethod, requestData, requestId}` into `requestMap` (Map, capped at 200 pending — oldest evicted). Then wraps `onreadystatechange`: at `readyState 4` → `getDecodedText(xhr)` (text or ArrayBuffer response) → for RPC: `JSON.parse` → `addResponse()` per entry (matched by `requestId`); for non-specific: post `{type: <messageType>, specific:false, payload:{decodedResponse, sharedInfo}}`. Original handler is then called. |
| aggregation | `responseSubject.next(requestId)` per response; the observable `groupBy(requestId, {duration: debounceTime(300)})` + `last()` emits once the responses of one requestId stop for 300 ms. Then: run every `playerSpecificMatchers` entry with `responseSelector && local` against each response (`matcher.local([response])`), delete the entry, and post `{type:'aggregateRequestResponse', payload: {request, nonce, sharedInfo, response[]}}`. |

Piggy-backed push responses (e.g. `CityResourcesService/getResources` in the same HTTP reply)
appear as extra entries with the *same* `requestId`, so they land in the same aggregate; the
content script (`src/chrome/aggregateRequestResponse.ts`) then fans out `Q:<class>/<method>` (if a
`requestSelector` matches the request) and `R:<class>/<method>` per matching response to the
service worker.

### 3.2 Matcher tables

`src/inject/playerSpecificMatchers.ts` — `PlayerSpecificMatcherSpecification { requestSelector?, responseSelector?, local? }`.
Entries with `local` run **in the page** (they drive the game); the same table is consulted by the
content script for what to forward. Local handlers currently:

| Selector | Local handler | Purpose |
|---|---|---|
| response `OtherPlayerService/visitPlayer` | `localTrapVisitPlayer` | fires per-player trap hooks registered by `localVisitPlayer` (§4.9) |
| response `SpireDiplomacyService/getData` and `/submit` | `localProcessSpireDiplomacyGetData` | auto-invest spire diplomacy picks (§4.8) |
| response `RankingService/getRankingList` | `localProcessRankingsData` | for the ranked players, fire `AncientWonderService.getOtherPlayerAncientWonders(id)` (§4.12) |
| response `TreasureService/spawnTreasure` | `localCollectEventTreasure` | click event-currency treasures (§4.11) |
| (commented out) response `GuildService/getGuild` | `localProcessGuildData` | same as rankings for fellowship members — dead code |

Forward-only selectors (no `local`): `NotificationService/getAllNotifications|getPreviewNotifications`,
`StartupService/getData`, `InventoryService/getItems|updateItems`, `TradeService/getOtherPlayersTrades`,
`CauldronService/getIngredients|getPotionEffects`, `OtherPlayerService/visitPlayer` (request),
`CityResourcesService/getResources`, `SpireService/getEncounter`, `SpireDiplomacyService/submit` (request),
`SeasonalEventsService/getEvents`, `CityMapService/reset`, `TranscendenceService/allBuildingsStates`,
`EffectsService/update`, `QuestService/getUpdates`, `QuestMilestoneService/updateQuestMilestone`,
`MultiplayerEventService/updateWaypoints|updateOverview`, `ChestsService/updateChestPayInProgress`,
`MessageService/getMessageOverview|fetchMessages|markMessageAsRead|replyMessage`,
`AncientWonderService/getOtherPlayerAncientWonders|phaseUpdated`, `WorldMapService/fetchInitialWorldMapData|getDiscoveredPlayerProvinces|updateProvince|getProvinceInformation|updateTournamentTime`,
`OtherPlayerService/getNeighbourlyHelpBuildings`, `TournamentService/getProvincesOverview`,
`ArmyService/addUnit`, `ResearchService/startup`.

`src/inject/nonSpecificMatchers.ts` — CDN balancing JSON by URL regex
(`https://ox*.innogamescdn.com/frontend//static/[feature_flags/chNN/]<lang>_<CC>/xml.balancing.…_<md5>.json`):
`BUILDINGS_FEATURE`, `BUILDINGS_ALL`, `ITEMS`, `EFFECTS`, `TOMES` (RewardSelectionKit), `PREMIUM_BUILDING_HINTS`,
`GOODS_NAMES`, `EVOLVING_BUILDINGS`, `BATTLE_UNIT_TYPES`, `RESEARCH_TECHNOLOGIES(Humans|Elves)`. Types in
`nonSpecificMessages.ts`; the content-script allow-list is `src/overlay/setupNonSpecificRequestInterceptedListener.ts`.

### 3.3 `customWebSocket.ts` (+ `socketResponses.ts`, `spirePicksStore.ts`)

`class CustomWebSocket extends WebSocket` replaces `window.WebSocket` (original kept as
`window.WebSocketUnchanged`). It intercepts **once per frame** via a single
`super.addEventListener('message', …)` registered in the ctor (the `onmessage` setter is shimmed
with `Object.defineProperty` so the game's assignment is stored and invoked from a fixed
`super.onmessage`; `addEventListener` is deliberately *not* overridden — earlier versions did and got
one interception per listener, five per STOMP frame). `send()` stashes `globalSendHook = (msg) => super.send(msg)` (exported `getWebSocketSendHook()`, currently unused).

Per received string frame (`'\n'` heartbeats skipped): `parseSocketMessageRaw` (STOMP: command line,
headers until blank line, JSON body; `src/overlay/parseSocketMessage.ts`) → `logFrame` (only if any
response matches) → `withoutRepeatedResponses(body)` (`createRepeatFilter`: drops responses whose
`JSON.stringify` was seen within 5 s, capacity 32 — the server sends the same push, e.g. a wonder
contribution, up to five times) → `matchAgainstLocalHandlers(fresh)` (same `local` matchers as
HTTP, one entry at a time) → `forwardMatchedResponses(fresh)` posts
`{type:'socketResponse', payload:{responses, sharedInfo: latestSharedInfo}}` (dropped when no HTTP
request has identified the session yet) → finally the raw frame is posted as
`{type:'RECEIVED_WEBSOCKET_MESSAGE', payload:{value}}` (chat).

`spirePicksStore.ts`: `storePicksForLaterUse(picks)` (from the `spirePicks` message), consume-once
`takeStoredPicks()` (stale after 10 s), `waitForPicks(timeoutMs)` — resolves as soon as picks
arrive (newest waiter wins; superseded waiters resolve `[]`).

### 3.4 `setupKeyHandlers.ts` — Alt+C chords

Capturing-phase `keydown`/`keyup` listeners on `window`. `Alt+C` (no Ctrl/Meta, no repeat) is
swallowed (down and up), arms a 2 s window; the next non-modifier key is swallowed too and
`postMessage({type:'capturedAltC', payload:{sequence:'Alt+C -> <code>', code, altKey, type}})` is
sent. `OverlayMain.tsx` maps `code` to a tab shortcut (`KeyX` collapses the panel). Swallowing both
strokes keeps the game (Starling/OpenFL keyboard handling) from seeing the chord.

### 3.5 `relayToGame.ts`, `gameVars.ts`, `compareVersion.ts`

- `relayToGame(type, payload)` = `window.postMessage({type, payload}, '*')` — used by the overlay
  (content script) to command the MAIN world; the switch in `inject-main.ts` receives it (same-window
  messages cross the isolated/MAIN boundary).
- `GameVars = {market, version, build_number, gameScriptUrl}` — `window.gameVars` is the **page's**
  global (the object `AbstractFlashVars` L665498 reads: `var gvars = gameVars; this.parse(gvars)`);
  the extension only *adds* `gameScriptUrl` and posts the whole object as `{type:'gameVars'}` after
  the bundle is injected (`overlay.ts` needs it before creating the store).
- `compareVersion(vRight, vLeft = window.gameVars.version)` — numeric dotted compare, returns
  -1/0/1. Used: `compareVersion('1.239') >= 0` → new `helpPlayer` API, else legacy building-by-building
  help.

### 3.6 All `window.postMessage` message types

MAIN world → content script (all posted with `'*'`; listeners check `event.source === window`):

| `type` | Posted by | Payload | Consumed by |
|---|---|---|---|
| `gameVars` | `injectMutate.ts` (after `fetchAndModify`) | `GameVars` | `overlay.ts setupGameVarsListener` |
| `aggregateRequestResponse` | `xhrInterceptor.ts` | `{request, nonce, sharedInfo, response[]}` | `src/chrome/aggregateRequestResponse.ts` → SW `Q:`/`R:` messages |
| `BUILDINGS_FEATURE`, `BUILDINGS_ALL`, `ITEMS`, `EFFECTS`, `TOMES`, `PREMIUM_BUILDING_HINTS`, `GOODS_NAMES`, `EVOLVING_BUILDINGS`, `BATTLE_UNIT_TYPES`, `RESEARCH_TECHNOLOGIES` | `xhrInterceptor.ts` | `{specific:false, payload:{decodedResponse, sharedInfo}}` | `src/overlay/setupNonSpecificRequestInterceptedListener.ts` |
| `RECEIVED_WEBSOCKET_MESSAGE` | `customWebSocket.ts` | `{value: rawFrame}` | `OverlayMain.tsx` (chat) |
| `socketResponse` | `customWebSocket.ts` | `{responses[], sharedInfo}` | `src/chrome/socketResponse.ts` → SW `R:` messages |
| `capturedAltC` | `setupKeyHandlers.ts` | `{sequence, code, altKey, type}` | `OverlayMain.tsx` |

Content script → MAIN world (`relayToGame` unless noted; handled by the `switch` in `inject-main.ts`):

| `type` | Payload | Sender | Handler (§4) |
|---|---|---|---|
| `CAST_EE` | `number[]` entity ids | `EeView.tsx` | `castEeOncePerSecond` |
| `helpPlayer` | `playerId` | `NeighbourlyHelp.tsx` (game ≥ 1.239) | `localHelpPlayer` |
| `getNeighborlyHelpBuildings` | `playerId` | `NeighbourlyHelp.tsx` (< 1.239) | `getNeighborlyHelpBuildings` |
| `neighbourHelpBuildings` | `NeighbourHelpData` | `NeighbourlyHelp.tsx` (< 1.239) | `receivedNeighbourHelpBuildings` |
| `fetchWorldNeighbors` | — | `NeighbourlyHelp.tsx` | `fetchWorldNeighbors` |
| `tournyFight` | `TournyFight {q, r, unit}` | `TournyPlanner.tsx` | `tournyFight` |
| `tournyOpen` | `{q, r}` | `TournyPlanner.tsx` | `tournyOpen` |
| `tournyCater` | `{q, r}` | `TournyPlanner.tsx` | `tournyCater` |
| `spirePicks` | `string[]` resource ids | `overlay.ts` (raw `postMessage`, from the Spire Wizard tab via SW) | `storePicksForLaterUse` |
| `visitPlayer` | `{playerId, buildingId, baseName}` | `KpHuntOpportunityItem.tsx` | `localVisitPlayer` |
| `nextPage` | — | `OverlayMain.tsx` | `localNextPage` |
| `pickupProduction` | `number` city entity id | `productionWatcher.ts` (the Production tab) | `localPickupProduction` |
| `startProduction` | `{ids: number[], optionId}` entity ids + `EntityProduct.get_optionId()` | `productionWatcher.ts` (the Production tab) | `localStartProduction` |

---

## 4. Action recipes actually implemented (`src/inject/local/*.ts`)

Common pattern for services: `new window.aviad['<fq service>']()` — a bare `AbstractConnectionService`
whose ctor sets `defaultProvider = Providers.JSON` (L13103; `Providers.JSON` is the static
`HttpConnectionProvider` created at L786219, already configured with gateway URL and session), so
`request(m).withData([...]).withCallback(cb).immediate().call()` **sends** correctly. But
`postConstruct` (which does `ServiceRegistry.register(this)`, L13114) never runs on a hand-made
instance, and `ServiceRegistry.process(response)` (L139981) only calls `processResponse` on
registered instances → **the `withCallback` callbacks in every file below never fire**; they are
harmless `console.log`s. The extension always observes the *result* through the XHR interceptor
instead. Details and the `ServiceRegistry.register(svc)` workaround: `04-networking-layer.md` §4/§9.

### 4.1 `CAST_EE` → `castEeOncePerSecond(entityIds)` (`castEe.ts`, `castEeOncePerSecond.ts`)
- Service `de.innogames.onyx.shared.spells.services.SpellService` (L580454, serviceName `SpellService`).
- Per id: `castSpellOnBuilding('spell_neighborly_help_boost_1', entityId, cb)` → game L580462:
  `request("castSpellOnBuilding").withCallback(callback).withData([spellId,cityMapEntityId]).immediate().call()` — matches.
- Timing: 1000 ms between casts (plain `setTimeout`), sequential.

### 4.2 `helpPlayer` → `localHelpPlayer(playerId)` (game ≥ 1.239)
- Service `de.innogames.onyx.city.service.NeighborlyHelpService` (L458771, serviceName **`NeighbourlyHelpService`** — note the spelling differs from the class).
- `svc.helpPlayer(playerId, cb)`. **Not in the Feb/Mar 2026 full snapshots** (only `performAction`,
  `pickup`, `updateEntityCultureEffect`); verified in the July 2026 min bundle:
  `helpPlayer:function(a,b){this.request("helpPlayer").withData([a]).withCallback(b).immediate().call()}`
  alongside new `helpAllGuildMembers(cb)` and `getNeighbourlyHelpRewards(cb)`. The game calls it from
  a quick-help confirm dialog (`_onConfirm: this.service.helpPlayer(this.event.playerId, …)` then
  `QuickNeighborlyHelpPerformedEvent::playerHelped`).

### 4.3 `getNeighborlyHelpBuildings` / `neighbourHelpBuildings` (game < 1.239) (`neighbourlyHelp.ts`, `receivedNeighbourHelpBuildings.ts`)
- Step 1: `de.innogames.onyx.city.service.OtherPlayerService` (L14500).`getNeighbourlyHelpBuildings(playerId, cb)`
  → L14511 `request("getNeighbourlyHelpBuildings").withData([playerId]).withCallback(callback).immediate().call()` — matches.
  The response is intercepted (`responseSelector OtherPlayerService/getNeighbourlyHelpBuildings`),
  processed by the SW into `NeighbourHelpData`, and the overlay relays it back as `neighbourHelpBuildings`.
- Step 2: `receivedNeighbourHelpBuildings(data)`: picks builders' hut (`entityId===2` → `'limited_help'`),
  else a culture building (`entityId∉{1,2}` → `'time_limited_help'`), else main hall (`entityId===1` →
  `'unlimited_help'`), and calls `NeighborlyHelpService.performAction(action, entityId, playerId, cb)`.
  Game L458779: `performAction(action,entityId,playerId)` → `request("performHelp").withData([action,entityId,playerId]).immediate().call()` —
  **3 params; the 4th (callback) is ignored** — payload order matches.

### 4.4 `fetchWorldNeighbors` (`fetchWorldNeighbors.ts`)
- `de.innogames.onyx.worldmap.service.WorldMapService` (L647651): `startup(cb)` → L647667
  `request("fetchInitialWorldMapData").immediate().withCallback(callback).call()`; 200 ms later
  `getDiscoveredPlayerProvinces(cb)` → L647698 `request("getDiscoveredPlayerProvinces").withCallback(callback).immediate().call()`.
  Both responses are matched (`WorldMapService/fetchInitialWorldMapData`, `/getDiscoveredPlayerProvinces`) and
  give the neighbourhood list.

### 4.5 `tournyFight` → `tournyFight(fightData)` (`tourny.ts`, `tournyFight.ts`)
- `de.innogames.onyx.worldmap.service.WorldMapBattleService` (L647619, serviceName **`BattlefieldService`**):
  `request('instantBattle').withData([r, q, 0, [unit×5]]).withCallback(cb).immediate().call()` where
  `unit = {__class__:'UnitSquadVO', unitTypeId, size}` (game VO `de.innogames.onyx.networking.vos.UnitSquadVO` L540897 has exactly `unitTypeId`, `size`).
- **Order verified**: game L647636 `instantBattle(rowIndex,columnIndex,encounterIndex,playerUnits,cb)` sends
  `withData([columnIndex,rowIndex,encounterIndex,_getUnitsVO(playerUnits)])`, and provinces are built
  `Province.call(this, vo.q, vo.r)` → `AbstractProvince(rowIndex=q, columnIndex=r)` (L646974/L646642).
  So the wire order is `[r, q, encounterIndex, units]` — the extension's `[r, q, 0, units]` is right;
  `_getUnitsVO` (L647622) just maps squads to their `get_data()` VO, which is what the extension inlines.
- Then, 200 ms apart: `de.innogames.onyx.tournaments.services.TournamentService` (L638947).`getTournamentProgress()`
  (L638955: **no callback parameter**; sends `getTournamentOverview`, own callback dispatches
  `UpdatedTournamentsModelEvent` — never fires on the bare instance) and
  `de.innogames.onyx.tournaments.services.WorldMapTournamentService` (L51469, serviceName also
  `TournamentService`).`getProvincesOverview(cb)` (L51479 `request("getProvincesOverview").withCallback(callback).call()`).
  The intercepted `TournamentService/getProvincesOverview` response refreshes the store (`TOURNY.md` §3).

### 4.6 `tournyOpen` → `getProvinceInformation` (`tournyOpen.ts`)
- `WorldMapService.request('getProvinceInformation').withData([r, q])…` — game L647692
  `getProvinceInformation(province, cb)` sends `[province.get_columnIndex(), province.get_rowIndex()]` = `[r, q]` — matches.
  Response `WorldMapService/getProvinceInformation` (no coordinates in the body — the SW reads them from `requestData`).

### 4.7 `tournyCater` → `unlockEncounter` (`tournyCater.ts`)
- `de.innogames.onyx.worldmap.service.UnlockEncounterService` (L647600, serviceName `UnlockEncounterService`).`unlockEncounter(q, r, 0, cb)`
  → game L647608 `unlockEncounter(rowIndex,columnIndex,encounterIndex,callback)` sends
  `request("unlockEncounterByTrading").withData([columnIndex,rowIndex,encounterIndex])` — with rowIndex=q,
  columnIndex=r that is `[r, q, 0]` on the wire, consistent with 4.5/4.6 (the RPC name is
  `unlockEncounterByTrading`, not `unlockEncounter`). Followed by the same two refresh calls as 4.5.

### 4.8 `spirePicks` + `localProcessSpireDiplomacyGetData` (`spirePicksStore.ts`, `localProcessSpireDiplomacyGetData.ts`)
- Trigger: intercepted response `SpireDiplomacyService/getData` **or** `/submit` (local matcher). If the
  `submit` response has `turn === 4` or `state === 'won'` → clear picks, return.
- Wait 500 ms, then `waitForPicks(30000)` for the `spirePicks` message (Spire Wizard tab is throttled).
- Needs `window.aviad_wm` (§1.5) and `window.aviad_se`; `resources = aviad_se.diplomacyCosts.get_resources()`;
  for each pick id: `resource = resources.find(r => r.id === pick)`; `aviad_wm._onInvest({ resource })`;
  200 ms between picks. This mimics `InvestmentPanelMediator._onMouseEvent` (L627271) dispatching
  `SpireInvestEvent::invest` with `button.resource` — the mediator's handler only reads `event.resource`
  (L626202), so the plain object suffices. Filling the last empty frame makes the game show the
  Invest button (L626251) — the extension does **not** press it (`_onSendInvestment` is view-driven,
  L626278).
- Gotcha: `aviad_wm` is the *last constructed* mediator; a diplomacy window closed and re-opened creates a
  new one, so it is always current. `aviad_se` is the latest encounter wrapper.

### 4.9 `visitPlayer` → `localVisitPlayer` (+ trap hook) (`localVisitPlayer.ts`, `localTrapVisitPlayer.ts`)
1. `cmd = aviad_am.injector.getOrCreateNewInstance(aviad['de.innogames.onyx.city.commands.VisitOtherPlayerCommand'])`
   (class L387820; unmapped → `instantiateUnmapped` injects `service`, `userModel`, `eventMap`, `eventDispatcher`, …).
2. `cmd.event = new aviad['de.innogames.strategycity.main.controller.event.OtherPlayerEvent']('OtherPlayerEvent::visitPlayer', playerId)`
   (L14528: `(eventType, playerId)`), which is the event the game maps to that command
   (`commandMap.map("OtherPlayerEvent::visitPlayer").toCommand(VisitOtherPlayerCommand)`, L390447).
3. `registerTrapHook(playerId, fn)` then `cmd.execute()` → L387830: `detain()`, `LoadingEvent::initialize`,
   `this.service.visitPlayer(playerId, _onVisitedCityLoaded)` — through the **game's** registered
   `OtherPlayerService`, so the callback fires, models are updated and `ModuleChangeEvent::changeModule OTHER_CITY` is dispatched.
4. The interceptor sees `OtherPlayerService/visitPlayer` → `localTrapVisitPlayer` reads
   `responseData.other_player.player_id`, runs matching hooks and removes them.
5. The hook polls `aviad_am.get_isLoading()` every 500 ms until `false` (`LoadingEvent::finished`,
   L4270 / L359851) and then calls `localOpenAw(...)` (4.10).

### 4.10 `localOpenAw(playerId, buildingId, baseName)` (`localOpenAw.ts`)
- `cmd = aviad_am.injector.getOrCreateNewInstance(aviad['de.innogames.onyx.city.ancientwonders.commands.DisplayAncientWonderCommand'])` (L373000).
- `loadType = aviad_enum['de.innogames.onyx.shared.events.LoadType'].LOAD_ONLY(buildingId, baseName)` —
  enum L550557: `LOAD_ONLY(ancientWonderId, baseName)` returns `{_hx_index:2, ancientWonderId, baseName}`
  (`aviad.ts` names the params `(baseName, type)` — misleading; the call site passes them in the right order).
- `evt = new aviad['de.innogames.onyx.shared.events.AncientWondersDataEvent']('displayAncientWonder', playerId, loadType, 'window_0')`
  (L40922: `(eventType, playerId, loadType, windowId)`). The game's own type string is
  `"AncientWondersDataEvent::displayAncientWonder"` (L372595, mapped at L373440); the mismatch is
  harmless because the command is executed directly, not dispatched. `windowId` is normally
  `WindowId._hx_new()` = `"window_" + counter` (L615336); the fixed `'window_0'` may collide with the
  first game window's id.
- `cmd.event = evt; cmd.execute()` → L373011: `LoaderViewEvent::SHOW_LOADER`, then for `_hx_index 2`
  `service.getPhase(playerId, baseName)` (`AncientWonderService` L21130: `request("getOtherPlayerAncientWonders").withData([playerId,entityId]).parseLastResponse().callWithFuture()`) → `onLoadOnly` → `createWindow(ancientWonderId)` → `WindowEvent::addWindow` with `factory.createFriendBuildingWindow(entityConfigId, windowId)`.
  So `buildingId` must be the **entity config id** of the wonder (`opportunity.buildingFullId` in `KpHuntOpportunityItem.tsx`) and `baseName` its base name.

### 4.11 `TreasureService/spawnTreasure` → `localCollectEventTreasure` (`localCollectEventTreasure.ts`)
- Trigger: intercepted push response `TreasureService/spawnTreasure` (the game's own listener is
  `TreasureViewModel.spawnTreasure`, L80870/L80920, which creates `Treasure` entries after
  `FeatureModel.whenParsingComplete()`).
- Wait 2000 ms; `aviad_tv.getTreasures('currency_event')` (type string confirmed at L469031/L643436);
  queue each `treasure.id` on an rxjs `Subject` with `concatMap` + `timer` (first 10 s, then 1 s apart).
- `processOneReward(id)`: re-check the treasure still exists, then
  `aviad_silm.isoEngine.dispatchEvent(new aviad['de.innogames.onyx.city.engine.events.IsoDecorationEvent']('IsoDecorationEvent::click', id))`
  (`IsoDecorationEvent(eventType, decorationId)` L48347) — the same event the game dispatches on a real
  click (L404305). Path in the game: `AbstractInteractionModeController` (L454960) listens on the
  iso engine (L454981) → `_onDecorationClick` re-dispatches on the context if active (L455035) →
  `commandMap "IsoDecorationEvent::click" → OpenTreasureCommand` guarded by `CanGetReward`
  (L469403; guard: decoration exists in the INTERACTIVE layer, is a `TreasureDecoration`, type ≠ `video_ad`, L469282-469302) →
  `OpenTreasureCommand.execute` (L469129): `treasureViewModel.removeTreasure(id)`, `engine.removeDecoration`, `service.openTreasure(type)`, `TreasureRewardsEvent::showRewards`.
  The decoration id equals `Treasure.id` because `TreasureDecoration` is built from the `Treasure` (L643423).

### 4.12 `RankingService/getRankingList` → `localProcessRankingsData` (`localProcessRankingsData.ts`)
- Extracts `player_id`s of `PlayerRankingVO` rows (drops the 9th entry — the "you" row appended by the
  server), then for each `new aviad['de.innogames.onyx.city.ancientwonders.services.AncientWonderService']().getOtherPlayerAncientWonders(id, cb)`
  → L21153 `request("getOtherPlayerAncientWonders").withCallback(callback).withData([playerId]).parseLastResponse().call()`.
  The intercepted responses (`AncientWonderService/getOtherPlayerAncientWonders`) feed the KP-hunt data.
  Note: `parseLastResponse()` bookkeeping only lives on the dead bare instance — every response still
  reaches the interceptor.

### 4.13 `nextPage` → `localNextPage()` (`localNextPage.ts`)
- Filters `window.aviad_pagination_a` to instances whose
  `Object.getPrototypeOf(r.parent).__class__.__name__ === 'de.innogames.onyx.shared.ranking.views.tabs.tabbodies.PlayerRankingBody'`,
  **replaces** `window.aviad_pagination_a` with that filtered array (pruning), takes the last one and
  calls `_onSelectNextPage()` (L76197; the `event` param is unused). Combined with 4.12 this walks the
  player ranking page by page and harvests every player's wonders.

### 4.14 `pickupProduction` → `localPickupProduction(id)` (`localPickupProduction.ts`)
- Collects one building's finished production without the mouse (09 §4.3 entry point (b)):
  `inj.getInstance(aviad['…ICityEntitiesModel']).getEntityById(id)`, bail with `console.trace` if
  unknown and silently if `!entity.canCollect()` (the command would otherwise open the building
  window), then `inj.getInstance(aviad['openfl.events.IEventDispatcher']).dispatchEvent(new
  ProductionEvent('ProductionEvent::pickupProduction', entity))` → `PickupProductionCommand` (L387168)
  → picker → `CityProductionService.pickupProduction(id)`, batched 1 s into one
  `pickupProduction [[ids]]` request. Calling it for many ids in a loop therefore yields one request.
- First use of the injector's `getInstance` with interface keys from `src/inject`; the typings in
  `aviad.ts` model those keys as `AviadInjectorKey<T>` (the interface entries of `window.aviad` are
  not constructors).

### 4.15 `startProduction` → `localStartProduction({ids, optionId})` (`localStartProduction.ts`)
- Starts one production option on one or many buildings with a single
  `StartProductionEvent('StartProductionEvent::startProduction', buildings[], optionId, 1)` →
  `StartProductionsCommand` (L387614) → wire `startProductions [[ids], optionId, 1]` (not immediate;
  one request for all). The command checks nothing, so the guards the production windows apply are
  replicated **per building**: entity exists (else `console.trace`), `get_state().get_stateId() ===
  'idle'` (skipped otherwise - the producing window would ask "replace?"; this is also what
  `StartAllProductionsCommand` L387511 filters on), `!isEntityEffectExpired(entity)` (skipped
  otherwise - see the bullet below), `get_production().getProductById(optionId)` exists
  and `!get_isLocked()` (skipped otherwise). Affordability mirrors the window's "start all"
  (`SelectProductionOptionsBodyMediator.startProduction` L500303, which truncates the entity list to
  the affordable multiplier): a running `ResourceCollection` (`new aviad['de.innogames.collections.resources.ResourceCollection']()`,
  `clone()`, `add(product.get_requiredInput())` - each building's own cost, levels may differ) is checked
  with `ResourcesModel.hasEnoughResourcesFor` (key `aviad['de.innogames.onyx.resources.models.ResourcesModel']`,
  mapped to `CachedResourcesModel` in `ResourceModelConfig` L543222) and the list is cut at the first
  building that is not affordable, in the order given. `optionId` is `EntityProduct.get_optionId()` =
  VO `production_option`, 1-based, from `entity.get_entityConfig().get_production().get_products()` (R3);
  every building in `ids` must offer that option (the command would throw on a missing product).
- A **timed building whose effect has run out is idle**, so the `stateId` check passes on its own:
  it stays on the map waiting to be sold. The game never offers it the Produce tab
  (`ManufactureTabsCreator.canCreate` L500020 = `hasProductionPolicy(MANUAL) &&
  !effectsModel.isEntityEffectExpired(entity)`), closes an open building window the moment it
  expires (`_onUpdated` L508343) and leaves it out of "collect all" (`AutoCollectionTabCreator`
  L504724). `EffectsModel.isEntityEffectExpired` (L9105) is false unless
  `entityConfig.get_type() == "expiring"`, then true if the base name has no effect config, the
  effect on the entity is gone, or `!vo.permanent && getRemainingTime() <= 0`. Key
  `aviad['de.innogames.onyx.shared.effects.model.ISelectiveEffectsModel']` -> `PlayerEffectsModel`
  in the city context (L387117, L390716; `FriendEffectsModel` L387023 when visiting).
- Caller-side consequence of the affordability **cut** (it stops, it does not skip): one request may
  only ever carry buildings that are meant to stand or fall together. `productionWatcher.ts` batches
  by automation entry (`batchStarts`), **not** by `optionId` - option 1 is the first and shortest
  production of nearly everything, so two unrelated automations routinely share the number, and
  merging them would have an unaffordable workshop at the front of the list stop the marble behind
  it, poll after poll, with both reported as started.

### 4.16 The natural-state gate (`src/inject/gameState.ts`)

Every relayed message passes through `relayRefusal(type, readGameState())` in `inject-main.ts`
before the switch. Two things about the game can stop one, and both are read straight off
`ApplicationModel` (= `window.aviad_am`, so no new capture was needed).

- **Which module is on screen.** `ApplicationModel.currentModule` (ctor L10644) is a
  `tink.state.internal.AutoObservable` computed from `ModuleStateMachine._currentModule` (machine
  L455663, a `tink_state.State` seeded `UNKNOWN`). Read it with **`currentModule.getValue()`** —
  `tink_state_Observable.get_value(o)` (L380450) subscribes whatever `AutoObservable.cur`
  computation happens to be in flight to it. `ChangeModuleCommand.execute` (L390092) is the **only**
  caller of `setCurrentModule` (L390098), so this is the game's single answer to "where am I".
  `ApplicationModuleName` (enum L512504): `OTHER_CITY=0, OWN_CITY=1, TECH_TREE=2, WORLD_MAP=3,
  BATTLE(type)=4, MULTIPLAYER=5, SPIRE=6, UNKNOWN=7` (`getId` L512524 → `OtherCity`/`OwnCity`/
  `TechTree`/`WorldMap`/`Battle`/`Multiplayer`/`Spire`/`Main`). **`BATTLE` is the one parameterised
  constructor, so its *values* carry no `_hx_name`** — only `_hx_index` — which is why
  `moduleName()` falls back to an index table. `UNKNOWN` is the value until `postConstruct` (L10708)
  changes state to `OWN_CITY`, so "not `OWN_CITY`" covers "not booted" for free.
  `get_isLoading()` (L10684) is the third gate: `LoadingEvent::initialize` sets it (L4267) and
  `::finished` clears it (L4270), and `VisitOtherPlayerCommand.execute` dispatches the former — so
  it is genuinely "mid-transition", not only "still booting".
- **Why `OTHER_CITY` matters and is not cosmetic.** `VisitOtherPlayerCommand._onVisitedCityLoaded`
  (L387839) calls `cityEntitiesModel.initializePlayerMapConfiguration(playerCityVO.city_map)` — the
  one shared `ICityEntitiesModel` is refilled with the *visited* city, and that is the model
  `localPickupProduction` and `localStartProduction` resolve their ids in. Entity ids are unique
  within a city, not across them, so a production poll landing mid-visit looks your building ids up
  in someone else's city. Hence `CAST_EE` / `pickupProduction` / `startProduction` are gated on
  `OWN_CITY` and the rest are not: `visitPlayer`, `helpPlayer` and the tourny calls go straight at a
  service and are the player's business wherever they are standing — gating them would break the
  neighbourly-help/KP-hunt flow, which drives into `OTHER_CITY` deliberately.
- **Session over, the client's verdict.** `ApplicationModel.onTick` (L10712) is a watchdog that
  `_onApplicationLostFocus` (L10733) schedules on `GameClock` at **2,400,000 ms = 40 min** from the
  stage `deactivate` (window blur, *not* visibility); `_onApplicationReceiveFocus` (L10728)
  unschedules it. When it fires it raises the "Session Timed Out … we need to reload Elvenar"
  exception window, calls `GameClock.unschedule(this)` and sets **`_reloadWindowShown = true`** —
  one-way, nothing clears it short of a reload. (`_showReloadWindow` L10722 is dead code: no
  callers.) Note this only became reachable in a background tab **because of the frame keep-alive**
  (§0.1): the watchdog rides `GameClock`, `GameClock` rides `enterFrame` (L658898), and before that
  a hidden tab got no frames so the 40 minutes never actually elapsed.
- **Session over, the server's verdict.** `ExceptionService` (L550673) registers push listeners for
  both `"exception"` and **`"redirect"`** (`METHOD_REDIRECT` L784427). The redirect arrives as an
  ordinary response element —
  `{"requestClass":"ExceptionService","requestMethod":"redirect","responseData":{"__class__":"RedirectVO","url":…,"message":…}}`
  (`RedirectVO` L535851) — over HTTP or the socket, so `noteSessionEndingResponses` reads it off
  both paths (`xhrInterceptor.ts`, `customWebSocket.ts`, above the repeat filter since it is not one
  of the matched responses). It matters that the extension catch this itself: all
  `RedirectCommand.execute` (L659742) does is `ExternalUtil.evaluate("showRedirectLayer", …)` — a
  layer on the **host page**. The Haxe client underneath stays alive and goes on accepting
  everything dispatched at it, so nothing about the game's own state gives a killed session away.
- **The connection giving out — the worst of the three and the quietest.** A transport error on the
  gateway leaves `_waitingForResponse` set forever, and **every** route to the wire (`immediate()`
  included) returns early while it is; see 04 §6.5 for the trace. The client is mute from that
  moment, requests pile up in `_requestBuffer`, and its models, socket and local dispatches all go
  on looking healthy — so unlike the other two there is no state on the game to read.
  `watchConnectionErrors` listens for **`ConnectionServiceErrorEvent/ERROR`** on the main context
  dispatcher (`injector.getInstance(aviad['openfl.events.IEventDispatcher'])` — where
  `commandMap.map(…)` L389973 picks the same event up for `ShowConnectionErrorCommand`). Listening
  rather than patching `onIOError`, because one listener covers all three raisers of that same
  window: the ioError (L658137), `HttpStatusHandler` on a 503 re-dispatched by `onReceivedFromServer`
  (L658115, `event.clone()`), and a failed static-data load (L580898). The event is an
  `openfl.events.ErrorEvent`, so `event.text` is the game's own message and is kept as the reason —
  the extension then says exactly what the player is reading on screen. Needs DI, so it is retried
  from the 1 s tick until it takes, and its body is wrapped: it runs on the game's dispatch stack,
  where a non-`openfl.errors.Error` throw is rethrown and takes the other listeners with it (04 §3).
- **Deliberately not used:** HTTP status. `HttpStatusHandler.handle` (L657956) turns any code in
  `HttpError.createMapping` (L139652: 400/403/404/405/407/408/444/494/499/500/502/503/504) into the same
  `RedirectEvent`, 503 excepted ("This world is currently being updated"). `xhrInterceptor` has
  `this.status` at readyState 4 and ignores it — 500/502/504 are transient and would end a session
  that is fine. If a real 403-on-`game/json` case turns up, that is where to add it.
- **One reason, not three flags.** `GameState.unusable?: string` carries *why*, in the game's own
  words where it has any, and the first reason wins — what broke first is what the rest is
  downstream of. All three are one-way: none comes back without a reload, which is why the watcher
  stops on it rather than waiting it out, where being in the wrong module only pauses.
- **Overlay half.** `gameState.ts` posts `{type:'gameState', payload:{module, loading, unusable}}`
  on change (1 s poll — binding to a `tink.state` observable from outside means constructing
  `tink.state.internal.Binding` by hand, which is the fragile option, see 01 §9.3);
  `src/overlay/gameStateWatch.ts` caches it and `productionWatcher.poll` pauses on `cityRefusal`
  and stops outright on `unusable`. That half is **not** load-bearing — it exists because a
  request the page drops is indistinguishable in the watcher from one the stock could not pay for,
  so `RETRY_AFTER_MS` would re-send the whole set every 15 s for as long as a visit lasted. It
  fails **open** (no report yet ⇒ carry on), since the page is what actually refuses.

---

## 5. The `window.aviad*` global surface

| Global | Set by | Available from | Declared TS type (`src/inject/aviad.ts`) / actual |
|---|---|---|---|
| `window.aviad` | `hookRegistry` | as soon as the patched bundle's line 7 runs (before any class) | typed as an object of specific ctors: `AncientWonderService`, `SpellService`, `WorldMapService` (+ raw `request()` chain), `OtherPlayerService`, `NeighborlyHelpService`, `WorldMapBattleService`, `TournamentService`, `WorldMapTournamentService`, `UnlockEncounterService`, `IsoDecorationEvent`, `VisitOtherPlayerCommand`, `DisplayAncientWonderCommand`, `OtherPlayerEvent`, `AncientWondersDataEvent`. Actually `$hxClasses` — 12,313 entries. |
| `window.aviad_enum` | `hookRegistry` | same | typed only for `'de.innogames.onyx.shared.events.LoadType'.LOAD_ONLY(a,b)`; actually `$hxEnums` (141 enums). |
| `window.aviad2` | `_createCameraController` patch | when `ConfigureIsoEngineCommand` runs (city bootstrap) | undeclared; `CityCameraController` L398381 |
| `window.aviad_am` (+`_a`) | ctor patch | main context bootstrap (`ApplicationModel` singleton) | `{ get_isLoading(): boolean; injector: { getOrCreateNewInstance<T>(ctor) } }` |
| `window.aviad_wm` (+`_a`) | ctor patch | when a spire diplomacy window opens | `{ _onInvest({resource:{id,_value:bigint}}) }` |
| `window.aviad_se` (+`_a`) | ctor patch | when a spire encounter is loaded | `{ diplomacyCosts: { get_resources(): {id,_value:bigint}[] } }` |
| `window.aviad_ts` (+`_a`) | ctor patch | city bootstrap (`TreasureService` singleton) | not declared |
| `window.aviad_tv` (+`_a`) | ctor patch | city bootstrap | `{ getTreasures(type): {id:string}[] }` |
| `window.aviad_silm` (+`_a`) | ctor patch | city view mediation | `{ isoEngine: { dispatchEvent(evt) } }` |
| `window.aviad_pagination`, `window.aviad_pagination_a` | ctor patch | first paginated view | `AviadPagination = { _onSelectNextPage(): void; parent: object }` / `AviadPagination[]` |
| `window.aviadlog` | console (user) | any time | undeclared boolean; enables `shadowProxy` logging |
| `window.wrapOne(v, name)` | `injectMutate` | before the bundle | undeclared |
| `window.loadGameCode` | `injectMutate` (overrides page's) | before the bundle | undeclared async fn |
| `window.gameVars` | page (`AbstractFlashVars`) + `gameScriptUrl` added by `injectMutate` | before the bundle | `GameVars {market, version, build_number, gameScriptUrl}` |
| `window.WebSocketUnchanged` | `inject-main.ts` | script start | `typeof WebSocket` |
| `window.compVer`, `window.aviadVisit`, `window.aviadOpenAw` | **never assigned** in `src/` (declared in `aviad.ts` since commit 558ae62 "kphunt auto") | — | `(v2)=>number`, `(playerId)=>void`, `(playerId, buildingId, baseName)=>void` — console-era leftovers |

---

## 6. Techniques summary & how to add a new hook

### (a) Call a new service RPC (fire-and-forget, observe via interception)
1. Find the class and method in `05-services-catalog.md` / `rev-eng/index/services-raw.md`; confirm the
   **wire `serviceName`** (`get_serviceName()`), the request name and the exact `withData` order in the
   snapshot (`grep -n ',methodName: function' tmp/elvenar-release-full-reveng.js`). Beware
   `(rowIndex, columnIndex)` params being sent as `[columnIndex, rowIndex]` (§4.5-4.7).
2. Add the ctor to the `aviad` interface in `src/inject/aviad.ts` (FQ name key, `new () => {...}`).
3. In `src/inject/local/<thing>.ts`: `const svc = new window.aviad['<fq>'](); svc.method(args, cb)`
   or `svc.request('name').withData([...]).immediate().call()`. Do not rely on `cb` (§4 preamble). If
   you *need* the callback in-page, register the instance:
   `aviad['de.innogames.networking.services.registries.ServiceRegistry'].register(svc)` (04 §9a) —
   or read the reply through a matcher (e).
4. Add a `case '<type>'` in `inject-main.ts` and `relayToGame('<type>', payload)` in the overlay; add
   the response to `playerSpecificMatchers.ts` (`responseSelector`) and a processor in the SW if the
   overlay must see the result. Gate on `compareVersion('x.y')` if the game method is new.

### (b) Capture a new mediator/model instance
1. Confirm the class is registered as `$hxClasses["<fq>"] = <Ctor>;` right after `var <Ctor> = function(...)`
   (`grep -n '"<fq>"' …`), and that in the min bundle it is `var xx=function(…` (Closure keeps that form).
2. Add `scriptText = patchCtorRegistryAssignment(scriptText, '<fq>', 'aviad_<short>')` in
   `fetchAndModify`, and declare `aviad_<short>` (and `_a` if you need history) in `aviad.ts`.
3. Prefer `aviad_am.injector.getInstance(aviad['<fq>'])` instead when the class is mapped as a
   singleton (models, services, managers) — no bundle patch needed (`03` §9b). Ctor capture is the only
   route for mediators/views (never mapped) and for per-instance wrappers like `SpireEncounter`.
4. Remember the wrapper logs (`console.trace`, never `console.error` — Sentry CaptureConsole, §1.5) per construction and `_a` grows for the whole session —
   prune like `localNextPage` does, or don't rely on `_a` for hot classes.

### (c) Drive a Command
`const cmd = aviad_am.injector.getOrCreateNewInstance(aviad['<fq Command>']); cmd.event = new aviad['<fq Event>'](type, ...args); cmd.execute();`
— what `localVisitPlayer`/`localOpenAw` do. Guards/hooks of the commandMap are bypassed; use the
event's real type string if the command branches on it; `AsyncCommand`s want listeners before
`execute()`; EzCommands use `_event` (see `03` §9a). To go *through* the map instead, dispatch on the
context dispatcher (`03` §9c).

### (d) Dispatch an engine event
Iso-engine listeners live on the injected `IsoEngine` (`aviad_silm.isoEngine`, or
`aviad_am.injector.getInstance(aviad['de.innogames.onyx.city.engine.snake.IsoEngine'])`):
`isoEngine.dispatchEvent(new aviad['<fq event>'](type, ...))`. The interaction-mode controller
re-dispatches selected engine events onto the context (`IsoDecorationEvent::click`, `IsoTileEvent::*`,
L454975-455035) only when its mode `get_isActive()`. Global (context) events go via
`aviad_am.injector.getInstance(aviad['openfl.events.IEventDispatcher']).dispatchEvent(...)` (03 §5).

### (e) React to a response in-page (`local` handler)
Add `{ responseSelector: {requestClass, requestMethod}, local: async (entries) => {...} }` to
`playerSpecificMatchers.ts`. It runs (i) after the HTTP aggregate settles (300 ms debounce, per
response entry, `matcher.local([response])`) and (ii) immediately for websocket-pushed responses
(`matchAgainstLocalHandlers`), after the 5 s repeat filter. Handlers with `local` are **not** forwarded
to the SW by the socket path (`matchedSocketResponses` excludes them) but the HTTP path still posts the
aggregate — so an `R:` processor may coexist. Use the trap-hook pattern (`localTrapVisitPlayer`) to
turn "the response for X arrived" into a promise for an action started earlier.

### Gotchas collected
- `console.trace` is the ctor-capture log level (was `console.error` until 2026-08-15; `error` is shipped to the game's Sentry with the player id — never use it in MAIN-world code); filter DevTools on `aviad_` to see captures.
- `_a` arrays never shrink; `aviad_pagination_a` is filtered/reassigned by `localNextPage`; the last
  element is the newest instance.
- The 500 ms `setTimeout(onGameCodeLoaded)` is not a load wait: inline scripts do not fire `load`, and
  `onGameCodeLoaded` is the page's game starter — dropping the timeout would leave the game unstarted.
- Bare `new Service()` sends but never receives (`ServiceRegistry`); `performAction` and
  `getTournamentProgress` take no callback at all.
- Wire coordinate order is `[r, q]` for the fluent `withData` calls but `(q, r)` for
  `unlockEncounter(rowIndex, columnIndex, …)` — same payload, opposite parameter order.
- Every response the game receives is also intercepted, including pushes piggy-backed on unrelated
  requests; the socket path needs one prior HTTP request to know the session (`latestSharedInfo`).
- The `full` bundle is strict; the ctor patch would `ReferenceError` there before the `var` fix of 2026-08-15 (§1.5).
- Renaming/adding game methods happens between game versions (`helpPlayer` @1.239): gate with
  `compareVersion`; renaming of minified identifiers happens every build: never anchor on them except
  in `hookRegistry`, and expect `Ab`/`vb`-style fallbacks to need updating.

---

## Open questions / not verified

- The page-side loader (`loadGameCode`, `onGameCodeLoaded`) is not in any local file; its role is
  inferred from `injectMutate.ts` and the export `startElvenar` (`01` §9). Whether `onGameCodeLoaded`
  tolerates being called twice (once by the never-firing `load` listener, once by the timeout) was
  not checked — in practice only the timeout fires.
- Whether the served **full** bundle really is strict at runtime (i.e. whether the ctor patch breaks it)
  is inferred from the file header + a node repro of the patch, not from a live full-build session.
- The MutationObserver `script.remove()` guard: whether removing a just-inserted external `<script>`
  cancels its execution in current Chromium was not tested; it is a best-effort guard.
- `helpPlayer`'s response shape and the `QuickNeighborlyHelpPerformedEvent` flow were seen only in the
  minified July 2026 bundle; no unminified source for game ≥ 1.239 is available.
- `_createCameraController` regex assumes the body contains no `},` before the end (true today).
- `_onInvest` requires `_currentFrame` to be non-null; the assumption that a freshly-opened diplomacy
  window always has one (via `_initiateInvestment`, L625822) was read but not exercised.
- Whether Closure could ever emit a hooked ctor as a `function X(){}` declaration (which the
  `\sX\s*=\s*function` regex would miss, silently breaking the wrapper) — not the case in the July 2026
  min bundle for the seven classes.
