import { countByGood, deriveWorldMap } from './deriveWorldMap';
import { Hex, hexKey, isCityAt, neighbours } from './worldMapGeometry';
import { FrontierProvince, WorldMapState } from './worldMapState';

const HOME: Hex = { r: 0, q: 0 };
const NOW = 1_000_000;

/** The six provinces around the city: the scouted ones in every test here. */
const INNER = neighbours(HOME.r, HOME.q);
const innerKeys = new Set(INNER.map((h) => hexKey(h.r, h.q)));

/** Every province touching the scouted six, which is what the game lists as the frontier. */
const ring = (): Hex[] => {
  const seen = new Map<string, Hex>();
  for (const hex of INNER.flatMap((h) => neighbours(h.r, h.q))) {
    const key = hexKey(hex.r, hex.q);
    if (!innerKeys.has(key) && !isCityAt(hex.r, hex.q)) {
      seen.set(key, hex);
    }
  }
  return [...seen.values()];
};

const frontier = (hexes: Hex[], unlocked = true): FrontierProvince[] =>
  hexes.map((hex) => ({ ...hex, unlocked, cost: 1000, time: 3600, difficulty: 2 }));

const state = (overrides: Partial<WorldMapState> = {}): WorldMapState => ({
  home: HOME,
  frontier: frontier(ring()),
  frontierAt: NOW,
  incomplete: {},
  ...overrides,
});

const statuses = (view: ReturnType<typeof deriveWorldMap>) =>
  Object.fromEntries((view?.provinces ?? []).map((p) => [p.key, p.status]));

describe('deriveWorldMap', () => {
  it('has nothing to say before the map was opened', () => {
    expect(deriveWorldMap(undefined, NOW)).toBeNull();
    expect(deriveWorldMap({ frontier: [], incomplete: {}, completedTotal: 3 }, NOW)).toBeNull();
  });

  it('takes every province inside the frontier as completed', () => {
    const view = deriveWorldMap(state(), NOW);
    const completed = view?.provinces.filter((p) => p.status === 'completed');
    expect(completed?.map((p) => p.key).sort()).toEqual([...innerKeys].sort());
    expect(completed?.every((p) => p.done === 8 && p.distance === 0)).toBe(true);
    expect(view?.provinces).toHaveLength(6 + ring().length);
  });

  it('shows the frontier as the game gave it', () => {
    const [first, ...rest] = ring();
    const view = deriveWorldMap(state({ frontier: [...frontier([first], false), ...frontier(rest)] }), NOW);
    const locked = view?.provinces.find((p) => p.key === hexKey(first.r, first.q));
    expect(locked).toMatchObject({ status: 'locked', done: 0, cost: 1000, time: 3600, difficulty: 2, distance: 1 });
    expect(view?.provinces.filter((p) => p.status === 'scoutable')).toHaveLength(rest.length);
  });

  it('shows the encounters done in an incomplete province', () => {
    const view = deriveWorldMap(state({ incomplete: { '0,1': 3, '1,0': 0 } }), NOW);
    expect(statuses(view)).toMatchObject({ '0,1': 'incomplete', '1,0': 'incomplete', '0,-1': 'completed' });
    expect(view?.provinces.find((p) => p.key === '0,1')?.done).toBe(3);
  });

  it('counts the incomplete provinces it cannot place', () => {
    // Six scouted, four completed: two are incomplete somewhere
    expect(deriveWorldMap(state({ completedTotal: 4 }), NOW)?.unlocated).toBe(2);
    expect(deriveWorldMap(state({ completedTotal: 4, incomplete: { '0,1': 3 } }), NOW)?.unlocated).toBe(1);
    expect(deriveWorldMap(state({ completedTotal: 4, incomplete: { '0,1': 3, '1,0': 0 } }), NOW)?.unlocated).toBe(0);
    expect(deriveWorldMap(state(), NOW)?.unlocated).toBeUndefined();
  });

  it('ignores an incomplete province outside the frontier', () => {
    const view = deriveWorldMap(state({ completedTotal: 6, incomplete: { '40,40': 2 } }), NOW);
    expect(view?.unlocated).toBe(0);
    expect(view?.provinces.some((p) => p.key === '40,40')).toBe(false);
  });

  it('keeps the province being scouted apart until the scout arrives', () => {
    const [target, ...rest] = ring();
    const key = hexKey(target.r, target.q);
    const scouting = state({ frontier: frontier(rest), scout: { ...target, endsAt: NOW + 5000 }, completedTotal: 6 });

    const during = deriveWorldMap(scouting, NOW);
    expect(during?.provinces.find((p) => p.key === key)).toMatchObject({ status: 'scouting', endsAt: NOW + 5000 });
    expect(during?.unlocated).toBe(0);

    // Its own neighbours are not on the frontier yet, so the arrival is only looked at here
    const after = deriveWorldMap({ ...scouting, frontier: frontier([...rest, ...outerOf(target)]) }, NOW + 6000);
    expect(after?.provinces.find((p) => p.key === key)).toMatchObject({ status: 'incomplete', done: 0 });
    expect(after?.unlocated).toBe(0);
  });

  it('gives up on a frontier that does not close', () => {
    expect(deriveWorldMap(state({ frontier: frontier(ring().slice(1)) }), NOW)).toBeNull();
  });
});

/** The provinces a newly scouted one brings onto the frontier. */
const outerOf = (hex: Hex): Hex[] => {
  const known = new Set([...innerKeys, ...ring().map((h) => hexKey(h.r, h.q))]);
  return neighbours(hex.r, hex.q).filter((n) => !known.has(hexKey(n.r, n.q)) && !isCityAt(n.r, n.q));
};

describe('countByGood', () => {
  it('counts each good by state', () => {
    const view = deriveWorldMap(state({ incomplete: { '0,1': 3 } }), NOW);
    const counts = countByGood(view?.provinces ?? []);
    const total = Object.values(counts).reduce(
      (sum, c) => sum + c.completed + c.incomplete + c.scouting + c.scoutable + c.locked,
      0,
    );
    expect(total).toBe(view?.provinces.length);
    expect(Object.values(counts).reduce((sum, c) => sum + c.incomplete, 0)).toBe(1);
    expect(Object.values(counts).reduce((sum, c) => sum + c.completed, 0)).toBe(5);
  });
});
