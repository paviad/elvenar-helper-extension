import { BuildingEx } from '../model/buildingEx';
import { makeBuilding } from '../testing/fixtures';
import { getChapterProgress, hasUpgradeForChapter } from './chapterProgress';

function buildingEx(id: string, upgradeChapter?: number): BuildingEx {
  const sourceBuilding = makeBuilding({
    id,
    base_name: id.replace(/_\d+$/, ''),
    upgradeRequirements: upgradeChapter === undefined ? undefined : { chapter: upgradeChapter },
  });
  return {
    id,
    name: sourceBuilding.name,
    type: sourceBuilding.type,
    length: sourceBuilding.length,
    width: sourceBuilding.width,
    connectionStrategy: sourceBuilding.requirements.connectionStrategyId,
    resale_resources: sourceBuilding.resale_resources,
    spellFragments: sourceBuilding.spellFragments,
    sourceBuilding,
  };
}

describe('hasUpgradeForChapter', () => {
  it('is false when there is no next level', () => {
    expect(hasUpgradeForChapter(undefined, 10)).toBe(false);
  });

  it('is true when the next level needs no particular chapter', () => {
    expect(hasUpgradeForChapter(buildingEx('G_Steel_2'), 1)).toBe(true);
  });

  it('is true when the city has reached the required chapter', () => {
    expect(hasUpgradeForChapter(buildingEx('G_Steel_2', 10), 10)).toBe(true);
  });

  it('is false when the next level is gated above the current chapter', () => {
    expect(hasUpgradeForChapter(buildingEx('G_Steel_2', 11), 10)).toBe(false);
  });
});

describe('getChapterProgress', () => {
  it('flags a building that itself outranks the city chapter', () => {
    const progress = getChapterProgress('G_Steel_5', buildingEx('G_Steel_5', 15), undefined, 10);

    expect(progress.isChapterExcessive).toBe(true);
  });

  it('does not flag a building the city has unlocked', () => {
    const progress = getChapterProgress('G_Steel_5', buildingEx('G_Steel_5', 10), undefined, 10);

    expect(progress.isChapterExcessive).toBe(false);
  });

  it('reports maxed when the next level is chapter-gated', () => {
    const progress = getChapterProgress(
      'G_Steel_5',
      buildingEx('G_Steel_5'),
      buildingEx('G_Steel_6', 15),
      10,
    );

    expect(progress.isMaxedForChapter).toBe(true);
    expect(progress.isMaxLevelForChapter).toBe(true);
  });

  it('reports not maxed when the next level is buildable now', () => {
    const progress = getChapterProgress(
      'G_Steel_5',
      buildingEx('G_Steel_5'),
      buildingEx('G_Steel_6', 4),
      10,
    );

    expect(progress.isMaxedForChapter).toBe(false);
    expect(progress.isMaxLevelForChapter).toBe(false);
  });

  it('does not depend on the level matching the chapter number', () => {
    // The previous table-view rule was `level === chapter`, which both hid real
    // upgrades and offered unreachable ones. Level and chapter are unrelated here.
    const upgradable = getChapterProgress(
      'G_Steel_10',
      buildingEx('G_Steel_10'),
      buildingEx('G_Steel_11', 4),
      10,
    );
    expect(upgradable.isMaxedForChapter).toBe(false);

    const gated = getChapterProgress('G_Steel_5', buildingEx('G_Steel_5'), buildingEx('G_Steel_6', 20), 10);
    expect(gated.isMaxedForChapter).toBe(true);
  });

  describe('isMaxLevelForChapter', () => {
    it('is false for buildings that do not gain levels, even when maxed', () => {
      const progress = getChapterProgress('A_Ch5_Statue', buildingEx('A_Ch5_Statue'), undefined, 10);

      expect(progress.isMaxedForChapter).toBe(true);
      expect(progress.isMaxLevelForChapter).toBe(false);
    });

    it.each(['G', 'P', 'R', 'H', 'M', 'O', 'Y'])('is true for the %s_ prefix', (prefix) => {
      const id = `${prefix}_Thing_5`;
      const progress = getChapterProgress(id, buildingEx(id), undefined, 10);

      expect(progress.isMaxLevelForChapter).toBe(true);
    });

    it.each(['D', 'B', 'Z', 'A', 'S'])('is false for the %s_ prefix', (prefix) => {
      const id = `${prefix}_Thing_5`;
      const progress = getChapterProgress(id, buildingEx(id), undefined, 10);

      expect(progress.isMaxLevelForChapter).toBe(false);
    });

    it('is false while the building itself is chapter-excessive', () => {
      const progress = getChapterProgress('G_Steel_5', buildingEx('G_Steel_5', 15), undefined, 10);

      expect(progress.isMaxedForChapter).toBe(true);
      expect(progress.isMaxLevelForChapter).toBe(false);
    });
  });
});
