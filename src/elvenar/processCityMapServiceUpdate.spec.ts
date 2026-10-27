import { CityEntity } from '../model/cityEntity';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountBySessionId } from './accountStore';
import {
  mergeReportedCityEntities,
  processMoveBuilding,
  processRemoveBuilding,
  processRemoveStreets,
  processReplaceBuildings,
} from './processCityMapServiceUpdate';

jest.mock('./accountStore', () => ({ getAccountBySessionId: jest.fn() }));

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

/** A placed entity as the game reports it, cut down to what the city merge looks at. */
const placed = (id: number, cityentity_id: string, x: number, y: number, type = 'street') =>
  ({
    __class__: 'CityMapEntityVO',
    cityentity_id,
    id,
    level: 1,
    state: { __class__: 'IdleVO' },
    type,
    x,
    y,
  }) as unknown as CityEntity;

const call = (requestMethod: string, requestData: unknown, responseData: unknown = []) => {
  const request = { requestClass: 'CityMapService', requestMethod, requestData } as ElvenarRequestResponseEntry;
  const answer = { requestClass: 'CityMapService', requestMethod, responseData } as ElvenarRequestResponseEntry;
  return { request, answer };
};

const sharedInfo = { sessionId: 'session' } as ExtensionSharedInfo;

/** The account the processors read, holding the given city. */
const cityOf = (...entities: CityEntity[]) => {
  const cityEntities = [...entities];
  jest.mocked(getAccountBySessionId).mockReturnValue({ cityQuery: { cityEntities } } as never);
  return cityEntities;
};

const ids = (entities: CityEntity[]) => entities.map((entity) => entity.id);

/** Shapes below are as captured from the game on 2026-10-26. */
describe('a building sold', () => {
  it('is taken out of the city', async () => {
    const city = cityOf(
      placed(19600, 'A_Evt_Autumn_XXII_Bear_Booster_A_25', 24, 48, 'culture_residential'),
      placed(17819, 'A_Evt_Winter_3Tree_24', 24, 46),
    );
    const { request, answer } = call('removeBuilding', [19600]);

    await processRemoveBuilding([answer], sharedInfo, request);

    expect(ids(city)).toEqual([17819]);
  });

  it('stays when the game did not answer the sale', async () => {
    const city = cityOf(placed(19600, 'A_Evt_Autumn_XXII_Bear_Booster_A_25', 24, 48, 'culture_residential'));
    const { request } = call('removeBuilding', [19600]);

    await processRemoveBuilding([], sharedInfo, request);

    expect(ids(city)).toEqual([19600]);
  });
});

describe('a street tile moved', () => {
  // As captured on 2026-10-27: the answer is empty, and the reset beside it names no street.
  it('is found at its new spot', async () => {
    const city = cityOf(placed(19599, 'S_Humans_Dwarven', 35, 42), placed(17819, 'A_Evt_Winter_3Tree_24', 24, 46));
    const { request, answer } = call('moveBuilding', [19599, 26, 46]);

    await processMoveBuilding([answer], sharedInfo, request);

    expect(city.map(({ id, x, y }) => ({ id, x, y }))).toEqual([
      { id: 19599, x: 26, y: 46 },
      { id: 17819, x: 24, y: 46 },
    ]);
  });

  it('stays put when the game did not answer the move', async () => {
    const city = cityOf(placed(19599, 'S_Humans_Dwarven', 35, 42));
    const { request } = call('moveBuilding', [19599, 26, 46]);

    await processMoveBuilding([], sharedInfo, request);

    expect(city[0]).toMatchObject({ x: 35, y: 42 });
  });
});

describe('street tiles sold', () => {
  it('are all taken out, however many were picked', async () => {
    const city = cityOf(
      placed(19588, 'S_Humans_Trail', 35, 44),
      placed(19589, 'S_Humans_Trail', 35, 43),
      placed(19590, 'S_Humans_Trail', 35, 42),
    );
    const { request, answer } = call('removeStreets', [[19590, 19588]]);

    await processRemoveStreets([answer], sharedInfo, request);

    expect(ids(city)).toEqual([19589]);
  });
});

describe('streets laid', () => {
  it('adds a tile laid on empty ground', async () => {
    const city = cityOf();
    const { request, answer } = call(
      'replaceBuildings',
      [[{ cityEntityId: 'S_Humans_Trail', x: 20, y: 44, cityMapEntityId: -2147483648 }]],
      [[placed(19605, 'S_Humans_Trail', 20, 44)], []],
    );

    await processReplaceBuildings([answer], sharedInfo, request);

    expect(city).toMatchObject([{ id: 19605, x: 20, y: 44 }]);
  });

  it('swaps a replaced tile for the one that came back under a new id', async () => {
    const city = cityOf(placed(19588, 'S_Humans_Trail', 35, 44), placed(19589, 'S_Humans_Trail', 35, 43));
    const { request, answer } = call(
      'replaceBuildings',
      [
        [
          { cityEntityId: 'S_Humans_Dwarven', x: 35, y: 43, cityMapEntityId: 19589 },
          { cityEntityId: 'S_Humans_Dwarven', x: 35, y: 44, cityMapEntityId: 19588 },
        ],
      ],
      [[placed(19597, 'S_Humans_Dwarven', 35, 43), placed(19598, 'S_Humans_Dwarven', 35, 44)], []],
    );

    await processReplaceBuildings([answer], sharedInfo, request);

    expect(city.map((entity) => [entity.id, entity.cityentity_id])).toEqual([
      [19597, 'S_Humans_Dwarven'],
      [19598, 'S_Humans_Dwarven'],
    ]);
  });

  it('keeps a new tile that reuses the id of the tile it replaced', async () => {
    // The game hands out freed ids again, so the old tile has to go before the new one is merged,
    // or the merge would overwrite it and then the removal would take the new tile out.
    const city = cityOf(placed(19600, 'S_Humans_Trail', 26, 49));
    const { request, answer } = call(
      'replaceBuildings',
      [[{ cityEntityId: 'S_Humans_Fairies', x: 26, y: 49, cityMapEntityId: 19600 }]],
      [[placed(19600, 'S_Humans_Fairies', 26, 49)], []],
    );

    await processReplaceBuildings([answer], sharedInfo, request);

    expect(city).toMatchObject([{ id: 19600, cityentity_id: 'S_Humans_Fairies' }]);
  });

  it('merges the buildings whose state the change touched', async () => {
    const city = cityOf(placed(17774, 'A_Evt_Set_Seasons_XXV_The_Quiet_Shade_24', 8, 55, 'culture'));
    const touched = {
      ...placed(17774, 'A_Evt_Set_Seasons_XXV_The_Quiet_Shade_24', 8, 55, 'culture'),
      state: { __class__: 'ProducingVO' },
    };
    const { request, answer } = call(
      'replaceBuildings',
      [[{ cityEntityId: 'S_Humans_Trail', x: 20, y: 44, cityMapEntityId: -2147483648 }]],
      [[placed(19605, 'S_Humans_Trail', 20, 44)], [touched]],
    );

    await processReplaceBuildings([answer], sharedInfo, request);

    expect(city.find((entity) => entity.id === 17774)?.state?.__class__).toBe('ProducingVO');
  });
});
