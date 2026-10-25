# Elvenar client reverse-engineering notes

Knowledge base about the compiled Elvenar web client (Haxe → JavaScript) and about how the
ElvenAssist extension taps into it. Everything gleaned about the game's internals belongs here,
so it is not re-derived from the 52 MB bundle each time.

## Sources this is built from

| Source | What | Notes |
|---|---|---|
| `tmp/elvenar-release-full-reveng.js` | The **unminified** "full" game bundle, snapshot **Feb 12 2026**, `Haxe 5.0.0-preview.1`, 787,964 lines | `tmp/` is git-ignored — keep the file locally. All `L<number>` line references in these docs point into THIS file. |
| `tmp/elvenar-release-full-20260314.js` | March 14 2026 snapshot | Used only to confirm things still exist. |
| `tmp/elvenar-release-min*.js` | The minified bundle the game normally loads | The extension patches the *min* variant in production; anchors differ (see 06). |
| `tmp/rehydrated/<date>-<hash8>[-<label>]/` | One folder per min bundle run through `tools/rehydrate.js` | How newer clients are read: real class/enum/helper names, local variables still `a`, `b`, `f`. Kept side by side: `2026-08-15-09bdb30f`, `2026-10-25-60c1f705-release`, `2026-10-25-7a5bc815-beta`. |
| `src/inject/**` | The extension's MAIN-world injected script and its game-driving helpers | The "how we hook in" side. |

Re-anchoring on a newer snapshot: every reference carries the fully-qualified class name as well as
a line number; grep the name (`grep -n '"de.innogames.onyx.city.services.CityMapService"'`) and
rebuild the indexes with `node rev-eng/tools/build-index.js <snapshot>`.

## Files

Read **13** first, then **06** (how we hook in) and **04**/**05** (how to call things); the rest are per-domain references.

| File | Read it for |
|---|---|
| [01-haxe-runtime-shape.md](01-haxe-runtime-shape.md) | How compiled Haxe looks: `$hxClasses`, `$hxEnums`, class/enum layout, `get_`/`set_` accessors, StringMap, tink futures, `ExternalUtil` JS bridge, entry point |
| [02-package-map.md](02-package-map.md) | What lives in which package; "where to look for X" |
| [03-bootstrap-di-commands-events.md](03-bootstrap-di-commands-events.md) | Startup sequence, `ApplicationModel`, Robotlegs injector, event → command map, mediators, windows; recipes to run commands / get singletons / dispatch events |
| [04-networking-layer.md](04-networking-layer.md) | `NetConnectionService`/`AbstractConnectionService`, request builder chain, wire format, signature, push responses, static data, websocket; why `new SomeService()` works from outside DI |
| [05-services-catalog.md](05-services-catalog.md) | Every service class, its wire `serviceName`, every RPC method with payload shape; ✅ marks what the extension already calls |
| [06-extension-hooks-and-recipes.md](06-extension-hooks-and-recipes.md) | Exactly how `injectMutate.ts` patches the bundle, the `window.aviad*` surface, XHR/WebSocket interception, every implemented action, and how to add a new hook |
| [07-worldmap-tournaments-battle.md](07-worldmap-tournaments-battle.md) | Hex map, provinces, encounters, negotiate/cater, battles, unit payloads, tournaments |
| [08-spire.md](08-spire.md) | Spire map/state, diplomacy minigame internals, spire battles, rewards |
| [09-city-engine-and-buildings.md](09-city-engine-and-buildings.md) | Iso engine & engine events, city map / entities / production, treasures, camera, windows |
| [10-social-neighbours-aw-spells.md](10-social-neighbours-aw-spells.md) | Neighbourly help, visiting, ancient wonders, spells, fellowships, rankings, messaging |
| [11-events-economy-misc.md](11-events-economy-misc.md) | Seasonal/main events, chests, quests, resources, trade, inventory, crafting, tech tree, meta services (startup/log/settings/features) |
| [12-models-and-startup-data.md](12-models-and-startup-data.md) | Client-side state: models, VOs, startup payload, BigInt numbers, server time, static data lookups |
| [13-key-findings-and-errata.md](13-key-findings-and-errata.md) | **Start here for the punchlines**: the 20 findings that change how to drive the game, errata against the extension's own code/docs, cross-snapshot notes |

## Indexes and tools

| Path | What |
|---|---|
| `index/classes.tsv` | `FQ name \t line \t compiled identifier` for all 12,313 registered classes |
| `index/enums.tsv` | Same for the 141 Haxe enums |
| `index/services-raw.md`, `index/services.json` | Mechanically extracted service/RPC catalog (seed for 05) |
| `tools/build-index.js` | Rebuilds `classes.tsv` / `enums.tsv` from a snapshot; `[outDir]` for others (rehydrate.js uses it for each build's `index/`) |
| `tools/rehydrate.js` | Turns a minified bundle into readable source named like the full build (see below) |
| `tools/extract-services.js` | Rebuilds the raw services catalog |
| `tools/focus-probe.js` | DevTools console probe: rAF/timer delivery rate, visibility/focus events, bootstrap step transitions, optional rAF keep-alive (03 §1.4a) |

Quick lookups:

```bash
# where is a class?
grep -P '^de.innogames.onyx.spire.wrappers.SpireEncounter\t' rev-eng/index/classes.tsv
# read it
sed -n '123400,123480p' tmp/elvenar-release-full-reveng.js
# all classes in a package
grep -P '^de.innogames.onyx.tournaments[^\t]*\t' rev-eng/index/classes.tsv
```

## Reading a newer client (rehydrate)

Innogames only ever shipped the full build once (Feb 12). Newer clients come minified, but Haxe +
Closure keep every class/enum's FQ name (`X.__name__`), every prototype member name and every
string literal, so a min bundle can be renamed back to full-build identifiers:

```bash
node rev-eng/tools/rehydrate.js tmp/elvenar-release-min-<hash>.js --label release   # ~45 s, ~9 GB peak memory
```

Each build lands in its own folder, so every version stays available for comparison:

```
tmp/rehydrated/<download date>-<hash8>[-<label>]/
  source.min.js   copy of the input (mtime kept)     rehydrated.js   the readable source
  names.json      see below                          index/          classes.tsv + enums.tsv for it
  info.json       source, label, size, dates, reference, match counts
```

`rehydrated.js` reads like the full build except that local variables stay minified. `names.json`
lists `names` (minified → recovered, useful for re-anchoring
`injectMutate.ts` patches), `guessed` (names from a similarity match; also marked in the source with
a `/* rehydrate: guessed name (...) */` comment, so check them before relying on one), `newTypes`
(classes/enums the Feb build does not have, which is a quick "what's new in this client" list) and
`unmatched` (top-level helpers still minified, mostly module-level functions added since Feb).
Rehydrated line numbers belong to that file only; docs keep citing the Feb snapshot.

## Conventions

- `pkg.Class.method (L123456)` — fully-qualified name plus snapshot line, always both.
- Compiled identifier ↔ FQ name: `de_innogames_onyx_x_Y` ↔ `$hxClasses["de.innogames.onyx.x.Y"]`.
- "Wire name" = the string returned by a service's `get_serviceName()`; it is what appears as
  `requestClass` on the wire and can differ from the class name.
- Recipes are written for the MAIN-world console / `src/inject/local/*.ts`, assuming the
  `window.aviad*` globals installed by `injectMutate.ts` (see 06).
- Each doc ends with **Open questions / not verified** — things read but not confirmed live.
