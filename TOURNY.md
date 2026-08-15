# Tournament (Tourny) Feature

> **kphunt branch only.** This feature and this document do not exist on `master`.

The Tourny tab plans tournament provinces from the overlay: what each encounter will field, what
counters it, whether you own enough of that unit, and what a round costs — plus fight/cater actions
driven straight from the page.

Introduced in `f11a5f7` (*feat: Tourny*).

---

## 1. Architecture

```
 Game page (MAIN world)                Extension
 ─────────────────────                 ─────────
 XHR / static JSON
        │
        │  GlobalHttpInterceptorService
        ▼
 inject/*Matchers.ts  ──postMessage──▶  content script
                                             │
                                             ▼
                                     service-worker/*RequestHandler.ts
                                             │  elvenar/processTourny*.ts
                                             ▼
                                     overlay (OverlayMain listeners)
                                             │
                                             ▼
                                     overlayStore.tournyData ──▶ <Tourny />
                                                                     │
 window.aviad services  ◀──relayToGame──── inject/local/tourny*.ts ◀──┘
```

Two interception paths are used:

| Path | Matcher file | Handler | Used for |
|---|---|---|---|
| **Player-specific** (per-session game RPC) | `src/inject/playerSpecificMatchers.ts` | `src/service-worker/playerSpecificRequestHandler.ts` | province overview, province info, timers, unit purchases |
| **Non-specific** (static CDN balancing files) | `src/inject/nonSpecificMatchers.ts` | `src/service-worker/nonSpecificRequestHandler.ts` | the battle-unit almanac |

---

## 2. Intercepted messages (inbound)

### 2.1 Player-specific responses

All four are declared in [`playerSpecificMatchers.ts`](src/inject/playerSpecificMatchers.ts) and
routed by key `R:<requestClass>/<requestMethod>` in
[`playerSpecificRequestHandler.ts`](src/service-worker/playerSpecificRequestHandler.ts).

| Key | Processor | Returns |
|---|---|---|
| `R:TournamentService/getProvincesOverview` | [`processTournyProvincesOverview`](src/elvenar/processTournyProvincesOverview.ts) | `TournyProvince[]` |
| `R:WorldMapService/getProvinceInformation` | [`processTournyProvinceInformation`](src/elvenar/processTournyProvinceInformation.ts) | `TournyProvinceInformation` |
| `R:WorldMapService/updateTournamentTime` | [`processTournyUpdateTime`](src/elvenar/processTournyUpdateTime.ts) | `TournyTime` |
| `R:ArmyService/addUnit` | [`processTournyAddUnits`](src/elvenar/processTournyAddUnits.ts) | `TournyAddUnits` |

Processor notes:

- **`processTournyProvincesOverview`** normalises `q`/`r` to `0` when absent and converts the
  *relative* `upgradeTime` (seconds) into an absolute `upgradeTimeEnd` (`Date.now() + t*1000`), so
  the countdown survives re-renders.
- **`processTournyProvinceInformation`** — the response body has **no coordinates**. The processor
  reads them back off the *request* (`requestData` is the positional array `[r, q]`) and stamps
  `r`/`q` onto the result. This is why the processor takes a third `request` argument.
- **`processTournyUpdateTime`** is a pass-through of `responseData`.
- **`processTournyAddUnits`** has a side effect: it finds the matching squad in the cached
  `accountData.cityQuery.armyDetails.unitSquads` and increments `size`, then replaces the array so
  troop counts stay live after a purchase without a full city refresh.

### 2.2 Non-specific response — the almanac

```
https://ox*.innogamescdn.com/frontend//static/<lang>_<CC>/xml.balancing.battle.BattleUnitTypes_<md5>.json
```

Matcher id `battleUnitTypes`, message type `BATTLE_UNIT_TYPES`
([`nonSpecificMatchers.ts`](src/inject/nonSpecificMatchers.ts),
[`nonSpecificMessages.ts`](src/inject/nonSpecificMessages.ts)). It must also be allow-listed in
[`setupNonSpecificRequestInterceptedListener.ts`](src/overlay/setupNonSpecificRequestInterceptedListener.ts).

