import { CityEntity } from '../model/cityEntity';
import { mergeReportedCityEntities } from './processCityMapServiceUpdate';

/** The workshop as the city load reports it: producing, two minutes to go. */
const stored = (): CityEntity[] => [
  {
    __class__: 'CityMapEntityVO',
    cityentity_id: 'P_Humans_Workshop_1',
    id: 17020,
    level: 1,
    player_id: 848933052,
    state: {
      __class__: 'ProducingVO',
      next_state_transition_in: 120,
      current_product: {
        __class__: 'CityEntityProductVO',
        name: 'Beverages',
        production_time: 120,
        asset_name: 'supplies_0',
        production_option: 1,
        productionAmount: 1,
        revenue: { __class__: 'CityResourceVO', resources: { supplies: 3 } },
        requiredResources: { __class__: 'CityResourceVO', resources: { __class__: 'Dictionary' } },
        originalProductionTime: 120,
        originalRevenue: { __class__: 'CityResourceVO', resources: { supplies: 3 } },
      },
      resources: { __class__: 'CityResourceVO', resources: { __class__: 'Dictionary' } },
    },
    type: 'production',
    x: 13,
    y: 31,
    connected: true,
  } as unknown as CityEntity,
];

/** What `CityMapService/reset` carries after the production is cancelled: a bare idle state. */
const cancelled = [
  {
    __class__: 'CityMapEntityVO',
    cityentity_id: 'P_Humans_Workshop_1',
    id: 17020,
    level: 1,
    player_id: 848933052,
    state: { __class__: 'IdleVO' },
    type: 'production',
    x: 13,
    y: 31,
    connected: true,
  },
] as unknown as CityEntity[];

/** And after one is started: producing again, with the countdown starting over. */
const started = stored();

describe('mergeReportedCityEntities', () => {
  it('takes the idle state a cancelled production reports', () => {
    const entities = stored();

    mergeReportedCityEntities(entities, cancelled, 1_000);

    expect(entities).toHaveLength(1);
    expect(entities[0].state?.__class__).toBe('IdleVO');
    // An idle state is reported as nothing but its name - there is no countdown left on it.
    expect(entities[0].state?.next_state_transition_in).toBeUndefined();
  });

  it('takes the fresh countdown a started production reports', () => {
    const entities = stored();
    entities[0].state!.next_state_transition_in = 7;

    mergeReportedCityEntities(entities, started, 1_000);

    expect(entities[0].state?.next_state_transition_in).toBe(120);
    expect(entities[0].state?.current_product?.production_option).toBe(1);
  });

  it('stamps when the state was reported, so the countdown has something to count from', () => {
    const entities = stored();

    mergeReportedCityEntities(entities, started, 1_700_000_000_000);

    // Without this the countdown would be read against the city load, hours earlier, and a
    // production just started would look long finished.
    expect(entities[0].stateAt).toBe(1_700_000_000_000);
  });

  it('adds a building it has not seen before rather than dropping it', () => {
    const entities = stored();
    const newBuilding = { ...cancelled[0], id: 17021 };

    mergeReportedCityEntities(entities, [newBuilding], 1_000);

    expect(entities.map((entity) => entity.id)).toEqual([17020, 17021]);
  });

  it('leaves the buildings the report says nothing about alone', () => {
    const entities = [...stored(), { ...cancelled[0], id: 999, stateAt: 5 }];

    mergeReportedCityEntities(entities, cancelled, 1_000);

    expect(entities.find((entity) => entity.id === 999)?.stateAt).toBe(5);
  });
});
