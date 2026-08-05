import { getBuildings } from '../elvenar/getBuildings';
import { getEvolvingBuildings } from '../elvenar/getEvolvingBuildings';
import { getExpirations } from '../elvenar/getExpirations';
import { getPremiumBuildingHints } from '../elvenar/getPremiumBuildingHints';
import { Building } from '../model/building';
import { StageProvision } from '../model/stageProvision';
import { makeBuilding, makeBuildingLevels } from '../testing/fixtures';
import { BuildingFinder, getBuildingFinder } from './buildingFinder';

jest.mock('../elvenar/getBuildings');
jest.mock('../elvenar/getEvolvingBuildings');
jest.mock('../elvenar/getExpirations');
jest.mock('../elvenar/getPremiumBuildingHints');

const mockedGetBuildings = jest.mocked(getBuildings);
const mockedGetEvolvingBuildings = jest.mocked(getEvolvingBuildings);
const mockedGetExpirations = jest.mocked(getExpirations);
const mockedGetPremiumBuildingHints = jest.mocked(getPremiumBuildingHints);

interface CatalogOptions {
  buildings?: Building[];
  hints?: { id: string; section: string }[];
  evolving?: StageProvision[];
  expirations?: Record<string, number>;
}

/** Loads a catalog into the mocked getters and returns an initialised finder. */
async function finderWith({
  buildings = [],
  hints = [],
  evolving = [],
  expirations = {},
}: CatalogOptions): Promise<BuildingFinder> {
  mockedGetBuildings.mockResolvedValue(buildings);
  mockedGetPremiumBuildingHints.mockResolvedValue(hints);
  mockedGetEvolvingBuildings.mockResolvedValue(evolving);
  mockedGetExpirations.mockResolvedValue(expirations);

  const finder = new BuildingFinder();
  await finder.ensureInitialized();
  return finder;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getBuilding', () => {
  it('returns the entry for the requested level', async () => {
    const finder = await finderWith({ buildings: makeBuildingLevels('G_Steel', 3) });

    const building = finder.getBuilding('G_Steel_1', 3);

    expect(building).toMatchObject({ id: 'G_Steel_3', width: 4, length: 4 });
  });

  it('looks up by base name, so the level in the id is ignored', async () => {
    const finder = await finderWith({ buildings: makeBuildingLevels('G_Steel', 3) });

    expect(finder.getBuilding('G_Steel_3', 1)?.id).toBe('G_Steel_1');
  });

  it('defaults to level 1', async () => {
    const finder = await finderWith({ buildings: makeBuildingLevels('G_Steel', 3) });

    expect(finder.getBuilding('G_Steel_2')?.id).toBe('G_Steel_1');
  });

  it('returns undefined for an unknown base name', async () => {
    const finder = await finderWith({ buildings: makeBuildingLevels('G_Steel', 3) });

    expect(finder.getBuilding('G_Marble_1', 1)).toBeUndefined();
  });

  it('returns undefined for a level the catalog does not have', async () => {
    const finder = await finderWith({ buildings: makeBuildingLevels('G_Steel', 3) });

    expect(finder.getBuilding('G_Steel_1', 99)).toBeUndefined();
  });

  it('rewrites the returned id to carry the requested level', async () => {
    // The trailing number is a chapter here, not a level, so the id and the level disagree.
    const buildings = [makeBuilding({ id: 'A_Ch5_Statue_5', base_name: 'A_Ch5_Statue', level: 1 })];
    const finder = await finderWith({ buildings });

    expect(finder.getBuilding('A_Ch5_Statue_5', 1)?.id).toBe('A_Ch5_Statue_1');
  });

  it('does not write the requested level back into the shared catalog', async () => {
    // getBuildings() returns a module-level cache, so any mutation here leaks into
    // every other consumer of the catalog.
    const buildings = [makeBuilding({ id: 'A_Ch5_Statue_5', base_name: 'A_Ch5_Statue', level: 1 })];
    const finder = await finderWith({ buildings });

    finder.getBuilding('A_Ch5_Statue_5', 1);

    expect(buildings[0].id).toBe('A_Ch5_Statue_5');
  });

  it('leaves getBuildingExact working after a levelled lookup', async () => {
    const buildings = [makeBuilding({ id: 'A_Ch5_Statue_5', base_name: 'A_Ch5_Statue', level: 1 })];
    const finder = await finderWith({ buildings });

    finder.getBuilding('A_Ch5_Statue_5', 1);

    expect(finder.getBuildingExact('A_Ch5_Statue_5')?.id).toBe('A_Ch5_Statue_5');
  });

  it('keeps sourceBuilding pointing at the unmodified catalog entry', async () => {
    const buildings = [makeBuilding({ id: 'A_Ch5_Statue_5', base_name: 'A_Ch5_Statue', level: 1 })];
    const finder = await finderWith({ buildings });

    const building = finder.getBuilding('A_Ch5_Statue_5', 1);

    expect(building?.id).toBe('A_Ch5_Statue_1');
    expect(building?.sourceBuilding.id).toBe('A_Ch5_Statue_5');
  });

  it('reads the chapter from the premium hints', async () => {
    const buildings = [makeBuilding({ id: 'A_Evt_Tent_1', base_name: 'A_Evt_Tent', level: 1 })];
    const hints = [{ id: 'A_Evt_Tent_1', section: '12' }];
    const finder = await finderWith({ buildings, hints });

    expect(finder.getBuilding('A_Evt_Tent_1', 1)?.chapter).toBe(12);
  });

  it('ignores hints for prefixed (levelled) buildings', async () => {
    const buildings = makeBuildingLevels('G_Steel', 1);
    const hints = [{ id: 'G_Steel_1', section: '12' }];
    const finder = await finderWith({ buildings, hints });

    expect(finder.getBuilding('G_Steel_1', 1)?.chapter).toBeUndefined();
  });

  it('reports the expiration only for expiring buildings', async () => {
    const buildings = [
      makeBuilding({ id: 'A_Evt_Tent_1', base_name: 'A_Evt_Tent', level: 1, type: 'expiring' }),
      makeBuilding({ id: 'A_Evt_Hut_1', base_name: 'A_Evt_Hut', level: 1, type: 'culture' }),
    ];
    const expirations = { A_Evt_Tent: 604_800, A_Evt_Hut: 604_800 };
    const finder = await finderWith({ buildings, expirations });

    expect(finder.getBuilding('A_Evt_Tent_1', 1)?.expiration).toBe(604_800);
    expect(finder.getBuilding('A_Evt_Hut_1', 1)?.expiration).toBeUndefined();
  });

  it('reports the highest evolution stage', async () => {
    const buildings = [makeBuilding({ id: 'A_Evt_Evo_Bear_1', base_name: 'A_Evt_Evo_Bear', level: 1 })];
    const evolving: StageProvision[] = [{ baseName: 'A_Evt_Evo_Bear', stages: [{ id: 1 }, { id: 10 }, { id: 5 }] }];
    const finder = await finderWith({ buildings, evolving });

    expect(finder.getBuilding('A_Evt_Evo_Bear_1', 1)?.maxStage).toBe(10);
  });

  it('leaves maxStage undefined for non-evolving buildings', async () => {
    const finder = await finderWith({ buildings: makeBuildingLevels('G_Steel', 1) });

    expect(finder.getBuilding('G_Steel_1', 1)?.maxStage).toBeUndefined();
  });
});

