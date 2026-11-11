import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { applyWorldMapResponse, emptyWorldMap, WorldMapState } from './worldMapState';

const NOW = 1_000_000;

const answer = (requestClass: string, requestMethod: string, responseData: unknown): ElvenarRequestResponseEntry => ({
  __class__: 'ServerResponseVO',
  requestClass,
  requestMethod,
  requestData: undefined,
  responseData,
  requestId: 1,
});

const apply = (state: WorldMapState, requestClass: string, requestMethod: string, responseData: unknown) =>
  applyWorldMapResponse(state, answer(requestClass, requestMethod, responseData), NOW);

const scoutLocation = (r: number, q: number, state = 'UNLOCKED') => ({
  __class__: 'ScoutProvinceVO',
  costs: 24000000,
  location: { __class__: 'ProvinceLocationVO', r, q },
  state,
  difficulty: 2,
  totalTime: 795241,
  distance: 20,
  reducedTime: -445334,
});

const province = (r: number, q: number, done?: number) => ({
  __class__: 'GoodProvinceVO',
  r,
  q,
  good_id: 'silk',
  player_encounters_amount: done,
  total_encounters_amount: 8,
});

const city = (r: number, q: number, distance: number) => ({ __class__: 'PlayerProvinceVO', r, q, distance });