[`processBattleUnitTypes`](src/elvenar/processBattleUnitTypes.ts) narrows the full
`BattleUnitTypesResponse[]` down to six fields, `smartCompress`es the JSON and stores it under the
`battleUnitTypes` storage key. [`getBattleUnitTypes`](src/elvenar/getBattleUnitTypes.ts) reads it
back, returning `[]` when absent.

This replaced a hardcoded counter table — the scoring now runs on real balancing data.

---

## 3. Outbound messages (overlay → game)

Sent via `relayToGame(type, payload)`; dispatched in
[`inject-main.ts`](src/inject/inject-main.ts).

| Message | Payload | Handler | Effect |
|---|---|---|---|
| `tournyOpen` | `{ q, r }` | [`tournyOpen.ts`](src/inject/local/tournyOpen.ts) | `WorldMapService.getProvinceInformation([r, q])` — loads the encounter |
| `tournyFight` | `TournyFight` | [`tournyFight.ts`](src/inject/local/tournyFight.ts) | `WorldMapBattleService.instantBattle` |
| `tournyCater` | `{ q, r }` | [`tournyCater.ts`](src/inject/local/tournyCater.ts) | `UnlockEncounterService.unlockEncounter(q, r, 0)` |

`tournyFight` and `tournyCater` both follow the action with a refresh chain, 200 ms apart:

```
action → (200ms) → TournamentService.getTournamentProgress
       → (200ms) → WorldMapTournamentService.getProvincesOverview
```

The overview refresh is what feeds the interception path back into the store.

### 3.1 Game services

Constructed from `window.aviad[...]` in [`tourny.ts`](src/inject/local/tourny.ts), typed in
[`aviad.ts`](src/inject/aviad.ts):

| Class path | Method used |
|---|---|
| `de.innogames.onyx.worldmap.service.WorldMapBattleService` | `request('instantBattle').withData([r, q, 0, units])` |
| `de.innogames.onyx.tournaments.services.TournamentService` | `getTournamentProgress(cb)` |
| `de.innogames.onyx.tournaments.services.WorldMapTournamentService` | `getProvincesOverview(cb)` |
| `de.innogames.onyx.worldmap.service.UnlockEncounterService` | `unlockEncounter(q, r, encounterIndex, cb)` |
| `de.innogames.onyx.worldmap.service.WorldMapService` (from `neighbourlyHelp.ts`) | `request('getProvinceInformation').withData([r, q])` |

**Argument-order hazard:** the fluent `withData` calls take `[r, q]` (row first) while
`unlockEncounter` takes `(q, r)`. Both are fed from the same `{ q, r }` payload.

`instantBattle` sends the same squad five times: `[unit, unit, unit, unit, unit]`.

---

## 4. Data structures

### 4.1 Province overview — `src/model/tourny/provincesOverview.ts`

```ts
interface TournyProvince {
  number: number;                  // display index, also the sort key
  q: number; r: number;            // hex coordinates
  level?: number;                  // 6 === fully completed
  encounters?: number;
  rewards?: ProvinceOverviewReward[];
  baseTournamentPointsAmount?: number;
  upgradeTime?: number;            // seconds remaining (from the server)
  upgradeTimeEnd?: number;         // absolute ms — added by the processor
}
```

### 4.2 Province information — `src/model/tourny/provinceInformation.ts`

```ts
interface TournyProvinceInformationRaw {
  good_id: string;                 // the province's good
  encounters: Encounter[];         // Encounter = { enemyWaves, costs }
  encounterRewards: Reward[];
  unitPremiumCosts: UnitPremiumCost[];
  playerSquadSize: number;         // drives squad sizing (see §5)
  provinceRewards: Reward[];
  baseTournamentPointsAmount: number;
}

interface EnemyWave { army: Army[]; squadSize: number; waveIndex: number }
interface Army      { unitTypeId: EnemyUnitType; size: number }
interface Costs     { resources: { gems, scrolls, silk, premium } }   // cater price
```

`TournyProvinceInformation` = the above **plus** the `r`/`q` stamped on by the processor.

### 4.3 Timers and purchases

