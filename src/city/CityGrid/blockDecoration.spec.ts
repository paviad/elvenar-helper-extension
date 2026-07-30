import { Building } from '../../model/building';
import { makeBuilding, makeCityBlock } from '../../testing/fixtures';
import { BuildingFinder } from '../buildingFinder';
import { knownTypes } from '../Legend/knownTypes';
import { getBlockDecoration } from './blockDecoration';

/** A finder stub answering from a fixed catalog keyed by "<gameId>@<level>". */
function finderFor(catalog: Record<string, Building>): BuildingFinder {
  return {
    getBuilding: (id: string, level = 1) => {
      const sourceBuilding = catalog[`${id}@${level}`];
      return sourceBuilding ? { sourceBuilding, id: sourceBuilding.id } : undefined;
    },
  } as unknown as BuildingFinder;
}

const levelled = (level: number, upgradeChapter?: number) =>
  makeBuilding({
    id: `G_Steel_${level}`,
    base_name: 'G_Steel',
    level,
    upgradeRequirements: upgradeChapter === undefined ? undefined : { chapter: upgradeChapter },
  });

const base = {
  chapter: 10,
  allTypes: ['goods'],
  isHighlighted: false,
};

describe('getBlockDecoration', () => {
  it('looks up the block at its own level and the next one', () => {
    const finder = finderFor({ 'G_Steel_1@3': levelled(3), 'G_Steel_1@4': levelled(4) });
    const block = makeCityBlock({ gameId: 'G_Steel_1', level: 3 });

    const decoration = getBlockDecoration({ ...base, block, finder });

    expect(decoration.building?.id).toBe('G_Steel_3');
    expect(decoration.nextLevelBuilding?.id).toBe('G_Steel_4');
  });

  it('leaves the building undefined when the catalog has no entry', () => {
    const finder = finderFor({});
    const block = makeCityBlock({ gameId: 'G_Missing_1', level: 1 });

    expect(getBlockDecoration({ ...base, block, finder }).building).toBeUndefined();
  });

  it('colours the block by its type', () => {
    const finder = finderFor({});
    const block = makeCityBlock({ gameId: 'G_Steel_1', type: 'goods' });

    expect(getBlockDecoration({ ...base, block, finder }).fillColor).toBe(knownTypes.goods);
  });

  it('dims a moved block', () => {
    const finder = finderFor({});
    const moved = makeCityBlock({ type: 'goods', moved: true });

    expect(getBlockDecoration({ ...base, block: moved, finder }).fillColor).toBe(`${knownTypes.goods}AA`);
  });

  it('picks a readable text colour for the fill', () => {
    const finder = finderFor({});
    const block = makeCityBlock({ type: 'goods' });

    const { textColor } = getBlockDecoration({ ...base, block, finder });

    expect(typeof textColor).toBe('string');
    expect(textColor).not.toBe('');
  });

  it('flags a building that outranks the city chapter', () => {
    const finder = finderFor({ 'G_Steel_1@3': levelled(3, 15) });
    const block = makeCityBlock({ gameId: 'G_Steel_1', level: 3 });

    expect(getBlockDecoration({ ...base, block, finder }).isChapterExcessive).toBe(true);
  });

  it('reports max level when the next level is chapter-gated', () => {
    const finder = finderFor({ 'G_Steel_1@3': levelled(3), 'G_Steel_1@4': levelled(4, 20) });
    const block = makeCityBlock({ gameId: 'G_Steel_1', level: 3 });

    expect(getBlockDecoration({ ...base, block, finder }).isMaxLevelForChapter).toBe(true);
  });

  it('does not report max level when the next level is buildable', () => {
    const finder = finderFor({ 'G_Steel_1@3': levelled(3), 'G_Steel_1@4': levelled(4, 5) });
    const block = makeCityBlock({ gameId: 'G_Steel_1', level: 3 });

    expect(getBlockDecoration({ ...base, block, finder }).isMaxLevelForChapter).toBe(false);
  });

  it('passes the highlight flag straight through', () => {
    const finder = finderFor({});
    const block = makeCityBlock({});

    expect(getBlockDecoration({ ...base, block, finder, isHighlighted: true }).isHighlighted).toBe(true);
    expect(getBlockDecoration({ ...base, block, finder, isHighlighted: false }).isHighlighted).toBe(false);
  });

  it('places unknown types by their position in allTypes', () => {
    const finder = finderFor({});
    const first = makeCityBlock({ type: 'mystery_a' });
    const second = makeCityBlock({ type: 'mystery_b' });
    const allTypes = ['mystery_a', 'mystery_b'];

    const a = getBlockDecoration({ ...base, allTypes, block: first, finder }).fillColor;
    const b = getBlockDecoration({ ...base, allTypes, block: second, finder }).fillColor;

    expect(a).not.toBe(b);
  });
});
