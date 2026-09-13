import { CityEntity } from '../model/cityEntity';
import { extractBadgesInProduction, mergeCloseFinishes } from './extractBadgesInProduction';

const CITY_LOADED_AT = 1_700_000_000_000;
const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;

/** A workshop brewing beverages, which feed the brewery badge, three hours to go when reported. */
const workshop = (id: number, stateAt?: number): CityEntity =>
  ({
    cityentity_id: 'P_Humans_Workshop_1',
    id,
    level: 1,
    player_id: 1,
    type: 'production',
    x: 0,
    y: 0,
    connected: true,
    connectionStrategy: '',
    stateAt,
    state: {
      __class__: 'ProducingVO',
      next_state_transition_in: 3 * 60 * 60,
      current_product: {
        name: 'Beverages',
        asset_name: 'supplies_0',
        production_time: 3 * 60 * 60,
        production_option: 1,
        productionAmount: 25,
        revenue: { resources: { supplies: 3 } },
        requiredResources: { resources: {} },
      },
    },
  }) as unknown as CityEntity;

const extract = (entities: CityEntity[]) => extractBadgesInProduction(entities, CITY_LOADED_AT, {}, {}, false, 0);

describe('extractBadgesInProduction', () => {
  it('counts a building untouched since the city loaded from the load', () => {
    const result = extract([workshop(1)]);

    expect(result.badge_brewery).toEqual({ [CITY_LOADED_AT + 3 * HOUR]: 100 });
  });

  it('counts a production started after the load from when it was reported', () => {
    // Started two and a half hours into the session. Read against the load, it would finish
    // half an hour from its start and show as long past due by the time anyone looked.
    const startedAt = CITY_LOADED_AT + 2.5 * HOUR;

    const result = extract([workshop(1, startedAt)]);

    expect(result.badge_brewery).toEqual({ [startedAt + 3 * HOUR]: 100 });
  });

  it('keeps apart productions with the same countdown reported at different times', () => {
    const result = extract([workshop(1), workshop(2, CITY_LOADED_AT + HOUR)]);

    expect(result.badge_brewery).toEqual({
      [CITY_LOADED_AT + 3 * HOUR]: 100,
      [CITY_LOADED_AT + 4 * HOUR]: 100,
    });
  });

  it('adds up productions that finish together', () => {
    const result = extract([workshop(1, CITY_LOADED_AT + HOUR), workshop(2, CITY_LOADED_AT + HOUR)]);

    expect(result.badge_brewery).toEqual({ [CITY_LOADED_AT + 4 * HOUR]: 200 });
  });

  it('merges productions started seconds apart into one marker, at the later finish', () => {
    const result = extract([workshop(1, CITY_LOADED_AT + HOUR), workshop(2, CITY_LOADED_AT + HOUR + SECOND * 20)]);

    expect(result.badge_brewery).toEqual({ [CITY_LOADED_AT + 4 * HOUR + SECOND * 20]: 200 });
  });
});

describe('mergeCloseFinishes', () => {
  it('merges a run of finishes within a minute of its first', () => {
    expect(mergeCloseFinishes({ 0: 1, [30 * SECOND]: 2, [60 * SECOND]: 4 })).toEqual({ [60 * SECOND]: 7 });
  });

  it('starts a new marker past the minute, even when each step is shorter', () => {
    // Measured from the run's first finish, so a long chain of close starts cannot drift a marker
    // arbitrarily far from the productions it holds.
    expect(mergeCloseFinishes({ 0: 1, [40 * SECOND]: 2, [80 * SECOND]: 4 })).toEqual({
      [40 * SECOND]: 3,
      [80 * SECOND]: 4,
    });
  });

  it('leaves finishes further apart alone', () => {
    expect(mergeCloseFinishes({ 0: 1, [HOUR]: 2 })).toEqual({ 0: 1, [HOUR]: 2 });
  });

  it('returns nothing for nothing', () => {
    expect(mergeCloseFinishes({})).toEqual({});
  });
});