```ts
interface TournyTime      { r, q, remainingTime, premiumCosts }   // tournamentTime.ts
interface TournyAddUnits  { unitTypeId, size }                    // addUnits.ts
interface TournyFight     { q, r, unit: { __class__: 'UnitSquadVO', unitTypeId, size } }
```

### 4.4 Unit identifiers — `src/model/armyDetails.ts`

```ts
type TrainingBuilding = 'hb' | 'eb' | 'mc' | 'tg';
type TroopType        = 'hm' | 'hr' | 'lm' | 'lr' | 'ma';

type FriendlyUnitType = `${TrainingBuilding}_${TroopType}_${number}`;  // hb_lr_4
type EnemyUnitType    = `mob_${TrainingBuilding}${TroopType}_${number}`; // mob_hblr_5
```

- `hb` = **human** barracks, `eb` = **elf** barracks (mutually exclusive per player),
  `mc` = Mercenary Camp, `tg` = Training Grounds.
- The trailing number is the unit's upgrade level.
- The commit widened these from private aliases to exports and added the `*BaseName` variants.

### 4.5 The almanac — `src/model/battleUnitType.ts`

The full CDN record (`BattleUnitTypesResponse`) carries `hitpoints`, `range`, `initiative`,
`movementPoints`, `baseDamage`, `damageRange`, `retaliation`, `unitClass`, `race`, `origin`,
`trainingTime`, `specialAbilities` and more — but only this subset is persisted:

```ts
type BattleUnitType = Pick<BattleUnitTypesResponse,
  'unitTypeId' | 'name' | 'strengths' | 'attackBonus' | 'unitWeight' | 'defenseBonus'>;

interface AttackDefenseBonus {          // used by strengths, attackBonus, defenseBonus
  light_melee?: number; light_ranged?: number;
  mage?: number; heavy_melee?: number; heavy_ranged?: number;
}
```

- **`strengths`** — small integers `1 | 2 | 3` ("swords"). This is the *only* field the scoring
  reads.
- **`attackBonus` / `defenseBonus`** — percentages (e.g. `90`, `40`). Stored, currently unused.
- **`unitWeight`** — squad-slot cost, used to convert `playerSquadSize` into a unit count.

### 4.6 Overlay state

```ts
interface TournyData {
  provincesOverview: TournyProvince[];
  provinceInformation: Record<string, TournyProvinceInformation>;  // keyed `${r},${q}`
}
```

In [`overlayStore.ts`](src/overlay/overlayStore.ts): `tournyData` is **excluded from persistence**
(it is destructured out of `toPersist`), while `modifiers: StrengthModifier[]` **is** persisted.

The store is assembled by the "Tourny data collector" effect in
[`OverlayMain.tsx`](src/overlay/OverlayMain.tsx). Its notable behaviour is **cache invalidation**:
when a fresh overview shows a province whose `level` changed or whose `upgradeTime` has expired, the
matching `provinceInformation["r,q"]` entry is deleted so stale encounters are never rendered.

---

## 5. The counter engine — `src/overlay/counterCalculation.ts`

```ts
calculateBestCounter(targetArmy, roster, almanac, modifiers) => CounterResult | null
```

**Inputs.** `targetArmy` is the 5-unit enemy wave; `roster` is the player's available units
(`armyDetails.availableUnitTypeIds` ∩ almanac); `almanac` is everything, needed to look up *enemy*
stats for the defensive penalty.

**Parsing.** Troop type and training building are recovered from the id string by regex
(`/(hm|hr|lm|lr|ma)/`, `/(hb|eb|mc|tg)/`) — this works for both `hb_lr_4` and `mob_hblr_5`.

**Scoring**, per enemy in the wave:

```
score      += (ourStrength × multiplier) − (theirStrengthVsUs ÷ multiplier)
counterCount += 1   if ourStrength   > 0
counterCount -= 1   if theirStrength > 0
```

**Quality tiers** come from the **raw** `counterCount` (before modifiers), so a user preference can
never promote a unit into a tier it did not earn — it only wins tie-breaks:

| `counterCount` | Quality |
|---|---|
| 5 | Optimal |
| 4 | Strong |
| 2–3 | Decent |
| 1 | Meh |
| ≤0 | Experimental |

