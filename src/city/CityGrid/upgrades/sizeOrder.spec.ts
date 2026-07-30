import { UpgradeSuggestion } from './findClearUpgrades';
import { compareSize } from './sizeOrder';

/** Only the footprint matters here, so everything else is filled in minimally. */
function suggestion(label: string, [oldWidth, oldLength]: [number, number], [newWidth, newLength]: [number, number]) {
  return {
    key: label,
    blockIds: [1],
    count: 1,
    oldName: label,
    oldLevel: 1,
    oldWidth,
    oldLength,
    oldValues: {},
    oldOther: [],
    oldIsExpiring: false,
    itemId: 1,
    itemAmount: 1,
    newName: label,
    newLevel: 1,
    newWidth,
    newLength,
    newValues: {},
    newOther: [],
  } satisfies UpgradeSuggestion;
}

/** The table negates the comparator for its descending default; this is what the user reads. */
const descending = (rows: UpgradeSuggestion[]) => [...rows].sort((a, b) => -compareSize(a, b)).map((r) => r.key);

describe('compareSize', () => {
  it('puts same-size first, then shrinking, then growing footprints', () => {
    const grows = suggestion('grows', [3, 3], [4, 4]);
    const shrinks = suggestion('shrinks', [3, 3], [2, 2]);
    const same = suggestion('same', [3, 3], [3, 3]);

    expect(descending([grows, shrinks, same])).toEqual(['same', 'shrinks', 'grows']);
  });

  it('orders growing footprints by how much area they add', () => {
    const plus7 = suggestion('plus7', [3, 3], [4, 4]);
    const plus3 = suggestion('plus3', [3, 3], [3, 4]);
    const plus11 = suggestion('plus11', [3, 3], [4, 5]);

    expect(descending([plus11, plus7, plus3])).toEqual(['plus3', 'plus7', 'plus11']);
  });

  it('puts the larger replacement first within a tier', () => {
    const bigSame = suggestion('bigSame', [4, 4], [4, 4]);
    const smallSame = suggestion('smallSame', [2, 2], [2, 2]);
    const bigShrink = suggestion('bigShrink', [6, 6], [5, 5]);
    const smallShrink = suggestion('smallShrink', [3, 3], [2, 2]);

    expect(descending([smallSame, bigSame, smallShrink, bigShrink])).toEqual([
      'bigSame',
      'smallSame',
      'bigShrink',
      'smallShrink',
    ]);
  });

  it('breaks equal area growth by the larger replacement', () => {
    const small = suggestion('small', [1, 2], [2, 2]);
    const large = suggestion('large', [4, 4], [4, 6]);
    const bothGrowBy2 = descending([small, large]);

    // small grows 2->4 and large grows 16->24, so the tie is broken on the replacement.
    expect(bothGrowBy2[0]).toBe('small');
  });

  it('treats a footprint that shrinks on one axis only as growth, not a fit', () => {
    const mixed = suggestion('mixed', [2, 6], [1, 8]);
    const shrinks = suggestion('shrinks', [2, 6], [1, 5]);

    expect(descending([mixed, shrinks])).toEqual(['shrinks', 'mixed']);
  });
});
