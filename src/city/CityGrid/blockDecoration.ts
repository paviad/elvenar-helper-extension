import { BuildingEx } from '../../model/buildingEx';
import { getContrastColor } from '../../util/getContrastColor';
import { BuildingFinder } from '../buildingFinder';
import { getChapterProgress } from '../chapterProgress';
import { CityBlock } from '../CityBlock';
import { getTypeColor } from '../Legend/getTypeColor';

export interface BlockDecorationInput {
  block: CityBlock;
  finder: BuildingFinder;
  /** The city's current chapter, which decides what counts as upgradeable. */
  chapter: number;
  /** Every type present in the city, which fixes the palette slot for unknown types. */
  allTypes: string[];
  isHighlighted: boolean;
}

export interface BlockDecoration {
  building: BuildingEx | undefined;
  nextLevelBuilding: BuildingEx | undefined;
  fillColor: string;
  textColor: string;
  isChapterExcessive: boolean;
  isMaxLevelForChapter: boolean;
  isHighlighted: boolean;
}

/**
 * Everything both grid views need to draw a block: its catalog entry, its colours
 * and its chapter status. The views differ in geometry, not in what a block means,
 * so this is the shared half.
 *
 * A plain function rather than a hook, and deliberately so: the block components
 * that call it are memoised, and reading any of this from context would re-render
 * them on every change to the city regardless of whether their own block moved.
 */
export function getBlockDecoration({
  block,
  finder,
  chapter,
  allTypes,
  isHighlighted,
}: BlockDecorationInput): BlockDecoration {
  const building = finder.getBuilding(block.gameId, block.level);
  const nextLevelBuilding = finder.getBuilding(block.gameId, block.level + 1);

  const fillColor = getTypeColor(block.type, allTypes, block.moved);

  const { isChapterExcessive, isMaxLevelForChapter } = getChapterProgress(
    block.gameId,
    building,
    nextLevelBuilding,
    chapter,
  );

  return {
    building,
    nextLevelBuilding,
    fillColor,
    textColor: getContrastColor(fillColor),
    isChapterExcessive,
    isMaxLevelForChapter,
    isHighlighted,
  };
}