**Sort order:** quality → `counterCount` → `score` → prefer ranged (`lr`/`hr`) → prefer heavy-ranged
with full map range (`hr` from `hb`/`eb`/`mc`).

**Modifiers.** `StrengthModifier { building?, troopType?, factor }` is the user's manual
"prioritise" knob, edited as chips in the tab. A modifier applies when *both* its (optional)
building and troop filters match; matching modifiers multiply together.

**Squad sizing** (in `Tourny.tsx`):

```
neededUnitsForOneSquad = ceil(playerSquadSize / unitWeight)   // as the game does (ArmyModel.getSquadUnits)
totalNeeded            = neededUnitsForOneSquad × 5     // 5 identical squads per encounter
```

compared against the sum of `armyDetails.unitSquads` for that type; a shortfall renders a red
"Not enough units" chip.

**Tests.** [`counterCalculation.spec.ts`](src/overlay/counterCalculation.spec.ts) runs against
[`testAlmanac.ts`](src/overlay/testAlmanac.ts), a ~2,900-line real almanac dump.
⚠️ Several test *names and comment blocks* are stale — they describe outcomes that disagree with
their own assertions (e.g. "should identify a Strong counter (Coverage == 3)" asserts `Decent` /
`counterCount: 2`). The assertions were fitted to actual output; trust the `expect`, not the prose.

---

## 6. UI — `src/overlay/Tourny.tsx`

Tab key `tourny`, label **Tourny**, shortcut **T**.

- **Gating.** The list only renders when a tournament is running — derived from
  `cityQuery.tournaments` containing an entry with `state === 'running' || 'new'`. Otherwise an
  empty state is shown. If `tournyData` is missing entirely, an info alert asks the user to open the
  Tournament Map in game.
- **Sort.** Actionable provinces first, then upgrading, then completed (`level === 6`); ties broken
  by `province.number`.
- **Per-province actions.** `OPEN` when no encounter data is cached; otherwise `FIGHT` + `CATER`.
- **Double-click guard.** Every action button is keyed `${q},${r}:${action}` and disabled for
  `CLICK_COOLDOWN_MS = 2000` after a click; pending timers are cleared on unmount.
- **Ticker.** A 1 s interval drives the upgrade countdown chips.
- **Sprites.** `military_sprite.png` is a 110×22 five-frame sheet (`LM, HR, HM, MA, LR`, 22 px
  stride) declared web-accessible in all three manifests and resolved with
  `chrome.runtime.getURL`.

---

## 7. Domain knowledge

Distilled from `tmp/tourny-guide.txt` (player guide by SapphyreStarLight, Aug 2026). That file is
gitignored, hence this section.

### 7.1 The counter wheel

Cycle: **LM → LR → M → HM → HR → LM**. Every unit is strong against the **next two** classes in the
cycle. How its 4 strength points split depends on the training building:

| Building | vs. next class | vs. class after |
|---|---|---|
| `mc` Mercenary Camp | **3** | 1 |
| `tg` Training Grounds | 1 | **3** |
| `hb` / `eb` Barracks | 2 | 2 |

Confirmed against the almanac: `mc_hr_4` Frog Prince `{lm: 3, lr: 1}`, `tg_hr_4` Senior Orc
Strategist `{lm: 1, lr: 3}`, `hb_hr_4` Rad Mortar and `eb_hr_4` Granite Golem both `{lm: 2, lr: 2}`.

Unit names by slot:

| | LM | LR | M | HM | HR |
|---|---|---|---|---|---|
| **`eb` elf barracks** | Sword Acrobat | Elite Archer | Bud Sorceress | Elder Treant | Granite Golem |
| **`hb` human barracks** | Storm Barbarian | Master Crossbowman | Sacred Priest | Blessed Paladin | Rad Mortar |
| **`tg` training grounds** | Sinister Cerberus | Poison Dryad | Ghastly Banshee | Gruff Orc Warrior | Senior Orc Strategist |
| **`mc` mercenary camp** | Venom Drone Rider | Pro Ranger | Blossom Princess | Vallorian Veteran | Frog Prince |

### 7.2 Tournaments and their enemies