describe('getBuildingExact', () => {
  it('matches on the full id rather than the level', async () => {
    const finder = await finderWith({ buildings: makeBuildingLevels('G_Steel', 3) });

    expect(finder.getBuildingExact('G_Steel_2')).toMatchObject({ id: 'G_Steel_2', width: 3 });
  });

  it('returns undefined when no id matches', async () => {
    const finder = await finderWith({ buildings: makeBuildingLevels('G_Steel', 3) });

    expect(finder.getBuildingExact('G_Steel_9')).toBeUndefined();
  });
});

describe('getBuildingLowerCase', () => {
  it('matches a base name case-insensitively', async () => {
    const buildings = [makeBuilding({ id: 'B_Bear_Hut_1', base_name: 'B_Bear_Hut', level: 1 })];
    const finder = await finderWith({ buildings });

    expect(finder.getBuildingLowerCase('b_bear_hut', 1)?.id).toBe('B_Bear_Hut_1');
  });
});

describe('getCityEntityExtraData', () => {
  it('copies the footprint and naming from the catalog', async () => {
    const finder = await finderWith({ buildings: makeBuildingLevels('G_Steel', 3) });

    expect(finder.getCityEntityExtraData('G_Steel_1', 2)).toMatchObject({
      width: 3,
      length: 3,
      name: 'Steel Manufactory',
      connectionStrategy: 'street',
    });
  });

  it('falls back to a 1x1 unknown building and warns', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const finder = await finderWith({ buildings: [] });

    expect(finder.getCityEntityExtraData('G_Marble_1', 1)).toMatchObject({
      width: 1,
      length: 1,
      name: 'G_Marble_1',
      connectionStrategy: 'unknown',
      description: '',
    });
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });
});

