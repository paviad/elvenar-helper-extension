import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { Hex, hexKey } from './worldMapGeometry';

/** A province next to the scouted ones, which the scout can be sent to or soon can. */
export interface FrontierProvince extends Hex {
  /** False while the game wants bordering provinces completed first. */
  unlocked: boolean;
  /** Coins to send the scout. */
  cost: number;
  /** Seconds the scout takes, after the player's reductions. */
  time: number;
  /** The game's difficulty level, 1 (very easy) to 5 (very hard). */
  difficulty: number;
}

export interface ScoutInProgress extends Hex {
  /** When the scout arrives, on this machine's clock. */
  endsAt: number;
}

/**
 * What is kept of a city's world map. It is far less than the map: the scouted provinces are all
 * the ones the frontier closes in, and a province's good follows from where it is, so the frontier
 * and the provinces still incomplete are enough to tell every province's state.
 */
export interface WorldMapState {
  /** Where the player's city is. */
  home?: Hex;
  frontier: FrontierProvince[];
  /** When the frontier was last read. Absent until the map has been opened once. */
  frontierAt?: number;
  scout?: ScoutInProgress;
  /** Encounters done in each scouted province known to be incomplete, keyed by `r,q`. */
  incomplete: Record<string, number>;
  /** When the game last listed every incomplete province at once. */
  incompleteListAt?: number;
  /** How many provinces the game says are completed. */
  completedTotal?: number;
}

export const emptyWorldMap = (): WorldMapState => ({ frontier: [], incomplete: {} });

// The game leaves a number out of its JSON when it is 0, coordinates included.

interface LocationVO {
  r?: number;
  q?: number;
}

interface ScoutProvinceVO {
  costs?: number;
  location?: LocationVO;
  state?: string;
  difficulty?: number;
  totalTime?: number;
  /** Negative: what the player's reductions take off `totalTime`. */
  reducedTime?: number;
}

interface ScoutVO {
  destination?: LocationVO;
  time_left?: number;
}

interface MapProvinceVO extends LocationVO {
  __class__?: string;
  player_encounters_amount?: number;
  total_encounters_amount?: number;
  /** -1 on the player's own city. */
  distance?: number;
}

interface WorldMapAreaVO {
  provinces?: MapProvinceVO[];
}

interface WorldMapStartUpVO {
  locations_to_scout?: ScoutProvinceVO[];
  player_world_map_area_vo?: WorldMapAreaVO;
  scout?: ScoutVO;
}

interface StartScoutVO {
  locations_to_scout?: ScoutProvinceVO[];
  scout?: ScoutVO;
}

interface UnlockEncounterResultVO extends LocationVO {
  __class__?: string;
  /** Present only on the encounter that completes the province. */
  provinceRewards?: unknown[];
}

interface InstantBattleResultVO {
  encounter_result?: UnlockEncounterResultVO;
}

interface EffectSourceVO {
  name?: string;
  value?: number;
}

const DEFAULT_ENCOUNTERS = 8;

const toFrontier = (locations: ScoutProvinceVO[] | undefined): FrontierProvince[] =>
  (locations ?? []).map((location) => ({
    r: location.location?.r ?? 0,
    q: location.location?.q ?? 0,
    unlocked: location.state === 'UNLOCKED',
    cost: location.costs ?? 0,
    time: Math.max(0, (location.totalTime ?? 0) + (location.reducedTime ?? 0)),
    difficulty: location.difficulty ?? 0,
  }));

const toScout = (scout: ScoutVO | undefined, now: number): ScoutInProgress | undefined =>
  scout?.destination
    ? { r: scout.destination.r ?? 0, q: scout.destination.q ?? 0, endsAt: now + (scout.time_left ?? 0) * 1000 }
    : undefined;

/** Takes what the map's areas say of the provinces in them: incomplete ones in, finished ones out. */
const withAreas = (incomplete: Record<string, number>, areas: WorldMapAreaVO[]): Record<string, number> => {
  const next = { ...incomplete };
  for (const province of areas.flatMap((area) => area.provinces ?? [])) {
    if (province.__class__ !== 'GoodProvinceVO') {
      continue;
    }
    const key = hexKey(province.r ?? 0, province.q ?? 0);
    const done = province.player_encounters_amount ?? 0;
    if (done < (province.total_encounters_amount ?? DEFAULT_ENCOUNTERS)) {
      next[key] = done;
    } else {
      delete next[key];
    }
  }
  return next;
};