The running tournament's good is carried in the `type` field of the `SeasonalEvent` objects from
`TournamentService/getEvents` — **not** the same `type` seen in `startupService.seasonal_events`,
where `type === 'tournament'` is merely the category discriminator used by `processCityData.ts`.
`getEvents` is **not currently intercepted**.

| Tournament | Tier | Dominant enemy classes | Difficulty | Suggested troops |
|---|---|---|---|---|
| **Steel** | T1 | M | easy | Elite Archer / Crossbowman, Dryad, Pro Ranger |
| **Marble** | T1 | HM | fairly easy | Sorceress / Priest, Dryad, Blossom Mage |
| **Planks** | T1 | LR | moderate–hard | Golem / Mortar, Orc Strategist, Drone Rider + Frog |
| **Crystal** | T2 | M + HR | medium–hard (easier for humans) | Golem / Priest, Cerberus, Warden + Blossom Mage |
| **Scrolls** | T2 | LR + HR | hard | Treant / Priest, Orc Strategist + Dryad, Pro Ranger |
| **Silk** | T2 | LM + HM | — | Treant / Paladin, Dryad, Blossom Princess |
| **Elixir** | T3 | LM + LR + HM | — | Treant or Golem / Mortar, Dryad, Frog |
| **Gems** | T3 | LM + HM + HR | hard | Treant / Priest + Paladin, Cerberus, Frog + Vallorian |
| **Dust** | T3 | LM + M + HR | difficult | Treant / Priest, Cerberus, Frog / Vallorian |

T1 tournaments field **one** dominant enemy class, T2 **two**, T3 **three** — so T2/T3 weeks require
keeping a varied stock of troops.

### 7.3 Recurring tactical rules

- Mage units work when the enemy has **≤ 2 LR**; use HR when there are **> 2 LR**.
- Against 2+ Cerberus ("dogs"): HM if ≤ 2 LR, HR if > 2 LR; HM/HR mixes work well.
- Avoid mages entirely against a Cerberus + LM mix.
- Common blends: `2 HM + 3 HR` when 3+ LR enemies; `3 HM + 2 HR` when 2+ dogs or ≤ 2 LR;
  `1–2 Blossom Mage + 4 Frogs` for LM/HM lineups.
- LR has the highest initiative; Blossom Mage is the fastest mage — both strike first.
- Some units age out: Mortars fade past province ~10–20; Cerberus are strong only in early rounds.
- Cater when the lineup holds 2+ Mistwalkers.
- Boost buildings matter: MMM (mage), ELR (light ranged), UUU, Dwarven Armorer; ancient wonders
  Temple of the Toads (HR), Victory Springs (LM), Dragon Abbey (mage).

---

## 8. Known gaps

Things the guide relies on that the current implementation cannot express:

1. **Mixed squads.** Nearly all expert advice is a blend, but `calculateBestCounter` returns a
   single unit type and `instantBattle` sends it 5×.
2. **Threshold rules.** "Mages if ≤ 2 LR", "HR if > 2 LR" are conditionals on enemy composition;
   the scoring is a linear sum with no thresholds.
3. **Initiative and combat stats.** `initiative`, `range`, `hitpoints`, `baseDamage` are all
   discarded by `processBattleUnitTypes`, so strike-order advice is unimplementable as-is.
4. **`attackBonus` / `defenseBonus`** are persisted but never read — only the 1/2/3 `strengths`
   drive scoring, so units differing only in bonus percentage are treated as identical.
5. **Province / round scaling.** `province.number` and `level` are available but do not influence
   the recommendation.
6. **Ancient wonder and boost levels.** `StrengthModifier` is a manual stand-in; nothing reads the
   player's actual AW levels.
7. **Cater guidance.** The CATER button offers no signal on when catering is the better play, and
   `Costs.resources` (the cater price) is parsed but not surfaced.
8. **Tournament identity.** `TournamentService/getEvents` is not intercepted, so the overlay cannot
   tell *which* tournament is running or pre-warn about its dominant enemy classes.
9. **Only the first encounter/wave is read.** The UI uses `encounters[0].enemyWaves[0].army`;
   later encounters and waves in the province are ignored.
