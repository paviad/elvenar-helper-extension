import { CityEntity } from '../model/cityEntity';
import { groupProductions } from './productionWatcher';

const CITY_LOADED_AT = 1_000_000;
const NOW = 2_000_000;

/** Display names as the game's balancing data gives them; an id it does not name stays as it is. */
const RESOURCES: Record<string, string> = { marble: 'Marble', steel: 'Steel' };
const BUILDINGS: Record<string, string> = {
  P_Humans_Workshop_1: 'Workshop',
  // A second level of the same building: a different id, the same name.
  P_Humans_Workshop_5: 'Workshop',
  A_Evt_Bakery_3: 'Enchanted Bakery',
};
const named = {
  resource: (resourceId: string) => RESOURCES[resourceId] ?? resourceId,
  building: (cityEntityId: string) => BUILDINGS[cityEntityId] ?? cityEntityId,
};

const producing = (
  overrides: {
    id: number;
    cityentity_id?: string;
    asset_name?: string;
    /** The option's display name - deliberately not what a line is named after. */
    name?: string;
    /** What the production pays out, as the game's dictionary of resource id to amount. */
    revenue?: Record<string, number | string>;
    production_option?: number;
    next_state_transition_in?: number;
    stateAt?: number;
    __class__?: string;
  } & Record<string, unknown>,
): CityEntity =>
  ({
    cityentity_id: overrides.cityentity_id ?? 'P_Humans_Workshop_1',
    id: overrides.id,
    level: 1,
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
        production_time: 120,
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
  it('gathers everything making the same product the same way onto one line', () => {
    const entities = [producing({ id: 1 }), producing({ id: 2 }), producing({ id: 3 })];

    const groups = groupProductions(entities, CITY_LOADED_AT, NOW, named);

    expect(groups).toHaveLength(1);
    expect(groups[0].buildingIds).toEqual([1, 2, 3]);
    expect(groups[0].optionId).toBe(1);
  });

  it('names a line after what it pays out, then after the option that was started', () => {
    // `Beverages` is what the option is called in the window; `supplies` is what comes out of it,
    // and is what every building making the stuff calls it - so that leads.
    const entities = [producing({ id: 1, name: 'Beverages', revenue: { __class__: 'Dictionary', supplies: 3 } })];

    expect(groupProductions(entities, CITY_LOADED_AT, NOW, named)[0].name).toBe('supplies (Beverages)');
  });

  it('names a line after the yield alone when the option has no name of its own', () => {
    const entities = [producing({ id: 1, name: undefined })];

    expect(groupProductions(entities, CITY_LOADED_AT, NOW, named)[0].name).toBe('supplies');
  });

  it('names everything a production pays out', () => {
    const entities = [producing({ id: 1, revenue: { __class__: 'Dictionary', marble: 120, supplies: 3 } })];

    expect(groupProductions(entities, CITY_LOADED_AT, NOW, named)[0].name).toBe('Marble + supplies (Beverages)');
  });

  it('keeps the same product started a different way apart', () => {
    // A workshop's two options both pay out supplies, so the option is what tells them apart.
    const entities = [
      producing({ id: 1, asset_name: 'supplies_0', production_option: 1 }),
      producing({ id: 2, asset_name: 'supplies_3', production_option: 3 }),
    ];

    const groups = groupProductions(entities, CITY_LOADED_AT, NOW, named);

    expect(groups.map((group) => group.name)).toEqual(['supplies (Beverages)', 'supplies (Beverages)']);
    expect(groups.map((group) => group.optionId)).toEqual([1, 3]);
  });

  it('puts buildings of different kinds making the same thing together, and names every kind', () => {
    const entities = [
      producing({ id: 1, cityentity_id: 'P_Humans_Workshop_1' }),
      producing({ id: 2, cityentity_id: 'A_Evt_Bakery_3' }),
    ];

    const [group] = groupProductions(entities, CITY_LOADED_AT, NOW, named);

    expect(group.buildingIds).toEqual([1, 2]);
    expect(group.buildingKinds).toEqual(['Workshop', 'Enchanted Bakery']);
  });

  it('reads a building by name, so its levels are the one kind they look like', () => {
    // Two ids, one building. Listing both would read as two kinds of thing.
    const entities = [
      producing({ id: 1, cityentity_id: 'P_Humans_Workshop_1' }),
      producing({ id: 2, cityentity_id: 'P_Humans_Workshop_5' }),
    ];

    expect(groupProductions(entities, CITY_LOADED_AT, NOW, named)[0].buildingKinds).toEqual(['Workshop']);
  });

  it('counts a run-out countdown as finished, whatever the last report called it', () => {
    // Reported as producing when the city loaded, with less time left than has since passed.
    const entities = [
      producing({ id: 1, next_state_transition_in: 120 }),
      producing({ id: 2, stateAt: NOW, next_state_transition_in: 120 }),
    ];

    const [group] = groupProductions(entities, CITY_LOADED_AT, NOW, named);

    expect(group.finished).toBe(1);
    expect(group.producing).toBe(1);
    expect(group.nextEndsAt).toBe(NOW + 120_000);
  });

  it('takes a finished state at its word', () => {
    const entities = [producing({ id: 1, __class__: 'ProductionFinishedVO', stateAt: NOW })];

    expect(groupProductions(entities, CITY_LOADED_AT, NOW, named)[0].finished).toBe(1);
  });

  it('leaves out anything that is not producing', () => {
    expect(groupProductions([idle(1)], CITY_LOADED_AT, NOW, named)).toEqual([]);
  });

  it('lists what is ready to collect first, then whatever comes back soonest', () => {
    const revenue = (resource: string) => ({ __class__: 'Dictionary', [resource]: 120 });
    const entities = [
      producing({
        id: 1,
        asset_name: 'marble_1',
        revenue: revenue('marble'),
        name: 'Marble',
        stateAt: NOW,
        next_state_transition_in: 900,
      }),
      producing({
        id: 2,
        asset_name: 'steel_1',
        revenue: revenue('steel'),
        name: 'Steel',
        stateAt: NOW,
        next_state_transition_in: 60,
      }),
      producing({ id: 3, asset_name: 'supplies_0', revenue: revenue('supplies'), next_state_transition_in: 1 }),
    ];

    expect(groupProductions(entities, CITY_LOADED_AT, NOW, named).map((group) => group.name)).toEqual([
      'supplies (Beverages)',
      'Steel (Steel)',
      'Marble (Marble)',
    ]);
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

    const [group] = groupProductions([bare], CITY_LOADED_AT, NOW, named);

    expect(group.optionId).toBeUndefined();
    // Nothing to name it by but the building itself.
    expect(group.name).toBe('Workshop');
  });
});