describe('getAllBuildingsByCategory', () => {
  const catalogue = (): Building[] => [
    makeBuilding({ id: 'Z_Wonder_1', base_name: 'Z_Wonder', type: 'ancient_wonder' }),
    makeBuilding({ id: 'A_Evt_Thing_1', base_name: 'A_Evt_Thing', type: 'culture' }),
    makeBuilding({ id: 'M_A_Barracks_1', base_name: 'M_A_Barracks', type: 'military' }),
    makeBuilding({ id: 'G_Steel_1', base_name: 'G_Steel', type: 'goods' }),
    makeBuilding({ id: 'B_Settlement_1', base_name: 'B_Settlement', type: 'portal' }),
    makeBuilding({
      id: 'A_Ch3_Statue_1',
      base_name: 'A_Ch3_Statue',
      type: 'culture',
      requirements: { resources: {}, connectionStrategyId: 'street', worker: 1 },
    }),
    makeBuilding({ id: 'A_Plain_1', base_name: 'A_Plain', type: 'culture' }),
    makeBuilding({
      id: 'P_Residence_1',
      base_name: 'P_Residence',
      type: 'residential',
      requirements: { resources: {}, connectionStrategyId: 'townhall' },
    }),
    makeBuilding({
      id: 'P_Portal_1',
      base_name: 'P_Portal',
      type: 'portal',
      requirements: { resources: {}, connectionStrategyId: 'street' },
    }),
  ];

  const categoryOf = async (id: string) => {
    const finder = await finderWith({ buildings: catalogue() });
    return finder.getAllBuildingsByCategory('humans').find((b) => b.id === id)?.category;
  };

  it.each([
    ['Z_Wonder', 'Wonders'],
    ['A_Evt_Thing', 'Other'],
    ['M_A_Barracks', 'Military'],
    ['G_Steel', 'Goods'],
    ['B_Settlement', 'Settlements'],
    ['A_Ch3_Statue', 'Culture'],
    ['A_Plain', 'Other'],
    ['P_Residence', 'Basics'],
    ['P_Portal', 'Settlements'],
  ])('puts %s in %s', async (id, category) => {
    expect(await categoryOf(id)).toBe(category);
  });

  it('drops buildings belonging to the other race', async () => {
    const buildings = [
      makeBuilding({ id: 'P_Human_1', base_name: 'P_Human', race: 'humans' }),
      makeBuilding({ id: 'P_Elf_1', base_name: 'P_Elf', race: 'elves' }),
    ];
    const finder = await finderWith({ buildings });

    const ids = finder.getAllBuildingsByCategory('humans').map((b) => b.id);

    expect(ids).toContain('P_Human');
    expect(ids).not.toContain('P_Elf');
  });

  describe('supportedFields', () => {
    const fieldsOf = async (buildings: Building[], id: string) => {
      const finder = await finderWith({ buildings });
      return finder.getAllBuildingsByCategory('humans').find((b) => b.id === id)?.supportedFields;
    };

    it('offers Level for prefixed buildings', async () => {
      expect(await fieldsOf(makeBuildingLevels('G_Steel', 2), 'G_Steel')).toEqual(['Level']);
    });

    it('offers Level for settlement buildings too, because the prefix rule wins', async () => {
      expect(await fieldsOf(makeBuildingLevels('B_Settlement', 2), 'B_Settlement')).toEqual(['Level']);
    });

    it('offers Stage and Chapter for evolving event buildings', async () => {
      const buildings = [makeBuilding({ id: 'A_Evt_Evo_Bear_1', base_name: 'A_Evt_Evo_Bear' })];
      expect(await fieldsOf(buildings, 'A_Evt_Evo_Bear')).toEqual(['Stage', 'Chapter']);
    });

    it('offers nothing for buildings that need a worker', async () => {
      const buildings = [
        makeBuilding({
          id: 'A_Ch3_Statue_1',
          base_name: 'A_Ch3_Statue',
          requirements: { resources: {}, connectionStrategyId: 'street', worker: 1 },
        }),
      ];
      expect(await fieldsOf(buildings, 'A_Ch3_Statue')).toEqual([]);
    });

    it('offers Chapter for everything else', async () => {
      const buildings = [makeBuilding({ id: 'A_Plain_1', base_name: 'A_Plain' })];
      expect(await fieldsOf(buildings, 'A_Plain')).toEqual(['Chapter']);
    });
  });

  describe('getSizeAtLevel', () => {
    it('reports the footprint for the requested level', async () => {
      const finder = await finderWith({ buildings: makeBuildingLevels('G_Steel', 3) });
      const steel = finder.getAllBuildingsByCategory('humans').find((b) => b.id === 'G_Steel');

      expect(steel?.getSizeAtLevel?.(3)).toEqual({ width: 4, length: 4 });
    });

    it('falls back to the first level for an unknown level', async () => {
      const finder = await finderWith({ buildings: makeBuildingLevels('G_Steel', 3) });
      const steel = finder.getAllBuildingsByCategory('humans').find((b) => b.id === 'G_Steel');

      expect(steel?.getSizeAtLevel?.(99)).toEqual({ width: 2, length: 2 });
    });

    it('is absent for ancient wonders', async () => {
      const buildings = [makeBuilding({ id: 'Z_Wonder_1', base_name: 'Z_Wonder', type: 'ancient_wonder' })];
      const finder = await finderWith({ buildings });

      expect(finder.getAllBuildingsByCategory('humans')[0].getSizeAtLevel).toBeUndefined();
    });

    it('is absent for D_ and Z_ buildings, which the size prefixes omit', async () => {
      const buildings = [...makeBuildingLevels('D_Thing', 2), ...makeBuildingLevels('Z_Thing', 2)];
      const finder = await finderWith({ buildings });
      const all = finder.getAllBuildingsByCategory('humans');

      expect(all.find((b) => b.id === 'D_Thing')?.getSizeAtLevel).toBeUndefined();
      expect(all.find((b) => b.id === 'Z_Thing')?.getSizeAtLevel).toBeUndefined();
    });
  });

  describe('naming and ordering', () => {
    it('prefixes the chapter onto the display name when there is one', async () => {
      const buildings = [
        makeBuilding({
          id: 'B_Settlement_1',
          base_name: 'B_Settlement',
          name: 'Orc Settlement',
          requirements: { resources: {}, connectionStrategyId: 'street', chapter: 10 },
        }),
      ];
      const finder = await finderWith({ buildings });

      expect(finder.getAllBuildingsByCategory('humans')[0]).toMatchObject({
        chapter: 10,
        name: 'Ch 10 - Orc Settlement',
      });
    });

    it('suppresses the chapter for levelled and event buildings', async () => {
      const buildings = [
        makeBuilding({
          id: 'G_Steel_1',
          base_name: 'G_Steel',
          requirements: { resources: {}, connectionStrategyId: 'street', chapter: 10 },
        }),
        makeBuilding({
          id: 'A_Evt_Tent_1',
          base_name: 'A_Evt_Tent',
          requirements: { resources: {}, connectionStrategyId: 'street', chapter: 10 },
        }),
      ];
      const finder = await finderWith({ buildings });
      const all = finder.getAllBuildingsByCategory('humans');

      expect(all.find((b) => b.id === 'G_Steel')?.chapter).toBeUndefined();
      expect(all.find((b) => b.id === 'A_Evt_Tent')?.chapter).toBeUndefined();
    });

    it('lists chapterless buildings first, then chapters ascending', async () => {
      const withChapter = (id: string, chapter: number) =>
        makeBuilding({
          id: `${id}_1`,
          base_name: id,
          name: id,
          requirements: { resources: {}, connectionStrategyId: 'street', chapter },
        });
      const buildings = [
        withChapter('B_Late', 12),
        makeBuilding({ id: 'B_Zeta_1', base_name: 'B_Zeta', name: 'B_Zeta' }),
        withChapter('B_Early', 3),
        makeBuilding({ id: 'B_Alpha_1', base_name: 'B_Alpha', name: 'B_Alpha' }),
      ];
      const finder = await finderWith({ buildings });

      expect(finder.getAllBuildingsByCategory('humans').map((b) => b.id)).toEqual([
        'B_Alpha',
        'B_Zeta',
        'B_Early',
        'B_Late',
      ]);
    });

    it('reports the last catalog entry as the max level', async () => {
      const finder = await finderWith({ buildings: makeBuildingLevels('G_Steel', 7) });

      expect(finder.getAllBuildingsByCategory('humans')[0].maxLevel).toBe(7);
    });
  });
});

