import { CityImportError, decodeCityExport, encodeCityExport, parseCityImport } from './cityImport';

const exported = (data: unknown) => encodeCityExport(JSON.stringify(data));

const city = (overrides: Record<string, unknown> = {}) => ({
  city_map: {
    unlocked_areas: [{ x: 0, y: 0, width: 5, length: 5 }],
    entities: [{ id: 1, cityentity_id: 'H_Ch1_Main_1', x: 1, y: 1, type: 'main_building', level: 1 }],
  },
  user_data: { race: 'humans', chapter: 12 },
  ...overrides,
});

const problemWith = (text: string) => {
  try {
    parseCityImport(text);
    return null;
  } catch (e) {
    return e instanceof CityImportError ? e.message : `not a CityImportError: ${String(e)}`;
  }
};

describe('encodeCityExport / decodeCityExport', () => {
  it('carries text outside Latin-1, which btoa alone throws on', () => {
    const json = JSON.stringify({ name: 'Zaklęta Biblioteka – Магическая’ Ακαδημία' });

    expect(decodeCityExport(encodeCityExport(json))).toBe(json);
  });

  it('still reads strings exported before the export went UTF-8', () => {
    const json = JSON.stringify({ name: 'Café' });

    expect(decodeCityExport(btoa(json))).toBe(json);
  });

  it('ignores whitespace around a pasted string', () => {
    expect(decodeCityExport(`  ${encodeCityExport('{}')}\n`)).toBe('{}');
  });
});

describe('parseCityImport', () => {
  it('reads an exported city', () => {
    const result = parseCityImport(exported(city()));

    expect(result.race).toBe('humans');
    expect(result.chapter).toBe(12);
    expect(result.unlockedAreas).toEqual([{ x: 0, y: 0, width: 5, length: 5 }]);
    expect(result.entities).toEqual([
      { id: 1, cityentity_id: 'H_Ch1_Main_1', x: 1, y: 1, type: 'main_building', level: 1, stage: undefined },
    ]);
  });

  it('leaves the chapter out when the export does not have one', () => {
    expect(parseCityImport(exported(city({ user_data: { race: 'elves' } }))).chapter).toBeUndefined();
  });

  it('reads an absent coordinate as zero, the way the game leaves zeros out', () => {
    const data = city();
    data.city_map.unlocked_areas = [{ width: 5, length: 5 } as never];
    data.city_map.entities = [{ id: 1, cityentity_id: 'H_Ch1_Main_1' } as never];

    const result = parseCityImport(exported(data));

    expect(result.unlockedAreas[0]).toEqual({ x: 0, y: 0, width: 5, length: 5 });
    expect(result.entities[0]).toMatchObject({ x: 0, y: 0 });
  });

  it('keeps a building parked in the margin around the grid', () => {
    const data = city();
    data.city_map.entities[0].x = -3;

    expect(parseCityImport(exported(data)).entities[0].x).toBe(-3);
  });

  it('gives buildings that share an id, or have none, ids of their own', () => {
    const data = city();
    data.city_map.entities = [
      { id: 7, cityentity_id: 'A_1', x: 0, y: 0 },
      { id: 7, cityentity_id: 'B_1', x: 2, y: 0 },
      { cityentity_id: 'C_1', x: 4, y: 0 } as never,
    ] as never;

    const ids = parseCityImport(exported(data)).entities.map((e) => e.id);

    expect(ids[0]).toBe(7);
    expect(new Set(ids).size).toBe(3);
  });

  it.each([
    ['text that is not base64', '%%%', 'This is not an exported city.'],
    ['base64 that is not JSON', btoa('not json'), 'This is not an exported city.'],
    ['JSON with no city map', exported({ foo: 1 }), 'This is not an exported city.'],
    [
      'a city with no buildings list',
      exported(city({ city_map: { unlocked_areas: [] } })),
      'The exported city has no list of buildings.',
    ],
    [
      'a city with no unlocked areas',
      exported(city({ city_map: { entities: [] } })),
      'The exported city has no list of unlocked areas.',
    ],
    ['a city with no race', exported(city({ user_data: {} })), 'The exported city does not say which race it is.'],
  ])('turns down %s', (_, text, message) => {
    expect(problemWith(text)).toBe(message);
  });

  it('turns down an area that reaches past the grid', () => {
    const data = city();
    data.city_map.unlocked_areas = [{ x: 0, y: 0, width: 1_000_000, length: 1_000_000 }];

    expect(problemWith(exported(data))).toBe('One of the unlocked areas in this city lies outside the city grid.');
  });

  it('turns down a coordinate that is not a whole number', () => {
    const data = city();
    data.city_map.entities[0].x = '12' as never;

    expect(problemWith(exported(data))).toBe('H_Ch1_Main_1 is placed outside the city grid.');
  });

  it('turns down a building without a building id', () => {
    const data = city();
    data.city_map.entities = [{ id: 1, x: 0, y: 0 } as never];

    expect(problemWith(exported(data))).toBe('One of the buildings in this city has no building id.');
  });
});
