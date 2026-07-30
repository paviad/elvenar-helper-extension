import { AccountData } from '../elvenar/Accounts';
import { getBuildings } from '../elvenar/getBuildings';
import { getEvolvingBuildings } from '../elvenar/getEvolvingBuildings';
import { getExpirations } from '../elvenar/getExpirations';
import { getPremiumBuildingHints } from '../elvenar/getPremiumBuildingHints';
import { CityEntity } from '../model/cityEntity';
import { makeBuildingLevels, makeCityBlock, makeCityEntityEx } from '../testing/fixtures';
import { generateCity, resetMovedInPlace, saveBack } from './generateCity';

jest.mock('../elvenar/getBuildings');
jest.mock('../elvenar/getEvolvingBuildings');
jest.mock('../elvenar/getExpirations');
jest.mock('../elvenar/getPremiumBuildingHints');

beforeEach(() => {
  jest.mocked(getBuildings).mockResolvedValue(makeBuildingLevels('G_Steel', 3));
  jest.mocked(getPremiumBuildingHints).mockResolvedValue([]);
  jest.mocked(getEvolvingBuildings).mockResolvedValue([]);
  jest.mocked(getExpirations).mockResolvedValue({});
});

const entity = (overrides: Partial<CityEntity> = {}): CityEntity => ({
  cityentity_id: 'G_Steel_1',
  id: 1,
  level: 1,
  player_id: 0,
  type: 'goods',
  x: 0,
  y: 0,
  connected: true,
  connectionStrategy: 'street',
  ...overrides,
});

/** Only the cityQuery fields generateCity actually reads. */
const accountData = (overrides: { cityEntities: CityEntity[]; expirationsEnd?: Record<string, number> }): AccountData =>
  ({
    cityQuery: {
      cityEntities: overrides.cityEntities,
      unlockedAreas: [{ x: 0, y: 0, width: 10, length: 10 }],
      expirationsEnd: overrides.expirationsEnd ?? {},
    },
  }) as unknown as AccountData;

describe('generateCity', () => {
  it('enriches each entity with its catalog footprint and name', async () => {
    const result = await generateCity(accountData({ cityEntities: [entity({ level: 2 })] }));

    expect(result.q[0]).toMatchObject({
      cityentity_id: 'G_Steel_1',
      level: 2,
      width: 3,
      length: 3,
      name: 'Steel Manufactory',
    });
  });

  it('attaches the expiration end keyed by entity id', async () => {
    const result = await generateCity(
      accountData({ cityEntities: [entity({ id: 42 })], expirationsEnd: { 42: 1_700_000_000_000 } }),
    );

    expect(result.q[0].expirationEnd).toBe(1_700_000_000_000);
  });

  it('passes the unlocked areas through', async () => {
    const result = await generateCity(accountData({ cityEntities: [entity()] }));

    expect(result.unlockedAreas).toEqual([{ x: 0, y: 0, width: 10, length: 10 }]);
  });
});

describe('saveBack', () => {
  it('writes the edited position and level onto the underlying entity', () => {
    const block = makeCityBlock({
      entity: makeCityEntityEx({ x: 1, y: 2, level: 1 }),
      x: 20,
      y: 30,
      level: 5,
    });

    expect(saveBack([block])[0]).toMatchObject({ x: 20, y: 30, level: 5 });
  });

  it('keeps the rest of the entity intact', () => {
    const block = makeCityBlock({ entity: makeCityEntityEx({ cityentity_id: 'G_Steel_2', id: 77 }) });

    expect(saveBack([block])[0]).toMatchObject({ cityentity_id: 'G_Steel_2', id: 77 });
  });

  it('does not carry editor-only fields into the saved entity', () => {
    const block = makeCityBlock({ moved: true });

    const saved = saveBack([block])[0] as Record<string, unknown>;

    expect(saved.moved).toBeUndefined();
  });
});

describe('resetMovedInPlace', () => {
  it('rebases the original position of moved blocks and clears the flag', () => {
    const moved = makeCityBlock({ x: 20, y: 30, originalX: 1, originalY: 2, moved: true });

    resetMovedInPlace([moved]);

    expect(moved).toMatchObject({ originalX: 20, originalY: 30, moved: false });
  });

  it('leaves untouched blocks alone', () => {
    const untouched = makeCityBlock({ x: 20, y: 30, originalX: 1, originalY: 2, moved: false });

    resetMovedInPlace([untouched]);

    expect(untouched).toMatchObject({ originalX: 1, originalY: 2, moved: false });
  });
});