describe('initialisation', () => {
  it('answers lookups without throwing before initialisation resolves', async () => {
    mockedGetBuildings.mockResolvedValue(makeBuildingLevels('G_Steel', 1));
    mockedGetPremiumBuildingHints.mockResolvedValue([]);
    mockedGetEvolvingBuildings.mockResolvedValue([]);
    mockedGetExpirations.mockResolvedValue({});

    const finder = new BuildingFinder();

    // Synchronous call, before the constructor's init promise has resolved. The
    // shared finder is reachable from a render, so this must not throw.
    expect(finder.getBuilding('G_Steel_1', 1)).toBeUndefined();
    expect(finder.getBuildingExact('G_Steel_1')).toBeUndefined();

    await finder.ensureInitialized();
    expect(finder.getBuilding('G_Steel_1', 1)).toBeDefined();
  });

  it('retries after a failed initialisation instead of staying poisoned', async () => {
    mockedGetPremiumBuildingHints.mockResolvedValue([]);
    mockedGetEvolvingBuildings.mockResolvedValue([]);
    mockedGetExpirations.mockResolvedValue({});
    mockedGetBuildings
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValue(makeBuildingLevels('G_Steel', 1));

    const finder = new BuildingFinder();

    await expect(finder.ensureInitialized()).rejects.toThrow('storage unavailable');

    await finder.ensureInitialized();
    expect(finder.getBuilding('G_Steel_1', 1)).toBeDefined();
  });

  it('only initialises once across repeated calls', async () => {
    mockedGetBuildings.mockResolvedValue(makeBuildingLevels('G_Steel', 1));
    mockedGetPremiumBuildingHints.mockResolvedValue([]);
    mockedGetEvolvingBuildings.mockResolvedValue([]);
    mockedGetExpirations.mockResolvedValue({});

    const finder = new BuildingFinder();
    await Promise.all([finder.ensureInitialized(), finder.ensureInitialized()]);
    await finder.ensureInitialized();

    expect(mockedGetBuildings).toHaveBeenCalledTimes(1);
  });
});

