import { UnlockedArea } from '../model/unlockedArea';
import { makeCityEntityEx } from '../testing/fixtures';
import { generateCityBlocks } from './generateCityBlocks';
import { generateUnlockedAreas } from './generateUnlockedAreas';

describe('generateCityBlocks', () => {
  it('numbers blocks by their position in the entity list', () => {
    const blocks = generateCityBlocks([
      makeCityEntityEx({ id: 500 }),
      makeCityEntityEx({ id: 600 }),
      makeCityEntityEx({ id: 700 }),
    ]);

    // The block id is the array index, not the game entity id.
    expect(blocks.map((b) => b.id)).toEqual([0, 1, 2]);
    expect(blocks.map((b) => b.entity.id)).toEqual([500, 600, 700]);
  });

  it('keeps the game id available for catalog lookups', () => {
    const blocks = generateCityBlocks([makeCityEntityEx({ cityentity_id: 'G_Steel_3' })]);

    expect(blocks[0].gameId).toBe('G_Steel_3');
  });

  it('returns nothing for an empty city', () => {
    expect(generateCityBlocks([])).toEqual([]);
  });
});

describe('generateUnlockedAreas', () => {
  it('defaults missing coordinates to the grid origin', () => {
    const areas = [{ width: 5, length: 5 }] as UnlockedArea[];

    expect(generateUnlockedAreas(areas)).toEqual([{ x: 0, y: 0, width: 5, length: 5 }]);
  });

  it('preserves coordinates that are present', () => {
    const areas: UnlockedArea[] = [{ x: 3, y: 4, width: 5, length: 5 }];

    expect(generateUnlockedAreas(areas)).toEqual([{ x: 3, y: 4, width: 5, length: 5 }]);
  });

  it('copies rather than mutating the input', () => {
    const areas: UnlockedArea[] = [{ x: 3, y: 4, width: 5, length: 5 }];

    expect(generateUnlockedAreas(areas)[0]).not.toBe(areas[0]);
  });
});
