import { CityEntity } from '../model/cityEntity';
import { groupProductions } from './productionWatcher';

const CITY_LOADED_AT = 1_000_000;
const NOW = 2_000_000;

/** Display names as the game's balancing data gives them; an id it does not name stays as it is. */
const RESOURCES: Record<string, string> = { marble: 'Marble', steel: 'Steel' };
/** The catalog. A building's levels are separate entries that share a display name. */
const BUILDINGS: Record<string, string> = {
  P_Humans_Workshop_1: 'Workshop',
  P_Humans_Workshop_5: 'Workshop',
  A_Evt_Bakery_3: 'Enchanted Bakery',
  A_Evt_Bear_10: 'Brown Bear',
};
/** What the catalog says a building pays out in one go, for the ones whose products all come at once. */
const TOGETHER: Record<string, string[]> = { A_Evt_Bear_10: ['mc_hm', 'mc_hr', 'tg_hm'] };
/** Seconds of a run after which a building can already be collected, where it offers that. */
const EARLY: Record<string, number> = { A_Ch17_Large1_1: 7200 };

const named = {
  resource: (resourceId: string) => RESOURCES[resourceId] ?? resourceId,
  building: (cityEntityId: string) => ({
    name: BUILDINGS[cityEntityId] ?? cityEntityId,
    manual: true,
    earlyPickupTime: EARLY[cityEntityId],
    yieldsTogether: TOGETHER[cityEntityId] ?? [],
  }),
};

const producing = (
  overrides: {
    id: number;
    cityentity_id?: string;
    level?: number;
    asset_name?: string;
    /** The option's display name - deliberately not what a line is named after. */
    name?: string;
    /** What the production pays out, as the game's dictionary of resource id to amount. */
    revenue?: Record<string, number | string>;
    production_option?: number;
    /** How long the production takes in all - what an early collect is measured against. */
    production_time?: number;
    next_state_transition_in?: number;
    stateAt?: number;
    __class__?: string;
  } & Record<string, unknown>,
): CityEntity =>
  ({
    cityentity_id: overrides.cityentity_id ?? 'P_Humans_Workshop_1',
    id: overrides.id,
    level: overrides.level ?? 1,
    player_id: 848933052,
    type: 'production',
    x: 13,
    y: 31,
    connected: true,
    stateAt: overrides.stateAt,
    state: {
      __class__: overrides.__class__ ?? 'ProducingVO',
      next_state_transition_in: overrides.next_state_transition_in ?? 120,
      current_product: {
        // `in`, not `??`, so a test can say the option has no name at all.
        name: 'name' in overrides ? overrides.name : 'Beverages',
        asset_name: overrides.asset_name ?? 'supplies_0',
        production_option: overrides.production_option ?? 1,
        production_time: overrides.production_time ?? 120,
        revenue: {
          __class__: 'CityResourceVO',
          resources: overrides.revenue ?? { __class__: 'Dictionary', supplies: 3 },
        },
      },
    },
  }) as unknown as CityEntity;

const idle = (id: number): CityEntity =>
  ({
    cityentity_id: 'P_Humans_Workshop_1',
    id,
    level: 1,
    player_id: 848933052,
    type: 'production',
    x: 1,
    y: 1,
    connected: true,
    state: { __class__: 'IdleVO' },
  }) as unknown as CityEntity;

