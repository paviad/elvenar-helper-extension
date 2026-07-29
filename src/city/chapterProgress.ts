import { BuildingEx } from '../model/buildingEx';

/**
 * Buildings whose id prefix means they gain levels, and so can meaningfully be
 * "at max level". A culture building with a single catalog entry is not maxed,
 * it simply has one level.
 */
const LEVELLING_PREFIX = /^[GPRHMOY]_/;

export interface ChapterProgress {
  /** The building itself requires a chapter the city has not reached. */
  isChapterExcessive: boolean;
  /** No upgrade is currently buildable: either none exists, or it is chapter-gated. */
  isMaxedForChapter: boolean;
  /** isMaxedForChapter, narrowed to levelling buildings — drives the MAX badge. */
  isMaxLevelForChapter: boolean;
}

/** True when the next level exists and the city's chapter is high enough to build it. */
export function hasUpgradeForChapter(nextLevelBuilding: BuildingEx | undefined, chapter: number): boolean {
  if (!nextLevelBuilding) return false;
  const requiredChapter = nextLevelBuilding.sourceBuilding.upgradeRequirements?.chapter || 0;
  return requiredChapter <= chapter;
}

export function getChapterProgress(
  gameId: string,
  building: BuildingEx | undefined,
  nextLevelBuilding: BuildingEx | undefined,
  chapter: number,
): ChapterProgress {
  const requiredChapter = building?.sourceBuilding.upgradeRequirements?.chapter;
  const isChapterExcessive = requiredChapter !== undefined && requiredChapter > chapter;
  const isMaxedForChapter = !hasUpgradeForChapter(nextLevelBuilding, chapter);

  return {
    isChapterExcessive,
    isMaxedForChapter,
    isMaxLevelForChapter: LEVELLING_PREFIX.test(gameId) && !isChapterExcessive && isMaxedForChapter,
  };
}
