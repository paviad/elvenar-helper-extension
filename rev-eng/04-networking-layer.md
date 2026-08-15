# 04 — Networking layer: how the client talks to the server

## Scope

How the compiled Elvenar client (Haxe → JS, snapshot `tmp/elvenar-release-full-reveng.js`,
Feb 12 2026) sends requests and receives replies, pushes and static data, and how the ElvenAssist
extension taps into each of those paths. Drawn from `de.innogames.networking.services.*`
(NetConnectionService, ServerRequestBuilder, providers, registries, data VOs),
`de.innogames.shared.networking.*` (AbstractConnectionService, HttpConnectionProvider,
JsConnectionProvider, Providers, SaltGenerator, plugins, ServerResponse, HttpStatusHandler),
`de.innogames.onyx.networking.vos.{ServerRequestVO,ServerResponseVO,ExceptionVO,RedirectVO,
ManifestVO,ValueObjectRegistry}`, `de.innogames.shared.util.parsers.*`,
`de.innogames.onyx.shared.exceptions.*`, `de.innogames.onyx.shared.staticdata.*`,
`de.innogames.onyx.networking.services.{ManifestService,FeaturesService,LogService}`,
`de.innogames.onyx.city.configs.NetConfiguration`, `de.innogames.strategycity.main.utils.{GameUrls,
ApplicationParams}`, the chat socket commands/processors, and on the extension side
`src/inject/xhrInterceptor.ts`, `decodeRequestBody.ts`, `getDecodedText.ts`,
`customWebSocket.ts`, `socketResponses.ts`, `playerSpecificMatchers.ts`, `nonSpecificMatchers.ts`,
`src/overlay/parseSocketMessage.ts`, `src/chrome/{aggregateRequestResponse,socketResponse}.ts`,
`src/model/elvenarRequestResponseEntry.ts`, `src/inject/aviad.ts`, `src/inject/local/*.ts`.

The per-service catalog (which methods exist, their args) is *not* here — see `05-services-catalog.md`
and `rev-eng/index/services-raw.md`. Bootstrap/DI details are in `03-bootstrap-di-commands-events.md`.

---

## 1. Big picture

```
 service.request("m").withData([..]).call()          (any AbstractConnectionService subclass)
   └─ ServerRequestBuilder.call() → ServerRequest{requestId=++static counter}
        └─ NetConnectionService.executeRequest(req)   registers req.callback under "m.<id>"
             └─ ProviderRegistry.register(provider); provider.send(req)
                  └─ AbstractConnectionProvider buffers (500 ms debounce | immediate | delayed)
                       └─ HttpConnectionProvider.encodedRequest → POST <jsonGateway>  body = md5[0..10] + JSON
                            └─ openfl URLLoader → lime HTML5HTTPRequest → XMLHttpRequest   ← extension hooks here
 server reply: JSON array of ServerResponseVO (own replies + piggy-backed pushes)
   └─ HttpConnectionProvider.onResult → decodeResponse (JSONParser → typed VOs)
        └─ dispatch NetConnectionProviderEvent → ProviderRegistry._onRequestSuccessful
             └─ ServiceRegistry.process(resp)  → every REGISTERED service with resp.requestClass
                  └─ NetConnectionService.processResponse: "*" listeners → method listeners → one-shot callback "m.<id>"
 socket push: page-side STOMP client (window.socket) → element.notify(plugin,method,topic,body)
   └─ JsConnectionProvider.onNotify → plugin.process → onResult(body) → same fan-out as above
```

The single most important fact for the extension: **the transport is a static singleton
(`Providers.JSON`) and is wired by DI once at boot, so any hand-constructed service can *send*;
but responses are fanned out only to services that are in the static `ServiceRegistry`, and a
hand-constructed service is not registered — so its `withCallback` and push listeners never
fire unless you register it yourself** (§4, §9 recipes).

---

## 2. Class map

