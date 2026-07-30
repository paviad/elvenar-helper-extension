import { UpgradeSuggestion } from './findClearUpgrades';

/** The replacement keeps the exact footprint of the building it replaces. */
export const isSameSize = (s: UpgradeSuggestion) => s.newWidth === s.oldWidth && s.newLength === s.oldLength;

/** Only a footprint that shrinks on both axes is guaranteed to fit where the old one stood. */
export const fitsInPlace = (s: UpgradeSuggestion) => s.newWidth < s.oldWidth && s.newLength < s.oldLength;

const newArea = (s: UpgradeSuggestion) => s.newWidth * s.newLength;
const areaGrowth = (s: UpgradeSuggestion) => newArea(s) - s.oldWidth * s.oldLength;

const sizeRank = (s: UpgradeSuggestion) => (isSameSize(s) ? 2 : fitsInPlace(s) ? 1 : 0);

/**
 * Written ascending, since the table negates it for the descending default it opens with.
 * Read the other way round it is: same size first, then footprints that shrink, then the
 * ones that grow by the least; ties within a tier put the larger replacement first.
 */
export const compareSize = (a: UpgradeSuggestion, b: UpgradeSuggestion) => {
  const byRank = sizeRank(a) - sizeRank(b);
  if (byRank !== 0) return byRank;

  if (sizeRank(a) === 0) {
    const byGrowth = areaGrowth(b) - areaGrowth(a);
    if (byGrowth !== 0) return byGrowth;
  }

  return newArea(a) - newArea(b);
};