describe('groupProductions', () => {
  const group = (entities: CityEntity[]) => groupProductions(entities, CITY_LOADED_AT, NOW, named);

  it('gathers every one of a building running the same production onto one line', () => {
    const entities = [producing({ id: 1 }), producing({ id: 2 }), producing({ id: 3 })];

    const groups = group(entities);

    expect(groups).toHaveLength(1);
    expect(groups[0].buildingIds).toEqual([1, 2, 3]);
    expect(groups[0].optionId).toBe(1);
  });

  it('groups by the building, not by what comes out of it', () => {
    // Two buildings both paying out supplies are not one thing to automate: they take their own
    // option ids, and one `startProductions` call carries a single option.
    const entities = [
      producing({ id: 1, cityentity_id: 'P_Humans_Workshop_1' }),
      producing({ id: 2, cityentity_id: 'A_Evt_Bakery_3' }),
    ];

    expect(group(entities).map((g) => ({ building: g.building, ids: g.buildingIds }))).toEqual([
      { building: 'Workshop', ids: [1] },
      { building: 'Enchanted Bakery', ids: [2] },
    ]);
  });

  it("gives a building's levels a line each - they are separate buildings in the catalog", () => {
    const entities = [
      producing({ id: 1, cityentity_id: 'P_Humans_Workshop_1', level: 1 }),
      producing({ id: 2, cityentity_id: 'P_Humans_Workshop_5', level: 5 }),
    ];

    // The same name on both, which is what has the view name the level on a line that shares one.
    expect(group(entities).map((g) => ({ building: g.building, level: g.level, ids: g.buildingIds }))).toEqual([
      { building: 'Workshop', level: 1, ids: [1] },
      { building: 'Workshop', level: 5, ids: [2] },
    ]);
  });

  it("keeps one building's options apart", () => {
    const entities = [producing({ id: 1, production_option: 1 }), producing({ id: 2, production_option: 3 })];

    expect(group(entities).map((g) => g.optionId)).toEqual([1, 3]);
  });

  it('names a line after what a collection off it brings in, and says which building', () => {
    // `Beverages` is what the option is called in the window; `supplies` is what comes out of it.
    const entities = [producing({ id: 1, name: 'Beverages', revenue: { __class__: 'Dictionary', supplies: 3 } })];

    const [line] = group(entities);

    expect(line.name).toBe('supplies (Beverages)');
    expect(line.building).toBe('Workshop');
  });

  it('says the yield alone when the option has no name of its own', () => {
    expect(group([producing({ id: 1, name: undefined })])[0].name).toBe('supplies');
  });

  it('names everything a production pays out', () => {
    const entities = [producing({ id: 1, revenue: { __class__: 'Dictionary', marble: 120, supplies: 3 } })];

    expect(group(entities)[0].name).toBe('Marble + supplies (Beverages)');
  });

  it('says everything a building whose products all come at once pays out', () => {
    // Its state reports whichever product it likes - one of the four - but a collection takes all
    // four, so the catalog is what says what the line is worth.
    const entities = [producing({ id: 1, cityentity_id: 'A_Evt_Bear_10', name: undefined, revenue: { mc_hm: 152 } })];

    expect(group(entities)[0].name).toBe('mc_hm + mc_hr + tg_hm');
  });

  it('gathers a building running the one product, whatever else it could be running', () => {
    const entities = [
      producing({ id: 1, cityentity_id: 'A_Evt_Bear_10', production_option: 1 }),
      producing({ id: 2, cityentity_id: 'A_Evt_Bear_10', production_option: 1 }),
    ];

    const groups = group(entities);

    expect(groups).toHaveLength(1);
    expect(groups[0].buildingIds).toEqual([1, 2]);
  });

  it('counts a building that can be collected early as ready before its run is over', () => {
    // Twelve hours of production, collectable two hours in, with nine hours left to go.
    const entities = [
      producing({
        id: 1,
        cityentity_id: 'A_Ch17_Large1_1',
        production_time: 12 * 3600,
        next_state_transition_in: 9 * 3600,
        stateAt: NOW,
      }),
    ];

    const [line] = group(entities);

    expect(line.finished).toBe(1);
    expect(line.producing).toBe(0);
  });

  it('counts a run-out countdown as finished, whatever the last report called it', () => {
    // Reported as producing when the city loaded, with less time left than has since passed.
    const entities = [
      producing({ id: 1, next_state_transition_in: 120 }),
      producing({ id: 2, stateAt: NOW, next_state_transition_in: 120 }),
    ];

    const [line] = group(entities);

    expect(line.finished).toBe(1);
    expect(line.producing).toBe(1);
    expect(line.nextEndsAt).toBe(NOW + 120_000);
  });

  it('takes a finished state at its word', () => {
    expect(group([producing({ id: 1, __class__: 'ProductionFinishedVO', stateAt: NOW })])[0].finished).toBe(1);
  });

  it('leaves out anything that is not producing', () => {
    expect(group([idle(1)])).toEqual([]);
  });

  it('lists what is ready to collect first, then whatever comes back soonest', () => {
    const entities = [
      producing({ id: 1, cityentity_id: 'A_Evt_Bakery_3', stateAt: NOW, next_state_transition_in: 900 }),
      producing({ id: 2, cityentity_id: 'A_Evt_Bear_10', stateAt: NOW, next_state_transition_in: 60 }),
      producing({ id: 3, cityentity_id: 'P_Humans_Workshop_1', next_state_transition_in: 1 }),
    ];

    expect(group(entities).map((g) => g.building)).toEqual(['Workshop', 'Brown Bear', 'Enchanted Bakery']);
  });

  it('leaves the option unset when the reported state carries no product to read it from', () => {
    const bare = {
      cityentity_id: 'P_Humans_Workshop_1',
      id: 9,
      level: 1,
      player_id: 1,
      type: 'production',
      x: 1,
      y: 1,
      connected: true,
      state: { __class__: 'ProductionFinishedVO' },
    } as unknown as CityEntity;

    const [line] = group([bare]);

    expect(line.optionId).toBeUndefined();
    // Nothing said what it makes, so the building's own name is the best the line can be called.
    expect(line.name).toBe('Workshop');
    expect(line.building).toBe('Workshop');
  });
});