describe('getAncientWonders', () => {
  it('collapses a wonder to one entry, whatever its level count', async () => {
    const finder = await finderWith({
      buildings: makeBuildingLevels('Z_Abyss', 3, { type: 'ancient_wonder', name: 'Golden Abyss' }),
    });

    expect(finder.getAncientWonders()).toEqual([{ baseName: 'Z_Abyss', name: 'Golden Abyss' }]);
  });

  it('leaves out everything that is not a wonder, including the A_ buildings', async () => {
    const finder = await finderWith({
      buildings: [
        makeBuilding({ id: 'Z_Abyss_1', base_name: 'Z_Abyss', type: 'ancient_wonder', name: 'Golden Abyss' }),
        makeBuilding({ id: 'A_Evt_Tent_1', base_name: 'A_Evt_Tent', type: 'culture', name: 'Festival Tent' }),
        makeBuilding({ id: 'A_Ch3_Statue_1', base_name: 'A_Ch3_Statue', type: 'culture', name: 'Statue' }),
        makeBuilding({ id: 'G_Steel_1', base_name: 'G_Steel', type: 'goods' }),
      ],
    });

    expect(finder.getAncientWonders().map((w) => w.name)).toEqual(['Golden Abyss']);
  });

  it('sorts by display name', async () => {
    const finder = await finderWith({
      buildings: [
        makeBuilding({ id: 'Z_Needles_1', base_name: 'Z_Needles', type: 'ancient_wonder', name: 'Needles' }),
        makeBuilding({ id: 'Z_Abyss_1', base_name: 'Z_Abyss', type: 'ancient_wonder', name: 'Golden Abyss' }),
        makeBuilding({ id: 'Z_Martial_1', base_name: 'Z_Martial', type: 'ancient_wonder', name: 'Martial Monastery' }),
      ],
    });

    expect(finder.getAncientWonders().map((w) => w.name)).toEqual(['Golden Abyss', 'Martial Monastery', 'Needles']);
  });

  it('is empty before a catalog has been captured', async () => {
    const finder = await finderWith({});

    expect(finder.getAncientWonders()).toEqual([]);
  });
});

describe('getBuildingFinder', () => {
  it('hands out one shared instance', async () => {
    mockedGetBuildings.mockResolvedValue(makeBuildingLevels('G_Steel', 1));
    mockedGetPremiumBuildingHints.mockResolvedValue([]);
    mockedGetEvolvingBuildings.mockResolvedValue([]);
    mockedGetExpirations.mockResolvedValue({});

    const first = getBuildingFinder();
    await first.ensureInitialized();

    expect(getBuildingFinder()).toBe(first);
  });
});