| Class | Line | Role |
|---|---|---|
| `de.innogames.networking.services.INetConnectionService` | L10917 | interface: `set_defaultProvider`, `get_serviceName`, `addPushResponseListener`, `processResponse`, `dispose` |
| `de.innogames.networking.services.NetConnectionService` | L12784 | base: callback maps, `request()`, `executeRequest()`, `processResponse()` |
| `de.innogames.shared.networking.AbstractConnectionService` | L13105 | adds DI fields `eventDispatcher`, `context`; `postConstruct` registers in ServiceRegistry; `dispatch()`; sets default provider `Providers.JSON` |
| `de.innogames.networking.services.ServerRequestBuilder` | L139541 | fluent builder returned by `request()` |
| `de.innogames.networking.services.data.ServerRequest` | L139725 | the built request (ids, names, data, flags, callback) |
| `de.innogames.networking.services.data.IServerRequest` / `IServerResponse` | L139683 / L139705 | interfaces |
| `de.innogames.shared.networking.data.ServerResponse` | L657910 | wraps a parsed `ServerResponseVO`; `get_result()` = `responseData` |
| `de.innogames.networking.services.SafeResponse` | L139523 | abstract over String (typed method-name constants for `addSafePushResponse`) |
| `de.innogames.networking.services.Async` | L139510 | abstract: Future → tink Observable (used by `callWithFuture` consumers) |
| `de.innogames.networking.services.providers.IConnectionProvider` | L17289 | `connect()`, `send(request)` |
| `de.innogames.networking.services.providers.AbstractConnectionProvider` | L17310 | buffering/batching, timers, `onResult` fan-out |
| `de.innogames.networking.services.providers.ServerRequestBuffer` | L139883 | sorted-by-requestId array with `limit(n)` |
| `de.innogames.shared.networking.providers.HttpConnectionProvider` | L658028 | the JSON/HTTP transport (POST, signature, headers) |
| `de.innogames.shared.networking.providers.JsConnectionProvider` | L17439 | receive-only socket transport (bridges the page's STOMP client) |
| `de.innogames.shared.networking.providers.Providers` | L658333 | static holder: `Providers.JSON = new HttpConnectionProvider()` (L786219) |
| `de.innogames.networking.services.registries.ServiceRegistry` | L139951 | static `serviceName → ObjectMap<service>`; `register/unregister/process` |
| `de.innogames.networking.services.registries.ProviderRegistry` | L139939 | static: listens to provider `requestSuccessful`, feeds ServiceRegistry |
| `de.innogames.networking.services.registries.HandlersRegistry` | L139923 | static lists of `IHttpStatusHandler` / `IResponseErrorHandler` |
| `de.innogames.networking.services.events.NetConnectionProviderEvent` | L139834 | `"NetConnectionProviderEvent::requestSuccessful"`, pooled, carries `responses[]` |
| `de.innogames.networking.services.data.HttpError` | L139650 | code→description table (400,403,404,405,407,408,444,494,499,500,502,503,504) |
| `de.innogames.networking.services.handlers.IHttpStatusHandler` / `IResponseErrorHandler` | L139863 / L139872 | handler interfaces |
| `de.innogames.shared.networking.exceptions.HttpStatusHandler` | L657951 | maps HTTP status → error window / redirect |
| `de.innogames.networking.services.errors.NotImplementedError` | L139824 | thrown by abstract base methods |
| `de.innogames.shared.networking.protection.IProtectionGenerator` / `SaltGenerator` | L85650 / L658010 | the signing secret |
| `de.innogames.shared.networking.plugins.{ISocketPlugin,InstantUpdatePlugin,SocketChatPlugin,SocketPluginProvider}` | L657972 / L657981 / L657994 / L82883 | socket frame routing |
| `de.innogames.shared.networking.processors.{IChatProcessor,IChatProcessorProvider}` | L385691 / L81014 | chat frame processors |
| `de.innogames.shared.networking.events.SocketConnectionEvent` | L657939 | `"MissingConnectionEvent::DISCONNECTED"` / `"MissingConnectionEvent::MESSAGE_RECEIVED"` |
| `de.innogames.shared.networking.views.SocketConnectionIndicator(+Mediator)` | L17282 / L658338 | the "socket lost" icon; click → `connectionProvider.connect()` |
| `de.innogames.onyx.networking.vos.ServerRequestVO` / `ServerResponseVO` | L537145 / L537184 | wire envelopes |
| `de.innogames.onyx.networking.vos.ValueObjectRegistry` | L541043 | `init()` registers every VO alias (`FLGlobal.registerClassAlias("XyzVO", ctor)`) |
| `de.innogames.shared.util.parsers.{IParser,JSONParser,HaxeJSONParser,HaxeJSONExporter,ParseError}` | L50124 / L659232 / L66025 / L659203 / L659281 | JSON ⇄ VO |
| `de.innogames.onyx.city.configs.NetConfiguration` | L389961 | DI wiring of all of the above |
| `de.innogames.strategycity.main.utils.GameUrls` / `ApplicationParams` | L665676 / L665537 | flashvars: `json_gateway_url`, `socket_gateway_url`, `sid`, `platform`, `basepath`, `locale`… |
| `de.innogames.onyx.shared.exceptions.{ExceptionService,ExceptionCodes}` | L550678 / L550671 | server-side errors as pushes |
| `de.innogames.onyx.shared.service.CallbackService` | L579410 | server tells client "call service X method Y" |
| `de.innogames.onyx.networking.services.LogService` | L31231 | telemetry service (`logGameLogin`, `trackSocketConnection`, …) |
| static data: `StaticDataService`, `StaticDataDiffService`, `StaticDataRegistry`, `StaticDataCache`, `AbstractStaticLoadCommand`, `StaticDataCompositeCommand`, `StaticData` constants, `JsonManifestModel`, `ManifestModel`, `Manifest`, `ManifestService`, `FeaturesService` | L580829 / L580779 / L15500 / L580747 / L383159 / L390959 / L524080 / L137771 / L518352 / L518325 / L15479 / L523855 | §7 |

---

## 3. `NetConnectionService` (L12784) — every field and method

Constructor: `_responseMap = new StringMap()`, `_requestCallbacks = new StringMap()`,
`_pushResponseCallbacks = new StringMap()`. Statics: `EMPTY_CALLBACKS = []` (L780277),
`_pushResponseMap = new StringMap()` (L780279 — **shared by all services**).

| Member | What it is |
|---|---|
| `_defaultProvider` | `IConnectionProvider` used by `request()`; set via `set_defaultProvider(v)`. `AbstractConnectionService` ctor sets it to `Providers.JSON`. |
| `_requestCallbacks` | `StringMap<Array<Function>>` keyed by **`keyName = "<method>.<requestId>"`** — the one-shot `withCallback` callbacks. |
| `_pushResponseCallbacks` | `StringMap<Array<Function>>` keyed by **method name** (or `"*"`) — persistent listeners (`addPushResponseListener` / `addResponseListener` / `addSafePushResponse`). |
| `_responseMap` | `StringMap<Int>` keyed by `fullName = "<Service>.<method>"` → requestId of the latest request that used `parseLastResponse()`. |
| static `_pushResponseMap` | `StringMap<Int>` `"<Service>.<method>"` → requestId set by `handleOnlyLastPushResponses([...])`. |
| `get_serviceName()` | abstract — throws `NotImplementedError` (AbstractConnectionService re-throws `AbstractMethodError`). Every concrete service overrides it to return the wire `requestClass` string, e.g. `"CityProductionService"`. |
| `request(methodName)` | `new ServerRequestBuilder(this.get_serviceName(), methodName, this._defaultProvider, $bind(this, this.executeRequest))` — see §5. |
| `executeRequest(request)` | called by the builder's `call()`: (1) if `parseLastResponse` → `_responseMap[fullName] = requestId` else delete the key; (2) for each name in `parseLastPushResponses` → static `_pushResponseMap[name] = requestId`; (3) if callback is a function → push it under `_requestCallbacks[keyName]`; (4) `ProviderRegistry.register(provider)` (idempotent — openfl `addEventListener` dedups) and `provider.send(request)`. |
| `addPushResponseListener(methodName, cb)` | alias of `addResponseListener`. |
| `addResponseListener(responseName, cb)` | append `cb` to `_pushResponseCallbacks[responseName]`. `"*"` is a wildcard for every response of this service. |
| `addSafePushResponse(SafeResponse, cb)` | **not on the base class** — each concrete service declares its own (`this.addResponseListener(SafeResponse.toString(r), cb); return this;`), e.g. `CityProductionService.addSafePushResponse` (L13185). The `SafeResponse` argument is just a string constant such as `de_innogames_onyx_resources_service_ResourcesService_GetCityCulture = "getCityCulture"` (L784311). |
| `registerRequestCallback(request)` | same as step (3) of `executeRequest` (unused elsewhere). |
| `processResponse(response)` | the fan-in — algorithm below. |
| `processPushResponses / processResponseCallbacks / processRequestCallbacks / processCallback` | inlined copies of parts of `processResponse` (helpers, all wrap the callback in try/catch → `Logger.error("Error processing callback for response [..]")` for `openfl.errors.Error`, **rethrow anything else** — e.g. a JS `TypeError`). |
| `isLatest(request)` | `request.requestId == _responseMap[fullName]`. |
| `dispose()` | `ServiceRegistry.unregister(this)`, clear push listeners, null the maps. |

### `processResponse(response)` — order of operations (L12799)

1. **Stale filter**: if `_responseMap` has `response.fullName` and `response.requestId != _responseMap[fullName]` → **return** (dropped entirely; only relevant if some request used `parseLastResponse()`).
2. **Wildcard listeners**: every `_pushResponseCallbacks["*"]` gets `callback(response.get_result())`.
3. **Method listeners** ("push" listeners): unless static `_pushResponseMap[fullName]` exists and `response.requestId < _pushResponseMap[fullName]` (older than the last `handleOnlyLastPushResponses` request), every `_pushResponseCallbacks[methodName]` gets `callback(result)`.
   *Note: these fire for **every** response with that method name, whether it is a reply to a request or an unsolicited push — this is why "push listener" is really "method-response listener".*
4. **One-shot callbacks**: `_requestCallbacks["<method>.<requestId>"]` — each is `shift()`ed and called once with `result`.

Callbacks receive `response.get_result()` = the **parsed** `responseData` (typed VO instances, see §6.4), never the envelope.

## 4. `AbstractConnectionService` (L13105) and hand-constructed services

```js
var AbstractConnectionService = function() {
    NetConnectionService.call(this);
    this.set_defaultProvider(Providers.JSON);          // static singleton HttpConnectionProvider
};
prototype: eventDispatcher: null, context: null,
  postConstruct(){ this.context.beforeDestroying($bind(this,this.dispose)); ServiceRegistry.register(this); },
  get_serviceName(){ throw AbstractMethodError },
  dispatch(event){ this.eventDispatcher.dispatchEvent(event); }
```

Implements `de.innogames.onyx.shared.IDisposable`. All 83 network services extend it (some via
`de.innogames.onyx.mvcs.BaseActor`-less path — they are plain services). Concrete subclasses add their
own `[Inject]` fields (models, factories) that are `null` on the prototype and filled by robotlegs.

### Why `new window.aviad['de.innogames.onyx.city.service.NeighborlyHelpService']()` can send

* The transport is `Providers.JSON`, a **static** `HttpConnectionProvider` created at script load
  (L786219) and wired **once** by `NetConfiguration.configure()` (L389961):
  `this.injector.injectInto(Providers.JSON)` fills its `eventDispatcher`, `protection`
  (`SaltGenerator`), `parser` (`JSONParser`). It also maps `IParser→JSONParser`,
  `IProtectionGenerator→SaltGenerator` (singleton), `SocketPluginProvider`, `JsConnectionProvider`
  (singleton), `ExceptionService` (singleton), `LogService`, and adds the `HttpStatusHandler`.
* So a hand-constructed service has `_defaultProvider` = the live, injected provider; `request()`
  builds a normal `ServerRequestBuilder`; `call()` → `executeRequest` → `provider.send()`. The
  request goes out in the same batch/pipeline as the game's own, with a `requestId` from the same
  static counter, signed with the same secret. **Sending works.**
* `GameUrls.get_instance().jsonGateway` (URL incl. `?h=<sid>`) and `ApplicationParams` are lazy
  singletons reading the page flashvars — also available without DI.

### What does NOT work on a hand-constructed instance

| Field / behaviour | State | Consequence |
|---|---|---|
| `postConstruct()` | never called | not in `ServiceRegistry` → **`processResponse` is never invoked on it** → `withCallback(cb)` **never fires**, `addPushResponseListener` / `addSafePushResponse` **never fire**, `parseLastResponse()` bookkeeping is local to this dead instance. |
| `eventDispatcher` | `null` | `dispatch(event)` → `TypeError: Cannot read properties of null (reading 'dispatchEvent')`. Any service method whose response handler dispatches (e.g. `CityProductionService._onGetProductionQueue` → `LoaderViewEvent::HIDE_LOADER`) would throw — but only if the instance were registered. |
| `context` | `null` | irrelevant unless `postConstruct` runs (`context.beforeDestroying`). |
| service-specific injected fields (e.g. `CityProductionService.queueModel`, `NeighborlyHelpService`'s models) | `null` | any method that reads them before calling `request()` throws; pure "build request and call" methods are fine. Check the method body before calling it. |
| ctor-installed listeners (e.g. `CityProductionService` ctor `addPushResponseListener("getProductionQueue", …)`) | installed on the dead instance | harmless while unregistered; **dangerous if you register it**: a `TypeError` inside a listener is *not* an `openfl.errors.Error`, so `processResponse` rethrows it and aborts the fan-out for the rest of that batch (see §3 helper note). |
| static side effects (`_pushResponseMap`, `ServerRequestBuilder.requestCounter`, `ProviderRegistry.register`) | shared | `handleOnlyLastPushResponses([...])` from your instance *does* affect the game's registered services (it can suppress their older pushes) — use with care. |

**Consequently the extension's callbacks in `src/inject/local/neighbourlyHelp.ts`, `tourny.ts`,
`localHelpPlayer.ts` (`console.log('E … response:', response)`) are dead code by construction; the
data actually arrives via the XHR interceptor (§8) which is why every one of those calls has a
matching `responseSelector` in `playerSpecificMatchers.ts`** (e.g. `OtherPlayerService/getNeighbourlyHelpBuildings`,
`WorldMapService/getProvinceInformation`, `AncientWonderService/getOtherPlayerAncientWonders`). Push responses
triggered by your request (e.g. `CityResourcesService.getResources`) still reach the game's registered
services normally, so the game UI updates.

To make callbacks fire, register the instance (recipe §9a): `ServiceRegistry.register(svc)` — the
registry keeps an `ObjectMap` per service name, so several instances (the DI one and yours) may
coexist and all get `processResponse`.

### How the game obtains services (for comparison)

Robotlegs injector: `injector.getInstance(de_innogames_onyx_city_service_NeighborlyHelpService)`.
The extension exposes the app-level injector as `window.aviad_am.injector` (patched
`ApplicationModel`, `src/inject/injectMutate.ts`; used by `src/inject/local/localOpenAw.ts` via
`getOrCreateNewInstance`). Injector API (`org.swiftsuspenders.Injector` L737614):
`getInstance(type[,name])`, `hasMapping(type)`, `getOrCreateNewInstance(type)`, `instantiateUnmapped(type)`,
`injectInto(obj)`, `satisfies(type)`. `getInstance(ServiceCtor)` returns the *registered* singleton →
callbacks work on it, but its methods run their full side effects.

## 5. The request builder — `ServerRequestBuilder` (L139530)

`this.request("x")` returns `de.innogames.networking.services.ServerRequestBuilder`. Constructor
`(serviceName, methodName, defaultProvider, executeRequest)`; defaults: `_data=[]`, `_immediate=false`,
`_delay=0`, `_parseLastResponse=false`, `_usePlatform=false`, `_provider=defaultProvider`.

| Method | Effect | Notes |
|---|---|---|
| `withData(args:Array)` | `_data = args ?? []` | ONE array argument = positional `requestData`. |
| `withCallback(fn)` | `_callback = fn` | one-shot, called with parsed `responseData`. No error callback exists (see §6.5). |
| `immediate(value=true)` | `_immediate` | flush the whole buffer now instead of after the 500 ms debounce. Throws `IllegalOperationError("Do not use immediate with delay!")` if combined with `withDelay`. |
| `withDelay(ms)` | `_delay` | request parked in the delayed buffer; sent when `getTimer()` passes `now+ms` (checked every 100 ms). |
| `withProvider(p)` | `_provider` | override transport (only `Providers.JSON` is usable — `JsConnectionProvider.canSendRequest()` returns `false`). |
| `withService(name)` | `_serviceName` | override `requestClass` for this one request (used by `CallbackService`, L579418). |
| `usePlatform(value=true)` | `_usePlatform` | appends `&<ApplicationParams.platform>` to the gateway URL for that batch. |
| `parseLastResponse()` | `_parseLastResponse=true` | only the latest request of this `Service.method` will be processed by the service (older replies dropped in `processResponse` step 1). Used e.g. by `AncientWonderService.getOtherPlayerAncientWonders` (L21154), `invest` (L632710), `updateSettings` (L665443). |
| `handleOnlyLastPushResponses(["Svc.method",…])` | `_parseLastPushResponse` | sets static `_pushResponseMap["Svc.method"] = requestId` so push listeners ignore older pushes of those names. e.g. `startProduction` → `["CityResourcesService.getResources"]` (L13173). |
| `call()` | builds a `ServerRequest` with `requestId = ++ServerRequestBuilder.requestCounter` (static, L781704), copies all fields (`delay` becomes an absolute `openfl.Lib.getTimer()+delay`), then `executeRequest(request)`. | |
| `callWithFuture(eager=false)` | wraps `call()` in a `tink.core.Future` (`SuspendableFuture`): the trigger becomes the callback; returns the future (`.handle(fn)`). 49 call sites (`getManifests`, `GuardianService.*`, …). | overwrites any prior `withCallback` (logs debug). |

`ServerRequest` (L139725) getters: `get_fullName()` = `"<Service>.<method>"`, `get_keyName()` = `"<method>.<requestId>"`,
`get_isDelayed()` = `delay != 0`, `toString()` = `"Svc.method([data]) with id: N"`.

### Batching / queueing — `AbstractConnectionProvider` (L17310)

Fields: `_requestBuffer`, `_delayedRequestBuffer`, `_recentSendRequestBuffer` (last 10, for error
logs), `_waitingForResponse`, `_flushOnResponse`, `_flushBufferTimer = Timer(500, 1)` (one-shot),
`_flushDelayedBufferTimer = Timer(100)` (repeating).

* `send(req)`: delayed → `_delayedRequestBuffer` (+ start 100 ms timer); else `_bufferRequest`:
  **reset** the 500 ms timer, push, then `immediate ? _flushBuffer() : timer.start()`. So a batch goes
  out 500 ms after the *last* non-immediate request, or at once when an immediate one arrives —
  carrying every buffered request along, sorted by `requestId`.
* `_flushBuffer()`: if `_waitingForResponse` → `_flushOnResponse = true; return` (**at most one HTTP
  request in flight**; the next batch is sent from `onResult`). Else `encodedRequest(requests)`,
  `_recentSendRequestBuffer.concat().limit(10)`, `sendRequest()`, reset buffer, `_waitingForResponse=true`.
* `onDelayTimer`: moves expired delayed requests to the main buffer and flushes; stops when empty.
* `onResult(result)`: `_waitingForResponse=false`; `decodeResponse` → `ServerResponse[]`; for each
  response ask every `HandlersRegistry.errorHandlers` (`hasError → handle; return`) — **none are ever
  registered** (`addErrorHandler` has no callers); then `dispatchEvent(NetConnectionProviderEvent.fromPool(responses))`;
  then `_flushIfRequired()`.
* Observed by reading: `HttpConnectionProvider.onIOError` does **not** clear `_waitingForResponse`, so
  after a transport error (not an HTTP status — a real ioError) all later requests stay buffered until
  reload. Not verified live.

`ProviderRegistry.register(p)` (L139941) adds `_onRequestSuccessful` as listener for
`"NetConnectionProviderEvent::requestSuccessful"`; `_onRequestSuccessful` → `ServiceRegistry.process(r)` for
each response, then `event.dispose()` (back to pool). `ServiceRegistry.process(r)` (L139977) →
`_services[r.requestClass]` (ObjectMap) → `service.processResponse(r)` for each; unknown service names are
silently ignored.

## 6. Wire format

### 6.1 Endpoint, headers, signature — `HttpConnectionProvider.encodedRequest` (L658058)

```js
var gatewayUrl = GameUrls.get_instance().jsonGateway;          // flashvar json_gateway_url, e.g. https://en1.elvenar.com/game/json?h=<sid>
var url = needIncludePlatform(requests) ? gatewayUrl + "&" + ApplicationParams.platform : gatewayUrl;
request.requestHeaders = [["Content-Type","application/json"],["X-Requested-With","ElvenarHaxeClient"],["Os-Type","browser"]];
var h = gatewayUrl.substr(gatewayUrl.lastIndexOf("?h=") + 3);   // the h= query value
var jsonString = JSON.stringify(HaxeJSONExporter.toJsonObject(vos));   // vos = ServerRequestVO[]
request.data = MD5.hash(h + this.protection.get_key() + jsonString).substr(0, 10) + jsonString;
request.method = "POST";
```

* `SaltGenerator.get_key()` (L658010) returns the constant **`"MAW#YB*y06wqz$kTOE"`**.
  `MD5.hash` = `haxe.crypto.Md5.encode` (lowercase hex). So **signature = first 10 hex chars of
  md5(`<h>` + `"MAW#YB*y06wqz$kTOE"` + `<exact JSON body>`)**, prepended to the JSON — the body is
  *not* valid JSON, it is `nnnnnnnnnn[{...}]`. There is no `Signature` header; the `h=` value is the
  session id (`ApplicationParams.sid`, from flashvar `sid` — same value as far as can be told; not
  verified byte-for-byte).
* Sent through `openfl.net.URLLoader` → `lime._internal.backend.html5.HTML5HTTPRequest.load` (L697646):
  `new XMLHttpRequest()`, `open("POST", url, true)`, `timeout=30000` (URLRequest.idleTimeout default),
  headers set, `withCredentials = true` (cookies), and **`send(ArrayBuffer)`** (`data.b.bufferValue`) —
  which is why `src/inject/decodeRequestBody.ts` handles `ArrayBuffer`/`Uint8Array`/string. Response is
  read as text (`responseType` unset).
* Extension: `src/inject/xhrInterceptor.ts` matches `^(https:\/\/(.*?)\.elvenar\.com\/)game\/json\?h=([\w\d]+)$`
  → `worldId` (host label, e.g. `en1`), `sessionId` (the `h`), splits the body as
  `nonce = body.substring(0,10)`, `JSON.parse(body.substring(10))`, and stores each request by `requestId`
  in `requestMap` (max 200 pending). It hooks `XMLHttpRequest.prototype.open/send` and wraps
  `onreadystatechange` (lime assigns it before `open`), decoding the reply with `getDecodedText.ts`.

### 6.2 Request envelope — `ServerRequestVO` (L537145)

`HaxeJSONExporter.toJsonObject(vo)` → `vo.toJsonObject()` merges `AbstractVO` (`{"__class__": "ServerRequestVO"}`)
with `{requestData, requestClass, requestMethod, requestId}` (that key order):

```json
[{"__class__":"ServerRequestVO","requestData":[848933052],"requestClass":"OtherPlayerService","requestMethod":"getNeighbourlyHelpBuildings","requestId":417}]
```

`requestData` = the `withData([...])` array, exported recursively (`AbstractVO`→`toJsonObject()`,
Haxe maps→objects, arrays, primitives). Several requests share one POST (one JSON array).

### 6.3 Response envelope — `ServerResponseVO` (L537184)

The reply is a JSON array. Each element: `{"__class__":"ServerResponseVO","requestClass","requestMethod","requestId","responseData","order"?}`.
Own replies carry the request's `requestId`; **piggy-backed pushes carry the id of the request that
triggered them** (this is what the extension's aggregation relies on: `addResponse` looks up
`requestMap.get(response.requestId)` and collects every response with that id into one
`AggregateRequestResponse`, `src/inject/xhrInterceptor.ts`). Typical batch: `[reply, CityResourcesService.getResources push, …]`.
Socket-pushed frames use `requestId: 1` (see the fixture in `src/inject/socketResponses.spec.ts`).

`de.innogames.shared.networking.data.ServerResponse` (L657910) wraps the parsed VO: `get_result()=responseData`,
`get_serviceName()=requestClass`, `get_methodName()=requestMethod`, `get_fullName()`, `get_keyName()="method.requestId"`, `get_requestId()`.

### 6.4 Parsing — `JSONParser` / `HaxeJSONParser` (L659232 / L66025)

`HttpConnectionProvider.decodeResponse(event)` → `this.parser.parse(event.target.data)`:
`HaxeJSONParser.decode` (`JSON.parse`, on syntax error logs and returns `[]`); if not an array the
raw object is returned → `decodeResponse` then does `null.length` (would throw). Otherwise each element
→ `HaxeJSONParser.parseClass(v)` = `Type.createInstance(FLGlobal.getClassByAlias(v.__class__), [])` +
`instance.fromJsonObject(v)`. `ServerResponseVO.fromJsonObject` parses `responseData` with
`HaxeJSONParser.parse(value, "None")`: primitives pass through, arrays recurse, objects **with**
`__class__` become VO instances (alias table from `ValueObjectRegistry.init()`, L541043 — hundreds of
`de.innogames.onyx.networking.vos.*VO`), objects **without** `__class__` are returned raw with a
`Logger.error("HaxeJSONParser: Returning unparsed data …")`. **So callbacks and push listeners get typed
VO objects** (fields as plain properties, `Object.getPrototypeOf(x).__class__.__name__` gives the FQ
name), whereas the extension's XHR tap sees the raw JSON with `__class__` strings.

Provider→ VO wiring: `injector.map(IParser).toType(JSONParser)` (new instance per injection).
`JSONParser.parseAsync` exists (chunked over `GameClock` ticks) but the providers use synchronous `parse`.

### 6.5 Error paths

* **Application errors** are *pushes*: the server answers with
  `{"requestClass":"ExceptionService","requestMethod":"exception","responseData":{"__class__":"ExceptionVO","code":N,"title":"…","message":"…"}}`
  (also `ClientExceptionVO`, same fields, L528147). `de.innogames.onyx.shared.exceptions.ExceptionService`
  (L550678, serviceName `"ExceptionService"`) listens to `"exception"` → dispatches
  `ServiceExceptionEvent::exception` → `ShowExceptionWindowCommand` (L659799) shows the exception window
  unless `code == 8007`; and to `"redirect"` (`RedirectVO{url,message}`, L535857) → `RedirectEvent::redirectTo`
  → `RedirectCommand` (L659736) → page-side `window.showRedirectLayer(json)`.
  `ExceptionCodes` (L784417): `INVENTORY_BUILDING_NOT_FOUND=1001, NOT_ENOUGH_RESOURCES=2000, INVALID_POSITION=3000,
  PLAYER_NOT_FOUND=5000, GUILD_NOT_FOUND=5001, INVALID_PROVINCE_STATE=6000, SPIRE_NOT_FOUND=8000,
  DIPLOMACY_WRONG_TURN_NUMBER=8007, KP_LIMIT_REACHED=19000`. The failing request's own callback simply
  never fires (no ServerResponseVO for it — assumed, see open questions). There is **no
  `withErrorCallback`** on the builder.
* **HTTP status**: `HttpConnectionProvider.onHttpStatus` → every `HandlersRegistry.httpStatusHandlers`
  (one: `HttpStatusHandler`, L657951): status in `HttpError.MAP` → 503 → `ConnectionServiceErrorEvent/ERROR`
  "This world is currently being updated…" (→ `ShowConnectionErrorCommand` alert window, L659777); other
  mapped codes → `RedirectEvent::redirectTo` root with "An error occurred (%d - %s)". 502 additionally
  logs the last 10 requests (`getLatestRequestData()`). `_maintance` flag suppresses the ioError window on 503.
* **ioError** → `ConnectionServiceErrorEvent/ERROR` "Stream Error. Could not process request..." + Sentry log.
* Callback exceptions: `openfl.errors.Error` → logged; anything else rethrown (see §3).
* `de.innogames.onyx.shared.errors.{AbstractMethodError,IllegalArgumentError,IllegalStateError,NotFoundError}`
  (L550515–L550551) are plain client-side error classes.

### 6.6 Push responses in general

A "push" is any `ServerResponseVO` the client did not request. Two delivery channels, one fan-out:
(a) piggy-backed in an HTTP reply (any batch may contain them; `CityResourcesService.getResources`,
`CityMapService.reset`, `InventoryService.updateItems`, `QuestService.getUpdates`,
`EffectsService.update`, `TranscendenceService.allBuildingsStates`, `AncientWonderService.phaseUpdated`,
`ExceptionService.exception`, `CallbackService.call` …); (b) socket frames (§8). Both end in
`ServiceRegistry.process(resp)` → the registered service(s) named `resp.requestClass` →
`processResponse` → wildcard + method listeners (step 2–3 of §3). Services subscribe in their ctor or
`postConstruct` (e.g. `ExceptionService` ctor; `CityProductionService` ctor `"getProductionQueue"`;
`FeaturesController` L390108 `addSafePushResponse("getFeatureFlags", …)`; the extension-relevant
`AncientWonderService.addSafePushResponse(PhaseUpdated, …)` L21111).

`CallbackService` (L579410, serviceName `"CallbackService"`, push method `"call"`): the server can send
`{service, method}` and the client immediately issues `request(method).withService(service).immediate().call()`.

## 7. Static data / CDN

Static balancing files are **not** fetched through the JSON gateway; `StaticDataService` (L580829)
uses its own `URLLoader` GETs (also XHR → visible to the extension's `nonSpecificMatchers.ts`).

* URL templates (ctor): `_template = "<basePath>/static/<locale>/{id}.json"`,
  `_templateDiff = "<basePath>/static/{nestedPath}/<locale>/{id}.json"`, where
  `basePath = flashvars.basepath + "/frontend/"` (`ApplicationParams.parse`, L665590 — hence the
  literal `//static` in real URLs, e.g. `https://oxen.innogamescdn.com/frontend//static/en_DK/xml.balancing.city.Buildings_<md5>.json`)
  and `locale` = flashvar `locale` (`en_DK`).
* `{id}` = `<StaticData id>_<hash>`; the hash of the base file comes from the **page loader**:
  `JsonManifestModel.getHash(key) = window.elvenloader.manifest.h[key]` (L137774) — a Haxe StringMap
  built by the page from flashvar `manifest` (`ApplicationParams.manifestFile`). Not part of the bundle.
* Ids (`de.innogames.onyx.networking.staticdata.StaticData`, L784168–L784217): `xml.balancing.Avatar`,
  `xml.balancing.BasicValues`, `xml.balancing.battle.BattleUnitAbilities`, `xml.balancing.battle.BattleUnitTypes`,
  `xml.balancing.city.Buildings`, `…BuildingsElves`, `…BuildingsHumans`, `…BuildingsPositions`, `…CityEntityCaps`,
  `…ConnectionsStrategies`, `xml.balancing.effects.EffectConfigs`, `…EffectConfigTooltips`,
  `xml.balancing.world_map.Encounters`, `xml.balancing.city.EvolvingBuildings`, `xml.balancing.help.FeaturesHelpData`,
  `xml.balancing.rewards.flexible.FlexibleRewards`, `xml.balancing.FocusMarkerTooltips`, `xml.balancing.Goods`,
  `xml.balancing.guardians.Guardians`, `xml.balancing.city.InitialBuildings`, `xml.balancing.city.Items`,
  `xml.balancing.LoadingScreenTexts`, `xml.balancing.Merchants`, `xml.balancing.city.mobile.BuildingsPositions`,
  `xml.balancing.effects.NewAwEffects`, `xml.technical.NotificationFilter`, `xml.balancing.guild.Perks`,
  `xml.balancing.city.PremiumBuildingHintsElves/Humans`, `xml.balancing.world_map.ProvinceDifficulties`,
  `xml.balancing.quests.QuestGivers`, `xml.balancing.RaceSpecificResources`, `xml.balancing.ResearchTechnologies`,
  `xml.balancing.research.ResearchTechnologiesEarlyElves/EarlyHumans/Elves/Humans`, `xml.balancing.ResearchTechnologySections`,
  `xml.balancing.rewards.reward_selection_kit.RewardSelectionKit`, `xml.balancing.city.SetBuildings`, `…SetOverviews`,
  `xml.balancing.SoundSettings`, `xml.balancing.city.SpellsById`, `xml.balancing.city.StreetInhabitants`, `xml.balancing.Trophies`,
  `xml.tutorial.TutorialElves/Humans`, `xml.balancing.videoads.VideoAdCityIncidents`, `…VideoAdRewards`,
  `xml.balancing.rewards.WeightedRewards`. (Seasonal-event data uses `LoadSeasonalEventDataCommand` with
  event-specific ids — see `10-events-economy-misc.md`.)
* Loading: each `AbstractStaticLoadCommand` subclass (L383159; e.g. `LoadBuildingSetsCommand`) does
  `registry.register(this)` (id → command), then `service.request(staticData, cb)` (or the
  `StaticDataCache` if `canBeCached`), `parser.parse(text)` (→ VOs), `apply(data)` into its model, then
  **`diffService.request(staticData)`** and completes on `"StaticDataEvent::diff_loading_finished"`.
* **Diff / feature manifests**: `ManifestService.getManifests()` (L15479, `"ManifestService"`, returns a
  Future of `ManifestVO[]` — `{type, nestedPath, manifest: {id → hash}}`, L532135) is called by
  `LoadFeatureManifestsCommand` (L391548) at boot and by `PrepareSeasonalEventsCommand` (L544234);
  results go to static `ManifestModel._manifests`. `StaticDataDiffService.request(sd)` (L580779) → for
  every manifest that has a hash for `sd.id` → `StaticDataService.requestDiff(sd, manifest, cb)` →
  URL `<basePath>/static/<nestedPath>/<locale>/<id>_<hash>.json` (e.g. `…//static/feature_flags/ch25/en_DK/xml.balancing.city.Buildings_<md5>.json`)
  → `StaticDataRegistry.process(sd, data)` → `command.apply(data)` **again** (additive: chapter/feature
  content layered on the base file; cached data is `concat`ed).
* `FeaturesService` (L523855, `"FeaturesService"`): `getFeatureFlags()` (fire-and-forget; reply handled
  as push `getFeatureFlags` by `FeaturesController` → `FeatureModel`); `"getFeatures"` push carries
  `FeaturesVO{unlocked:[…]}` (L530121). Feature flags gate e.g. `crafting_redesign`, `show_console`.
* Extension: `src/inject/nonSpecificMatchers.ts` regexes catch the base and `feature_flags/ch<N>` Buildings
  files, Items, EffectConfigs, RewardSelectionKit, PremiumBuildingHintsHumans, Goods, EvolvingBuildings,
  BattleUnitTypes, ResearchTechnologies(Humans|Elves) and post them as `BUILDINGS_ALL`/`BUILDINGS_FEATURE`/`ITEMS`/…
  messages (`src/inject/nonSpecificMessages.ts` → `src/service-worker/nonSpecificRequestHandler.ts`).

## 8. WebSocket / STOMP

There is **no WebSocket client inside the Haxe bundle** (grep for `WebSocket`, `Stomp`, `SockJS`,
`SUBSCRIBE` finds nothing). The socket lives in page-side JS as `window.socket`; the Haxe side talks to
it through `ExternalUtil` (L658601):

* Outbound: `ExternalUtil.evaluate("socket.connect", [GameUrls.socketGateway])` (flashvar
  `socket_gateway_url`) from `JsConnectionProvider.connect()/onTick()/connectToSocket()` (L17453…),
  and `evaluate("socket.send", [plugin, method, topic, payload, playerId?])` from the chat commands:
  `["chat/rpc","get-history",roomId,{maxMessages:100},playerId]` (L385241),
  `["chat/markasread","update",roomId,{},playerId]` (L385273), `["chat","who",roomId,{},playerId]`,
  `["chat","send",roomId,{message}]` (L385290/L385292). `evaluate` = `executeFunctionByName(name, window, args)`.
* Inbound: `JsConnectionProvider.connect()` registers three callbacks via
  `ExternalUtil.addCallback` → `openfl.external.ExternalInterface.addCallback` (L7017) which sets
  **properties on the game's DOM container element** (`lime_app_Application.current.window.backend.element`):
  `element.disconnect()`, `element.notify(plugin, method, topic, message)`, `element.error(err)`.
  The page's STOMP client calls those.
* Frame shape as seen on the wire (parsed by `src/overlay/parseSocketMessage.ts`; fixture in
  `src/inject/socketResponses.spec.ts`):
  ```
  MESSAGE
  destination:/queue
  subscription:sub-0
  message-id:8
  X-SocketServer-Plugin:events          | chat/rpc | chat | chat/markasread
  X-SocketServer-Method:send-to-user    | get-history | send | who | connected | user-joined | user-left | update-other-user-metadata
  X-UUID:<uuid>
  X-SocketServer-Topic:848933052        | guild.169  (player id, or guild room)
  [X-Correlation:<n>]

  <JSON body>\0
  ```
  Chat bodies: `{"event":"history","payload":{messages,users}}`, `{user,message,timestamp}`, … Game
  pushes (`events` / `send-to-user`): body is a **JSON array of `ServerResponseVO`** exactly like an HTTP
  reply, e.g. `[{"__class__":"ServerResponseVO","requestClass":"AncientWonderService","requestMethod":"phaseUpdated","requestId":1,"responseData":[{"__class__":"ResearchPhaseVO",…}]}]`.
  The server repeats such pushes several times (five copies of one wonder contribution were observed;
  hence `createRepeatFilter` in `src/inject/socketResponses.ts`).
* Client routing — `JsConnectionProvider.onNotify` (L17473): `JSON.parse(message)`; body with `error`
  → `onError`; dispatch `MissingConnectionEvent::MESSAGE_RECEIVED`; `pluginProvider.getPlugin(plugin).process(method, topic, body)`
  → `SocketPluginProvider` (L82883) tries `SocketChatPlugin` (matches `"chat"` / `"chat/rpc"`; hands
  `method` to `ChatProcessorProvider.getProcessor(method)` L385836 — processors: `connected`,
  `get-history`, `send`, `update-other-user-metadata`, `user-joined`, `user-left`, `who`, default; returns `{}`)
  then `InstantUpdatePlugin` (matches anything; returns body). Then `onResult(body)` →
  `decodeResponse` (`parser.parse(JSON.stringify(body))` → `ServerResponse[]`, or `[]` for non-arrays like
  chat's `{}`) → `NetConnectionProviderEvent` → `ProviderRegistry` (registered for this provider by
  `ConnectSocketCommand` L391512 at boot) → `ServiceRegistry.process` → push listeners. So a socket
  push and an HTTP piggy-back are indistinguishable to services.
* Reconnect: `onDisconnect` → `GameClock.scheduleOnce(this, attempts*5000)` → `onTick` → dispatch
  `MissingConnectionEvent::DISCONNECTED` (shows `SocketConnectionIndicator`) and `socket.connect` again,
  max 6 attempts; a received frame resets `_attempts`. `LogService.trackSocketConnection(method)` reports it.
* Extension: `src/inject/inject-main.ts` replaces `window.WebSocket` with `CustomWebSocket`
  (`src/inject/customWebSocket.ts`) before the page's STOMP client is created. It listens once per frame
  (`super.addEventListener('message')`), skips heartbeat `"\n"`, parses the frame, runs the repeat filter,
  calls local handlers whose `responseSelector` matches, posts `socketResponse` (only matcher-wanted,
  non-local responses; `src/chrome/socketResponse.ts` relays them to the service worker as
  `R:<Class>/<method>` with the response standing in for its request and the session borrowed from
  `getLatestSharedInfo()`), and posts every raw frame as `RECEIVED_WEBSOCKET_MESSAGE` (the overlay's
  `OverlayMain.tsx` parses `chat/rpc/get-history`, `chat/send`, `chat/who` for the chat panel).
  `getWebSocketSendHook()` captures `super.send` for sending raw STOMP frames — currently unused.

## 9. Recipes (browser console, MAIN world, after the game loaded)

`window.aviad` is the patched `$hxClasses` (`src/inject/injectMutate.ts`), so every class below is
`aviad['<FQ name>']`.

### (a) Send an arbitrary `serviceName/method` and get the callback

```js
const ACS = aviad['de.innogames.shared.networking.AbstractConnectionService'];
const SR  = aviad['de.innogames.networking.services.registries.ServiceRegistry'];
const svc = new ACS();                          // transport = Providers.JSON, already injected
svc.get_serviceName = () => 'CityMapService';   // wire requestClass (bottom comment of injectMutate.ts does exactly this)
SR.register(svc);                               // <- without this the callback below never fires
svc.request('placeBuilding').withData(['G_Humans_FactoryStone_1', x, y])
   .withCallback(r => console.log('reply', r))  // r = parsed responseData (VO instances)
   .immediate().call();                         // omit immediate() to ride the next 500 ms batch
// later: SR.unregister(svc)   (or svc.dispose())
```
Notes: a bare `AbstractConnectionService` has no ctor listeners, so registering it is safe; do not
register `new aviad['…SomeConcreteService']()` instances (their ctor listeners dereference null models
and a `TypeError` aborts the whole batch fan-out, §4). `svc.eventDispatcher` stays `null` — never call
`svc.dispatch`. `withData` takes ONE array. `svc.request(m).withData([...]).callWithFuture().handle(r => …)`
also works once registered. Alternatively use the game's own registered instance:
`aviad_am.injector.getInstance(aviad['de.innogames.onyx.city.service.NeighborlyHelpService'])`.

### (b) Observe every response (HTTP replies, piggy-backed pushes and socket pushes)

```js
const SR = aviad['de.innogames.networking.services.registries.ServiceRegistry'];
const orig = SR.process;
SR.process = r => { console.log(r.get_fullName(), r.get_requestId(), r.get_result()); return orig(r); };
// restore: SR.process = orig
```
`process` is looked up on the static object at call time, so patching works (unlike
`ProviderRegistry._onRequestSuccessful`, whose reference was captured at registration). For raw JSON
instead of VOs, or from a content script, use the extension's own tap: `window.postMessage`
`aggregateRequestResponse` / `socketResponse` / `RECEIVED_WEBSOCKET_MESSAGE` messages, or the service worker
`R:<Class>/<method>` / `Q:<Class>/<method>` types (`src/chrome/aggregateRequestResponse.ts`,
`src/service-worker/playerSpecificRequestHandler.ts`).

### (c) Register your own push listener for one service

```js
const ACS = aviad['de.innogames.shared.networking.AbstractConnectionService'];
const SR  = aviad['de.innogames.networking.services.registries.ServiceRegistry'];
const tap = new ACS(); tap.get_serviceName = () => 'CityResourcesService';
tap.addPushResponseListener('getResources', vo => console.log('resources push', vo));  // per method
tap.addPushResponseListener('*', vo => console.log('any CityResourcesService response', vo)); // wildcard
SR.register(tap);
```
Fires for every response whose `requestClass` is that service, whatever the channel; honours
`handleOnlyLastPushResponses` suppression (static `_pushResponseMap`). Concrete services expose the same
via `addSafePushResponse(<constant>, cb)` (returns the service for chaining).

### (d) Send a chat / socket command

`aviad['de.innogames.shared.util.ExternalUtil'].evaluate('socket.send', ['chat','send', roomId, {message:'hi'}])`
(page-side `window.socket` must exist). Reading the socket URL: `aviad['de.innogames.strategycity.main.utils.GameUrls'].get_instance().socketGateway`;
JSON gateway (with `h=`): `.jsonGateway`.

## Open questions / not verified

* Whether the `h=` query value is byte-identical to flashvar `sid` (`ApplicationParams.sid`) — both are
  read from the page; the signature uses the URL's `h`, which is what matters.
* Whether an `ExceptionService.exception` push carries the failing request's `requestId` and whether the
  server also omits the reply for that request (assumed from the code: nothing else could satisfy the
  one-shot callback).
* The page-side `window.socket` STOMP client (connect/subscribe destinations `/queue`, `sub-0`, auth
  headers, `X-Correlation` semantics) is not in the bundle and was not read; only its observable frames
  (extension fixtures) are documented.
* `JsConnectionProvider` is receive-only (`canSendRequest()==false`); whether any code path uses
  `withProvider(JsConnectionProvider)` was not found (no `withProvider(` callers).
* The `_waitingForResponse` stuck-after-ioError observation and the `decodeResponse` `null.length` on a
  non-array reply are read from code, not reproduced.
* The claim that hand-constructed services' `withCallback` never fires is derived from
  `ServiceRegistry.process` iterating only registered instances; it matches the extension's design
  (every such call has a `responseSelector` in `playerSpecificMatchers.ts`) but was not confirmed at
  runtime.
* `HandlersRegistry.addErrorHandler` has no callers in this snapshot; a future build might add one.
