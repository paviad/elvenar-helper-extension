import {
  goodAt,
  Hex,
  hexKey,
  isCityAt,
  neighbours,
  PROVINCE_GOODS,
  provinceDistance,
  ProvinceGood,
  tierAt,
} from './worldMapGeometry';
import { WorldMapState } from './worldMapState';

/** In the order a province goes through them, last to first. */
export const PROVINCE_STATUSES = ['completed', 'incomplete', 'scouting', 'scoutable', 'locked'] as const;

export type ProvinceStatus = (typeof PROVINCE_STATUSES)[number];

export const PROVINCE_STATUS_LABELS: Record<ProvinceStatus, string> = {
  completed: 'Completed',
  incomplete: 'Incomplete',
  scouting: 'Being scouted',
  scoutable: 'Scoutable',
  locked: 'Locked',
};

export const ENCOUNTERS_PER_PROVINCE = 8;

export interface Province extends Hex {
  key: string;
  good: ProvinceGood;
  /** The tier of the good, 1 to 3. */
  tier: number;
  /** Rings out from the city, as the game counts them: the nearest ring is 0. */
  distance: number;
  status: ProvinceStatus;
  /** Encounters done, 0 to 8. */
  done: number;
  /** Coins to send the scout, on provinces not scouted yet. */
  cost?: number;
  /** Seconds the scout takes, on provinces not scouted yet. */
  time?: number;
  /** The game's difficulty level, 1 to 5, on provinces not scouted yet. */
  difficulty?: number;
  /** When the scout arrives, on the province being scouted. */
  endsAt?: number;
}

export interface WorldMapView {
  home: Hex;
  provinces: Province[];
  /**
   * How many of the provinces shown as completed are in fact incomplete ones whose whereabouts
   * the game has not given yet. Undefined while the game's count of completed provinces is unknown.
   */
  unlocated?: number;
}

/**
 * More provinces than any city has scouted. Walking past it means the frontier has a gap, which
 * would otherwise fill the whole grid.
 */
const MAX_SCOUTED = 20500;

/**
 * Every province the stored map can speak for. The scouted ones are found by walking out from the
 * city across province hexes until the frontier stops the walk: the game lists every unscouted
 * province that touches a scouted one, so the frontier closes the scouted ones in. A scouted
 * province is completed unless it is known to be incomplete.
 *
 * Null until the map has been opened once, and when the frontier turns out not to close.
 */
export const deriveWorldMap = (state: WorldMapState | undefined, now: number): WorldMapView | null => {
  const home = state?.home;
  if (!state || !home || state.frontierAt === undefined) {
    return null;
  }

  const make = (hex: Hex, status: ProvinceStatus, done: number): Province => ({
    r: hex.r,
    q: hex.q,
    key: hexKey(hex.r, hex.q),
    good: goodAt(hex.r, hex.q),
    tier: tierAt(hex.r),
    distance: provinceDistance(home, hex),
    status,
    done,
  });

  const provinces = new Map<string, Province>();
  for (const f of state.frontier) {
    provinces.set(hexKey(f.r, f.q), {
      ...make(f, f.unlocked ? 'scoutable' : 'locked', 0),
      cost: f.cost,
      time: f.time,
      difficulty: f.difficulty,
    });
  }
  // A scout whose time is up has arrived, whether or not the game has been asked since.
  const scouting = state.scout && state.scout.endsAt > now ? state.scout : undefined;
  const arrived = state.scout && !scouting ? hexKey(state.scout.r, state.scout.q) : undefined;
  if (scouting) {
    provinces.set(hexKey(scouting.r, scouting.q), { ...make(scouting, 'scouting', 0), endsAt: scouting.endsAt });
  }

  const incompleteDone = (key: string) => state.incomplete[key] ?? (key === arrived ? 0 : undefined);

  let scouted = 0;
  let incomplete = 0;
  const visited = new Set<string>([hexKey(home.r, home.q)]);
  const queue: Hex[] = [home];
  for (let hex = queue.pop(); hex; hex = queue.pop()) {
    for (const next of neighbours(hex.r, hex.q)) {
      const key = hexKey(next.r, next.q);
      if (visited.has(key) || provinces.has(key) || isCityAt(next.r, next.q)) {
        continue;
      }
      visited.add(key);
      queue.push(next);
      if (++scouted > MAX_SCOUTED) {
        return null;
      }
      const done = incompleteDone(key);
      if (done === undefined) {
        provinces.set(key, make(next, 'completed', ENCOUNTERS_PER_PROVINCE));
      } else {
        incomplete++;
        provinces.set(key, make(next, 'incomplete', done));
      }
    }
  }

  const unlocated =
    state.completedTotal === undefined ? undefined : Math.max(0, scouted - state.completedTotal - incomplete);

  return {
    home,
    provinces: [...provinces.values()].sort((a, b) => a.distance - b.distance || a.r - b.r || a.q - b.q),
    unlocated,
  };
};

export type GoodCounts = Record<ProvinceStatus, number>;

const noCounts = (): GoodCounts => ({ completed: 0, incomplete: 0, scouting: 0, scoutable: 0, locked: 0 });

/** How many provinces of each good are in each state. */
export const countByGood = (provinces: Province[]): Record<ProvinceGood, GoodCounts> => {
  const counts = Object.fromEntries(PROVINCE_GOODS.map((good) => [good, noCounts()])) as Record<
    ProvinceGood,
    GoodCounts
  >;
  for (const province of provinces) {
    counts[province.good][province.status]++;
  }
  return counts;
};

/** What the overlay is told after each answer about the map. */
export interface WorldMapStatus {
  /** Incomplete provinces the game has not placed yet; see {@link WorldMapView.unlocated}. */
  unlocated: number;
}

export const worldMapStatus = (state: WorldMapState | undefined, now: number): WorldMapStatus => ({
  unlocated: deriveWorldMap(state, now)?.unlocated ?? 0,
});
