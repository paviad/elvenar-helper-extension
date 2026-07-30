import { getContrastColor } from '../../util/getContrastColor';
import { getChapterProgress } from '../chapterProgress';
import { CityBlock } from '../CityBlock';
import { useCity } from '../CityContext';
import { getTypeColor } from '../Legend/getTypeColor';

/**
 * Everything both grid views need to draw a block: its catalog entry, its colours
 * and its chapter status. The two views differ in geometry, not in what a block
 * means, so this is the shared half.
 *
 * IMPORTANT: this may only use context hooks. BlockRect and IsometricBlockRect are
 * still called as plain functions from inside a useMemo callback, which React
 * tolerates solely because useContext does not occupy a hook slot. Adding useState,
 * useMemo or useEffect here would throw "rendered fewer hooks than expected" as soon
 * as that memo cache hits.
 */
export const useBlockDecoration = (block: CityBlock) => {
  const city = useCity();
  const { buildingFinder, chapter, allTypes } = city;

  const building = buildingFinder.getBuilding(block.gameId, block.level);
  const nextLevelBuilding = buildingFinder.getBuilding(block.gameId, block.level + 1);

  const fillColor = getTypeColor(block.type, allTypes, block.moved);
  const textColor = getContrastColor(fillColor);

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
    textColor,
    isChapterExcessive,
    isMaxLevelForChapter,
    isHighlighted: !!block.highlighted,
  };
};