/**
 * A scout that has arrived leaves a province nobody has fought in yet. The game never says so
 * when it happens unseen: the scout it reports is simply another one, or none.
 */
const withScoutArrived = (state: WorldMapState, scoutNow?: ScoutInProgress): WorldMapState => {
  const { scout } = state;
  if (!scout || (scoutNow && scoutNow.r === scout.r && scoutNow.q === scout.q)) {
    return state;
  }
  return { ...state, scout: undefined, incomplete: { [hexKey(scout.r, scout.q)]: 0, ...state.incomplete } };
};

const withEncounterWon = (state: WorldMapState, result: UnlockEncounterResultVO | undefined): WorldMapState => {
  if (result?.__class__ !== 'UnlockEncounterResultVO') {
    return state;
  }
  const key = hexKey(result.r ?? 0, result.q ?? 0);
  const done = state.incomplete[key];
  const incomplete = { ...state.incomplete };
  if (result.provinceRewards || (done !== undefined && done + 1 >= DEFAULT_ENCOUNTERS)) {
    delete incomplete[key];
  } else if (done !== undefined) {
    incomplete[key] = done + 1;
  } else {
    // A province not known to be incomplete: a tournament or Spire fight, or one whose count was
    // never seen and so cannot be added to.
    return state;
  }
  return { ...state, incomplete };
};

/**
 * What one answer from the game changes in the stored map. Returns the state it was given, the
 * same object, when the answer says nothing about the map.
 */
export const applyWorldMapResponse = (
  state: WorldMapState,
  entry: ElvenarRequestResponseEntry,
  now: number,
): WorldMapState => {
  const data = entry.responseData;
  switch (`${entry.requestClass}/${entry.requestMethod}`) {
    case 'WorldMapService/fetchInitialWorldMapData': {
      const startUp = (data ?? {}) as WorldMapStartUpVO;
      const homeArea = startUp.player_world_map_area_vo;
      const home = homeArea?.provinces?.find((p) => p.__class__ === 'PlayerProvinceVO' && p.distance === -1);
      const scout = toScout(startUp.scout, now);
      const base = withScoutArrived(state, scout);
      // Spelled out in full, so the map starts over from only what is still read here.
      return {
        home: home ? { r: home.r ?? 0, q: home.q ?? 0 } : base.home,
        frontier: toFrontier(startUp.locations_to_scout),
        frontierAt: now,
        scout,
        incomplete: withAreas(base.incomplete, homeArea ? [homeArea] : []),
        incompleteListAt: base.incompleteListAt,
        completedTotal: base.completedTotal,
      };
    }
    case 'WorldMapService/fetchAreas':
    case 'WorldMapService/updateMapArea':
      return { ...state, incomplete: withAreas(state.incomplete, (data as WorldMapAreaVO[] | undefined) ?? []) };
    case 'WorldMapService/getIncompleteProvinces':
      return {
        ...state,
        incomplete: withAreas({}, [{ provinces: (data as MapProvinceVO[] | undefined) ?? [] }]),
        incompleteListAt: now,
      };
    case 'WorldMapScoutService/startScouting': {
      const started = (data ?? {}) as StartScoutVO;
      const scout = toScout(started.scout, now);
      return {
        ...withScoutArrived(state, scout),
        frontier: toFrontier(started.locations_to_scout),
        frontierAt: now,
        scout,
      };
    }
    case 'WorldMapScoutService/findProvincesToScout':
      return { ...state, frontier: toFrontier(data as ScoutProvinceVO[] | undefined), frontierAt: now };
    case 'WorldMapScoutService/removeScout':
      return withScoutArrived(state);
    case 'UnlockEncounterService/unlockEncounterByTrading':
      return withEncounterWon(state, data as UnlockEncounterResultVO | undefined);
    case 'BattlefieldService/instantBattle':
      return withEncounterWon(state, (data as InstantBattleResultVO | undefined)?.encounter_result);
    case 'EffectsService/getAllSources':
    case 'EffectsService/updateSources': {
      const source = (data as EffectSourceVO[] | undefined)?.find((s) => s.name === 'completedProvinces');
      const completed = source?.value ?? 0;
      return !source || completed === state.completedTotal ? state : { ...state, completedTotal: completed };
    }
    default:
      return state;
  }
};