describe('applyWorldMapResponse', () => {
  it('leaves the map alone for answers about anything else', () => {
    const state = emptyWorldMap();
    expect(apply(state, 'CityResourcesService', 'getResources', {})).toBe(state);
  });

  describe('opening the map', () => {
    const opened = (scout?: unknown) => ({
      __class__: 'WorldMapStartUpVO',
      locations_to_scout: [scoutLocation(-67, -40), scoutLocation(-53, -25, 'LOCKED_COMPLETE_BORDERING_PROVINCES')],
      player_world_map_area_vo: {
        id: '-16,-14',
        provinces: [province(-46, -40, 8), province(-48, -41, 5), city(-46, -42, -1), city(-48, -42, 1)],
      },
      scout,
    });

    it('reads the city, the frontier and the home area', () => {
      const state = apply(emptyWorldMap(), 'WorldMapService', 'fetchInitialWorldMapData', opened());
      expect(state).toEqual({
        home: { r: -46, q: -42 },
        frontier: [
          { r: -67, q: -40, unlocked: true, cost: 24000000, time: 349907, difficulty: 2 },
          { r: -53, q: -25, unlocked: false, cost: 24000000, time: 349907, difficulty: 2 },
        ],
        frontierAt: NOW,
        scout: undefined,
        incomplete: { '-48,-41': 5 },
      });
    });

    it('reads the scout on its way', () => {
      const scout = { destination: { r: -25, q: -52 }, time_left: 100, total_time: 349907 };
      const state = apply(emptyWorldMap(), 'WorldMapService', 'fetchInitialWorldMapData', opened(scout));
      expect(state.scout).toEqual({ r: -25, q: -52, endsAt: NOW + 100_000 });
    });

    it('takes a scout no longer mentioned as arrived', () => {
      const before = { ...emptyWorldMap(), scout: { r: -25, q: -52, endsAt: 5 } };
      const state = apply(before, 'WorldMapService', 'fetchInitialWorldMapData', opened());
      expect(state.scout).toBeUndefined();
      expect(state.incomplete['-25,-52']).toBe(0);
    });

    it('reads a coordinate the game left out as 0', () => {
      const startUp = { locations_to_scout: [{ location: { q: 4 }, state: 'UNLOCKED' }] };
      const state = apply(emptyWorldMap(), 'WorldMapService', 'fetchInitialWorldMapData', startUp);
      expect(state.frontier[0]).toMatchObject({ r: 0, q: 4 });
    });
  });

  it('takes incomplete provinces in and finished ones out as the map is panned', () => {
    const before = { ...emptyWorldMap(), incomplete: { '1,1': 7, '2,2': 3 } };
    const areas = [{ provinces: [province(1, 1, 8), province(3, 3), province(0, 5, 2), city(4, 4, 3)] }];
    for (const method of ['fetchAreas', 'updateMapArea']) {
      expect(apply(before, 'WorldMapService', method, areas).incomplete).toEqual({ '2,2': 3, '3,3': 0, '0,5': 2 });
    }
  });

  it('replaces what it knew with the list of incomplete provinces', () => {
    const before = { ...emptyWorldMap(), incomplete: { '1,1': 7, '2,2': 3 } };
    const state = apply(before, 'WorldMapService', 'getIncompleteProvinces', [province(2, 2, 4), province(9, 9)]);
    expect(state.incomplete).toEqual({ '2,2': 4, '9,9': 0 });
    expect(state.incompleteListAt).toBe(NOW);
  });

  it('follows the scout out and back', () => {
    const started = apply(emptyWorldMap(), 'WorldMapScoutService', 'startScouting', {
      locations_to_scout: [scoutLocation(-24, -52)],
      scout: { destination: { r: -25, q: -52 }, time_left: 349907 },
    });
    expect(started.scout).toEqual({ r: -25, q: -52, endsAt: NOW + 349907_000 });
    expect(started.frontier.map((f) => `${f.r},${f.q}`)).toEqual(['-24,-52']);

    const arrived = apply(started, 'WorldMapScoutService', 'removeScout', []);
    expect(arrived.scout).toBeUndefined();
    expect(arrived.incomplete).toEqual({ '-25,-52': 0 });
  });

  it('takes a new frontier when a province is completed', () => {
    const state = apply(emptyWorldMap(), 'WorldMapScoutService', 'findProvincesToScout', [scoutLocation(-53, -25)]);
    expect(state.frontier).toHaveLength(1);
    expect(state.frontierAt).toBe(NOW);
  });

  describe('winning an encounter', () => {
    const before = { ...emptyWorldMap(), incomplete: { '-32,-28': 3, '-52,-25': 7 } };
    const won = (r: number, q: number, extra = {}) => ({ __class__: 'UnlockEncounterResultVO', r, q, ...extra });

    it('counts a negotiation', () => {
      const state = apply(before, 'UnlockEncounterService', 'unlockEncounterByTrading', won(-32, -28));
      expect(state.incomplete).toEqual({ '-32,-28': 4, '-52,-25': 7 });
    });

    it('counts an auto-fight, and drops a province it completes', () => {
      const result = { encounter_result: won(-52, -25, { provinceRewards: [{}], provincesNeeded: -853 }) };
      expect(apply(before, 'BattlefieldService', 'instantBattle', result).incomplete).toEqual({ '-32,-28': 3 });
    });

    it('drops a province on its eighth encounter', () => {
      const state = apply(before, 'UnlockEncounterService', 'unlockEncounterByTrading', won(-52, -25));
      expect(state.incomplete).toEqual({ '-32,-28': 3 });
    });

    it('ignores a lost fight and one in a province it does not know', () => {
      expect(apply(before, 'BattlefieldService', 'instantBattle', { state: {} })).toBe(before);
      expect(apply(before, 'BattlefieldService', 'instantBattle', { encounter_result: won(1, 1) })).toBe(before);
    });
  });

  it('reads the count of completed provinces', () => {
    const sources = [
      { name: 'squadSize', value: 9000 },
      { name: 'completedProvinces', value: 853 },
    ];
    const state = apply(emptyWorldMap(), 'EffectsService', 'updateSources', sources);
    expect(state.completedTotal).toBe(853);
    expect(apply(state, 'EffectsService', 'getAllSources', sources)).toBe(state);
    expect(apply(state, 'EffectsService', 'updateSources', [{ name: 'squadSize', value: 1 }])).toBe(state);
  });
});
