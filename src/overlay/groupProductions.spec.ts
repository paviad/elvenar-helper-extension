import { CityEntity } from '../model/cityEntity';
import { groupProductions } from './productionWatcher';

const CITY_LOADED_AT = 1_000_000;
const NOW = 2_000_000;

const producing = (
  overrides: {
    id: number;
    cityentity_id?: string;
    asset_name?: string;
    name?: string;
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
        name: overrides.name ?? 'Beverages',
        asset_name: overrides.asset_name ?? 'supplies_0',
        production_option: overrides.production_option ?? 1,
        production_time: 120,
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

    const groups = groupProductions(entities, CITY_LOADED_AT, NOW);

    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Beverages');
    expect(groups[0].buildingIds).toEqual([1, 2, 3]);
    expect(groups[0].optionId).toBe(1);
  });

  it('keeps the same product started a different way apart', () => {
    const entities = [
      producing({ id: 1, production_option: 1, name: 'Beverages' }),
      producing({ id: 2, production_option: 3, name: 'Toolbox' }),
    ];

    expect(groupProductions(entities, CITY_LOADED_AT, NOW).map((group) => group.name)).toEqual([
      'Beverages',
      'Toolbox',
    ]);
  });

  it('puts buildings of different kinds making the same thing together, and names both kinds', () => {
    const entities = [
      producing({ id: 1, cityentity_id: 'P_Humans_Workshop_1' }),
      producing({ id: 2, cityentity_id: 'P_Humans_Workshop_5' }),
    ];

    const [group] = groupProductions(entities, CITY_LOADED_AT, NOW);

    expect(group.buildingIds).toEqual([1, 2]);
    expect(group.buildingKinds).toEqual(['P_Humans_Workshop_1', 'P_Humans_Workshop_5']);
  });

  it('counts a run-out countdown as finished, whatever the last report called it', () => {
    // Reported as producing when the city loaded, with less time left than has since passed.
    const entities = [
      producing({ id: 1, next_state_transition_in: 120 }),
      producing({ id: 2, stateAt: NOW, next_state_transition_in: 120 }),
    ];

    const [group] = groupProductions(entities, CITY_LOADED_AT, NOW);

    expect(group.finished).toBe(1);
    expect(group.producing).toBe(1);
    expect(group.nextEndsAt).toBe(NOW + 120_000);
  });

  it('takes a finished state at its word', () => {
    const entities = [producing({ id: 1, __class__: 'ProductionFinishedVO', stateAt: NOW })];

    expect(groupProductions(entities, CITY_LOADED_AT, NOW)[0].finished).toBe(1);
  });

  it('leaves out anything that is not producing', () => {
    expect(groupProductions([idle(1)], CITY_LOADED_AT, NOW)).toEqual([]);
  });

  it('lists what is ready to collect first, then whatever comes back soonest', () => {
    const entities = [
      producing({ id: 1, asset_name: 'marble_1', name: 'Marble', stateAt: NOW, next_state_transition_in: 900 }),
      producing({ id: 2, asset_name: 'steel_1', name: 'Steel', stateAt: NOW, next_state_transition_in: 60 }),
      producing({ id: 3, asset_name: 'supplies_0', name: 'Beverages', next_state_transition_in: 1 }),
    ];

    expect(groupProductions(entities, CITY_LOADED_AT, NOW).map((group) => group.name)).toEqual([
      'Beverages',
      'Steel',
      'Marble',
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

    const [group] = groupProductions([bare], CITY_LOADED_AT, NOW);

    expect(group.optionId).toBeUndefined();
    // Nothing to name it by but the building itself.
    expect(group.name).toBe('P_Humans_Workshop_1');
  });
});
