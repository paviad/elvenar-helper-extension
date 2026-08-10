import { AncientWonder } from '../../city/buildingFinder';
import { CityEntity } from '../../model/cityEntity';
import { makeCityEntityEx } from '../../testing/fixtures';
import { getOwnedWonders } from './getOwnedWonders';

const CATALOG: AncientWonder[] = [
  { baseName: 'Z_Abyss', name: 'Golden Abyss' },
  { baseName: 'Z_Martial', name: 'Martial Monastery' },
  { baseName: 'Z_Needles', name: 'Needles of the Tempest' },
];

const entity = (cityentityId: string): CityEntity => makeCityEntityEx({ cityentity_id: cityentityId });

describe('getOwnedWonders', () => {
  it('keeps only the wonders standing in the city', () => {
    const city = [entity('Z_Abyss_9'), entity('G_Steel_3'), entity('Z_Needles_1')];

    expect(getOwnedWonders(city, CATALOG).map((w) => w.name)).toEqual(['Golden Abyss', 'Needles of the Tempest']);
  });

  it('matches whatever level the wonder is at', () => {
    expect(getOwnedWonders([entity('Z_Abyss_1')], CATALOG)).toHaveLength(1);
    expect(getOwnedWonders([entity('Z_Abyss_35')], CATALOG)).toHaveLength(1);
  });

  it('lists a wonder once even if the id turns up twice', () => {
    const city = [entity('Z_Abyss_9'), entity('Z_Abyss_9')];

    expect(getOwnedWonders(city, CATALOG)).toHaveLength(1);
  });

  it('keeps the catalog order, which is by display name', () => {
    const city = [entity('Z_Needles_1'), entity('Z_Abyss_1'), entity('Z_Martial_1')];

    expect(getOwnedWonders(city, CATALOG).map((w) => w.name)).toEqual([
      'Golden Abyss',
      'Martial Monastery',
      'Needles of the Tempest',
    ]);
  });

  it('yields nothing without a city or a catalog', () => {
    expect(getOwnedWonders(undefined, CATALOG)).toEqual([]);
    expect(getOwnedWonders([], CATALOG)).toEqual([]);
    expect(getOwnedWonders([entity('Z_Abyss_9')], [])).toEqual([]);
  });

  it('ignores a building that is not a wonder even when its name is close', () => {
    expect(getOwnedWonders([entity('Z_Abyssal_1')], CATALOG)).toEqual([]);
  });

  // It is levelled by its own mechanism at every level, so a thread can give it nothing.
  // Held by id, since the display name is whatever the player's language calls it.
  it('leaves out the Vestige of Eternity even though it is built', () => {
    const catalog = [...CATALOG, { baseName: 'B_All_Spire_AW', name: 'Vestige de la Eternidad' }];
    const city = [entity('B_All_Spire_AW_9'), entity('Z_Abyss_9')];

    expect(getOwnedWonders(city, catalog).map((w) => w.name)).toEqual(['Golden Abyss']);
  });
});
